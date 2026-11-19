import { Check, ClipboardCheck, PackageCheck, Truck, X } from 'lucide-react';
import { ORDER_FLOW, ORDER_STATUS } from '../lib/format';

const ICONS = { pending: ClipboardCheck, confirmed: Check, shipping: Truck, delivered: PackageCheck };

export function OrderTimeline({ status }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-zinc-100 px-5 py-4 text-sm text-zinc-600">
        <X className="size-5" /> Đơn hàng đã bị huỷ. Tồn kho đã được hoàn lại.
      </div>
    );
  }
  const current = ORDER_FLOW.indexOf(status);
  return (
    <ol className="grid grid-cols-4">
      {ORDER_FLOW.map((step, index) => {
        const Icon = ICONS[step];
        const done = index <= current;
        return (
          <li key={step} className="relative flex flex-col items-center text-center">
            {index > 0 && (
              <span className={`absolute top-5 right-1/2 h-0.5 w-full -translate-y-1/2 ${index <= current ? 'bg-zinc-950' : 'bg-zinc-200'}`} />
            )}
            <span
              className={`relative grid size-10 place-items-center rounded-full ring-4 ring-white transition ${
                done ? 'bg-zinc-950 text-volt-400' : 'bg-zinc-100 text-zinc-400'
              }`}
            >
              <Icon className="size-4" />
            </span>
            <span className={`mt-2 text-xs font-medium ${done ? 'text-zinc-950' : 'text-zinc-400'}`}>{ORDER_STATUS[step].label}</span>
          </li>
        );
      })}
    </ol>
  );
}
