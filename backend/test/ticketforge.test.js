// Kiểm tra luồng tích hợp TicketForge với một TicketForge giả.
// Chạy: TEST_DATABASE_URL=postgresql://... npm test   (chỉ dùng DB test, bảng error_reports sẽ bị xoá sạch)
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createServer } from 'node:http';
import { after, before, describe, test } from 'node:test';

const SECRET = 'whsec_test';
const API_KEY = 'tf_live_test_secret';
const skip = process.env.TEST_DATABASE_URL ? false : 'cần TEST_DATABASE_URL';

describe('tích hợp TicketForge', { skip }, () => {
  const mock = { requests: [], failNext: null, counter: 0 };
  let mockServer;
  let appServer;
  let base;
  let db;
  let errorReports;
  let jwt;

  before(async () => {
    mockServer = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        mock.requests.push({ method: req.method, url: req.url, headers: req.headers, body: body ? JSON.parse(body) : null });
        const send = (status, payload) => {
          res.writeHead(status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(payload));
        };
        if (req.headers.authorization !== `Bearer ${API_KEY}`) return send(401, { message: 'API key sai' });
        if (mock.failNext) {
          const status = mock.failNext;
          mock.failNext = null;
          return send(status, { message: 'mock lỗi' });
        }
        if (req.method === 'POST' && req.url === '/v1/ingest/errors') {
          mock.counter += 1;
          return send(201, { ticketId: `ticket-${mock.counter}`, ticketKey: `SHOP-${mock.counter}`, status: 'new' });
        }
        const match = /^\/v1\/ingest\/errors\/(.+)$/.exec(req.url);
        if (req.method === 'GET' && match) {
          const created = mock.requests.find((r) => r.method === 'POST' && r.body && `ticket-${match[1].slice(7)}` === match[1]);
          return send(200, {
            ticketId: match[1],
            ticketKey: 'SHOP-X',
            status: 'in_progress',
            statusLabel: 'Đang làm',
            updatedAt: new Date().toISOString(),
            metadata: { externalId: created?.body?.metadata?.externalId },
          });
        }
        send(404, { message: 'not found' });
      });
    });
    await new Promise((resolve) => mockServer.listen(0, '127.0.0.1', resolve));

    Object.assign(process.env, {
      DATABASE_URL: process.env.TEST_DATABASE_URL,
      JWT_SECRET: 'test-secret',
      TICKETFORGE_URL: `http://127.0.0.1:${mockServer.address().port}`,
      TICKETFORGE_WEBHOOK_SECRET: SECRET,
      PUBLIC_URL: 'https://shop.example.com',
      CORS_ORIGIN: 'https://shop.example.com',
    });
    delete process.env.TICKETFORGE_API_KEY;

    db = await import('../src/db.js');
    errorReports = await import('../src/errorReports.js');
    jwt = (await import('jsonwebtoken')).default;
    const { createApp } = await import('../src/app.js');

    await errorReports.ensureErrorTables();
    await db.query('DELETE FROM error_reports');
    appServer = createApp().listen(0, '127.0.0.1');
    await new Promise((resolve) => appServer.once('listening', resolve));
    base = `http://127.0.0.1:${appServer.address().port}`;
  });

  after(async () => {
    appServer?.close();
    mockServer?.close();
    await db?.pool.end();
  });

  const post = (path, body, headers = {}) =>
    fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const row = async (id) => (await db.query('SELECT * FROM error_reports WHERE id = $1', [id])).rows[0];
  const adminHeaders = () => ({ Authorization: `Bearer ${jwt.sign({ sub: 1, role: 'admin' }, 'test-secret')}` });
  const waitFor = async (check) => {
    for (let i = 0; i < 40; i += 1) {
      const value = await check();
      if (value) return value;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('hết thời gian chờ');
  };

  const sign = (payload, { timestamp = Math.floor(Date.now() / 1000), secret = SECRET } = {}) => {
    const raw = JSON.stringify(payload);
    const signature = createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex');
    return { raw, headers: { 'Content-Type': 'application/json', 'X-TicketForge-Signature': `t=${timestamp},v1=${signature}` } };
  };
  const webhook = (payload, options) => {
    const { raw, headers } = sign(payload, options);
    return fetch(`${base}/api/ticketforge/webhook`, { method: 'POST', headers, body: raw });
  };
  const statusEvent = (errorId, status, updatedAt) => ({
    id: 'evt-1',
    type: 'ticket.status_changed',
    createdAt: updatedAt,
    data: { ticketId: 'ticket-1', ticketKey: 'SHOP-1', status, updatedAt, metadata: { externalId: errorId } },
  });

  const browserError = (overrides = {}) => ({
    message: 'TypeError: Cannot read properties of undefined (reading "price")',
    stack: 'TypeError: Cannot read properties of undefined\n    at CartLine (app.js:10:5)\n    at renderWithHooks (react.js:1:1)',
    route: '/cart',
    pageUrl: 'https://shop.example.com/cart?phone=0912345678',
    userAgent: 'Mozilla/5.0 test',
    ...overrides,
  });

  let firstId;

  test('chưa có API key: lưu lại, chưa gửi, bỏ query khỏi pageUrl', async () => {
    const response = await post('/api/report-error', browserError());
    assert.equal(response.status, 202);
    firstId = (await response.json()).errorId;

    const saved = await row(firstId);
    assert.equal(saved.ticket_id, null);
    assert.equal(saved.sync_state, 'pending');
    assert.equal(saved.page_url, 'https://shop.example.com/cart');
    assert.equal(mock.requests.length, 0);
  });

  test('từ chối báo cáo trống và thay pageUrl lạ bằng domain của site', async () => {
    assert.equal((await post('/api/report-error', { message: '   ' })).status, 422);
    const { errorId } = await (await post('/api/report-error', browserError({ message: 'Lỗi khác', pageUrl: 'https://evil.example.org/x?y=1' }))).json();
    assert.equal((await row(errorId)).page_url, 'https://shop.example.com/cart');
  });

  test('có API key: gửi đúng định dạng theo tài liệu và lưu ticket', async () => {
    process.env.TICKETFORGE_API_KEY = API_KEY;
    await errorReports.syncPending(10);

    const calls = mock.requests.filter((r) => r.method === 'POST');
    const call = calls.find((r) => r.body.metadata.externalId === firstId);
    assert.ok(call, 'đã gọi POST /v1/ingest/errors');
    assert.equal(call.url, '/v1/ingest/errors');
    assert.equal(call.headers.authorization, `Bearer ${API_KEY}`);
    assert.equal(call.headers['idempotency-key'], firstId);
    assert.equal(call.body.prompt.split('\n')[0], browserError().message);
    assert.equal(call.body.pageUrl, 'https://shop.example.com/cart');
    assert.equal(call.body.route, '/cart');
    assert.match(call.body.stacktrace, /CartLine/);
    assert.ok(call.body.release);
    assert.equal(call.body.metadata.source, 'browser');

    const saved = await row(firstId);
    assert.equal(saved.ticket_id, 'ticket-1');
    assert.equal(saved.ticket_key, 'SHOP-1');
    assert.equal(saved.status, 'not_started'); // "new" của TicketForge quy về "Chưa làm"
    assert.equal(saved.sync_state, 'synced');
  });

  test('lỗi giống nhau (khác số dòng) chỉ tăng bộ đếm, không tạo ticket mới', async () => {
    const before = mock.requests.filter((r) => r.method === 'POST').length;
    const { errorId } = await (
      await post('/api/report-error', browserError({ stack: 'TypeError: x\n    at CartLine (app.js:99:17)\n    at renderWithHooks (react.js:5:5)' }))
    ).json();
    assert.equal(errorId, firstId);
    assert.equal((await row(firstId)).occurrences, 2);
    assert.equal(mock.requests.filter((r) => r.method === 'POST').length, before);
  });

  test('webhook: chữ ký sai, quá hạn hoặc thiếu đều bị từ chối', async () => {
    const event = statusEvent(firstId, 'in_progress', new Date().toISOString());
    assert.equal((await webhook(event, { secret: 'whsec_khac' })).status, 401);
    assert.equal((await webhook(event, { timestamp: Math.floor(Date.now() / 1000) - 3600 })).status, 400);
    const missing = await fetch(`${base}/api/ticketforge/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event) });
    assert.equal(missing.status, 400);
    assert.equal((await row(firstId)).status, 'not_started');
  });

  test('webhook: cập nhật trạng thái, bỏ qua bản tin cũ, ticket.test trả 200', async () => {
    const t1 = new Date(Date.now() + 1000).toISOString();
    const t2 = new Date(Date.now() + 3000).toISOString();

    assert.equal((await webhook(statusEvent(firstId, 'in_progress', t1))).status, 200);
    let saved = await row(firstId);
    assert.equal(saved.status, 'in_progress');
    assert.equal(saved.status_label, 'Đang làm');

    assert.equal((await webhook(statusEvent(firstId, 'done', t2))).status, 200);
    assert.equal((await row(firstId)).status, 'done');

    // bản tin đến muộn (cũ hơn) không được ghi đè
    assert.equal((await webhook(statusEvent(firstId, 'refused', t1))).status, 200);
    saved = await row(firstId);
    assert.equal(saved.status, 'done');
    assert.equal(saved.status_label, 'Hoàn thành');

    assert.equal((await webhook({ id: 'x', type: 'ticket.test', data: {} })).status, 200);
    // externalId lạ vẫn trả 200 để TicketForge không gửi lại
    assert.equal((await webhook(statusEvent('00000000-0000-4000-8000-000000000000', 'done', t2))).status, 200);
  });

  test('lỗi tái phát sau khi ticket đã hoàn thành tạo ticket mới', async () => {
    const { errorId } = await (await post('/api/report-error', browserError())).json();
    assert.notEqual(errorId, firstId);
    const saved = await waitFor(async () => {
      const r = await row(errorId);
      return r.ticket_id ? r : null;
    });
    assert.equal(saved.ticket_key, 'SHOP-3');
  });

  test('lỗi tạm thời được thử lại, lỗi cố định chuyển sang failed', async () => {
    mock.failNext = 503;
    const { errorId } = await (await post('/api/report-error', browserError({ message: 'Lỗi tạm thời', stack: 'a\n at x (y.js:1:1)' }))).json();
    const failed = await waitFor(async () => {
      const r = await row(errorId);
      return r.sync_attempts === 1 ? r : null;
    });
    assert.equal(failed.sync_state, 'pending');
    assert.match(failed.sync_error, /503/);

    await db.query('UPDATE error_reports SET next_attempt_at = now() WHERE id = $1', [errorId]);
    await errorReports.syncPending(10);
    assert.equal((await row(errorId)).sync_state, 'synced');

    mock.failNext = 422;
    const { errorId: bad } = await (await post('/api/report-error', browserError({ message: 'Lỗi cố định', stack: 'b\n at z (w.js:1:1)' }))).json();
    const permanent = await waitFor(async () => {
      const r = await row(bad);
      return r.sync_state === 'failed' ? r : null;
    });
    assert.match(permanent.sync_error, /422/);
  });

  test('trang quản trị: cần quyền admin, trả danh sách, đếm và cấu hình', async () => {
    assert.equal((await fetch(`${base}/api/admin/errors`)).status, 401);
    const customer = jwt.sign({ sub: 2, role: 'customer' }, 'test-secret');
    assert.equal((await fetch(`${base}/api/admin/errors`, { headers: { Authorization: `Bearer ${customer}` } })).status, 403);

    const data = await (await fetch(`${base}/api/admin/errors`, { headers: adminHeaders() })).json();
    assert.ok(data.items.length >= 4);
    assert.ok(data.counts.done >= 1);
    assert.ok(data.counts.unsent >= 1);
    assert.equal(data.config.configured, true);
    assert.equal(data.config.webhook_configured, true);
    assert.ok(!JSON.stringify(data).includes(API_KEY), 'không lộ API key');

    const unsent = await (await fetch(`${base}/api/admin/errors?status=unsent`, { headers: adminHeaders() })).json();
    assert.ok(unsent.items.every((item) => item.ticket_id === null));
    const done = await (await fetch(`${base}/api/admin/errors?status=done`, { headers: adminHeaders() })).json();
    assert.ok(done.items.every((item) => item.status === 'done'));

    assert.equal((await fetch(`${base}/api/admin/errors/khong-phai-uuid`, { headers: adminHeaders() })).status, 404);
  });

  test('trang quản trị: gửi lại lỗi chưa gửi, đọc lại trạng thái, gửi lỗi thử', async () => {
    const failed = (await db.query(`SELECT id FROM error_reports WHERE sync_state = 'failed' LIMIT 1`)).rows[0];
    const resent = await post(`/api/admin/errors/${failed.id}/sync`, {}, adminHeaders());
    assert.equal(resent.status, 200);
    assert.equal((await resent.json()).sync_state, 'synced');

    const refreshed = await post(`/api/admin/errors/${failed.id}/sync`, {}, adminHeaders());
    assert.equal((await refreshed.json()).status, 'in_progress'); // GET /v1/ingest/errors/:id của mock

    const test = await post('/api/admin/errors/test', {}, adminHeaders());
    assert.equal(test.status, 201);
    assert.match((await test.json()).ticket_key, /^SHOP-/);

    mock.failNext = 503;
    const { errorId } = await (await post('/api/report-error', browserError({ message: 'Để thử gửi lại lỗi', stack: 'c\n at q (r.js:1:1)' }))).json();
    await waitFor(async () => (await row(errorId)).sync_attempts === 1);
    const response = await post(`/api/admin/errors/${errorId}/sync`, {}, adminHeaders());
    assert.equal(response.status, 200);
  });

  test('lỗi 5xx của backend cũng được ghi nhận', async () => {
    await errorReports.reportServerError(new Error('connection terminated'), { method: 'GET', path: '/api/products', user: undefined });
    const { rows } = await db.query(`SELECT * FROM error_reports WHERE source = 'server' ORDER BY created_at DESC LIMIT 1`);
    assert.equal(rows[0].message, 'Error: connection terminated');
    assert.equal(rows[0].route, 'GET /api/products');
    assert.equal(rows[0].page_url, 'https://shop.example.com/api/products');
    await waitFor(async () => (await row(rows[0].id)).ticket_id); // đợi lần gửi nền xong trước khi đóng pool
  });
});
