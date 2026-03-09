'use client';

/**
 * IntakeChoiceModal — Post-upload routing decision.
 *
 * Appears after documents are uploaded, giving the user 4 choices:
 *   1. Cancel — dismiss without doing anything
 *   2. Global Intelligence — fire-and-forget intake/start with intent=global_intelligence
 *   3. DMS Only — no further action, document stays in DMS
 *   4. Structured Ingestion — calls intake/start, opens Ingestion Workbench panel
 */

import React, { useState } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CSpinner,
} from '@coreui/react';
import { useWorkbench } from '@/contexts/WorkbenchContext';
import '@/styles/ingestion-workbench.css';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

export interface PendingIntakeDoc {
  docId: number;
  docName: string;
  docType: string | null;
}

interface IntakeChoiceModalProps {
  visible: boolean;
  projectId: number;
  docs: PendingIntakeDoc[];
  onClose: () => void;
}

type IntakeIntent = 'global_intelligence' | 'dms_only' | 'structured_ingestion';

export default function IntakeChoiceModal({
  visible,
  projectId,
  docs,
  onClose,
}: IntakeChoiceModalProps) {
  const { openWorkbench } = useWorkbench();
  const [submitting, setSubmitting] = useState(false);

  const handleChoice = async (intent: IntakeIntent) => {
    if (intent === 'dms_only') {
      // No intake session needed — just close
      onClose();
      return;
    }

    setSubmitting(true);
    try {
      if (intent === 'structured_ingestion') {
        // Structured ingestion: call intake/start for the first doc, then open the workbench.
        const doc = docs[0];
        try {
          const res = await fetch(`${DJANGO_API_URL}/api/intake/start/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              project_id: projectId,
              doc_id: doc.docId,
              intent,
              document_type: doc.docType,
            }),
          });
          const data = await res.json();
          console.log(`[IntakeChoice] Response ${res.status}:`, data);

          if (res.status === 201 && data.intakeUuid) {
            // Open workbench panel for structured field review
            openWorkbench({
              docId: doc.docId,
              docName: doc.docName,
              docType: doc.docType,
              intakeUuid: data.intakeUuid,
            });

            // Fire-and-forget extraction trigger
            fetch(`${DJANGO_API_URL}/api/knowledge/documents/${doc.docId}/extract-batched/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ project_id: projectId }),
            }).catch(err =>
              console.warn('[IntakeChoice] Extraction trigger failed:', err)
            );
          } else {
            console.error(`[IntakeChoice] Unexpected status ${res.status} for doc ${doc.docId}:`, data);
          }
        } catch (err) {
          console.warn(`[IntakeChoice] Failed to create intake for doc ${doc.docId}:`, err);
        }
        onClose();
        return;
      }

      // Global Intelligence: fire-and-forget
      await Promise.all(
        docs.map((doc) =>
          fetch(`${DJANGO_API_URL}/api/intake/start/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              project_id: projectId,
              doc_id: doc.docId,
              intent,
              document_type: doc.docType,
            }),
          }).catch((err) =>
            console.warn(`[IntakeChoice] Failed to create intake for doc ${doc.docId}:`, err)
          )
        )
      );
    } finally {
      setSubmitting(false);
      onClose();
    }
  };

  if (!visible || docs.length === 0) return null;

  const docLabel =
    docs.length === 1
      ? docs[0].docName
      : `${docs.length} documents`;

  return (
    <CModal
      visible={visible}
      onClose={onClose}
      alignment="center"
      size="lg"
      className="intake-choice-modal"
    >
      <CModalHeader closeButton>
        <CModalTitle>What would you like to do with {docLabel}?</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {/* Show detected document type(s) */}
        {docs.some(d => d.docType) && (
          <div className="mb-3 p-2 rounded" style={{ background: 'var(--cui-tertiary-bg)' }}>
            <small className="text-body-secondary d-block mb-1">Detected as:</small>
            <div className="d-flex flex-wrap gap-2">
              {docs.map((d, i) => (
                <span key={i} className="badge bg-primary">
                  {d.docType || 'Unknown'}{docs.length > 1 ? `: ${d.docName}` : ''}
                </span>
              ))}
            </div>
          </div>
        )}
        <p className="text-body-secondary mb-4">
          Choose how Landscape should process {docs.length === 1 ? 'this document' : 'these documents'}:
        </p>

        <div className="d-flex flex-column gap-3">
          {/* Structured Ingestion */}
          <button
            type="button"
            className="btn btn-outline-primary text-start p-3 d-flex align-items-start gap-3"
            disabled={submitting}
            onClick={() => handleChoice('structured_ingestion')}
          >
            <span style={{ fontSize: '1.5rem' }}>🧩</span>
            <div>
              <div className="fw-semibold">Structured Ingestion</div>
              <div className="text-body-secondary small">
                Extract fields, map to project schema, review values, then commit.
                Best for rent rolls, T-12s, and offering memoranda.
              </div>
            </div>
          </button>

          {/* Global Intelligence */}
          <button
            type="button"
            className="btn btn-outline-info text-start p-3 d-flex align-items-start gap-3"
            disabled={submitting}
            onClick={() => handleChoice('global_intelligence')}
          >
            <span style={{ fontSize: '1.5rem' }}>🌐</span>
            <div>
              <div className="fw-semibold">Global Intelligence</div>
              <div className="text-body-secondary small">
                Run broad extraction to populate the knowledge base.
                Good for appraisals, market studies, and general documents.
              </div>
            </div>
          </button>

          {/* DMS Only */}
          <button
            type="button"
            className="btn btn-outline-secondary text-start p-3 d-flex align-items-start gap-3"
            disabled={submitting}
            onClick={() => handleChoice('dms_only')}
          >
            <span style={{ fontSize: '1.5rem' }}>📁</span>
            <div>
              <div className="fw-semibold">DMS Only</div>
              <div className="text-body-secondary small">
                Store in the document management system without extraction.
                Good for surveys, title reports, and legal documents.
              </div>
            </div>
          </button>
        </div>
      </CModalBody>
      <CModalFooter>
        {submitting && <CSpinner size="sm" className="me-2" />}
        <CButton color="secondary" variant="ghost" disabled={submitting} onClick={onClose}>
          Cancel
        </CButton>
      </CModalFooter>
    </CModal>
  );
}
