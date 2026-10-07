'use client';

import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/Icon';
import { streakOf, WEEKDAY_FULL, type Computed } from '@/lib/analytics';
import { Fmt } from '@/lib/format';
import { fmtVal } from './Charts';

type Insight = { icon: IconName; tone: string; body: ReactNode };

/** Temuan otomatis dari data periode aktif (maksimal 5). */
function readInsights(c: Computed): Insight[] {
  const { ds } = c;
  const hib = ds.higherIsBetter;
  const items: Insight[] = [];
  const add = (icon: IconName, tone: string, body: ReactNode) => items.push({ icon, tone, body });

  if (c.prefs.range !== 'all' && c.prevTotal > 0) {
    const pct = ((c.total - c.prevTotal) / c.prevTotal) * 100;
    const up = pct >= 0;
    add(up ? 'trending-up' : 'trending-down', up === hib ? 'mint' : 'bad',
      <>Total <strong>{up ? 'naik' : 'turun'} {Fmt.percent(Math.abs(pct))}</strong> dibanding {c.days} hari sebelumnya.</>);
  }

  if (!c.category && c.cats.length > 1) {
    const top = c.cats[0];
    const totalAll = c.cats.reduce((a, b) => a + b.value, 0);
    add('pie', 'primary', <><strong>{top.category}</strong> menyumbang <strong>{Fmt.percent((top.value / totalAll) * 100)}</strong> dari total — kategori terbesar periode ini.</>);
  }

  const avgDay = c.total / c.days;
  const maxWd = Math.max(...c.weekday);
  if (maxWd > 0 && c.days >= 7) {
    const wd = c.weekday.indexOf(maxWd);
    const above = avgDay ? (maxWd / avgDay - 1) * 100 : 0;
    add('calendar', 'lemon', <>Hari <strong>{WEEKDAY_FULL[wd]}</strong> paling tinggi dengan rata-rata {fmtVal(maxWd, ds, { compact: true })}{above >= 1 ? `, ${Fmt.percent(above, 0)} di atas rata-rata harian` : ''}.</>);
  }

  if (c.best) {
    add('flame', 'peach', <>Rekor periode ini: <strong>{fmtVal(c.best.value, ds)}</strong> pada {Fmt.date(c.best.date, { weekday: 'long', day: 'numeric', month: 'long' })}.</>);
  }

  if (ds.target > 0) {
    const projected = (c.monthTotal / c.dayOfMonth) * c.daysInMonth;
    const remaining = Math.max(1, c.daysInMonth - c.dayOfMonth);
    if (hib) {
      if (c.monthTotal >= ds.target) add('target', 'mint', <>Target bulan ini <strong>sudah tercapai</strong>. Hebat! 🎉</>);
      else if (projected >= ds.target) add('target', 'mint', <>Dengan laju sekarang, target bulan ini <strong>diperkirakan tercapai</strong> (proyeksi {fmtVal(projected, ds, { compact: true })}).</>);
      else add('target', 'lemon', <>Butuh sekitar <strong>{fmtVal((ds.target - c.monthTotal) / remaining, ds, { compact: true })} per hari</strong> untuk mencapai target bulan ini.</>);
    } else if (projected > ds.target) {
      add('target', 'bad', <>Dengan laju sekarang, bulan ini <strong>diperkirakan melewati batas</strong> (proyeksi {fmtVal(projected, ds, { compact: true })}).</>);
    } else {
      add('target', 'mint', <>Masih aman: proyeksi bulan ini {fmtVal(projected, ds, { compact: true })}, <strong>di bawah batas</strong>.</>);
    }
  }

  const streak = streakOf(ds);
  if (streak >= 2) add('zap', 'pink', <>Kamu mencatat data <strong>{streak} hari berturut-turut</strong>. Pertahankan!</>);

  return items.slice(0, 5);
}

export function Insights({ c }: { c: Computed }) {
  const items: Insight[] = c.period.length
    ? readInsights(c)
    : [{ icon: 'info', tone: 'primary', body: 'Belum ada data pada periode ini. Coba pilih rentang yang lebih panjang atau tambahkan catatan baru.' }];

  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] content-start gap-2.5">
      {items.map((it, i) => (
        <li key={i} className="anim-in flex items-start gap-3 rounded-[14px] bg-surface-2 p-3 text-[13.5px] text-fg-2 [&_strong]:text-fg" style={{ animationDelay: `${i * 0.05}s` }}>
          <span className={`tone tone-${it.tone} size-[30px] rounded-[9px]`}><Icon name={it.icon} /></span>
          <p>{it.body}</p>
        </li>
      ))}
    </ul>
  );
}
