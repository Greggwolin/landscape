'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CFormInput,
  CFormSelect,
  CSpinner,
  CBadge,
} from '@coreui/react';

const API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

interface KpiDefinition {
  id: number;
  kpi_key: string;
  display_label: string;
  display_order: number;
  is_active: boolean;
}

const PROJECT_TYPES = [
  { value: 'LAND', label: 'Land Development' },
  { value: 'MF', label: 'Multifamily' },
  { value: 'OFF', label: 'Office' },
  { value: 'RET', label: 'Retail' },
  { value: 'IND', label: 'Industrial' },
  { value: 'HTL', label: 'Hotel' },
  { value: 'MXU', label: 'Mixed Use' },
];

interface KpiDefinitionManagerProps {
  visible: boolean;
  onClose: () => void;
  projectTypeCode?: string;
}

export function KpiDefinitionManager({
  visible,
  onClose,
  projectTypeCode = 'LAND',
}: KpiDefinitionManagerProps) {
  const [selectedType, setSelectedType] = useState(projectTypeCode);
  const [kpis, setKpis] = useState<KpiDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add form
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchKpis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/landscaper/kpi-definitions/by-type/${selectedType}/`
      );
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      const data = await res.json();
      setKpis(data.results || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load KPIs');
    } finally {
      setLoading(false);
    }
  }, [selectedType]);

  useEffect(() => {
    if (visible) fetchKpis();
  }, [visible, fetchKpis]);

  useEffect(() => {
    setSelectedType(projectTypeCode);
  }, [projectTypeCode]);

  const handleAdd = async () => {
    if (!newKey.trim() || !newLabel.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/landscaper/kpi-definitions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_type_code: selectedType,
          kpi_key: newKey.trim().toLowerCase().replace(/\s+/g, '_'),
          display_label: newLabel.trim(),
          display_order: kpis.length + 1,
        }),
      });
      if (!res.ok) throw new Error(`Failed to add: ${res.status}`);
      setNewKey('');
      setNewLabel('');
      fetchKpis();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add KPI');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (kpi: KpiDefinition) => {
    try {
      const res = await fetch(`${API_BASE}/api/landscaper/kpi-definitions/${kpi.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      });
      if (!res.ok) throw new Error(`Failed to remove: ${res.status}`);
      fetchKpis();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove KPI');
    }
  };

  return (
    <CModal visible={visible} onClose={onClose} size="lg">
      <CModalHeader>
        <CModalTitle>Manage Results KPIs</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div className="d-flex align-items-center gap-3 mb-4">
          <label className="fw-medium mb-0">Project Type:</label>
          <CFormSelect
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{ maxWidth: 200 }}
          >
            {PROJECT_TYPES.map((pt) => (
              <option key={pt.value} value={pt.value}>{pt.label}</option>
            ))}
          </CFormSelect>
        </div>

        <p className="text-body-secondary mb-3" style={{ fontSize: '0.85rem' }}>
          These KPIs define what &quot;results&quot; means when you ask Landscaper
          &quot;what are the results if...?&quot;
        </p>

        {error && <div className="alert alert-danger mb-3">{error}</div>}

        {loading ? (
          <div className="text-center py-3"><CSpinner /></div>
        ) : (
          <>
            {/* Current KPIs */}
            <div className="d-flex flex-column gap-2 mb-4">
              {kpis.map((kpi, idx) => (
                <div
                  key={kpi.id}
                  className="d-flex align-items-center gap-2 px-3 py-2 border rounded"
                >
                  <CBadge color="primary" shape="rounded-pill" className="me-1">
                    {idx + 1}
                  </CBadge>
                  <span className="fw-medium flex-grow-1">{kpi.display_label}</span>
                  <span className="text-body-secondary" style={{ fontSize: '0.8rem' }}>
                    {kpi.kpi_key}
                  </span>
                  <CButton
                    size="sm"
                    color="danger"
                    variant="ghost"
                    onClick={() => handleRemove(kpi)}
                  >
                    Remove
                  </CButton>
                </div>
              ))}
              {kpis.length === 0 && (
                <div className="text-body-secondary py-2">No KPIs defined.</div>
              )}
            </div>

            {/* Add new */}
            <div className="border-top pt-3">
              <div className="fw-medium mb-2">Add KPI to Results</div>
              <div className="d-flex gap-2 align-items-end">
                <div className="flex-grow-1">
                  <label className="form-label mb-1" style={{ fontSize: '0.8rem' }}>Key</label>
                  <CFormInput
                    size="sm"
                    placeholder="e.g., cash_on_cash"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                  />
                </div>
                <div className="flex-grow-1">
                  <label className="form-label mb-1" style={{ fontSize: '0.8rem' }}>Label</label>
                  <CFormInput
                    size="sm"
                    placeholder="e.g., Cash-on-Cash Return"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                  />
                </div>
                <CButton
                  color="primary"
                  size="sm"
                  disabled={!newKey.trim() || !newLabel.trim() || saving}
                  onClick={handleAdd}
                >
                  {saving ? <CSpinner size="sm" /> : 'Add'}
                </CButton>
              </div>
            </div>
          </>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  );
}
