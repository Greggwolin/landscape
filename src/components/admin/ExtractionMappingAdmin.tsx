'use client';

import React, { useState, useMemo } from 'react';
import {
  CButton,
  CFormSelect,
  CFormInput,
  CSpinner,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
  CBadge,
  CFormSwitch,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormLabel,
  CFormTextarea,
} from '@coreui/react';
import { SemanticButton } from '@/components/ui/landscape';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilPencil, cilChartLine, cilTrash } from '@coreui/icons';
import useSWR from 'swr';

type ExtractionMapping = {
  mapping_id: number;
  document_type: string;
  source_pattern: string;
  source_aliases: string[];
  target_table: string;
  target_field: string;
  data_type: string;
  transform_rule: string | null;
  confidence: string;
  auto_write: boolean;
  overwrite_existing: boolean;
  is_active: boolean;
  is_system: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Stats fields (optional)
  times_extracted?: number;
  projects_used?: number;
  documents_processed?: number;
  avg_confidence_score?: number;
  write_rate?: number;
  acceptance_rate?: number;
  last_used_at?: string;
};

type DocumentTypeCount = {
  document_type: string;
  count: number;
  active_count: number;
};

type TargetTableCount = {
  target_table: string;
  count: number;
  active_count: number;
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  OM: 'Offering Memorandum',
  RENT_ROLL: 'Rent Roll',
  T12: 'T12 / Operating Statement',
  APPRAISAL: 'Appraisal',
  LOAN_DOC: 'Loan Documents',
  PSA: 'Purchase Agreement',
  PCR: 'Property Condition Report',
  ENVIRONMENTAL: 'Environmental Report',
  SURVEY: 'Survey / Plat',
  ZONING: 'Zoning Letter',
  TAX_BILL: 'Tax Bill / Assessment',
  INSURANCE: 'Insurance Policy',
  MARKET_STUDY: 'Market Study',
  DEV_BUDGET: 'Development Budget',
  PROFORMA: 'Proforma / Cash Flow',
};

const CONFIDENCE_COLORS: Record<string, string> = {
  High: 'success',
  Medium: 'warning',
  Low: 'danger',
};

const DATA_TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'integer', label: 'Integer' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'json', label: 'JSON' },
];

const TRANSFORM_RULE_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'strip_currency', label: 'Strip Currency' },
  { value: 'percent_to_decimal', label: 'Percent to Decimal' },
  { value: 'parse_date', label: 'Parse Date' },
  { value: 'extract_number', label: 'Extract Number' },
];

const CONFIDENCE_OPTIONS = [
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ExtractionMappingAdmin() {
  const DJANGO_API = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [documentTypeFilter, setDocumentTypeFilter] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('');
  const [showStats, setShowStats] = useState(false);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<ExtractionMapping | null>(null);
  const [formData, setFormData] = useState({
    document_type: 'OM',
    source_pattern: '',
    source_aliases: '',
    target_table: '',
    target_field: '',
    data_type: 'text',
    transform_rule: '',
    confidence: 'Medium',
    auto_write: true,
    overwrite_existing: false,
    is_active: true,
    notes: '',
  });

  // Build query params
  const queryParams = new URLSearchParams();
  if (documentTypeFilter) queryParams.set('document_type', documentTypeFilter);
  if (confidenceFilter) queryParams.set('confidence', confidenceFilter);
  if (tableFilter) queryParams.set('target_table', tableFilter);
  if (activeFilter) queryParams.set('is_active', activeFilter);
  if (searchTerm) queryParams.set('search', searchTerm);

  // Fetch mappings
  const mappingsUrl = showStats
    ? `${DJANGO_API}/api/landscaper/mappings/stats/`
    : `${DJANGO_API}/api/landscaper/mappings/?${queryParams.toString()}`;

  const { data: mappingsData, isLoading, mutate } = useSWR(mappingsUrl, fetcher);

  // Fetch document types and tables for filters
  const { data: docTypesData } = useSWR<{ document_types: DocumentTypeCount[] }>(
    `${DJANGO_API}/api/landscaper/mappings/document-types/`,
    fetcher
  );
  const { data: tablesData } = useSWR<{ target_tables: TargetTableCount[] }>(
    `${DJANGO_API}/api/landscaper/mappings/target-tables/`,
    fetcher
  );

  // Memoize filtered mappings (client-side filtering when showStats is on)
  const filteredMappings = useMemo(() => {
    if (!mappingsData?.mappings) return [];
    let result = mappingsData.mappings as ExtractionMapping[];

    // Apply client-side filters when using stats endpoint
    if (showStats) {
      if (documentTypeFilter) {
        result = result.filter((m) => m.document_type === documentTypeFilter);
      }
      if (confidenceFilter) {
        result = result.filter((m) => m.confidence === confidenceFilter);
      }
      if (tableFilter) {
        result = result.filter((m) => m.target_table === tableFilter);
      }
      if (activeFilter) {
        result = result.filter((m) => m.is_active === (activeFilter === 'true'));
      }
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        result = result.filter(
          (m) =>
            m.source_pattern.toLowerCase().includes(lowerSearch) ||
            m.target_table.toLowerCase().includes(lowerSearch) ||
            m.target_field.toLowerCase().includes(lowerSearch)
        );
      }
    }

    return result;
  }, [mappingsData, showStats, documentTypeFilter, confidenceFilter, tableFilter, activeFilter, searchTerm]);

  const handleAdd = () => {
    setEditingMapping(null);
    setFormData({
      document_type: 'OM',
      source_pattern: '',
      source_aliases: '',
      target_table: '',
      target_field: '',
      data_type: 'text',
      transform_rule: '',
      confidence: 'Medium',
      auto_write: true,
      overwrite_existing: false,
      is_active: true,
      notes: '',
    });
    setIsEditModalOpen(true);
  };

  const handleEdit = (mapping: ExtractionMapping) => {
    setEditingMapping(mapping);
    setFormData({
      document_type: mapping.document_type,
      source_pattern: mapping.source_pattern,
      source_aliases: (mapping.source_aliases || []).join(', '),
      target_table: mapping.target_table,
      target_field: mapping.target_field,
      data_type: mapping.data_type,
      transform_rule: mapping.transform_rule || '',
      confidence: mapping.confidence,
      auto_write: mapping.auto_write,
      overwrite_existing: mapping.overwrite_existing,
      is_active: mapping.is_active,
      notes: mapping.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      ...formData,
      source_aliases: formData.source_aliases
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s),
      transform_rule: formData.transform_rule || null,
      notes: formData.notes || null,
    };

    const url = editingMapping
      ? `${DJANGO_API}/api/landscaper/mappings/${editingMapping.mapping_id}/`
      : `${DJANGO_API}/api/landscaper/mappings/`;

    const method = editingMapping ? 'PUT' : 'POST';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    await mutate();
    setIsEditModalOpen(false);
  };

  const handleDelete = async (mapping: ExtractionMapping) => {
    if (mapping.is_system) {
      alert('System mappings cannot be deleted. You can deactivate them instead.');
      return;
    }

    if (!confirm(`Delete mapping "${mapping.source_pattern}"?`)) return;

    await fetch(`${DJANGO_API}/api/landscaper/mappings/${mapping.mapping_id}/`, {
      method: 'DELETE',
    });

    await mutate();
  };

  const handleToggleActive = async (mapping: ExtractionMapping) => {
    await fetch(`${DJANGO_API}/api/landscaper/mappings/${mapping.mapping_id}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !mapping.is_active }),
    });

    await mutate();
  };

  const formatPercent = (value?: number) => {
    if (value === null || value === undefined) return '-';
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="p-0">
      {/* Filters Row */}
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <CFormInput
          type="text"
          placeholder="Search patterns, tables, fields..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '200px' }}
          size="sm"
        />

        <CFormSelect
          value={documentTypeFilter}
          onChange={(e) => setDocumentTypeFilter(e.target.value)}
          style={{ width: '180px' }}
          size="sm"
        >
          <option value="">All Doc Types</option>
          {docTypesData?.document_types?.map((dt) => (
            <option key={dt.document_type} value={dt.document_type}>
              {DOCUMENT_TYPE_LABELS[dt.document_type] || dt.document_type} ({dt.count})
            </option>
          ))}
        </CFormSelect>

        <CFormSelect
          value={tableFilter}
          onChange={(e) => setTableFilter(e.target.value)}
          style={{ width: '150px' }}
          size="sm"
        >
          <option value="">All Tables</option>
          {tablesData?.target_tables?.map((t) => (
            <option key={t.target_table} value={t.target_table}>
              {t.target_table} ({t.count})
            </option>
          ))}
        </CFormSelect>

        <CFormSelect
          value={confidenceFilter}
          onChange={(e) => setConfidenceFilter(e.target.value)}
          style={{ width: '120px' }}
          size="sm"
        >
          <option value="">All Confidence</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </CFormSelect>

        <CFormSelect
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value as '' | 'true' | 'false')}
          style={{ width: '100px' }}
          size="sm"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </CFormSelect>

        <div className="ms-auto d-flex gap-2">
          <CButton
            color={showStats ? 'primary' : 'secondary'}
            variant="ghost"
            size="sm"
            onClick={() => setShowStats(!showStats)}
            title="Toggle Stats View"
          >
            <CIcon icon={cilChartLine} />
            <span className="ms-1">Stats</span>
          </CButton>

          <SemanticButton intent="primary-action" size="sm" onClick={handleAdd}>
            <CIcon icon={cilPlus} className="me-1" />
            Add Mapping
          </SemanticButton>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-muted small mb-2">
        {filteredMappings.length} mapping{filteredMappings.length !== 1 ? 's' : ''}
        {documentTypeFilter && ` in ${DOCUMENT_TYPE_LABELS[documentTypeFilter] || documentTypeFilter}`}
      </div>

      {/* Mappings Table */}
      {isLoading ? (
        <div className="text-center py-4">
          <CSpinner size="sm" />
        </div>
      ) : (
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <CTable small striped hover>
            <CTableHead className="sticky-top bg-body">
              <CTableRow>
                <CTableHeaderCell style={{ width: '50px' }}>Active</CTableHeaderCell>
                <CTableHeaderCell style={{ width: '100px' }}>Doc Type</CTableHeaderCell>
                <CTableHeaderCell>Pattern</CTableHeaderCell>
                <CTableHeaderCell>Target</CTableHeaderCell>
                <CTableHeaderCell style={{ width: '80px' }}>Type</CTableHeaderCell>
                <CTableHeaderCell style={{ width: '80px' }}>Confidence</CTableHeaderCell>
                {showStats && (
                  <>
                    <CTableHeaderCell style={{ width: '60px' }}>Used</CTableHeaderCell>
                    <CTableHeaderCell style={{ width: '80px' }}>Write Rate</CTableHeaderCell>
                  </>
                )}
                <CTableHeaderCell style={{ width: '80px' }}>Actions</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {filteredMappings.map((mapping) => (
                <CTableRow key={mapping.mapping_id}>
                  <CTableDataCell>
                    <CFormSwitch
                      checked={mapping.is_active}
                      onChange={() => handleToggleActive(mapping)}
                      size="sm"
                    />
                  </CTableDataCell>
                  <CTableDataCell>
                    <CBadge color="secondary" className="text-truncate" style={{ maxWidth: '90px' }}>
                      {mapping.document_type}
                    </CBadge>
                  </CTableDataCell>
                  <CTableDataCell>
                    <div className="fw-medium">{mapping.source_pattern}</div>
                    {mapping.source_aliases?.length > 0 && (
                      <div className="text-muted small">
                        Also: {mapping.source_aliases.slice(0, 2).join(', ')}
                        {mapping.source_aliases.length > 2 && ` +${mapping.source_aliases.length - 2}`}
                      </div>
                    )}
                  </CTableDataCell>
                  <CTableDataCell>
                    <code className="small">
                      {mapping.target_table}.{mapping.target_field}
                    </code>
                    {mapping.transform_rule && (
                      <div className="text-muted small">Transform: {mapping.transform_rule}</div>
                    )}
                  </CTableDataCell>
                  <CTableDataCell>
                    <span className="text-muted small">{mapping.data_type}</span>
                  </CTableDataCell>
                  <CTableDataCell>
                    <CBadge color={CONFIDENCE_COLORS[mapping.confidence] || 'secondary'}>
                      {mapping.confidence}
                    </CBadge>
                  </CTableDataCell>
                  {showStats && (
                    <>
                      <CTableDataCell className="text-center">
                        {mapping.times_extracted || 0}
                      </CTableDataCell>
                      <CTableDataCell className="text-center">
                        {formatPercent(mapping.write_rate)}
                      </CTableDataCell>
                    </>
                  )}
                  <CTableDataCell>
                    <div className="d-flex gap-1">
                      <SemanticButton
                        intent="tertiary-action"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(mapping)}
                        title="Edit"
                      >
                        <CIcon icon={cilPencil} size="sm" />
                      </SemanticButton>
                      {!mapping.is_system && (
                        <SemanticButton
                          intent="destructive-action"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(mapping)}
                          title="Delete"
                        >
                          <CIcon icon={cilTrash} size="sm" />
                        </SemanticButton>
                      )}
                    </div>
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
        </div>
      )}

      {/* Edit/Create Modal */}
      <CModal visible={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} size="lg">
        <CModalHeader>
          <CModalTitle>{editingMapping ? 'Edit Mapping' : 'Add Mapping'}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <div className="row g-3">
            <div className="col-md-6">
              <CFormLabel>Document Type</CFormLabel>
              <CFormSelect
                value={formData.document_type}
                onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
              >
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </CFormSelect>
            </div>

            <div className="col-md-6">
              <CFormLabel>Confidence</CFormLabel>
              <CFormSelect
                value={formData.confidence}
                onChange={(e) => setFormData({ ...formData, confidence: e.target.value })}
              >
                {CONFIDENCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </CFormSelect>
            </div>

            <div className="col-md-6">
              <CFormLabel>Source Pattern *</CFormLabel>
              <CFormInput
                value={formData.source_pattern}
                onChange={(e) => setFormData({ ...formData, source_pattern: e.target.value })}
                placeholder="e.g., Year Built"
              />
            </div>

            <div className="col-md-6">
              <CFormLabel>Source Aliases (comma-separated)</CFormLabel>
              <CFormInput
                value={formData.source_aliases}
                onChange={(e) => setFormData({ ...formData, source_aliases: e.target.value })}
                placeholder="e.g., Built, Construction Year"
              />
            </div>

            <div className="col-md-6">
              <CFormLabel>Target Table *</CFormLabel>
              <CFormInput
                value={formData.target_table}
                onChange={(e) => setFormData({ ...formData, target_table: e.target.value })}
                placeholder="e.g., tbl_project"
              />
            </div>

            <div className="col-md-6">
              <CFormLabel>Target Field *</CFormLabel>
              <CFormInput
                value={formData.target_field}
                onChange={(e) => setFormData({ ...formData, target_field: e.target.value })}
                placeholder="e.g., year_built"
              />
            </div>

            <div className="col-md-6">
              <CFormLabel>Data Type</CFormLabel>
              <CFormSelect
                value={formData.data_type}
                onChange={(e) => setFormData({ ...formData, data_type: e.target.value })}
              >
                {DATA_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </CFormSelect>
            </div>

            <div className="col-md-6">
              <CFormLabel>Transform Rule</CFormLabel>
              <CFormSelect
                value={formData.transform_rule}
                onChange={(e) => setFormData({ ...formData, transform_rule: e.target.value })}
              >
                {TRANSFORM_RULE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </CFormSelect>
            </div>

            <div className="col-12">
              <CFormLabel>Notes</CFormLabel>
              <CFormTextarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                placeholder="Optional notes about this mapping"
              />
            </div>

            <div className="col-md-4">
              <CFormSwitch
                label="Auto Write"
                checked={formData.auto_write}
                onChange={(e) => setFormData({ ...formData, auto_write: e.target.checked })}
              />
              <div className="text-muted small">Automatically write extracted values</div>
            </div>

            <div className="col-md-4">
              <CFormSwitch
                label="Overwrite Existing"
                checked={formData.overwrite_existing}
                onChange={(e) => setFormData({ ...formData, overwrite_existing: e.target.checked })}
              />
              <div className="text-muted small">Replace existing values</div>
            </div>

            <div className="col-md-4">
              <CFormSwitch
                label="Active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <div className="text-muted small">Enable this mapping</div>
            </div>
          </div>
        </CModalBody>
        <CModalFooter>
          <SemanticButton intent="secondary-action" variant="ghost" onClick={() => setIsEditModalOpen(false)}>
            Cancel
          </SemanticButton>
          <SemanticButton intent="primary-action" onClick={handleSave}>
            {editingMapping ? 'Update' : 'Create'}
          </SemanticButton>
        </CModalFooter>
      </CModal>
    </div>
  );
}
