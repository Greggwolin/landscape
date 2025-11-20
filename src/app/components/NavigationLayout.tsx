'use client';

import React, { useState } from 'react';
import TopNavigationBar from './TopNavigationBar';
import { AdminModal } from '@/components/admin';

/**
 * NavigationLayout
 *
 * Global layout wrapper that provides top navigation to all pages.
 * Can be disabled on specific pages via hideNavigation prop.
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

  if (hideNavigation) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopNavigationBar onSettingsClick={() => setAdminModalOpen(true)} />
      <main className="flex-1">{children}</main>

      {/* Admin Modal - Global Overlay */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setAdminModalOpen(false)}
      />
    </div>
  );
}
