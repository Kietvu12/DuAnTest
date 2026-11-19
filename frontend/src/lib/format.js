const numberFormat = new Intl.NumberFormat('vi-VN');

export const FREE_SHIPPING_THRESHOLD = 2_000_000;
export const SHIPPING_FEE = 30_000;

export function formatPrice(amount) {
  return `${numberFormat.format(amount ?? 0)}₫`;
}

export function formatCompact(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '').replace('.', ',')}tr`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '').replace('.', ',')}k`;
  return String(n);
}

export function formatDate(value, withTime = false) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(value));
}

export function discountPercent(price, compare) {
  if (!compare || compare <= price) return 0;
  return Math.round(((compare - price) / compare) * 100);
}

export function shippingFor(subtotal) {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}

export const ORDER_STATUS = {
  pending: { label: 'Chờ xác nhận', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  confirmed: { label: 'Đã xác nhận', className: 'bg-sky-50 text-sky-700 ring-sky-200' },
  shipping: { label: 'Đang giao', className: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  delivered: { label: 'Đã giao', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  cancelled: { label: 'Đã huỷ', className: 'bg-zinc-100 text-zinc-500 ring-zinc-200' },
};

export const ORDER_FLOW = ['pending', 'confirmed', 'shipping', 'delivered'];

// Bốn nhóm trạng thái ticket của TicketForge (màu theo gợi ý trong tài liệu tích hợp).
export const ERROR_STATUS = {
  not_started: { label: 'Chưa làm', className: 'bg-zinc-100 text-zinc-600 ring-zinc-200' },
  in_progress: { label: 'Đang làm', className: 'bg-sky-50 text-sky-700 ring-sky-200' },
  refused: { label: 'Từ chối làm', className: 'bg-rose-50 text-rose-700 ring-rose-200' },
  done: { label: 'Hoàn thành', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
};

export const ERROR_SOURCE = {
  browser: 'Trình duyệt',
  server: 'Backend',
  manual: 'Gửi thử',
};

export const PAYMENT_METHODS = {
  cod: 'Thanh toán khi nhận hàng',
  bank_transfer: 'Chuyển khoản ngân hàng',
  card: 'Thẻ tín dụng / ghi nợ',
};
