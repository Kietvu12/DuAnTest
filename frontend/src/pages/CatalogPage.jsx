import { useState } from 'react';
import { Check, PackageSearch, SlidersHorizontal, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { ProductGrid } from '../components/ProductCard';
import { EmptyState, Pagination } from '../components/ui';
import { useApi } from '../lib/useApi';

const PRICE_RANGES = [
  { id: 'duoi-5', label: 'Dưới 5 triệu', max: 5_000_000 },
  { id: '5-15', label: '5 – 15 triệu', min: 5_000_000, max: 15_000_000 },
  { id: '15-30', label: '15 – 30 triệu', min: 15_000_000, max: 30_000_000 },
  { id: 'tren-30', label: 'Trên 30 triệu', min: 30_000_000 },
];

const SORT_OPTIONS = [
  ['popular', 'Bán chạy nhất'],
  ['newest', 'Mới nhất'],
  ['price_asc', 'Giá thấp đến cao'],
  ['price_desc', 'Giá cao đến thấp'],
  ['rating', 'Đánh giá cao'],
];

function FilterGroup({ title, children }) {
  return (
    <div className="border-b border-zinc-200/80 py-6 first:pt-0 last:border-0">
      <h3 className="mb-3 text-sm font-bold">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function FilterOption({ active, onClick, children, count, type = 'checkbox' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm transition ${
        active ? 'bg-zinc-100 font-semibold text-zinc-950' : 'text-zinc-600 hover:bg-zinc-50'
      }`}
    >
      <span
        className={`grid size-[18px] shrink-0 place-items-center border transition ${type === 'radio' ? 'rounded-full' : 'rounded-md'} ${
          active ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-300 bg-white'
        }`}
      >
        {active && <Check className="size-3" strokeWidth={3} />}
      </span>
      <span className="flex-1">{children}</span>
      {count !== undefined && <span className="text-xs text-zinc-400">{count}</span>}
    </button>
  );
}

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const category = params.get('category') ?? '';
  const brands = (params.get('brand') ?? '').split(',').filter(Boolean);
  const price = params.get('price') ?? '';
  const sort = params.get('sort') ?? 'popular';
  const q = params.get('q') ?? '';
  const sale = params.get('sale') === '1';
  const page = Number(params.get('page')) || 1;
  const range = PRICE_RANGES.find((r) => r.id === price);

  const query = new URLSearchParams({ sort, page: String(page), limit: '12' });
  if (category) query.set('category', category);
  if (brands.length) query.set('brand', brands.join(','));
  if (q) query.set('q', q);
  if (sale) query.set('sale', '1');
  if (range?.min) query.set('minPrice', String(range.min));
  if (range?.max) query.set('maxPrice', String(range.max));

  const { data, loading } = useApi(`/products?${query}`);
  const { data: categories } = useApi('/categories');
  const { data: brandList } = useApi(`/brands${category ? `?category=${category}` : ''}`);
  const current = categories?.find((c) => c.slug === category);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === '' || value === null || value === false || (Array.isArray(value) && !value.length)) next.delete(key);
      else next.set(key, value === true ? '1' : Array.isArray(value) ? value.join(',') : String(value));
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const toggleBrand = (slug) => update({ brand: brands.includes(slug) ? brands.filter((b) => b !== slug) : [...brands, slug] });

  const chips = [
    q && { key: 'q', label: `“${q}”`, clear: () => update({ q: '' }) },
    current && { key: 'category', label: current.name, clear: () => update({ category: '', brand: '' }) },
    ...brands.map((slug) => ({
      key: `brand-${slug}`,
      label: brandList?.find((b) => b.slug === slug)?.name ?? slug,
      clear: () => toggleBrand(slug),
    })),
    range && { key: 'price', label: range.label, clear: () => update({ price: '' }) },
    sale && { key: 'sale', label: 'Đang giảm giá', clear: () => update({ sale: false }) },
  ].filter(Boolean);

  const filters = (
    <div>
      <FilterGroup title="Danh mục">
        <FilterOption type="radio" active={!category} onClick={() => update({ category: '', brand: '' })}>
          Tất cả sản phẩm
        </FilterOption>
        {categories?.map((c) => (
          <FilterOption
            key={c.slug}
            type="radio"
            active={category === c.slug}
            count={c.product_count}
            onClick={() => update({ category: c.slug, brand: '' })}
          >
            {c.name}
          </FilterOption>
        ))}
      </FilterGroup>
      <FilterGroup title="Thương hiệu">
        {brandList?.map((b) => (
          <FilterOption key={b.slug} active={brands.includes(b.slug)} count={b.product_count} onClick={() => toggleBrand(b.slug)}>
            {b.name}
          </FilterOption>
        ))}
      </FilterGroup>
      <FilterGroup title="Khoảng giá">
        {PRICE_RANGES.map((r) => (
          <FilterOption key={r.id} type="radio" active={price === r.id} onClick={() => update({ price: price === r.id ? '' : r.id })}>
            {r.label}
          </FilterOption>
        ))}
      </FilterGroup>
      <FilterGroup title="Ưu đãi">
        <FilterOption active={sale} onClick={() => update({ sale: !sale })}>
          Đang giảm giá
        </FilterOption>
      </FilterGroup>
    </div>
  );

  return (
    <div className="container-page animate-fade-up pt-8">
      <nav className="mb-4 flex items-center gap-2 text-sm text-zinc-500">
        <Link to="/" className="hover:text-zinc-950">Trang chủ</Link>
        <span>/</span>
        <span className="text-zinc-950">{current?.name ?? (q ? 'Tìm kiếm' : 'Tất cả sản phẩm')}</span>
      </nav>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {q ? `Kết quả cho “${q}”` : current?.name ?? (sale ? 'Đang giảm giá' : 'Tất cả sản phẩm')}
          </h1>
          <p className="mt-2 text-zinc-500">
            {current?.description ?? 'Hàng chính hãng, giá tốt mỗi ngày, giao nhanh toàn quốc.'}
          </p>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[250px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-40">{filters}</div>
        </aside>

        <div>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setFiltersOpen(true)} className="btn btn-outline h-10 lg:hidden">
              <SlidersHorizontal className="size-4" /> Bộ lọc
            </button>
            <p className="text-sm text-zinc-500">
              <span className="font-semibold text-zinc-950">{data?.total ?? '…'}</span> sản phẩm
            </p>
            <label className="ml-auto flex items-center gap-2 text-sm text-zinc-500">
              <span className="hidden sm:inline">Sắp xếp</span>
              <select
                value={sort}
                onChange={(event) => update({ sort: event.target.value })}
                className="h-10 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 outline-none focus:border-zinc-950"
              >
                {SORT_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>

          {chips.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.clear}
                  className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950 py-1.5 pr-2.5 pl-3.5 text-xs font-medium text-white transition hover:bg-zinc-700"
                >
                  {chip.label} <X className="size-3.5" />
                </button>
              ))}
              <button type="button" onClick={() => setParams({})} className="px-2 text-xs font-semibold text-zinc-500 underline-offset-4 hover:text-zinc-950 hover:underline">
                Xoá tất cả
              </button>
            </div>
          )}

          {data && data.items.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title="Không tìm thấy sản phẩm phù hợp"
              description="Hãy thử bỏ bớt bộ lọc hoặc tìm với từ khoá khác."
              action={<button type="button" onClick={() => setParams({})} className="btn btn-primary">Xoá bộ lọc</button>}
            />
          ) : (
            <ProductGrid items={data?.items} loading={loading} skeletons={9} columns="sm:grid-cols-2 xl:grid-cols-3" />
          )}

          {data && <Pagination page={data.page} pages={data.pages} onChange={(n) => { update({ page: n }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />}
        </div>
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm" onClick={() => setFiltersOpen(false)} aria-label="Đóng bộ lọc" />
          <div className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm animate-fade-up flex-col bg-white">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
              <h2 className="font-bold">Bộ lọc</h2>
              <button type="button" onClick={() => setFiltersOpen(false)} className="btn btn-ghost size-9 px-0" aria-label="Đóng">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-6">{filters}</div>
            <div className="border-t border-zinc-200 p-4">
              <button type="button" onClick={() => setFiltersOpen(false)} className="btn btn-primary w-full">
                Xem {data?.total ?? ''} sản phẩm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
