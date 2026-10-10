/* Salin file wasm MediaPipe (pendeteksi wajah saat daftar) ke public/ supaya disajikan dari situs ini
 * sendiri — versinya otomatis sama dengan paket yang terpasang, dan CSP tidak perlu dibuka ke CDN. */

import { copyFileSync, mkdirSync } from 'node:fs';

const from = 'node_modules/@mediapipe/tasks-vision/wasm';
const to = 'public/mediapipe/wasm';
const files = ['vision_wasm_internal.js', 'vision_wasm_internal.wasm', 'vision_wasm_nosimd_internal.js', 'vision_wasm_nosimd_internal.wasm'];

mkdirSync(to, { recursive: true });
for (const f of files) copyFileSync(`${from}/${f}`, `${to}/${f}`);
console.log(`MediaPipe wasm disalin ke ${to}`);
