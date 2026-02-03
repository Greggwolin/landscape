'use client';

import React from 'react';
import { CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell } from '@coreui/react';
import { SemanticButton } from '@/components/ui/landscape';
import { buttonIntentRegistry } from '@/config/semanticIntentRegistry';

/**
 * ButtonIntentsSection
 *
 * Displays the semantic button governance system in StyleCatalog.
 * Shows a mapping table and live rendered SemanticButton samples.
 */
export function ButtonIntentsSection() {
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
            <CTableHeaderCell scope="col">CoreUI Color</CTableHeaderCell>
            <CTableHeaderCell scope="col">Token Ramps</CTableHeaderCell>
            <CTableHeaderCell scope="col">Use Case</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {buttonIntentRegistry.map(({ intent, coreUIColor, tokenRamps, useCase }) => (
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
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: `var(--cui-${coreUIColor})`,
                    color: coreUIColor === 'light' ? 'var(--cui-body-color)' : 'var(--cui-light)',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                  }}
                >
                  {coreUIColor}
                </span>
              </CTableDataCell>
              <CTableDataCell>
                <code
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--cui-secondary-color)',
                  }}
                >
                  {tokenRamps}
                </code>
              </CTableDataCell>
              <CTableDataCell style={{ color: 'var(--cui-secondary-color)', fontSize: '0.85rem' }}>
                {useCase}
              </CTableDataCell>
            </CTableRow>
          ))}
        </CTableBody>
      </CTable>

      {/* Live Button Samples */}
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
          {buttonIntentRegistry.map(({ intent, sampleLabel }) => (
            <div key={intent} style={{ textAlign: 'center' }}>
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
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <SemanticButton intent={intent} size="sm">
                  {sampleLabel}
                </SemanticButton>
                <SemanticButton intent={intent} size="sm" disabled>
                  Disabled
                </SemanticButton>
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
        <strong>Note:</strong> All SemanticButton components emit{' '}
        <code style={{ background: 'var(--cui-tertiary-bg)', padding: '1px 4px', borderRadius: '3px' }}>
          data-semantic-intent
        </code>{' '}
        for debugging and style auditing.
      </div>
    </div>
  );
}

export default ButtonIntentsSection;
