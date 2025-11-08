'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * AdminNavBar Component
 * Horizontal navigation bar for admin pages (similar to project tabs)
 */

interface AdminNavItem {
  id: string;
  label: string;
  href: string;
}

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { id: 'preferences', label: 'Preferences', href: '/admin/preferences' },
  { id: 'benchmarks', label: 'Benchmarks', href: '/admin/benchmarks' },
  { id: 'cost-library', label: 'Cost Library', href: '/admin/benchmarks/cost-library' },
  { id: 'dms', label: 'DMS Admin', href: '/admin/dms/templates' },
];

export default function AdminNavBar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin/benchmarks/cost-library') {
      return pathname === href;
    }
    if (href === '/admin/benchmarks') {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  return (
    <div
      className="sticky flex items-center gap-0 px-6 h-14 border-b"
      style={{
        backgroundColor: 'var(--cui-body-bg)',
        borderColor: 'var(--cui-border-color)',
        top: '0px',
        zIndex: 40
      }}
    >
      <div className="flex items-center gap-2 mr-8">
        <span className="text-sm font-semibold" style={{ color: 'var(--cui-body-color)' }}>
          Admin
        </span>
      </div>
      <div className="flex flex-1 gap-0">
        {ADMIN_NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              className="px-5 py-4 text-sm transition-colors relative"
              style={{
                color: active ? 'var(--cui-primary)' : 'var(--cui-secondary-color)',
                fontWeight: active ? 600 : 400,
                borderBottom: active ? '2px solid var(--cui-primary)' : '2px solid transparent',
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.color = 'var(--cui-body-color)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.color = 'var(--cui-secondary-color)';
                }
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
