'use client';

import { FirebaseError } from 'firebase/app';
import type { User } from 'firebase/auth';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/Toast';
import * as store from '@/lib/store';
import type { Dataset, Profile } from '@/lib/types';

function dataError(err: unknown) {
  const code = err instanceof FirebaseError ? err.code : '';
  if (code === 'permission-denied') return 'Akses ke data ditolak. Coba keluar lalu masuk lagi.';
  if (code === 'unavailable') return 'Server tidak bisa dihubungi. Perubahan disimpan sementara dan dikirim saat online.';
  if (code === 'resource-exhausted') return 'Server sedang penuh. Coba lagi beberapa saat lagi.';
  console.error(err);
  return 'Gagal memuat data. Coba muat ulang halaman.';
}

/** Data pengguna dari Firestore + aksi untuk mengubahnya. Perubahan tampil seketika (optimistis). */
export function useGrafikaData(user: User) {
  const toast = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [datasets, setDatasets] = useState<Dataset[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef<Dataset[]>([]);
  latest.current = datasets || [];

  useEffect(() => {
    let unsub = () => {};
    let cancelled = false;
    const name = user.displayName || (user.email || 'Pengguna').split('@')[0];
    store.ensureUserData(user.uid, name, user.email || '')
      .then(() => {
        if (cancelled) return;
        unsub = store.subscribe(user.uid, setProfile, setDatasets, err => setError(dataError(err)));
      })
      .catch(err => setError(dataError(err)));
    return () => { cancelled = true; unsub(); };
  }, [user]);

  const fail = useCallback((err: unknown) => toast(dataError(err), { type: 'error', duration: 7000 }), [toast]);

  const saveDataset = useCallback((ds: Dataset) => {
    setDatasets(list => {
      const all = list || [];
      return all.some(d => d.id === ds.id) ? all.map(d => (d.id === ds.id ? ds : d)) : [...all, ds];
    });
    store.saveDataset(user.uid, ds).catch(fail);
  }, [user.uid, fail]);

  const removeDataset = useCallback((id: string) => {
    setDatasets(list => (list || []).filter(d => d.id !== id));
    store.deleteDataset(user.uid, id).catch(fail);
  }, [user.uid, fail]);

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setProfile(p => (p ? { ...p, ...patch } : p));
    store.updateProfileDoc(user.uid, patch).catch(fail);
  }, [user.uid, fail]);

  const replaceAll = useCallback((next: Dataset[], activeId: string | null) => {
    const current = latest.current;
    setDatasets(next);
    setProfile(p => (p ? { ...p, activeId } : p));
    store.replaceAll(user.uid, current, next, activeId).catch(fail);
  }, [user.uid, fail]);

  return {
    profile,
    datasets,
    error,
    loading: !error && (!profile || !datasets),
    saveDataset,
    removeDataset,
    updateProfile,
    replaceAll,
  };
}
