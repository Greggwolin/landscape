'use client';

import React from 'react';
import { CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell } from '@coreui/react';
import { SemanticBadge } from '@/components/ui/landscape';
import { badgeIntentRegistry } from '@/config/semanticIntentRegistry';

/**
 * BadgeIntentsSection
 *
 * Displays the semantic badge governance system in StyleCatalog.
 * Shows a mapping table and live rendered SemanticBadge samples.
 */
export function BadgeIntentsSection() {
  return (
    <div
      style={{
        border: '1px solid var(--cui-border-color)',
        borderRadius: '10px',
        padding: '16px',
        background: 'var(--cui-card-bg)',
      }}
    >
      {/* Intent Mapping Table */}
      <CTable small striped className="mb-4">
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell scope="col">Intent</CTableHeaderCell>
            <CTableHeaderCell scope="col">Value Examples</CTableHeaderCell>
            <CTableHeaderCell scope="col">Resolution</CTableHeaderCell>
            <CTableHeaderCell scope="col">Fallback</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {badgeIntentRegistry.map(({ intent, valueExamples, resolution, fallback }) => (
            <CTableRow key={intent}>
              <CTableDataCell>
                <code
                  style={{
                    background: 'var(--cui-tertiary-bg)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                  }}
                >
                  {intent}
                </code>
              </CTableDataCell>
              <CTableDataCell>
                <span style={{ fontSize: '0.8rem', color: 'var(--cui-secondary-color)' }}>
                  {valueExamples.slice(0, 3).join(', ')}
                  {valueExamples.length > 3 && '...'}
                </span>
              </CTableDataCell>
              <CTableDataCell style={{ color: 'var(--cui-secondary-color)', fontSize: '0.85rem' }}>
                {resolution}
              </CTableDataCell>
              <CTableDataCell>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: `var(--cui-${fallback})`,
                    color: fallback === 'light' ? 'var(--cui-body-color)' : 'var(--cui-light)',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                  }}
                >
                  {fallback}
                </span>
              </CTableDataCell>
            </CTableRow>
          ))}
        </CTableBody>
      </CTable>

      {/* Live Badge Samples */}
      <div
        style={{
          background: 'var(--cui-tertiary-bg)',
          borderRadius: '8px',
          padding: '16px',
        }}
      >
        <div
          style={{
            fontSize: '0.65rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--cui-secondary-color)',
            marginBottom: '12px',
          }}
        >
          Live Samples
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {badgeIntentRegistry.map(({ intent, valueExamples }) => (
            <div key={intent}>
              <small
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  color: 'var(--cui-secondary-color)',
                  fontSize: '0.7rem',
                }}
              >
                {intent}
              </small>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {valueExamples.slice(0, 3).map((value) => (
                  <SemanticBadge key={value} intent={intent} value={value}>
                    {value}
                  </SemanticBadge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Attribute Note */}
      <div
        style={{
          marginTop: '12px',
          padding: '8px 12px',
          background: 'var(--cui-info-bg)',
          borderRadius: '6px',
          fontSize: '0.75rem',
          color: 'var(--cui-body-color)',
        }}
      >
        <strong>Note:</strong> All SemanticBadge components emit{' '}
        <code style={{ background: 'var(--cui-tertiary-bg)', padding: '1px 4px', borderRadius: '3px' }}>
          data-semantic-intent
        </code>{' '}
        and{' '}
        <code style={{ background: 'var(--cui-tertiary-bg)', padding: '1px 4px', borderRadius: '3px' }}>
          data-semantic-value
        </code>{' '}
        for debugging and style auditing.
      </div>
    </div>
  );
}

export default BadgeIntentsSection;
