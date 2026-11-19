import { readFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { brands, categories, cities, coupons, products, reviewAuthors, reviewComments } from './seed-data.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

// Deterministic so every reset produces the same stock levels, reviews and sample orders.
function createRandom(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = createRandom(20261119);
const pick = (list) => list[Math.floor(random() * list.length)];
const between = (min, max) => min + Math.floor(random() * (max - min + 1));

async function ensureDatabase() {
  const target = new URL(databaseUrl);
  const name = decodeURIComponent(target.pathname.slice(1));
  const maintenance = new URL(databaseUrl);
  maintenance.pathname = '/postgres';
  const client = new pg.Client({ connectionString: maintenance.toString() });
  await client.connect();
  try {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (!rowCount) {
      await client.query(`CREATE DATABASE "${name.replaceAll('"', '""')}"`);
      console.log(`Created database ${name}`);
    }
  } finally {
    await client.end();
  }
}

function stockLevel() {
  const roll = random();
  if (roll < 0.06) return 0;
  if (roll < 0.18) return between(1, 5);
  return between(8, 60);
}

async function seed(db) {
  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await db.query(schema);

  const categoryIds = new Map();
  for (const [index, category] of categories.entries()) {
    const { rows } = await db.query(
      'INSERT INTO categories (slug, name, description, icon, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [category.slug, category.name, category.description, category.icon, index],
    );
    categoryIds.set(category.slug, rows[0].id);
  }

  const brandIds = new Map();
  for (const brand of brands) {
    const { rows } = await db.query('INSERT INTO brands (slug, name) VALUES ($1, $2) RETURNING id', [brand.slug, brand.name]);
    brandIds.set(brand.slug, rows[0].id);
  }

  const [adminHash, customerHash] = await Promise.all([bcrypt.hash('Admin@123', 10), bcrypt.hash('Khach@123', 10)]);
  const {
    rows: [, customer],
  } = await db.query(
    `INSERT INTO users (email, password_hash, full_name, phone, role) VALUES
       ('admin@voltmart.vn', $1, 'Quản trị VoltMart', '0901000001', 'admin'),
       ('khach@voltmart.vn', $2, 'Nguyễn Văn Khách', '0912345678', 'customer')
     RETURNING id`,
    [adminHash, customerHash],
  );

  const variantPool = [];
  for (const product of products) {
    const {
      rows: [created],
    } = await db.query(
      `INSERT INTO products (slug, name, brand_id, category_id, short_description, highlights, specs, price,
                             compare_at_price, rating, review_count, sold_count, is_featured, badge, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now() - make_interval(days => $15))
       RETURNING id`,
      [
        product.slug,
        product.name,
        brandIds.get(product.brand),
        categoryIds.get(product.category),
        product.short,
        product.highlights,
        product.specs,
        product.price,
        product.compare ?? null,
        product.rating,
        product.reviews,
        product.sold,
        Boolean(product.featured),
        product.badge ?? null,
        product.age,
      ],
    );

    const options = product.options ?? [[null, 0]];
    let sortOrder = 0;
    for (const [color, hex] of product.colors) {
      for (const [option, delta] of options) {
        sortOrder += 1;
        const price = product.price + delta;
        const name = [color, option].filter(Boolean).join(' · ');
        const sku = `${product.slug.toUpperCase().slice(0, 24)}-${String(sortOrder).padStart(2, '0')}`;
        const {
          rows: [variant],
        } = await db.query(
          `INSERT INTO product_variants (product_id, sku, name, color, color_hex, option, price, compare_at_price, stock, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
          [created.id, sku, name, color, hex, option, price, product.compare ? product.compare + delta : null, stockLevel(), sortOrder],
        );
        variantPool.push({
          id: variant.id,
          productId: created.id,
          productName: product.name,
          slug: product.slug,
          name,
          hex,
          icon: categories.find((c) => c.slug === product.category).icon,
          price,
        });
      }
    }

    const reviewCount = between(2, 5);
    for (let i = 0; i < reviewCount; i += 1) {
      const [rating, comment] = pick(reviewComments);
      await db.query(
        `INSERT INTO reviews (product_id, author_name, rating, comment, created_at)
         VALUES ($1, $2, $3, $4, now() - make_interval(days => $5))`,
        [created.id, pick(reviewAuthors), rating, comment, between(1, 90)],
      );
    }
  }

  for (const coupon of coupons) {
    await db.query(
      'INSERT INTO coupons (code, description, type, value, max_discount, min_order) VALUES ($1, $2, $3, $4, $5, $6)',
      [coupon.code, coupon.description, coupon.type, coupon.value, coupon.maxDiscount ?? null, coupon.minOrder],
    );
  }

  const orderCode = (daysAgo) => {
    const date = new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(2, 10).replaceAll('-', '');
    const suffix = between(0, 0xffffff).toString(16).toUpperCase().padStart(6, '0');
    return `VM${date}${suffix}`;
  };
  const statuses = ['delivered', 'delivered', 'delivered', 'shipping', 'confirmed', 'pending', 'pending', 'cancelled'];
  const payments = ['cod', 'cod', 'bank_transfer', 'card'];
  for (let i = 0; i < 24; i += 1) {
    const ownedByCustomer = i % 6 === 0;
    const lines = Array.from({ length: between(1, 3) }, () => ({ variant: pick(variantPool), quantity: between(1, 2) }));
    const subtotal = lines.reduce((sum, line) => sum + line.variant.price * line.quantity, 0);
    const shippingFee = subtotal >= 2_000_000 ? 0 : 30_000;
    const daysAgo = Math.floor(i / 3);
    const name = ownedByCustomer ? 'Nguyễn Văn Khách' : pick(reviewAuthors);
    const {
      rows: [order],
    } = await db.query(
      `INSERT INTO orders (code, user_id, customer_name, phone, email, address, city, payment_method, status,
                           subtotal, shipping_fee, discount, total, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0, $12,
               now() - make_interval(days => $13, hours => $14), now() - make_interval(days => $13))
       RETURNING id`,
      [
        orderCode(daysAgo),
        ownedByCustomer ? customer.id : null,
        name,
        ownedByCustomer ? '0912345678' : `09${between(10000000, 99999999)}`,
        ownedByCustomer ? 'khach@voltmart.vn' : null,
        `${between(1, 300)} Nguyễn Huệ, Phường Bến Nghé`,
        pick(cities),
        pick(payments),
        i < 3 ? 'pending' : pick(statuses),
        subtotal,
        shippingFee,
        subtotal + shippingFee,
        daysAgo,
        daysAgo === 0 ? 0 : between(0, 12),
      ],
    );
    for (const { variant, quantity } of lines) {
      await db.query(
        `INSERT INTO order_items (order_id, product_id, variant_id, product_name, product_slug, variant_name,
                                  color_hex, category_icon, unit_price, quantity)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [order.id, variant.productId, variant.id, variant.productName, variant.slug, variant.name, variant.hex, variant.icon, variant.price, quantity],
      );
    }
  }

  const { rows } = await db.query(`
    SELECT (SELECT count(*) FROM categories) AS categories, (SELECT count(*) FROM brands) AS brands,
           (SELECT count(*) FROM products) AS products, (SELECT count(*) FROM product_variants) AS variants,
           (SELECT count(*) FROM orders) AS orders`);
  console.log('Seeded', rows[0]);
}

await ensureDatabase();
const db = new pg.Client({ connectionString: databaseUrl });
await db.connect();
try {
  await db.query('BEGIN');
  await seed(db);
  await db.query('COMMIT');
} catch (error) {
  await db.query('ROLLBACK');
  throw error;
} finally {
  await db.end();
}
