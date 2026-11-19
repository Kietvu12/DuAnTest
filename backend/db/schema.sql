DROP TABLE IF EXISTS error_reports, order_items, orders, reviews, product_variants, products, brands, categories, coupons, users CASCADE;

CREATE TABLE users (
  id            serial PRIMARY KEY,
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name     text NOT NULL,
  phone         text,
  role          text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id          serial PRIMARY KEY,
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon        text NOT NULL,
  sort_order  integer NOT NULL DEFAULT 0
);

CREATE TABLE brands (
  id   serial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL
);

CREATE TABLE products (
  id                serial PRIMARY KEY,
  slug              text NOT NULL UNIQUE,
  name              text NOT NULL,
  brand_id          integer NOT NULL REFERENCES brands(id),
  category_id       integer NOT NULL REFERENCES categories(id),
  short_description text NOT NULL DEFAULT '',
  highlights        text[] NOT NULL DEFAULT '{}',
  specs             jsonb NOT NULL DEFAULT '{}'::jsonb,
  price             integer NOT NULL CHECK (price >= 0),
  compare_at_price  integer CHECK (compare_at_price >= 0),
  rating            numeric(2, 1) NOT NULL DEFAULT 0,
  review_count      integer NOT NULL DEFAULT 0,
  sold_count        integer NOT NULL DEFAULT 0,
  is_featured       boolean NOT NULL DEFAULT false,
  badge             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_category_idx ON products (category_id);
CREATE INDEX products_brand_idx ON products (brand_id);

CREATE TABLE product_variants (
  id               serial PRIMARY KEY,
  product_id       integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku              text NOT NULL UNIQUE,
  name             text NOT NULL,
  color            text,
  color_hex        text,
  option           text,
  price            integer NOT NULL CHECK (price >= 0),
  compare_at_price integer CHECK (compare_at_price >= 0),
  stock            integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sort_order       integer NOT NULL DEFAULT 0
);
CREATE INDEX product_variants_product_idx ON product_variants (product_id);

CREATE TABLE reviews (
  id          serial PRIMARY KEY,
  product_id  integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id     integer REFERENCES users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  rating      smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reviews_product_idx ON reviews (product_id, created_at DESC);

CREATE TABLE coupons (
  code         text PRIMARY KEY,
  description  text NOT NULL,
  type         text NOT NULL CHECK (type IN ('percent', 'fixed', 'shipping')),
  value        integer NOT NULL DEFAULT 0,
  max_discount integer,
  min_order    integer NOT NULL DEFAULT 0,
  active       boolean NOT NULL DEFAULT true
);

CREATE TABLE orders (
  id             serial PRIMARY KEY,
  code           text NOT NULL UNIQUE,
  user_id        integer REFERENCES users(id) ON DELETE SET NULL,
  customer_name  text NOT NULL,
  phone          text NOT NULL,
  email          text,
  address        text NOT NULL,
  city           text NOT NULL,
  note           text,
  payment_method text NOT NULL CHECK (payment_method IN ('cod', 'bank_transfer', 'card')),
  status         text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'confirmed', 'shipping', 'delivered', 'cancelled')),
  subtotal       integer NOT NULL,
  shipping_fee   integer NOT NULL DEFAULT 0,
  discount       integer NOT NULL DEFAULT 0,
  total          integer NOT NULL,
  coupon_code    text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_user_idx ON orders (user_id, created_at DESC);
CREATE INDEX orders_status_idx ON orders (status, created_at DESC);

CREATE TABLE order_items (
  id            serial PRIMARY KEY,
  order_id      integer NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    integer REFERENCES products(id) ON DELETE SET NULL,
  variant_id    integer REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name  text NOT NULL,
  product_slug  text NOT NULL,
  variant_name  text NOT NULL,
  color_hex     text,
  category_icon text NOT NULL,
  unit_price    integer NOT NULL,
  quantity      integer NOT NULL CHECK (quantity > 0)
);
CREATE INDEX order_items_order_idx ON order_items (order_id);
