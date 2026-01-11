'use client';

import React, { useState, useMemo } from 'react';
import { CButton, CBadge, CFormInput } from '@coreui/react';
import { formatDisplayValue } from './utils/formatDisplayValue';

export interface UnitMixRow {
  unit_type: string;
  unit_count: number;
  avg_sf: number;
  current_rent: number;
  rent_psf?: number;
  extraction_id?: number;
  accepted?: boolean;
}

interface UnitMixAccordionProps {
  unitMix: UnitMixRow[];
  confidence: number;
  sourceSnippet?: string;
  onAcceptAll: () => void;
  onRowEdit?: (index: number, field: keyof UnitMixRow, value: string | number) => void;
  defaultOpen?: boolean;
}

export function UnitMixAccordion({
  unitMix,
  confidence,
  sourceSnippet,
  onAcceptAll,
  onRowEdit,
  defaultOpen = true,
}: UnitMixAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  // Calculate totals
  const totals = useMemo(() => {
    const totalUnits = unitMix.reduce((sum, row) => sum + (row.unit_count || 0), 0);
    const weightedSF = unitMix.reduce((sum, row) => sum + (row.avg_sf || 0) * (row.unit_count || 0), 0);
    const weightedRent = unitMix.reduce(
      (sum, row) => sum + (row.current_rent || 0) * (row.unit_count || 0),
      0
    );

    const avgSF = totalUnits > 0 ? Math.round(weightedSF / totalUnits) : 0;
    const avgRent = totalUnits > 0 ? Math.round(weightedRent / totalUnits) : 0;
    const avgRentPSF = avgSF > 0 ? avgRent / avgSF : 0;

    return { totalUnits, avgSF, avgRent, avgRentPSF };
  }, [unitMix]);

  const allAccepted = unitMix.every((row) => row.accepted);

  const getConfidenceColor = (conf: number): 'success' | 'warning' | 'danger' => {
    if (conf >= 0.8) return 'success';
    if (conf >= 0.5) return 'warning';
    return 'danger';
  };

  const handleEditChange = (rowIdx: number, field: string, value: string) => {
    const key = `${rowIdx}-${field}`;
    setEditValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleEditBlur = (rowIdx: number, field: keyof UnitMixRow) => {
    const key = `${rowIdx}-${field}`;
    const value = editValues[key];
    if (value !== undefined && onRowEdit) {
      const numValue = parseFloat(value);
      onRowEdit(rowIdx, field, isNaN(numValue) ? value : numValue);
    }
  };

  const getEditValue = (rowIdx: number, field: string, originalValue: string | number): string => {
    const key = `${rowIdx}-${field}`;
    return editValues[key] ?? String(originalValue);
  };

  return (
    <div className="border rounded mb-3" style={{ backgroundColor: 'var(--cui-card-bg)' }}>
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-100 d-flex align-items-center justify-content-between px-3 py-2 border-0 bg-transparent"
        style={{ cursor: 'pointer' }}
      >
        <div className="d-flex align-items-center gap-2">
          <span>🏠</span>
          <span className="fw-medium">Unit Mix</span>
          <CBadge color="primary" shape="rounded-pill">
            {unitMix.length} types
          </CBadge>
          <CBadge color="info" shape="rounded-pill">
            {totals.totalUnits} total units
          </CBadge>
          {allAccepted && (
            <CBadge color="success" shape="rounded-pill">
              accepted
            </CBadge>
          )}
        </div>
        <svg
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
          style={{ width: '20px', height: '20px', transition: 'transform 0.2s' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      {isOpen && (
        <div className="border-top p-3" style={{ borderColor: 'var(--cui-border-color)' }}>
          {/* Table */}
          <div className="table-responsive">
            <table className="table table-sm table-hover mb-0">
              <thead>
                <tr className="text-body-secondary small">
                  <th className="py-2 px-2 text-start">Unit Type</th>
                  <th className="py-2 px-2 text-end">Units</th>
                  <th className="py-2 px-2 text-end">Avg SF</th>
                  <th className="py-2 px-2 text-end">Rent</th>
                  <th className="py-2 px-2 text-end">$/SF</th>
                  <th className="py-2 px-2 text-center" style={{ width: '40px' }}>
                    ✓
                  </th>
                </tr>
              </thead>
              <tbody>
                {unitMix.map((row, idx) => (
                  <tr key={idx}>
                    <td className="py-2 px-2">
                      {isEditing ? (
                        <CFormInput
                          size="sm"
                          value={getEditValue(idx, 'unit_type', row.unit_type)}
                          onChange={(e) => handleEditChange(idx, 'unit_type', e.target.value)}
                          onBlur={() => handleEditBlur(idx, 'unit_type')}
                        />
                      ) : (
                        row.unit_type
                      )}
                    </td>
                    <td className="py-2 px-2 text-end font-monospace">
                      {isEditing ? (
                        <CFormInput
                          size="sm"
                          type="number"
                          className="text-end"
                          style={{ width: '80px', marginLeft: 'auto' }}
                          value={getEditValue(idx, 'unit_count', row.unit_count)}
                          onChange={(e) => handleEditChange(idx, 'unit_count', e.target.value)}
                          onBlur={() => handleEditBlur(idx, 'unit_count')}
                        />
                      ) : (
                        row.unit_count.toLocaleString()
                      )}
                    </td>
                    <td className="py-2 px-2 text-end font-monospace">
                      {isEditing ? (
                        <CFormInput
                          size="sm"
                          type="number"
                          className="text-end"
                          style={{ width: '80px', marginLeft: 'auto' }}
                          value={getEditValue(idx, 'avg_sf', row.avg_sf)}
                          onChange={(e) => handleEditChange(idx, 'avg_sf', e.target.value)}
                          onBlur={() => handleEditBlur(idx, 'avg_sf')}
                        />
                      ) : (
                        row.avg_sf.toLocaleString()
                      )}
                    </td>
                    <td className="py-2 px-2 text-end font-monospace">
                      {isEditing ? (
                        <CFormInput
                          size="sm"
                          type="number"
                          className="text-end"
                          style={{ width: '100px', marginLeft: 'auto' }}
                          value={getEditValue(idx, 'current_rent', row.current_rent)}
                          onChange={(e) => handleEditChange(idx, 'current_rent', e.target.value)}
                          onBlur={() => handleEditBlur(idx, 'current_rent')}
                        />
                      ) : (
                        formatDisplayValue(row.current_rent, 'current_rent')
                      )}
                    </td>
                    <td className="py-2 px-2 text-end font-monospace">
                      {row.rent_psf
                        ? `$${row.rent_psf.toFixed(2)}`
                        : row.avg_sf > 0
                        ? `$${(row.current_rent / row.avg_sf).toFixed(2)}`
                        : '—'}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {row.accepted && (
                        <span style={{ color: 'var(--cui-success)' }}>✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="fw-medium" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
                  <td className="py-2 px-2">TOTALS/AVG</td>
                  <td className="py-2 px-2 text-end font-monospace">{totals.totalUnits.toLocaleString()}</td>
                  <td className="py-2 px-2 text-end font-monospace">{totals.avgSF.toLocaleString()}</td>
                  <td className="py-2 px-2 text-end font-monospace">
                    {formatDisplayValue(totals.avgRent, 'current_rent')}
                  </td>
                  <td className="py-2 px-2 text-end font-monospace">${totals.avgRentPSF.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Source and confidence */}
          {(sourceSnippet || confidence) && (
            <div className="mt-3 d-flex align-items-center justify-content-between small text-body-secondary">
              {sourceSnippet && <span>Source: &quot;{sourceSnippet}&quot;</span>}
              <CBadge color={getConfidenceColor(confidence)} shape="rounded-pill">
                {Math.round(confidence * 100)}% conf
              </CBadge>
            </div>
          )}

          {/* Actions */}
          <div className="mt-3 d-flex gap-2">
            <CButton
              color="primary"
              size="sm"
              onClick={onAcceptAll}
              disabled={allAccepted}
            >
              {allAccepted ? 'All Accepted' : 'Accept All'}
            </CButton>
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Done' : 'Edit'}
            </CButton>
          </div>
        </div>
      )}
    </div>
  );
}

export default UnitMixAccordion;
