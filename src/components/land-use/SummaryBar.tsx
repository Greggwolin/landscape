'use client';

import React from 'react';

interface SummaryBarProps {
  selectedTypes: number;
  selectedProducts: number;
  coveredParcels: number;
  totalParcels: number;
}

export default function SummaryBar({
  selectedTypes,
  selectedProducts,
  coveredParcels,
  totalParcels,
}: SummaryBarProps) {
  return (
    <div className="lup-summary">
      <div className="lup-summary-item">
        <span className="lup-summary-value">{selectedTypes}</span>
        <span className="lup-summary-label">Types Selected</span>
      </div>
      <div className="lup-summary-divider" />
      <div className="lup-summary-item">
        <span className="lup-summary-value">{selectedProducts}</span>
        <span className="lup-summary-label">Products Selected</span>
      </div>
      <div className="lup-summary-divider" />
      <div className="lup-summary-item">
        <span className="lup-summary-value">
          {coveredParcels}
          {totalParcels > 0 && (
            <span className="lup-summary-total"> / {totalParcels}</span>
          )}
        </span>
        <span className="lup-summary-label">Parcels Covered</span>
      </div>
    </div>
  );
}
