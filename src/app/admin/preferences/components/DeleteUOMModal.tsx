'use client';

import React from 'react';
import {
  CButton,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react';
import { UnitOfMeasure } from '@/lib/measures';

interface DeleteUOMModalProps {
  open: boolean;
  measure: UnitOfMeasure | null;
  onCancel: () => void;
  onConfirm: () => void;
  isProcessing?: boolean;
}

const DeleteUOMModal: React.FC<DeleteUOMModalProps> = ({
  open,
  measure,
  onCancel,
  onConfirm,
  isProcessing = false,
}) => {
  return (
    <CModal
      visible={open}
      onClose={onCancel}
      backdrop="static"
      aria-labelledby="delete-uom-modal-title"
    >
      <CModalHeader>
        <CModalTitle id="delete-uom-modal-title">Deactivate this unit of measure?</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <p className="mb-2">
          It will be hidden from dropdowns but remain in historical data.
        </p>
        {measure && (
          <p className="mb-0 text-muted">
            {measure.measure_code} &middot; {measure.measure_name}
          </p>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="ghost" onClick={onCancel} disabled={isProcessing}>
          Cancel
        </CButton>
        <CButton color="danger" onClick={onConfirm} disabled={isProcessing}>
          Deactivate
        </CButton>
      </CModalFooter>
    </CModal>
  );
};

export default DeleteUOMModal;
