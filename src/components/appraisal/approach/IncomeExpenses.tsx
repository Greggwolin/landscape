'use client';

import React from 'react';
import type { DetailId } from '../appraisal.types';

interface Props {
  onOpenDetail: (id: DetailId | string, label?: string) => void;
}

const EXPENSE_DATA = [
  { label: 'Real estate taxes', amt: '$124,800', pct: '31%', detailId: 'taxes' },
  { label: 'Insurance', amt: '$38,400', pct: '10%', detailId: 'insurance' },
  { label: 'Management (6%)', amt: '$60,078', pct: '15%', detailId: 'mgmt' },
  { label: 'Maintenance', amt: '$76,800', pct: '19%', detailId: 'maint' },
  { label: 'Utilities', amt: '$51,200', pct: '13%', detailId: 'utilities' },
  { label: 'Reserves', amt: '$19,200', pct: '5%', detailId: 'reserves' },
  { label: 'Other', amt: '$30,040', pct: '7%', detailId: 'other-exp' },
];

export function IncomeExpenses({ onOpenDetail }: Props) {
  return (
    <>
      <div style={{ fontSize: 9, color: 'var(--cui-tertiary-color)', marginBottom: 6 }}>
        40% of EGI · $400,518 total · $6,258/unit
      </div>

      {EXPENSE_DATA.map((exp) => (
        <div
          key={exp.label}
          className="exp-row"
          onDoubleClick={() => onOpenDetail(exp.detailId, exp.label)}
        >
          <div className="exp-label">{exp.label}</div>
          <div className="exp-amt">{exp.amt}</div>
          <div className="exp-pct">{exp.pct}</div>
        </div>
      ))}

      <div className="exp-row total">
        <div className="exp-label">Total</div>
        <div className="exp-amt">$400,518</div>
        <div className="exp-pct">100%</div>
      </div>
    </>
  );
}
