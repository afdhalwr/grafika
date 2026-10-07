/* Impor/ekspor CSV — mendukung pemisah `;` dan format angka Indonesia (1.250.000). */

import { toISO } from './format';
import type { Entry } from './types';

export function parseCSV(text: string) {
  text = text.replace(/^﻿/, '');
  const firstLine = text.split(/\r?\n/, 1)[0];
  const delim = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(cell => cell.trim()));
}

export function parseDateLoose(s: string) {
  s = s.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return toISO(new Date(+m[1], +m[2] - 1, +m[3]));
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/); // dd/mm/yyyy
  if (m) return toISO(new Date(+m[3], +m[2] - 1, +m[1]));
  return null;
}

export function parseNumberLoose(raw: string) {
  let s = String(raw).replace(/rp|\s/gi, '');
  if (!s) return NaN;
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  return Number(s);
}

/** Baris CSV -> entri. Kolom dikenali dari judul; tanpa judul dianggap tanggal, kategori, nilai, catatan. */
export function rowsToEntries(rows: string[][], makeId: () => string) {
  const header = rows[0].map(h => h.trim().toLowerCase());
  const find = (names: string[]) => header.findIndex(h => names.includes(h));
  let col = {
    date: find(['tanggal', 'date', 'tgl']),
    cat: find(['kategori', 'category']),
    val: find(['nilai', 'value', 'jumlah', 'amount']),
    note: find(['catatan', 'note', 'keterangan']),
  };
  const hasHeader = col.date >= 0 && col.val >= 0;
  if (!hasHeader) col = { date: 0, cat: 1, val: 2, note: 3 };
  const body = hasHeader ? rows.slice(1) : rows;

  const entries: Entry[] = [];
  let skipped = 0;
  body.forEach(r => {
    const date = parseDateLoose(r[col.date] || '');
    const value = parseNumberLoose(r[col.val] ?? '');
    const category = ((col.cat >= 0 ? r[col.cat] : '') || '').trim() || 'Umum';
    if (!date || !Number.isFinite(value) || value < 0) { skipped++; return; }
    const note = (col.note >= 0 ? r[col.note] || '' : '').trim().slice(0, 80);
    entries.push({ id: makeId(), date, category: category.slice(0, 30), value, note });
  });
  return { entries, skipped };
}

export function entriesToCSV(entries: Entry[]) {
  const esc = (v: string | number) => (/[",;\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const rows = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  return '﻿' + ['tanggal,kategori,nilai,catatan', ...rows.map(e => [e.date, e.category, e.value, e.note || ''].map(esc).join(','))].join('\n');
}

export function downloadFile(name: string, content: string | Blob, type = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function readTextFile(file: File, maxBytes = 5 * 1024 * 1024) {
  return new Promise<string>((resolve, reject) => {
    if (file.size > maxBytes) { reject(new Error('File terlalu besar (maks. 5 MB).')); return; }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.readAsText(file);
  });
}
