import Link from 'next/link';
import { Icon } from './Icon';

export function Brand({ className = '', small = false, light = false }: { className?: string; small?: boolean; light?: boolean }) {
  return (
    <Link href="/" className={`brand ${small ? 'text-base' : ''} ${light ? 'text-white!' : ''} ${className}`} aria-label="Grafika, beranda">
      <span
        className={`brand-mark ${small ? 'size-7! rounded-[9px]! [&_svg]:size-4!' : ''} ${light ? 'bg-white/20! shadow-none! backdrop-blur-sm' : ''}`}
      >
        <Icon name="logo" />
      </span>
      Grafika
    </Link>
  );
}

/** Layar tunggu saat sesi sedang diperiksa. */
export function FullPageSpinner({ label = 'Memuat…' }: { label?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center text-muted">
      <div className="flex flex-col items-center gap-3">
        <span className="brand-mark animate-pulse"><Icon name="logo" /></span>
        <span className="text-sm font-semibold">{label}</span>
      </div>
    </div>
  );
}
