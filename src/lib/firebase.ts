/* Inisialisasi Firebase App & Auth (hanya di peramban). Konfigurasi dibaca dari .env.local.
 * Firestore sengaja dipisah ke db.ts supaya halaman landing tidak ikut memuatnya. */

import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Ditulis satu per satu supaya Next.js bisa menyisipkan nilainya saat build.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseReady = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);

export function firebaseApp() {
  if (!firebaseReady) throw new Error('Firebase belum diatur. Isi file .env.local terlebih dahulu.');
  return getApps().length ? getApp() : initializeApp(config);
}

export const firebaseAuth = () => getAuth(firebaseApp());
