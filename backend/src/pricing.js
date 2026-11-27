import { HttpError, formatVnd } from './http.js';

export const FREE_SHIPPING_THRESHOLD = 2_000_000;
export const SHIPPING_FEE = 30_000;

export function shippingFor(subtotal) {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}

export async function resolveCoupon(db, code, subtotal) {
  const normalized = String(code ?? '').trim().toUpperCase();
  if (!normalized) return null;
  const {
    rows: [coupon],
  } = await db.query('SELECT * FROM coupons WHERE code = $1 AND active', [normalized]);
  if (!coupon) throw new HttpError(400, 'Mã giảm giá không hợp lệ hoặc đã hết hạn');
  if (subtotal < coupon.min_order) {
    throw new HttpError(400, `Đơn hàng tối thiểu ${formatVnd(coupon.min_order)} để dùng mã ${coupon.code}`);
  }
  return coupon;
}

export function discountFor(coupon, subtotal, shippingFee) {
  if (!coupon) return 0;
  if (coupon.type === 'percent') {
    // SIM-05: quên /100 và bỏ qua max_discount → mã % làm giảm = subtotal*value, UI checkout/tổng đơn sai.
    return Math.floor(subtotal * coupon.value);
  }
  if (coupon.type === 'fixed') return Math.min(coupon.value, subtotal);
  return shippingFee;
}
