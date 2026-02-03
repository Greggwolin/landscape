'use client';

import React, { useState } from 'react';
import { CCard, CCardHeader, CCardBody, CCollapse } from '@coreui/react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { SemanticBadge } from '@/components/ui/landscape';

interface CommercialPanelProps {
  hasData: boolean;
}

// Mock data for UI shell
const MOCK_COMMERCIAL_DATA = [
  {
    parcel: 'C-1',
    use: 'Retail',
    acres: 8.5,
    far: 0.25,
    buildableSf: 92565,
    pricePerSf: 22,
    parcelValue: 2036430
  },
  {
    parcel: 'MU-1',
    use: 'Mixed Use',
    acres: 12.0,
    far: 0.30,
    buildableSf: 156816,
    pricePerSf: 18,
    parcelValue: 2822688
  }
];

export default function CommercialPanel({ hasData }: CommercialPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    return `$${value.toLocaleString()}`;
  };

  return (
    <CCard style={{ backgroundColor: 'var(--cui-tertiary-bg)', border: '1px solid var(--cui-border-color)' }}>
      <CCardHeader
        className="d-flex justify-content-between align-items-center cursor-pointer py-3"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ backgroundColor: 'var(--surface-card-header)', cursor: 'pointer' }}
      >
        <h6 className="mb-0 fw-bold" style={{ color: 'var(--cui-body-color)' }}>
          Commercial
        </h6>
        <div className="d-flex align-items-center gap-2">
          {hasData && (
            <SemanticBadge intent="status" value="pending">
              {MOCK_COMMERCIAL_DATA.length} Parcels
            </SemanticBadge>
          )}
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </CCardHeader>

      <CCollapse visible={isExpanded}>
        <CCardBody className="py-3">
          {!hasData ? (
            // Empty state
            <div className="text-center py-4">
              <p className="mb-0" style={{ color: 'var(--cui-secondary-color)' }}>
                No commercial parcels identified.
              </p>
            </div>
          ) : (
            // Data Table
            <div className="table-responsive">
              <table className="table table-sm mb-0" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--cui-border-color)' }}>
                    <th style={{ color: 'var(--cui-secondary-color)', fontWeight: 600 }}>Parcel</th>
                    <th style={{ color: 'var(--cui-secondary-color)', fontWeight: 600 }}>Use</th>
                    <th style={{ color: 'var(--cui-secondary-color)', fontWeight: 600 }} className="text-end">Acres</th>
                    <th style={{ color: 'var(--cui-secondary-color)', fontWeight: 600 }} className="text-end">FAR</th>
                    <th style={{ color: 'var(--cui-secondary-color)', fontWeight: 600 }} className="text-end">Buildable SF</th>
                    <th style={{ color: 'var(--cui-secondary-color)', fontWeight: 600 }} className="text-end">$/SF</th>
                    <th style={{ color: 'var(--cui-secondary-color)', fontWeight: 600 }} className="text-end">Parcel Value</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_COMMERCIAL_DATA.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
                      <td className="fw-semibold" style={{ color: 'var(--cui-body-color)' }}>{row.parcel}</td>
                      <td style={{ color: 'var(--cui-body-color)' }}>{row.use}</td>
                      <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>{row.acres.toFixed(1)}</td>
                      <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>{row.far.toFixed(2)}</td>
                      <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>{row.buildableSf.toLocaleString()}</td>
                      <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>${row.pricePerSf}</td>
                      <td className="text-end fw-semibold" style={{ color: '#57c68a' }}>{formatCurrency(row.parcelValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CCardBody>
      </CCollapse>
    </CCard>
  );
}
