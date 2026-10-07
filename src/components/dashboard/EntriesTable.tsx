'use client';

import { Icon } from '@/components/Icon';
import { Fmt } from '@/lib/format';
import type { Dataset, Entry } from '@/lib/types';
import { catColor, fmtVal } from './Charts';

export type SortKey = 'date' | 'category' | 'value';
export type Sort = { key: SortKey; dir: 'asc' | 'desc' };

function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'));
  return <>{parts.map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : p))}</>;
}

/** Saring & urutkan entri untuk tabel (dipakai juga untuk ekspor CSV). */
export function filterRows(period: Entry[], q: string, sort: Sort) {
  const query = q.toLowerCase();
  let rows = period;
  if (query) {
    rows = rows.filter(e =>
      e.category.toLowerCase().includes(query) ||
      (e.note || '').toLowerCase().includes(query) ||
      Fmt.date(e.date).toLowerCase().includes(query));
  }
  const mul = sort.dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = a[sort.key], vb = b[sort.key];
    const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'id');
    return (cmp || a.date.localeCompare(b.date)) * mul;
  });
}

export function EntriesTable({
  ds, rows, q, sort, page, perPage, flashId, filtered,
  onSort, onPage, onPerPage, onEdit, onDelete, onAdd,
}: {
  ds: Dataset; rows: Entry[]; q: string; sort: Sort; page: number; perPage: number; flashId: string | null; filtered: boolean;
  onSort: (key: SortKey) => void; onPage: (page: number) => void; onPerPage: (n: number) => void;
  onEdit: (e: Entry) => void; onDelete: (e: Entry) => void; onAdd: () => void;
}) {
  const pages = Math.max(1, Math.ceil(rows.length / perPage));
  const current = Math.min(page, pages);
  const start = (current - 1) * perPage;
  const pageRows = rows.slice(start, start + perPage);

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center gap-1.5 px-4 py-10 text-center">
        <div className="tone tone-primary mb-2 size-16 rounded-[20px] text-[26px]"><Icon name="chart" /></div>
        <strong>{filtered ? 'Tidak ada yang cocok' : 'Belum ada data di periode ini'}</strong>
        <p className="mb-2.5 max-w-[340px] text-sm text-muted">
          {filtered ? 'Coba kata kunci lain atau hapus filter yang aktif.' : 'Tambahkan catatan baru, atau pilih rentang waktu yang lebih panjang.'}
        </p>
        <button className="btn btn-primary no-print" type="button" onClick={onAdd}><Icon name="plus" /> Tambah data</button>
      </div>
    );
  }

  const th = (key: SortKey, label: string, num = false) => (
    <th className={num ? 'num' : ''} aria-sort={sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button className="th-sort" type="button" data-dir={sort.key === key ? sort.dir : ''} onClick={() => onSort(key)}>{label}</button>
    </th>
  );

  return (
    <>
      <div className="-mx-5 overflow-x-auto px-5 print:overflow-visible short:-mx-4 short:px-4">
        <table className="table">
          <thead>
            <tr>
              {th('date', 'Tanggal')}
              {th('category', 'Kategori')}
              {th('value', 'Nilai', true)}
              <th className="max-md:hidden">Catatan</th>
              <th className="no-print w-[84px]"><span className="sr-only">Aksi</span></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map(e => (
              <tr key={e.id} className={e.id === flashId ? 'flash' : ''}>
                <td className="whitespace-nowrap text-fg-2 tabular-nums short:py-[9px]">
                  <Highlight text={Fmt.date(e.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} q={q} />
                </td>
                <td className="short:py-[9px]">
                  <span className="inline-flex items-center gap-[7px] font-semibold whitespace-nowrap">
                    <i className="size-[9px] rounded-[3px]" style={{ background: catColor(ds, e.category) }} />
                    <Highlight text={e.category} q={q} />
                  </span>
                </td>
                <td className="num font-bold whitespace-nowrap short:py-[9px]">{fmtVal(e.value, ds)}</td>
                <td className="max-w-[260px] truncate text-muted max-md:hidden short:py-[9px]" title={e.note}>
                  {e.note ? <Highlight text={e.note} q={q} /> : <span aria-hidden>—</span>}
                </td>
                <td className="row-actions no-print text-right whitespace-nowrap short:py-[9px]">
                  <button className="icon-btn plain sm" type="button" onClick={() => onEdit(e)} aria-label={`Ubah catatan ${e.category} ${Fmt.date(e.date)}`}><Icon name="edit" /></button>
                  <button className="icon-btn plain sm" type="button" onClick={() => onDelete(e)} aria-label={`Hapus catatan ${e.category} ${Fmt.date(e.date)}`}><Icon name="trash" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="no-print flex flex-wrap items-center justify-between gap-3 pt-3 pb-1 text-[13px] text-muted">
        <span>Menampilkan {start + 1}–{start + pageRows.length} dari {Fmt.number(rows.length)}</span>
        <div className="flex items-center gap-1.5">
          <label>
            <span className="sr-only">Baris per halaman</span>
            <select className="min-h-8 rounded-[9px] border border-line bg-surface px-2 py-1" value={perPage} onChange={e => onPerPage(Number(e.target.value))}>
              {[10, 25, 50].map(n => <option key={n} value={n}>{n} / hal</option>)}
            </select>
          </label>
          <button className="icon-btn sm" type="button" disabled={current <= 1} onClick={() => onPage(current - 1)} aria-label="Halaman sebelumnya"><Icon name="chevron-left" /></button>
          <span>{current} / {pages}</span>
          <button className="icon-btn sm" type="button" disabled={current >= pages} onClick={() => onPage(current + 1)} aria-label="Halaman berikutnya"><Icon name="chevron-right" /></button>
        </div>
      </footer>
    </>
  );
}
