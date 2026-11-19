import express, { Router } from 'express';
import { optionalAuth } from '../auth.js';
import { MAX_MESSAGE, MAX_STACK, applyTicketStatus, recordError } from '../errorReports.js';
import { HttpError, text } from '../http.js';
import { tfConfig, verifyWebhookSignature } from '../ticketforge.js';

// ---------------------------------------------------------------------------------------------
// Webhook từ TicketForge. Phải mount TRƯỚC express.json(): chữ ký tính trên body gốc.
export const webhookRouter = Router();

webhookRouter.post('/webhook', express.raw({ type: 'application/json', limit: '200kb' }), async (req, res) => {
  const { webhookSecret } = tfConfig();
  if (!webhookSecret) throw new HttpError(503, 'Chưa cấu hình TICKETFORGE_WEBHOOK_SECRET');

  const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
  const check = verifyWebhookSignature(raw, req.get('X-TicketForge-Signature'), webhookSecret);
  if (!check.ok) throw new HttpError(check.status, check.reason);

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    throw new HttpError(400, 'Body không phải JSON');
  }

  // "Gửi thử" trong TicketForge → Cài đặt → API.
  if (event.type === 'ticket.test') return res.json({ ok: true, test: true });

  if (event.type === 'ticket.status_changed' && event.data) {
    const { data } = event;
    await applyTicketStatus({
      ticketId: data.ticketId,
      externalId: data.metadata?.externalId,
      status: data.status,
      statusLabel: data.statusLabel,
      updatedAt: data.updatedAt ?? event.createdAt,
    });
  }
  // Luôn trả 2xx cho sự kiện hợp lệ (kể cả bản ghi không còn) để TicketForge không gửi lại vô ích.
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------------------------
// Trình duyệt báo lỗi về đây; API key chỉ nằm ở server.
export const reportRouter = Router();

const buckets = new Map();
const GLOBAL_LIMIT = 120; // lỗi/phút cho toàn hệ thống
const CLIENT_LIMIT = 20; // lỗi/phút cho mỗi người dùng
let globalWindow = { count: 0, resetAt: 0 };

function clientKey(req) {
  return String(req.get('x-forwarded-for') ?? req.socket.remoteAddress ?? '').split(',')[0].trim();
}

function rateLimit(req, _res, next) {
  const now = Date.now();
  if (now > globalWindow.resetAt) globalWindow = { count: 0, resetAt: now + 60_000 };
  if (++globalWindow.count > GLOBAL_LIMIT) return next(new HttpError(429, 'Quá nhiều báo cáo lỗi, vui lòng thử lại sau'));

  if (buckets.size > 2000) {
    for (const [key, bucket] of buckets) if (now > bucket.resetAt) buckets.delete(key);
  }
  const key = clientKey(req);
  let bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + 60_000 };
    buckets.set(key, bucket);
  }
  if (++bucket.count > CLIENT_LIMIT) return next(new HttpError(429, 'Quá nhiều báo cáo lỗi, vui lòng thử lại sau'));
  next();
}

reportRouter.post('/report-error', optionalAuth, rateLimit, async (req, res) => {
  const body = req.body ?? {};
  const message = text(body.message, MAX_MESSAGE);
  if (!message) throw new HttpError(422, 'Thiếu nội dung lỗi');

  const result = await recordError({
    source: 'browser',
    message,
    stack: text(body.stack, MAX_STACK),
    route: text(body.route, 300),
    pageUrl: text(body.pageUrl, 500),
    userAgent: text(body.userAgent || req.get('user-agent'), 400),
    environment: body.environment,
    userId: Number.isInteger(Number(req.user?.sub)) ? Number(req.user.sub) : undefined,
  });
  // 202: đã nhận, việc tạo ticket chạy nền.
  res.status(202).json({ errorId: result.id });
});
