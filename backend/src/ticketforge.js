// Client cho API tích hợp của TicketForge (xem https://ticketforge.vietdemo.com/docs).
//   POST /v1/ingest/errors        tạo ticket từ một lỗi
//   GET  /v1/ingest/errors/:id    đọc trạng thái ticket
//   Webhook ticket.status_changed ký HMAC-SHA256 (header X-TicketForge-Signature: t=<unix>,v1=<hex>)
import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';

const { version: PACKAGE_VERSION = '0.0.0' } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

// scripts/deploy.sh ghi mã commit đang chạy vào backend/RELEASE để agent biết lỗi thuộc bản nào.
function readReleaseFile() {
  try {
    return readFileSync(new URL('../RELEASE', import.meta.url), 'utf8').trim();
  } catch {
    return '';
  }
}
const RELEASE_FILE = readReleaseFile();

/** Bốn nhóm trạng thái mà TicketForge trả ra ngoài. */
export const STATUS_LABELS = {
  not_started: 'Chưa làm',
  in_progress: 'Đang làm',
  refused: 'Từ chối làm',
  done: 'Hoàn thành',
};

/** Cấu hình đọc từ biến môi trường tại thời điểm gọi (đổi .env + restart là có hiệu lực). */
export function tfConfig() {
  const env = process.env;
  return {
    // Chạy cùng server với TicketForge thì đặt http://127.0.0.1:3154: server không gọi được tên miền công khai của chính nó.
    url: (env.TICKETFORGE_URL || 'https://ticketforge.vietdemo.com').replace(/\/+$/, ''),
    publicUrl: (env.TICKETFORGE_PUBLIC_URL || 'https://ticketforge.vietdemo.com').replace(/\/+$/, ''),
    apiKey: env.TICKETFORGE_API_KEY?.trim() || '',
    webhookSecret: env.TICKETFORGE_WEBHOOK_SECRET?.trim() || '',
    // Địa chỉ công khai của VoltMart. Domain này phải được thêm ở TicketForge → Cài đặt → API.
    siteUrl: (env.PUBLIC_URL || '').replace(/\/+$/, ''),
    release: env.APP_RELEASE?.trim() || RELEASE_FILE || PACKAGE_VERSION,
  };
}

export const isConfigured = () => Boolean(tfConfig().apiKey);

export function normalizeStatus(status) {
  return Object.hasOwn(STATUS_LABELS, status) ? status : 'not_started';
}

export class TicketForgeError extends Error {
  constructor(message, { status = 0, retryable = false, code } = {}) {
    super(message);
    this.status = status;
    this.retryable = retryable;
    this.code = code;
  }
}

async function call(path, { method = 'GET', headers = {}, body } = {}) {
  const { url, apiKey } = tfConfig();
  if (!apiKey) {
    throw new TicketForgeError('Chưa cấu hình TICKETFORGE_API_KEY', { retryable: true, code: 'unconfigured' });
  }

  let response;
  try {
    response = await fetch(`${url}${path}`, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, ...headers },
      body,
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    throw new TicketForgeError(`Không kết nối được TicketForge (${error.cause?.code ?? error.message})`, {
      retryable: true,
      code: 'network',
    });
  }

  const raw = await response.text();
  let data = null;
  try {
    data = JSON.parse(raw);
  } catch {
    // body không phải JSON
  }
  if (!response.ok) {
    const detail = (Array.isArray(data?.message) ? data.message.join(', ') : data?.message) ?? raw.slice(0, 200);
    // 401 giữ lại để thử lại: key có thể đang được thay. 429/5xx là lỗi tạm thời.
    const retryable = response.status === 401 || response.status === 429 || response.status >= 500;
    throw new TicketForgeError(`TicketForge ${response.status}: ${detail}`, { status: response.status, retryable });
  }
  return data;
}

const SOURCE_LABELS = { browser: 'Trình duyệt của khách', server: 'Backend (lỗi 5xx)', manual: 'Gửi thử từ trang quản trị' };

/** Dòng đầu là tiêu đề ticket (tối đa 140 ký tự), phần sau là ngữ cảnh để agent định vị lỗi. */
export function buildPrompt(report) {
  const firstLine = report.message.split('\n')[0].trim();
  const title = firstLine.length > 140 ? `${firstLine.slice(0, 137)}…` : firstLine;
  const lines = [title, ''];
  if (report.message.trim() !== title) lines.push(report.message.trim(), '');
  lines.push(`Hệ thống: VoltMart (cửa hàng đồ điện tử, React + Express + PostgreSQL)`);
  lines.push(`Nguồn: ${SOURCE_LABELS[report.source] ?? report.source}`);
  if (report.route) lines.push(`Màn hình / API: ${report.route}`);
  if (report.occurrences > 1) lines.push(`Đã xảy ra: ${report.occurrences} lần`);
  return lines.join('\n');
}

export async function createTicket(report) {
  const { release } = tfConfig();
  const payload = {
    prompt: buildPrompt(report),
    route: report.route || undefined,
    pageUrl: report.page_url || undefined,
    release,
    stacktrace: report.stack || undefined,
    environment: { ...report.environment, userAgent: report.user_agent || undefined },
    metadata: {
      externalId: report.id, // webhook trả lại đúng giá trị này để khớp với bản ghi lỗi
      source: report.source,
      userId: report.user_id ?? undefined,
    },
  };
  const ticket = await call('/v1/ingest/errors', {
    method: 'POST',
    // Gửi lại cùng key + cùng nội dung sẽ không tạo ticket trùng.
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': report.id },
    body: JSON.stringify(payload),
  });
  if (!ticket?.ticketId) throw new TicketForgeError('TicketForge không trả về ticketId', { retryable: true });
  return { ticketId: ticket.ticketId, ticketKey: ticket.ticketKey, status: normalizeStatus(ticket.status) };
}

/** Trả null nếu ticket không tồn tại hoặc không thuộc API key này (404). */
export async function getTicket(ticketId) {
  try {
    return await call(`/v1/ingest/errors/${encodeURIComponent(ticketId)}`);
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

/**
 * Kiểm chữ ký webhook trên chuỗi body gốc: HMAC-SHA256 của "<t>.<body>", so sánh hằng thời gian,
 * từ chối request lệch quá 5 phút.
 */
export function verifyWebhookSignature(rawBody, header, secret, nowMs = Date.now()) {
  const match = /t=(\d+),v1=([0-9a-f]+)/.exec(header ?? '');
  if (!match) return { ok: false, status: 400, reason: 'Thiếu hoặc sai định dạng chữ ký' };
  const [, timestamp, signature] = match;
  if (Math.abs(nowMs / 1000 - Number(timestamp)) > 300) {
    return { ok: false, status: 400, reason: 'Chữ ký đã quá hạn' };
  }
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, status: 401, reason: 'Chữ ký không hợp lệ' };
  return { ok: true };
}
