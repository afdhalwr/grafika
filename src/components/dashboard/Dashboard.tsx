'use client';

import type { Chart } from 'chart.js';
import type { User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FullPageSpinner } from '@/components/Brand';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { ThemeToggle, toggleTheme, useTheme } from '@/components/theme';
import { useToast } from '@/components/Toast';
import { compute, periodBounds, rangeText } from '@/lib/analytics';
import { logout } from '@/lib/auth';
import { downloadFile, entriesToCSV, parseCSV, readTextFile, rowsToEntries } from '@/lib/csv';
import { Fmt, greeting, slug, startOfToday, toISO, uid } from '@/lib/format';
import { SERIES_COUNT, withColorSlot } from '@/lib/seed';
import type { Dataset, Entry, Granularity, Prefs, RangeKey } from '@/lib/types';
import { CategoryChart, ChartCard, DownloadButton, fmtVal, seriesColor, TrendChart, trendSubtitle, WeekdayChart, weekdayStats, catColor } from './Charts';
import { useConfirm } from './ConfirmDialog';
import { DatasetModal, type DatasetFields } from './DatasetModal';
import { EntriesTable, filterRows, type Sort, type SortKey } from './EntriesTable';
import { EntryModal, type EntryDraft } from './EntryModal';
import { Insights } from './Insights';
import { Kpis } from './Kpis';
import { Sidebar, type Tool } from './Sidebar';
import { useGrafikaData } from './useGrafikaData';

const DEFAULT_PREFS: Prefs = { range: '30', gran: 'day', compare: true, from: null, to: null, perPage: 10 };
const RANGES: [RangeKey, string][] = [['7', '7 hari'], ['30', '30 hari'], ['90', '90 hari'], ['all', 'Semua']];
const GRANS: [Granularity, string][] = [['day', 'Harian'], ['week', 'Mingguan'], ['month', 'Bulanan']];

/** Cadangan dari Grafika versi lama (localStorage) juga diterima. */
function normalizeBackup(raw: unknown): { datasets: Dataset[]; activeId: string | null } | null {
  const incoming = (raw as { data?: unknown })?.data ?? raw;
  const list = (incoming as { datasets?: unknown })?.datasets;
  if (!Array.isArray(list) || !list.every(d => d?.id && d?.name && Array.isArray(d?.entries))) return null;
  const base = Date.now();
  const datasets: Dataset[] = list.map((d, i) => ({
    id: String(d.id),
    name: String(d.name).slice(0, 32),
    unit: String(d.unit || ''),
    color: Number(d.color) || 0,
    target: Number(d.target) || 0,
    higherIsBetter: d.higherIsBetter !== false,
    catColors: d.catColors || {},
    order: Number(d.order) || base + i,
    entries: d.entries
      .filter((e: Entry) => e && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && Number.isFinite(Number(e.value)))
      .map((e: Entry) => ({ id: String(e.id || uid()), date: e.date, category: String(e.category || 'Umum').slice(0, 30), value: Number(e.value), note: String(e.note || '').slice(0, 80) })),
  }));
  const activeId = (incoming as { activeId?: string }).activeId;
  return { datasets, activeId: datasets.some(d => d.id === activeId) ? activeId! : datasets[0]?.id ?? null };
}

export function Dashboard({ user }: { user: User }) {
  const router = useRouter();
  const toast = useToast();
  const theme = useTheme();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const { profile, datasets, error, loading, saveDataset, removeDataset, updateProfile, replaceAll } = useGrafikaData(user);

  /* ---------- preferensi tampilan (per pengguna, di perangkat ini) ---------- */
  const prefKey = `grafika.prefs.${user.uid}`;
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS);
  useEffect(() => {
    try { setPrefsState({ ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(prefKey) || '{}') }); } catch { /* abaikan */ }
  }, [prefKey]);
  const setPrefs = useCallback((patch: Partial<Prefs>) => {
    setPrefsState(p => {
      const next = { ...p, ...patch };
      try { localStorage.setItem(prefKey, JSON.stringify(next)); } catch { /* abaikan */ }
      return next;
    });
  }, [prefKey]);

  /* ---------- status tampilan ---------- */
  const [category, setCategory] = useState<string | null>(null);
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>({ key: 'date', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [entryModal, setEntryModal] = useState<{ open: boolean; editing: Entry | null }>({ open: false, editing: null });
  const [datasetModal, setDatasetModal] = useState<{ open: boolean; editing: Dataset | null }>({ open: false, editing: null });
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const csvInput = useRef<HTMLInputElement>(null);
  const jsonInput = useRef<HTMLInputElement>(null);
  const charts = { trend: useRef<Chart | null>(null), category: useRef<Chart | null>(null), weekday: useRef<Chart | null>(null) };

  const list = useMemo(() => datasets || [], [datasets]);
  const active = useMemo(() => list.find(d => d.id === profile?.activeId) || list[0] || null, [list, profile?.activeId]);
  const c = useMemo(() => (active ? compute(active, prefs, category) : null), [active, prefs, category]);
  const rows = useMemo(() => (c ? filterRows(c.period, q, sort) : []), [c, q, sort]);

  // Versi terbaru untuk aksi "Urungkan" yang dijalankan belakangan.
  const latest = useRef({ list, active });
  latest.current = { list, active };

  /* ---------- efek kecil ---------- */
  useEffect(() => { document.title = active ? `${active.name} — Grafika` : 'Dasbor — Grafika'; }, [active]);
  useEffect(() => {
    const id = setTimeout(() => { setQ(qInput.trim()); setPage(1); }, 180);
    return () => clearTimeout(id);
  }, [qInput]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    if (!flashId) return;
    const id = setTimeout(() => setFlashId(null), 1700);
    return () => clearTimeout(id);
  }, [flashId]);

  /* =====================================================
     Aksi
     ===================================================== */

  const toggleCategory = useCallback((cat: string) => {
    setCategory(cur => (cur === cat ? null : cat));
    setPage(1);
  }, []);

  const switchDataset = useCallback((id: string) => {
    setSidebarOpen(false);
    if (latest.current.active?.id === id) return;
    updateProfile({ activeId: id });
    setCategory(null);
    setPage(1);
  }, [updateProfile]);

  const openEntry = useCallback((editing: Entry | null = null) => {
    if (!latest.current.active) { setDatasetModal({ open: true, editing: null }); return; }
    setEntryModal({ open: true, editing });
  }, []);

  function saveEntry(draft: EntryDraft, again: boolean) {
    const ds = active!;
    const editing = entryModal.editing;
    const saved: Entry = editing ? { ...editing, ...draft } : { id: uid(), ...draft };
    const entries = editing ? ds.entries.map(e => (e.id === editing.id ? saved : e)) : [...ds.entries, saved];
    saveDataset({ ...ds, entries, catColors: withColorSlot(ds.catColors, draft.category) });
    setFlashId(saved.id);

    const b = periodBounds(ds, prefs);
    if (draft.date < toISO(b.from) || draft.date > toISO(b.to)) {
      toast('Tersimpan, tapi tanggalnya di luar rentang tampilan.', { type: 'info', action: 'Tampilkan semua', onAction: () => setPrefs({ range: 'all' }) });
    } else {
      toast(editing ? 'Perubahan disimpan.' : `${fmtVal(draft.value, ds)} ditambahkan ke ${draft.category}.`);
    }
    if (!again) setEntryModal({ open: false, editing: null });
  }

  function deleteEntry(entry: Entry) {
    const ds = active!;
    const idx = ds.entries.findIndex(e => e.id === entry.id);
    if (idx < 0) return;
    saveDataset({ ...ds, entries: ds.entries.filter(e => e.id !== entry.id) });
    toast(`Catatan ${entry.category} dihapus.`, {
      type: 'info', action: 'Urungkan', duration: 6000,
      onAction: () => {
        const now = latest.current.list.find(d => d.id === ds.id);
        if (!now) return;
        const entries = [...now.entries];
        entries.splice(Math.min(idx, entries.length), 0, entry);
        saveDataset({ ...now, entries });
        setFlashId(entry.id);
      },
    });
  }

  function saveDatasetFields(fields: DatasetFields) {
    const editing = datasetModal.editing;
    if (editing) {
      const current = list.find(d => d.id === editing.id) || editing;
      saveDataset({ ...current, ...fields });
      toast('Dataset diperbarui.');
    } else {
      const ds: Dataset = { id: uid(), ...fields, catColors: {}, entries: [], order: Date.now() };
      saveDataset(ds);
      updateProfile({ activeId: ds.id });
      setCategory(null);
      toast(`Dataset "${ds.name}" dibuat. Tekan N untuk mengisi data pertama.`);
    }
    setDatasetModal({ open: false, editing: null });
  }

  async function deleteDatasetFlow(ds: Dataset) {
    setDatasetModal({ open: false, editing: null });
    const ok = await confirm({
      title: 'Hapus dataset?',
      text: `"${ds.name}" beserta ${Fmt.number(ds.entries.length)} catatannya akan dihapus permanen. Buat cadangan dulu jika ragu.`,
      ok: 'Hapus dataset',
    });
    if (!ok) return;
    removeDataset(ds.id);
    if (active?.id === ds.id) updateProfile({ activeId: list.find(d => d.id !== ds.id)?.id ?? null });
    setCategory(null);
    toast(`Dataset "${ds.name}" dihapus.`, { type: 'info' });
  }

  async function importCSV(file: File) {
    const ds = active;
    if (!ds) { toast('Buat dataset dulu sebelum mengimpor.', { type: 'error' }); return; }
    let text: string;
    try { text = await readTextFile(file); } catch (err) { toast((err as Error).message, { type: 'error' }); return; }
    const parsed = parseCSV(text);
    if (!parsed.length) { toast('File CSV kosong.', { type: 'error' }); return; }
    const { entries, skipped } = rowsToEntries(parsed, uid);
    if (!entries.length) { toast('Tidak ada baris valid. Pastikan kolom: tanggal, kategori, nilai, catatan.', { type: 'error', duration: 6000 }); return; }

    let catColors = ds.catColors;
    entries.forEach(e => { catColors = withColorSlot(catColors, e.category); });
    saveDataset({ ...ds, catColors, entries: [...ds.entries, ...entries] });
    const ids = new Set(entries.map(e => e.id));
    toast(`${Fmt.number(entries.length)} baris diimpor${skipped ? `, ${skipped} dilewati` : ''}.`, {
      action: 'Urungkan', duration: 7000,
      onAction: () => {
        const now = latest.current.list.find(d => d.id === ds.id);
        if (now) saveDataset({ ...now, entries: now.entries.filter(e => !ids.has(e.id)) });
      },
    });
  }

  function exportCSV() {
    if (!active || !rows.length) { toast('Tidak ada data untuk diekspor.', { type: 'error' }); return; }
    downloadFile(`grafika-${slug(active.name)}-${toISO(startOfToday())}.csv`, entriesToCSV(rows), 'text/csv;charset=utf-8');
    toast(`${Fmt.number(rows.length)} baris diekspor ke CSV.`);
  }

  function backup() {
    const payload = { app: 'grafika', version: 2, exportedAt: new Date().toISOString(), data: { activeId: active?.id ?? null, datasets: list } };
    downloadFile(`grafika-cadangan-${toISO(startOfToday())}.json`, JSON.stringify(payload, null, 2), 'application/json');
    toast('Cadangan diunduh. Simpan file ini di tempat aman.');
  }

  async function restore(file: File) {
    let parsed: unknown;
    try { parsed = JSON.parse(await readTextFile(file)); } catch { toast('File bukan JSON yang valid.', { type: 'error' }); return; }
    const incoming = normalizeBackup(parsed);
    if (!incoming) { toast('Format cadangan tidak dikenali.', { type: 'error' }); return; }
    const ok = await confirm({
      title: 'Pulihkan cadangan?',
      text: `Semua data saat ini akan diganti dengan ${incoming.datasets.length} dataset dari file cadangan.`,
      ok: 'Pulihkan',
    });
    if (!ok) return;
    const before = list;
    const beforeActive = active?.id ?? null;
    replaceAll(incoming.datasets, incoming.activeId);
    setCategory(null);
    toast('Cadangan berhasil dipulihkan.', { action: 'Urungkan', onAction: () => replaceAll(before, beforeActive) });
  }

  async function clearSamples() {
    const ok = await confirm({
      title: 'Mulai dari kosong?',
      text: 'Semua catatan contoh di setiap dataset akan dihapus. Nama dataset tetap ada supaya kamu bisa langsung mengisi.',
      ok: 'Kosongkan',
    });
    if (!ok) return;
    replaceAll(list.map(ds => ({ ...ds, entries: [], catColors: {} })), active?.id ?? null);
    updateProfile({ welcomeDismissed: true });
    setCategory(null);
    toast('Data contoh dihapus. Tekan N untuk menambah data pertama.');
  }

  async function signOutFlow() {
    const ok = await confirm({ title: 'Keluar dari Grafika?', text: 'Datamu tetap tersimpan di akunmu dan akan muncul lagi saat kamu masuk.', ok: 'Keluar' });
    if (!ok) return;
    await logout();
    router.replace('/login');
  }

  function downloadChart(name: keyof typeof charts) {
    const chart = charts[name].current;
    if (!chart || !active) return;
    const names = { trend: 'tren', category: 'kategori', weekday: 'per-hari' };
    const a = document.createElement('a');
    a.href = chart.toBase64Image('image/png', 1);
    a.download = `grafika-${slug(active.name)}-${names[name]}.png`;
    a.click();
    toast('Grafik diunduh sebagai PNG.');
  }

  function runTool(tool: Tool) {
    setSidebarOpen(false);
    if (tool === 'import') csvInput.current?.click();
    if (tool === 'export') exportCSV();
    if (tool === 'backup') backup();
    if (tool === 'restore') jsonInput.current?.click();
    if (tool === 'print') setTimeout(() => window.print(), 250);
    if (tool === 'shortcuts') setShortcutsOpen(true);
  }

  function setRange(range: RangeKey) {
    if (range === 'custom' && prefs.range !== 'custom') {
      const b = periodBounds(active || { entries: [] }, prefs);
      setPrefs({ range, from: toISO(b.from), to: toISO(b.to) });
      setTimeout(() => document.getElementById('fromDate')?.focus(), 0);
    } else {
      setPrefs({ range });
    }
    setPage(1);
  }

  function clearFilters() {
    setCategory(null);
    setQInput('');
    setQ('');
    setPage(1);
  }

  /* ---------- pintasan keyboard ---------- */
  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {});
  keyHandler.current = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const target = e.target instanceof Element ? e.target : null;
    const typing = target?.closest('input, textarea, select, [contenteditable="true"]');
    const modalOpen = document.querySelector('dialog[open]');

    if (e.key === 'Escape') {
      if (typing === searchRef.current && qInput) { clearFilters(); return; }
      if (sidebarOpen) { setSidebarOpen(false); return; }
      if (!modalOpen && (category || q)) clearFilters();
      return;
    }
    if (typing || modalOpen) return;

    const k = e.key.toLowerCase();
    if (k === 'n') { e.preventDefault(); openEntry(); }
    else if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    else if (k === 't') toggleTheme();
    else if (e.key === '?') setShortcutsOpen(true);
    else if (/^[1-9]$/.test(e.key)) {
      const ds = list[Number(e.key) - 1];
      if (ds) { switchDataset(ds.id); toast(`Dataset: ${ds.name}`, { type: 'info', duration: 1600 }); }
    }
  };
  useEffect(() => {
    const on = (e: KeyboardEvent) => keyHandler.current(e);
    document.addEventListener('keydown', on);
    return () => document.removeEventListener('keydown', on);
  }, []);

  /* =====================================================
     Tampilan
     ===================================================== */

  if (error) {
    return (
      <div className="grid min-h-dvh place-items-center p-4">
        <div className="card max-w-[480px] p-7 text-center">
          <div className="tone tone-bad mx-auto mb-3 size-14 rounded-2xl text-2xl"><Icon name="alert" /></div>
          <strong className="text-lg">Data tidak bisa dimuat</strong>
          <p className="mt-2 text-fg-2">{error}</p>
          <div className="mt-5 flex justify-center gap-2">
            <button className="btn btn-outline" type="button" onClick={() => logout().then(() => router.replace('/login'))}>Keluar</button>
            <button className="btn btn-primary" type="button" onClick={() => location.reload()}>Coba lagi</button>
          </div>
        </div>
      </div>
    );
  }
  if (loading || !profile) return <FullPageSpinner label="Menyiapkan datamu…" />;

  const name = profile.name || user.displayName || 'Pengguna';
  const wd = c ? weekdayStats(c) : null;

  return (
    <>
      <a className="skip-link" href="#content">Lewati ke konten</a>
      <div className="grid min-h-dvh grid-cols-[272px_minmax(0,1fr)] max-lg:grid-cols-1 short:grid-cols-[244px_minmax(0,1fr)] print:block">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          datasets={list}
          activeId={active?.id ?? null}
          onSwitch={switchDataset}
          onNewDataset={() => { setSidebarOpen(false); setDatasetModal({ open: true, editing: null }); }}
          onTool={runTool}
          userName={name}
          userEmail={user.email || ''}
          onLogout={signOutFlow}
        />

        <div className="flex min-w-0 flex-col">
          {/* ---------- topbar ---------- */}
          <header className={`no-print sticky top-0 z-40 flex items-center gap-3 border-b bg-bg/80 px-7 py-3.5 backdrop-blur-md backdrop-saturate-150 transition-colors max-lg:flex-wrap max-lg:px-4 max-lg:py-3 short:px-6 short:py-2.5 ${scrolled ? 'border-line' : 'border-transparent'}`}>
            <button className="icon-btn lg:hidden" type="button" aria-label="Buka menu" aria-controls="sidebar" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)}>
              <Icon name="menu" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-extrabold max-xs:text-[17px] short:text-lg">{greeting()}, {name}</h1>
              <p className="text-[13px] text-muted short:text-[12.5px]">{Fmt.date(toISO(new Date()), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <label className="flex h-[42px] w-[min(320px,32vw)] items-center gap-2 rounded-xl border-[1.5px] border-line bg-surface pr-2 pl-3.5 text-muted transition focus-within:border-primary focus-within:shadow-[var(--ring)] max-lg:order-5 max-lg:w-full short:h-[38px]">
              <Icon name="search" />
              <span className="sr-only">Cari data</span>
              <input ref={searchRef} type="search" placeholder="Cari kategori, catatan…" autoComplete="off" value={qInput}
                onChange={e => setQInput(e.target.value)} className="min-w-0 flex-1 border-0 bg-transparent text-fg outline-none placeholder:text-muted focus-visible:shadow-none" />
              <kbd>/</kbd>
            </label>
            <ThemeToggle className="short:size-[38px]" />
            <button className="btn btn-primary max-lg:hidden short:min-h-[38px]" type="button" onClick={() => openEntry()}>
              <Icon name="plus" /><span>Tambah data</span><kbd>N</kbd>
            </button>
          </header>

          <main id="content" tabIndex={-1} className="flex flex-col gap-5 px-7 pt-2 pb-8 outline-none max-lg:px-4 max-lg:pb-24 short:gap-3.5 short:px-6 short:pt-1 short:pb-6 print:p-0">
            {/* ---------- sambutan ---------- */}
            {!profile.welcomeDismissed && (
              <div className="card no-print relative flex items-center gap-3.5 overflow-hidden py-3.5 pr-3.5 pl-5 before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-primary max-md:flex-wrap short:py-2.5">
                <span className="tone tone-primary size-9 rounded-[10px]"><Icon name="sparkles" /></span>
                <div className="min-w-0 flex-1">
                  <strong className="text-[14.5px]">Selamat datang di Grafika</strong>
                  <p className="text-[13.5px] text-fg-2">Dasbor ini berisi data contoh. Klik irisan grafik untuk menyaring kategori, atau tekan <kbd>N</kbd> untuk menambah data.</p>
                </div>
                <div className="flex items-center gap-1.5 max-md:w-full max-md:justify-end">
                  <button className="btn btn-sm btn-outline" type="button" onClick={clearSamples}>Mulai dari kosong</button>
                  <button className="icon-btn plain sm" type="button" aria-label="Tutup sambutan" onClick={() => updateProfile({ welcomeDismissed: true })}><Icon name="x" /></button>
                </div>
              </div>
            )}

            {!active || !c ? (
              <section className="card flex flex-col items-center gap-1.5 px-4 py-10 text-center">
                <div className="tone tone-primary mb-2 size-16 rounded-[20px] text-[26px]"><Icon name="layers" /></div>
                <strong>Belum ada dataset</strong>
                <p className="mb-2.5 max-w-[340px] text-sm text-muted">Dataset adalah kumpulan angka yang ingin kamu pantau — misalnya penjualan, pengeluaran, atau jam olahraga.</p>
                <button className="btn btn-primary" type="button" onClick={() => setDatasetModal({ open: true, editing: null })}><Icon name="plus" /> Buat dataset pertama</button>
              </section>
            ) : (
              <>
                {/* ---------- judul & filter ---------- */}
                <section className="flex flex-wrap items-center justify-between gap-3.5 max-md:flex-col max-md:items-stretch" aria-label="Filter">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="size-3.5 flex-none rounded-[5px]" style={{ background: seriesColor(active.color) }} />
                    <h2 className="truncate text-2xl font-extrabold short:text-xl">{active.name}</h2>
                    <button className="icon-btn plain sm no-print" type="button" aria-label="Ubah dataset" title="Ubah dataset" onClick={() => setDatasetModal({ open: true, editing: active })}><Icon name="edit" /></button>
                  </div>
                  <div className="no-print flex flex-wrap items-center gap-2.5 max-md:flex-col max-md:items-stretch">
                    <div className="segmented max-md:overflow-x-auto max-md:[&_button]:flex-1" role="radiogroup" aria-label="Rentang waktu">
                      {RANGES.map(([key, label]) => (
                        <button key={key} role="radio" aria-checked={prefs.range === key} onClick={() => setRange(key)} className="short:h-[30px]!">{label}</button>
                      ))}
                      <button role="radio" aria-checked={prefs.range === 'custom'} onClick={() => setRange('custom')} className="short:h-[30px]!">
                        <Icon name="calendar" /><span className="sr-only">Pilih tanggal</span>
                      </button>
                    </div>
                    {prefs.range === 'custom' && (
                      <div className="flex items-center gap-2 text-muted">
                        <input className="input min-h-10! w-[150px] px-2.5! py-1.5! max-md:w-auto max-md:flex-1" type="date" id="fromDate" aria-label="Dari tanggal"
                          value={prefs.from || ''} onChange={e => e.target.value && setPrefs({ from: e.target.value })} />
                        <span>–</span>
                        <input className="input min-h-10! w-[150px] px-2.5! py-1.5! max-md:w-auto max-md:flex-1" type="date" aria-label="Sampai tanggal"
                          value={prefs.to || ''} onChange={e => e.target.value && setPrefs({ to: e.target.value })} />
                      </div>
                    )}
                  </div>
                </section>

                {(category || q) && (
                  <div className="-mt-2 flex flex-wrap gap-2 short:-mt-1">
                    {category && (
                      <FilterChip onClear={() => { setCategory(null); setPage(1); }} label="Hapus filter kategori">
                        <i className="size-2 rounded-[3px]" style={{ background: catColor(active, category) }} />Kategori: {category}
                      </FilterChip>
                    )}
                    {q && (
                      <FilterChip onClear={() => { setQInput(''); setQ(''); setPage(1); }} label="Hapus pencarian">
                        <Icon name="search" /> &quot;{q}&quot;
                      </FilterChip>
                    )}
                  </div>
                )}

                <Kpis c={c} onEditDataset={() => setDatasetModal({ open: true, editing: active })} />

                {/* ---------- grafik ---------- */}
                <section className="grid grid-cols-3 gap-4 max-xl:grid-cols-2 max-md:grid-cols-1 short:gap-3.5 print:grid-cols-2">
                  <ChartCard
                    className="col-span-2 max-xl:col-span-full"
                    title="Tren nilai"
                    sub={trendSubtitle(c)}
                    tools={<>
                      <div className="segmented sm" role="radiogroup" aria-label="Kelompokkan per">
                        {GRANS.map(([key, label]) => (
                          <button key={key} role="radio" aria-checked={prefs.gran === key} onClick={() => setPrefs({ gran: key })}>{label}</button>
                        ))}
                      </div>
                      <label className="switch" title="Bandingkan dengan periode sebelumnya">
                        <input type="checkbox" checked={prefs.compare} disabled={prefs.range === 'all'} onChange={e => setPrefs({ compare: e.target.checked })} />
                        <span className="switch-track" />
                        <span>Bandingkan</span>
                      </label>
                      <DownloadButton onClick={() => downloadChart('trend')} label="Unduh grafik tren (PNG)" />
                    </>}
                  >
                    <TrendChart c={c} theme={theme} chartRef={charts.trend} />
                  </ChartCard>

                  <ChartCard title="Komposisi kategori" sub="Klik untuk menyaring" tools={<DownloadButton onClick={() => downloadChart('category')} label="Unduh grafik kategori (PNG)" />}>
                    <CategoryChart c={c} theme={theme} chartRef={charts.category} onToggle={toggleCategory} />
                  </ChartCard>

                  <ChartCard title="Rata-rata per hari" sub={wd?.sub} tools={<DownloadButton onClick={() => downloadChart('weekday')} label="Unduh grafik hari (PNG)" />}>
                    <WeekdayChart c={c} theme={theme} chartRef={charts.weekday} />
                  </ChartCard>

                  <ChartCard className="col-span-2 max-md:col-span-1" title={<><span className="text-primary"><Icon name="sparkles" /></span> Wawasan otomatis</>} sub="Dibaca dari data periode ini">
                    <Insights c={c} />
                  </ChartCard>
                </section>

                {/* ---------- tabel ---------- */}
                <section className="card px-5 pt-[18px] pb-3 short:px-4 short:pt-3.5 short:pb-2.5" aria-labelledby="tableTitle">
                  <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 id="tableTitle" className="text-base font-bold">Riwayat data</h3>
                      <p className="mt-0.5 text-[12.5px] text-muted">{Fmt.number(rows.length)} catatan · {rangeText(c)}</p>
                    </div>
                    <div className="no-print flex items-center gap-2">
                      <button className="btn btn-sm btn-outline" type="button" onClick={exportCSV}><Icon name="download" /> CSV</button>
                      <button className="btn btn-sm btn-primary" type="button" onClick={() => openEntry()}><Icon name="plus" /> Tambah</button>
                    </div>
                  </header>
                  <EntriesTable
                    ds={active} rows={rows} q={q} sort={sort} page={page} perPage={prefs.perPage} flashId={flashId} filtered={!!(q || category)}
                    onSort={(key: SortKey) => setSort(s => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'category' ? 'asc' : 'desc' }))}
                    onPage={p => { setPage(p); document.getElementById('tableTitle')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                    onPerPage={n => { setPrefs({ perPage: n }); setPage(1); }}
                    onEdit={e => openEntry(e)}
                    onDelete={deleteEntry}
                    onAdd={() => openEntry()}
                  />
                </section>
              </>
            )}

            <p className="pt-1 text-center text-[12.5px] text-muted">Grafika · proyek portofolio oleh Dhall · data tersimpan di Firebase</p>
          </main>
        </div>
      </div>

      {/* tombol tambah mengambang (ponsel) */}
      <button className="no-print fixed right-[18px] bottom-[18px] z-30 hidden size-14 place-items-center rounded-[18px] bg-primary text-[22px] text-on-primary shadow-[0_14px_30px_-10px_var(--primary)] max-lg:grid"
        type="button" aria-label="Tambah data" onClick={() => openEntry()}>
        <Icon name="plus" />
      </button>

      <EntryModal open={entryModal.open} ds={active} editing={entryModal.editing} defaultCategory={category}
        onClose={() => setEntryModal({ open: false, editing: null })} onSave={saveEntry} />
      <DatasetModal open={datasetModal.open} editing={datasetModal.editing} nextColor={list.length % SERIES_COUNT}
        onClose={() => setDatasetModal({ open: false, editing: null })} onSave={saveDatasetFields} onDelete={deleteDatasetFlow} />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      {confirmDialog}

      <input ref={csvInput} type="file" accept=".csv,text/csv" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) importCSV(f); }} />
      <input ref={jsonInput} type="file" accept=".json,application/json" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) restore(f); }} />
    </>
  );
}

function FilterChip({ children, onClear, label }: { children: React.ReactNode; onClear: () => void; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-[5px] pr-1.5 pl-3 text-[13px] font-semibold text-fg-2">
      {children}
      <button type="button" onClick={onClear} aria-label={label} className="no-print grid size-[22px] place-items-center rounded-full bg-surface-2 text-muted hover:text-fg">
        <Icon name="x" size={13} />
      </button>
    </span>
  );
}

function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const rows: [React.ReactNode, string][] = [
    [<kbd key="n">N</kbd>, 'Tambah data'],
    [<kbd key="s">/</kbd>, 'Cari di riwayat'],
    [<kbd key="t">T</kbd>, 'Ganti tema terang/gelap'],
    [<><kbd>1</kbd>–<kbd>9</kbd></>, 'Pindah dataset'],
    [<kbd key="e">Esc</kbd>, 'Tutup jendela / hapus filter'],
    [<kbd key="q">?</kbd>, 'Tampilkan bantuan ini'],
  ];
  return (
    <Modal open={open} onClose={onClose} title="Pintasan keyboard" small>
      <div className="modal-body">
        <dl className="grid gap-2.5">
          {rows.map(([keys, label]) => (
            <div key={label} className="flex items-center justify-between gap-3 border-b border-dashed border-line py-2 last:border-b-0">
              <dt className="flex items-center gap-1 text-muted">{keys}</dt>
              <dd className="font-semibold text-fg-2">{label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Modal>
  );
}
