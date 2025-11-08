// v1.0 · 2025-11-02 · Standardized page header with breadcrumbs
'use client';

import React from 'react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export default function PageHeader({ breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div
      className="d-flex justify-content-between align-items-center mb-4 pb-3"
      style={{
        borderBottom: '1px solid var(--cui-border-color)',
      }}
    >
      {/* Breadcrumbs */}
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb mb-0">
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <li
                key={index}
                className={`breadcrumb-item ${isLast ? 'active' : ''}`}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.href && !isLast ? (
                  <a
                    href={item.href}
                    style={{ color: 'var(--cui-primary)', textDecoration: 'none' }}
                  >
                    {item.label}
                  </a>
                ) : (
                  <span style={{ color: isLast ? 'var(--cui-body-color)' : 'var(--cui-secondary-color)' }}>
                    {item.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Actions */}
      {actions && <div className="d-flex gap-2">{actions}</div>}
    </div>
  );
}
