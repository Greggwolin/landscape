// app/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--cui-body-bg)', color: 'var(--cui-body-color)' }}>
      <div style={{ color: 'var(--cui-secondary-color)' }}>Redirecting to dashboard...</div>
    </div>
  );
}
