'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react';
import {
  canonicalPropertyTypeOrder,
  propertyTypeTokenMap,
} from '@/config/propertyTypeTokens';
import { getResolvedColor } from '@/utils/cssVariables';
import { PropertyTypeBadge } from '@/components/ui/landscape';

type ResolvedTokenValueMap = Record<string, string>;

export function PropertyTypeTokensSection() {
  const [resolvedValues, setResolvedValues] = useState<ResolvedTokenValueMap>({});

  const rows = useMemo(
    () => canonicalPropertyTypeOrder.map((code) => ({ code, ...propertyTypeTokenMap[code] })),
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const next: ResolvedTokenValueMap = {};
    rows.forEach((row) => {
      next[row.bgToken] = getResolvedColor(row.bgToken);
      next[row.textToken] = getResolvedColor(row.textToken);
    });
    setResolvedValues(next);
  }, [rows]);

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
            <CTableHeaderCell>Property Type</CTableHeaderCell>
            <CTableHeaderCell>Background Token</CTableHeaderCell>
            <CTableHeaderCell>Text Token</CTableHeaderCell>
            <CTableHeaderCell>Background Swatch</CTableHeaderCell>
            <CTableHeaderCell>Text Swatch</CTableHeaderCell>
            <CTableHeaderCell>Preview</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {rows.map((row) => (
            <CTableRow key={row.code}>
              <CTableDataCell style={{ fontWeight: 600 }}>{row.label}</CTableDataCell>
              <CTableDataCell>
                <code style={{ fontSize: '0.75rem' }}>{row.bgToken}</code>
                <div style={{ fontSize: '0.75rem', color: 'var(--cui-secondary-color)' }}>
                  {resolvedValues[row.bgToken] || row.bgVar}
                </div>
              </CTableDataCell>
              <CTableDataCell>
                <code style={{ fontSize: '0.75rem' }}>{row.textToken}</code>
                <div style={{ fontSize: '0.75rem', color: 'var(--cui-secondary-color)' }}>
                  {resolvedValues[row.textToken] || row.textVar}
                </div>
              </CTableDataCell>
              <CTableDataCell>
                <span
                  style={{
                    width: '40px',
                    height: '24px',
                    borderRadius: '6px',
                    border: '1px solid var(--cui-border-color)',
                    backgroundColor: row.bgVar,
                    display: 'inline-block',
                  }}
                />
              </CTableDataCell>
              <CTableDataCell>
                <span
                  style={{
                    width: '40px',
                    height: '24px',
                    borderRadius: '6px',
                    border: '1px solid var(--cui-border-color)',
                    backgroundColor: row.textVar,
                    display: 'inline-block',
                  }}
                />
              </CTableDataCell>
              <CTableDataCell>
                <PropertyTypeBadge typeCode={row.code} />
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
          marginBottom: 0,
        }}
      >
        Read-only governance view. Values are sourced from canonical CSS property type tokens.
      </p>
    </div>
  );
}

export default PropertyTypeTokensSection;
