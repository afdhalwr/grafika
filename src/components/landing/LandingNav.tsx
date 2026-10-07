'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Brand } from '@/components/Brand';
import { Icon } from '@/components/Icon';
import { ThemeToggle } from '@/components/theme';
import { firstName } from '@/lib/format';

const LINKS = [
  ['#fitur', 'Fitur'],
  ['#cara-kerja', 'Cara kerja'],
  ['#coba', 'Coba langsung'],
  ['#faq', 'FAQ'],
] as const;

export function LandingNav() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onClick = (e: MouseEvent) => { if (!navRef.current?.contains(e.target as Node)) setOpen(false); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, []);

  const name = user?.displayName ? firstName(user.displayName) : null;

  return (
    <header
      ref={navRef}
      className={`sticky top-0 z-50 transition-[background-color,box-shadow] duration-300 ${
        scrolled ? 'bg-bg/80 shadow-[0_1px_0_var(--border)] backdrop-blur-md backdrop-saturate-150' : ''
      }`}
    >
      <div className="wrap flex h-[72px] items-center gap-6 short:h-16">
        <Brand />
        <nav
          id="navLinks"
          aria-label="Navigasi utama"
          className={`ml-auto flex gap-1.5 max-lg:invisible max-lg:absolute max-lg:inset-x-4 max-lg:top-[72px] max-lg:flex-col max-lg:gap-0.5 max-lg:rounded-[18px] max-lg:border max-lg:border-line max-lg:bg-surface max-lg:p-2.5 max-lg:opacity-0 max-lg:shadow-deep max-lg:transition-all max-lg:-translate-y-2 ${
            open ? 'max-lg:visible! max-lg:opacity-100! max-lg:translate-y-0!' : ''
          }`}
        >
          {LINKS.map(([href, label]) => (
            <a
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="rounded-[10px] px-3.5 py-2 text-[14.5px] font-semibold text-fg-2 no-underline hover:bg-surface-2 hover:text-fg max-lg:py-3"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2 max-lg:ml-auto">
          <ThemeToggle />
          <Link className="btn btn-ghost max-lg:hidden" href={user ? '/dashboard' : '/login'}>
            {name ? `Hai, ${name}` : 'Masuk'}
          </Link>
          <Link className="btn btn-primary max-sm:hidden" href={user ? '/dashboard' : '/login#daftar'}>
            {user ? 'Buka dasbor' : 'Mulai gratis'}
          </Link>
          <button
            className="icon-btn lg:hidden"
            type="button"
            aria-label={open ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={open}
            aria-controls="navLinks"
            onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
          >
            <Icon name={open ? 'x' : 'menu'} />
          </button>
        </div>
      </div>
    </header>
  );
}
