import { Link } from 'react-router-dom';
import { formatPrice } from '../lib/format';
import { ProductVisual } from './ProductVisual';

export function OrderItems({ items }) {
  return (
    <ul className="divide-y divide-zinc-100">
      {items.map((item) => (
        <li key={item.id ?? item.variantId} className="flex gap-4 py-4 first:pt-0 last:pb-0">
          <Link to={`/products/${item.product_slug ?? item.productSlug}`} className="shrink-0">
            <ProductVisual icon={item.category_icon ?? item.icon} hex={item.color_hex ?? item.colorHex} className="size-16" rounded="rounded-2xl" iconClassName="size-[50%]" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{item.product_name ?? item.productName}</p>
            <p className="text-xs text-zinc-500">{item.variant_name ?? item.variantName}</p>
            <p className="mt-1 text-xs text-zinc-500">Số lượng: {item.quantity}</p>
          </div>
          <p className="text-sm font-semibold">{formatPrice((item.unit_price ?? item.price) * item.quantity)}</p>
        </li>
      ))}
    </ul>
  );
}

export function TotalsTable({ subtotal, shipping, discount, total, couponCode }) {
  return (
    <dl className="space-y-3 text-sm">
      <div className="flex justify-between">
        <dt className="text-zinc-500">Tạm tính</dt>
        <dd className="font-medium">{formatPrice(subtotal)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-zinc-500">Phí vận chuyển</dt>
        <dd className="font-medium">{shipping === 0 ? <span className="text-emerald-600">Miễn phí</span> : formatPrice(shipping)}</dd>
      </div>
      {discount > 0 && (
        <div className="flex justify-between">
          <dt className="text-zinc-500">Giảm giá {couponCode && <span className="chip ml-1 bg-volt-200 text-zinc-800">{couponCode}</span>}</dt>
          <dd className="font-medium text-rose-600">-{formatPrice(discount)}</dd>
        </div>
      )}
      <div className="flex items-baseline justify-between border-t border-zinc-200 pt-4">
        <dt className="font-semibold">Tổng cộng</dt>
        <dd className="text-2xl font-extrabold tracking-tight">{formatPrice(total)}</dd>
      </div>
    </dl>
  );
}
