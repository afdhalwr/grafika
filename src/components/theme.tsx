'use client';

import { useSyncExternalStore } from 'react';
import { Icon } from './Icon';

export type Theme = 'light' | 'dark';
const KEY = 'grafika.theme';

/** Dijalankan di <head> sebelum halaman tampil, supaya tidak ada kedipan tema. */
export const themeInitScript = `try{var t=localStorage.getItem('${KEY}');document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch(e){document.documentElement.dataset.theme='light'}`;

function subscribe(onChange: () => void) {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => mo.disconnect();
}
const read = (): Theme => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

/** Tema aktif; komponen ikut dirender ulang saat tema berganti (mis. untuk warna grafik). */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, read, () => 'light');
}

export function setTheme(mode: Theme) {
  document.documentElement.dataset.theme = mode;
  try { localStorage.setItem(KEY, mode); } catch { /* mode privat */ }
}

export function toggleTheme() {
  setTheme(read() === 'dark' ? 'light' : 'dark');
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const theme = useTheme();
  return (
    <button
      className={`icon-btn theme-toggle ${className}`}
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
    >
      <span className="moon"><Icon name="moon" /></span>
      <span className="sun"><Icon name="sun" /></span>
    </button>
  );
}
