'use client';

import type { Chart, ChartConfiguration, ScriptableContext } from 'chart.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChartCanvas } from '@/components/ChartCanvas';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/components/theme';
import { addDays, cssVar, Fmt, toISO, withAlpha } from '@/lib/format';

function makeSeries() {
  let seed = 11;
  const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const labels = Array.from({ length: 30 }, (_, i) => Fmt.date(toISO(addDays(new Date(), i - 29)), { day: 'numeric', month: 'short' }));
  const values = labels.map((_, i) => Math.round(950_000 + i * 16_000 + Math.sin(i / 2.2) * 180_000 + rand() * 160_000));
  return { labels, values, rand };
}

const total = (values: number[]) => values.reduce((a, b) => a + b, 0);

/** Grafik "hidup" di hero: satu titik baru bergeser masuk setiap beberapa detik. */
export function HeroChart() {
  const theme = useTheme();
  const chartRef = useRef<Chart | null>(null);
  const series = useRef(makeSeries());
  const [sum, setSum] = useState(() => total(series.current.values));

  const config = useMemo<ChartConfiguration<'line'>>(() => {
    const primary = cssVar('--primary') || '#5b5bf7';
    return {
      type: 'line',
      data: {
        labels: series.current.labels,
        datasets: [{
          label: 'Penjualan',
          data: series.current.values,
          borderColor: primary,
          backgroundColor: (ctx: ScriptableContext<'line'>) => {
            const { chartArea, ctx: c } = ctx.chart;
            if (!chartArea) return withAlpha(primary, 0.15);
            const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            g.addColorStop(0, withAlpha(primary, 0.28));
            g.addColorStop(1, withAlpha(primary, 0));
            return g;
          },
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBorderWidth: 2,
          pointHoverBorderColor: cssVar('--surface'),
          pointHoverBackgroundColor: primary,
        }],
      },
      options: {
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => ` ${Fmt.value(c.parsed.y ?? 0, 'Rp')}` } },
        },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { maxTicksLimit: 5, maxRotation: 0 } },
          y: { grid: { color: cssVar('--grid') }, border: { display: false }, ticks: { maxTicksLimit: 4, callback: v => Fmt.compact(Number(v)) } },
        },
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => {
      const chart = chartRef.current;
      if (document.hidden || !chart) return;
      const { labels, values, rand } = series.current;
      const last = values[values.length - 1];
      values.push(Math.max(700_000, Math.round(last + (rand() - 0.45) * 220_000)));
      values.shift();
      labels.push(labels.shift()!);
      chart.update();
      setSum(total(values));
    }, 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] font-semibold text-muted">Penjualan Kafe · 30 hari</p>
          <p className="mt-0.5 text-[30px] font-extrabold tracking-[-0.03em] short:text-[26px]">{Fmt.value(sum, 'Rp', { compact: true })}</p>
        </div>
        <span className="chip badge-up"><Icon name="trending-up" /> 18,4%</span>
      </div>
      <div className="mt-3.5 h-[230px] max-sm:h-[190px] short:h-[clamp(170px,27vh,230px)]">
        <ChartCanvas config={config} label="Contoh grafik penjualan 30 hari" chartRef={chartRef} />
      </div>
    </>
  );
}
