'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Icon, type IconName } from '@/components/Icon';
import type { Computed } from '@/lib/analytics';
import { Fmt, startOfToday, toISO } from '@/lib/format';
import { fmtVal } from './Charts';

function Delta({ cur, prev, higherIsBetter, all }: { cur: number; prev: number; higherIsBetter: boolean; all: boolean }) {
  if (all) return null;
  const base = 'inline-flex items-center gap-[3px] rounded-full py-0.5 pr-2 pl-1.5 text-xs font-bold [&_svg]:size-3.5';
  if (!prev) return cur ? <span className={`${base} bg-surface-2 text-muted`}>Baru</span> : null;
  const pct = ((cur - prev) / prev) * 100;
  if (Math.abs(pct) < 0.5) return <span className={`${base} bg-surface-2 text-muted`}>≈ 0%</span>;
  const up = pct > 0;
  const good = up === higherIsBetter;
  return (
    <span className={`${base} ${good ? 'bg-good-soft text-good' : 'bg-bad-soft text-bad'}`} title={good ? 'Kabar baik' : 'Perlu perhatian'}>
      <Icon name={up ? 'trending-up' : 'trending-down'} />{Fmt.percent(Math.abs(pct))}
    </span>
  );
}

function Kpi({ label, icon, tone, value, title, foot }: { label: string; icon: IconName; tone: string; value: ReactNode; title?: string; foot: ReactNode }) {
  return (
    <article className="card flex min-w-0 flex-col gap-1.5 px-5 py-[18px] short:gap-1 short:px-4 short:py-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-muted">{label}</span>
        <span className={`tone tone-${tone} size-[34px] rounded-[10px] short:size-[30px]`}><Icon name={icon} /></span>
      </div>
      <div className="truncate text-[26px] font-extrabold tracking-[-0.03em] max-xs:text-[23px] short:text-[22px]" title={title}>{value}</div>
      <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted">{foot}</div>
    </article>
  );
}

function TargetRing({ pct, done }: { pct: number; done: boolean }) {
  const R = 30, C = 2 * Math.PI * R;
  const [offset, setOffset] = useState(C);
  // animasikan dari kosong ke nilai sebenarnya
  useEffect(() => {
    const id = requestAnimationFrame(() => setOffset(C * (1 - Math.min(100, pct) / 100)));
    return () => cancelAnimationFrame(id);
  }, [pct, C]);
  return (
    <div className={`relative size-[72px] flex-none short:size-[60px] ${done ? 'ring-done' : ''}`} role="img" aria-label={`${Fmt.percent(pct, 0)} dari target bulan ini`}>
      <svg viewBox="0 0 72 72" className="size-full -rotate-90">
        <circle className="ring-track" cx="36" cy="36" r={R} fill="none" strokeWidth="8" />
        <circle className="ring-bar" cx="36" cy="36" r={R} fill="none" strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset} />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[15px] font-extrabold short:text-[13.5px]">{Fmt.number(pct, 0)}%</span>
    </div>
  );
}

export function Kpis({ c, onEditDataset }: { c: Computed; onEditDataset: () => void }) {
  const { ds, prefs } = c;
  const hib = ds.higherIsBetter;
  const all = prefs.range === 'all';
  const avg = c.total / c.days;
  const catCount = new Set(c.period.map(e => e.category)).size;

  let target: ReactNode;
  if (ds.target > 0) {
    const pct = (c.monthTotal / ds.target) * 100;
    const left = c.daysInMonth - c.dayOfMonth;
    const done = hib ? pct >= 100 : pct <= 100 && c.dayOfMonth === c.daysInMonth;
    target = (
      <article className="card flex min-w-0 items-center gap-3.5 px-5 py-[18px] short:px-4 short:py-3.5">
        <TargetRing pct={pct} done={done} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[13px] font-semibold text-muted">{hib ? 'Target' : 'Batas'} {Fmt.date(toISO(startOfToday()), { month: 'long' })}</span>
          <div className="truncate text-xl font-extrabold tracking-[-0.03em]">{fmtVal(c.monthTotal, ds, { compact: true })}</div>
          <div className="text-[12.5px] text-muted">dari {fmtVal(ds.target, ds, { compact: true })} · {left} hari lagi</div>
        </div>
      </article>
    );
  } else {
    target = (
      <Kpi label="Target bulanan" icon="target" tone="lemon" value={<span className="text-lg whitespace-normal">Belum ada target</span>}
        foot={<button className="link-btn px-0!" type="button" onClick={onEditDataset}>Atur target →</button>} />
    );
  }

  return (
    <section className="grid grid-cols-4 gap-4 max-xl:grid-cols-2 max-xs:grid-cols-1 short:gap-3.5" aria-label="Ringkasan">
      <Kpi label="Total" icon="chart" tone="primary" value={fmtVal(c.total, ds, { compact: true })} title={fmtVal(c.total, ds)}
        foot={<><Delta cur={c.total} prev={c.prevTotal} higherIsBetter={hib} all={all} /><span>{all ? 'sepanjang waktu' : 'vs periode sebelumnya'}</span></>} />
      <Kpi label="Rata-rata harian" icon="clock" tone="mint" value={fmtVal(avg, ds, { compact: true })} title={fmtVal(avg, ds)}
        foot={<span>{Fmt.number(c.period.length)} catatan · {catCount} kategori</span>} />
      <Kpi label="Hari terbaik" icon="flame" tone="peach" value={c.best ? fmtVal(c.best.value, ds, { compact: true }) : '—'} title={c.best ? fmtVal(c.best.value, ds) : ''}
        foot={<span>{c.best ? Fmt.date(c.best.date, { weekday: 'long', day: 'numeric', month: 'short' }) : 'Belum ada data'}</span>} />
      {target}
    </section>
  );
}
