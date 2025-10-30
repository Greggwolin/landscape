'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/app/components/CoreUIThemeProvider';
import { GLOBAL_NAV_LINKS } from './navigation/constants';
import SandboxDropdown from './navigation/SandboxDropdown';
import UserMenuDropdown from './navigation/UserMenuDropdown';
import SettingsDropdown from './navigation/SettingsDropdown';
import LandscaperChatModal from './LandscaperChatModal';

/**
 * TopNavigationBar - Tier 1 Global Navigation
 *
 * Renders the primary navigation bar with:
 * - Logo (left)
 * - Global links: Dashboard, Documents (right-aligned)
 * - Landscaper AI button
 * - Sandbox dropdown
 * - User menu
 * - Settings dropdown
 * - Theme toggle
 *
 * Height: 58px
 * Background: var(--cui-sidebar-bg) (dark)
 * Position: Sticky top
 */
export default function TopNavigationBar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [isLandscaperOpen, setLandscaperOpen] = useState(false);

  return (
    <>
      <header
        className="sticky top-0"
        style={{ backgroundColor: 'var(--cui-sidebar-bg)', zIndex: 50 }}
      >
        <div
          className="flex items-center justify-between px-6 border-b"
          style={{
            borderColor: 'var(--cui-sidebar-border-color)',
            height: '58px',
          }}
        >
          {/* Logo - Left */}
          <Link href="/" className="flex items-center">
            <Image
              src="/logo-invert.png"
              alt="Landscape"
              width={140}
              height={32}
              className="h-8 w-auto object-contain"
            />
          </Link>

          {/* Navigation Items - Right */}
          <div className="flex items-center gap-3">
            {/* Global Navigation Links */}
            {GLOBAL_NAV_LINKS.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                className="px-3 py-2 text-sm transition-colors"
                style={{
                  color:
                    pathname === link.href
                      ? 'var(--cui-primary)'
                      : 'var(--cui-sidebar-nav-link-color)',
                  fontWeight: pathname === link.href ? '600' : '400',
                }}
              >
                {link.label}
              </Link>
            ))}

            {/* Landscaper AI Button */}
            <button
              type="button"
              onClick={() => setLandscaperOpen(true)}
              className="px-3 py-2 text-sm transition-colors"
              style={{ color: 'var(--cui-sidebar-nav-link-color)' }}
            >
              Landscaper AI
            </button>

            {/* Dropdowns */}
            <SandboxDropdown />
            <UserMenuDropdown />
            <SettingsDropdown />

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-full border px-3 py-2 text-sm font-medium transition-colors"
              style={{
                borderColor: 'var(--cui-sidebar-border-color)',
                color: 'var(--cui-sidebar-nav-link-color)',
                backgroundColor: 'transparent',
              }}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
            </button>
          </div>
        </div>
      </header>

      {/* Landscaper AI Modal */}
      <LandscaperChatModal
        isOpen={isLandscaperOpen}
        onClose={() => setLandscaperOpen(false)}
      />
    </>
  );
}
