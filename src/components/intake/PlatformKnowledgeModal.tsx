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
  CFormInput,
  CFormTextarea,
  CSpinner,
  CAlert,
  CBadge,
} from '@coreui/react';
import { getAuthHeaders } from '@/lib/authHeaders';

interface PlatformKnowledgeModalProps {
  visible: boolean;
  projectId: number;
  doc: { docId: number; docName: string; docType: string } | null;
  onClose: () => void;
  onComplete: () => void;
}

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

const KNOWLEDGE_CATEGORIES = [
  'Market Research',
  'Cap Rates / Yields',
  'Construction Costs',
  'Regulatory / Zoning',
  'Methodology / Standards',
  'Industry Benchmarks',
  'Economic Data',
  'Comparable Data',
  'Other',
];

const PROPERTY_TYPES = [
  { key: 'MF', label: 'MF' },
  { key: 'OFF', label: 'Office' },
  { key: 'RET', label: 'Retail' },
  { key: 'IND', label: 'Industrial' },
  { key: 'LAND', label: 'Land Dev' },
  { key: 'HTL', label: 'Hotel' },
  { key: 'MXU', label: 'Mixed Use' },
  { key: 'ALL', label: 'All Types' },
];

const DEFAULT_SUGGESTED_TAGS = [
  'market-data',
  'best-practice',
  'industry-standard',
  'research',
  'benchmark',
];

export default function PlatformKnowledgeModal({
  visible,
  projectId,
  doc,
  onClose,
  onComplete,
}: PlatformKnowledgeModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>([]);
  const [geographicScope, setGeographicScope] = useState<string>('');
  const [timePeriod, setTimePeriod] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Reset form when modal opens
  useEffect(() => {
    if (visible && doc) {
      setSelectedCategory('');
      setSelectedPropertyTypes([]);
      setGeographicScope('');
      setTimePeriod('');
      setTags([]);
      setTagInput('');
      setNotes('');
    }
  }, [visible, doc]);

  const handleTogglePropertyType = (key: string) => {
    setSelectedPropertyTypes((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
    );
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleAddToPlatform = async () => {
    if (!doc) return;

    setIsProcessing(true);

    try {
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
          intent: 'platform_knowledge',
          category: selectedCategory,
          property_types: selectedPropertyTypes,
          geographic_scope: geographicScope,
          time_period: timePeriod,
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
        console.log(`[PlatformKnowledge] Cancelled — rolled back doc ${doc.docId}`);
      } catch (err) {
        console.warn(`[PlatformKnowledge] Rollback failed for doc ${doc.docId}:`, err);
      }
    }
    onClose();
  };

  return (
    <CModal visible={visible} size="lg" alignment="center" backdrop="static" keyboard={false} portal={false}>
      <CModalHeader closeButton={false}>
        <CModalTitle>Platform Knowledge Document</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Document Info */}
          <div>
            <div style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>{doc?.docName}</span>
              <CBadge color="success" shape="rounded-pill" style={{ fontSize: '0.75rem', backgroundColor: '#7c3aed' }}>
                Platform Knowledge
              </CBadge>
            </div>
          </div>

          {/* AI Summary Section — placeholder for future Landscaper skim
             Will show extracted summary, suggested tags, property types, and geo scope when backend is wired.
             Hidden until then to avoid a perpetual spinner. */}

          {/* Form Fields */}
          <CForm onSubmit={(e: React.FormEvent) => e.preventDefault()}>
            {/* Knowledge Category */}
            <div style={{ marginBottom: '1.25rem' }}>
              <CFormLabel htmlFor="category" style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                Knowledge Category
              </CFormLabel>
              <select
                id="category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.375rem',
                  border: '1px solid var(--cui-border-color)',
                  backgroundColor: 'var(--cui-input-bg)',
                  color: 'var(--cui-body-color)',
                  fontSize: '0.9rem',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center',
                  backgroundSize: '16px',
                  paddingRight: '2.5rem',
                }}
              >
                <option value="">Select a category...</option>
                {KNOWLEDGE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Property Types */}
            <div style={{ marginBottom: '1.25rem' }}>
              <CFormLabel style={{ fontWeight: '600', marginBottom: '0.75rem', display: 'block' }}>
                Applies To (Property Types)
              </CFormLabel>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {PROPERTY_TYPES.map((pt) => (
                  <button
                    type="button"
                    key={pt.key}
                    onClick={() => handleTogglePropertyType(pt.key)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '0.375rem',
                      border: `2px solid ${selectedPropertyTypes.includes(pt.key) ? '#7c3aed' : 'var(--cui-border-color)'}`,
                      backgroundColor: selectedPropertyTypes.includes(pt.key) ? 'rgba(124, 58, 237, 0.1)' : 'var(--cui-input-bg)',
                      color: selectedPropertyTypes.includes(pt.key) ? '#7c3aed' : 'var(--cui-body-color)',
                      fontSize: '0.9rem',
                      fontWeight: selectedPropertyTypes.includes(pt.key) ? '600' : '400',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {pt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Geographic Scope */}
            <div style={{ marginBottom: '1.25rem' }}>
              <CFormLabel htmlFor="geo-scope" style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                Geographic Scope
              </CFormLabel>
              <CFormInput
                id="geo-scope"
                type="text"
                value={geographicScope}
                onChange={(e) => setGeographicScope(e.target.value)}
                placeholder="e.g., US, California, West Coast, Global"
              />
            </div>

            {/* Time Period */}
            <div style={{ marginBottom: '1.25rem' }}>
              <CFormLabel htmlFor="time-period" style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                Time Period
              </CFormLabel>
              <CFormInput
                id="time-period"
                type="text"
                value={timePeriod}
                onChange={(e) => setTimePeriod(e.target.value)}
                placeholder="e.g., 2024, Q1 2026, 2020-2025"
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
                    color="warning"
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

          {/* What Happens Next - Warning */}
          <CAlert color="warning" style={{ marginBottom: 0 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              ⚠ Not stored in any project's Documents tab
            </div>
            <div style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
              This knowledge will be indexed for Landscaper AI across all projects and available to all team members via the platform Knowledge Base.
            </div>
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
            onClick={handleAddToPlatform}
            disabled={isProcessing || !doc}
            style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed', color: 'white' }}
          >
            {isProcessing ? (
              <>
                <CSpinner size="sm" style={{ marginRight: '0.5rem' }} />
                Processing...
              </>
            ) : (
              'Add to Platform'
            )}
          </CButton>
        </div>
      </CModalFooter>
    </CModal>
  );
}