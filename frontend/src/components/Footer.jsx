import { Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from './ui';

const COLUMNS = [
  {
    title: 'Mua sắm',
    links: [
      ['Điện thoại', '/products?category=dien-thoai'],
      ['Laptop', '/products?category=laptop'],
      ['Tai nghe & Loa', '/products?category=am-thanh'],
      ['Đang giảm giá', '/products?sale=1'],
    ],
  },
  {
    title: 'Hỗ trợ',
    links: [
      ['Tra cứu đơn hàng', '/account'],
      ['Chính sách đổi trả', '/'],
      ['Bảo hành chính hãng', '/'],
      ['Trả góp 0%', '/'],
    ],
  },
  {
    title: 'VoltMart',
    links: [
      ['Về chúng tôi', '/'],
      ['Hệ thống cửa hàng', '/'],
      ['Tuyển dụng', '/'],
      ['Liên hệ hợp tác', '/'],
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 bg-zinc-950 text-zinc-400">
      <div className="container-page grid gap-12 py-16 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo dark />
          <p className="mt-5 max-w-xs text-sm leading-relaxed">
            Hệ thống bán lẻ đồ điện tử chính hãng. Giá minh bạch, giao nhanh 2 giờ nội thành, bảo hành tận nơi.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm">
            <li className="flex items-center gap-2.5"><Phone className="size-4 text-volt-400" /> 1900 6868</li>
            <li className="flex items-center gap-2.5"><Mail className="size-4 text-volt-400" /> hotro@voltmart.vn</li>
            <li className="flex items-center gap-2.5"><MapPin className="size-4 text-volt-400" /> 26 Lý Tự Trọng, Quận 1, TP.HCM</li>
          </ul>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <h3 className="text-sm font-semibold text-white">{column.title}</h3>
            <ul className="mt-4 space-y-3 text-sm">
              {column.links.map(([label, to]) => (
                <li key={label}>
                  <Link to={to} className="transition hover:text-volt-400">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-6 text-xs">
          <p>© {new Date().getFullYear()} VoltMart. Dự án demo thương mại điện tử.</p>
          <p>Thanh toán: COD · Chuyển khoản · Visa / Mastercard</p>
        </div>
      </div>
    </footer>
  );
}
