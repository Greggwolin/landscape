'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/app/components/CoreUIThemeProvider';
import { useIssueReporter } from '@/components/IssueReporter';
import { useAuth } from '@/contexts/AuthContext';
import { GLOBAL_NAV_LINKS } from './navigation/constants';
import UserMenuDropdown from './navigation/UserMenuDropdown';
import CIcon from '@coreui/icons-react';
import { cilBug, cilSettings, cilMoon, cilSun, cilLifeRing } from '@coreui/icons';
import { useHelpLandscaper } from '@/contexts/HelpLandscaperContext';

/**
 * TopNavigationBar - Tier 1 Global Navigation
 *
 * Renders the primary navigation bar with:
 * - Logo (left)
 * - Global links: Dashboard, Documents (right-aligned)
 * - Theme toggle
 * - Bug report button (admin users only)
 * - Settings button (opens AdminModal)
 * - User menu (far right)
 *
 * Height: 58px
 * Background: var(--nav-bg)
 * Position: Sticky top
 */
interface TopNavigationBarProps {
  onSettingsClick?: () => void;
}

export default function TopNavigationBar({ onSettingsClick }: TopNavigationBarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { openReporterWithLatestTarget, hasTargetContext, lastTargetLabel } = useIssueReporter();
  const { isOpen: isHelpOpen, toggleHelp } = useHelpLandscaper();
  const [showBugHint, setShowBugHint] = React.useState(false);
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
          className="flex items-center justify-between"
          style={{ height: '58px', padding: '0 var(--app-padding)' }}
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
              sizes="176px"
              style={{ width: 'auto', height: 'auto' }}
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

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-full px-3 py-2 text-sm font-medium transition-colors d-flex align-items-center gap-2"
              style={{
                color: 'var(--nav-text)',
                backgroundColor: 'transparent',
              }}
              {...navHoverHandlers()}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              <CIcon icon={theme === 'light' ? cilMoon : cilSun} size="sm" />
              {theme === 'light' ? 'Dark' : 'Light'}
            </button>

            {/* Bug/Issues Icon Button - Admin Only */}
            {user?.is_staff && (
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
            )}

            {/* Help Landscaper Button */}
            <button
              type="button"
              onClick={toggleHelp}
              className="rounded-full p-2 transition-colors"
              style={{
                color: 'var(--nav-text)',
                backgroundColor: isHelpOpen ? 'var(--nav-active-bg)' : 'transparent',
              }}
              {...navHoverHandlers(isHelpOpen)}
              aria-label="Help"
              title="Help"
            >
              <CIcon icon={cilLifeRing} size="lg" />
            </button>

            {/* Settings Button */}
            <button
              type="button"
              onClick={onSettingsClick}
              className="rounded-full p-2 transition-colors"
              style={{
                color: 'var(--nav-text)',
                backgroundColor: 'transparent',
              }}
              {...navHoverHandlers()}
              aria-label="Open settings"
            >
              <CIcon icon={cilSettings} size="lg" />
            </button>

            {/* Divider */}
            <div className="h-6 w-px mx-1" style={{ backgroundColor: 'var(--nav-border)' }} />

            {/* User Menu - Far Right */}
            <UserMenuDropdown />
          </div>
        </div>
      </header>
    </>
  );
}
