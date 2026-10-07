'use client';

import type { Chart, ChartConfiguration, ChartType, Plugin, ScriptableContext } from 'chart.js';
import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { ChartCanvas } from '@/components/ChartCanvas';
import { Icon } from '@/components/Icon';
import { bucketLabel, buildBuckets, MON_FIRST, rangeText, WEEKDAY_FULL, WEEKDAY_SHORT, type Computed } from '@/lib/analytics';
import { cssVar, Fmt, round2, withAlpha } from '@/lib/format';
import type { Dataset } from '@/lib/types';
import type { Theme } from '@/components/theme';

declare module 'chart.js' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface PluginOptionsByType<TType extends ChartType> {
    centerText?: { text: string; sub?: string };
  }
}

const MAX_SLICES = 8;

export const seriesColor = (slot: number) => cssVar(`--series-${(slot % 8) + 1}`);
export const catColor = (ds: Dataset, cat: string) => seriesColor(ds.catColors[cat] ?? 0);
export const fmtVal = (v: number, ds: Dataset, opts?: { compact?: boolean }) => Fmt.value(round2(v), ds.unit, opts);

/* ---------- plugin Chart.js ---------- */

const crosshair: Plugin = {
  id: 'crosshair',
  afterDatasetsDraw(chart) {
    const active = chart.tooltip?.getActiveElements?.() || [];
    if (!active.length) return;
    const x = active[0].element.x;
    const { top, bottom } = chart.chartArea;
    const { ctx } = chart;
    ctx.save();
    ctx.strokeStyle = cssVar('--muted');
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
    ctx.restore();
  },
};

// Latar sewarna kartu supaya PNG unduhan tidak transparan.
const canvasBg: Plugin = {
  id: 'canvasBg',
  beforeDraw(chart) {
    const { ctx, width, height } = chart;
    ctx.save();
    ctx.fillStyle = cssVar('--surface');
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  },
};

const centerText: Plugin<'doughnut'> = {
  id: 'centerText',
  afterDraw(chart, _args, opts: { text?: string; sub?: string }) {
    const arc = chart.getDatasetMeta(0).data[0] as unknown as { x: number; y: number; innerRadius: number } | undefined;
    if (!arc || !opts?.text) return;
    const { ctx } = chart;
    const font = cssVar('--font');
    const maxW = arc.innerRadius * 1.6;
    let size = 18; // kecilkan teks sampai muat di lubang donat
    ctx.save();
    ctx.font = `800 ${size}px ${font}`;
    while (size > 10 && ctx.measureText(opts.text).width > maxW) ctx.font = `800 ${--size}px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = cssVar('--text');
    ctx.fillText(opts.text, arc.x, arc.y - size * 0.45);
    ctx.fillStyle = cssVar('--muted');
    ctx.font = `600 11.5px ${font}`;
    ctx.fillText(opts.sub || '', arc.x, arc.y + size * 0.65, maxW);
    ctx.restore();
  },
};

function axes(ds: Dataset) {
  return {
    x: { grid: { display: false }, border: { color: cssVar('--border') }, ticks: { maxRotation: 0, autoSkipPadding: 14 } },
    y: {
      beginAtZero: true,
      grid: { color: cssVar('--grid') },
      border: { display: false },
      ticks: { maxTicksLimit: 5, callback: (v: string | number) => (ds.unit === 'Rp' ? `Rp ${Fmt.compact(Number(v))}` : Fmt.compact(Number(v))) },
    },
  };
}

/* ---------- kerangka kartu ---------- */

export function ChartCard({ title, sub, tools, className = '', children }: {
  title: ReactNode; sub?: ReactNode; tools?: ReactNode; className?: string; children: ReactNode;
}) {
  return (
    <article className={`card flex min-w-0 flex-col px-5 pt-[18px] pb-5 short:px-4 short:pt-3.5 short:pb-4 ${className}`}>
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3 short:mb-2">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold">{title}</h3>
          {sub && <p className="mt-0.5 text-[12.5px] text-muted">{sub}</p>}
        </div>
        {tools && <div className="no-print flex flex-wrap items-center gap-2 max-xs:w-full">{tools}</div>}
      </header>
      {children}
    </article>
  );
}

export function DownloadButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button className="icon-btn sm" type="button" onClick={onClick} aria-label={label} title="Unduh PNG">
      <Icon name="image" />
    </button>
  );
}

/* ---------- tren ---------- */

export function TrendChart({ c, theme, chartRef }: { c: Computed; theme: Theme; chartRef: MutableRefObject<Chart | null> }) {
  const { ds, prefs } = c;
  const showPrev = prefs.compare && prefs.range !== 'all';

  const { config, color, muted } = useMemo(() => {
    const color = seriesColor(ds.color);
    const muted = cssVar('--muted');
    const cur = buildBuckets(c.bounds, c.period, prefs.gran);
    const prv = showPrev ? buildBuckets(c.prev, c.prevEntries, prefs.gran) : [];
    const few = cur.length <= 16;

    const datasets: ChartConfiguration<'line'>['data']['datasets'] = [{
      label: 'Periode ini',
      data: cur.map(b => b.value),
      borderColor: color,
      backgroundColor: (ctx: ScriptableContext<'line'>) => {
        const { chartArea, ctx: g } = ctx.chart;
        if (!chartArea) return withAlpha(color, 0.12);
        const grad = g.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        grad.addColorStop(0, withAlpha(color, 0.26));
        grad.addColorStop(1, withAlpha(color, 0));
        return grad;
      },
      fill: true, tension: 0.35, borderWidth: 2,
      pointRadius: few ? 4 : 0, pointHoverRadius: 6,
      pointBackgroundColor: color, pointBorderColor: cssVar('--surface'), pointBorderWidth: 2,
    }];
    if (showPrev) {
      datasets.push({
        label: 'Periode sebelumnya',
        data: cur.map((_, i) => prv[i]?.value ?? null),
        borderColor: muted, borderDash: [5, 4], borderWidth: 2,
        fill: false, tension: 0.35, pointRadius: 0, pointHoverRadius: 4,
        pointBackgroundColor: muted, pointBorderColor: cssVar('--surface'), pointBorderWidth: 2,
      });
    }

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: { labels: cur.map(b => bucketLabel(b.key, prefs.gran)), datasets },
      options: {
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            filter: item => item.parsed.y != null,
            callbacks: {
              label: ctx => {
                if (ctx.datasetIndex === 1) {
                  const b = prv[ctx.dataIndex];
                  return ` Sebelumnya (${bucketLabel(b.key, prefs.gran)}): ${fmtVal(ctx.parsed.y ?? 0, ds)}`;
                }
                return ` ${fmtVal(ctx.parsed.y ?? 0, ds)}`;
              },
            },
          },
        },
        scales: axes(ds),
      },
      plugins: [canvasBg, crosshair],
    };
    return { config, color, muted };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c, theme, showPrev]);

  return (
    <>
      <div className="-mt-1 mb-2.5 flex flex-wrap gap-4 text-[12.5px] font-semibold text-fg-2">
        <span className="inline-flex items-center gap-1.5"><i className="h-0 w-4 rounded-sm border-t-2" style={{ borderColor: color }} />Periode ini</span>
        {showPrev && <span className="inline-flex items-center gap-1.5"><i className="h-0 w-4 rounded-sm border-t-2 border-dashed" style={{ borderColor: muted }} />Periode sebelumnya</span>}
      </div>
      <div className="relative h-[290px] flex-1 max-xs:h-[240px] short:h-[clamp(200px,calc(100vh-470px),290px)]">
        <ChartCanvas config={config as ChartConfiguration} label="Grafik garis tren nilai" chartRef={chartRef} />
      </div>
    </>
  );
}

export function trendSubtitle(c: Computed) {
  const grans = { day: 'per hari', week: 'per minggu', month: 'per bulan' };
  return `${rangeText(c)} · ${grans[c.prefs.gran]}${c.category ? ` · ${c.category}` : ''}`;
}

/* ---------- komposisi kategori ---------- */

export function CategoryChart({ c, theme, chartRef, onToggle }: {
  c: Computed; theme: Theme; chartRef: MutableRefObject<Chart | null>; onToggle: (cat: string) => void;
}) {
  const { ds, category } = c;

  const { config, slices, total, colorOf } = useMemo(() => {
    let slices: { category: string; value: number; other?: boolean; members?: string[] }[] = c.cats;
    if (slices.length > MAX_SLICES) {
      const head = slices.slice(0, MAX_SLICES - 1);
      const rest = slices.slice(MAX_SLICES - 1);
      slices = [...head, { category: 'Lainnya', value: rest.reduce((a, b) => a + b.value, 0), other: true, members: rest.map(r => r.category) }];
    }
    const total = slices.reduce((a, b) => a + b.value, 0);
    const colorOf = (s: (typeof slices)[number]) => (s.other ? cssVar('--muted') : catColor(ds, s.category));
    const isOn = (s: (typeof slices)[number]) => !category || category === s.category || !!s.members?.includes(category);
    const selected = category ? c.cats.find(x => x.category === category) : null;

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: slices.map(x => x.category),
        datasets: [{
          data: slices.map(x => round2(x.value)),
          backgroundColor: slices.map(x => (isOn(x) ? colorOf(x) : withAlpha(colorOf(x), 0.22))),
          hoverBackgroundColor: slices.map(colorOf),
          borderColor: cssVar('--surface'),
          borderWidth: 2,
          hoverOffset: 6,
        }],
      },
      options: {
        maintainAspectRatio: false,
        cutout: '70%',
        layout: { padding: 6 },
        onClick: (_e, els) => {
          const s = slices[els[0]?.index];
          if (s && !s.other) onToggle(s.category);
        },
        onHover: (e, els) => {
          const target = e.native?.target as HTMLElement | undefined;
          if (target) target.style.cursor = els.length && !slices[els[0].index].other ? 'pointer' : 'default';
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${fmtVal(ctx.parsed, ds)} (${Fmt.percent(total ? (ctx.parsed / total) * 100 : 0)})` } },
          centerText: selected
            ? { text: Fmt.percent(total ? (selected.value / total) * 100 : 0), sub: selected.category }
            : { text: fmtVal(total, ds, { compact: true }), sub: 'total' },
        },
      },
      plugins: [canvasBg as Plugin<'doughnut'>, centerText],
    };
    return { config, slices, total, colorOf };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c, theme]);

  return (
    <div className="flex flex-col gap-3.5">
      <div className="relative h-[190px] short:h-[clamp(140px,22vh,190px)]">
        <ChartCanvas config={config as unknown as ChartConfiguration} label="Grafik donat komposisi kategori" chartRef={chartRef} />
      </div>
      <ul className="grid gap-0.5">
        {slices.length ? slices.map(s => {
          const pressed = category === s.category;
          return (
            <li key={s.category}>
              <button
                type="button"
                disabled={s.other}
                title={s.other ? 'Gabungan kategori kecil' : undefined}
                aria-pressed={pressed}
                onClick={() => !s.other && onToggle(s.category)}
                className={`grid w-full grid-cols-[10px_1fr_auto_auto] items-center gap-2.5 rounded-[10px] px-2 py-[7px] text-left text-[13.5px] text-fg-2 transition hover:bg-surface-2 disabled:cursor-default short:py-[5px] ${
                  pressed ? 'bg-primary-soft text-fg' : category ? 'opacity-55' : ''
                }`}
              >
                <span className="size-2.5 rounded-[3px]" style={{ background: colorOf(s) }} />
                <span className="truncate font-semibold">{s.category}</span>
                <span className="font-semibold text-fg tabular-nums">{fmtVal(s.value, ds, { compact: true })}</span>
                <span className="min-w-11 text-right text-xs text-muted tabular-nums">{Fmt.percent(total ? (s.value / total) * 100 : 0)}</span>
              </button>
            </li>
          );
        }) : <li className="text-[12.5px] text-muted">Tidak ada data pada periode ini.</li>}
      </ul>
    </div>
  );
}

/* ---------- rata-rata per hari ---------- */

export function weekdayStats(c: Computed) {
  const values = MON_FIRST.map(i => round2(c.weekday[i]));
  const max = Math.max(...values);
  const maxIdx = max > 0 ? values.indexOf(max) : -1;
  return { values, maxIdx, sub: maxIdx >= 0 ? `Paling tinggi: ${WEEKDAY_FULL[MON_FIRST[maxIdx]]}` : 'Pola mingguan' };
}

export function WeekdayChart({ c, theme, chartRef }: { c: Computed; theme: Theme; chartRef: MutableRefObject<Chart | null> }) {
  const { ds } = c;
  const config = useMemo<ChartConfiguration<'bar'>>(() => {
    const color = seriesColor(ds.color);
    const { values, maxIdx } = weekdayStats(c);
    const scales = axes(ds);
    return {
      type: 'bar',
      data: {
        labels: MON_FIRST.map(i => WEEKDAY_SHORT[i]),
        datasets: [{
          label: 'Rata-rata',
          data: values,
          backgroundColor: values.map((_, i) => (i === maxIdx ? color : withAlpha(color, 0.45))),
          hoverBackgroundColor: color,
          borderRadius: { topLeft: 4, topRight: 4 },
          borderSkipped: 'bottom',
          maxBarThickness: 36,
        }],
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: items => WEEKDAY_FULL[MON_FIRST[items[0].dataIndex]],
              label: ctx => ` Rata-rata ${fmtVal(ctx.parsed.y ?? 0, ds)}`,
            },
          },
        },
        scales: { ...scales, x: { ...scales.x, ticks: { ...scales.x.ticks, autoSkip: false } } },
      },
      plugins: [canvasBg as Plugin<'bar'>],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c, theme]);

  return (
    <div className="relative h-[240px] short:h-[clamp(180px,30vh,240px)]">
      <ChartCanvas config={config as unknown as ChartConfiguration} label="Grafik batang rata-rata nilai per hari dalam seminggu" chartRef={chartRef} />
    </div>
  );
}
