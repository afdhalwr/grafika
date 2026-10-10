'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { CHALLENGE_COPY, loadFaceLandmarker, pickChallenges, readFace, START, step, type Progress } from '@/lib/liveness';

const CHALLENGE_MS = 10_000;

type Status =
  | { kind: 'loading' }
  | { kind: 'running'; hint: string }
  | { kind: 'success' }
  | { kind: 'error'; msg: string };

/** Kesalahan yang pesannya memang untuk pengguna. */
class FriendlyError extends Error {}

function cameraMessage(err: unknown): string {
  if (err instanceof FriendlyError) return err.message;
  const name = err instanceof DOMException ? err.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError': return 'Izin kamera ditolak. Izinkan akses kamera di pengaturan peramban, lalu coba lagi.';
    case 'NotFoundError':
    case 'OverconstrainedError': return 'Kamera tidak ditemukan di perangkat ini.';
    case 'NotReadableError': return 'Kamera sedang dipakai aplikasi lain. Tutup aplikasinya, lalu coba lagi.';
    default:
      console.error(err);
      return 'Gagal memuat pendeteksi wajah. Periksa koneksi internetmu, lalu coba lagi.';
  }
}

/** Langkah verifikasi wajah sebelum akun dibuat. `onVerified` dipanggil sekali setelah semua tantangan lolos. */
export function FaceVerifyModal({ open, onClose, onVerified }: { open: boolean; onClose: () => void; onVerified: () => void }) {
  // Isi modal dilepas saat ditutup, jadi tiap dibuka otomatis mulai ulang; `attempt` untuk tombol "Coba lagi".
  const [attempt, setAttempt] = useState(0);

  return (
    <Modal open={open} onClose={onClose} title="Verifikasi wajah" closeOnBackdrop={false}>
      <FaceCheck key={attempt} onClose={onClose} onRetry={() => setAttempt(a => a + 1)} onVerified={onVerified} />
    </Modal>
  );
}

function FaceCheck({ onClose, onRetry, onVerified }: { onClose: () => void; onRetry: () => void; onVerified: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [challenges] = useState(() => pickChallenges());
  const [current, setCurrent] = useState(0);
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [deadline, setDeadline] = useState(0);
  const verified = useRef(onVerified);
  verified.current = onVerified;

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let raf = 0;
    let doneTimer = 0;
    const stop = () => {
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach(t => t.stop());
    };

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new FriendlyError('Kamera hanya bisa dipakai lewat koneksi aman (HTTPS).');
        }
        const [media, landmarker] = await Promise.all([
          navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false }),
          loadFaceLandmarker(),
        ]);
        stream = media;
        if (cancelled) return stop();
        const video = videoRef.current!;
        video.srcObject = media;
        await video.play();
        if (cancelled) return stop();

        let index = 0;
        let progress: Progress = START;
        let until = performance.now() + CHALLENGE_MS;
        let lastTime = -1;
        setDeadline(Date.now() + CHALLENGE_MS);
        setStatus({ kind: 'running', hint: 'Arahkan wajahmu ke dalam bingkai' });

        const tick = () => {
          if (cancelled) return;
          const now = performance.now();
          if (now > until) {
            stop();
            setStatus({ kind: 'error', msg: 'Waktu habis. Pastikan wajahmu terang dan terlihat jelas, lalu coba lagi.' });
            return;
          }
          if (video.readyState >= 2 && video.currentTime !== lastTime) {
            lastTime = video.currentTime;
            const face = readFace(landmarker.detectForVideo(video, now));
            let hint = CHALLENGE_COPY[challenges[index]];
            if (face.faces === 0) hint = 'Arahkan wajahmu ke dalam bingkai';
            else if (face.faces > 1) hint = 'Pastikan hanya ada satu wajah di kamera';
            else if (!face.framed) hint = 'Posisikan wajahmu di tengah bingkai, sedikit lebih dekat';
            else {
              progress = step(challenges[index], face, progress);
              if (progress.stage === 'neutral') hint = 'Lihat lurus ke kamera';
            }

            if (progress.stage === 'done') {
              index += 1;
              setCurrent(index);
              if (index === challenges.length) {
                stop();
                setStatus({ kind: 'success' });
                doneTimer = window.setTimeout(() => verified.current(), 700);
                return;
              }
              progress = START;
              until = now + CHALLENGE_MS;
              setDeadline(Date.now() + CHALLENGE_MS);
            }
            setStatus(s => (s.kind === 'running' && s.hint === hint ? s : { kind: 'running', hint }));
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch (err) {
        stop();
        if (!cancelled) setStatus({ kind: 'error', msg: cameraMessage(err) });
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(doneTimer);
      stop();
    };
  }, [challenges]);

  const ring = status.kind === 'success' ? 'border-good' : status.kind === 'error' ? 'border-bad' : 'border-white/90';

  return (
    <>
      <div className="modal-body">
        <p className="mb-4 text-fg-2">Kami perlu memastikan kamu orang sungguhan. Semua diproses di perangkatmu; video tidak disimpan atau dikirim.</p>

        <div className="relative mx-auto aspect-[4/3] max-w-[calc(50dvh*4/3)] overflow-hidden rounded-2xl bg-surface-2">
          <video ref={videoRef} className="h-full w-full -scale-x-100 object-cover" playsInline muted aria-label="Pratinjau kamera" />
          <div aria-hidden className={`pointer-events-none absolute top-1/2 left-1/2 h-[80%] w-[48%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-[3px] shadow-[0_0_0_9999px_rgba(13,16,32,0.45)] transition-colors ${ring}`} />
          {status.kind === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm font-semibold text-white">
              <span className="spinner" aria-hidden /> Menyiapkan kamera…
            </div>
          )}
          {status.kind === 'success' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="grid size-16 place-items-center rounded-full bg-good text-white anim-in"><Icon name="check" size={32} /></span>
            </div>
          )}
          {status.kind === 'running' && (
            <TimerBar key={deadline} deadline={deadline} />
          )}
        </div>

        <p className="mt-4 min-h-6 text-center font-bold" role="status" aria-live="polite">
          {status.kind === 'running' && status.hint}
          {status.kind === 'success' && <span className="text-good">Verifikasi berhasil!</span>}
        </p>

        {status.kind === 'error' ? (
          <div role="alert" className="mt-3 flex items-start gap-2.5 rounded-xl bg-bad-soft px-3.5 py-3 text-sm font-semibold text-bad">
            <Icon name="alert" /> <span>{status.msg}</span>
          </div>
        ) : (
          <ol className="mt-3 grid gap-2 text-sm">
            {challenges.map((ch, i) => (
              <li key={ch} className={`flex items-center gap-2.5 font-semibold ${i < current ? 'text-good' : i === current ? 'text-fg' : 'text-muted'}`}>
                <span className={`grid size-6 place-items-center rounded-full text-xs ${i < current ? 'bg-good-soft' : 'bg-surface-2'}`}>
                  {i < current ? <Icon name="check" size={14} /> : i + 1}
                </span>
                {CHALLENGE_COPY[ch]}
              </li>
            ))}
          </ol>
        )}
      </div>
      <div className="modal-foot">
        <button className="btn btn-outline" type="button" onClick={onClose}>Batal</button>
        {status.kind === 'error' && (
          <button className="btn btn-primary" type="button" onClick={onRetry}>Coba lagi</button>
        )}
      </div>
    </>
  );
}

/** Garis sisa waktu untuk tantangan yang sedang berjalan. */
function TimerBar({ deadline }: { deadline: number }) {
  const [left, setLeft] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, (deadline - Date.now()) / CHALLENGE_MS)), 100);
    return () => clearInterval(id);
  }, [deadline]);
  return (
    <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/30">
      <div className="h-full bg-primary transition-[width] duration-100 ease-linear" style={{ width: `${left * 100}%` }} />
    </div>
  );
}
