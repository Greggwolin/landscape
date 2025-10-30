'use client';

import React from 'react';
import TopNavigationBar from './TopNavigationBar';

/**
 * NavigationLayout
 *
 * Global layout wrapper that provides top navigation to all pages.
 * Can be disabled on specific pages via hideNavigation prop.
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
  if (hideNavigation) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopNavigationBar />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
