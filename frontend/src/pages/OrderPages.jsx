import { ArrowLeft, CircleCheck, Landmark, MapPin, Package, Receipt } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { OrderItems, TotalsTable } from '../components/OrderSummary';
import { OrderTimeline } from '../components/OrderTimeline';
import { ProductVisual } from '../components/ProductVisual';
import { EmptyState, PageLoader, StatusBadge } from '../components/ui';
import { PAYMENT_METHODS, formatDate, formatPrice } from '../lib/format';
import { useAuth } from '../lib/store';
import { useApi } from '../lib/useApi';

function OrderInfo({ order }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl bg-zinc-50 p-5">
        <p className="flex items-center gap-2 text-xs font-bold tracking-wider text-zinc-400 uppercase">
          <MapPin className="size-3.5" /> Giao đến
        </p>
        <p className="mt-3 text-sm font-semibold">{order.customer_name} · {order.phone}</p>
        <p className="mt-1 text-sm text-zinc-600">{order.address}, {order.city}</p>
        {order.note && <p className="mt-2 text-xs text-zinc-500">Ghi chú: {order.note}</p>}
      </div>
      <div className="rounded-2xl bg-zinc-50 p-5">
        <p className="flex items-center gap-2 text-xs font-bold tracking-wider text-zinc-400 uppercase">
          <Receipt className="size-3.5" /> Thanh toán
        </p>
        <p className="mt-3 text-sm font-semibold">{PAYMENT_METHODS[order.payment_method]}</p>
        <p className="mt-1 text-sm text-zinc-600">Đặt lúc {formatDate(order.created_at, true)}</p>
      </div>
    </div>
  );
}

export function OrderSuccessPage() {
  const { code } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const stateOrder = location.state?.order;
  const { data, loading } = useApi(!stateOrder && user ? `/orders/${code}` : null);
  const order = stateOrder ?? data;

  if (loading) return <PageLoader />;

  return (
    <div className="container-page max-w-3xl animate-fade-up pt-12">
      <div className="text-center">
        <span className="mx-auto grid size-20 place-items-center rounded-full bg-volt-400 shadow-[0_0_0_10px] shadow-volt-200">
          <CircleCheck className="size-10 text-zinc-950" strokeWidth={1.75} />
        </span>
        <h1 className="mt-8 text-3xl font-extrabold tracking-tight sm:text-4xl">Đặt hàng thành công!</h1>
        <p className="mt-3 text-zinc-500">
          Cảm ơn bạn đã mua sắm tại VoltMart. Mã đơn hàng của bạn là{' '}
          <span className="font-mono font-bold text-zinc-950">{code}</span>
        </p>
      </div>

      {order ? (
        <div className="card mt-10 space-y-6 p-6 sm:p-8">
          <OrderTimeline status={order.status} />
          {order.payment_method === 'bank_transfer' && (
            <div className="flex gap-4 rounded-2xl bg-sky-50 p-5 text-sm text-sky-900 ring-1 ring-sky-100">
              <Landmark className="size-5 shrink-0" />
              <div>
                <p className="font-semibold">Thông tin chuyển khoản</p>
                <p className="mt-1">Ngân hàng Vietcombank · STK 0123 456 789 · CTCP VoltMart</p>
                <p>Số tiền: <b>{formatPrice(order.total)}</b> · Nội dung: <b className="font-mono">{order.code}</b></p>
              </div>
            </div>
          )}
          <OrderInfo order={order} />
          <OrderItems items={order.items} />
          <div className="border-t border-zinc-100 pt-6">
            <TotalsTable subtotal={order.subtotal} shipping={order.shipping_fee} discount={order.discount} total={order.total} couponCode={order.coupon_code} />
          </div>
        </div>
      ) : (
        <p className="mt-8 text-center text-sm text-zinc-500">Chúng tôi sẽ liên hệ với bạn để xác nhận đơn hàng trong ít phút.</p>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/products" className="btn btn-primary">Tiếp tục mua sắm</Link>
        {user && <Link to="/account" className="btn btn-outline">Xem đơn hàng của tôi</Link>}
      </div>
    </div>
  );
}

export function AccountPage() {
  const { user, signOut } = useAuth();
  const { data: orders, loading } = useApi('/orders/mine');
  const spent = orders?.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0) ?? 0;

  return (
    <div className="container-page animate-fade-up pt-10">
      <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-4 lg:sticky lg:top-40 lg:self-start">
          <div className="card overflow-hidden">
            <div className="h-20 bg-zinc-950" style={{ backgroundImage: 'radial-gradient(circle at 80% 0%, rgba(198,244,50,.35), transparent 60%)' }} />
            <div className="-mt-8 px-6 pb-6">
              <span className="grid size-16 place-items-center rounded-2xl bg-volt-400 text-xl font-extrabold ring-4 ring-white">
                {user.full_name.split(' ').at(-1)[0]}
              </span>
              <p className="mt-4 text-lg font-bold">{user.full_name}</p>
              <p className="text-sm text-zinc-500">{user.email}</p>
              {user.phone && <p className="text-sm text-zinc-500">{user.phone}</p>}
              <div className="mt-5 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-2xl bg-zinc-50 p-3">
                  <p className="text-lg font-bold">{orders?.length ?? 0}</p>
                  <p className="text-xs text-zinc-500">Đơn hàng</p>
                </div>
                <div className="rounded-2xl bg-zinc-50 p-3">
                  <p className="text-sm font-bold">{formatPrice(spent)}</p>
                  <p className="text-xs text-zinc-500">Đã chi tiêu</p>
                </div>
              </div>
              <button type="button" onClick={signOut} className="btn btn-outline mt-5 w-full">Đăng xuất</button>
            </div>
          </div>
        </aside>

        <section>
          <h1 className="text-3xl font-extrabold tracking-tight">Đơn hàng của tôi</h1>
          <div className="mt-6 space-y-4">
            {loading && !orders && <PageLoader />}
            {orders?.length === 0 && (
              <EmptyState icon={Package} title="Bạn chưa có đơn hàng nào" action={<Link to="/products" className="btn btn-primary">Mua sắm ngay</Link>} />
            )}
            {orders?.map((order) => (
              <Link key={order.id} to={`/account/orders/${order.code}`} className="card block p-5 transition hover:border-zinc-950 sm:p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-mono text-sm font-bold">{order.code}</p>
                  <StatusBadge status={order.status} />
                  <p className="ml-auto text-sm text-zinc-500">{formatDate(order.created_at, true)}</p>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex -space-x-3">
                    {order.items.slice(0, 4).map((item) => (
                      <ProductVisual key={item.id} icon={item.category_icon} hex={item.color_hex} className="size-14 ring-4 ring-white" rounded="rounded-2xl" iconClassName="size-[50%]" />
                    ))}
                  </div>
                  <p className="min-w-0 flex-1 truncate text-sm text-zinc-600">
                    {order.items.map((item) => item.product_name).join(', ')}
                  </p>
                  <p className="font-bold">{formatPrice(order.total)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export function OrderDetailPage() {
  const { code } = useParams();
  const { data: order, loading, error } = useApi(`/orders/${code}`);

  if (loading && !order) return <PageLoader />;
  if (error || !order) {
    return (
      <div className="container-page pt-16">
        <EmptyState icon={Package} title="Không tìm thấy đơn hàng" action={<Link to="/account" className="btn btn-primary">Quay lại</Link>} />
      </div>
    );
  }

  return (
    <div className="container-page max-w-4xl animate-fade-up pt-10">
      <Link to="/account" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-950">
        <ArrowLeft className="size-4" /> Đơn hàng của tôi
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-extrabold tracking-tight sm:text-3xl">{order.code}</h1>
        <StatusBadge status={order.status} />
      </div>
      <div className="card mt-8 space-y-8 p-6 sm:p-8">
        <OrderTimeline status={order.status} />
        <OrderInfo order={order} />
        <OrderItems items={order.items} />
        <div className="border-t border-zinc-100 pt-6">
          <TotalsTable subtotal={order.subtotal} shipping={order.shipping_fee} discount={order.discount} total={order.total} couponCode={order.coupon_code} />
        </div>
      </div>
    </div>
  );
}
