'use client';

import React from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function PlanningLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.projectId as string;

  const tabs = [
    {
      label: 'Market Analysis',
      href: `/projects/${projectId}/planning/market`,
      path: '/planning/market'
    },
    {
      label: 'Land Use & Parcels',
      href: `/projects/${projectId}/planning/land-use`,
      path: '/planning/land-use'
    },
    {
      label: 'Budget',
      href: `/projects/${projectId}/planning/budget`,
      path: '/planning/budget'
    }
  ];

  return (
    <div className="container-fluid px-4">
      {/* Subtab Navigation */}
      <ul className="nav nav-tabs mb-4">
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
