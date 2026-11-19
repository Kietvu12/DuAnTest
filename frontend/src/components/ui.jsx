import { ChevronLeft, ChevronRight, LoaderCircle, Minus, Plus, Star, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ORDER_STATUS, discountPercent, formatPrice } from '../lib/format';

export function Logo({ dark = false }) {
  return (
    <Link to="/" className="group flex shrink-0 items-center gap-2" aria-label="VoltTech - Trang chủ">
      <span className="grid size-9 place-items-center rounded-xl bg-volt-400 text-zinc-950 shadow-[0_6px_20px_-6px] shadow-volt-500 transition group-hover:rotate-[-8deg]">
        <Zap className="size-5" fill="currentColor" strokeWidth={1.5} />
      </span>
      <span className={`text-lg font-extrabold tracking-tight ${dark ? 'text-white' : 'text-zinc-950'}`}>
        Volt<span className={dark ? 'text-volt-400' : 'text-zinc-400'}>Mart</span>
      </span>
    </Link>
  );
}

export function Rating({ value, size = 'size-3.5' }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${size} ${star <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'fill-zinc-200 text-zinc-200'}`}
        />
      ))}
    </span>
  );
}

export function Price({ value, compare, size = 'md' }) {
  const discount = discountPercent(value, compare);
  const main = { sm: 'text-base', md: 'text-lg', lg: 'text-3xl' }[size];
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className={`${main} font-bold tracking-tight text-zinc-950`}>{formatPrice(value)}</span>
      {discount > 0 && (
        <>
          <span className="text-sm text-zinc-400 line-through">{formatPrice(compare)}</span>
          {size === 'lg' && <span className="chip bg-rose-50 text-rose-600">-{discount}%</span>}
        </>
      )}
    </div>
  );
}

export function SectionHeader({ eyebrow, title, description, action }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-2 text-xs font-bold tracking-[0.2em] text-zinc-400 uppercase">{eyebrow}</p>}
        <h2 className="text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">{title}</h2>
        {description && <p className="mt-2 max-w-xl text-zinc-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Spinner({ className = 'size-6' }) {
  return <LoaderCircle className={`${className} animate-spin text-zinc-400`} />;
}

export function PageLoader() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <Spinner className="size-8" />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="card flex flex-col items-center px-6 py-16 text-center">
      <span className="mb-5 grid size-16 place-items-center rounded-2xl bg-zinc-100 text-zinc-400">
        <Icon className="size-7" strokeWidth={1.5} />
      </span>
      <h3 className="text-lg font-bold">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-zinc-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function QuantityInput({ value, onChange, max = 20, size = 'md' }) {
  const height = size === 'sm' ? 'h-9' : 'h-11';
  return (
    <div className={`inline-flex ${height} items-center rounded-full border border-zinc-200 bg-white`}>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        className="grid h-full w-9 place-items-center rounded-l-full text-zinc-500 hover:text-zinc-950 disabled:opacity-30"
        aria-label="Giảm số lượng"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="w-8 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        className="grid h-full w-9 place-items-center rounded-r-full text-zinc-500 hover:text-zinc-950 disabled:opacity-30"
        aria-label="Tăng số lượng"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

export function StatusBadge({ status }) {
  const meta = ORDER_STATUS[status] ?? ORDER_STATUS.pending;
  return <span className={`chip whitespace-nowrap ring-1 ring-inset ${meta.className}`}>{meta.label}</span>;
}

export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  const numbers = Array.from({ length: pages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === pages || Math.abs(n - page) <= 1,
  );
  return (
    <nav className="mt-12 flex items-center justify-center gap-1.5" aria-label="Phân trang">
      <button type="button" className="btn btn-ghost size-10 px-0" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Trang trước">
        <ChevronLeft className="size-4" />
      </button>
      {numbers.map((n, index) => (
        <span key={n} className="flex items-center gap-1.5">
          {index > 0 && n - numbers[index - 1] > 1 && <span className="px-1 text-zinc-400">…</span>}
          <button
            type="button"
            onClick={() => onChange(n)}
            className={`size-10 rounded-full text-sm font-semibold transition ${
              n === page ? 'bg-zinc-950 text-white' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            {n}
          </button>
        </span>
      ))}
      <button type="button" className="btn btn-ghost size-10 px-0" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Trang sau">
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}
