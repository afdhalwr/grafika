import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { AuthProvider } from '@/components/AuthProvider';
import { themeInitScript } from '@/components/theme';
import { ToastProvider } from '@/components/Toast';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Grafika — Statistik yang Enak Dilihat', template: '%s — Grafika' },
  description:
    'Grafika mengubah catatan angka harianmu menjadi grafik interaktif dan wawasan otomatis. Gratis, cepat, dan tersimpan aman di cloud.',
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='9' fill='%235b5bf7'/%3E%3Cpath d='M9 23v-7M16 23V9M23 23v-9' stroke='white' stroke-width='3' stroke-linecap='round'/%3E%3C/svg%3E",
  },
};

export const viewport: Viewport = { themeColor: '#5b5bf7' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={jakarta.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
