'use client';

import { Chart, registerables, type ChartConfiguration } from 'chart.js';
import { useEffect, useRef, type MutableRefObject } from 'react';
import { cssVar } from '@/lib/format';

Chart.register(...registerables);

/** Samakan gaya default Chart.js dengan token tema aktif. */
export function applyChartTheme() {
  const d = Chart.defaults;
  d.font.family = cssVar('--font') || 'system-ui';
  d.font.size = 12;
  d.color = cssVar('--muted');
  d.borderColor = cssVar('--grid');
  if (d.animation) d.animation.duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 700;
  Object.assign(d.plugins.tooltip, {
    backgroundColor: cssVar('--text'),
    titleColor: cssVar('--bg'),
    bodyColor: cssVar('--bg'),
    padding: 12,
    cornerRadius: 10,
    boxPadding: 5,
    usePointStyle: true,
    titleFont: { weight: 700 },
  });
  d.plugins.legend.labels.usePointStyle = true;
}

/**
 * Kanvas Chart.js. Grafik dibuat sekali, lalu data & opsinya diperbarui setiap `config` berubah
 * (jadi transisinya halus, bukan digambar ulang dari nol). Bungkus `config` dengan useMemo.
 */
export function ChartCanvas({
  config,
  label,
  chartRef,
}: {
  config: ChartConfiguration;
  label: string;
  chartRef?: MutableRefObject<Chart | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const instance = useRef<Chart | null>(null);
  const latest = useRef(config);
  latest.current = config;

  useEffect(() => {
    if (!canvasRef.current) return;
    applyChartTheme();
    const chart = new Chart(canvasRef.current, latest.current);
    instance.current = chart;
    if (chartRef) chartRef.current = chart;
    return () => {
      chart.destroy();
      instance.current = null;
      if (chartRef) chartRef.current = null;
    };
  }, [chartRef]);

  useEffect(() => {
    const chart = instance.current;
    if (!chart || chart.config.data === config.data) return;
    applyChartTheme();
    chart.data = config.data;
    if (config.options) chart.options = config.options;
    chart.update();
  }, [config]);

  return <canvas ref={canvasRef} role="img" aria-label={label} />;
}
