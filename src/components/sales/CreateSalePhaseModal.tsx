import React, { useEffect, useState } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormLabel,
  CFormInput,
  CFormFeedback,
  CRow,
  CCol,
} from '@coreui/react';
import type { ParcelWithSale, SalePhaseBenchmarks, CreateSalePhasePayload } from '@/types/sales-absorption';
import { SemanticButton } from '@/components/ui/landscape';

interface Props {
  open: boolean;
  parcel: ParcelWithSale | null;
  defaultBenchmarks?: SalePhaseBenchmarks;
  onClose: () => void;
  onSubmit: (payload: CreateSalePhasePayload) => Promise<void> | void;
  isSaving: boolean;
}

export default function CreateSalePhaseModal({
  open,
  parcel,
  defaultBenchmarks,
  onClose,
  onSubmit,
  isSaving,
}: Props) {
  const [phaseNumber, setPhaseNumber] = useState<number>(1);
  const [saleDate, setSaleDate] = useState<string>('');
  const [onsitePct, setOnsitePct] = useState<number | ''>(defaultBenchmarks?.onsite_cost_pct ?? '');
  const [commissionPct, setCommissionPct] = useState<number | ''>(defaultBenchmarks?.commission_pct ?? '');
  const [closingCostPerUnit, setClosingCostPerUnit] = useState<number | ''>(defaultBenchmarks?.closing_cost_per_unit ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !parcel) return;
    setPhaseNumber(parcel.sale_phase_number || 1);
    setSaleDate(parcel.sale_date || '');
    setOnsitePct(parcel.onsite_cost_pct ?? defaultBenchmarks?.onsite_cost_pct ?? '');
    setCommissionPct(parcel.commission_pct ?? defaultBenchmarks?.commission_pct ?? '');
    setClosingCostPerUnit(parcel.closing_cost_per_unit ?? defaultBenchmarks?.closing_cost_per_unit ?? '');
    setErrors({});
  }, [open, parcel, defaultBenchmarks]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!phaseNumber || phaseNumber <= 0) {
      nextErrors.phaseNumber = 'Enter a positive integer';
    }
    if (!saleDate) {
      nextErrors.saleDate = 'Sale date is required';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    await onSubmit({
      parcel_id: parcel!.parcel_id,
      sale_phase_number: phaseNumber,
      sale_date: saleDate,
      onsite_cost_pct: onsitePct === '' ? null : Number(onsitePct),
      commission_pct: commissionPct === '' ? null : Number(commissionPct),
      closing_cost_per_unit: closingCostPerUnit === '' ? null : Number(closingCostPerUnit),
    });
  };

  if (!parcel) {
    return null;
  }

  return (
    <CModal visible={open} onClose={onClose} size="lg" backdrop="static">
      <CForm onSubmit={handleSubmit}>
        <CModalHeader>
          <CModalTitle>Create Sale Phase</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="text-muted mb-4">
            Assign parcel <strong>{parcel.parcel_code}</strong> to a new sale phase. Provide the sale date and defaults that other parcels in this phase should inherit.
          </p>
          <CRow className="g-3">
            <CCol xs={12} md={4}>
              <CFormLabel>Sale Phase Number</CFormLabel>
              <CFormInput
                type="number"
                value={phaseNumber}
                onChange={(event) => setPhaseNumber(Number(event.target.value))}
                min={1}
                max={999}
                invalid={Boolean(errors.phaseNumber)}
              />
              {errors.phaseNumber && <CFormFeedback invalid>{errors.phaseNumber}</CFormFeedback>}
            </CCol>
            <CCol xs={12} md={4}>
              <CFormLabel>Sale Date</CFormLabel>
              <CFormInput
                type="date"
                value={saleDate}
                onChange={(event) => setSaleDate(event.target.value)}
                invalid={Boolean(errors.saleDate)}
              />
              {errors.saleDate && <CFormFeedback invalid>{errors.saleDate}</CFormFeedback>}
            </CCol>
            <CCol xs={12} md={4}>
              <CFormLabel>Onsites %</CFormLabel>
              <CFormInput
                type="number"
                value={onsitePct}
                onChange={(event) => setOnsitePct(event.target.value === '' ? '' : Number(event.target.value))}
                min={0}
                max={20}
                step={0.1}
                placeholder="0.0"
              />
            </CCol>
            <CCol xs={12} md={4}>
              <CFormLabel>Commissions %</CFormLabel>
              <CFormInput
                type="number"
                value={commissionPct}
                onChange={(event) => setCommissionPct(event.target.value === '' ? '' : Number(event.target.value))}
                min={0}
                max={10}
                step={0.1}
                placeholder="0.0"
              />
            </CCol>
            <CCol xs={12} md={4}>
              <CFormLabel>Closing Cost / Unit</CFormLabel>
              <CFormInput
                type="number"
                value={closingCostPerUnit}
                onChange={(event) => setClosingCostPerUnit(event.target.value === '' ? '' : Number(event.target.value))}
                min={0}
                step={1}
                placeholder="0"
              />
            </CCol>
          </CRow>
        </CModalBody>
        <CModalFooter>
          <SemanticButton intent="secondary-action" onClick={onClose} disabled={isSaving}>
            Cancel
          </SemanticButton>
          <SemanticButton intent="primary-action" type="submit" disabled={isSaving}>
            {isSaving ? 'Creating…' : 'Create Phase'}
          </SemanticButton>
        </CModalFooter>
      </CForm>
    </CModal>
  );
}
