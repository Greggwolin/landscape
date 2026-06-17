'use client';

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
  CFormSelect,
  CButton,
} from '@coreui/react';
import type { EquityPartner } from './EquityPartnersTable';

export interface EquityPartnerInput {
  partnerName: string;
  partnerType: 'LP' | 'GP' | 'Sponsor';
  capitalCommitted: number;
  ownershipPercent: number;
  /** Percent value as entered (e.g. 8 for 8%); null when blank. */
  preferredReturn: number | null;
}

interface EquityPartnerModalProps {
  open: boolean;
  /** When provided, the modal edits this partner; otherwise it creates a new one. */
  initial?: EquityPartner | null;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (values: EquityPartnerInput) => void;
}

/**
 * Compact add/edit form for an equity partner. Persists via the page's mutations
 * against /api/capitalization/equity (tbl_equity). Preferred return is entered and
 * displayed as a percent (8 = 8%).
 */
export default function EquityPartnerModal({
  open,
  initial,
  saving = false,
  onClose,
  onSubmit,
}: EquityPartnerModalProps) {
  const [partnerName, setPartnerName] = useState('');
  const [partnerType, setPartnerType] = useState<'LP' | 'GP' | 'Sponsor'>('LP');
  const [capitalCommitted, setCapitalCommitted] = useState('');
  const [ownershipPercent, setOwnershipPercent] = useState('');
  const [preferredReturn, setPreferredReturn] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPartnerName(initial?.partnerName ?? '');
    setPartnerType(initial?.partnerType ?? 'LP');
    setCapitalCommitted(initial ? String(initial.capitalCommitted) : '');
    setOwnershipPercent(initial ? String(initial.ownershipPercent) : '');
    setPreferredReturn(
      initial?.preferredReturn != null ? String(initial.preferredReturn * 100) : ''
    );
    setError(null);
  }, [open, initial]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!partnerName.trim()) {
      setError('Partner name is required');
      return;
    }
    const ownership = Number(ownershipPercent);
    if (Number.isNaN(ownership) || ownership < 0 || ownership > 100) {
      setError('Ownership % must be between 0 and 100');
      return;
    }
    onSubmit({
      partnerName: partnerName.trim(),
      partnerType,
      capitalCommitted: Number(capitalCommitted) || 0,
      ownershipPercent: ownership,
      preferredReturn: preferredReturn === '' ? null : Number(preferredReturn),
    });
  };

  return (
    <CModal visible={open} onClose={onClose} backdrop="static">
      <CForm onSubmit={handleSubmit}>
        <CModalHeader>
          <CModalTitle>{initial ? 'Edit Partner' : 'Add Partner'}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <div className="mb-3">
            <CFormLabel>Partner Name</CFormLabel>
            <CFormInput
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              placeholder="e.g. Acme Capital LP"
            />
          </div>
          <div className="mb-3">
            <CFormLabel>Type</CFormLabel>
            <CFormSelect
              value={partnerType}
              onChange={(e) => setPartnerType(e.target.value as 'LP' | 'GP' | 'Sponsor')}
            >
              <option value="LP">LP</option>
              <option value="GP">GP</option>
              <option value="Sponsor">Sponsor</option>
            </CFormSelect>
          </div>
          <div className="mb-3">
            <CFormLabel>Capital Committed ($)</CFormLabel>
            <CFormInput
              type="number"
              value={capitalCommitted}
              onChange={(e) => setCapitalCommitted(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="mb-3">
            <CFormLabel>Ownership %</CFormLabel>
            <CFormInput
              type="number"
              step="0.01"
              value={ownershipPercent}
              onChange={(e) => setOwnershipPercent(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="mb-1">
            <CFormLabel>Preferred Return % (optional)</CFormLabel>
            <CFormInput
              type="number"
              step="0.01"
              value={preferredReturn}
              onChange={(e) => setPreferredReturn(e.target.value)}
              placeholder="e.g. 8"
            />
          </div>
          {error && <div className="text-danger small mt-2">{error}</div>}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </CButton>
          <CButton color="primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  );
}
