'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/app/components/CoreUIThemeProvider';
import { GLOBAL_NAV_LINKS } from './navigation/constants';
import UserMenuDropdown from './navigation/UserMenuDropdown';
import CIcon from '@coreui/icons-react';
import { cilSettings, cilMoon, cilSun } from '@coreui/icons';
import { useHelpLandscaper } from '@/contexts/HelpLandscaperContext';
import { useLandscaperThinking } from '@/contexts/LandscaperThinkingContext';
import { HelpIcon } from '@/components/icons/HelpIcon';

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
  const { isOpen: isHelpOpen, toggleHelp, isLoading: isHelpLoading } = useHelpLandscaper();
  const { isThinking: isProjectLandscaperThinking } = useLandscaperThinking();
  const isLandscaperThinking = isProjectLandscaperThinking || isHelpLoading;
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
          style={{ height: '58px', padding: '0 var(--nav-padding)' }}
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
              <HelpIcon aria-hidden="true" style={{ width: '33px', height: '33px' }} isThinking={isLandscaperThinking} />
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
