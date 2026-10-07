'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { FullPageSpinner } from '@/components/Brand';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { SetupNotice } from '@/components/SetupNotice';

export default function DashboardPage() {
  const { user, configured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (configured && user === null) router.replace('/login');
  }, [configured, user, router]);

  if (!configured) return <SetupNotice />;
  if (!user) return <FullPageSpinner label={user === null ? 'Mengalihkan ke halaman masuk…' : 'Memeriksa sesi…'} />;
  return <Dashboard key={user.uid} user={user} />;
}
