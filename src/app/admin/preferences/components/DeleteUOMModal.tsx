'use client';

import React from 'react';
import {
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react';
import { UnitOfMeasure } from '@/lib/measures';
import { SemanticButton } from '@/components/ui/landscape';

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
        <SemanticButton intent="secondary-action" variant="ghost" onClick={onCancel} disabled={isProcessing}>
          Cancel
        </SemanticButton>
        <SemanticButton
          intent="destructive-action"
          onClick={onConfirm}
          disabled={isProcessing}
        >
          Deactivate
        </SemanticButton>
      </CModalFooter>
    </CModal>
  );
};

export default DeleteUOMModal;
