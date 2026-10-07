/* Data contoh untuk akun baru & akun demo, plus aturan warna kategori. */

import { addDays, startOfToday, toISO, uid } from './format';
import type { Dataset } from './types';

export const SERIES_COUNT = 8;

/** Beri kategori slot warna tetap — warna mengikuti kategori, bukan urutan tampil. */
export function withColorSlot(catColors: Record<string, number>, category: string) {
  if (catColors[category] != null) return catColors;
  const used = Object.values(catColors);
  let slot = 0;
  while (used.includes(slot) && slot < SERIES_COUNT - 1) slot++;
  if (used.includes(slot)) slot = used.length % SERIES_COUNT;
  return { ...catColors, [category]: slot };
}

function rng(seed: number) { // mulberry32 — acak tapi selalu sama
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BLUEPRINTS = [
  {
    name: 'Penjualan Kafe', unit: 'Rp', color: 0, target: 45_000_000, seed: 7,
    cats: [['Kopi', 420_000], ['Non-kopi', 260_000], ['Makanan', 330_000], ['Kue & Roti', 150_000]] as const,
    weekday: [1.35, 0.8, 0.85, 0.9, 1, 1.25, 1.45], growth: 0.35, round: 1000,
    notes: ['Promo akhir pekan', 'Pesanan kantor', 'Hujan seharian', 'Menu baru', ''],
  },
  {
    name: 'Pengunjung Website', unit: 'orang', color: 2, target: 36_000, seed: 21,
    cats: [['Organik', 420], ['Media Sosial', 260], ['Langsung', 150], ['Iklan', 110]] as const,
    weekday: [0.7, 1.1, 1.15, 1.1, 1.05, 0.95, 0.65], growth: 0.6, round: 1,
    notes: ['Artikel viral', 'Kampanye email', 'Server lambat', ''],
  },
  {
    name: 'Jam Belajar', unit: 'jam', color: 6, target: 60, seed: 42,
    cats: [['Frontend', 1.2], ['Algoritma', 0.6], ['Desain UI', 0.5], ['Bahasa Inggris', 0.4]] as const,
    weekday: [1.5, 0.9, 0.8, 0.9, 0.8, 0.6, 1.4], growth: 0.25, round: 0.5,
    notes: ['Latihan React', 'Kelas daring', 'Membaca dokumentasi', ''],
  },
];

/** 150 hari data contoh untuk tiga dataset. */
export function seedDatasets(): Dataset[] {
  const today = startOfToday();
  const DAYS = 150;
  const base = Date.now();

  return BLUEPRINTS.map((bp, index) => {
    const rand = rng(bp.seed);
    let catColors: Record<string, number> = {};
    bp.cats.forEach(([c]) => { catColors = withColorSlot(catColors, c); });
    const ds: Dataset = {
      id: uid(), name: bp.name, unit: bp.unit, color: bp.color, target: bp.target,
      higherIsBetter: true, catColors, entries: [], order: base + index,
    };
    let n = 0;
    for (let i = DAYS; i >= 0; i--) {
      const date = addDays(today, -i);
      const progress = 1 - i / DAYS;
      const wd = bp.weekday[date.getDay()];
      bp.cats.forEach(([category, baseValue]) => {
        if (rand() < 0.08) return; // sesekali tidak ada catatan
        const noise = 0.7 + rand() * 0.6;
        const spike = rand() < 0.03 ? 1.8 : 1;
        const raw = baseValue * wd * noise * spike * (1 + bp.growth * progress);
        const value = Math.max(bp.round, Math.round(raw / bp.round) * bp.round);
        const note = rand() < 0.12 ? bp.notes[Math.floor(rand() * bp.notes.length)] : '';
        ds.entries.push({ id: `${ds.id.slice(-4)}${(n++).toString(36)}`, date: toISO(date), category, value, note });
      });
    }
    return ds;
  });
}
