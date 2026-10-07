import { Brand } from './Brand';
import { Icon } from './Icon';

/** Ditampilkan jika .env.local belum berisi konfigurasi Firebase. */
export function SetupNotice() {
  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <div className="card w-full max-w-[560px] p-7">
        <Brand />
        <div className="mt-6 flex items-start gap-3 rounded-xl bg-lemon-soft p-4 text-sm font-semibold text-fg">
          <span className="text-lemon"><Icon name="alert" /></span>
          Firebase belum diatur, jadi fitur masuk & dasbor belum bisa dipakai.
        </div>
        <ol className="mt-5 list-decimal space-y-2 pl-5 text-[14.5px] text-fg-2">
          <li>Buka Firebase Console → <b>Project settings</b> → <b>Your apps</b> → tambah <b>Web app</b>.</li>
          <li>Salin nilai <code>firebaseConfig</code> ke file <code>.env.local</code> (contoh ada di <code>.env.example</code>).</li>
          <li>Aktifkan <b>Authentication → Sign-in method → Email/Password</b>.</li>
          <li>Tempel isi <code>firestore.rules</code> ke <b>Firestore → Rules</b>, lalu <b>Publish</b>.</li>
          <li>Jalankan ulang <code>npm run dev</code>.</li>
        </ol>
      </div>
    </div>
  );
}
