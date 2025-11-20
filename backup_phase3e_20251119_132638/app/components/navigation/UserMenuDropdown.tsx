'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserCircle2 } from 'lucide-react';
import { useOutsideClick } from '@/app/hooks/useOutsideClick';
import { USER_MENU_ITEMS, Z_INDEX } from './constants';

/**
 * UserMenuDropdown Component
 *
 * Dropdown menu for user-related actions (Profile, Account Settings).
 */
export default function UserMenuDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useOutsideClick(dropdownRef, () => setIsOpen(false));

  const handleAction = (action: string) => {
    setIsOpen(false);

    switch (action) {
      case 'profile':
        router.push('/profile');
        break;
      case 'account-settings':
        router.push('/account-settings');
        break;
      default:
        console.log(`Action not implemented: ${action}`);
    }
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
        aria-label="User menu"
      >
        <UserCircle2 className="h-5 w-5" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-md border shadow-lg"
          style={{
            backgroundColor: 'var(--cui-body-bg)',
            borderColor: 'var(--cui-border-color)',
            zIndex: Z_INDEX.DROPDOWN,
          }}
        >
          <div className="py-2">
            {USER_MENU_ITEMS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleAction(item.action)}
                className="block w-full px-4 py-2 text-left text-sm transition-colors"
                style={{ color: 'var(--cui-body-color)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
