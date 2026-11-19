import { ApiError, tokenStore } from './api';

// Trình duyệt chỉ gửi lỗi về backend của VoltMart (/api/report-error). Backend mới gọi TicketForge:
// API key không bao giờ xuống trình duyệt.
const BASE_URL = import.meta.env.VITE_API_URL ?? '';

// Nhiễu vô hại hoặc không có thông tin để sửa.
const IGNORED = [/ResizeObserver loop/i, /^Script error\.?$/i, /^Load failed$/i];

const MAX_REPORTS_PER_PAGE_LOAD = 5;
const SAME_ERROR_COOLDOWN_MS = 60_000;

const lastSent = new Map();
let sentCount = 0;

/**
 * Gửi một lỗi về server. Không bao giờ ném lỗi và không chặn giao diện.
 * Cùng một lỗi chỉ gửi 1 lần/phút và tối đa 5 lỗi mỗi lần tải trang, để vòng lặp lỗi không làm ngập hệ thống.
 */
export function reportError(message, stack, { environment } = {}) {
  try {
    const text = String(message ?? '').slice(0, 1000);
    if (!text || IGNORED.some((pattern) => pattern.test(text))) return;

    const key = `${text}|${String(stack ?? '').slice(0, 200)}`;
    const now = Date.now();
    if (now - (lastSent.get(key) ?? 0) < SAME_ERROR_COOLDOWN_MS) return;
    if (sentCount >= MAX_REPORTS_PER_PAGE_LOAD) return;
    lastSent.set(key, now);
    sentCount += 1;

    const headers = { 'Content-Type': 'application/json' };
    const token = tokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`; // để biết lỗi của tài khoản nào

    fetch(`${BASE_URL}/api/report-error`, {
      method: 'POST',
      headers,
      keepalive: true, // vẫn gửi được khi người dùng vừa chuyển trang
      body: JSON.stringify({
        message: text,
        stack: stack ? String(stack).slice(0, 15_000) : undefined,
        route: window.location.pathname,
        pageUrl: `${window.location.origin}${window.location.pathname}`,
        userAgent: navigator.userAgent,
        environment: {
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          language: navigator.language,
          ...environment,
        },
      }),
    }).catch(() => {});
  } catch {
    // báo lỗi không được phép gây thêm lỗi
  }
}

function reasonToReport(reason) {
  // Lỗi 4xx từ API là phản hồi bình thường (sai mật khẩu, hết hàng...), không phải bug.
  if (reason instanceof ApiError && reason.status < 500) return null;
  if (reason?.name === 'AbortError') return null;
  if (reason instanceof Error) return { message: `${reason.name}: ${reason.message}`, stack: reason.stack };
  return { message: `Unhandled rejection: ${String(reason)}`, stack: undefined };
}

/** Lỗi JavaScript chưa bắt + Promise bị reject mà không có catch. */
export function installGlobalErrorHandlers() {
  window.addEventListener('error', (event) => {
    if (!event.error && !event.message) return;
    const name = event.error?.name ?? 'Error';
    reportError(`${name}: ${event.error?.message ?? event.message}`, event.error?.stack, {
      environment: { source: 'window.onerror' },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const report = reasonToReport(event.reason);
    if (report) reportError(report.message, report.stack, { environment: { source: 'unhandledrejection' } });
  });
}
