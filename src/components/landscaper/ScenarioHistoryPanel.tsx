'use client';

import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CBadge,
  CSpinner,
  CFormInput,
} from '@coreui/react';
import { useCallback, useEffect, useState } from 'react';
import { ScenarioSaveModal } from './ScenarioSaveModal';

const API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

interface OverrideSummary {
  field: string;
  label: string;
  from: any;
  to: any;
  unit: string;
}

interface Scenario {
  scenario_log_id: number;
  scenario_name: string | null;
  description: string | null;
  status: string;
  tags: string[] | null;
  source: string;
  overrides_count: number;
  overrides_summary: OverrideSummary[];
  metrics: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  committed_at: string | null;
}

interface ScenarioHistoryPanelProps {
  projectId: number | string;
  onLoadScenario?: (scenarioLogId: number) => void;
  onCompareScenarios?: (ids: number[]) => void;
}

export function ScenarioHistoryPanel({
  projectId,
  onLoadScenario,
  onCompareScenarios,
}: ScenarioHistoryPanelProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('saved');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [branchTarget, setBranchTarget] = useState<Scenario | null>(null);

  const fetchScenarios = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await fetch(
        `${API_BASE}/api/landscaper/projects/${projectId}/scenarios/?${params}`,
      );
      const data = await res.json();
      if (data.success) {
        setScenarios(data.scenarios || []);
      } else {
        setError(data.error || 'Failed to load scenarios');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [projectId, statusFilter, search]);

  useEffect(() => {
    fetchScenarios();
  }, [fetchScenarios]);

  const handleDelete = async (scenarioLogId: number) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/landscaper/projects/${projectId}/scenarios/${scenarioLogId}/`,
        { method: 'DELETE' },
      );
      const data = await res.json();
      if (data.success) {
        setScenarios((prev) => prev.filter((s) => s.scenario_log_id !== scenarioLogId));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(scenarioLogId);
          return next;
        });
      }
    } catch {
      // Ignore — user sees no change
    }
  };

  const handleSnapshotSave = async (data: {
    scenario_name: string;
    description: string;
    tags: string[];
  }) => {
    const res = await fetch(
      `${API_BASE}/api/landscaper/projects/${projectId}/scenarios/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, source: 'user_manual' }),
      },
    );
    const result = await res.json();
    if (!result.success) {
      throw new Error(result.error || 'Save failed');
    }
    fetchScenarios();
  };

  const handleBranch = async (data: {
    scenario_name: string;
    description: string;
    tags: string[];
  }) => {
    if (!branchTarget) return;
    const res = await fetch(
      `${API_BASE}/api/landscaper/projects/${projectId}/scenarios/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario_name: data.scenario_name,
          description: data.description || `Branched from "${branchTarget.scenario_name}"`,
          tags: data.tags,
          source: 'user_manual',
        }),
      },
    );
    const result = await res.json();
    if (!result.success) {
      throw new Error(result.error || 'Branch failed');
    }
    setBranchTarget(null);
    fetchScenarios();
  };

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'saved':
        return 'info';
      case 'committed':
        return 'success';
      case 'explored':
        return 'secondary';
      case 'archived':
        return 'dark';
      default:
        return 'light';
    }
  };

  const formatValue = (val: any, unit?: string) => {
    if (val == null) return '—';
    if (unit === 'pct' && typeof val === 'number') return `${(val * 100).toFixed(2)}%`;
    if (typeof val === 'number') return val.toLocaleString();
    return String(val);
  };

  return (
    <div>
      {/* Controls */}
      <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
        <CFormInput
          type="text"
          placeholder="Search scenarios..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 250 }}
        />

        <select
          className="form-select"
          style={{ maxWidth: 160 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="saved">Saved</option>
          <option value="committed">Committed</option>
          <option value="explored">Explored</option>
          <option value="all">All</option>
        </select>

        <CButton color="primary" variant="outline" size="sm" onClick={() => setSaveModalOpen(true)}>
          Snapshot Current
        </CButton>

        {selectedIds.size >= 2 && onCompareScenarios && (
          <CButton
            color="warning"
            size="sm"
            onClick={() => onCompareScenarios(Array.from(selectedIds))}
          >
            Compare ({selectedIds.size})
          </CButton>
        )}

        <CButton
          color="secondary"
          variant="ghost"
          size="sm"
          onClick={fetchScenarios}
          disabled={loading}
        >
          Refresh
        </CButton>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="text-center py-4">
          <CSpinner color="primary" />
        </div>
      )}
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* Scenario Cards */}
      {!loading && scenarios.length === 0 && (
        <div className="text-body-secondary text-center py-4">
          No scenarios found. Use the what-if tools in Landscaper chat to create scenarios.
        </div>
      )}

      {scenarios.map((scenario) => (
        <CCard key={scenario.scenario_log_id} className="mb-2">
          <CCardHeader className="d-flex align-items-center gap-2 py-2">
            <input
              type="checkbox"
              checked={selectedIds.has(scenario.scenario_log_id)}
              onChange={() => toggleSelection(scenario.scenario_log_id)}
              className="form-check-input"
            />
            <strong className="flex-grow-1">
              {scenario.scenario_name || `Scenario #${scenario.scenario_log_id}`}
            </strong>
            <CBadge color={statusColor(scenario.status)}>{scenario.status}</CBadge>
            <span className="text-body-secondary" style={{ fontSize: '0.8rem' }}>
              {new Date(scenario.updated_at).toLocaleDateString()}
            </span>
          </CCardHeader>
          <CCardBody className="py-2">
            {scenario.description && (
              <p className="text-body-secondary mb-2" style={{ fontSize: '0.9rem' }}>
                {scenario.description}
              </p>
            )}

            {scenario.tags && scenario.tags.length > 0 && (
              <div className="mb-2">
                {scenario.tags.map((tag) => (
                  <CBadge key={tag} color="light" textColor="dark" className="me-1">
                    {tag}
                  </CBadge>
                ))}
              </div>
            )}

            {/* Override summary */}
            {scenario.overrides_count > 0 && (
              <div className="mb-2" style={{ fontSize: '0.85rem' }}>
                <strong>{scenario.overrides_count} override{scenario.overrides_count !== 1 ? 's' : ''}:</strong>
                <ul className="mb-0 ps-3">
                  {scenario.overrides_summary.slice(0, 5).map((ov, i) => (
                    <li key={i}>
                      {ov.label || ov.field}: {formatValue(ov.from, ov.unit)} &rarr;{' '}
                      {formatValue(ov.to, ov.unit)}
                    </li>
                  ))}
                  {scenario.overrides_count > 5 && (
                    <li className="text-body-secondary">
                      +{scenario.overrides_count - 5} more
                    </li>
                  )}
                </ul>
              </div>
            )}

            {scenario.overrides_count === 0 && (
              <div className="text-body-secondary mb-2" style={{ fontSize: '0.85rem' }}>
                Baseline checkpoint (no overrides)
              </div>
            )}

            {/* Actions */}
            <div className="d-flex gap-2">
              {onLoadScenario && (
                <CButton
                  color="primary"
                  size="sm"
                  variant="outline"
                  onClick={() => onLoadScenario(scenario.scenario_log_id)}
                >
                  Load
                </CButton>
              )}
              <CButton
                color="secondary"
                size="sm"
                variant="outline"
                onClick={() => setBranchTarget(scenario)}
              >
                Branch
              </CButton>
              <CButton
                color="danger"
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(scenario.scenario_log_id)}
              >
                Archive
              </CButton>
            </div>
          </CCardBody>
        </CCard>
      ))}

      {/* Save modal for user-triggered snapshots */}
      <ScenarioSaveModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSave={handleSnapshotSave}
      />

      {/* Branch modal */}
      <ScenarioSaveModal
        isOpen={branchTarget !== null}
        onClose={() => setBranchTarget(null)}
        onSave={handleBranch}
        defaultName={branchTarget ? `${branchTarget.scenario_name || 'Scenario'} (branch)` : ''}
      />
    </div>
  );
}
