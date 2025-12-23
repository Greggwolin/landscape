'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CBadge,
  CSpinner,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormInput,
  CFormTextarea,
  CAlert,
  CButtonGroup,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCheckCircle, cilXCircle, cilPencil, cilCloudDownload, cilTrash } from '@coreui/icons';

interface ExtractionItem {
  extraction_id: number;
  doc_id: number | null;
  doc_name: string | null;
  target_table: string;
  target_field: string | null;
  extracted_value: Record<string, unknown>;
  extraction_type: string;
  source_text: string | null;
  confidence_score: number;
  status: 'pending' | 'validated' | 'rejected' | 'applied';
  validated_value: Record<string, unknown> | null;
  validated_by: string | null;
  validated_at: string | null;
  created_at: string;
}

interface ExtractionValidationProps {
  projectId: string;
  onExtractionApplied?: () => void;
}

const EXTRACTION_TYPE_LABELS: Record<string, string> = {
  unit_mix: 'Unit Mix',
  rent_roll: 'Rent Roll',
  opex: 'Operating Expenses',
  market_comps: 'Market Comps',
  acquisition: 'Acquisition',
};

const TABLE_LABELS: Record<string, string> = {
  tbl_mf_unit: 'Units',
  tbl_operating_expense: 'OpEx',
  tbl_rental_comp: 'Comps',
  tbl_acquisition: 'Acquisition',
  tbl_project: 'Project',
};

export function ExtractionValidation({ projectId, onExtractionApplied }: ExtractionValidationProps) {
  const [extractions, setExtractions] = useState<ExtractionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedExtraction, setSelectedExtraction] = useState<ExtractionItem | null>(null);
  const [editedValue, setEditedValue] = useState<string>('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  const fetchExtractions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = statusFilter
        ? `/api/projects/${projectId}/extractions?status=${statusFilter}`
        : `/api/projects/${projectId}/extractions`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setExtractions(data.extractions || []);
      } else {
        setError(data.error || 'Failed to fetch extractions');
      }
    } catch (err) {
      setError('Network error fetching extractions');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, statusFilter]);

  useEffect(() => {
    fetchExtractions();
  }, [fetchExtractions]);

  const handleExtract = async (extractionType: string) => {
    setIsExtracting(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/extractions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extraction_type: extractionType }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusFilter('pending');
        fetchExtractions();
      } else {
        setError(data.error || 'Extraction failed');
      }
    } catch (err) {
      setError('Network error during extraction');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleValidate = async (extractionId: number, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`/api/projects/${projectId}/extractions/${extractionId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        fetchExtractions();
      } else {
        setError(data.error || 'Validation failed');
      }
    } catch (err) {
      setError('Network error during validation');
    }
  };

  const handleEdit = (extraction: ExtractionItem) => {
    setSelectedExtraction(extraction);
    setEditedValue(JSON.stringify(extraction.extracted_value, null, 2));
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedExtraction) return;

    try {
      const parsedValue = JSON.parse(editedValue);
      const res = await fetch(
        `/api/projects/${projectId}/extractions/${selectedExtraction.extraction_id}/validate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'edit',
            validated_value: parsedValue,
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setShowEditModal(false);
        setSelectedExtraction(null);
        fetchExtractions();
      } else {
        setError(data.error || 'Edit failed');
      }
    } catch (err) {
      setError('Invalid JSON format');
    }
  };

  const handleApplyAll = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/extractions/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        fetchExtractions();
        onExtractionApplied?.();
      } else {
        setError(data.error || 'Apply failed');
      }
    } catch (err) {
      setError('Network error during apply');
    }
  };

  const handleDelete = async (extractionId: number) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/extractions/${extractionId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchExtractions();
      } else {
        setError(data.error || 'Delete failed');
      }
    } catch (err) {
      setError('Network error during delete');
    }
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 0.8) return <CBadge color="success">High ({Math.round(score * 100)}%)</CBadge>;
    if (score >= 0.5) return <CBadge color="warning">Med ({Math.round(score * 100)}%)</CBadge>;
    return <CBadge color="danger">Low ({Math.round(score * 100)}%)</CBadge>;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'warning',
      validated: 'info',
      rejected: 'danger',
      applied: 'success',
    };
    return <CBadge color={colors[status] || 'secondary'}>{status}</CBadge>;
  };

  const renderValuePreview = (value: Record<string, unknown>) => {
    const entries = Object.entries(value).slice(0, 3);
    return (
      <div className="small">
        {entries.map(([key, val]) => (
          <div key={key} className="text-truncate" style={{ maxWidth: '200px' }}>
            <strong>{key}:</strong> {String(val)}
          </div>
        ))}
        {Object.keys(value).length > 3 && (
          <span className="text-muted">+{Object.keys(value).length - 3} more fields</span>
        )}
      </div>
    );
  };

  const pendingCount = extractions.filter((e) => e.status === 'pending').length;
  const validatedCount = extractions.filter((e) => e.status === 'validated').length;

  return (
    <CCard className="extraction-validation">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div>
          <strong>Data Extractions</strong>
          {pendingCount > 0 && (
            <CBadge color="warning" className="ms-2">
              {pendingCount} pending
            </CBadge>
          )}
        </div>
        <div className="d-flex gap-2">
          <CDropdown>
            <CDropdownToggle color="primary" disabled={isExtracting}>
              {isExtracting ? <CSpinner size="sm" /> : 'Extract Data'}
            </CDropdownToggle>
            <CDropdownMenu>
              <CDropdownItem onClick={() => handleExtract('unit_mix')}>Unit Mix</CDropdownItem>
              <CDropdownItem onClick={() => handleExtract('rent_roll')}>Rent Roll</CDropdownItem>
              <CDropdownItem onClick={() => handleExtract('opex')}>Operating Expenses</CDropdownItem>
              <CDropdownItem onClick={() => handleExtract('market_comps')}>Market Comps</CDropdownItem>
              <CDropdownItem onClick={() => handleExtract('acquisition')}>Acquisition Data</CDropdownItem>
            </CDropdownMenu>
          </CDropdown>

          {validatedCount > 0 && (
            <CButton color="success" onClick={handleApplyAll}>
              <CIcon icon={cilCloudDownload} className="me-1" />
              Apply {validatedCount} Validated
            </CButton>
          )}
        </div>
      </CCardHeader>
      <CCardBody>
        {error && (
          <CAlert color="danger" dismissible onClose={() => setError(null)}>
            {error}
          </CAlert>
        )}

        {/* Status Filter */}
        <CButtonGroup className="mb-3">
          <CButton
            color={statusFilter === 'pending' ? 'primary' : 'outline-primary'}
            onClick={() => setStatusFilter('pending')}
          >
            Pending
          </CButton>
          <CButton
            color={statusFilter === 'validated' ? 'primary' : 'outline-primary'}
            onClick={() => setStatusFilter('validated')}
          >
            Validated
          </CButton>
          <CButton
            color={statusFilter === 'applied' ? 'primary' : 'outline-primary'}
            onClick={() => setStatusFilter('applied')}
          >
            Applied
          </CButton>
          <CButton
            color={statusFilter === '' ? 'primary' : 'outline-primary'}
            onClick={() => setStatusFilter('')}
          >
            All
          </CButton>
        </CButtonGroup>

        {isLoading ? (
          <div className="text-center p-4">
            <CSpinner />
            <p className="mt-2 text-muted">Loading extractions...</p>
          </div>
        ) : extractions.length === 0 ? (
          <div className="text-center p-4 text-muted">
            <p>No extractions found.</p>
            <p className="small">
              Use the &quot;Extract Data&quot; button to extract structured data from your documents.
            </p>
          </div>
        ) : (
          <CTable hover responsive>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Type</CTableHeaderCell>
                <CTableHeaderCell>Target</CTableHeaderCell>
                <CTableHeaderCell>Value Preview</CTableHeaderCell>
                <CTableHeaderCell>Source</CTableHeaderCell>
                <CTableHeaderCell>Confidence</CTableHeaderCell>
                <CTableHeaderCell>Status</CTableHeaderCell>
                <CTableHeaderCell>Actions</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {extractions.map((ext) => (
                <CTableRow key={ext.extraction_id}>
                  <CTableDataCell>
                    {EXTRACTION_TYPE_LABELS[ext.extraction_type] || ext.extraction_type}
                  </CTableDataCell>
                  <CTableDataCell>
                    {TABLE_LABELS[ext.target_table] || ext.target_table}
                  </CTableDataCell>
                  <CTableDataCell>{renderValuePreview(ext.extracted_value)}</CTableDataCell>
                  <CTableDataCell>
                    <span
                      className="text-truncate d-inline-block"
                      style={{ maxWidth: '150px' }}
                      title={ext.doc_name || undefined}
                    >
                      {ext.doc_name || 'Unknown'}
                    </span>
                  </CTableDataCell>
                  <CTableDataCell>{getConfidenceBadge(ext.confidence_score)}</CTableDataCell>
                  <CTableDataCell>{getStatusBadge(ext.status)}</CTableDataCell>
                  <CTableDataCell>
                    {ext.status === 'pending' && (
                      <div className="d-flex gap-1">
                        <CButton
                          color="success"
                          size="sm"
                          title="Approve"
                          onClick={() => handleValidate(ext.extraction_id, 'approve')}
                        >
                          <CIcon icon={cilCheckCircle} />
                        </CButton>
                        <CButton
                          color="warning"
                          size="sm"
                          title="Edit"
                          onClick={() => handleEdit(ext)}
                        >
                          <CIcon icon={cilPencil} />
                        </CButton>
                        <CButton
                          color="danger"
                          size="sm"
                          title="Reject"
                          onClick={() => handleValidate(ext.extraction_id, 'reject')}
                        >
                          <CIcon icon={cilXCircle} />
                        </CButton>
                        <CButton
                          color="secondary"
                          size="sm"
                          title="Delete"
                          onClick={() => handleDelete(ext.extraction_id)}
                        >
                          <CIcon icon={cilTrash} />
                        </CButton>
                      </div>
                    )}
                    {ext.status === 'validated' && (
                      <span className="text-muted small">Ready to apply</span>
                    )}
                    {ext.status === 'applied' && (
                      <span className="text-success small">Applied</span>
                    )}
                    {ext.status === 'rejected' && (
                      <span className="text-danger small">Rejected</span>
                    )}
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
        )}
      </CCardBody>

      {/* Edit Modal */}
      <CModal visible={showEditModal} onClose={() => setShowEditModal(false)} size="lg">
        <CModalHeader>
          <CModalTitle>Edit Extracted Value</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {selectedExtraction && (
            <>
              <div className="mb-3">
                <strong>Type:</strong>{' '}
                {EXTRACTION_TYPE_LABELS[selectedExtraction.extraction_type] ||
                  selectedExtraction.extraction_type}
              </div>
              <div className="mb-3">
                <strong>Source:</strong> {selectedExtraction.doc_name || 'Unknown'}
              </div>
              {selectedExtraction.source_text && (
                <div className="mb-3">
                  <strong>Source Text:</strong>
                  <div
                    className="p-2 bg-light rounded small"
                    style={{ maxHeight: '150px', overflow: 'auto' }}
                  >
                    {selectedExtraction.source_text}
                  </div>
                </div>
              )}
              <div className="mb-3">
                <strong>Extracted Value (JSON):</strong>
                <CFormTextarea
                  value={editedValue}
                  onChange={(e) => setEditedValue(e.target.value)}
                  rows={10}
                  className="font-monospace"
                />
              </div>
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleSaveEdit}>
            Save & Validate
          </CButton>
        </CModalFooter>
      </CModal>
    </CCard>
  );
}

export default ExtractionValidation;
