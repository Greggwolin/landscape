'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { UserCircle2, LogOut, User, Shield } from 'lucide-react';
import { useOutsideClick } from '@/app/hooks/useOutsideClick';
import { useAuth } from '@/contexts/AuthContext';
import { Z_INDEX } from './constants';

/**
 * UserMenuDropdown Component
 *
 * Dropdown menu for user-related actions with authentication integration.
 * Shows different options based on auth status and user role.
 */
export default function UserMenuDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, logout, isLoading } = useAuth();

  useOutsideClick(dropdownRef, () => setIsOpen(false));

  const handleLogout = () => {
    setIsOpen(false);
    logout();
  };

  const closeMenu = () => setIsOpen(false);

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return '?';
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user.username[0].toUpperCase();
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
        {isAuthenticated && user ? (
          <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center text-xs font-medium text-white">
            {getUserInitials()}
          </div>
        ) : (
          <UserCircle2 className="h-5 w-5" />
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-64 rounded-md border shadow-lg"
          style={{
            backgroundColor: 'var(--cui-body-bg)',
            borderColor: 'var(--cui-border-color)',
            zIndex: Z_INDEX.DROPDOWN,
          }}
        >
          {isLoading ? (
            <div className="py-4 text-center">
              <div className="animate-spin inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full text-blue-500" />
            </div>
          ) : isAuthenticated && user ? (
            <>
              {/* User Info Header */}
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
                <p className="text-sm font-medium" style={{ color: 'var(--cui-body-color)' }}>
                  {user.first_name && user.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : user.username}
                </p>
                <p className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
                  {user.email}
                </p>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                <Link
                  href="/settings/profile"
                  onClick={closeMenu}
                  className="flex items-center gap-3 w-full px-4 py-2 text-left text-sm transition-colors"
                  style={{ color: 'var(--cui-body-color)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <User className="h-4 w-4" />
                  Profile Settings
                </Link>

                {/* Admin Only: User Management */}
                {user.is_staff && (
                  <Link
                    href="/admin/users"
                    onClick={closeMenu}
                    className="flex items-center gap-3 w-full px-4 py-2 text-left text-sm transition-colors"
                    style={{ color: 'var(--cui-body-color)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Shield className="h-4 w-4" />
                    User Management
                  </Link>
                )}
              </div>

              {/* Logout */}
              <div className="py-2 border-t" style={{ borderColor: 'var(--cui-border-color)' }}>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-2 text-left text-sm transition-colors text-red-400"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            /* Not Authenticated */
            <div className="py-2">
              <Link
                href="/login"
                onClick={closeMenu}
                className="flex items-center gap-3 w-full px-4 py-2 text-left text-sm transition-colors"
                style={{ color: 'var(--cui-body-color)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <User className="h-4 w-4" />
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={closeMenu}
                className="flex items-center gap-3 w-full px-4 py-2 text-left text-sm transition-colors"
                style={{ color: 'var(--cui-body-color)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <UserCircle2 className="h-4 w-4" />
                Create Account
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
