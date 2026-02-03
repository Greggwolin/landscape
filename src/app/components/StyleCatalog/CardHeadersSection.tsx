'use client';

import React from 'react';
import {
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
} from '@coreui/react';
import { cardHeaderRegistry } from '@/config/semanticIntentRegistry';

export function CardHeadersSection() {
  return (
    <div
      style={{
        border: '1px solid var(--cui-border-color)',
        borderRadius: '10px',
        padding: '16px',
        background: 'var(--cui-card-bg)',
      }}
    >
      <CTable small responsive>
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Element</CTableHeaderCell>
            <CTableHeaderCell>Color</CTableHeaderCell>
            <CTableHeaderCell>CSS Variable</CTableHeaderCell>
            <CTableHeaderCell>Usage</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {cardHeaderRegistry.map(({ element, hex, variable, usage }) => (
            <CTableRow key={element}>
              <CTableDataCell>{element}</CTableDataCell>
              <CTableDataCell>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span
                    style={{
                      width: '40px',
                      height: '24px',
                      borderRadius: '6px',
                      border: '1px solid var(--cui-border-color)',
                      backgroundColor: `var(${variable})`,
                    }}
                  />
                  <code style={{ fontSize: '0.75rem', color: 'var(--cui-body-color)' }}>{hex}</code>
                </div>
              </CTableDataCell>
              <CTableDataCell>
                <code style={{ fontSize: '0.75rem' }}>{variable}</code>
              </CTableDataCell>
              <CTableDataCell style={{ color: 'var(--cui-secondary-color)', fontSize: '0.85rem' }}>
                {usage}
              </CTableDataCell>
            </CTableRow>
          ))}
        </CTableBody>
      </CTable>
      <p
        style={{
          marginTop: '12px',
          fontSize: '0.8rem',
          color: 'var(--cui-secondary-color)',
        }}
      >
        These colors flow from the CoreUI theme tokens into every card, accordion, and panel header through
        the global stylesheet.
      </p>
    </div>
  );
}

export default CardHeadersSection;
