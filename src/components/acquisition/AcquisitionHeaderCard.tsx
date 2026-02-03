'use client';

import { useMemo } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CRow,
  CSpinner,
} from '@coreui/react';
import { SemanticButton } from '@/components/ui/landscape';
import type { AcquisitionHeader } from '@/types/acquisition';
import { formatMoney } from '@/utils/formatters/number';

interface Props {
  data: AcquisitionHeader | null;
  loading: boolean;
  saving: boolean;
  onChange: (patch: Partial<AcquisitionHeader>) => void;
  onSave: () => Promise<void>;
}

const parseNumberOrNull = (value: string) =>
  value === '' ? null : Number(value);

export default function AcquisitionHeaderCard({ data, loading, saving, onChange, onSave }: Props) {
  const purchasePriceDisplay = useMemo(() =>
    data?.purchase_price !== null && data?.purchase_price !== undefined
      ? formatMoney(Number(data.purchase_price))
      : '—',
  [data?.purchase_price]);

  return (
    <CCard className="h-100 shadow-sm">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-0">Acquisition Assumptions</h5>
          <small className="text-muted">Backed by landscape.tbl_property_acquisition</small>
        </div>
        <SemanticButton intent="primary-action" size="sm" disabled={saving || loading || !data} onClick={onSave}>
          {saving ? <CSpinner size="sm" className="me-2" /> : null}
          Save
        </SemanticButton>
      </CCardHeader>
      <CCardBody>
        {loading || !data ? (
          <div className="d-flex align-items-center text-muted" style={{ minHeight: 120 }}>
            <CSpinner size="sm" className="me-2" /> Loading acquisition assumptions...
          </div>
        ) : (
          <>
            <CRow className="gy-3">
              <CCol md={6}>
                <CFormLabel>Purchase Price</CFormLabel>
                <CFormInput
                  type="number"
                  value={data.purchase_price ?? ''}
                  placeholder="0"
                  onChange={(e) => onChange({ purchase_price: parseNumberOrNull(e.target.value) })}
                />
                <div className="text-muted mt-1 small">{purchasePriceDisplay}</div>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Acquisition Date</CFormLabel>
                <CFormInput
                  type="date"
                  value={data.acquisition_date ?? ''}
                  onChange={(e) => onChange({ acquisition_date: e.target.value || null })}
                />
              </CCol>
            </CRow>

            <CRow className="gy-3 mt-1">
              <CCol md={6}>
                <CFormLabel>Due Diligence (days)</CFormLabel>
                <CFormInput
                  type="number"
                  value={data.due_diligence_days ?? ''}
                  placeholder="30"
                  onChange={(e) => onChange({ due_diligence_days: parseNumberOrNull(e.target.value) })}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Earnest Money</CFormLabel>
                <CFormInput
                  type="number"
                  value={data.earnest_money ?? ''}
                  placeholder="0"
                  onChange={(e) => onChange({ earnest_money: parseNumberOrNull(e.target.value) })}
                />
              </CCol>
            </CRow>
          </>
        )}
      </CCardBody>
    </CCard>
  );
}
