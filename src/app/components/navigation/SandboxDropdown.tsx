'use client';

import React, { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useOutsideClick } from '@/app/hooks/useOutsideClick';
import { SANDBOX_PAGES, Z_INDEX } from './constants';

/**
 * SandboxDropdown Component
 *
 * Dropdown menu for developer/prototype page references.
 * Items are non-clickable (display-only) for reference purposes.
 */
export default function SandboxDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useOutsideClick(dropdownRef, () => setIsOpen(false));

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors"
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
            {SANDBOX_PAGES.map((page, index) =>
              page === '---' ? (
                <div
                  key={`sep-${index}`}
                  className="my-2 border-t"
                  style={{ borderColor: 'var(--cui-border-color)' }}
                />
              ) : (
                <div
                  key={page}
                  className="px-4 py-2 text-sm"
                  style={{
                    color: 'var(--cui-secondary-color)',
                    cursor: 'default',
                  }}
                >
                  {page}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
