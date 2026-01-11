'use client';

import React, { useState } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CAlert,
  CSpinner,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilTrash, cilFile } from '@coreui/icons';

interface DeleteConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  documents: Array<{
    doc_id: number;
    doc_name: string;
  }>;
  projectId: number;
  onDelete: () => Promise<void>;
}

export default function DeleteConfirmModal({
  visible,
  onClose,
  documents,
  projectId: _projectId,
  onDelete,
}: DeleteConfirmModalProps) {
  // projectId reserved for future audit logging
  void _projectId;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await onDelete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document(s)');
    } finally {
      setIsLoading(false);
    }
  };

  const isSingleDoc = documents.length === 1;

  return (
    <CModal visible={visible} onClose={onClose}>
      <CModalHeader>
        <CModalTitle className="d-flex align-items-center gap-2">
          <CIcon icon={cilTrash} className="text-danger" />
          Delete {isSingleDoc ? 'Document' : `${documents.length} Documents`}
        </CModalTitle>
      </CModalHeader>

      <CModalBody>
        <CAlert color="warning" className="mb-3">
          {isSingleDoc
            ? 'This document will be moved to trash and can be recovered later.'
            : `These ${documents.length} documents will be moved to trash.`}
        </CAlert>

        <div className="border rounded p-3 bg-light" style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {documents.map((doc) => (
            <div key={doc.doc_id} className="d-flex align-items-center gap-2 mb-2">
              <CIcon icon={cilFile} className="text-secondary" />
              <span className="text-truncate">{doc.doc_name}</span>
            </div>
          ))}
        </div>

        {error && (
          <CAlert color="danger" className="mt-3 mb-0">
            {error}
          </CAlert>
        )}
      </CModalBody>

      <CModalFooter>
        <CButton color="secondary" variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </CButton>
        <CButton color="danger" onClick={handleDelete} disabled={isLoading}>
          {isLoading ? (
            <CSpinner size="sm" />
          ) : (
            <>
              <CIcon icon={cilTrash} className="me-2" />
              Delete
            </>
          )}
        </CButton>
      </CModalFooter>
    </CModal>
  );
}
