'use client';

import { useEffect, useRef } from 'react';
import { Brand } from '@/components/Brand';
import { Icon, type IconName } from '@/components/Icon';
import { Fmt, firstName } from '@/lib/format';
import type { Dataset } from '@/lib/types';
import { seriesColor } from './Charts';

export type Tool = 'import' | 'export' | 'backup' | 'restore' | 'print' | 'shortcuts';

const TOOLS: [Tool, IconName, string][] = [
  ['import', 'upload', 'Impor CSV'],
  ['export', 'download', 'Ekspor CSV'],
  ['backup', 'database', 'Cadangkan (JSON)'],
  ['restore', 'file', 'Pulihkan cadangan'],
  ['print', 'printer', 'Cetak laporan'],
  ['shortcuts', 'keyboard', 'Pintasan keyboard'],
];

export function Sidebar({
  open, onClose, datasets, activeId, onSwitch, onNewDataset, onTool, userName, userEmail, onLogout,
}: {
  open: boolean; onClose: () => void;
  datasets: Dataset[]; activeId: string | null; onSwitch: (id: string) => void; onNewDataset: () => void;
  onTool: (t: Tool) => void; userName: string; userEmail: string; onLogout: () => void;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (open) ref.current?.querySelector<HTMLElement>('button, a')?.focus();
  }, [open]);

  const sbTitle = 'flex items-center justify-between px-2 pb-2 text-[11.5px] font-bold tracking-[0.08em] text-muted uppercase short:pb-1';
  const item = 'flex w-full items-center gap-2.5 rounded-xl px-2.5 text-left font-semibold text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg';

  return (
    <>
      <aside
        ref={ref}
        id="sidebar"
        aria-label="Menu samping"
        className={`no-print sticky top-0 flex h-dvh flex-col gap-[26px] overflow-y-auto border-r border-line bg-surface px-4 pt-[22px] pb-4 short:gap-4 short:px-3 short:pt-4 short:pb-3
          max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-60 max-lg:w-[min(300px,86vw)] max-lg:shadow-deep max-lg:transition-transform max-lg:duration-300 ${open ? '' : 'max-lg:-translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-1.5">
          <Brand />
          <button className="icon-btn plain lg:hidden" type="button" onClick={onClose} aria-label="Tutup menu"><Icon name="x" /></button>
        </div>

        <div>
          <div className={sbTitle}>
            <span>Dataset</span>
            <button className="icon-btn plain sm" type="button" onClick={onNewDataset} aria-label="Buat dataset baru" title="Buat dataset baru"><Icon name="plus" /></button>
          </div>
          <ul className="grid gap-0.5">
            {datasets.length ? datasets.map((ds, i) => (
              <li key={ds.id}>
                <button
                  type="button"
                  className={`group ${item} py-2.5 text-[14.5px] short:py-[7px] short:text-sm ${ds.id === activeId ? 'bg-primary-soft! text-fg!' : ''}`}
                  aria-current={ds.id === activeId}
                  onClick={() => onSwitch(ds.id)}
                >
                  <span className="size-2.5 flex-none rounded" style={{ background: seriesColor(ds.color) }} />
                  <span className="min-w-0 flex-1 truncate">{ds.name}</span>
                  {i < 9 && <span className="text-[11px] text-muted opacity-0 transition-opacity group-hover:opacity-100" aria-hidden>{i + 1}</span>}
                  <span className="text-xs font-semibold text-muted">{Fmt.compact(ds.entries.length)}</span>
                </button>
              </li>
            )) : <li className="px-2.5 py-1.5 text-[13.5px] text-muted">Belum ada dataset.</li>}
          </ul>
        </div>

        <div>
          <div className={sbTitle}><span>Alat</span></div>
          <ul className="grid gap-0.5">
            {TOOLS.map(([tool, icon, label]) => (
              <li key={tool}>
                <button type="button" className={`${item} py-[9px] text-sm short:py-1.5 short:text-[13.5px]`} onClick={() => onTool(tool)}>
                  <Icon name={icon} /> {label}
                  {tool === 'shortcuts' && <kbd className="ml-auto">?</kbd>}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto flex items-center gap-2.5 rounded-2xl bg-surface-2 p-2.5 short:p-2">
          <span className="grid size-[38px] flex-none place-items-center rounded-xl bg-[linear-gradient(135deg,#6d6dfb,#ef8fb3)] font-extrabold text-white short:size-[34px]">
            {firstName(userName).charAt(0).toUpperCase()}
          </span>
          <div className="flex min-w-0 flex-1 flex-col leading-[1.3]">
            <strong className="truncate text-sm">{userName}</strong>
            <span className="truncate text-xs text-muted">{userEmail}</span>
          </div>
          <button className="icon-btn plain sm" type="button" onClick={onLogout} aria-label="Keluar" title="Keluar"><Icon name="logout" /></button>
        </div>
      </aside>
      {open && <div className="no-print fixed inset-0 z-59 bg-[rgba(13,16,32,.45)] backdrop-blur-[2px] lg:hidden" onClick={onClose} />}
    </>
  );
}
