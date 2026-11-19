import { useEffect, useState } from 'react';
import { ArrowRight, CreditCard, Flame, Headphones, Laptop, RotateCcw, ShieldCheck, Smartphone, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProductGrid } from '../components/ProductCard';
import { CATEGORY_ICONS } from '../components/ProductVisual';
import { SectionHeader } from '../components/ui';
import { useApi } from '../lib/useApi';

const PERKS = [
  { icon: Truck, title: 'Giao nhanh 2 giờ', text: 'Miễn phí cho đơn từ 2 triệu' },
  { icon: ShieldCheck, title: 'Chính hãng 100%', text: 'Bảo hành điện tử tận nơi' },
  { icon: RotateCcw, title: 'Đổi trả 30 ngày', text: 'Lỗi là đổi, không cần lý do' },
  { icon: CreditCard, title: 'Trả góp 0%', text: 'Duyệt hồ sơ trong 5 phút' },
];

const BRANDS = ['Apple', 'Samsung', 'Sony', 'Xiaomi', 'ASUS', 'Dell', 'Lenovo', 'Logitech', 'Garmin', 'Fujifilm', 'Marshall', 'JBL'];

function useCountdown() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  const diff = Math.max(0, end.getTime() - now);
  return [Math.floor(diff / 3_600_000), Math.floor(diff / 60_000) % 60, Math.floor(diff / 1000) % 60].map((n) =>
    String(n).padStart(2, '0'),
  );
}

function Hero() {
  return (
    <section className="container-page pt-6">
      <div className="grid gap-4 lg:grid-cols-3 lg:grid-rows-2">
        <Link
          to="/products/iphone-16-pro-max"
          className="group relative isolate flex min-h-[460px] flex-col justify-between overflow-hidden rounded-[2rem] bg-zinc-950 p-8 text-white sm:p-12 lg:col-span-2 lg:row-span-2"
        >
          <div className="absolute -top-32 -right-24 -z-10 size-[28rem] rounded-full bg-volt-400/25 blur-[100px]" />
          <div className="absolute -bottom-40 left-1/4 -z-10 size-[26rem] rounded-full bg-indigo-500/25 blur-[110px]" />
          <div
            className="absolute inset-0 -z-10 opacity-[0.07]"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}
          />

          <div className="max-w-md">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300 backdrop-blur">
              <span className="size-1.5 rounded-full bg-volt-400" /> Mới về · Titan Sa Mạc
            </span>
            <h1 className="mt-6 text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-6xl">
              iPhone 16 Pro Max.
              <span className="block text-zinc-500">Titan. Mạnh mẽ.</span>
            </h1>
            <p className="mt-5 max-w-sm text-zinc-400">
              Chip A18 Pro, camera 48MP zoom 5x và nút Điều khiển Camera hoàn toàn mới.
            </p>
          </div>

          <div className="pointer-events-none absolute top-1/2 right-6 hidden -translate-y-1/2 sm:block lg:right-14">
            <div className="relative grid size-64 place-items-center lg:size-80">
              <div className="absolute inset-6 rounded-full border border-white/10" />
              <div className="absolute inset-0 rounded-full border border-dashed border-white/10 transition duration-[2s] group-hover:rotate-45" />
              <Smartphone className="size-40 text-volt-400 drop-shadow-[0_0_40px_rgba(198,244,50,0.45)] transition duration-500 group-hover:scale-105 lg:size-52" strokeWidth={0.9} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span className="btn btn-volt btn-lg">
              Mua ngay <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </span>
            <div>
              <p className="text-xs text-zinc-500">Giá chỉ từ</p>
              <p className="text-xl font-bold">
                30.990.000₫ <span className="text-sm font-normal text-zinc-500 line-through">34.990.000₫</span>
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/products/macbook-air-m4-13"
          className="group relative isolate flex min-h-[220px] flex-col justify-between overflow-hidden rounded-[2rem] bg-gradient-to-br from-sky-100 via-sky-50 to-white p-7"
        >
          <Laptop className="absolute -right-6 -bottom-8 -z-10 size-48 text-sky-300/70 transition duration-500 group-hover:-translate-x-2" strokeWidth={0.9} />
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-sky-700/70 uppercase">Mới · Chip M4</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight">MacBook Air 13"</h2>
            <p className="mt-1 text-sm text-zinc-600">Pin 18 giờ. Nhẹ chỉ 1,24kg.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
            Từ 26.990.000₫ <ArrowRight className="size-4 transition group-hover:translate-x-1" />
          </span>
        </Link>

        <Link
          to="/products/sony-wh-1000xm6"
          className="group relative isolate flex min-h-[220px] flex-col justify-between overflow-hidden rounded-[2rem] bg-volt-400 p-7"
        >
          <Headphones className="absolute -right-4 -bottom-6 -z-10 size-44 text-volt-600/40 transition duration-500 group-hover:rotate-[-8deg]" strokeWidth={0.9} />
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-zinc-950/50 uppercase">Chống ồn số 1</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight">Sony WH-1000XM6</h2>
            <p className="mt-1 text-sm text-zinc-800">12 micro, bộ xử lý QN3.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
            9.490.000₫ <ArrowRight className="size-4 transition group-hover:translate-x-1" />
          </span>
        </Link>
      </div>
    </section>
  );
}

export default function HomePage() {
  const { data: categories } = useApi('/categories');
  const deals = useApi('/products?sale=1&sort=popular&limit=4');
  const featured = useApi('/products?featured=1&sort=popular&limit=8');
  const newest = useApi('/products?sort=newest&limit=4');
  const [hours, minutes, seconds] = useCountdown();

  return (
    <div className="animate-fade-up">
      <Hero />

      <section className="container-page mt-4">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-zinc-200/80 bg-zinc-200/80 lg:grid-cols-4">
          {PERKS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-center gap-3.5 bg-white px-5 py-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-zinc-100">
                <Icon className="size-5" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs text-zinc-500">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page mt-20">
        <SectionHeader eyebrow="Danh mục" title="Mua sắm theo nhu cầu" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {categories?.map((category) => {
            const Icon = CATEGORY_ICONS[category.icon];
            return (
              <Link
                key={category.slug}
                to={`/products?category=${category.slug}`}
                className="group relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-5 transition hover:-translate-y-0.5 hover:border-zinc-950 hover:shadow-xl hover:shadow-zinc-950/5"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-zinc-100 transition group-hover:bg-volt-400">
                  {Icon && <Icon className="size-6" strokeWidth={1.5} />}
                </span>
                <p className="mt-6 font-bold">{category.name}</p>
                <p className="text-sm text-zinc-500">{category.product_count} sản phẩm</p>
                <ArrowRight className="absolute top-5 right-5 size-4 -translate-x-1 text-zinc-400 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="container-page mt-20">
        <div className="rounded-[2rem] bg-white p-6 ring-1 ring-zinc-200/80 sm:p-10">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <span className="grid size-12 place-items-center rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-500/30">
                <Flame className="size-6" />
              </span>
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Flash Sale hôm nay</h2>
                <p className="text-sm text-zinc-500">Giá sốc chỉ trong hôm nay, số lượng có hạn</p>
              </div>
            </div>
            <div className="flex items-center gap-2" aria-label="Thời gian còn lại">
              <span className="mr-1 text-sm text-zinc-500">Kết thúc sau</span>
              {[hours, minutes, seconds].map((part, index) => (
                <span key={index} className="flex items-center gap-2">
                  {index > 0 && <span className="font-bold text-zinc-300">:</span>}
                  <span className="grid h-11 w-12 place-items-center rounded-xl bg-zinc-950 text-lg font-bold text-white tabular-nums">{part}</span>
                </span>
              ))}
            </div>
          </div>
          <ProductGrid items={deals.data?.items} loading={deals.loading} skeletons={4} />
          <div className="mt-10 text-center">
            <Link to="/products?sale=1" className="btn btn-outline">
              Xem tất cả ưu đãi <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="container-page mt-20">
        <SectionHeader
          eyebrow="Nổi bật"
          title="Sản phẩm được yêu thích"
          description="Những thiết bị được khách hàng VoltTech chọn mua và đánh giá cao nhất."
          action={
            <Link to="/products?sort=popular" className="btn btn-ghost">
              Xem tất cả <ArrowRight className="size-4" />
            </Link>
          }
        />
        <ProductGrid items={featured.data?.items} loading={featured.loading} />
      </section>

      <section className="mt-20 overflow-hidden border-y border-zinc-200/80 bg-white py-8">
        <div className="flex w-max animate-[marquee_40s_linear_infinite] gap-14 hover:[animation-play-state:paused]">
          {[...BRANDS, ...BRANDS].map((brand, index) => (
            <span key={index} className="text-2xl font-extrabold tracking-tight text-zinc-300 transition hover:text-zinc-950">
              {brand}
            </span>
          ))}
        </div>
        <style>{'@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }'}</style>
      </section>

      <section className="container-page mt-20">
        <SectionHeader
          eyebrow="Vừa cập bến"
          title="Hàng mới về"
          action={
            <Link to="/products?sort=newest" className="btn btn-ghost">
              Xem tất cả <ArrowRight className="size-4" />
            </Link>
          }
        />
        <ProductGrid items={newest.data?.items} loading={newest.loading} skeletons={4} />
      </section>

      <section className="container-page mt-20">
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-zinc-950 px-6 py-14 text-center text-white sm:px-16">
          <div className="absolute top-0 left-1/2 -z-10 size-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-volt-400/20 blur-[100px]" />
          <h2 className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">Nhận ưu đãi độc quyền mỗi tuần</h2>
          <p className="mx-auto mt-3 max-w-md text-zinc-400">
            Đăng ký để là người đầu tiên biết về flash sale, hàng mới và mã giảm giá dành riêng cho thành viên.
          </p>
          <form className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row" onSubmit={(event) => event.preventDefault()}>
            <input
              type="email"
              required
              placeholder="Email của bạn"
              className="h-12 flex-1 rounded-full border border-white/15 bg-white/5 px-5 text-sm outline-none placeholder:text-zinc-500 focus:border-volt-400"
            />
            <button type="submit" className="btn btn-volt h-12">Đăng ký</button>
          </form>
        </div>
      </section>
    </div>
  );
}
