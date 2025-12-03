'use client';

import React from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function DevelopmentLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.projectId as string;

  const tabs = [
    {
      label: 'Phasing & Timing',
      href: `/projects/${projectId}/development/phasing`,
      path: '/development/phasing'
    },
    {
      label: 'Budget',
      href: `/projects/${projectId}/development/budget`,
      path: '/development/budget'
    }
  ];

  return (
    <div className="container-fluid px-4">
      {/* Subtab Navigation */}
      <ul
        className="nav nav-tabs mb-4 sticky border-bottom"
        style={{
          top: '163px',
          zIndex: 30,
          backgroundColor: 'var(--cui-body-bg)',
          borderColor: 'var(--cui-border-color)'
        }}
      >
        {tabs.map(tab => {
          const isActive = pathname.includes(tab.path);
          return (
            <li key={tab.path} className="nav-item">
              <Link
                href={tab.href}
                className={`nav-link ${isActive ? 'active' : ''}`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Page Content */}
      {children}
    </div>
  );
}
