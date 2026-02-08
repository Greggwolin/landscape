'use client';

import React from 'react';
import { CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell, CBadge } from '@coreui/react';

export interface WaterfallTier {
  tierNumber: number;
  tierName: string;
  distributionType: 'pari_passu' | 'preferred' | 'promote';
  hurdleRate: number | null;
  splits: Array<{
    partnerName: string;
    percent: number;
  }>;
}

interface WaterfallStructureTableProps {
  tiers: WaterfallTier[];
}

export default function WaterfallStructureTable({ tiers }: WaterfallStructureTableProps) {
  const formatPercent = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

  const getDistributionTypeBadge = (type: string): string => {
    const badges: Record<string, string> = {
      'pari_passu': 'info',
      'preferred': 'primary',
      'promote': 'success',
    };
    return badges[type] || 'secondary';
  };

  if (tiers.length === 0) {
    return (
      <div className="text-center py-5" style={{ color: 'var(--cui-secondary-color)' }}>
        No waterfall structure configured. Click &ldquo;Configure&rdquo; to define distribution tiers.
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <CTable>
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Tier</CTableHeaderCell>
            <CTableHeaderCell>Tier Name</CTableHeaderCell>
            <CTableHeaderCell>Distribution Type</CTableHeaderCell>
            <CTableHeaderCell>Hurdle Rate</CTableHeaderCell>
            <CTableHeaderCell>Partner Splits</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {tiers.map((tier) => (
            <CTableRow key={tier.tierNumber}>
              <CTableDataCell className="fw-bold">
                Tier {tier.tierNumber}
              </CTableDataCell>
              <CTableDataCell>{tier.tierName}</CTableDataCell>
              <CTableDataCell>
                <CBadge color={getDistributionTypeBadge(tier.distributionType)}>
                  {tier.distributionType.replace('_', ' ')}
                </CBadge>
              </CTableDataCell>
              <CTableDataCell>
                {tier.hurdleRate 
                  ? formatPercent(tier.hurdleRate * 100)
                  : '—'
                }
              </CTableDataCell>
              <CTableDataCell>
                {tier.splits.map((split, idx) => (
                  <div key={idx} className="small mb-1">
                    <span className="fw-medium">{split.partnerName}:</span>{' '}
                    {formatPercent(split.percent)}
                  </div>
                ))}
              </CTableDataCell>
            </CTableRow>
          ))}
        </CTableBody>
      </CTable>
    </div>
  );
}
