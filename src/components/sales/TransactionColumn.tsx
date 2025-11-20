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

  return (
    <div
      className="transaction-column"
      style={{
        minWidth: '240px',
        background: 'var(--cui-card-bg)',
        border: '1px solid var(--cui-border-color)',
        borderRadius: '0.375rem',
        padding: '1rem',
      }}
    >
      {/* Header */}
      <div className="mb-3">
        <h6 className="text-primary mb-1">{formatDate(sale.saleDate)}</h6>
        <div className="d-flex align-items-center gap-2">
          {editingName ? (
            <>
              <input
                type="text"
                value={saleName}
                onChange={(e) => setSaleName(e.target.value)}
                className="form-control form-control-sm"
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
                className="btn btn-sm btn-ghost-secondary"
                onClick={() => setEditingName(true)}
                aria-label="Edit sale name"
              >
                ✏️
              </button>
            </>
          )}
        </div>
        <CBadge color="secondary" className="mt-1">
          {sale.parcels.length} parcel{sale.parcels.length !== 1 ? 's' : ''}
        </CBadge>
      </div>

      {/* Physical Summary */}
      <div className="mb-3">
        <div className="small text-muted mb-1">Parcels:</div>
        <div className="small" style={{ maxHeight: '60px', overflow: 'auto' }}>
          {sale.parcels.map(p => p.parcel_code).join(', ')}
        </div>

        <div className="small text-muted mt-2 mb-1">Gross Acres:</div>
        <div className="small">{sale.grossAcres.toFixed(2)}</div>

        {sale.units && sale.units > 0 && (
          <>
            <div className="small text-muted mt-2 mb-1">Units:</div>
            <div className="small">{sale.units.toLocaleString()}</div>
          </>
        )}

        {sale.frontFeet && sale.frontFeet > 0 && (
          <>
            <div className="small text-muted mt-2 mb-1">Front Feet:</div>
            <div className="small">{sale.frontFeet.toLocaleString()}</div>
          </>
        )}
      </div>

      {/* Revenue Breakdown */}
      <div className="mb-3">
        <div className="fw-medium mb-2">Gross Retail Revenue</div>

        {sale.residentialRevenue > 0 && (
          <div
            className="d-flex justify-content-between small mb-1"
            style={{ cursor: 'help' }}
            title={`Parcels: ${sale.revenueAttribution.residential.join(', ')}`}
          >
            <span className="text-muted">Residential Land:</span>
            <span className="text-success">{formatMoney(sale.residentialRevenue, 0)}</span>
          </div>
        )}

        {sale.commercialRevenue > 0 && (
          <div
            className="d-flex justify-content-between small mb-1"
            style={{ cursor: 'help' }}
            title={`Parcels: ${sale.revenueAttribution.commercial.join(', ')}`}
          >
            <span className="text-muted">Commercial Revenue:</span>
            <span className="text-success">{formatMoney(sale.commercialRevenue, 0)}</span>
          </div>
        )}

        <div className="d-flex justify-content-between small fw-medium border-top pt-1 mt-1">
          <span>Total:</span>
          <span className="text-success">{formatMoney(sale.totalRevenue, 0)}</span>
        </div>
      </div>

      {/* Deductions */}
      <div className="mb-3">
        <div className="d-flex justify-content-between small mb-1">
          <span className="text-muted">Less: Commissions (3%):</span>
          <span className="text-danger">({formatMoney(sale.commissions, 0)})</span>
        </div>
        <div className="d-flex justify-content-between small mb-1">
          <span className="text-muted">Less: Closing Cost (2%):</span>
          <span className="text-danger">({formatMoney(sale.closingCosts, 0)})</span>
        </div>
      </div>

      {/* Net Result */}
      <div
        className="border-top pt-2"
        style={{ background: 'var(--cui-tertiary-bg)', padding: '0.5rem', margin: '0 -1rem -1rem', borderRadius: '0 0 0.375rem 0.375rem' }}
      >
        <div className="d-flex justify-content-between align-items-center px-3">
          <span className="fw-medium">Gross Sale Revenue:</span>
          <span className="text-success fw-bold fs-6">
            {formatMoney(sale.netProceeds, 0)}
          </span>
        </div>
      </div>
    </div>
  );
}
