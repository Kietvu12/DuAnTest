import { useEffect, useRef, useState } from 'react';
import { Heart, LayoutDashboard, LogOut, Package, Search, ShoppingBag, User } from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, useCart, useWishlist } from '../lib/store';
import { useApi } from '../lib/useApi';
import { CATEGORY_ICONS } from './ProductVisual';
import { Logo } from './ui';

function CountBadge({ value }) {
  if (!value) return null;
  return (
    <span className="absolute -top-1 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-volt-400 px-1 text-[10px] font-bold text-zinc-950 ring-2 ring-white">
      {value > 99 ? '99+' : value}
    </span>
  );
}

function AccountMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (event) => !ref.current?.contains(event.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!user) {
    return (
      <Link to="/login" className="btn btn-ghost h-10 px-3" aria-label="Đăng nhập">
        <User className="size-5" />
        <span className="hidden lg:inline">Đăng nhập</span>
      </Link>
    );
  }

  const initials = user.full_name
    .split(' ')
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 items-center gap-2 rounded-full pr-3 pl-1 transition hover:bg-zinc-100"
        aria-expanded={open}
      >
        <span className="grid size-8 place-items-center rounded-full bg-zinc-950 text-xs font-bold text-volt-400">{initials}</span>
        <span className="hidden max-w-28 truncate text-sm font-semibold lg:inline">{user.full_name.split(' ').at(-1)}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-60 animate-fade-up rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl shadow-zinc-950/10">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold">{user.full_name}</p>
            <p className="truncate text-xs text-zinc-500">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-zinc-100" />
          <Link to="/account" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-zinc-50">
            <Package className="size-4 text-zinc-400" /> Đơn hàng của tôi
          </Link>
          {user.role === 'admin' && (
            <Link to="/admin" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-zinc-50">
              <LayoutDashboard className="size-4 text-zinc-400" /> Trang quản trị
            </Link>
          )}
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
          >
            <LogOut className="size-4" /> Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const { count } = useCart();
  const wishlist = useWishlist();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const location = useLocation();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const { data: categories } = useApi('/categories');
  const activeCategory = location.pathname === '/products' ? params.get('category') : null;

  useEffect(() => {
    setQuery(params.get('q') ?? '');
  }, [params]);

  const submit = (event) => {
    event.preventDefault();
    const q = query.trim();
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
  };

  const searchForm = (
    <form onSubmit={submit} className="relative w-full" role="search">
      <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-zinc-400" />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Tìm iPhone, MacBook, tai nghe…"
        className="h-11 w-full rounded-full border border-transparent bg-zinc-100 pr-4 pl-11 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:bg-white"
        aria-label="Tìm kiếm sản phẩm"
      />
    </form>
  );

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-zinc-950 text-[12px] text-zinc-400">
        <div className="container-page flex h-9 items-center justify-center gap-6 sm:justify-between">
          <p>
            <span className="font-semibold text-volt-400">Freeship</span> cho đơn từ 2 triệu · Nhập mã{' '}
            <span className="font-semibold text-white">VOLT10</span> giảm 10%
          </p>
          <p className="hidden sm:block">Hotline 1900 6868 · Đổi trả miễn phí 30 ngày</p>
        </div>
      </div>

      <div className="border-b border-zinc-200/70 bg-white/85 backdrop-blur-xl">
        <div className="container-page flex h-16 items-center gap-4 lg:gap-8">
          <Logo />
          <div className="hidden flex-1 md:block">{searchForm}</div>
          <div className="ml-auto flex items-center gap-1">
            <Link to="/wishlist" className="btn btn-ghost relative size-10 px-0" aria-label="Sản phẩm yêu thích">
              <Heart className="size-5" />
              <CountBadge value={wishlist.items.length} />
            </Link>
            <Link to="/cart" className="btn btn-ghost relative size-10 px-0" aria-label="Giỏ hàng">
              <ShoppingBag className="size-5" />
              <CountBadge value={count} />
            </Link>
            <AccountMenu />
          </div>
        </div>
        <div className="container-page pb-3 md:hidden">{searchForm}</div>

        <nav className="container-page scrollbar-none flex gap-1 overflow-x-auto pb-2.5" aria-label="Danh mục">
          <NavLink
            to="/products"
            end
            className={() =>
              `flex shrink-0 items-center rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                location.pathname === '/products' && !activeCategory ? 'bg-zinc-950 text-white' : 'text-zinc-600 hover:bg-zinc-100'
              }`
            }
          >
            Tất cả
          </NavLink>
          {categories?.map((category) => {
            const Icon = CATEGORY_ICONS[category.icon];
            const active = activeCategory === category.slug;
            return (
              <Link
                key={category.slug}
                to={`/products?category=${category.slug}`}
                className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  active ? 'bg-zinc-950 text-white' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
                }`}
              >
                {Icon && <Icon className="size-4" strokeWidth={1.75} />}
                {category.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
