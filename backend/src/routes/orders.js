import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { optionalAuth, requireAuth } from '../auth.js';
import { query, withTransaction } from '../db.js';
import { HttpError, text, toInt } from '../http.js';
import { discountFor, resolveCoupon, shippingFor } from '../pricing.js';

const router = Router();

const PAYMENT_METHODS = ['cod', 'bank_transfer', 'card'];
const PHONE_RE = /^0\d{9,10}$/;

export const ORDER_WITH_ITEMS = `
  SELECT o.*,
    (SELECT coalesce(json_agg(oi ORDER BY oi.id), '[]'::json) FROM order_items oi WHERE oi.order_id = o.id) AS items
  FROM orders o`;

function orderCode() {
  const now = new Date();
  const date = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return `VM${date}${randomBytes(3).toString('hex').toUpperCase()}`;
}

function parseLines(items) {
  if (!Array.isArray(items) || items.length === 0) throw new HttpError(400, 'Giỏ hàng đang trống');
  const lines = new Map();
  for (const item of items) {
    const variantId = toInt(item?.variantId);
    const quantity = toInt(item?.quantity);
    if (!variantId || !quantity || quantity < 1 || quantity > 20) {
      throw new HttpError(400, 'Sản phẩm trong giỏ hàng không hợp lệ');
    }
    lines.set(variantId, (lines.get(variantId) ?? 0) + quantity);
  }
  return lines;
}

function parseCustomer(customer = {}) {
  const result = {
    fullName: text(customer.fullName, 120),
    phone: text(customer.phone, 20).replace(/\s+/g, ''),
    email: text(customer.email, 160) || null,
    address: text(customer.address, 300),
    city: text(customer.city, 80),
    note: text(customer.note, 500) || null,
  };
  if (result.fullName.length < 2) throw new HttpError(400, 'Vui lòng nhập họ tên người nhận');
  if (!PHONE_RE.test(result.phone)) throw new HttpError(400, 'Số điện thoại không hợp lệ');
  if (result.address.length < 5) throw new HttpError(400, 'Vui lòng nhập địa chỉ giao hàng');
  if (!result.city) throw new HttpError(400, 'Vui lòng chọn tỉnh/thành phố');
  return result;
}

router.post('/coupons/validate', async (req, res) => {
  const subtotal = Math.max(0, toInt(req.body?.subtotal) ?? 0);
  const coupon = await resolveCoupon({ query }, req.body?.code, subtotal);
  if (!coupon) throw new HttpError(400, 'Vui lòng nhập mã giảm giá');
  const shippingFee = shippingFor(subtotal);
  res.json({
    code: coupon.code,
    description: coupon.description,
    type: coupon.type,
    discount: discountFor(coupon, subtotal, shippingFee),
    shipping_fee: shippingFee,
  });
});

router.post('/orders', optionalAuth, async (req, res) => {
  const lines = parseLines(req.body?.items);
  const customer = parseCustomer(req.body?.customer);
  const paymentMethod = req.body?.paymentMethod ?? 'cod';
  if (!PAYMENT_METHODS.includes(paymentMethod)) throw new HttpError(400, 'Phương thức thanh toán không hợp lệ');

  const order = await withTransaction(async (db) => {
    const { rows: variants } = await db.query(
      `SELECT v.id, v.name, v.price, v.stock, v.color_hex,
              p.id AS product_id, p.name AS product_name, p.slug, c.icon
       FROM product_variants v
       JOIN products p ON p.id = v.product_id
       JOIN categories c ON c.id = p.category_id
       WHERE v.id = ANY($1)
       FOR UPDATE OF v`,
      [[...lines.keys()]],
    );
    if (variants.length !== lines.size) throw new HttpError(400, 'Một số sản phẩm không còn được bán');

    let subtotal = 0;
    for (const variant of variants) {
      const quantity = lines.get(variant.id);
      if (variant.stock < quantity) {
        throw new HttpError(
          409,
          variant.stock === 0
            ? `${variant.product_name} (${variant.name}) đã hết hàng`
            : `${variant.product_name} (${variant.name}) chỉ còn ${variant.stock} sản phẩm`,
        );
      }
      subtotal += variant.price * quantity;
    }

    const shippingFee = shippingFor(subtotal);
    const coupon = await resolveCoupon(db, req.body?.couponCode, subtotal);
    const discount = discountFor(coupon, subtotal, shippingFee);
    const total = subtotal + shippingFee - discount;

    const {
      rows: [created],
    } = await db.query(
      `INSERT INTO orders (code, user_id, customer_name, phone, email, address, city, note,
                           payment_method, subtotal, shipping_fee, discount, total, coupon_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id`,
      [
        orderCode(),
        req.user?.sub ?? null,
        customer.fullName,
        customer.phone,
        customer.email,
        customer.address,
        customer.city,
        customer.note,
        paymentMethod,
        subtotal,
        shippingFee,
        discount,
        total,
        coupon?.code ?? null,
      ],
    );

    for (const variant of variants) {
      const quantity = lines.get(variant.id);
      await db.query(
        `INSERT INTO order_items (order_id, product_id, variant_id, product_name, product_slug,
                                  variant_name, color_hex, category_icon, unit_price, quantity)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          created.id,
          variant.product_id,
          variant.id,
          variant.product_name,
          variant.slug,
          variant.name,
          variant.color_hex,
          variant.icon,
          variant.price,
          quantity,
        ],
      );
      await db.query('UPDATE product_variants SET stock = stock - $2 WHERE id = $1', [variant.id, quantity]);
      await db.query('UPDATE products SET sold_count = sold_count + $2 WHERE id = $1', [variant.product_id, quantity]);
    }

    const {
      rows: [full],
    } = await db.query(`${ORDER_WITH_ITEMS} WHERE o.id = $1`, [created.id]);
    return full;
  });

  res.status(201).json(order);
});

router.get('/orders/mine', requireAuth, async (req, res) => {
  const { rows } = await query(`${ORDER_WITH_ITEMS} WHERE o.user_id = $1 ORDER BY o.created_at DESC`, [req.user.sub]);
  res.json(rows);
});

router.get('/orders/:code', optionalAuth, async (req, res) => {
  const {
    rows: [order],
  } = await query(`${ORDER_WITH_ITEMS} WHERE o.code = $1`, [text(req.params.code, 40).toUpperCase()]);
  if (!order) throw new HttpError(404, 'Không tìm thấy đơn hàng');

  const isOwner = req.user && (req.user.role === 'admin' || req.user.sub === order.user_id);
  const phoneMatches = text(req.query.phone, 20) === order.phone;
  if (!isOwner && !phoneMatches) throw new HttpError(404, 'Không tìm thấy đơn hàng');
  res.json(order);
});

export default router;
