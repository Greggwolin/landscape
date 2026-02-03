'use client';

import React, { useState } from 'react';
import { CCard, CCardHeader, CCardBody, CCollapse, CFormSelect } from '@coreui/react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { SemanticBadge } from '@/components/ui/landscape';

interface MdrPanelProps {
  hasData: boolean;
}

// Mock data for UI shell
const MOCK_MDR_DATA = [
  {
    parcel: 'MDR-A',
    type: 'Townhome',
    units: 120,
    method: '$/Unit Residual',
    pricePerUnit: 385000,
    flf: 15,
    inTractPerUnit: 18000,
    residualPerUnit: 39750,
    parcelValue: 4770000
  },
  {
    parcel: 'BFR-1',
    type: 'Build-for-Rent',
    units: 87,
    method: '$/Unit Residual',
    pricePerUnit: 340000,
    flf: 12,
    inTractPerUnit: 15000,
    residualPerUnit: 25800,
    parcelValue: 2244600
  }
];

export default function MdrPanel({ hasData }: MdrPanelProps) {
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
          MDR / Attached Product
        </h6>
        <div className="d-flex align-items-center gap-2">
          {hasData && (
            <SemanticBadge intent="status" value="validated">
              {MOCK_MDR_DATA.length} Parcels
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
                No attached or multifamily parcels identified.
              </p>
            </div>
          ) : (
            // Data Table
            <div className="table-responsive">
              <table className="table table-sm mb-0" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--cui-border-color)' }}>
                    <th style={{ color: 'var(--cui-secondary-color)', fontWeight: 600 }}>Parcel</th>
                    <th style={{ color: 'var(--cui-secondary-color)', fontWeight: 600 }}>Type</th>
                    <th style={{ color: 'var(--cui-secondary-color)', fontWeight: 600 }} className="text-end">Units</th>
                    <th style={{ color: 'var(--cui-secondary-color)', fontWeight: 600 }}>Method</th>
                    <th style={{ color: 'var(--cui-secondary-color)', fontWeight: 600 }} className="text-end">Price/Unit</th>
                    <th style={{ color: 'var(--cui-secondary-color)', fontWeight: 600 }} className="text-end">FLF %</th>
                    <th style={{ color: 'var(--cui-secondary-color)', fontWeight: 600 }} className="text-end">In-Tract/Unit</th>
                    <th style={{ color: 'var(--cui-secondary-color)', fontWeight: 600 }} className="text-end">Residual/Unit</th>
                    <th style={{ color: 'var(--cui-secondary-color)', fontWeight: 600 }} className="text-end">Parcel Value</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_MDR_DATA.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
                      <td className="fw-semibold" style={{ color: 'var(--cui-body-color)' }}>{row.parcel}</td>
                      <td style={{ color: 'var(--cui-body-color)' }}>{row.type}</td>
                      <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>{row.units}</td>
                      <td>
                        <CFormSelect
                          size="sm"
                          value={row.method}
                          style={{ fontSize: '0.8rem', width: 'auto' }}
                        >
                          <option value="$/Unit Residual">$/Unit Residual</option>
                          <option value="$/Acre">$/Acre</option>
                        </CFormSelect>
                      </td>
                      <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>{formatCurrency(row.pricePerUnit)}</td>
                      <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>{row.flf}%</td>
                      <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>{formatCurrency(row.inTractPerUnit)}</td>
                      <td className="text-end" style={{ color: 'var(--cui-body-color)' }}>{formatCurrency(row.residualPerUnit)}</td>
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
