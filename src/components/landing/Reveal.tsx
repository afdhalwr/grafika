'use client';

import { useEffect } from 'react';

/** Animasi muncul saat digulir untuk setiap elemen `.reveal`, plus penghitung angka `[data-count]`. */
export function RevealObserver() {
  useEffect(() => {
    const root = document.documentElement;
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const animateCount = (el: HTMLElement) => {
      const target = Number(el.dataset.count);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      if (reduceMotion) { el.textContent = prefix + target + suffix; return; }
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / 1200);
        el.textContent = prefix + Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const show = (el: Element) => {
      if (el.classList.contains('in')) return;
      el.classList.add('in');
      el.querySelectorAll<HTMLElement>('[data-count]').forEach(animateCount);
    };

    const els = [...document.querySelectorAll<HTMLElement>('.reveal')];
    if (reduceMotion || !('IntersectionObserver' in window)) {
      els.forEach(show);
      return;
    }

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        show(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15 });

    els.forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i % 6, 5) * 60}ms`;
      // yang sudah terlihat di layar langsung ditampilkan, tanpa menunggu observer
      if (el.getBoundingClientRect().top < window.innerHeight) show(el);
      else io.observe(el);
    });
    root.classList.add('reveal-ready');

    return () => { io.disconnect(); root.classList.remove('reveal-ready'); };
  }, []);

  return null;
}
