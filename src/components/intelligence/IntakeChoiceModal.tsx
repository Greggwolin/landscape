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

import React, { useState, useEffect } from 'react';
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
import { getAuthHeaders } from '@/lib/authHeaders';

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

interface ProjectDocType {
  id: number;
  doc_type_name: string;
  is_from_template: boolean;
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
  const [projectDocTypes, setProjectDocTypes] = useState<ProjectDocType[]>([]);
  const [selectedDocType, setSelectedDocType] = useState<string>('');

  // Fetch project doc types for the profile selector
  useEffect(() => {
    if (!visible || !projectId) return;
    fetch(`${DJANGO_API_URL}/api/dms/projects/${projectId}/doc-types/`, { headers: getAuthHeaders() })
      .then((res) => (res.ok ? res.json() : { results: [] }))
      .then((data) => {
        const types = data.results || data.doc_types || [];
        setProjectDocTypes(types);
        // Pre-select based on auto-detection if it matches a project type
        if (docs.length > 0 && docs[0].docType) {
          const autoDetected = docs[0].docType.toLowerCase();
          const match = types.find(
            (t: ProjectDocType) => t.doc_type_name.toLowerCase() === autoDetected
          );
          setSelectedDocType(match ? match.doc_type_name : docs[0].docType || '');
        }
      })
      .catch((err) => console.error('Failed to fetch project doc types:', err));
  }, [visible, projectId, docs]);

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
        const docTypeToUse = selectedDocType || doc.docType;
        try {
          const res = await fetch(`${DJANGO_API_URL}/api/intake/start/`, {
            method: 'POST',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({
              project_id: projectId,
              doc_id: doc.docId,
              intent,
              document_type: docTypeToUse,
            }),
          });
          const data = await res.json();
          console.log(`[IntakeChoice] Response ${res.status}:`, data);

          if (res.status === 201 && data.intakeUuid) {
            // Open workbench panel for structured field review
            openWorkbench({
              docId: doc.docId,
              docName: doc.docName,
              docType: docTypeToUse,
              intakeUuid: data.intakeUuid,
            });

            // Fire-and-forget extraction trigger
            fetch(`${DJANGO_API_URL}/api/knowledge/documents/${doc.docId}/extract-batched/`, {
              method: 'POST',
              headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
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
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({
              project_id: projectId,
              doc_id: doc.docId,
              intent,
              document_type: selectedDocType || doc.docType,
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
        {/* Document profile selector */}
        <div className="mb-3 p-2 rounded" style={{ background: 'var(--cui-tertiary-bg)' }}>
          <small className="text-body-secondary d-block mb-1">
            File to:
            {docs.some(d => d.docType) && (
              <span className="ms-1" style={{ color: 'var(--cui-secondary-color)' }}>
                (auto-detected: {docs[0].docType})
              </span>
            )}
          </small>
          <select
            className="form-select form-select-sm"
            style={{
              backgroundColor: 'var(--cui-input-bg)',
              color: 'var(--cui-body-color)',
              borderColor: 'var(--cui-border-color)',
            }}
            value={selectedDocType}
            onChange={(e) => setSelectedDocType(e.target.value)}
          >
            <option value="">Select document type...</option>
            {projectDocTypes.map((dt) => (
              <option key={dt.id || dt.doc_type_name} value={dt.doc_type_name}>
                {dt.doc_type_name}
              </option>
            ))}
            {/* If auto-detected type isn't in project types, show it as an option */}
            {docs[0]?.docType &&
              !projectDocTypes.some(
                (dt) => dt.doc_type_name.toLowerCase() === (docs[0].docType || '').toLowerCase()
              ) && (
                <option value={docs[0].docType}>
                  {docs[0].docType} (detected)
                </option>
              )}
          </select>
        </div>
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
