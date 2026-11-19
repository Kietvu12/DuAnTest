import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pool, query } from './db.js';
import { HttpError, text } from './http.js';
import {
  STATUS_LABELS,
  TicketForgeError,
  createTicket,
  getTicket,
  isConfigured,
  normalizeStatus,
  tfConfig,
} from './ticketforge.js';

export const MAX_MESSAGE = 2000;
export const MAX_STACK = 20_000;
export const ERROR_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_SYNC_ATTEMPTS = 10;
const MAX_REQUESTS_PER_MINUTE = 50; // TicketForge giới hạn 60 yêu cầu/phút cho mỗi API key

export async function ensureErrorTables() {
  await pool.query(await readFile(new URL('../db/error-reports.sql', import.meta.url), 'utf8'));
}

// ---------------------------------------------------------------------------------------------
// Giữ tổng số yêu cầu gửi sang TicketForge dưới giới hạn của họ.
const sentAt = [];
function takeSlot() {
  const now = Date.now();
  while (sentAt.length && now - sentAt[0] > 60_000) sentAt.shift();
  if (sentAt.length >= MAX_REQUESTS_PER_MINUTE) return false;
  sentAt.push(now);
  return true;
}

// ---------------------------------------------------------------------------------------------
/** Cùng một lỗi (khác số dòng, id, số...) cho ra cùng một fingerprint để không tạo hàng loạt ticket. */
export function fingerprint({ source, route, message, stack }) {
  const normalize = (value) =>
    String(value ?? '')
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<id>')
      .replace(/\d+/g, '#');
  const frames = String(stack ?? '')
    .split('\n')
    .filter((line) => /^\s*at\s|@/.test(line))
    .slice(0, 3)
    .map(normalize);
  return createHash('sha1')
    .update([source, normalize(route), normalize(message.split('\n')[0]), ...frames].join('|'))
    .digest('hex');
}

function allowedHosts() {
  const { siteUrl } = tfConfig();
  const urls = [siteUrl, ...(process.env.CORS_ORIGIN ?? '').split(',')];
  const hosts = new Set(['localhost', '127.0.0.1']);
  for (const value of urls) {
    try {
      hosts.add(new URL(value).hostname);
    } catch {
      // bỏ qua giá trị không phải URL
    }
  }
  return hosts;
}

/**
 * TicketForge kiểm tra pageUrl thuộc domain đã đăng ký, nên chỉ chuyển tiếp URL thuộc site của mình.
 * Bỏ query/hash vì có thể chứa thông tin cá nhân (số điện thoại, mã giảm giá...).
 */
export function resolvePageUrl(pageUrl, route) {
  try {
    const url = new URL(pageUrl);
    if (allowedHosts().has(url.hostname)) return `${url.origin}${url.pathname}`;
  } catch {
    // rơi xuống nhánh dưới
  }
  const { siteUrl } = tfConfig();
  if (!siteUrl) return null;
  return `${siteUrl}${typeof route === 'string' && route.startsWith('/') ? route.split(/[?#]/)[0] : '/'}`;
}

function cleanEnvironment(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 12)
      .filter(([, v]) => ['string', 'number', 'boolean'].includes(typeof v))
      .map(([k, v]) => [text(k, 40), typeof v === 'string' ? text(v, 200) : v]),
  );
}

/**
 * Lưu một lỗi. Lỗi giống hệt (chưa "Hoàn thành") trong 24 giờ chỉ tăng bộ đếm.
 * Lỗi tái phát sau khi ticket đã hoàn thành sẽ tạo ticket mới.
 */
export async function recordError(input) {
  const message = text(input.message, MAX_MESSAGE);
  if (!message) throw new HttpError(422, 'Thiếu nội dung lỗi');
  const source = ['browser', 'server', 'manual'].includes(input.source) ? input.source : 'browser';
  const stack = text(input.stack, MAX_STACK) || null;
  const route = text(input.route, 300) || null;
  const print = input.fingerprint ?? fingerprint({ source, route, message, stack });

  const {
    rows: [duplicate],
  } = await query(
    `UPDATE error_reports SET occurrences = occurrences + 1, last_seen_at = now(), updated_at = now()
     WHERE id = (SELECT id FROM error_reports
                 WHERE fingerprint = $1 AND status <> 'done' AND created_at > now() - interval '24 hours'
                 ORDER BY created_at DESC LIMIT 1)
     RETURNING id`,
    [print],
  );
  if (duplicate) return { id: duplicate.id, duplicate: true };

  const id = randomUUID();
  await query(
    `INSERT INTO error_reports (id, source, message, stack, route, page_url, user_agent, environment, release, user_id, fingerprint)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      id,
      source,
      message,
      stack,
      route,
      source === 'browser' ? resolvePageUrl(input.pageUrl, route) : (input.pageUrl ?? null),
      text(input.userAgent, 400) || null,
      JSON.stringify(cleanEnvironment(input.environment)),
      tfConfig().release,
      Number.isInteger(input.userId) ? input.userId : null,
      print,
    ],
  );
  // Gửi nền: người dùng không phải chờ TicketForge.
  if (input.autoSync !== false && isConfigured()) {
    void syncReport(id).catch((error) => console.error('[ticketforge] sync', error.message));
  }
  return { id, duplicate: false };
}

// ---------------------------------------------------------------------------------------------
const syncing = new Set();

/**
 * Gửi một lỗi sang TicketForge để tạo ticket. Lỗi tạm thời (mạng, 5xx, 429, 401) được thử lại với
 * khoảng cách tăng dần; lỗi cố định (400/409/422...) chuyển sang "failed" để quản trị viên xử lý.
 * `throwOnError` dùng cho thao tác thủ công, để hiện đúng lý do cho người bấm.
 */
export async function syncReport(id, { throwOnError = false } = {}) {
  if (syncing.has(id)) {
    const { rows } = await query('SELECT * FROM error_reports WHERE id = $1', [id]);
    return rows[0] ?? null; // đang được gửi ở nơi khác
  }
  syncing.add(id);
  try {
    const {
      rows: [report],
    } = await query('SELECT * FROM error_reports WHERE id = $1', [id]);
    if (!report || report.ticket_id) return report ?? null;

    try {
      if (!isConfigured()) {
        throw new TicketForgeError('Chưa cấu hình TICKETFORGE_API_KEY', { retryable: true, code: 'unconfigured' });
      }
      if (!takeSlot()) throw new TicketForgeError('Đang chờ giới hạn tốc độ của TicketForge', { retryable: true, code: 'throttled' });
      const ticket = await createTicket(report);
      const {
        rows: [updated],
      } = await query(
        `UPDATE error_reports SET
           ticket_id = $2, ticket_key = $3,
           status = CASE WHEN tf_updated_at IS NULL THEN $4 ELSE status END,
           status_label = CASE WHEN tf_updated_at IS NULL THEN $5 ELSE status_label END,
           sync_state = 'synced', sync_error = NULL, tf_checked_at = now(), updated_at = now()
         WHERE id = $1 RETURNING *`,
        [id, ticket.ticketId, ticket.ticketKey ?? null, ticket.status, STATUS_LABELS[ticket.status]],
      );
      return updated;
    } catch (error) {
      const softCode = error.code === 'unconfigured' || error.code === 'throttled';
      const attempts = report.sync_attempts + (softCode ? 0 : 1);
      const permanent = !(error.retryable ?? true) || attempts >= MAX_SYNC_ATTEMPTS;
      const delaySeconds = softCode ? 30 : Math.min(600, 30 * 2 ** (attempts - 1));
      const {
        rows: [updated],
      } = await query(
        `UPDATE error_reports SET sync_state = $2, sync_error = $3, sync_attempts = $4,
                next_attempt_at = now() + make_interval(secs => $5), updated_at = now()
         WHERE id = $1 RETURNING *`,
        [id, permanent ? 'failed' : 'pending', String(error.message).slice(0, 500), attempts, delaySeconds],
      );
      if (throwOnError) throw new HttpError(502, error.message);
      return updated;
    }
  } finally {
    syncing.delete(id);
  }
}

/** Cập nhật trạng thái từ webhook hoặc từ GET. Bỏ qua bản tin cũ hơn bản đã lưu. */
export async function applyTicketStatus({ ticketId, externalId, status, statusLabel, updatedAt }) {
  const normalized = normalizeStatus(status);
  const at = updatedAt && !Number.isNaN(Date.parse(updatedAt)) ? updatedAt : new Date().toISOString();
  const { rows } = await query(
    `UPDATE error_reports SET status = $3, status_label = $4, tf_updated_at = $5, tf_checked_at = now(),
            ticket_id = coalesce(ticket_id, $2), sync_state = 'synced', sync_error = NULL, updated_at = now()
     WHERE (($1::text IS NOT NULL AND id::text = $1) OR ($2::text IS NOT NULL AND ticket_id = $2))
       AND (tf_updated_at IS NULL OR tf_updated_at <= $5)
     RETURNING id`,
    [externalId ?? null, ticketId ?? null, normalized, statusLabel || STATUS_LABELS[normalized], at],
  );
  return rows.length;
}

/** Đối chiếu bằng GET cho ticket chưa hoàn thành, phòng khi lỡ webhook. */
export async function refreshReport(id, { throwOnError = false } = {}) {
  const {
    rows: [report],
  } = await query('SELECT id, ticket_id FROM error_reports WHERE id = $1', [id]);
  if (!report?.ticket_id) return null;
  try {
    if (!takeSlot()) throw new TicketForgeError('Đang chờ giới hạn tốc độ của TicketForge', { retryable: true });
    const ticket = await getTicket(report.ticket_id);
    if (!ticket) {
      await query(
        `UPDATE error_reports SET sync_error = 'Ticket không còn tồn tại trên TicketForge', tf_checked_at = now() WHERE id = $1`,
        [id],
      );
    } else {
      await applyTicketStatus({
        ticketId: ticket.ticketId,
        externalId: ticket.metadata?.externalId ?? id,
        status: ticket.status,
        statusLabel: ticket.statusLabel,
        updatedAt: ticket.updatedAt,
      });
    }
  } catch (error) {
    await query('UPDATE error_reports SET sync_error = $2, tf_checked_at = now() WHERE id = $1', [id, String(error.message).slice(0, 500)]);
    if (throwOnError) throw new HttpError(502, error.message);
  }
  const { rows } = await query('SELECT * FROM error_reports WHERE id = $1', [id]);
  return rows[0];
}

export async function syncPending(limit = 5) {
  if (!isConfigured()) return 0;
  const { rows } = await query(
    `SELECT id FROM error_reports
     WHERE ticket_id IS NULL AND sync_state = 'pending' AND next_attempt_at <= now()
     ORDER BY created_at LIMIT $1`,
    [limit],
  );
  for (const { id } of rows) await syncReport(id);
  return rows.length;
}

export async function reconcileStatuses(limit = 10) {
  if (!isConfigured()) return 0;
  const { rows } = await query(
    `SELECT id FROM error_reports
     WHERE ticket_id IS NOT NULL AND status <> 'done'
     ORDER BY tf_checked_at NULLS FIRST LIMIT $1`,
    [limit],
  );
  for (const { id } of rows) await refreshReport(id);
  return rows.length;
}

/** Chạy nền: thử lại các lỗi chưa gửi mỗi 30 giây, đối chiếu trạng thái mỗi 5 phút. */
export function startErrorSyncWorker() {
  let ticks = 0;
  let running = false;
  const timer = setInterval(async () => {
    if (running || !isConfigured()) return;
    running = true;
    try {
      ticks += 1;
      await syncPending(5);
      if (ticks % 10 === 0) await reconcileStatuses(10);
    } catch (error) {
      console.error('[ticketforge] worker', error.message);
    } finally {
      running = false;
    }
  }, 30_000);
  timer.unref();
  return timer;
}

/** Báo lỗi 5xx của chính backend. Không bao giờ ném lỗi để không làm hỏng response đang trả về. */
export async function reportServerError(error, req) {
  try {
    const route = `${req.method} ${req.path}`;
    const { siteUrl } = tfConfig();
    await recordError({
      source: 'server',
      message: `${error?.name ?? 'Error'}: ${error?.message ?? String(error)}`,
      stack: error?.stack,
      route,
      pageUrl: siteUrl ? `${siteUrl}${req.path}` : null,
      environment: { platform: 'server', node: process.version },
      userId: Number.isInteger(req.user?.sub) ? req.user.sub : undefined,
    });
  } catch (reportingError) {
    console.error('[ticketforge] không ghi được lỗi server:', reportingError.message);
  }
}
