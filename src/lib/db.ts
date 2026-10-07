import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore';
import { firebaseApp } from './firebase';

let db: Firestore | null = null;

export function getDb() {
  if (db) return db;
  const app = firebaseApp();
  try {
    db = initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      // Cache IndexedDB: dasbor langsung tampil saat dibuka ulang & tetap jalan saat offline.
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    db = getFirestore(app); // sudah diinisialisasi (mis. setelah hot reload)
  }
  return db;
}
