'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import TopNavigationBar from './TopNavigationBar';
import { AdminModal } from '@/components/admin';
import HelpLandscaperPanel from '@/components/help/HelpLandscaperPanel';
import { useHelpLandscaper } from '@/contexts/HelpLandscaperContext';

// Auth routes that should not show navigation
const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password'];

/**
 * NavigationLayout
 *
 * Global layout wrapper that provides top navigation to all pages.
 * Automatically hides navigation on auth pages (/login, /register, etc.)
 * Manages AdminModal state for system administration.
 * Renders the Help Landscaper flyout panel and compresses main content when open.
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
  const { isOpen: isHelpOpen } = useHelpLandscaper();

  // Auto-hide navigation on auth routes
  const isAuthRoute = AUTH_ROUTES.some(route => pathname?.startsWith(route));

  if (hideNavigation || isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopNavigationBar onSettingsClick={() => setAdminModalOpen(true)} />
      <main
        className={`flex-1 app-shell ${isHelpOpen ? 'help-content-compressed' : 'help-content-normal'}`}
      >
        {children}
      </main>

      {/* Help Landscaper - Global Flyout Panel */}
      <HelpLandscaperPanel />

      {/* Admin Modal - Global Overlay */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setAdminModalOpen(false)}
      />
    </div>
  );
}
