'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/app/components/CoreUIThemeProvider';
import { useIssueReporter } from '@/components/IssueReporter';
import { GLOBAL_NAV_LINKS } from './navigation/constants';
import SandboxDropdown from './navigation/SandboxDropdown';
import UserMenuDropdown from './navigation/UserMenuDropdown';
import SettingsDropdown from './navigation/SettingsDropdown';
import LandscaperChatModal from './LandscaperChatModal';
import CIcon from '@coreui/icons-react';
import { cilBug } from '@coreui/icons';

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
 * Background: var(--nav-bg)
 * Position: Sticky top
 */
export default function TopNavigationBar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { openReporterWithLatestTarget, hasTargetContext, lastTargetLabel } = useIssueReporter();
  const [isLandscaperOpen, setLandscaperOpen] = useState(false);
  const [showBugHint, setShowBugHint] = useState(false);
  const logoSrc = '/logo-invert.png';

  const navHoverHandlers = (isActive = false) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.background = isActive
        ? 'var(--nav-active-bg)'
        : 'var(--nav-hover-bg)';
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.background = isActive
        ? 'var(--nav-active-bg)'
        : 'transparent';
    },
  });

  const handleBugButtonClick = () => {
    const opened = openReporterWithLatestTarget({ issueType: 'bug' });
    if (!opened) {
      setShowBugHint(true);
      window.setTimeout(() => setShowBugHint(false), 2500);
    }
  };

  return (
    <>
      <header
        className="sticky top-0 border-b"
        style={{
          background: 'var(--nav-bg)',
          borderColor: 'var(--nav-border)',
          color: 'var(--nav-text)',
          zIndex: 50,
        }}
      >
        <div
          className="flex items-center justify-between px-6"
          style={{ height: '58px' }}
        >
          {/* Logo - Left */}
          <Link href="/" className="flex items-center">
            <Image
              src={logoSrc}
              alt="Landscape"
              width={176}
              height={40}
              priority
              className="object-contain"
              style={{ width: 'auto', height: 'auto' }}
              sizes="176px"
            />
          </Link>

          {/* Navigation Items - Right */}
          <div className="flex items-center gap-3">
            {/* Global Navigation Links */}
            {GLOBAL_NAV_LINKS.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                className="rounded-full px-3 py-2 text-sm transition-colors"
                style={{
                  color: pathname === link.href ? 'var(--nav-brand)' : 'var(--nav-text)',
                  backgroundColor:
                    pathname === link.href ? 'var(--nav-active-bg)' : 'transparent',
                  fontWeight: pathname === link.href ? '600' : '400',
                }}
                {...navHoverHandlers(pathname === link.href)}
              >
                {link.label}
              </Link>
            ))}

            {/* Landscaper AI Button */}
            <button
              type="button"
              onClick={() => setLandscaperOpen(true)}
              className="rounded-full px-3 py-2 text-sm transition-colors"
              style={{ color: 'var(--nav-text)' }}
              {...navHoverHandlers()}
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
                borderColor: 'var(--nav-border)',
                color: 'var(--nav-text)',
                backgroundColor: 'transparent',
              }}
              {...navHoverHandlers()}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
            </button>

            {/* Bug/Issues Icon Button */}
            <div className="relative flex flex-col items-end">
              <button
                type="button"
                data-issue-reporter-ignore="true"
                onClick={handleBugButtonClick}
                className="rounded-full p-2 transition-colors"
                style={{ color: hasTargetContext ? 'var(--nav-text)' : 'var(--nav-border)' }}
                {...navHoverHandlers()}
                aria-label={
                  hasTargetContext
                    ? `Report a bug for ${lastTargetLabel ?? 'the selected element'}`
                    : 'Click any UI element first, then tap the bug icon'
                }
                title={
                  hasTargetContext
                    ? 'Report a bug for the last element you interacted with'
                    : 'Click the target element first, then tap this icon'
                }
              >
                <CIcon icon={cilBug} size="lg" />
              </button>
              {!hasTargetContext && showBugHint && (
                <div
                  data-issue-reporter-ignore="true"
                  className="absolute right-0 top-full mt-2 rounded-md bg-slate-800 px-3 py-1 text-xs font-medium text-white shadow-lg"
                >
                  Click a UI element first, then tap the bug icon.
                </div>
              )}
            </div>
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
