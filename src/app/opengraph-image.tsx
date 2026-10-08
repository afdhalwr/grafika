/* Gambar pratinjau saat tautan dibagikan (WhatsApp, LinkedIn, X, dll.). Dibuat saat build. */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'Grafika — ubah catatan angka harian jadi grafik interaktif dan wawasan otomatis';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const font = (weight: number) =>
  readFile(join(process.cwd(), `node_modules/@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-${weight}-normal.woff`));

// Garis tren contoh (0–100 → koordinat kanvas grafik 440×170)
const POINTS = [38, 46, 42, 55, 50, 62, 58, 70, 66, 61, 74, 82, 77, 90];
const path = POINTS.map((v, i) => `${i ? 'L' : 'M'}${(i / (POINTS.length - 1)) * 440} ${170 - v * 1.6}`).join(' ');

export default async function OpengraphImage() {
  const [w600, w800] = await Promise.all([font(600), font(800)]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', alignItems: 'center', padding: '0 72px', gap: 56,
          fontFamily: 'Jakarta', color: '#1b1f3b',
          backgroundColor: '#f5f6fb',
          backgroundImage: 'radial-gradient(circle at 92% 8%, #d9d7ff 0%, rgba(217,215,255,0) 45%), radial-gradient(circle at 0% 100%, #ffe0ec 0%, rgba(255,224,236,0) 40%)',
        }}
      >
        {/* teks */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #6d6dfb 0%, #9b6dfb 55%, #ef8fb3 100%)' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M4 19V11M10 19V5M16 19v-6M22 19H2" /></svg>
            </div>
            <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1 }}>Grafika</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 36, fontSize: 60, fontWeight: 800, lineHeight: 1.08, letterSpacing: -2.2 }}>
            <span>Ubah deretan angka jadi</span>
            <span style={{ backgroundImage: 'linear-gradient(100deg, #5b5bf7 10%, #b06bf5 55%, #ec6a9c 95%)', backgroundClip: 'text', color: 'transparent' }}>cerita yang mudah dipahami.</span>
          </div>
          <span style={{ marginTop: 24, fontSize: 25, fontWeight: 600, color: '#4a5070', lineHeight: 1.4 }}>
            Grafik interaktif, ringkasan KPI, dan wawasan otomatis dari catatan harianmu.
          </span>
          <div style={{ display: 'flex', gap: 10, marginTop: 34 }}>
            {['Grafik interaktif', 'Wawasan otomatis', 'Aman & privat'].map(t => (
              <span key={t} style={{ fontSize: 19, fontWeight: 600, color: '#4a5070', background: '#fff', border: '1.5px solid #e3e6f1', borderRadius: 999, padding: '7px 16px' }}>{t}</span>
            ))}
          </div>
        </div>

        {/* kartu grafik */}
        <div style={{ width: 480, display: 'flex', flexDirection: 'column', padding: 20, borderRadius: 28, background: '#fff', border: '1.5px solid #e3e6f1', boxShadow: '0 30px 70px -20px rgba(27,31,59,.28)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 17, fontWeight: 600, color: '#7a809f' }}>Penjualan · 30 hari</span>
              <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1.5 }}>Rp 38 jt</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 17, fontWeight: 800, color: '#0f8a4a', background: '#e2f6ea', borderRadius: 999, padding: '5px 12px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0f8a4a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 7l-8.5 8.5-5-5L2 17M16 7h6v6" /></svg>
              18,4%
            </div>
          </div>
          <svg width="440" height="180" viewBox="0 0 440 180" style={{ marginTop: 12 }}>
            <defs>
              <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#5b5bf7" stopOpacity="0.28" />
                <stop offset="1" stopColor="#5b5bf7" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${path} L440 180 L0 180 Z`} fill="url(#fill)" />
            <path d={path} fill="none" stroke="#5b5bf7" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            {[['#2a78d6', 'Kopi', '39%'], ['#1baf7a', 'Makanan', '27%'], ['#eb6834', 'Non-kopi', '22%']].map(([c, label, pct]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, background: '#f0f2f9', borderRadius: 12, padding: '9px 9px', fontSize: 14, fontWeight: 600, color: '#4a5070', whiteSpace: 'nowrap' }}>
                <div style={{ width: 9, height: 9, borderRadius: 3, background: c, flexShrink: 0 }} />
                <span>{label}</span>
                <span style={{ marginLeft: 'auto', color: '#1b1f3b', fontWeight: 800 }}>{pct}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Jakarta', data: w600, weight: 600, style: 'normal' },
        { name: 'Jakarta', data: w800, weight: 800, style: 'normal' },
      ],
    },
  );
}
