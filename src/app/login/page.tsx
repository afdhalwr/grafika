import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FullPageSpinner } from '@/components/Brand';
import { LoginScreen } from '@/components/auth/LoginScreen';

export const metadata: Metadata = {
  title: 'Masuk',
  description: 'Masuk atau buat akun Grafika untuk mulai mengubah angka menjadi grafik.',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <LoginScreen />
    </Suspense>
  );
}
