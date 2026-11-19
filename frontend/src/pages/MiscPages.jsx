import { useState } from 'react';
import { ArrowRight, Heart, SearchX, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ProductGrid } from '../components/ProductCard';
import { EmptyState, Logo } from '../components/ui';
import { useAuth, useWishlist } from '../lib/store';

export function WishlistPage() {
  const { items } = useWishlist();
  return (
    <div className="container-page animate-fade-up pt-10">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Sản phẩm yêu thích</h1>
      <p className="mt-2 text-zinc-500">{items.length} sản phẩm đã lưu</p>
      <div className="mt-8">
        {items.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="Chưa có sản phẩm yêu thích"
            description="Nhấn biểu tượng trái tim trên sản phẩm để lưu lại và xem sau."
            action={<Link to="/products" className="btn btn-primary">Khám phá ngay</Link>}
          />
        ) : (
          <ProductGrid items={items} />
        )}
      </div>
    </div>
  );
}

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="container-page animate-fade-up pt-10">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] bg-white ring-1 ring-zinc-200/80 lg:grid-cols-2">
        <div className="relative isolate hidden flex-col justify-between overflow-hidden bg-zinc-950 p-10 text-white lg:flex">
          <div className="absolute -top-20 -left-20 -z-10 size-80 rounded-full bg-volt-400/25 blur-[90px]" />
          <div className="absolute -right-10 -bottom-24 -z-10 size-80 rounded-full bg-indigo-500/25 blur-[90px]" />
          <Logo dark />
          <div>
            <h2 className="text-3xl leading-tight font-extrabold tracking-tight">Công nghệ chính hãng,<br />trải nghiệm đẳng cấp.</h2>
            <ul className="mt-8 space-y-4 text-sm text-zinc-300">
              {[
                [Sparkles, 'Ưu đãi riêng cho thành viên mỗi tuần'],
                [Truck, 'Theo dõi đơn hàng theo thời gian thực'],
                [ShieldCheck, 'Bảo hành điện tử, không cần giữ hoá đơn'],
              ].map(([Icon, text]) => (
                <li key={text} className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-xl bg-white/10"><Icon className="size-4 text-volt-400" /></span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-zinc-500">© VoltMart</p>
        </div>
        <div className="p-8 sm:p-12">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-zinc-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 text-center text-sm text-zinc-500">{footer}</p>
        </div>
      </div>
    </div>
  );
}

function useAuthForm(path, initial) {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const redirect = params.get('redirect') || '/';
  const target = (user) => (user.role === 'admin' && redirect === '/' ? '/admin' : redirect);

  const field = (name) => ({ value: form[name], onChange: (event) => setForm((prev) => ({ ...prev, [name]: event.target.value })) });
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = await signIn(path, form);
      navigate(target(user), { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return { form, setForm, field, submit, error, busy, redirect, target };
}

export function LoginPage() {
  const { user } = useAuth();
  const { field, submit, error, busy, setForm, redirect, target } = useAuthForm('/auth/login', { email: '', password: '' });
  if (user) return <Navigate to={target(user)} replace />;

  return (
    <AuthShell
      title="Chào mừng trở lại"
      subtitle="Đăng nhập để theo dõi đơn hàng và nhận ưu đãi thành viên."
      footer={<>Chưa có tài khoản? <Link to={`/register?redirect=${encodeURIComponent(redirect)}`} className="font-semibold text-zinc-950 underline underline-offset-4">Đăng ký ngay</Link></>}
    >
      <form onSubmit={submit} className="space-y-5">
        <label className="block">
          <span className="label">Email</span>
          <input type="email" required autoComplete="email" className="input" placeholder="email@vidu.com" {...field('email')} />
        </label>
        <label className="block">
          <span className="label">Mật khẩu</span>
          <input type="password" required autoComplete="current-password" className="input" placeholder="••••••••" {...field('password')} />
        </label>
        {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        <button type="submit" disabled={busy} className="btn btn-primary btn-lg w-full">
          {busy ? 'Đang đăng nhập…' : 'Đăng nhập'} <ArrowRight className="size-4" />
        </button>
      </form>
      <div className="mt-6 rounded-2xl bg-zinc-50 p-4 text-xs text-zinc-600">
        <p className="mb-2 font-semibold text-zinc-900">Tài khoản demo</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setForm({ email: 'khach@voltmart.vn', password: 'Khach@123' })}>
            Khách hàng
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setForm({ email: 'admin@voltmart.vn', password: 'Admin@123' })}>
            Quản trị viên
          </button>
        </div>
      </div>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { user } = useAuth();
  const { field, submit, error, busy, redirect, target } = useAuthForm('/auth/register', { fullName: '', email: '', phone: '', password: '' });
  if (user) return <Navigate to={target(user)} replace />;

  return (
    <AuthShell
      title="Tạo tài khoản"
      subtitle="Chỉ mất 30 giây để bắt đầu mua sắm cùng VoltMart."
      footer={<>Đã có tài khoản? <Link to={`/login?redirect=${encodeURIComponent(redirect)}`} className="font-semibold text-zinc-950 underline underline-offset-4">Đăng nhập</Link></>}
    >
      <form onSubmit={submit} className="space-y-5">
        <label className="block">
          <span className="label">Họ và tên</span>
          <input required autoComplete="name" className="input" placeholder="Nguyễn Văn A" {...field('fullName')} />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="label">Email</span>
            <input type="email" required autoComplete="email" className="input" placeholder="email@vidu.com" {...field('email')} />
          </label>
          <label className="block">
            <span className="label">Số điện thoại</span>
            <input autoComplete="tel" className="input" placeholder="0912 345 678" {...field('phone')} />
          </label>
        </div>
        <label className="block">
          <span className="label">Mật khẩu</span>
          <input type="password" required minLength={6} autoComplete="new-password" className="input" placeholder="Tối thiểu 6 ký tự" {...field('password')} />
        </label>
        {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        <button type="submit" disabled={busy} className="btn btn-primary btn-lg w-full">
          {busy ? 'Đang tạo tài khoản…' : 'Đăng ký'} <ArrowRight className="size-4" />
        </button>
      </form>
    </AuthShell>
  );
}

export function NotFoundPage() {
  return (
    <div className="container-page pt-16">
      <EmptyState
        icon={SearchX}
        title="Trang không tồn tại"
        description="Đường dẫn bạn truy cập không đúng hoặc đã bị xoá."
        action={<Link to="/" className="btn btn-primary">Về trang chủ</Link>}
      />
    </div>
  );
}
