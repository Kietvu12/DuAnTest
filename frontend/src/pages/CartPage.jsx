import { ArrowRight, ShieldCheck, ShoppingBag, Trash2, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TotalsTable } from '../components/OrderSummary';
import { ProductVisual } from '../components/ProductVisual';
import { EmptyState, QuantityInput } from '../components/ui';
import { FREE_SHIPPING_THRESHOLD, formatPrice, shippingFor } from '../lib/format';
import { useCart } from '../lib/store';

export default function CartPage() {
  const { items, subtotal, count, update, remove } = useCart();

  if (items.length === 0) {
    return (
      <div className="container-page animate-fade-up pt-16">
        <EmptyState
          icon={ShoppingBag}
          title="Giỏ hàng của bạn đang trống"
          description="Khám phá hàng ngàn sản phẩm công nghệ chính hãng với ưu đãi hấp dẫn."
          action={<Link to="/products" className="btn btn-primary">Tiếp tục mua sắm</Link>}
        />
      </div>
    );
  }

  const shipping = shippingFor(subtotal);
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <div className="container-page animate-fade-up pt-10">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Giỏ hàng</h1>
      <p className="mt-2 text-zinc-500">{count} sản phẩm</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-3 text-sm">
              <Truck className="size-5 text-zinc-500" />
              {remaining > 0 ? (
                <p>
                  Mua thêm <span className="font-semibold">{formatPrice(remaining)}</span> để được <span className="font-semibold">miễn phí vận chuyển</span>
                </p>
              ) : (
                <p className="font-semibold text-emerald-600">Đơn hàng của bạn được miễn phí vận chuyển!</p>
              )}
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
              <div className="h-full rounded-full bg-volt-500 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <ul className="card divide-y divide-zinc-100">
            {items.map((item) => (
              <li key={item.variantId} className="flex gap-4 p-5 sm:gap-6">
                <Link to={`/products/${item.productSlug}`} className="shrink-0">
                  <ProductVisual icon={item.icon} hex={item.colorHex} className="size-24 sm:size-28" rounded="rounded-2xl" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold tracking-[0.16em] text-zinc-400 uppercase">{item.brand}</p>
                      <Link to={`/products/${item.productSlug}`} className="mt-0.5 block font-semibold hover:text-zinc-600">
                        {item.productName}
                      </Link>
                      <p className="mt-0.5 text-sm text-zinc-500">{item.variantName}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(item.variantId)}
                      className="btn btn-ghost size-9 shrink-0 px-0 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Xoá khỏi giỏ"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
                    <QuantityInput size="sm" value={item.quantity} max={Math.min(item.stock ?? 20, 20)} onChange={(q) => update(item.variantId, q)} />
                    <div className="text-right">
                      <p className="font-bold">{formatPrice(item.price * item.quantity)}</p>
                      {item.quantity > 1 && <p className="text-xs text-zinc-500">{formatPrice(item.price)} / sản phẩm</p>}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <aside className="lg:sticky lg:top-40 lg:self-start">
          <div className="card p-6">
            <h2 className="mb-5 text-lg font-bold">Tóm tắt đơn hàng</h2>
            <TotalsTable subtotal={subtotal} shipping={shipping} discount={0} total={subtotal + shipping} />
            <p className="mt-3 text-xs text-zinc-500">Mã giảm giá được áp dụng ở bước thanh toán.</p>
            <Link to="/checkout" className="btn btn-primary btn-lg mt-6 w-full">
              Tiến hành thanh toán <ArrowRight className="size-4" />
            </Link>
            <Link to="/products" className="btn btn-ghost mt-2 w-full">Tiếp tục mua sắm</Link>
          </div>
          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-500">
            <ShieldCheck className="size-4" /> Thanh toán an toàn & bảo mật
          </p>
        </aside>
      </div>
    </div>
  );
}
