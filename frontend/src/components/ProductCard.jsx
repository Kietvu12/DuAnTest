import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { discountPercent, formatCompact } from '../lib/format';
import { useWishlist } from '../lib/store';
import { ProductVisual } from './ProductVisual';
import { Price, Rating } from './ui';

const BADGE_STYLES = {
  'Mới': 'bg-zinc-950 text-white',
  'Bán chạy': 'bg-volt-400 text-zinc-950',
  'Giảm sốc': 'bg-rose-500 text-white',
  Hot: 'bg-orange-500 text-white',
};

export function ProductCard({ product }) {
  const { has, toggle } = useWishlist();
  const saved = has(product.slug);
  const discount = discountPercent(product.price, product.compare_at_price);
  const soldOut = product.stock === 0;

  return (
    <article className="group relative flex flex-col">
      <Link to={`/products/${product.slug}`} className="relative block overflow-hidden rounded-3xl">
        <ProductVisual
          icon={product.category.icon}
          hex={product.colors?.[0]?.hex}
          className={`aspect-square transition duration-500 ease-out group-hover:scale-[1.04] ${soldOut ? 'opacity-60 grayscale' : ''}`}
        />
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
          {product.badge && <span className={`chip ${BADGE_STYLES[product.badge] ?? 'bg-white text-zinc-900'}`}>{product.badge}</span>}
          {discount > 0 && <span className="chip bg-white/90 text-rose-600 backdrop-blur">-{discount}%</span>}
        </div>
        {soldOut && (
          <span className="absolute inset-x-0 bottom-4 mx-auto w-max rounded-full bg-zinc-950/85 px-3 py-1 text-xs font-semibold text-white">
            Tạm hết hàng
          </span>
        )}
      </Link>

      <button
        type="button"
        onClick={() => toggle(product)}
        className={`absolute top-3 right-3 grid size-9 place-items-center rounded-full backdrop-blur transition ${
          saved ? 'bg-rose-500 text-white' : 'bg-white/80 text-zinc-600 opacity-100 hover:text-rose-500 sm:opacity-0 sm:group-hover:opacity-100'
        }`}
        aria-label={saved ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}
        aria-pressed={saved}
      >
        <Heart className="size-4" fill={saved ? 'currentColor' : 'none'} />
      </button>

      <div className="mt-4 flex flex-1 flex-col px-1">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-zinc-400 uppercase">{product.brand.name}</p>
        <Link to={`/products/${product.slug}`} className="mt-1 line-clamp-2 leading-snug font-semibold text-zinc-900 hover:text-zinc-600">
          {product.name}
        </Link>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-500">
          <Rating value={product.rating} size="size-3" />
          <span className="font-medium text-zinc-700">{product.rating.toFixed(1)}</span>
          <span className="text-zinc-300">•</span>
          <span>Đã bán {formatCompact(product.sold_count)}</span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <Price value={product.price} compare={product.compare_at_price} size="sm" />
          {product.colors?.length > 1 && (
            <div className="flex shrink-0 -space-x-1 pb-1">
              {product.colors.slice(0, 4).map((color) => (
                <span
                  key={color.hex + color.name}
                  title={color.name}
                  className="size-3.5 rounded-full ring-2 ring-white"
                  style={{ backgroundColor: color.hex }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ items, loading, skeletons = 8, columns = 'sm:grid-cols-2 lg:grid-cols-4' }) {
  if (loading && !items) {
    return (
      <div className={`grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 ${columns}`}>
        {Array.from({ length: skeletons }, (_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-square rounded-3xl bg-zinc-200/70" />
            <div className="mt-4 h-3 w-16 rounded bg-zinc-200/70" />
            <div className="mt-2 h-4 w-4/5 rounded bg-zinc-200/70" />
            <div className="mt-3 h-5 w-1/2 rounded bg-zinc-200/70" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className={`grid grid-cols-2 gap-x-4 gap-y-10 transition-opacity sm:gap-x-6 ${columns} ${loading ? 'opacity-50' : ''}`}>
      {items?.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
