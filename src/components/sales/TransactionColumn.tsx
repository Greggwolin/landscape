'use client';

import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { CBadge } from '@coreui/react';
import type { SaleTransaction } from '@/utils/sales/salesAggregation';
import { generateAutoLabel } from '@/utils/sales/salesAggregation';
import { formatMoney } from '@/utils/formatters/number';

interface TransactionColumnProps {
  sale: SaleTransaction;
  projectId: number;
  onSaveNameOptimistic: (saleDate: string, newName: string) => void;
}

export default function TransactionColumn({ sale, projectId, onSaveNameOptimistic }: TransactionColumnProps) {
  const [editingName, setEditingName] = useState(false);
  const [saleName, setSaleName] = useState(sale.saleName || generateAutoLabel(sale));
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveName = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/sales/update-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          saleDate: sale.saleDate,
          saleName: saleName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save sale name');
      }

      // Optimistically update parent component
      onSaveNameOptimistic(sale.saleDate, saleName);
      setEditingName(false);
    } catch (error) {
      console.error('Error saving sale name:', error);
      alert('Failed to save sale name. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  // Format parcel codes: render as multi-line with 4 parcels per row
  const renderParcelList = (parcels: typeof sale.parcels) => {
    const codes = parcels.map(p => p.parcel_code);
    if (codes.length <= 4) {
      return <span>{codes.join(', ')}</span>;
    }
    // Group into rows of 4
    const rows: string[][] = [];
    for (let i = 0; i < codes.length; i += 4) {
      rows.push(codes.slice(i, i + 4));
    }
    return (
      <>
        {rows.map((row, idx) => (
          <div key={idx} style={{ textAlign: 'right' }}>
            {row.join(', ')}{idx < rows.length - 1 ? ',' : ''}
          </div>
        ))}
      </>
    );
  };

  return (
    <div
      className="transaction-column"
      style={{
        flex: '0 0 calc(33.333% - 0.75rem)',
        minWidth: '300px',
        maxWidth: 'calc(33.333% - 0.75rem)',
        background: 'var(--cui-card-bg)',
        border: '1px solid var(--cui-border-color)',
        borderRadius: '0.375rem',
        padding: '1rem',
      }}
    >
      {/* Header */}
      <div className="mb-3">
        <div className="d-flex align-items-center gap-2">
          <h6 className="text-primary mb-0">{formatDate(sale.saleDate)}</h6>
          {editingName ? (
            <>
              <input
                type="text"
                value={saleName}
                onChange={(e) => setSaleName(e.target.value)}
                className="form-control form-control-sm"
                style={{ width: '120px' }}
                placeholder="Name this sale..."
                disabled={isSaving}
              />
              <button
                className="btn btn-sm btn-success"
                onClick={handleSaveName}
                disabled={isSaving}
                aria-label="Save sale name"
              >
                ✓
              </button>
              <button
                className="btn btn-sm btn-ghost-secondary"
                onClick={() => {
                  setSaleName(sale.saleName || generateAutoLabel(sale));
                  setEditingName(false);
                }}
                disabled={isSaving}
                aria-label="Cancel editing"
              >
                ✕
              </button>
            </>
          ) : (
            <>
              <span className="text-muted small">{saleName}</span>
              <button
                className="btn btn-sm btn-ghost-secondary p-0"
                onClick={() => setEditingName(true)}
                aria-label="Edit sale name"
                style={{ lineHeight: 1 }}
              >
                ✏️
              </button>
            </>
          )}
          <CBadge color="secondary" style={{ marginLeft: 'auto' }}>
            {sale.parcels.length} parcel{sale.parcels.length !== 1 ? 's' : ''}
          </CBadge>
        </div>
      </div>

      {/* Physical Summary - Inline layout */}
      <div className="mb-3">
        <div className="d-flex justify-content-between small mb-1">
          <span className="text-muted" style={{ alignSelf: 'flex-start' }}>Parcels:</span>
          <div style={{ textAlign: 'right', maxWidth: '180px' }}>
            {renderParcelList(sale.parcels)}
          </div>
        </div>

        <div className="d-flex justify-content-between small mb-1">
          <span className="text-muted">Gross Acres:</span>
          <span>{sale.grossAcres.toFixed(2)}</span>
        </div>

        {sale.units && sale.units > 0 && (
          <div className="d-flex justify-content-between small mb-1">
            <span className="text-muted">Units:</span>
            <span>{sale.units.toLocaleString()}</span>
          </div>
        )}

        {sale.frontFeet && sale.frontFeet > 0 && (
          <div className="d-flex justify-content-between small mb-1">
            <span className="text-muted">Front Feet:</span>
            <span>{sale.frontFeet.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Revenue Breakdown */}
      <div className="mb-3">
        <div className="fw-medium mb-2">Gross Parcel Price</div>

        {sale.residentialRevenue > 0 && (
          <div
            className="d-flex justify-content-between small mb-1"
            style={{ cursor: 'help' }}
            title={`Parcels: ${sale.revenueAttribution.residential.join(', ')}`}
          >
            <span className="text-muted">Residential Land:</span>
            <span>{formatMoney(sale.residentialRevenue, 0)}</span>
          </div>
        )}

        {sale.commercialRevenue > 0 && (
          <div
            className="d-flex justify-content-between small mb-1"
            style={{ cursor: 'help' }}
            title={`Parcels: ${sale.revenueAttribution.commercial.join(', ')}`}
          >
            <span className="text-muted">Commercial Revenue:</span>
            <span>{formatMoney(sale.commercialRevenue, 0)}</span>
          </div>
        )}

        <div className="d-flex justify-content-between small fw-medium border-top pt-1 mt-1">
          <span>Total Gross Price:</span>
          <span>{formatMoney(sale.totalRevenue, 0)}</span>
        </div>
      </div>

      {/* Deductions - Order matches Cash Flow report: Commissions, Transaction Costs, Subdivision */}
      <div className="mb-3">
        {sale.commissions > 0 && (
          <div className="d-flex justify-content-between small mb-1">
            <span className="text-muted">Less: Commissions:</span>
            <span className="text-danger">({formatMoney(sale.commissions, 0)})</span>
          </div>
        )}

        {sale.closingCosts > 0 && (
          <div className="d-flex justify-content-between small mb-1">
            <span className="text-muted">Less: Transaction Costs:</span>
            <span className="text-danger">({formatMoney(sale.closingCosts, 0)})</span>
          </div>
        )}

        {sale.improvementOffset > 0 && (
          <div className="d-flex justify-content-between small mb-1">
            <span className="text-muted">Less: Subdivision Costs:</span>
            <span className="text-danger">({formatMoney(sale.improvementOffset, 0)})</span>
          </div>
        )}
      </div>

      {/* Net Result */}
      <div
        className="border-top pt-2"
        style={{ background: 'var(--cui-tertiary-bg)', padding: '0.5rem', margin: '0 -1rem -1rem', borderRadius: '0 0 0.375rem 0.375rem' }}
      >
        <div className="d-flex justify-content-between align-items-center px-3">
          <span className="fw-medium">Net Sale Proceeds:</span>
          <span className="text-success fw-bold fs-6">
            {formatMoney(sale.netProceeds, 0)}
          </span>
        </div>
      </div>
    </div>
  );
}
