'use client';

import { useEffect, useState } from 'react';
import { Brand } from '@/components/Brand';

const QUOTES = [
  ['"Tanpa data, kamu hanyalah orang lain dengan sebuah pendapat."', '— W. Edwards Deming'],
  ['"Apa yang diukur, akan dikelola."', '— Peter Drucker'],
  ['"Grafik yang baik membuat hal rumit terasa sederhana."', '— Tim Grafika'],
];

/** Panel ilustrasi di kiri halaman masuk (disembunyikan di layar kecil). */
export function AuthArt() {
  const [qi, setQi] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let swap: ReturnType<typeof setTimeout>;
    const id = setInterval(() => {
      if (document.hidden) return;
      setFading(true);
      swap = setTimeout(() => { setQi(i => (i + 1) % QUOTES.length); setFading(false); }, 400);
    }, 6000);
    return () => { clearInterval(id); clearTimeout(swap); };
  }, []);

  return (
    <aside className="auth-art relative flex flex-col justify-between overflow-hidden px-11 py-9 text-white max-lg:hidden" aria-hidden="true">
      <Brand light className="relative" />

      <div className="relative my-6 h-[340px]">
        <div className="glass floaty absolute top-1/2 left-1/2 w-[min(360px,90%)] [transform:translate(-50%,-50%)] p-[22px]">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-semibold opacity-85">Pengunjung minggu ini</span>
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold">▲ 24%</span>
          </div>
          <p className="mt-1 mb-2 text-[34px] font-extrabold tracking-[-0.03em]">12.480</p>
          <svg className="h-[90px] w-full" viewBox="0 0 300 90" preserveAspectRatio="none">
            <defs>
              <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#fff" stopOpacity=".45" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path className="spark-area" d="M0 70 C30 60 45 72 70 55 S115 30 140 42 S185 62 210 34 S260 12 300 18 L300 90 L0 90Z" fill="url(#sparkFill)" />
            <path className="spark-line" d="M0 70 C30 60 45 72 70 55 S115 30 140 42 S185 62 210 34 S260 12 300 18" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
        <div className="glass floaty absolute top-0 left-[2%] flex flex-col items-center gap-2.5 px-[18px] py-4 [animation-delay:-2s] [animation-duration:6s]">
          <div className="art-bars flex h-14 items-end gap-1.5">
            {[40, 65, 52, 88, 70].map((h, i) => (
              <span key={i} style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
          <span className="text-[12.5px] font-semibold opacity-85">Per hari</span>
        </div>
        <div className="glass floaty absolute right-[2%] bottom-0 flex flex-col items-center gap-2.5 px-[18px] py-4 [animation-delay:-4s] [animation-duration:6.5s]">
          <div className="art-donut" />
          <span className="text-[12.5px] font-semibold opacity-85">Kategori</span>
        </div>
      </div>

      <div className="relative max-w-[440px]">
        <p className={`text-[19px] leading-[1.45] font-semibold transition-opacity duration-400 ${fading ? 'opacity-0' : ''}`}>{QUOTES[qi][0]}</p>
        <span className={`mt-2 block text-sm opacity-80 transition-opacity duration-400 ${fading ? 'opacity-0!' : ''}`}>{QUOTES[qi][1]}</span>
        <div className="mt-[18px] flex gap-1.5">
          {QUOTES.map((_, i) => (
            <i key={i} className={`h-[7px] rounded-full transition-all duration-300 ${i === qi ? 'w-[22px] bg-white' : 'w-[7px] bg-white/40'}`} />
          ))}
        </div>
      </div>
    </aside>
  );
}
