/* Data pengguna di Cloud Firestore.
 *
 *   grafika_users/{uid}                 -> Profile (nama, dataset aktif, dll.)
 *   grafika_users/{uid}/datasets/{id}   -> Dataset beserta seluruh entrinya
 *
 * Satu dokumen per dataset: sekali baca untuk ratusan entri (hemat kuota),
 * cukup untuk ±10.000 entri per dataset sebelum menyentuh batas 1 MB dokumen.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { getDb } from './db';
import { seedDatasets } from './seed';
import type { Dataset, Profile } from './types';

const userRef = (uid: string) => doc(getDb(), 'grafika_users', uid);
const datasetsCol = (uid: string) => collection(getDb(), 'grafika_users', uid, 'datasets');
const datasetRef = (uid: string, id: string) => doc(getDb(), 'grafika_users', uid, 'datasets', id);

const withoutId = ({ id: _id, ...rest }: Dataset) => rest;

/** Buat profil + data contoh jika pengguna belum punya. Aman dipanggil berkali-kali. */
export async function ensureUserData(uid: string, name: string, email: string) {
  const snap = await getDoc(userRef(uid));
  if (snap.exists()) return;
  const datasets = seedDatasets();
  const batch = writeBatch(getDb());
  const profile: Profile = { name, email, createdAt: new Date().toISOString(), activeId: datasets[0].id, welcomeDismissed: false };
  batch.set(userRef(uid), profile);
  datasets.forEach(ds => batch.set(datasetRef(uid, ds.id), withoutId(ds)));
  await batch.commit();
}

/** Dengarkan profil & dataset secara langsung — perubahan dari tab/perangkat lain ikut muncul. */
export function subscribe(
  uid: string,
  onProfile: (p: Profile | null) => void,
  onDatasets: (list: Dataset[]) => void,
  onError: (err: Error) => void,
) {
  const unsubProfile = onSnapshot(userRef(uid), s => onProfile(s.exists() ? (s.data() as Profile) : null), onError);
  const unsubDatasets = onSnapshot(
    query(datasetsCol(uid), orderBy('order')),
    s => onDatasets(s.docs.map(d => normalizeDataset({ id: d.id, ...d.data() }))),
    onError,
  );
  return () => { unsubProfile(); unsubDatasets(); };
}

function normalizeDataset(raw: Record<string, unknown>): Dataset {
  const r = raw as Partial<Dataset> & { id: string };
  return {
    id: r.id,
    name: r.name || 'Tanpa nama',
    unit: r.unit || '',
    color: Number(r.color) || 0,
    target: Number(r.target) || 0,
    higherIsBetter: r.higherIsBetter !== false,
    catColors: r.catColors || {},
    entries: Array.isArray(r.entries) ? r.entries : [],
    order: Number(r.order) || 0,
  };
}

export const saveDataset = (uid: string, ds: Dataset) => setDoc(datasetRef(uid, ds.id), withoutId(ds));

export const deleteDataset = (uid: string, id: string) => deleteDoc(datasetRef(uid, id));

export const updateProfileDoc = (uid: string, patch: Partial<Profile>) => setDoc(userRef(uid), patch, { merge: true });

/** Ganti seluruh dataset sekaligus (pulihkan cadangan / urungkan). */
export async function replaceAll(uid: string, current: Dataset[], next: Dataset[], activeId: string | null) {
  const batch = writeBatch(getDb());
  const keep = new Set(next.map(d => d.id));
  current.forEach(d => { if (!keep.has(d.id)) batch.delete(datasetRef(uid, d.id)); });
  next.forEach(d => batch.set(datasetRef(uid, d.id), withoutId(d)));
  batch.set(userRef(uid), { activeId }, { merge: true });
  await batch.commit();
}
