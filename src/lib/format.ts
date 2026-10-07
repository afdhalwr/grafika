/* Format angka & tanggal (id-ID) dan utilitas kecil yang dipakai di banyak tempat. */

export const DAY_MS = 864e5;

export const Fmt = {
  number(v: number, digits = 0) {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: digits }).format(v);
  },
  compact(v: number) {
    return new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
  },
  /** Nilai dengan satuan: "Rp 1.250.000", "320 orang". */
  value(v: number, unit?: string, { compact = false } = {}) {
    const n = compact && Math.abs(v) >= 10000 ? this.compact(v) : this.number(v, Math.abs(v) < 100 ? 1 : 0);
    if (!unit) return n;
    return unit.toLowerCase() === 'rp' ? `Rp ${n}` : `${n} ${unit}`;
  },
  percent(v: number, digits = 1) {
    return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: digits }).format(v)}%`;
  },
  date(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
    return new Intl.DateTimeFormat('id-ID', opts).format(parseISO(iso));
  },
};

/** "2026-09-29" -> Date lokal (tanpa geser zona waktu). */
export function parseISO(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Date -> "2026-09-29" (tanggal lokal). */
export function toISO(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY_MS);

export const round2 = (v: number) => Math.round(v * 100) / 100;

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}

export function cssVar(name: string) {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Warna dengan transparansi dari hex, untuk isi area grafik. */
export function withAlpha(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, c => c + c) : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'data';

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;
