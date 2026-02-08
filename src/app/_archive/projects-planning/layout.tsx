'use client';

import React from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { CCard, CCardBody, CCardHeader, CNav, CNavItem, CNavLink } from '@coreui/react';

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
    <div className="min-h-screen">
      <CCard>
        <CCardHeader
          className="d-flex align-items-center"
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'var(--surface-card-header)',
            borderColor: 'var(--cui-border-color)',
            minHeight: '48px',
          }}
        >
          <span className="fw-semibold" style={{ fontSize: '1rem', color: 'var(--cui-body-color)' }}>
            Project Design and Market Analysis
          </span>
        </CCardHeader>
        <div
          style={{
            background: 'var(--cui-tertiary-bg)',
            borderBottom: '1px solid var(--cui-border-color)',
            padding: '0 1.5rem',
          }}
        >
          <CNav variant="underline-border">
            {tabs.map(tab => {
              const isActive = pathname.includes(tab.path);
              return (
                <CNavItem key={tab.path}>
                  <Link
                    href={tab.href}
                    className={`nav-link${isActive ? ' active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {tab.label}
                  </Link>
                </CNavItem>
              );
            })}
          </CNav>
        </div>
        <CCardBody>
          {children}
        </CCardBody>
      </CCard>
    </div>
  );
}
