/* Perhitungan statistik dasbor — murni, tanpa React, mudah diuji. */

import { addDays, daysBetween, Fmt, parseISO, startOfToday, toISO } from './format';
import type { Dataset, Entry, Granularity, Prefs } from './types';

export type Bounds = { from: Date; to: Date };

export const WEEKDAY_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
export const WEEKDAY_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const MON_FIRST = [1, 2, 3, 4, 5, 6, 0];

export const sumValues = (list: Entry[]) => list.reduce((acc, e) => acc + e.value, 0);

export function periodBounds(ds: Pick<Dataset, 'entries'>, prefs: Prefs): Bounds {
  const t = startOfToday();
  if (prefs.range === 'custom' && prefs.from && prefs.to) {
    let from = parseISO(prefs.from);
    let to = parseISO(prefs.to);
    if (from > to) [from, to] = [to, from];
    return { from, to };
  }
  if (prefs.range === 'all') {
    const iso = toISO(t);
    let first = iso, last = iso;
    ds.entries.forEach(e => { if (e.date < first) first = e.date; if (e.date > last) last = e.date; });
    return { from: parseISO(first), to: parseISO(last) };
  }
  const n = Number(prefs.range) || 30;
  return { from: addDays(t, -(n - 1)), to: t };
}

export function previousBounds({ from, to }: Bounds): Bounds {
  const len = daysBetween(from, to) + 1;
  return { from: addDays(from, -len), to: addDays(from, -1) };
}

export function inRange(entries: Entry[], { from, to }: Bounds) {
  const f = toISO(from), t = toISO(to);
  return entries.filter(e => e.date >= f && e.date <= t);
}

function sumBy(entries: Entry[], keyFn: (e: Entry) => string) {
  const map = new Map<string, number>();
  entries.forEach(e => { const k = keyFn(e); map.set(k, (map.get(k) || 0) + e.value); });
  return map;
}

function bucketKey(date: Date, gran: Granularity) {
  if (gran === 'day') return toISO(date);
  if (gran === 'week') return toISO(addDays(date, -((date.getDay() + 6) % 7)));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function bucketLabel(key: string, gran: Granularity) {
  if (gran === 'day') return Fmt.date(key, { day: 'numeric', month: 'short' });
  if (gran === 'week') return `Mg ${Fmt.date(key, { day: 'numeric', month: 'short' })}`;
  return Fmt.date(`${key}-01`, { month: 'short', year: 'numeric' });
}

export function buildBuckets(bounds: Bounds, entries: Entry[], gran: Granularity) {
  const map = new Map<string, number>();
  for (let d = new Date(bounds.from); d <= bounds.to; d = addDays(d, 1)) {
    const k = bucketKey(d, gran);
    if (!map.has(k)) map.set(k, 0);
  }
  entries.forEach(e => {
    const k = bucketKey(parseISO(e.date), gran);
    if (map.has(k)) map.set(k, map.get(k)! + e.value);
  });
  return [...map].map(([key, value]) => ({ key, value: Math.round(value * 100) / 100 }));
}

export type Computed = ReturnType<typeof compute>;

/** Semua angka yang dibutuhkan satu kali render dasbor. */
export function compute(ds: Dataset, prefs: Prefs, category: string | null) {
  const byCategory = (list: Entry[]) => (category ? list.filter(e => e.category === category) : list);
  const bounds = periodBounds(ds, prefs);
  const prev = previousBounds(bounds);
  const periodAll = inRange(ds.entries, bounds);
  const period = byCategory(periodAll);
  const prevEntries = byCategory(inRange(ds.entries, prev));
  const days = daysBetween(bounds.from, bounds.to) + 1;
  const total = sumValues(period);
  const prevTotal = sumValues(prevEntries);

  let best: { date: string; value: number } | null = null;
  sumBy(period, e => e.date).forEach((value, date) => { if (!best || value > best.value) best = { date, value }; });

  const cats = [...sumBy(periodAll, e => e.category)]
    .map(([name, value]) => ({ category: name, value }))
    .sort((a, b) => b.value - a.value);

  // rata-rata per hari dalam seminggu = jumlah ÷ banyaknya hari itu dalam periode
  const wdSum = Array(7).fill(0);
  const wdCount = Array(7).fill(0);
  for (let d = new Date(bounds.from); d <= bounds.to; d = addDays(d, 1)) wdCount[d.getDay()]++;
  period.forEach(e => { wdSum[parseISO(e.date).getDay()] += e.value; });
  const weekday: number[] = wdSum.map((s, i) => (wdCount[i] ? s / wdCount[i] : 0));

  // bulan kalender berjalan, untuk target (semua kategori)
  const t = startOfToday();
  const monthPrefix = toISO(t).slice(0, 7);
  const monthTotal = sumValues(ds.entries.filter(e => e.date.startsWith(monthPrefix)));
  const daysInMonth = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();

  return {
    ds, prefs, category, bounds, prev, periodAll, period, prevEntries, days, total, prevTotal,
    best: best as { date: string; value: number } | null, cats, weekday, monthTotal, daysInMonth, dayOfMonth: t.getDate(),
  };
}

/** Berapa hari berturut-turut (sampai hari ini/kemarin) ada catatan. */
export function streakOf(ds: Dataset) {
  const dates = new Set(ds.entries.map(e => e.date));
  let d = startOfToday();
  if (!dates.has(toISO(d))) d = addDays(d, -1); // hari ini belum dicatat? hitung dari kemarin
  let n = 0;
  while (dates.has(toISO(d))) { n++; d = addDays(d, -1); }
  return n;
}

export function rangeText(c: Pick<Computed, 'bounds' | 'prefs'>) {
  if (c.prefs.range === 'all') return 'Semua waktu';
  if (c.prefs.range === 'custom') return `${Fmt.date(toISO(c.bounds.from))} – ${Fmt.date(toISO(c.bounds.to))}`;
  return `${c.prefs.range} hari terakhir`;
}

export function categoriesByFrequency(ds: Dataset) {
  const count = new Map<string, number>();
  ds.entries.forEach(e => count.set(e.category, (count.get(e.category) || 0) + 1));
  return [...count].sort((a, b) => b[1] - a[1]).map(([c]) => c);
}
