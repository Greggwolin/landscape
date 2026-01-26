'use client';

import { Suspense } from 'react';
import LoginForm from './LoginForm';

// Loading fallback for Suspense
function LoginLoading() {
  return (
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  );
}
