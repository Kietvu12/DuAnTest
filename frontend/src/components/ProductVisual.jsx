import { Cable, Camera, Gamepad2, Headphones, Laptop, Package, Smartphone, Tablet, Watch } from 'lucide-react';

export const CATEGORY_ICONS = {
  smartphone: Smartphone,
  laptop: Laptop,
  tablet: Tablet,
  headphones: Headphones,
  watch: Watch,
  camera: Camera,
  gamepad: Gamepad2,
  cable: Cable,
};

function luminance(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/**
 * Stylised product artwork: a tinted studio backdrop with the category glyph,
 * so every product and colour variant gets a consistent look without photos.
 */
export function ProductVisual({ icon, hex, label, className = '', iconClassName = 'size-[46%]', rounded = 'rounded-3xl' }) {
  const Icon = CATEGORY_ICONS[icon] ?? Package;
  const tint = /^#[0-9a-f]{6}$/i.test(hex ?? '') ? hex : '#a1a1aa';
  const light = luminance(tint) > 0.78;
  const stroke = light ? '#52525b' : `color-mix(in oklab, ${tint} 78%, black)`;

  return (
    <div
      className={`relative isolate flex items-center justify-center overflow-hidden bg-zinc-100 ${rounded} ${className}`}
      style={{
        backgroundImage: `radial-gradient(120% 90% at 15% 0%, ${tint}${light ? '99' : '55'} 0%, transparent 55%), radial-gradient(90% 70% at 100% 100%, ${tint}33 0%, transparent 60%), linear-gradient(180deg, #fafafa, #ececee)`,
      }}
    >
      <div className="absolute inset-[22%] -z-10 rounded-full bg-white/70 blur-2xl" />
      <div className="absolute inset-x-[20%] bottom-[14%] -z-10 h-[8%] rounded-[100%] bg-zinc-900/10 blur-md" />
      <Icon className={`${iconClassName} drop-shadow-[0_18px_22px_rgba(24,24,27,0.18)]`} style={{ color: stroke }} strokeWidth={1.1} />
      {label && (
        <span className="absolute bottom-3.5 left-4 text-[10px] font-bold tracking-[0.22em] text-zinc-500/70 uppercase">{label}</span>
      )}
    </div>
  );
}
