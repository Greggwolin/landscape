'use client';

import { CBadge, CCard, CCardBody, CCardHeader } from '@coreui/react';
import { formatMoney } from '@/utils/formatters/number';

interface Props {
  purchasePrice: number;
  netAffecting: number;
}

export default function AcquisitionReconciliation({ purchasePrice, netAffecting }: Props) {
  const difference = purchasePrice - netAffecting;
  const diffColor = Math.abs(difference) < 0.01 ? 'success' : difference > 0 ? 'warning' : 'info';

  return (
    <CCard className="h-100 shadow-sm">
      <CCardHeader>
        <h6 className="mb-0">Reconciliation</h6>
        <small className="text-muted">Purchase price vs. events affecting purchase price</small>
      </CCardHeader>
      <CCardBody className="d-flex flex-column gap-3">
        <div className="d-flex justify-content-between">
          <span className="text-muted">Modeled Purchase Price</span>
          <span className="fw-semibold tnum" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(purchasePrice)}</span>
        </div>
        <div className="d-flex justify-content-between">
          <span className="text-muted">Net events (affecting purchase)</span>
          <span className="fw-semibold tnum" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(netAffecting)}</span>
        </div>
        <div className="d-flex justify-content-between align-items-center border-top pt-2">
          <span className="fw-semibold">Difference</span>
          <div className="d-flex align-items-center gap-2">
            <CBadge color={diffColor} shape="rounded-pill">{difference === 0 ? 'Balanced' : 'Delta'}</CBadge>
            <span className="fw-bold tnum" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(difference)}</span>
          </div>
        </div>
      </CCardBody>
    </CCard>
  );
}
