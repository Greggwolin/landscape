'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';
import { useOutsideClick } from '@/app/hooks/useOutsideClick';
import { SETTINGS_ACTIONS, Z_INDEX } from './constants';

/**
 * SettingsDropdown Component
 *
 * Dropdown menu for application settings and configuration.
 */
export default function SettingsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useOutsideClick(dropdownRef, () => setIsOpen(false));

  const handleAction = (action: string, href?: string) => {
    setIsOpen(false);

    if (href) {
      router.push(href);
      return;
    }

    // Placeholder actions
    console.log(`Settings action: ${action} (placeholder)`);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="rounded-full border p-2 transition-colors"
        style={{
          borderColor: 'var(--nav-border)',
          color: 'var(--nav-text)',
          backgroundColor: 'transparent',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Settings menu"
      >
        <Settings className="h-5 w-5" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-60 rounded-md border shadow-lg"
          style={{
            backgroundColor: 'var(--cui-body-bg)',
            borderColor: 'var(--cui-border-color)',
            zIndex: Z_INDEX.DROPDOWN,
          }}
        >
          <div className="py-2">
            {SETTINGS_ACTIONS.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => handleAction(action.action, action.href)}
                className="block w-full px-4 py-2 text-left text-sm transition-colors"
                style={{ color: 'var(--cui-body-color)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
