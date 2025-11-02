'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { useOutsideClick } from '@/app/hooks/useOutsideClick';
import { SANDBOX_PAGES, Z_INDEX } from './constants';

/**
 * SandboxDropdown Component
 *
 * Dropdown menu for developer/prototype page navigation.
 * Provides quick access to all prototypes and development pages.
 */
export default function SandboxDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useOutsideClick(dropdownRef, () => setIsOpen(false));

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors hover:bg-opacity-10"
        style={{
          color: 'var(--cui-sidebar-nav-link-color)',
          backgroundColor: 'transparent',
        }}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        Sandbox
        <ChevronDown className="h-4 w-4" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-72 rounded-md border shadow-lg max-h-96 overflow-y-auto"
          style={{
            backgroundColor: 'var(--cui-body-bg)',
            borderColor: 'var(--cui-border-color)',
            zIndex: Z_INDEX.DROPDOWN,
          }}
        >
          <div className="py-2">
            {SANDBOX_PAGES.map((item, index) => {
              // Type guard: check if item is a separator
              if ('separator' in item && item.separator) {
                return (
                  <div
                    key={`sep-${index}`}
                    className="my-2 border-t"
                    style={{ borderColor: 'var(--cui-border-color)' }}
                  />
                );
              }

              // Type assertion: item must have label and href
              const linkItem = item as { label: string; href: string };

              return (
                <Link
                  key={linkItem.label}
                  href={linkItem.href}
                  onClick={handleLinkClick}
                  className="block px-4 py-2 text-sm transition-colors hover:bg-opacity-10"
                  style={{
                    color: 'var(--cui-secondary-color)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(var(--cui-primary-rgb), 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {linkItem.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
