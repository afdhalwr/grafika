/* Akun: daftar, masuk, akun demo, lupa sandi — lewat Firebase Authentication. */

import { FirebaseError } from 'firebase/app';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { firebaseAuth } from './firebase';
import { ensureUserData, resetToSample } from './store';

export const DEMO = { name: 'Pengguna Demo', email: 'demo@grafika.id', password: 'demo1234' };

export const isDemoEmail = (email?: string | null) => (email || '').toLowerCase() === DEMO.email;

/* ---------- pembatasan percobaan (UX di sisi klien; Firebase juga membatasi di server) ---------- */

const ATTEMPTS_KEY = 'grafika.attempts';
const MAX_ATTEMPTS = 5;
const LOCK_MS = 30_000;

type Attempt = { count: number; until: number };

const normEmail = (e: string) => e.trim().toLowerCase();

function readAttempts(): Record<string, Attempt> {
  try { return JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '{}'); } catch { return {}; }
}
function writeAttempt(email: string, value: Attempt | null) {
  const all = readAttempts();
  if (value) all[email] = value; else delete all[email];
  try { localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(all)); } catch { /* mode privat */ }
}
export function lockedSeconds(email: string) {
  const lock = readAttempts()[normEmail(email)];
  return lock && lock.until > Date.now() ? Math.ceil((lock.until - Date.now()) / 1000) : 0;
}

export class AuthError extends Error {
  constructor(message: string, public lockedFor = 0, public code = '') {
    super(message);
  }
}

const WRONG_CREDENTIALS = ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-login-credentials'];

/** Pesan Firebase -> bahasa manusia. */
export function authMessage(err: unknown): string {
  const code = err instanceof FirebaseError ? err.code : '';
  switch (code) {
    case 'auth/email-already-in-use': return 'Email ini sudah terdaftar. Coba masuk saja.';
    case 'auth/invalid-email': return 'Format email belum benar.';
    case 'auth/weak-password': return 'Kata sandi terlalu lemah (minimal 6 karakter).';
    case 'auth/too-many-requests': return 'Terlalu banyak percobaan dari perangkat ini. Tunggu sebentar lalu coba lagi.';
    case 'auth/network-request-failed': return 'Tidak bisa terhubung ke server. Periksa koneksi internetmu.';
    case 'auth/operation-not-allowed': return 'Login email & kata sandi belum diaktifkan di Firebase Console.';
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.': return 'Konfigurasi Firebase belum benar. Periksa file .env.local.';
    case 'auth/configuration-not-found': return 'Firebase Authentication belum diaktifkan. Buka Firebase Console → Authentication → Get started.';
    case 'auth/user-disabled': return 'Akun ini dinonaktifkan.';
    default:
      if (WRONG_CREDENTIALS.includes(code)) return 'Email atau kata sandi salah.';
      return err instanceof Error ? err.message : 'Terjadi kesalahan. Coba lagi.';
  }
}

export async function register({ name, email, password }: { name: string; email: string; password: string }) {
  const auth = firebaseAuth();
  try {
    await setPersistence(auth, browserLocalPersistence);
    const cred = await createUserWithEmailAndPassword(auth, normEmail(email), password);
    await updateProfile(cred.user, { displayName: name.trim() });
    await ensureUserData(cred.user.uid, name.trim(), cred.user.email || email);
    return { uid: cred.user.uid, name: name.trim() };
  } catch (err) {
    throw new AuthError(authMessage(err), 0, err instanceof FirebaseError ? err.code : '');
  }
}

export async function login({ email, password, remember }: { email: string; password: string; remember: boolean }) {
  const auth = firebaseAuth();
  const key = normEmail(email);
  const locked = lockedSeconds(key);
  if (locked) throw new AuthError(`Terlalu banyak percobaan. Coba lagi dalam ${locked} detik.`, locked);

  try {
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
    const cred = await signInWithEmailAndPassword(auth, key, password);
    writeAttempt(key, null);
    return { uid: cred.user.uid, name: cred.user.displayName || key.split('@')[0] };
  } catch (err) {
    const code = err instanceof FirebaseError ? err.code : '';
    if (!WRONG_CREDENTIALS.includes(code)) throw new AuthError(authMessage(err), 0, code);

    const count = (readAttempts()[key]?.count || 0) + 1;
    if (count >= MAX_ATTEMPTS) {
      writeAttempt(key, { count: 0, until: Date.now() + LOCK_MS });
      throw new AuthError(`Terlalu banyak percobaan. Coba lagi dalam ${LOCK_MS / 1000} detik.`, LOCK_MS / 1000, code);
    }
    writeAttempt(key, { count, until: 0 });
    throw new AuthError(`Email atau kata sandi salah. Sisa ${MAX_ATTEMPTS - count} percobaan.`, 0, code);
  }
}

/**
 * Masuk ke akun demo; dibuat otomatis saat pertama kali dipakai.
 * Akun demo dipakai bersama, jadi datanya dikembalikan ke contoh awal setiap kali ada yang masuk.
 */
export async function loginDemo() {
  const auth = firebaseAuth();
  await setPersistence(auth, browserSessionPersistence);
  try {
    const cred = await signInWithEmailAndPassword(auth, DEMO.email, DEMO.password);
    try {
      await resetToSample(cred.user.uid, DEMO.name, DEMO.email);
    } catch {
      // Reset gagal (mis. offline) — tetap masuk dengan data yang ada.
    }
    return { uid: cred.user.uid, name: DEMO.name };
  } catch (err) {
    const code = err instanceof FirebaseError ? err.code : '';
    if (!WRONG_CREDENTIALS.includes(code)) throw new AuthError(authMessage(err), 0, code);
  }
  try {
    const cred = await createUserWithEmailAndPassword(auth, DEMO.email, DEMO.password);
    await updateProfile(cred.user, { displayName: DEMO.name });
    await ensureUserData(cred.user.uid, DEMO.name, DEMO.email);
    return { uid: cred.user.uid, name: DEMO.name };
  } catch (err) {
    if (err instanceof FirebaseError && err.code === 'auth/email-already-in-use') {
      throw new AuthError('Akun demo sedang tidak bisa dipakai. Coba buat akun sendiri, ya.');
    }
    throw new AuthError(authMessage(err));
  }
}

export async function resetPassword(email: string) {
  try {
    await sendPasswordResetEmail(firebaseAuth(), normEmail(email));
  } catch (err) {
    throw new AuthError(authMessage(err));
  }
}

export const logout = () => signOut(firebaseAuth());
