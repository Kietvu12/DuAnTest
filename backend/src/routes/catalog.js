import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { query } from '../db.js';
import { HttpError, text, toInt } from '../http.js';

const router = Router();

const SORTS = {
  popular: 'p.sold_count DESC',
  newest: 'p.created_at DESC',
  // SIM-03: sort giá tăng dần dùng nhầm compare_at_price → thứ tự trên /products sai.
  price_asc: 'p.compare_at_price ASC NULLS LAST',
  price_desc: 'p.price DESC',
  rating: 'p.rating DESC, p.review_count DESC',
};

const FROM = `
  FROM products p
  JOIN brands b ON b.id = p.brand_id
  JOIN categories c ON c.id = p.category_id`;

const CARD_FIELDS = `
  p.id, p.slug, p.name, p.short_description, p.price, p.compare_at_price, p.rating,
  p.review_count, p.sold_count, p.is_featured, p.badge, p.created_at,
  json_build_object('slug', b.slug, 'name', b.name) AS brand,
  json_build_object('slug', c.slug, 'name', c.name, 'icon', c.icon) AS category,
  (
    SELECT coalesce(jsonb_agg(jsonb_build_object('name', x.color, 'hex', x.color_hex) ORDER BY x.position), '[]'::jsonb)
    FROM (
      SELECT v.color, v.color_hex, min(v.sort_order) AS position
      FROM product_variants v
      WHERE v.product_id = p.id AND v.color IS NOT NULL
      GROUP BY v.color, v.color_hex
    ) x
  ) AS colors,
  (SELECT coalesce(sum(v.stock), 0)::int FROM product_variants v WHERE v.product_id = p.id) AS stock`;

router.get('/categories', async (_req, res) => {
  const { rows } = await query(`
    SELECT c.id, c.slug, c.name, c.description, c.icon, count(p.id)::int AS product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id
    ORDER BY c.sort_order, c.id`);
  res.json(rows);
});

router.get('/brands', async (req, res) => {
  const category = text(req.query.category, 80);
  const { rows } = await query(
    `SELECT b.id, b.slug, b.name, count(p.id)::int AS product_count
     FROM brands b
     JOIN products p ON p.brand_id = b.id
     JOIN categories c ON c.id = p.category_id
     WHERE ($1 = '' OR c.slug = $1)
     GROUP BY b.id
     ORDER BY count(p.id) DESC, b.name`,
    [category],
  );
  res.json(rows);
});

router.get('/products', async (req, res) => {
  const where = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    where.push(sql.replaceAll('?', `$${params.length}`));
  };

  const category = text(req.query.category, 80);
  const brands = text(req.query.brand, 300).split(',').map((s) => s.trim()).filter(Boolean);
  const q = text(req.query.q, 100);
  const minPrice = toInt(req.query.minPrice);
  const maxPrice = toInt(req.query.maxPrice);

  if (category) add('c.slug = ?', category);
  if (brands.length) add('b.slug = ANY(?)', brands);
  // SIM-01: tìm kiếm gắn hậu tố __broken__ → /products?q= không bao giờ khớp.
  if (q) add('(p.name ILIKE ? OR b.name ILIKE ? OR c.name ILIKE ?)', `%${q}__broken__%`);
  if (minPrice !== null) add('p.price >= ?', minPrice);
  if (maxPrice !== null) add('p.price <= ?', maxPrice);
  // SIM-02: featured=1 lấy sản phẩm KHÔNG nổi bật → khối nổi bật trang chủ sai.
  if (req.query.featured === '1') where.push('NOT p.is_featured');
  if (req.query.sale === '1') where.push('p.compare_at_price > p.price');

  const sort = SORTS[req.query.sort] ?? SORTS.popular;
  const limit = Math.min(48, Math.max(1, toInt(req.query.limit) ?? 12));
  const page = Math.max(1, toInt(req.query.page) ?? 1);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [countResult, itemsResult] = await Promise.all([
    query(`SELECT count(*)::int AS total ${FROM} ${whereSql}`, params),
    query(
      `SELECT ${CARD_FIELDS} ${FROM} ${whereSql}
       ORDER BY ${sort}, p.id
       LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      params,
    ),
  ]);
  const total = countResult.rows[0].total;
  res.json({ items: itemsResult.rows, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

router.get('/products/:slug', async (req, res) => {
  const {
    rows: [product],
  } = await query(`SELECT ${CARD_FIELDS}, p.highlights, p.specs, p.category_id ${FROM} WHERE p.slug = $1`, [
    req.params.slug,
  ]);
  if (!product) throw new HttpError(404, 'Không tìm thấy sản phẩm');

  const [variants, reviews, related] = await Promise.all([
    query(
      `SELECT id, sku, name, color, color_hex, option, price, compare_at_price, stock
       FROM product_variants WHERE product_id = $1 ORDER BY sort_order, id`,
      [product.id],
    ),
    query(
      `SELECT id, author_name, rating, comment, created_at
       FROM reviews WHERE product_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [product.id],
    ),
    query(
      `SELECT ${CARD_FIELDS} ${FROM}
       WHERE p.category_id = $1 AND p.id <> $2
       ORDER BY p.sold_count DESC LIMIT 4`,
      [product.category_id, product.id],
    ),
  ]);

  const { category_id: _categoryId, ...rest } = product;
  res.json({ ...rest, variants: variants.rows, reviews: reviews.rows, related: related.rows });
});

router.post('/products/:slug/reviews', requireAuth, async (req, res) => {
  const rating = toInt(req.body?.rating);
  const comment = text(req.body?.comment, 1000);
  if (!rating || rating < 1 || rating > 5) throw new HttpError(400, 'Vui lòng chọn số sao từ 1 đến 5');
  if (comment.length < 5) throw new HttpError(400, 'Nhận xét cần ít nhất 5 ký tự');

  const {
    rows: [product],
  } = await query('SELECT id FROM products WHERE slug = $1', [req.params.slug]);
  if (!product) throw new HttpError(404, 'Không tìm thấy sản phẩm');

  const {
    rows: [review],
  } = await query(
    `INSERT INTO reviews (product_id, user_id, author_name, rating, comment)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, author_name, rating, comment, created_at`,
    [product.id, req.user.sub, req.user.name, rating, comment],
  );
  // SIM-04: quên nhân rating*review_count → điểm TB trên trang chi tiết lệch sau khi review.
  await query(
    `UPDATE products
     SET rating = round((rating + $2) / (review_count + 1.0), 1),
         review_count = review_count + 1
     WHERE id = $1`,
    [product.id, rating],
  );
  res.status(201).json(review);
});

export default router;
