'use client';

import React from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CAlert,
} from '@coreui/react';
import { SemanticButton } from '@/components/ui/landscape';
import CIcon from '@coreui/icons-react';
import { cilWarning, cilFile, cilCloudUpload, cilCopy } from '@coreui/icons';

interface ExistingDoc {
  doc_id: number;
  filename: string;
  version_number: number;
  uploaded_at: string;
  extraction_summary: {
    facts_extracted: number;
    embeddings: number;
  };
}

interface UploadCollisionModalProps {
  visible: boolean;
  onClose: () => void;
  filename: string;
  matchType: 'filename' | 'content' | 'both';
  existingDoc: ExistingDoc;
  onReplace: () => void;
  onUploadAsNew: () => void;
  isLoading?: boolean;
}

export default function UploadCollisionModal({
  visible,
  onClose,
  filename,
  matchType,
  existingDoc,
  onReplace,
  onUploadAsNew,
  isLoading = false,
}: UploadCollisionModalProps) {
  const hasExtractions =
    existingDoc.extraction_summary.facts_extracted > 0 ||
    existingDoc.extraction_summary.embeddings > 0;

  const getMatchMessage = () => {
    switch (matchType) {
      case 'content':
        return 'A file with identical content already exists in this project.';
      case 'filename':
        return `A file named "${filename}" already exists in this project.`;
      case 'both':
        return 'This exact file already exists in this project.';
      default:
        return 'A matching document was found.';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <CModal visible={visible} onClose={onClose} size="lg">
      <CModalHeader>
        <CModalTitle className="d-flex align-items-center gap-2">
          <CIcon icon={cilWarning} className="text-warning" />
          Document Already Exists
        </CModalTitle>
      </CModalHeader>

      <CModalBody>
        <CAlert color="warning" className="mb-4">
          {getMatchMessage()}
        </CAlert>

        <div className="border rounded p-3 bg-light mb-4">
          <div className="d-flex align-items-start gap-3">
            <CIcon icon={cilFile} size="xl" className="text-secondary mt-1" />
            <div className="flex-grow-1">
              <p className="fw-semibold mb-1">{existingDoc.filename}</p>
              <p className="text-secondary small mb-1">
                Version {existingDoc.version_number} &middot; Uploaded{' '}
                {formatDate(existingDoc.uploaded_at)}
              </p>
              {hasExtractions && (
                <p className="text-secondary small mb-0">
                  <span className="me-2">
                    {existingDoc.extraction_summary.facts_extracted} facts extracted
                  </span>
                  &middot;
                  <span className="ms-2">
                    {existingDoc.extraction_summary.embeddings} embeddings
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>

        {hasExtractions && (
          <p className="text-muted small">
            Landscaper has already extracted knowledge from this document.
            Replacing will add new extractions while preserving existing ones.
          </p>
        )}
      </CModalBody>

      <CModalFooter className="d-flex gap-2 justify-content-end">
        <SemanticButton intent="secondary-action" variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </SemanticButton>
        <SemanticButton
          intent="secondary-action"
          variant="outline"
          onClick={onUploadAsNew}
          disabled={isLoading}
        >
          <CIcon icon={cilCopy} className="me-2" />
          Upload as New Document
        </SemanticButton>
        <SemanticButton intent="primary-action" onClick={onReplace} disabled={isLoading}>
          <CIcon icon={cilCloudUpload} className="me-2" />
          Replace (Add Knowledge)
        </SemanticButton>
      </CModalFooter>
    </CModal>
  );
}
