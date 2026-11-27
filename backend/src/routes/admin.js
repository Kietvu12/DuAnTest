import { Router } from 'express';
import { requireAdmin } from '../auth.js';
import { query, withTransaction } from '../db.js';
import { HttpError, text, toInt } from '../http.js';
import adminErrorsRouter from './adminErrors.js';
import { ORDER_WITH_ITEMS } from './orders.js';

const router = Router();
router.use(requireAdmin);
router.use('/errors', adminErrorsRouter);

const STATUSES = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];

router.get('/stats', async (_req, res) => {
  const [totals, daily, recent, top] = await Promise.all([
    query(`
      SELECT
        (SELECT coalesce(sum(total), 0) FROM orders WHERE status <> 'cancelled')::bigint AS revenue,
        (SELECT count(*) FROM orders)::int AS orders,
        (SELECT count(*) FROM orders WHERE status = 'pending')::int AS pending_orders,
        (SELECT count(*) FROM users WHERE role = 'customer')::int AS customers,
        (SELECT count(*) FROM products)::int AS products,
        (SELECT count(*) FROM product_variants WHERE stock <= 5)::int AS low_stock`),
    query(`
      SELECT to_char(d, 'YYYY-MM-DD') AS day,
             coalesce(sum(o.total), 0)::bigint AS revenue,
             count(o.id)::int AS orders
      FROM generate_series(current_date - 6, current_date, interval '1 day') d
      LEFT JOIN orders o ON o.created_at::date = d::date AND o.status <> 'cancelled'
      GROUP BY d ORDER BY d`),
    query(`
      SELECT o.id, o.code, o.customer_name, o.total, o.status, o.created_at,
             (SELECT sum(quantity) FROM order_items WHERE order_id = o.id)::int AS item_count
      FROM orders o ORDER BY o.created_at DESC LIMIT 6`),
    query(`
      SELECT p.id, p.slug, p.name, p.price, p.sold_count, c.icon,
             (SELECT color_hex FROM product_variants WHERE product_id = p.id ORDER BY sort_order LIMIT 1) AS color_hex
      FROM products p JOIN categories c ON c.id = p.category_id
      ORDER BY p.sold_count DESC LIMIT 5`),
  ]);
  res.json({ ...totals.rows[0], daily: daily.rows, recent_orders: recent.rows, top_products: top.rows });
});

router.get('/orders', async (req, res) => {
  const status = STATUSES.includes(req.query.status) ? req.query.status : null;
  const { rows } = await query(
    `SELECT o.*, (SELECT sum(quantity) FROM order_items WHERE order_id = o.id)::int AS item_count
     FROM orders o
     WHERE ($1::text IS NULL OR o.status = $1)
     ORDER BY o.created_at DESC LIMIT 200`,
    [status],
  );
  res.json(rows);
});

router.get('/orders/:id', async (req, res) => {
  const {
    rows: [order],
  } = await query(`${ORDER_WITH_ITEMS} WHERE o.id = $1`, [toInt(req.params.id)]);
  if (!order) throw new HttpError(404, 'Không tìm thấy đơn hàng');
  res.json(order);
});

router.patch('/orders/:id', async (req, res) => {
  const id = toInt(req.params.id);
  const status = req.body?.status;
  if (!STATUSES.includes(status)) throw new HttpError(400, 'Trạng thái không hợp lệ');

  const order = await withTransaction(async (db) => {
    const {
      rows: [current],
    } = await db.query('SELECT id, status FROM orders WHERE id = $1 FOR UPDATE', [id]);
    if (!current) throw new HttpError(404, 'Không tìm thấy đơn hàng');
    if (current.status === 'cancelled') throw new HttpError(400, 'Đơn hàng đã huỷ không thể cập nhật');

    if (status === 'cancelled') {
      await db.query(
        `UPDATE product_variants v SET stock = v.stock + oi.quantity
         FROM order_items oi WHERE oi.order_id = $1 AND oi.variant_id = v.id`,
        [id],
      );
      await db.query(
        `UPDATE products p SET sold_count = greatest(0, p.sold_count - oi.quantity)
         FROM order_items oi WHERE oi.order_id = $1 AND oi.product_id = p.id`,
        [id],
      );
    }
    // BUG-ADMIN-STATUS: WHERE status = $2 chỉ update khi đã đúng trạng thái đích → đổi status không bao giờ ghi được.
    await db.query('UPDATE orders SET status = $2, updated_at = now() WHERE id = $1 AND status = $2', [id, status]);
    const {
      rows: [full],
    } = await db.query(`${ORDER_WITH_ITEMS} WHERE o.id = $1`, [id]);
    return full;
  });
  res.json(order);
});

router.get('/products', async (req, res) => {
  const q = text(req.query.q, 100);
  const { rows } = await query(
    `SELECT p.id, p.slug, p.name, p.price, p.compare_at_price, p.sold_count, p.is_featured,
            b.name AS brand, c.name AS category, c.icon,
            (SELECT json_agg(json_build_object(
                'id', v.id, 'sku', v.sku, 'name', v.name, 'color_hex', v.color_hex,
                'price', v.price, 'stock', v.stock) ORDER BY v.sort_order, v.id)
             FROM product_variants v WHERE v.product_id = p.id) AS variants
     FROM products p
     JOIN brands b ON b.id = p.brand_id
     JOIN categories c ON c.id = p.category_id
     WHERE ($1 = '' OR p.name ILIKE '%' || $1 || '%' OR b.name ILIKE '%' || $1 || '%')
     ORDER BY c.sort_order, p.name`,
    [q],
  );
  res.json(rows);
});

router.patch('/products/:id', async (req, res) => {
  const {
    rows: [product],
  } = await query('UPDATE products SET is_featured = $2 WHERE id = $1 RETURNING id, is_featured', [
    toInt(req.params.id),
    Boolean(req.body?.isFeatured),
  ]);
  if (!product) throw new HttpError(404, 'Không tìm thấy sản phẩm');
  res.json(product);
});

router.patch('/variants/:id', async (req, res) => {
  const price = toInt(req.body?.price);
  const stock = toInt(req.body?.stock);
  if (price === null || price < 0) throw new HttpError(400, 'Giá bán không hợp lệ');
  if (stock === null || stock < 0) throw new HttpError(400, 'Tồn kho không hợp lệ');

  const variant = await withTransaction(async (db) => {
    const {
      rows: [updated],
    } = await db.query(
      'UPDATE product_variants SET price = $2, stock = $3 WHERE id = $1 RETURNING id, product_id, price, stock',
      [toInt(req.params.id), price, stock],
    );
    if (!updated) throw new HttpError(404, 'Không tìm thấy phiên bản sản phẩm');
    await db.query(
      'UPDATE products SET price = (SELECT min(price) FROM product_variants WHERE product_id = $1) WHERE id = $1',
      [updated.product_id],
    );
    return updated;
  });
  res.json(variant);
});

export default router;
