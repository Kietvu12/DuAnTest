export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function toInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export function text(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

export function formatVnd(amount) {
  return `${new Intl.NumberFormat('vi-VN').format(amount)}₫`;
}
