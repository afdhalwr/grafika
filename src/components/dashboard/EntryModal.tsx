'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Modal } from '@/components/Modal';
import { categoriesByFrequency } from '@/lib/analytics';
import { addDays, startOfToday, toISO } from '@/lib/format';
import type { Dataset, Entry } from '@/lib/types';
import { catColor, fmtVal } from './Charts';

export type EntryDraft = Omit<Entry, 'id'>;

/** Tambah / ubah satu catatan. `onSave` mengembalikan true jika berhasil. */
export function EntryModal({
  open, ds, editing, defaultCategory, onClose, onSave,
}: {
  open: boolean; ds: Dataset | null; editing: Entry | null; defaultCategory: string | null;
  onClose: () => void; onSave: (draft: EntryDraft, again: boolean) => void;
}) {
  const [date, setDate] = useState('');
  const [value, setValue] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const refs = { date: useRef<HTMLInputElement>(null), value: useRef<HTMLInputElement>(null), category: useRef<HTMLInputElement>(null) };

  useEffect(() => {
    if (!open) return;
    setDate(editing?.date || toISO(startOfToday()));
    setValue(editing ? String(editing.value) : '');
    setCategory(editing?.category ?? (defaultCategory || ''));
    setNote(editing?.note || '');
    setError('');
    // fokus ke kolom pertama yang masih kosong
    setTimeout(() => (editing || defaultCategory ? refs.value : refs.category).current?.focus(), 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, defaultCategory]);

  if (!ds) return null;
  const cats = categoriesByFrequency(ds);
  const n = Number(value);
  const preview = value !== '' && Number.isFinite(n) ? `= ${fmtVal(n, ds)}` : '';

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const again = (e.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'again';
    const cleanCat = category.trim().replace(/\s+/g, ' ');
    const fail = (msg: string, el: HTMLInputElement | null) => { setError(msg); el?.focus(); };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail('Pilih tanggal yang valid.', refs.date.current);
    if (!cleanCat) return fail('Kategori wajib diisi.', refs.category.current);
    if (value === '' || !Number.isFinite(n) || n < 0) return fail('Nilai harus angka 0 atau lebih.', refs.value.current);

    onSave({ date, category: cleanCat, value: n, note: note.trim() }, again);
    if (again) {
      setValue('');
      setNote('');
      setError('');
      refs.value.current?.focus();
    }
  }

  const quick = 'inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[12.5px] font-semibold text-fg-2 hover:border-primary hover:text-primary';

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Ubah data' : `Tambah data · ${ds.name}`}>
      <form onSubmit={submit} noValidate>
        <div className="modal-body">
          <div className="grid grid-cols-2 gap-3.5 max-sm:grid-cols-1">
            <div className="mb-3.5">
              <label className="label" htmlFor="entryDate">Tanggal</label>
              <input ref={refs.date} className="input" type="date" id="entryDate" value={date} onChange={e => setDate(e.target.value)} required />
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button type="button" className={quick} onClick={() => setDate(toISO(startOfToday()))}>Hari ini</button>
                <button type="button" className={quick} onClick={() => setDate(toISO(addDays(startOfToday(), -1)))}>Kemarin</button>
              </div>
            </div>
            <div className="mb-3.5">
              <label className="label" htmlFor="entryValue">Nilai {ds.unit && <span className="optional">({ds.unit})</span>}</label>
              <input ref={refs.value} className="input" type="number" id="entryValue" min={0} step="any" inputMode="decimal" placeholder="0" value={value} onChange={e => setValue(e.target.value)} required />
              <p className="hint">{preview}</p>
            </div>
          </div>
          <div className="mb-3.5">
            <label className="label" htmlFor="entryCategory">Kategori</label>
            <input ref={refs.category} className="input" id="entryCategory" list="categoryList" maxLength={30} placeholder="mis. Kopi" autoComplete="off" value={category} onChange={e => setCategory(e.target.value)} required />
            <datalist id="categoryList">{cats.map(c => <option key={c} value={c} />)}</datalist>
            {cats.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {cats.slice(0, 6).map(c => (
                  <button key={c} type="button" className={quick} onClick={() => { setCategory(c); refs.value.current?.focus(); }}>
                    <i className="size-2 rounded-[3px]" style={{ background: catColor(ds, c) }} />{c}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="label" htmlFor="entryNote">Catatan <span className="optional">(opsional)</span></label>
            <input className="input" id="entryNote" maxLength={80} placeholder="mis. Promo akhir pekan" value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <p className="field-error" role="alert">{error}</p>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" type="button" onClick={onClose}>Batal</button>
          {!editing && <button className="btn btn-outline" type="submit" value="again">Simpan &amp; tambah lagi</button>}
          <button className="btn btn-primary" type="submit" value="save">Simpan</button>
        </div>
      </form>
    </Modal>
  );
}
