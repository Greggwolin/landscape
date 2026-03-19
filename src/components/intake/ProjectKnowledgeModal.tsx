'use client';

import { useState, useEffect } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CFormLabel,
  CForm,
  CFormSelect,
  CFormTextarea,
  CSpinner,
  CAlert,
  CBadge,
} from '@coreui/react';
import { getAuthHeaders } from '@/lib/authHeaders';

interface ProjectKnowledgeModalProps {
  visible: boolean;
  projectId: number;
  doc: { docId: number; docName: string; docType: string } | null;
  onClose: () => void;
  onComplete: () => void;
}

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

const FALLBACK_DOC_TYPES = [
  'Financial Statement',
  'Market Analysis',
  'Appraisal Report',
  'Feasibility Study',
  'Development Agreement',
  'Environmental Assessment',
  'Title Report',
  'Survey',
  'Other',
];

const DEFAULT_SUGGESTED_TAGS = [
  'financial',
  'market-data',
  'property-info',
  'regulatory',
  'historical',
  'recent',
];

export default function ProjectKnowledgeModal({
  visible,
  projectId,
  doc,
  onClose,
  onComplete,
}: ProjectKnowledgeModalProps) {
  const [docTypes, setDocTypes] = useState<string[]>(FALLBACK_DOC_TYPES);
  const [selectedType, setSelectedType] = useState<string>(doc?.docType || '');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>('');
  const [notes, setNotes] = useState<string>('Document added to project knowledge base');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [loadingTypes, setLoadingTypes] = useState<boolean>(false);

  // Fetch doc types on mount
  useEffect(() => {
    if (visible && projectId) {
      setLoadingTypes(true);
      fetch(`${DJANGO_API_URL}/api/dms/projects/${projectId}/doc-types/`, {
        headers: getAuthHeaders(),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.doc_types) && data.doc_types.length > 0) {
            setDocTypes(data.doc_types.map((dt: { doc_type_name: string }) => dt.doc_type_name));
          }
        })
        .catch(() => {
          // Keep fallback
        })
        .finally(() => setLoadingTypes(false));
    }
  }, [visible, projectId]);

  // Reset form when modal opens
  useEffect(() => {
    if (visible && doc) {
      setSelectedType(doc.docType || '');
      setTags([]);
      setTagInput('');
      setNotes('Document added to project knowledge base');
    }
  }, [visible, doc]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleAddToProject = async () => {
    if (!doc) return;

    setIsProcessing(true);

    try {
      // Update the doc type on the core_doc record to match user's selection
      await fetch(`/api/projects/${projectId}/dms/update-doc-type`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ doc_id: doc.docId, doc_type: selectedType }),
      }).catch((err) => console.warn('[ProjectKnowledge] Failed to update doc type:', err));

      // Fire-and-forget: POST to intake/start
      fetch(`${DJANGO_API_URL}/api/intake/start`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doc_id: doc.docId,
          project_id: projectId,
          intent: 'project_knowledge',
          doc_type: selectedType,
          tags: tags,
          notes: notes,
        }),
      }).catch(() => {
        // Silent fail
      });

      // Fire-and-forget: POST to knowledge/documents/{docId}/process/
      fetch(`${DJANGO_API_URL}/api/knowledge/documents/${doc.docId}/process/`, {
        method: 'POST',
        headers: getAuthHeaders(),
      }).catch(() => {
        // Silent fail
      });

      onComplete();
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    // Roll back: delete UploadThing file + soft-delete core_doc
    if (doc?.docId) {
      try {
        await fetch(`/api/dms/documents/${doc.docId}/delete`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        console.log(`[ProjectKnowledge] Cancelled — rolled back doc ${doc.docId}`);
      } catch (err) {
        console.warn(`[ProjectKnowledge] Rollback failed for doc ${doc.docId}:`, err);
      }
    }
    onClose();
  };

  return (
    <CModal visible={visible} size="lg" alignment="center" backdrop="static" keyboard={false} portal={false}>
      <CModalHeader closeButton={false}>
        <CModalTitle>Project Knowledge Document</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Document Info */}
          <div>
            <div style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>{doc?.docName}</span>
              <CBadge color="info" shape="rounded-pill" style={{ fontSize: '0.75rem' }}>
                Project Knowledge
              </CBadge>
            </div>
          </div>

          {/* AI Summary Section — placeholder for future Landscaper skim
             Will show extracted summary, suggested tags, and doc type when backend is wired.
             Hidden until then to avoid a perpetual spinner. */}

          {/* Form Fields */}
          <CForm onSubmit={(e: React.FormEvent) => e.preventDefault()}>
            {/* Document Type */}
            <div style={{ marginBottom: '1.25rem' }}>
              <CFormLabel htmlFor="doc-type" style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                Document Type
              </CFormLabel>
              <CFormSelect
                id="doc-type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                disabled={loadingTypes}
                options={docTypes.map((type) => ({ label: type, value: type }))}
              />
            </div>

            {/* Tags */}
            <div style={{ marginBottom: '1.25rem' }}>
              <CFormLabel style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                Tags
              </CFormLabel>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add a tag..."
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    border: '1px solid var(--cui-border-color)',
                    backgroundColor: 'var(--cui-input-bg)',
                    color: 'var(--cui-body-color)',
                    fontSize: '0.9rem',
                  }}
                />
                <CButton type="button" color="secondary" size="sm" onClick={handleAddTag}>
                  Add
                </CButton>
              </div>
              {DEFAULT_SUGGESTED_TAGS.length > 0 && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--cui-secondary)', marginBottom: '0.5rem' }}>
                    Suggested:
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {DEFAULT_SUGGESTED_TAGS.map((tag) => (
                      <CBadge
                        key={tag}
                        color="secondary"
                        shape="rounded-pill"
                        style={{ cursor: 'pointer', fontSize: '0.8rem' }}
                        onClick={() => {
                          if (!tags.includes(tag)) {
                            setTags([...tags, tag]);
                          }
                        }}
                      >
                        + {tag}
                      </CBadge>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {tags.map((tag) => (
                  <CBadge
                    key={tag}
                    color="info"
                    shape="rounded-pill"
                    style={{ fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag} ✕
                  </CBadge>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: '1.25rem' }}>
              <CFormLabel htmlFor="notes" style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                Notes
              </CFormLabel>
              <CFormTextarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add notes about this document..."
              />
            </div>
          </CForm>

          {/* What Happens Next */}
          <CAlert color="info" style={{ marginBottom: 0 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              What happens next
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.85rem', lineHeight: '1.6' }}>
              <li>Saved to Documents tab</li>
              <li>Text extracted and chunked</li>
              <li>Embeddings generated for AI search</li>
              <li>Landscaper can reference in analysis</li>
            </ul>
          </CAlert>
        </div>
      </CModalBody>
      <CModalFooter className="d-flex justify-content-between">
        <CButton
          color="danger"
          variant="ghost"
          onClick={handleCancel}
          disabled={isProcessing}
          style={{ fontSize: '0.85rem' }}
        >
          Start Over
        </CButton>
        <div className="d-flex gap-2">
          <CButton type="button" color="secondary" onClick={handleCancel} disabled={isProcessing}>
            Cancel
          </CButton>
          <CButton
            color="info"
            onClick={handleAddToProject}
            disabled={isProcessing || !doc}
            style={{ backgroundColor: '#0891b2', borderColor: '#0891b2' }}
          >
            {isProcessing ? (
              <>
                <CSpinner size="sm" style={{ marginRight: '0.5rem' }} />
                Processing...
              </>
            ) : (
              'Add to Project'
            )}
          </CButton>
        </div>
      </CModalFooter>
    </CModal>
  );
}