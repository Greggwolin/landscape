'use client';

import React, { useState } from 'react';
import {
  CModal,
  CModalBody,
  CModalHeader,
  CModalTitle,
  CModalFooter,
  CButton,
  CFormCheck,
  CFormInput,
  CAlert,
  CSpinner,
} from '@coreui/react';
import { useDeleteProject, type DeleteProjectResult } from '@/hooks/useDeleteProject';

interface DeleteProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  projectName: string;
  onDeleted: (result: DeleteProjectResult) => void;
}

type DocumentAction = 'delete' | 'transfer';

export default function DeleteProjectDialog({
  isOpen,
  onClose,
  projectId,
  projectName,
  onDeleted,
}: DeleteProjectDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [documentAction, setDocumentAction] = useState<DocumentAction>('delete');
  const [confirmName, setConfirmName] = useState('');
  const { deleteProject, isDeleting, error } = useDeleteProject();

  const nameMatches = confirmName.trim().toLowerCase() === projectName.trim().toLowerCase();

  const handleClose = () => {
    if (isDeleting) return;
    setStep(1);
    setDocumentAction('delete');
    setConfirmName('');
    onClose();
  };

  const handleContinue = () => {
    setStep(2);
  };

  const handleBack = () => {
    setConfirmName('');
    setStep(1);
  };

  const handleDelete = async () => {
    try {
      const result = await deleteProject(projectId, documentAction === 'transfer');
      onDeleted(result);
      handleClose();
    } catch {
      // Error state is set in the hook — stays on step 2
    }
  };

  return (
    <CModal visible={isOpen} onClose={handleClose} alignment="center" backdrop="static">
      <CModalHeader closeButton={!isDeleting}>
        <CModalTitle>Delete Project</CModalTitle>
      </CModalHeader>

      {step === 1 && (
        <>
          <CModalBody>
            <p className="mb-3">
              You are about to permanently delete{' '}
              <strong>{projectName}</strong>. This cannot be undone.
            </p>

            <p className="fw-semibold mb-2" style={{ fontSize: '0.875rem' }}>
              What should happen to the project&apos;s documents?
            </p>

            <div className="d-flex flex-column gap-2">
              <CFormCheck
                type="radio"
                name="docAction"
                id="docActionDelete"
                label="Delete all documents"
                checked={documentAction === 'delete'}
                onChange={() => setDocumentAction('delete')}
              />
              <div className="ms-4 small" style={{ color: 'var(--cui-secondary-color)', marginTop: '-0.25rem' }}>
                Documents and extracted assertions are permanently removed. Knowledge entities and facts already extracted remain in the platform.
              </div>

              <CFormCheck
                type="radio"
                name="docAction"
                id="docActionTransfer"
                label="Transfer documents to Platform Knowledge first"
                checked={documentAction === 'transfer'}
                onChange={() => setDocumentAction('transfer')}
              />
              <div className="ms-4 small" style={{ color: 'var(--cui-secondary-color)', marginTop: '-0.25rem' }}>
                Documents are ingested into the platform knowledge store (chunked &amp; embedded) before the project is deleted. Available for cross-project RAG retrieval.
              </div>
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="ghost" onClick={handleClose}>
              Cancel
            </CButton>
            <CButton color="danger" onClick={handleContinue}>
              Continue
            </CButton>
          </CModalFooter>
        </>
      )}

      {step === 2 && (
        <>
          <CModalBody>
            {error && (
              <CAlert color="danger" className="mb-3">
                {error}
              </CAlert>
            )}

            <p className="mb-2">
              Type <strong>{projectName}</strong> to confirm deletion.
            </p>

            {documentAction === 'transfer' && (
              <CAlert color="info" className="mb-3" style={{ fontSize: '0.85rem' }}>
                Documents will be transferred to Platform Knowledge before deletion.
                {' '}This may take a moment.
              </CAlert>
            )}

            <CFormInput
              type="text"
              placeholder={projectName}
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              disabled={isDeleting}
              autoFocus
            />
          </CModalBody>
          <CModalFooter>
            <CButton
              color="secondary"
              variant="ghost"
              onClick={handleBack}
              disabled={isDeleting}
            >
              Back
            </CButton>
            <CButton
              color="danger"
              onClick={handleDelete}
              disabled={!nameMatches || isDeleting}
            >
              {isDeleting ? (
                <>
                  <CSpinner size="sm" className="me-2" />
                  {documentAction === 'transfer' ? 'Transferring & Deleting...' : 'Deleting...'}
                </>
              ) : (
                'Delete Project'
              )}
            </CButton>
          </CModalFooter>
        </>
      )}
    </CModal>
  );
}
