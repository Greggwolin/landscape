'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import TopNavigationBar from './TopNavigationBar';
import { AdminModal } from '@/components/admin';

// Auth routes that should not show navigation
const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password'];

/**
 * NavigationLayout
 *
 * Global layout wrapper that provides top navigation to all pages.
 * Automatically hides navigation on auth pages (/login, /register, etc.)
 * Manages AdminModal state for system administration.
 *
 * @param children - Page content to render
 * @param hideNavigation - Optional flag to hide navigation (for auth pages, etc.)
 */
interface NavigationLayoutProps {
  children: React.ReactNode;
  hideNavigation?: boolean;
}

export default function NavigationLayout({
  children,
  hideNavigation = false,
}: NavigationLayoutProps) {
  const [isAdminModalOpen, setAdminModalOpen] = useState(false);
  const pathname = usePathname();

  // Auto-hide navigation on auth routes
  const isAuthRoute = AUTH_ROUTES.some(route => pathname?.startsWith(route));

  if (hideNavigation || isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopNavigationBar onSettingsClick={() => setAdminModalOpen(true)} />
      <main className="flex-1 app-shell">{children}</main>

      {/* Admin Modal - Global Overlay */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setAdminModalOpen(false)}
      />
    </div>
  );
}
