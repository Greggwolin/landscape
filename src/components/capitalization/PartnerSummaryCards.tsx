'use client';

import React from 'react';
import { CCard, CCardBody, CCol, CRow } from '@coreui/react';

export type PartnerSummary = {
  partnerId: number;
  partnerName: string;
  partnerType: 'LP' | 'GP';
  contributed: number;
  distributed: number;
  irr?: number;
  equityMultiple?: number;
};

interface PartnerSummaryCardsProps {
  summaries: PartnerSummary[];
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export default function PartnerSummaryCards({ summaries }: PartnerSummaryCardsProps) {
  return (
    <CRow className="g-3">
      {summaries.map((partner) => (
        <CCol xs={12} md={6} key={partner.partnerId}>
          <CCard className="h-100 shadow-sm">
            <CCardBody>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div>
                  <div className="text-medium-emphasis text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                    {partner.partnerType}
                  </div>
                  <div className="fw-semibold" style={{ fontSize: '1.05rem' }}>{partner.partnerName}</div>
                </div>
                <span className="badge text-bg-light">
                  Equity Multiple: {formatMultiple(partner.equityMultiple)}
                </span>
              </div>

              <div className="d-flex flex-column gap-2">
                <SummaryRow label="Total Contributed" value={currencyFormatter.format(partner.contributed || 0)} />
                <SummaryRow label="Total Distributed" value={currencyFormatter.format(partner.distributed || 0)} />
                <SummaryRow label="IRR" value={percentFormatter.format((partner.irr || 0))} />
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      ))}
    </CRow>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="d-flex justify-content-between align-items-center">
      <span className="text-medium-emphasis">{label}</span>
      <span className="fw-semibold">{value}</span>
    </div>
  );
}

function formatMultiple(value?: number) {
  if (!Number.isFinite(value) || value === undefined) return '—';
  return value.toFixed(2) + 'x';
}
