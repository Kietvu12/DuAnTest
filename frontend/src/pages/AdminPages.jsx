import { Fragment, useEffect, useState } from 'react';
import {
  Boxes,
  Bug,
  ChevronDown,
  DollarSign,
  LayoutDashboard,
  LogOut,
  Search,
  ShoppingBag,
  Star,
  Store,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { OrderItems, TotalsTable } from '../components/OrderSummary';
import { ProductVisual } from '../components/ProductVisual';
import { Logo, PageLoader, StatusBadge } from '../components/ui';
import { api } from '../lib/api';
import { ORDER_STATUS, PAYMENT_METHODS, formatCompact, formatDate, formatPrice } from '../lib/format';
import { useAuth, useToast } from '../lib/store';
import { useApi } from '../lib/useApi';

const NAV = [
  { to: '/admin', end: true, icon: LayoutDashboard, label: 'Tổng quan' },
  { to: '/admin/orders', icon: ShoppingBag, label: 'Đơn hàng' },
  { to: '/admin/inventory', icon: Boxes, label: 'Kho hàng' },
  { to: '/admin/errors', icon: Bug, label: 'Báo lỗi' },
];

export function AdminLayout() {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-screen bg-zinc-50 lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-zinc-950 p-5 text-zinc-400 lg:flex">
        <Logo dark />
        <p className="mt-8 mb-3 px-3 text-[11px] font-bold tracking-[0.2em] text-zinc-600 uppercase">Quản trị</p>
        <nav className="space-y-1">
          {NAV.map(({ to, end, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`size-[18px] ${isActive ? 'text-volt-400' : ''}`} /> {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-1">
          <Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-white/5 hover:text-white">
            <Store className="size-[18px]" /> Về cửa hàng
          </Link>
          <button type="button" onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-white/5 hover:text-white">
            <LogOut className="size-[18px]" /> Đăng xuất
          </button>
          <div className="mt-3 rounded-2xl bg-white/5 p-3">
            <p className="truncate text-sm font-semibold text-white">{user.full_name}</p>
            <p className="truncate text-xs">{user.email}</p>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <nav className="ml-auto flex gap-1">
          {NAV.map(({ to, end, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={end} aria-label={label} className={({ isActive }) => `btn size-10 px-0 ${isActive ? 'btn-primary' : 'btn-ghost'}`}>
              <Icon className="size-4" />
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="p-4 sm:p-8">
        <Outlet />
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint, tone = 'bg-zinc-100 text-zinc-700' }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{label}</p>
        <span className={`grid size-9 place-items-center rounded-xl ${tone}`}>
          <Icon className="size-[18px]" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-extrabold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

export function AdminDashboard() {
  const { data: stats } = useApi('/admin/stats');
  if (!stats) return <PageLoader />;
  const max = Math.max(...stats.daily.map((d) => d.revenue), 1);
  const weekRevenue = stats.daily.reduce((sum, d) => sum + d.revenue, 0);

  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Tổng quan</h1>
        <p className="mt-1 text-sm text-zinc-500">Tình hình kinh doanh của VoltMart.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={DollarSign} label="Doanh thu" value={formatPrice(stats.revenue)} hint="Không tính đơn đã huỷ" tone="bg-volt-200 text-volt-600" />
        <StatCard icon={ShoppingBag} label="Đơn hàng" value={stats.orders} hint={`${stats.pending_orders} đơn chờ xác nhận`} tone="bg-sky-50 text-sky-600" />
        <StatCard icon={Users} label="Khách hàng" value={stats.customers} hint={`${stats.products} sản phẩm đang bán`} tone="bg-indigo-50 text-indigo-600" />
        <StatCard icon={TriangleAlert} label="Sắp hết hàng" value={stats.low_stock} hint="Phiên bản còn ≤ 5 sản phẩm" tone="bg-amber-50 text-amber-600" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="card p-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-bold">Doanh thu 7 ngày</h2>
              <p className="text-sm text-zinc-500">{formatPrice(weekRevenue)}</p>
            </div>
          </div>
          <div className="mt-8 flex h-56 gap-3">
            {stats.daily.map((day) => (
              <div key={day.day} className="group flex flex-1 flex-col items-center gap-2">
                <span className="text-[11px] font-semibold text-zinc-500 opacity-0 transition group-hover:opacity-100">
                  {formatCompact(day.revenue)}
                </span>
                <div className="relative w-full flex-1">
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-xl bg-zinc-950 transition group-hover:bg-volt-500"
                    style={{ height: `${Math.max(3, (day.revenue / max) * 100)}%` }}
                    title={`${formatPrice(day.revenue)} · ${day.orders} đơn`}
                  />
                </div>
                <span className="text-xs text-zinc-500">{day.day.slice(8)}/{day.day.slice(5, 7)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-6">
          <h2 className="font-bold">Bán chạy nhất</h2>
          <ul className="mt-5 space-y-4">
            {stats.top_products.map((product, index) => (
              <li key={product.id} className="flex items-center gap-3">
                <span className="w-4 text-sm font-bold text-zinc-400">{index + 1}</span>
                <ProductVisual icon={product.icon} hex={product.color_hex} className="size-11" rounded="rounded-xl" iconClassName="size-[55%]" />
                <div className="min-w-0 flex-1">
                  <Link to={`/products/${product.slug}`} className="block truncate text-sm font-semibold hover:underline">{product.name}</Link>
                  <p className="text-xs text-zinc-500">{formatPrice(product.price)}</p>
                </div>
                <span className="text-sm font-semibold">{formatCompact(product.sold_count)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="font-bold">Đơn hàng gần đây</h2>
          <Link to="/admin/orders" className="text-sm font-semibold text-zinc-500 hover:text-zinc-950">Xem tất cả</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-zinc-100">
              {stats.recent_orders.map((order) => (
                <tr key={order.id} className="hover:bg-zinc-50">
                  <td className="px-6 py-3.5 font-mono font-semibold">{order.code}</td>
                  <td className="px-6 py-3.5">{order.customer_name}</td>
                  <td className="px-6 py-3.5 text-zinc-500">{order.item_count} sản phẩm</td>
                  <td className="px-6 py-3.5"><StatusBadge status={order.status} /></td>
                  <td className="px-6 py-3.5 text-right font-semibold">{formatPrice(order.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function OrderDetailRow({ orderId, onUpdated }) {
  const { data: order, reload } = useApi(`/admin/orders/${orderId}`);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const changeStatus = async (status) => {
    if (status === 'cancelled' && !window.confirm('Huỷ đơn hàng này? Tồn kho sẽ được hoàn lại.')) return;
    setBusy(true);
    try {
      await api(`/admin/orders/${orderId}`, { method: 'PATCH', body: { status } });
      toast(`Đã cập nhật đơn sang "${ORDER_STATUS[status].label}"`);
      reload();
      onUpdated();
    } catch (err) {
      toast(err.message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  if (!order) return <div className="p-6"><PageLoader /></div>;
  return (
    <div className="grid gap-6 bg-zinc-50/70 p-6 lg:grid-cols-[1fr_320px]">
      <div className="card p-5"><OrderItems items={order.items} /></div>
      <div className="space-y-4">
        <div className="card space-y-1 p-5 text-sm">
          <p className="font-semibold">{order.customer_name} · {order.phone}</p>
          {order.email && <p className="text-zinc-500">{order.email}</p>}
          <p className="text-zinc-500">{order.address}, {order.city}</p>
          <p className="text-zinc-500">{PAYMENT_METHODS[order.payment_method]}</p>
          {order.note && <p className="pt-2 text-xs text-zinc-500">Ghi chú: {order.note}</p>}
        </div>
        <div className="card p-5">
          <TotalsTable subtotal={order.subtotal} shipping={order.shipping_fee} discount={order.discount} total={order.total} couponCode={order.coupon_code} />
        </div>
        {order.status !== 'cancelled' && (
          <label className="block">
            <span className="label">Cập nhật trạng thái</span>
            <select value={order.status} disabled={busy} onChange={(event) => changeStatus(event.target.value)} className="input">
              {Object.entries(ORDER_STATUS).map(([value, meta]) => (
                <option key={value} value={value}>{meta.label}</option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  );
}

export function AdminOrders() {
  const [status, setStatus] = useState('');
  const [expanded, setExpanded] = useState(null);
  const { data: orders, reload } = useApi(`/admin/orders${status ? `?status=${status}` : ''}`);

  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Đơn hàng</h1>
        <p className="mt-1 text-sm text-zinc-500">Xác nhận, giao hàng và theo dõi đơn của khách.</p>
      </div>

      <div className="scrollbar-none flex gap-2 overflow-x-auto">
        {[['', 'Tất cả'], ...Object.entries(ORDER_STATUS).map(([key, meta]) => [key, meta.label])].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => { setStatus(key); setExpanded(null); }}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
              status === key ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-600 ring-1 ring-zinc-200 hover:ring-zinc-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-semibold tracking-wider text-zinc-500 uppercase">
              <tr>
                <th className="px-6 py-3">Mã đơn</th>
                <th className="px-6 py-3">Khách hàng</th>
                <th className="px-6 py-3">Ngày đặt</th>
                <th className="whitespace-nowrap px-6 py-3">Trạng thái</th>
                <th className="px-6 py-3 text-right">Tổng tiền</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {!orders && (
                <tr><td colSpan={6}><PageLoader /></td></tr>
              )}
              {orders?.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-500">Không có đơn hàng nào.</td></tr>
              )}
              {orders?.map((order) => (
                <Fragment key={order.id}>
                  <tr className="cursor-pointer hover:bg-zinc-50" onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
                    <td className="px-6 py-4 font-mono font-semibold">{order.code}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium">{order.customer_name}</p>
                      <p className="text-xs text-zinc-500">{order.phone} · {order.city}</p>
                    </td>
                    <td className="px-6 py-4 text-zinc-500">{formatDate(order.created_at, true)}</td>
                    <td className="px-6 py-4"><StatusBadge status={order.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-semibold">{formatPrice(order.total)}</p>
                      <p className="text-xs text-zinc-500">{order.item_count} sản phẩm</p>
                    </td>
                    <td className="pr-4">
                      <ChevronDown className={`size-4 text-zinc-400 transition ${expanded === order.id ? 'rotate-180' : ''}`} />
                    </td>
                  </tr>
                  {expanded === order.id && (
                    <tr>
                      <td colSpan={6} className="p-0"><OrderDetailRow orderId={order.id} onUpdated={reload} /></td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function VariantRow({ variant, onSaved }) {
  const [price, setPrice] = useState(String(variant.price));
  const [stock, setStock] = useState(String(variant.stock));
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const dirty = Number(price) !== variant.price || Number(stock) !== variant.stock;

  useEffect(() => {
    setPrice(String(variant.price));
    setStock(String(variant.stock));
  }, [variant.price, variant.stock]);

  const save = async () => {
    setBusy(true);
    try {
      await api(`/admin/variants/${variant.id}`, { method: 'PATCH', body: { price: Number(price), stock: Number(stock) } });
      toast(`Đã lưu ${variant.sku}`);
      onSaved();
    } catch (err) {
      toast(err.message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="text-sm">
      <td className="py-2.5 pr-4 pl-6">
        <div className="flex items-center gap-2.5">
          <span className="size-3.5 shrink-0 rounded-full ring-1 ring-zinc-200" style={{ backgroundColor: variant.color_hex ?? '#e4e4e7' }} />
          <span>{variant.name}</span>
        </div>
        <p className="mt-0.5 pl-6 font-mono text-[11px] text-zinc-400">{variant.sku}</p>
      </td>
      <td className="px-4 py-2.5">
        <input type="number" min={0} step={10000} value={price} onChange={(event) => setPrice(event.target.value)} className="input h-9 w-36 text-right tabular-nums" />
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <input type="number" min={0} value={stock} onChange={(event) => setStock(event.target.value)} className="input h-9 w-20 text-right tabular-nums" />
          {variant.stock === 0 ? (
            <span className="chip bg-rose-50 text-rose-600">Hết</span>
          ) : variant.stock <= 5 ? (
            <span className="chip bg-amber-50 text-amber-600">Sắp hết</span>
          ) : null}
        </div>
      </td>
      <td className="py-2.5 pr-6 pl-4 text-right">
        <button type="button" disabled={!dirty || busy} onClick={save} className="btn btn-primary btn-sm">Lưu</button>
      </td>
    </tr>
  );
}

export function AdminInventory() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const { data: products, reload } = useApi(`/admin/products?q=${encodeURIComponent(query)}`);
  const toast = useToast();

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const toggleFeatured = async (product) => {
    await api(`/admin/products/${product.id}`, { method: 'PATCH', body: { isFeatured: !product.is_featured } });
    toast(product.is_featured ? 'Đã bỏ khỏi mục nổi bật' : 'Đã thêm vào mục nổi bật');
    reload();
  };

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Kho hàng</h1>
          <p className="mt-1 text-sm text-zinc-500">Cập nhật giá bán, tồn kho và sản phẩm nổi bật.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-zinc-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm sản phẩm, thương hiệu…" className="input pl-11" />
        </div>
      </div>

      {!products && <PageLoader />}
      <div className="space-y-4">
        {products?.map((product) => (
          <section key={product.id} className="card overflow-hidden">
            <div className="flex flex-wrap items-center gap-4 border-b border-zinc-100 p-5">
              <ProductVisual icon={product.icon} hex={product.variants?.[0]?.color_hex} className="size-14" rounded="rounded-2xl" iconClassName="size-[50%]" />
              <div className="min-w-0 flex-1">
                <Link to={`/products/${product.slug}`} className="font-semibold hover:underline">{product.name}</Link>
                <p className="text-xs text-zinc-500">
                  {product.brand} · {product.category} · Đã bán {formatCompact(product.sold_count)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleFeatured(product)}
                className={`btn btn-sm ${product.is_featured ? 'btn-volt' : 'btn-outline'}`}
              >
                <Star className="size-3.5" fill={product.is_featured ? 'currentColor' : 'none'} />
                {product.is_featured ? 'Nổi bật' : 'Đặt nổi bật'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="text-left text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                  <tr>
                    <th className="py-2 pr-4 pl-6">Phiên bản</th>
                    <th className="px-4 py-2">Giá bán (₫)</th>
                    <th className="px-4 py-2">Tồn kho</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {product.variants.map((variant) => (
                    <VariantRow key={variant.id} variant={variant} onSaved={reload} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
