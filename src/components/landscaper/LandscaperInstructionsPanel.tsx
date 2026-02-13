'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CFormInput,
  CFormTextarea,
  CFormSelect,
  CBadge,
  CSpinner,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
} from '@coreui/react';

const API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

interface Instruction {
  id: number;
  user_id: number;
  project_id: number | null;
  instruction_type: string;
  instruction_text: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface KpiDefinition {
  id: number;
  user_id: number;
  project_type_code: string;
  kpi_key: string;
  display_label: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const INSTRUCTION_TYPES = [
  { value: 'communication', label: 'Communication Style' },
  { value: 'summary_preference', label: 'Summary Preference' },
  { value: 'units', label: 'Units of Measure' },
  { value: 'custom', label: 'Custom' },
];

const TYPE_COLORS: Record<string, string> = {
  communication: 'info',
  kpi_definition: 'warning',
  summary_preference: 'success',
  units: 'primary',
  custom: 'secondary',
};

interface LandscaperInstructionsPanelProps {
  projectId?: string | number;
}

export function LandscaperInstructionsPanel({ projectId }: LandscaperInstructionsPanelProps) {
  const [activeTab, setActiveTab] = useState<'instructions' | 'kpis'>('instructions');
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New instruction form
  const [newType, setNewType] = useState('custom');
  const [newText, setNewText] = useState('');
  const [isProjectLevel, setIsProjectLevel] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editing state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  const fetchInstructions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (projectId) params.set('project_id', String(projectId));
      const res = await fetch(`${API_BASE}/api/landscaper/instructions/?${params}`);
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      const data = await res.json();
      setInstructions(data.results || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load instructions');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchInstructions();
  }, [fetchInstructions]);

  const handleCreate = async () => {
    if (!newText.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        instruction_type: newType,
        instruction_text: newText.trim(),
      };
      if (isProjectLevel && projectId) {
        body.project_id = Number(projectId);
      }
      const res = await fetch(`${API_BASE}/api/landscaper/instructions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Failed to create: ${res.status}`);
      setNewText('');
      fetchInstructions();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create instruction');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editText.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/landscaper/instructions/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction_text: editText.trim() }),
      });
      if (!res.ok) throw new Error(`Failed to update: ${res.status}`);
      setEditingId(null);
      setEditText('');
      fetchInstructions();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update instruction');
    }
  };

  const handleToggle = async (instr: Instruction) => {
    try {
      const res = await fetch(`${API_BASE}/api/landscaper/instructions/${instr.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !instr.is_active }),
      });
      if (!res.ok) throw new Error(`Failed to toggle: ${res.status}`);
      fetchInstructions();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to toggle instruction');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/landscaper/instructions/${id}/`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`Failed to delete: ${res.status}`);
      fetchInstructions();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete instruction');
    }
  };

  return (
    <div>
      <CNav variant="tabs" className="mb-4">
        <CNavItem>
          <CNavLink
            active={activeTab === 'instructions'}
            onClick={() => setActiveTab('instructions')}
            style={{ cursor: 'pointer' }}
          >
            Custom Instructions
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink
            active={activeTab === 'kpis'}
            onClick={() => setActiveTab('kpis')}
            style={{ cursor: 'pointer' }}
          >
            Results KPI Definitions
          </CNavLink>
        </CNavItem>
      </CNav>

      <CTabContent>
        {/* Instructions Tab */}
        <CTabPane visible={activeTab === 'instructions'}>
          {/* Add New Instruction */}
          <CCard className="mb-4">
            <CCardHeader className="fw-semibold">Add Instruction</CCardHeader>
            <CCardBody>
              <div className="d-flex gap-3 mb-3">
                <CFormSelect
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  style={{ maxWidth: 200 }}
                >
                  {INSTRUCTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </CFormSelect>
                {projectId && (
                  <label className="d-flex align-items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isProjectLevel}
                      onChange={(e) => setIsProjectLevel(e.target.checked)}
                    />
                    Project-specific
                  </label>
                )}
              </div>
              <CFormTextarea
                rows={3}
                placeholder="Enter instruction... (e.g., 'Always show results as per-lot values, not totals')"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                className="mb-3"
              />
              <CButton
                color="primary"
                size="sm"
                disabled={!newText.trim() || saving}
                onClick={handleCreate}
              >
                {saving ? <CSpinner size="sm" /> : 'Add Instruction'}
              </CButton>
            </CCardBody>
          </CCard>

          {/* Instructions List */}
          {error && (
            <div className="alert alert-danger mb-3">{error}</div>
          )}

          {loading ? (
            <div className="text-center py-4"><CSpinner /></div>
          ) : instructions.length === 0 ? (
            <div className="text-center py-4 text-body-secondary">
              No instructions yet. Add one above to customize Landscaper behavior.
            </div>
          ) : (
            <div className="d-flex flex-column gap-2">
              {instructions.map((instr) => (
                <CCard
                  key={instr.id}
                  className={!instr.is_active ? 'opacity-50' : ''}
                >
                  <CCardBody className="d-flex align-items-start gap-3 py-2">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <CBadge color={TYPE_COLORS[instr.instruction_type] || 'secondary'} size="sm">
                          {instr.instruction_type}
                        </CBadge>
                        {instr.project_id ? (
                          <CBadge color="dark" size="sm">Project</CBadge>
                        ) : (
                          <CBadge color="light" textColor="dark" size="sm">Global</CBadge>
                        )}
                        {!instr.is_active && (
                          <CBadge color="danger" size="sm">Inactive</CBadge>
                        )}
                      </div>
                      {editingId === instr.id ? (
                        <div className="d-flex gap-2">
                          <CFormInput
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            size="sm"
                          />
                          <CButton size="sm" color="success" onClick={() => handleUpdate(instr.id)}>
                            Save
                          </CButton>
                          <CButton size="sm" color="secondary" onClick={() => setEditingId(null)}>
                            Cancel
                          </CButton>
                        </div>
                      ) : (
                        <div className="text-body" style={{ fontSize: '0.9rem' }}>
                          {instr.instruction_text}
                        </div>
                      )}
                    </div>
                    <div className="d-flex gap-1">
                      <CButton
                        size="sm"
                        color="light"
                        onClick={() => {
                          setEditingId(instr.id);
                          setEditText(instr.instruction_text);
                        }}
                      >
                        Edit
                      </CButton>
                      <CButton
                        size="sm"
                        color={instr.is_active ? 'warning' : 'success'}
                        variant="outline"
                        onClick={() => handleToggle(instr)}
                      >
                        {instr.is_active ? 'Disable' : 'Enable'}
                      </CButton>
                      <CButton
                        size="sm"
                        color="danger"
                        variant="outline"
                        onClick={() => handleDelete(instr.id)}
                      >
                        Delete
                      </CButton>
                    </div>
                  </CCardBody>
                </CCard>
              ))}
            </div>
          )}
        </CTabPane>

        {/* KPI Definitions Tab */}
        <CTabPane visible={activeTab === 'kpis'}>
          <KpiDefinitionsTab />
        </CTabPane>
      </CTabContent>
    </div>
  );
}


// =============================================================================
// KPI DEFINITIONS SUB-TAB
// =============================================================================

const PROJECT_TYPES = [
  { value: 'LAND', label: 'Land Development' },
  { value: 'MF', label: 'Multifamily' },
  { value: 'OFF', label: 'Office' },
  { value: 'RET', label: 'Retail' },
  { value: 'IND', label: 'Industrial' },
  { value: 'HTL', label: 'Hotel' },
  { value: 'MXU', label: 'Mixed Use' },
];

function KpiDefinitionsTab() {
  const [selectedType, setSelectedType] = useState('LAND');
  const [kpis, setKpis] = useState<KpiDefinition[]>([]);
  const [loading, setLoading] = useState(true);
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
      setError(e instanceof Error ? e.message : 'Failed to load KPI definitions');
    } finally {
      setLoading(false);
    }
  }, [selectedType]);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  const handleAddKpi = async () => {
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
      if (!res.ok) throw new Error(`Failed to create: ${res.status}`);
      setNewKey('');
      setNewLabel('');
      fetchKpis();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add KPI');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveKpi = async (kpi: KpiDefinition) => {
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

  const handleReorder = async (kpi: KpiDefinition, direction: 'up' | 'down') => {
    const idx = kpis.findIndex((k) => k.id === kpi.id);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= kpis.length) return;

    const target = kpis[targetIdx];

    try {
      await Promise.all([
        fetch(`${API_BASE}/api/landscaper/kpi-definitions/${kpi.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ display_order: target.display_order }),
        }),
        fetch(`${API_BASE}/api/landscaper/kpi-definitions/${target.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ display_order: kpi.display_order }),
        }),
      ]);
      fetchKpis();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reorder');
    }
  };

  return (
    <div>
      <div className="mb-3 d-flex align-items-center gap-3">
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

      <CCard className="mb-4">
        <CCardHeader className="fw-semibold">
          &quot;Results&quot; KPI Set for {PROJECT_TYPES.find((p) => p.value === selectedType)?.label}
        </CCardHeader>
        <CCardBody>
          <p className="text-body-secondary mb-3" style={{ fontSize: '0.85rem' }}>
            When you ask Landscaper &quot;what are the results?&quot;, these KPIs are returned.
            Reorder them to control display priority.
          </p>

          {error && <div className="alert alert-danger mb-3">{error}</div>}

          {loading ? (
            <div className="text-center py-3"><CSpinner /></div>
          ) : kpis.length === 0 ? (
            <div className="text-body-secondary mb-3">No KPIs defined for this project type.</div>
          ) : (
            <div className="d-flex flex-column gap-2 mb-4">
              {kpis.map((kpi, idx) => (
                <div
                  key={kpi.id}
                  className="d-flex align-items-center gap-2 px-3 py-2 border rounded"
                >
                  <span className="text-body-secondary" style={{ width: 24 }}>
                    {idx + 1}.
                  </span>
                  <div className="flex-grow-1">
                    <span className="fw-medium">{kpi.display_label}</span>
                    <span className="text-body-secondary ms-2" style={{ fontSize: '0.8rem' }}>
                      ({kpi.kpi_key})
                    </span>
                  </div>
                  <div className="d-flex gap-1">
                    <CButton
                      size="sm"
                      color="light"
                      disabled={idx === 0}
                      onClick={() => handleReorder(kpi, 'up')}
                    >
                      &#x25B2;
                    </CButton>
                    <CButton
                      size="sm"
                      color="light"
                      disabled={idx === kpis.length - 1}
                      onClick={() => handleReorder(kpi, 'down')}
                    >
                      &#x25BC;
                    </CButton>
                    <CButton
                      size="sm"
                      color="danger"
                      variant="outline"
                      onClick={() => handleRemoveKpi(kpi)}
                    >
                      Remove
                    </CButton>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add KPI Form */}
          <div className="d-flex gap-2 align-items-end">
            <div>
              <label className="form-label mb-1" style={{ fontSize: '0.8rem' }}>KPI Key</label>
              <CFormInput
                size="sm"
                placeholder="e.g., cash_on_cash"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label mb-1" style={{ fontSize: '0.8rem' }}>Display Label</label>
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
              onClick={handleAddKpi}
            >
              {saving ? <CSpinner size="sm" /> : 'Add KPI'}
            </CButton>
          </div>
        </CCardBody>
      </CCard>
    </div>
  );
}
