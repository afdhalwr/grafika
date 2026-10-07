'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { SERIES_COUNT } from '@/lib/seed';
import type { Dataset } from '@/lib/types';

export type DatasetFields = Pick<Dataset, 'name' | 'unit' | 'target' | 'color' | 'higherIsBetter'>;

export function DatasetModal({
  open, editing, nextColor, onClose, onSave, onDelete,
}: {
  open: boolean; editing: Dataset | null; nextColor: number;
  onClose: () => void; onSave: (fields: DatasetFields) => void; onDelete: (ds: Dataset) => void;
}) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [target, setTarget] = useState('');
  const [color, setColor] = useState(0);
  const [hib, setHib] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(editing?.name || '');
    setUnit(editing?.unit || '');
    setTarget(editing?.target ? String(editing.target) : '');
    setColor(editing ? editing.color : nextColor);
    setHib(editing ? editing.higherIsBetter : true);
    setError('');
  }, [open, editing, nextColor]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const t = Number(target) || 0;
    if (!name.trim()) { setError('Nama dataset wajib diisi.'); document.getElementById('dsNameInput')?.focus(); return; }
    if (t < 0) { setError('Target tidak boleh negatif.'); document.getElementById('dsTargetInput')?.focus(); return; }
    onSave({ name: name.trim(), unit: unit.trim(), target: t, color, higherIsBetter: hib });
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Ubah dataset' : 'Dataset baru'}>
      <form onSubmit={submit} noValidate>
        <div className="modal-body">
          <div className="mb-3.5">
            <label className="label" htmlFor="dsNameInput">Nama dataset</label>
            <input className="input" id="dsNameInput" maxLength={32} placeholder="mis. Pengeluaran Bulanan" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3.5 max-sm:grid-cols-1">
            <div className="mb-3.5">
              <label className="label" htmlFor="dsUnitInput">Satuan</label>
              <input className="input" id="dsUnitInput" list="unitList" maxLength={10} placeholder="Rp, orang, jam…" value={unit} onChange={e => setUnit(e.target.value)} />
              <datalist id="unitList">{['Rp', 'orang', 'jam', 'kg', 'km', 'buah', 'poin'].map(u => <option key={u} value={u} />)}</datalist>
            </div>
            <div className="mb-3.5">
              <label className="label" htmlFor="dsTargetInput">Target bulanan <span className="optional">(opsional)</span></label>
              <input className="input" type="number" id="dsTargetInput" min={0} step="any" placeholder="0" value={target} onChange={e => setTarget(e.target.value)} />
            </div>
          </div>
          <fieldset className="mb-3.5">
            <legend className="label">Warna</legend>
            <div className="flex flex-wrap gap-2.5">
              {Array.from({ length: SERIES_COUNT }, (_, i) => (
                <label key={i} className="relative cursor-pointer" title={`Warna ${i + 1}`}>
                  <input type="radio" name="dsColor" className="peer absolute opacity-0" checked={color === i} onChange={() => setColor(i)} />
                  <span
                    className="grid size-8 place-items-center rounded-[10px] text-white transition peer-checked:shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--c)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-primary"
                    style={{ background: `var(--series-${i + 1})`, ['--c' as string]: `var(--series-${i + 1})` }}
                  >
                    {color === i && <Icon name="check" size={16} />}
                  </span>
                  <span className="sr-only">Warna {i + 1}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="check items-start!">
            <input type="checkbox" checked={hib} onChange={e => setHib(e.target.checked)} />
            <span className="check-box mt-px"><Icon name="check" /></span>
            <span>
              Angka naik berarti kabar baik
              <span className="mt-0.5 block text-[12.5px] text-muted">Matikan untuk data seperti pengeluaran, supaya kenaikan ditandai merah.</span>
            </span>
          </label>
          <p className="field-error" role="alert">{error}</p>
        </div>
        <div className="modal-foot">
          {editing && (
            <button className="btn btn-ghost btn-danger-text" type="button" onClick={() => onDelete(editing)}><Icon name="trash" /> Hapus</button>
          )}
          <span className="flex-1" />
          <button className="btn btn-ghost" type="button" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" type="submit">Simpan</button>
        </div>
      </form>
    </Modal>
  );
}
