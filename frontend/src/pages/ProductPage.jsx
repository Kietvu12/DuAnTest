import { useEffect, useMemo, useState } from 'react';
import { Check, Gift, Heart, PackageSearch, RotateCcw, ShieldCheck, ShoppingBag, Star, Truck } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ProductGrid } from '../components/ProductCard';
import { ProductVisual } from '../components/ProductVisual';
import { EmptyState, PageLoader, Price, QuantityInput, Rating, SectionHeader } from '../components/ui';
import { api } from '../lib/api';
import { formatCompact, formatDate, formatPrice } from '../lib/format';
import { useAuth, useCart, useToast, useWishlist } from '../lib/store';
import { useApi } from '../lib/useApi';

function uniqueBy(list, key) {
  const seen = new Set();
  return list.filter((item) => {
    const value = key(item);
    if (value === null || value === undefined || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function ReviewForm({ slug, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(`/products/${slug}/reviews`, { method: 'POST', body: { rating, comment } });
      setComment('');
      toast('Cảm ơn bạn đã đánh giá sản phẩm!');
      onSubmitted();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card p-6">
      <h3 className="font-bold">Viết đánh giá của bạn</h3>
      <div className="mt-3 flex gap-1" role="radiogroup" aria-label="Chọn số sao">
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} type="button" onClick={() => setRating(star)} aria-label={`${star} sao`} className="transition hover:scale-110">
            <Star className={`size-7 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'fill-zinc-200 text-zinc-200'}`} />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        rows={3}
        placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm…"
        className="input mt-4 h-auto py-3"
      />
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      <button type="submit" disabled={busy} className="btn btn-primary mt-4">
        Gửi đánh giá
      </button>
    </form>
  );
}

export default function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: product, loading, error, reload } = useApi(`/products/${slug}`);
  const { user } = useAuth();
  const cart = useCart();
  const wishlist = useWishlist();
  const toast = useToast();

  const [color, setColor] = useState(null);
  const [option, setOption] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!product) return;
    const first = product.variants.find((v) => v.stock > 0) ?? product.variants[0];
    setColor(first?.color ?? null);
    setOption(first?.option ?? null);
    setQuantity(1);
  }, [product]);

  const colors = useMemo(() => uniqueBy(product?.variants ?? [], (v) => v.color), [product]);
  const options = useMemo(
    () => uniqueBy((product?.variants ?? []).filter((v) => !color || v.color === color), (v) => v.option),
    [product, color],
  );

  if (loading && !product) return <PageLoader />;
  if (error || !product) {
    return (
      <div className="container-page pt-16">
        <EmptyState
          icon={PackageSearch}
          title="Không tìm thấy sản phẩm"
          description="Sản phẩm có thể đã ngừng kinh doanh hoặc đường dẫn không đúng."
          action={<Link to="/products" className="btn btn-primary">Xem sản phẩm khác</Link>}
        />
      </div>
    );
  }

  const variant =
    product.variants.find((v) => v.color === color && v.option === option) ??
    product.variants.find((v) => v.color === color) ??
    product.variants[0];
  const soldOut = !variant || variant.stock === 0;
  const saved = wishlist.has(product.slug);

  const addToCart = (goToCheckout = false) => {
    if (!variant || variant.stock === 0) {
      toast('Phiên bản này đã hết hàng, vui lòng chọn phiên bản khác.', { tone: 'error' });
      return;
    }
    // BUG-4 (FE): bấm thêm giỏ → ném lỗi runtime "Lỗi hệ thống", không thêm được sản phẩm.
    throw new Error('Lỗi hệ thống');
    cart.add(
      {
        variantId: variant.id,
        productSlug: product.slug,
        productName: product.name,
        variantName: variant.name,
        price: variant.price,
        compareAt: variant.compare_at_price,
        colorHex: variant.color_hex,
        icon: product.category.icon,
        brand: product.brand.name,
        stock: variant.stock,
      },
      quantity,
    );
    if (goToCheckout) navigate('/checkout');
    else toast(`Đã thêm ${product.name} vào giỏ`, { action: <Link to="/cart" className="text-sm font-semibold text-volt-400 hover:underline">Xem giỏ</Link> });
  };

  return (
    <div className="animate-fade-up">
      <div className="container-page pt-8">
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
          <Link to="/" className="hover:text-zinc-950">Trang chủ</Link>
          <span>/</span>
          <Link to={`/products?category=${product.category.slug}`} className="hover:text-zinc-950">{product.category.name}</Link>
          <span>/</span>
          <span className="text-zinc-950">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="lg:sticky lg:top-40 lg:self-start">
            <ProductVisual
              icon={product.category.icon}
              hex={variant?.color_hex}
              label={product.brand.name}
              className="aspect-square transition-all duration-500"
              rounded="rounded-[2rem]"
              iconClassName="size-[42%]"
            />
            {colors.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
                {colors.map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => setColor(c.color)}
                    className={`overflow-hidden rounded-2xl ring-2 ring-offset-2 ring-offset-zinc-50 transition ${
                      color === c.color ? 'ring-zinc-950' : 'ring-transparent hover:ring-zinc-300'
                    }`}
                    aria-label={c.color}
                  >
                    <ProductVisual icon={product.category.icon} hex={c.color_hex} className="aspect-square" rounded="rounded-2xl" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <Link
                to={`/products?brand=${product.brand.slug}`}
                className="text-xs font-bold tracking-[0.2em] text-zinc-400 uppercase hover:text-zinc-950"
              >
                {product.brand.name}
              </Link>
              {product.badge && <span className="chip bg-volt-400 text-zinc-950">{product.badge}</span>}
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">{product.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
              <span className="flex items-center gap-1.5">
                <Rating value={product.rating} />
                <span className="font-semibold text-zinc-950">{product.rating.toFixed(1)}</span>
              </span>
              <a href="#reviews" className="underline-offset-4 hover:underline">{formatCompact(product.review_count)} đánh giá</a>
              <span className="text-zinc-300">|</span>
              <span>Đã bán {formatCompact(product.sold_count)}</span>
            </div>
            <p className="mt-5 leading-relaxed text-zinc-600">{product.short_description}</p>

            <div className="mt-6 rounded-3xl bg-white p-5 ring-1 ring-zinc-200/80">
              <Price value={variant?.price ?? product.price} compare={variant?.compare_at_price} size="lg" />
              <p className="mt-1 text-xs text-zinc-500">
                Giá đã bao gồm VAT · Trả góp 0% chỉ từ {formatPrice(Math.round((variant?.price ?? product.price) / 12 / 1000) * 1000)}/tháng
              </p>
            </div>

            {colors.length > 0 && (
              <div className="mt-7">
                <p className="mb-3 text-sm">
                  Màu sắc: <span className="font-semibold">{color}</span>
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {colors.map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setColor(c.color)}
                      title={c.color}
                      aria-label={c.color}
                      aria-pressed={color === c.color}
                      className={`grid size-10 place-items-center rounded-full ring-2 ring-offset-2 transition ${
                        color === c.color ? 'ring-zinc-950' : 'ring-zinc-200 hover:ring-zinc-400'
                      }`}
                      style={{ backgroundColor: c.color_hex }}
                    >
                      {color === c.color && <Check className="size-4 mix-blend-difference" color="white" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {options.length > 0 && (
              <div className="mt-7">
                <p className="mb-3 text-sm">Phiên bản</p>
                <div className="flex flex-wrap gap-2.5">
                  {options.map((o) => {
                    const match = product.variants.find((v) => v.color === color && v.option === o.option) ?? o;
                    return (
                      <button
                        key={o.option}
                        type="button"
                        onClick={() => setOption(o.option)}
                        className={`relative rounded-2xl border px-4 py-2.5 text-left transition ${
                          option === o.option ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-200 bg-white hover:border-zinc-400'
                        } ${match.stock === 0 ? 'opacity-50' : ''}`}
                      >
                        <span className="block text-sm font-semibold">{o.option}</span>
                        <span className={`block text-xs ${option === o.option ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          {match.stock === 0 ? 'Hết hàng' : formatPrice(match.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-7 flex items-center gap-4">
              <QuantityInput value={quantity} onChange={setQuantity} max={Math.min(variant?.stock ?? 1, 20)} />
              <p className={`text-sm ${soldOut ? 'text-rose-600' : variant.stock <= 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {soldOut ? 'Tạm hết hàng' : variant.stock <= 5 ? `Chỉ còn ${variant.stock} sản phẩm` : 'Còn hàng'}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" disabled={soldOut} onClick={() => addToCart(true)} className="btn btn-primary btn-lg flex-1">
                Mua ngay
              </button>
              <button type="button" disabled={soldOut} onClick={() => addToCart(false)} className="btn btn-volt btn-lg flex-1">
                <ShoppingBag className="size-5" /> Thêm vào giỏ
              </button>
              <button
                type="button"
                onClick={() => wishlist.toggle(product)}
                className={`btn btn-outline btn-lg w-13 px-0 ${saved ? 'border-rose-200 bg-rose-50 text-rose-500' : ''}`}
                aria-label={saved ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}
              >
                <Heart className="size-5" fill={saved ? 'currentColor' : 'none'} />
              </button>
            </div>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                [Truck, 'Giao nhanh 2 giờ nội thành'],
                [ShieldCheck, 'Bảo hành chính hãng 12 tháng'],
                [RotateCcw, 'Đổi trả miễn phí 30 ngày'],
                [Gift, 'Tặng gói vệ sinh máy trọn đời'],
              ].map(([Icon, label]) => (
                <li key={label} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-zinc-200/80">
                  <Icon className="size-5 shrink-0 text-zinc-500" strokeWidth={1.75} /> {label}
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <h2 className="text-lg font-bold">Điểm nổi bật</h2>
              <ul className="mt-4 space-y-3">
                {product.highlights.map((item) => (
                  <li key={item} className="flex gap-3 text-zinc-600">
                    <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-volt-400">
                      <Check className="size-3 text-zinc-950" strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-10">
              <h2 className="text-lg font-bold">Thông số kỹ thuật</h2>
              <dl className="mt-4 overflow-hidden rounded-3xl ring-1 ring-zinc-200/80">
                {Object.entries(product.specs).map(([label, value], index) => (
                  <div
                    key={label}
                    className={`flex flex-col gap-1 px-5 py-3.5 text-sm sm:flex-row sm:gap-6 ${index % 2 ? 'bg-white' : 'bg-zinc-50'}`}
                  >
                    <dt className="shrink-0 text-zinc-500 sm:w-44">{label}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>

        <section id="reviews" className="mt-20 border-t border-zinc-200/80 pt-12">
          <SectionHeader
            eyebrow="Đánh giá"
            title="Khách hàng nói gì về sản phẩm này"
            description={`Điểm trung bình ${product.rating.toFixed(1)}/5 từ ${formatCompact(product.review_count)} lượt đánh giá đã mua tại VoltTech.`}
          />
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
            <ul className="space-y-4">
              {product.reviews.map((review) => (
                <li key={review.id} className="card p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-zinc-100 text-sm font-bold">
                      {review.author_name.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{review.author_name}</p>
                      <p className="text-xs text-zinc-500">{formatDate(review.created_at)}</p>
                    </div>
                    <span className="ml-auto">
                      <Rating value={review.rating} />
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600">{review.comment}</p>
                </li>
              ))}
              {product.reviews.length === 0 && (
                <li className="card p-6 text-sm text-zinc-500">Chưa có đánh giá nào cho sản phẩm này.</li>
              )}
            </ul>
            {user ? (
              <ReviewForm slug={slug} onSubmitted={reload} />
            ) : (
              <div className="card h-max p-6 text-sm text-zinc-600">
                <p className="font-bold text-zinc-950">Bạn đã mua sản phẩm này?</p>
                <p className="mt-2">
                  <Link to={`/login?redirect=/products/${product.slug}`} className="font-semibold text-zinc-950 underline underline-offset-4">
                    Đăng nhập
                  </Link>{' '}
                  để chia sẻ cảm nhận của bạn với người mua khác.
                </p>
              </div>
            )}
          </div>
        </section>

        {product.related?.length > 0 && (
          <section className="mt-20">
            <SectionHeader
              eyebrow="Có thể bạn thích"
              title="Sản phẩm tương tự"
              action={
                <Link to={`/products?category=${product.category.slug}`} className="btn btn-ghost">
                  Xem tất cả
                </Link>
              }
            />
            <ProductGrid items={product.related} />
          </section>
        )}
      </div>
    </div>
  );
}
