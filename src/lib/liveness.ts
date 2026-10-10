/* Cek orang asli saat daftar: deteksi wajah + tantangan kedip/toleh, semuanya di peramban (MediaPipe).
 * Video tidak pernah dikirim ke mana pun. Karena berjalan di sisi klien, ini penghalang bot & UX,
 * bukan pengaman yang tidak bisa diakali. */

import type { FaceLandmarker, FaceLandmarkerOptions, FaceLandmarkerResult } from '@mediapipe/tasks-vision';

// File wasm disalin dari node_modules ke public/ oleh scripts/copy-mediapipe.mjs (predev/prebuild).
const WASM_PATH = '/mediapipe/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

let loading: Promise<FaceLandmarker> | null = null;

/** Muat pendeteksi wajah sekali saja; dipakai ulang untuk percobaan berikutnya. */
export function loadFaceLandmarker() {
  loading ??= (async () => {
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
    const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
    const options = (delegate: 'GPU' | 'CPU'): FaceLandmarkerOptions => ({
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: 'VIDEO',
      numFaces: 2, // cukup untuk tahu "lebih dari satu wajah"
      outputFaceBlendshapes: true,
    });
    try {
      return await FaceLandmarker.createFromOptions(fileset, options('GPU'));
    } catch {
      return FaceLandmarker.createFromOptions(fileset, options('CPU')); // WebGL tidak tersedia
    }
  })().catch(err => {
    loading = null; // izinkan coba lagi
    throw err;
  });
  return loading;
}

/* ---------- membaca satu frame ---------- */

export type FaceRead = {
  faces: number;
  /** -0.5..0.5; positif = pengguna menoleh ke kirinya sendiri. */
  yaw: number;
  /** 0..1; skor mata tertutup (yang paling terbuka dari kedua mata). */
  blink: number;
  /** Wajah cukup besar dan berada di tengah bingkai. */
  framed: boolean;
};

const NOSE_TIP = 1;
const CHEEK_A = 234;
const CHEEK_B = 454;

export function readFace(res: FaceLandmarkerResult): FaceRead {
  const faces = res.faceLandmarks.length;
  if (faces !== 1) return { faces, yaw: 0, blink: 0, framed: false };

  const pts = res.faceLandmarks[0];
  const nose = pts[NOSE_TIP];
  const lo = Math.min(pts[CHEEK_A].x, pts[CHEEK_B].x);
  const hi = Math.max(pts[CHEEK_A].x, pts[CHEEK_B].x);
  const width = hi - lo;
  // Gambar kamera belum dicerminkan: kiri pengguna ada di kanan gambar, jadi hidung bergeser ke x besar.
  const yaw = width > 0 ? (nose.x - lo) / width - 0.5 : 0;

  const score = (name: string) => res.faceBlendshapes[0]?.categories.find(c => c.categoryName === name)?.score ?? 0;
  const blink = Math.min(score('eyeBlinkLeft'), score('eyeBlinkRight'));

  const cx = (lo + hi) / 2;
  const framed = width > 0.18 && cx > 0.3 && cx < 0.7 && nose.y > 0.25 && nose.y < 0.75;
  return { faces, yaw, blink, framed };
}

/* ---------- tantangan ---------- */

export type Challenge = 'blink' | 'left' | 'right';

export const CHALLENGE_COPY: Record<Challenge, string> = {
  blink: 'Kedipkan kedua matamu',
  left: 'Toleh perlahan ke kiri',
  right: 'Toleh perlahan ke kanan',
};

/** Ambil n tantangan acak yang berbeda, supaya rekaman video lama tidak bisa dipakai ulang. */
export function pickChallenges(n = 2): Challenge[] {
  const all: Challenge[] = ['blink', 'left', 'right'];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, n);
}

const EYES_OPEN = 0.25;
const EYES_CLOSED = 0.5;
const FACING_FRONT = 0.08;
const TURNED = 0.17;
const HOLD_FRAMES = 4;

/** Kemajuan satu tantangan: mulai dari posisi netral, lalu gerakan yang diminta. */
export type Progress = { stage: 'neutral' | 'acting' | 'closed' | 'done'; frames: number };

export const START: Progress = { stage: 'neutral', frames: 0 };

export function step(ch: Challenge, f: FaceRead, p: Progress): Progress {
  if (p.stage === 'done') return p;
  const front = Math.abs(f.yaw) < FACING_FRONT;

  if (ch === 'blink') {
    if (p.stage === 'neutral') return front && f.blink < EYES_OPEN ? { stage: 'acting', frames: 0 } : p;
    if (p.stage === 'acting') return f.blink > EYES_CLOSED ? { stage: 'closed', frames: 0 } : p;
    return f.blink < EYES_OPEN ? { stage: 'done', frames: 0 } : p; // mata terbuka lagi = satu kedipan
  }

  if (p.stage === 'neutral') return front ? { stage: 'acting', frames: 0 } : p;
  const turned = ch === 'left' ? f.yaw > TURNED : f.yaw < -TURNED;
  const frames = turned ? p.frames + 1 : 0; // harus ditahan beberapa frame berturut-turut
  return frames >= HOLD_FRAMES ? { stage: 'done', frames } : { stage: 'acting', frames };
}
