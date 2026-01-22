'use client';

import React from 'react';
import StyleCatalogContent from '@/app/components/StyleCatalog/StyleCatalogContent';

export default function StyleCatalogPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--cui-tertiary-bg)',
        padding: '24px'
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}
        >
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--cui-body-color)' }}>
              Style Catalog
            </div>
            <div style={{ color: 'var(--cui-secondary-color)' }}>
              Printable reference (single-source markdown)
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-primary"
          >
            Print
          </button>
        </div>
        <StyleCatalogContent showTitle={false} />
      </div>
    </div>
  );
}
