import { useState } from 'react';
import { Banknote, CreditCard, Landmark, LockKeyhole, ShoppingBag, Tag, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { OrderItems, TotalsTable } from '../components/OrderSummary';
import { EmptyState, PageLoader } from '../components/ui';
import { api } from '../lib/api';
import { shippingFor } from '../lib/format';
import { useAuth, useCart, useToast } from '../lib/store';

const CITIES = ['TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng', 'Nha Trang', 'Huế', 'Biên Hoà', 'Vũng Tàu', 'Đà Lạt'];

const PAYMENT_OPTIONS = [
  { id: 'cod', icon: Banknote, title: 'Thanh toán khi nhận hàng', text: 'Kiểm tra hàng trước khi thanh toán' },
  { id: 'bank_transfer', icon: Landmark, title: 'Chuyển khoản ngân hàng', text: 'Xác nhận đơn ngay sau khi nhận tiền' },
  { id: 'card', icon: CreditCard, title: 'Thẻ tín dụng / ghi nợ', text: 'Visa, Mastercard, JCB (mô phỏng)' },
];

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({
    fullName: user?.full_name ?? '',
    phone: user?.phone ?? '',
    email: user?.email ?? '',
    city: CITIES[0],
    address: '',
    note: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (items.length === 0) {
    if (submitting) return <PageLoader />;
    return (
      <div className="container-page pt-16">
        <EmptyState
          icon={ShoppingBag}
          title="Chưa có sản phẩm để thanh toán"
          action={<Link to="/products" className="btn btn-primary">Khám phá sản phẩm</Link>}
        />
      </div>
    );
  }

  const shipping = shippingFor(subtotal);
  const discount = coupon?.discount ?? 0;
  const total = subtotal + shipping - discount;
  const field = (name) => ({
    value: form[name],
    onChange: (event) => setForm((prev) => ({ ...prev, [name]: event.target.value })),
  });

  const applyCoupon = async () => {
    setCouponError('');
    try {
      const result = await api('/coupons/validate', { method: 'POST', body: { code: couponInput, subtotal } });
      setCoupon(result);
      toast(`Đã áp dụng mã ${result.code}`);
    } catch (err) {
      setCoupon(null);
      setCouponError(err.message);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const order = await api('/orders', {
        method: 'POST',
        body: {
          items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
          customer: form,
          paymentMethod,
          couponCode: coupon?.code,
        },
      });
      navigate(`/order-success/${order.code}`, { replace: true, state: { order } });
      clear();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="container-page animate-fade-up pt-10">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Thanh toán</h1>
      {!user && (
        <p className="mt-2 text-sm text-zinc-500">
          Đã có tài khoản?{' '}
          <Link to="/login?redirect=/checkout" className="font-semibold text-zinc-950 underline underline-offset-4">Đăng nhập</Link>{' '}
          để theo dõi đơn hàng dễ dàng hơn.
        </p>
      )}

      {error && <div className="mt-6 rounded-2xl bg-rose-50 px-5 py-4 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div>}

      <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <section className="card p-6 sm:p-8">
            <h2 className="flex items-center gap-3 text-lg font-bold">
              <span className="grid size-7 place-items-center rounded-full bg-zinc-950 text-xs text-white">1</span>
              Thông tin giao hàng
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label>
                <span className="label">Họ và tên *</span>
                <input required className="input" placeholder="Nguyễn Văn A" {...field('fullName')} />
              </label>
              <label>
                <span className="label">Số điện thoại *</span>
                <input required className="input" inputMode="tel" placeholder="0912 345 678" {...field('phone')} />
              </label>
              <label className="sm:col-span-2">
                <span className="label">Email</span>
                <input type="email" className="input" placeholder="email@vidu.com" {...field('email')} />
              </label>
              <label>
                <span className="label">Tỉnh / Thành phố *</span>
                <select className="input" {...field('city')}>
                  {CITIES.map((city) => <option key={city}>{city}</option>)}
                </select>
              </label>
              <label>
                <span className="label">Địa chỉ *</span>
                <input required className="input" placeholder="Số nhà, tên đường, phường/xã" {...field('address')} />
              </label>
              <label className="sm:col-span-2">
                <span className="label">Ghi chú</span>
                <textarea rows={3} className="input h-auto py-3" placeholder="Ví dụ: giao giờ hành chính" {...field('note')} />
              </label>
            </div>
          </section>

          <section className="card p-6 sm:p-8">
            <h2 className="flex items-center gap-3 text-lg font-bold">
              <span className="grid size-7 place-items-center rounded-full bg-zinc-950 text-xs text-white">2</span>
              Phương thức thanh toán
            </h2>
            <div className="mt-6 grid gap-3">
              {PAYMENT_OPTIONS.map(({ id, icon: Icon, title, text }) => (
                <label
                  key={id}
                  className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition ${
                    paymentMethod === id ? 'border-zinc-950 bg-zinc-50 ring-1 ring-zinc-950' : 'border-zinc-200 hover:border-zinc-400'
                  }`}
                >
                  <input type="radio" name="payment" value={id} checked={paymentMethod === id} onChange={() => setPaymentMethod(id)} className="sr-only" />
                  <span className={`grid size-11 place-items-center rounded-xl ${paymentMethod === id ? 'bg-zinc-950 text-volt-400' : 'bg-zinc-100 text-zinc-500'}`}>
                    <Icon className="size-5" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{title}</span>
                    <span className="block text-xs text-zinc-500">{text}</span>
                  </span>
                  <span className={`size-5 rounded-full border-2 ${paymentMethod === id ? 'border-[6px] border-zinc-950' : 'border-zinc-300'}`} />
                </label>
              ))}
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-40 lg:self-start">
          <div className="card p-6">
            <h2 className="mb-5 text-lg font-bold">Đơn hàng ({items.length})</h2>
            <div className="max-h-72 overflow-y-auto pr-1">
              <OrderItems items={items} />
            </div>

            <div className="mt-6 border-t border-zinc-100 pt-6">
              {coupon ? (
                <div className="flex items-center gap-3 rounded-2xl bg-volt-200/60 px-4 py-3 text-sm">
                  <Tag className="size-4 text-volt-600" />
                  <div className="flex-1">
                    <p className="font-semibold">{coupon.code}</p>
                    <p className="text-xs text-zinc-600">{coupon.description}</p>
                  </div>
                  <button type="button" onClick={() => setCoupon(null)} className="rounded-full p-1 text-zinc-500 hover:bg-white" aria-label="Bỏ mã">
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      value={couponInput}
                      onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                      placeholder="Mã giảm giá"
                      className="input h-10 uppercase"
                    />
                    <button type="button" onClick={applyCoupon} disabled={!couponInput.trim()} className="btn btn-outline h-10">Áp dụng</button>
                  </div>
                  {couponError && <p className="mt-2 text-xs text-rose-600">{couponError}</p>}
                  <p className="mt-2 text-xs text-zinc-500">Thử: VOLT10, GIAM500K, FREESHIP</p>
                </>
              )}
            </div>

            <div className="mt-6 border-t border-zinc-100 pt-6">
              <TotalsTable subtotal={subtotal} shipping={shipping} discount={discount} total={total} couponCode={coupon?.code} />
            </div>
            <button type="submit" disabled={submitting} className="btn btn-primary btn-lg mt-6 w-full">
              <LockKeyhole className="size-4" /> {submitting ? 'Đang đặt hàng…' : 'Đặt hàng'}
            </button>
            <p className="mt-3 text-center text-xs text-zinc-500">
              Bằng việc đặt hàng, bạn đồng ý với điều khoản sử dụng của VoltMart.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
