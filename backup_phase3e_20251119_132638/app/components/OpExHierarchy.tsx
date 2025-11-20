'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { InventoryStatsPanel } from '@/components/operations/InventoryStatsPanel';
import { OpExModeSelector, OpExMode } from '@/components/operations/OpExModeSelector';

interface OpexAccount {
  account_id: number;
  account_number: string;
  account_name: string;
  account_level: number;
  parent_account_id: number | null;
  is_calculated: boolean;
  calculated_total: number;
  sort_order: number;
  opex_id: number | null;
  annual_amount: number | null;
  calculation_basis: string | null;
  unit_amount: number | null;
  is_auto_calculated: boolean | null;
  escalation_rate: number | null;
  start_period: number | null;
  payment_frequency: string | null;
  notes: string | null;
  children: OpexAccount[];
}

interface OpexHierarchyData {
  project_type_code?: string;
  accounts: OpexAccount[];
  summary: {
    total_operating_expenses: number;
    account_count: number;
    leaf_account_count: number;
    entry_account_count?: number;
  };
}

interface OpExHierarchyProps {
  projectId?: number;
}

const BASIS_OPTIONS = [
  { value: 'PER_UNSOLD_PARCEL', label: 'Per Unsold Parcel' },
  { value: 'PER_UNSOLD_ACRE', label: 'Per Unsold Acre' },
  { value: 'PER_PCT_UNSOLD', label: 'Per % Unsold' },
  { value: 'FIXED_AMOUNT', label: 'Fixed Amount' }
];

const PAYMENT_FREQUENCIES = ['MONTHLY', 'QUARTERLY', 'ANNUALLY'];

const formatCurrency = (value: number): string =>
  value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const makeFieldKey = (accountId: number, field: string) => `${accountId}:${field}`;

export default function OpExHierarchy({ projectId: projectIdProp }: OpExHierarchyProps = {}) {
  const params = useParams();
  const routeProjectIdRaw = params?.projectId as string | undefined;
  const routeProjectId = routeProjectIdRaw ? parseInt(routeProjectIdRaw, 10) : undefined;
  const projectId = projectIdProp ?? routeProjectId;

  const [data, setData] = useState<OpexHierarchyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editedFields, setEditedFields] = useState<Map<string, string>>(new Map());
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<OpExMode>('napkin');

  useEffect(() => {
    if (!projectId || typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(`opex_mode_${projectId}`);
    if (stored === 'napkin' || stored === 'standard' || stored === 'detail') {
      setMode(stored as OpExMode);
    }
  }, [projectId]);

  const handleModeChange = (newMode: OpExMode) => {
    setMode(newMode);
    if (projectId && typeof window !== 'undefined') {
      window.localStorage.setItem(`opex_mode_${projectId}`, newMode);
    }
  };

  const fetchHierarchy = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/projects/${projectId}/operating-expenses/hierarchy`);
      if (!response.ok) {
        throw new Error(`Failed to fetch hierarchy: ${response.statusText}`);
      }
      const payload = await response.json();
      setData(payload);
    } catch (err) {
      console.error('Error fetching OpEx hierarchy:', err);
      setError(err instanceof Error ? err.message : 'Failed to load operating expenses');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchHierarchy();
  }, [fetchHierarchy]);

  const updateExpense = async (
    accountId: number,
    payload: Record<string, unknown>,
    fieldsToClear: string[] = []
  ) => {
    if (!projectId) return;
    try {
      setSaving(true);
      const response = await fetch(`/api/projects/${projectId}/operating-expenses/${accountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update expense');
      }

      await fetchHierarchy();
      if (fieldsToClear.length > 0) {
        setEditedFields(prev => {
          const updated = new Map(prev);
          fieldsToClear.forEach(field => updated.delete(makeFieldKey(accountId, field)));
          return updated;
        });
      }
    } catch (err) {
      console.error('Error updating expense:', err);
      alert(err instanceof Error ? err.message : 'Failed to update expense');
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (accountId: number, field: string, value: string) => {
    setEditedFields(prev => {
      const updated = new Map(prev);
      updated.set(makeFieldKey(accountId, field), value);
      return updated;
    });
  };

  const getFieldValue = (accountId: number, field: string, fallback: string) => {
    const key = makeFieldKey(accountId, field);
    return editedFields.get(key) ?? fallback;
  };

  const commitNumericField = (
    account: OpexAccount,
    field: string,
    payloadKey: string,
    parser: (value: string) => number | null
  ) => {
    const key = makeFieldKey(account.account_id, field);
    const pending = editedFields.get(key);
    if (pending === undefined) return;
    const parsed = parser(pending);
    if (parsed === null) {
      setEditedFields(prev => {
        const updated = new Map(prev);
        updated.delete(key);
        return updated;
      });
      return;
    }
    updateExpense(account.account_id, { [payloadKey]: parsed }, [field]);
  };

  const commitNotesField = (account: OpexAccount) => {
    const key = makeFieldKey(account.account_id, 'notes');
    const pending = editedFields.get(key);
    if (pending === undefined) return;
    updateExpense(account.account_id, { notes: pending }, ['notes']);
  };

  if (!projectId) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
        Unable to determine project context for operating expenses.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="flex items-center justify-center">
          <div className="text-gray-500">Loading operating expenses...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="text-center">
          <div className="text-red-600 font-semibold mb-2">Error Loading Data</div>
          <div className="text-gray-600 text-sm">{error}</div>
          <button
            onClick={fetchHierarchy}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.accounts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="text-center text-gray-500">
          No operating expense data available for this project.
        </div>
      </div>
    );
  }

  const projectType = data.project_type_code;
  const isLandProject = projectType === 'LAND';

  const renderLandControls = (account: OpexAccount) => {
    const basis = account.calculation_basis || 'FIXED_AMOUNT';
    const isAuto = basis !== 'FIXED_AMOUNT';
    const annualValue = Number(account.annual_amount ?? account.calculated_total ?? 0);
    const unitAmountValue = getFieldValue(
      account.account_id,
      'unit_amount',
      account.unit_amount !== null && account.unit_amount !== undefined ? String(account.unit_amount) : ''
    );
    const annualInputValue = getFieldValue(
      account.account_id,
      'annual_amount',
      account.annual_amount !== null && account.annual_amount !== undefined
        ? Number(account.annual_amount).toFixed(2)
        : '0.00'
    );

    return (
      <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
        <select
          value={basis}
          onChange={(e) => updateExpense(account.account_id, { calculation_basis: e.target.value })}
          className="bg-gray-800 text-white px-3 py-1.5 rounded border border-gray-700"
        >
          {BASIS_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {isAuto ? (
          <>
            <input
              type="number"
              step="0.01"
              className="w-32 rounded border border-gray-700 bg-gray-900 px-3 py-1.5 text-right text-white"
              placeholder="$/unit"
              value={unitAmountValue}
              onChange={(e) => handleFieldChange(account.account_id, 'unit_amount', e.target.value)}
              onBlur={() =>
                commitNumericField(
                  account,
                  'unit_amount',
                  'unit_amount',
                  (value) => {
                    const parsed = parseFloat(value);
                    return Number.isFinite(parsed) ? parsed : null;
                  }
                )
              }
            />
            <div className="font-mono text-gray-400">
              = ${formatCurrency(annualValue)}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-gray-400">$</span>
            <input
              type="number"
              step="0.01"
              className="w-36 rounded border border-gray-300 px-3 py-1.5 text-right"
              value={annualInputValue}
              onChange={(e) => handleFieldChange(account.account_id, 'annual_amount', e.target.value)}
              onBlur={() =>
                commitNumericField(
                  account,
                  'annual_amount',
                  'annual_amount',
                  (value) => {
                    const parsed = parseFloat(value);
                    return Number.isFinite(parsed) ? parsed : null;
                  }
                )
              }
            />
          </div>
        )}
      </div>
    );
  };

  const renderStandardFields = (account: OpexAccount) => {
    if (mode === 'napkin') return null;

    const escalationValue = getFieldValue(
      account.account_id,
      'escalation_rate',
      account.escalation_rate !== null && account.escalation_rate !== undefined
        ? String(account.escalation_rate)
        : ''
    );

    const startPeriodValue = getFieldValue(
      account.account_id,
      'start_period',
      account.start_period !== null && account.start_period !== undefined ? String(account.start_period) : ''
    );

    return (
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300">
        <div className="flex items-center gap-1">
          <span>Esc %</span>
          <input
            type="number"
            step="0.1"
            className="w-20 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-right text-white"
            value={escalationValue}
            onChange={(e) => handleFieldChange(account.account_id, 'escalation_rate', e.target.value)}
            onBlur={() =>
              commitNumericField(
                account,
                'escalation_rate',
                'escalation_rate',
                (value) => {
                  const parsed = parseFloat(value);
                  return Number.isFinite(parsed) ? parsed : null;
                }
              )
            }
          />
        </div>
        <div className="flex items-center gap-1">
          <span>Start</span>
          <input
            type="number"
            className="w-20 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-right text-white"
            value={startPeriodValue}
            onChange={(e) => handleFieldChange(account.account_id, 'start_period', e.target.value)}
            onBlur={() =>
              commitNumericField(
                account,
                'start_period',
                'start_period',
                (value) => {
                  const parsed = parseInt(value, 10);
                  return Number.isFinite(parsed) ? parsed : null;
                }
              )
            }
          />
        </div>
        <div className="flex items-center gap-1">
          <span>Freq</span>
          <select
            value={account.payment_frequency || 'MONTHLY'}
            onChange={(e) => updateExpense(account.account_id, { payment_frequency: e.target.value })}
            className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-white"
          >
            {PAYMENT_FREQUENCIES.map(freq => (
              <option key={freq} value={freq}>
                {freq.toLowerCase().replace(/^[a-z]/, c => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  const renderDetailFields = (account: OpexAccount) => {
    if (mode !== 'detail') return null;

    const notesValue = getFieldValue(
      account.account_id,
      'notes',
      account.notes || ''
    );

    return (
      <textarea
        className="mt-2 w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
        placeholder="Notes or calculation context"
        rows={2}
        value={notesValue}
        onChange={(e) => handleFieldChange(account.account_id, 'notes', e.target.value)}
        onBlur={() => commitNotesField(account)}
      />
    );
  };

  const renderManualInputs = (account: OpexAccount) => {
    const annualValue = getFieldValue(
      account.account_id,
      'annual_amount',
      account.calculated_total ? Number(account.calculated_total).toFixed(2) : '0.00'
    );

    return (
      <div className="flex items-center justify-end gap-2">
        <span className="text-gray-600">$</span>
        <input
          type="number"
          step="0.01"
          value={annualValue}
          onChange={(e) => handleFieldChange(account.account_id, 'annual_amount', e.target.value)}
          onBlur={() =>
            commitNumericField(
              account,
              'annual_amount',
              'annual_amount',
              (value) => {
                const parsed = parseFloat(value);
                return Number.isFinite(parsed) ? parsed : null;
              }
            )
          }
          disabled={saving}
          className="w-40 rounded border border-gray-300 px-3 py-1.5 text-right"
        />
      </div>
    );
  };

  const renderAccount = (account: OpexAccount, depth = 0): JSX.Element => {
    const indentPx = depth * 20;
    const isEditable = !account.is_calculated;
    const displayTotal = Number(account.calculated_total ?? 0);

    let bgClass = 'bg-white';
    let textColorClass = 'text-gray-900';
    let fontWeightClass = '';

    if (depth === 0) {
      bgClass = 'bg-gray-800 text-white';
      fontWeightClass = 'font-bold';
      textColorClass = 'text-white';
    } else if (depth === 1) {
      bgClass = 'bg-gray-100';
      fontWeightClass = 'font-semibold';
    }

    const nameColor = account.is_calculated ? 'text-gray-500' : textColorClass;

    return (
      <div key={account.account_id}>
        <div
          className={`py-4 px-4 border-b ${bgClass}`}
          style={{ paddingLeft: `${16 + indentPx}px` }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className={`flex-1 ${fontWeightClass} ${nameColor}`}>
              {account.account_number} - {account.account_name}
            </div>
            <div className="text-right text-sm">
              <div className="text-gray-500 uppercase tracking-wide text-xs">Annual</div>
              <div className="text-lg font-semibold text-gray-900">
                ${formatCurrency(displayTotal)}
                {account.is_calculated && (
                  <span className="ml-2 text-xs text-gray-500">(calc)</span>
                )}
              </div>
            </div>
          </div>

          {isEditable && (
            <div className="mt-3 rounded border border-dashed border-gray-300 bg-gray-50 p-3">
              {isLandProject ? renderLandControls(account) : renderManualInputs(account)}
              {isLandProject && (
                <>
                  {renderStandardFields(account)}
                  {renderDetailFields(account)}
                </>
              )}
            </div>
          )}
        </div>

        {account.children.map(child => renderAccount(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 border-b">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Operating Expenses</h2>
          <p className="text-sm text-gray-500">Chart of accounts with live calculations</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Total Annual</div>
          <div className="text-3xl font-bold text-gray-900">
            ${formatCurrency(Number(data.summary.total_operating_expenses))}
          </div>
        </div>
      </div>

      {isLandProject && (
        <div className="border-b bg-gray-900 p-4">
          <OpExModeSelector mode={mode} onChange={handleModeChange} />
          <div className="mt-4">
            <InventoryStatsPanel projectId={projectId} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 p-6 bg-gray-50 border-b text-center">
        <div>
          <div className="text-sm text-gray-500">Total Accounts</div>
          <div className="text-xl font-semibold">{data.summary.account_count}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Entry Accounts</div>
          <div className="text-xl font-semibold text-blue-600">
            {data.summary.leaf_account_count}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Calculated Accounts</div>
          <div className="text-xl font-semibold text-gray-600">
            {data.summary.account_count - data.summary.leaf_account_count}
          </div>
        </div>
      </div>

      <div className="divide-y">
        {data.accounts.map(account => renderAccount(account, 0))}
      </div>

      <div className="p-4 bg-gray-50 border-t text-sm text-gray-600 flex items-center justify-between">
        <span>
          Calculated accounts roll up their children automatically. Edit only leaf accounts.
        </span>
        {saving && (
          <div className="flex items-center gap-2 text-blue-600">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
            <span>Saving...</span>
          </div>
        )}
      </div>
    </div>
  );
}
