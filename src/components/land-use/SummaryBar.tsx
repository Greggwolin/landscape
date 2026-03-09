'use client';

import React from 'react';
import { ProductSelection } from './LandUsePicker';

interface SelectedProduct {
  typeName: string;
  typeCode: string;
  familyCode: string;
  product: ProductSelection;
}

interface SummaryBarProps {
  selectedTypes: number;
  selectedProducts: number;
  coveredParcels: number;
  totalParcels: number;
  productsList: SelectedProduct[];
}

function fmt(v: number | null): string {
  if (v === null || v === undefined) return '';
  return parseFloat(String(v)).toLocaleString();
}

export default function SummaryBar({
  selectedTypes,
  selectedProducts,
  coveredParcels,
  totalParcels,
  productsList,
}: SummaryBarProps) {
  // Group by typeCode for display
  const grouped = new Map<string, { typeName: string; typeCode: string; items: ProductSelection[] }>();
  for (const sp of productsList) {
    const existing = grouped.get(sp.typeCode);
    if (existing) {
      existing.items.push(sp.product);
    } else {
      grouped.set(sp.typeCode, { typeName: sp.typeName, typeCode: sp.typeCode, items: [sp.product] });
    }
  }

  return (
    <div className="lup-summary-section">
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

      {productsList.length > 0 && (
        <div className="lup-selected-products">
          {Array.from(grouped.values()).map(group => (
            <div key={group.typeCode} className="lup-selected-group">
              <span className="lup-selected-type-label">{group.typeName}</span>
              <div className="lup-selected-list">
                {group.items.map(p => (
                  <span key={p.product_id} className="lup-selected-pill">
                    {p.product_code}
                    {p.lot_area_sf && (
                      <span className="lup-selected-pill-area">{fmt(p.lot_area_sf)} sf</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
