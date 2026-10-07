'use client';

import type { ChartConfiguration } from 'chart.js';
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { ChartCanvas } from '@/components/ChartCanvas';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/components/theme';
import { useToast } from '@/components/Toast';
import { cssVar } from '@/lib/format';

const DEFAULT: [string, number][] = [['Senin', 4], ['Selasa', 7], ['Rabu', 5], ['Kamis', 9]];

export function Playground() {
  const theme = useTheme();
  const toast = useToast();
  const [points, setPoints] = useState(DEFAULT);
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const [error, setError] = useState<{ field: 'label' | 'value'; msg: string } | null>(null);
  const labelRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef<HTMLInputElement>(null);

  const config = useMemo<ChartConfiguration<'bar'>>(() => ({
    type: 'bar',
    data: {
      labels: points.map(p => p[0]),
      datasets: [{
        label: 'Tugas selesai',
        data: points.map(p => p[1]),
        backgroundColor: cssVar('--series-1'),
        hoverBackgroundColor: cssVar('--primary'),
        borderRadius: { topLeft: 4, topRight: 4 },
        borderSkipped: 'bottom',
        maxBarThickness: 44,
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.parsed.y} tugas` } } },
      scales: {
        x: { grid: { display: false }, border: { color: cssVar('--border') } },
        y: { beginAtZero: true, grid: { color: cssVar('--grid') }, border: { display: false }, ticks: { precision: 0 } },
      },
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [points, theme]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = label.trim();
    const n = Number(value);
    if (!text) { setError({ field: 'label', msg: 'Isi labelnya dulu, ya.' }); labelRef.current?.focus(); return; }
    if (value === '' || !Number.isFinite(n) || n < 0 || n > 999) {
      setError({ field: 'value', msg: 'Nilai harus angka 0–999.' }); valueRef.current?.focus(); return;
    }
    setError(null);
    setPoints(p => [...p.slice(p.length >= 10 ? 1 : 0), [text, n]]);
    setLabel('');
    setValue('');
    labelRef.current?.focus();
    toast(`"${text}" ditambahkan ke grafik.`);
  }

  return (
    <div className="wrap reveal grid grid-cols-[1fr_1.1fr] items-center gap-12 max-lg:grid-cols-1 max-lg:gap-8">
      <div>
        <span className="mb-3 inline-block text-[13px] font-bold tracking-[0.1em] text-primary uppercase">Coba langsung</span>
        <h2 className="text-[clamp(28px,3.6vw,40px)] font-extrabold">Rasakan seberapa cepatnya</h2>
        <p className="mt-3.5 mb-6 text-fg-2">
          Tambahkan angka di bawah dan lihat grafiknya berubah. Ini hanya contoh — di dasbor, datamu tersimpan dan bisa diolah lebih jauh.
        </p>
        <form className="grid grid-cols-[1.3fr_1fr_auto] items-end gap-3 max-sm:grid-cols-2" onSubmit={submit} noValidate>
          <div>
            <label className="label" htmlFor="pgLabel">Label</label>
            <input ref={labelRef} className="input" id="pgLabel" maxLength={14} placeholder="mis. Jumat" value={label}
              onChange={e => setLabel(e.target.value)} aria-invalid={error?.field === 'label' || undefined} />
          </div>
          <div>
            <label className="label" htmlFor="pgValue">Nilai</label>
            <input ref={valueRef} className="input" id="pgValue" type="number" min={0} max={999} placeholder="0–999" value={value}
              onChange={e => setValue(e.target.value)} aria-invalid={error?.field === 'value' || undefined} />
          </div>
          <button className="btn btn-primary max-sm:col-span-2" type="submit"><Icon name="plus" /> Tambah</button>
        </form>
        <p className="field-error" role="alert">{error?.msg}</p>
        <button className="btn btn-ghost btn-sm mt-2 -ml-3" type="button" onClick={() => { setPoints(DEFAULT); setError(null); }}>
          Atur ulang contoh
        </button>
      </div>
      <div className="card p-6 shadow-float!">
        <p className="mb-3 font-bold">Tugas selesai per hari</p>
        <div className="h-[280px]">
          <ChartCanvas config={config} label="Grafik batang contoh" />
        </div>
      </div>
    </div>
  );
}
