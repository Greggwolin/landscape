'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface OpexAccount {
  account_id: number;
  account_number: string;
  account_name: string;
  account_level: number;
  parent_account_id: number | null;
  is_calculated: boolean;
  calculated_total: number;
  sort_order: number;
  children: OpexAccount[];
}

interface OpexHierarchyData {
  accounts: OpexAccount[];
  summary: {
    total_operating_expenses: number;
    account_count: number;
    leaf_account_count: number;
  };
}

export default function OpExHierarchy() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [data, setData] = useState<OpexHierarchyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Map<number, string>>(new Map());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchHierarchy();
  }, [projectId]);

  const fetchHierarchy = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/projects/${projectId}/operating-expenses/hierarchy`);

      if (!response.ok) {
        throw new Error(`Failed to fetch hierarchy: ${response.statusText}`);
      }

      const data = await response.json();
      setData(data);
    } catch (error) {
      console.error('Error fetching OpEx hierarchy:', error);
      setError(error instanceof Error ? error.message : 'Failed to load operating expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (accountId: number, newValue: string) => {
    const updated = new Map(editedValues);
    updated.set(accountId, newValue);
    setEditedValues(updated);
  };

  const handleAmountBlur = async (accountId: number, displayValue: string) => {
    // Parse the display value to a number
    const numValue = parseFloat(displayValue.replace(/[^0-9.-]/g, ''));

    if (isNaN(numValue) || numValue < 0) {
      // Invalid value, revert to original
      const updated = new Map(editedValues);
      updated.delete(accountId);
      setEditedValues(updated);
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/projects/${projectId}/operating-expenses/${accountId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ annual_amount: numValue }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update expense');
      }

      const result = await response.json();

      // Refresh the entire hierarchy to get updated calculated totals
      await fetchHierarchy();

      // Clear edited value
      const updated = new Map(editedValues);
      updated.delete(accountId);
      setEditedValues(updated);

    } catch (error) {
      console.error('Error updating expense:', error);
      alert(error instanceof Error ? error.message : 'Failed to update expense');

      // Revert to original value
      const updated = new Map(editedValues);
      updated.delete(accountId);
      setEditedValues(updated);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const getDisplayValue = (account: OpexAccount): string => {
    const editedValue = editedValues.get(account.account_id);
    if (editedValue !== undefined) {
      return editedValue;
    }
    return formatCurrency(Number(account.calculated_total));
  };

  const renderAccount = useCallback((account: OpexAccount, depth: number = 0): JSX.Element => {
    const indentPx = depth * 20;
    const isEditable = !account.is_calculated;
    const displayValue = getDisplayValue(account);

    // Background colors by level
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

    // Gray out calculated accounts
    const accountTextColor = account.is_calculated ? 'text-gray-500' : textColorClass;

    return (
      <div key={account.account_id}>
        {/* Account Row */}
        <div
          className={`
            flex items-center justify-between py-3 px-4 border-b
            ${bgClass} ${fontWeightClass}
          `}
          style={{ paddingLeft: `${16 + indentPx}px` }}
        >
          {/* Account Name */}
          <div className="flex-1">
            <span className={accountTextColor}>
              {account.account_number} - {account.account_name}
            </span>
          </div>

          {/* Amount - Calculated or Editable */}
          <div className="w-48 text-right">
            {account.is_calculated ? (
              <span className="text-gray-500 text-sm">
                ${formatCurrency(Number(account.calculated_total))}
                <span className="text-xs ml-2 opacity-60">(calc)</span>
              </span>
            ) : (
              <div className="flex items-center justify-end gap-2">
                <span className="text-gray-600">$</span>
                <input
                  type="text"
                  value={displayValue}
                  onChange={(e) => handleAmountChange(account.account_id, e.target.value)}
                  onBlur={(e) => handleAmountBlur(account.account_id, e.target.value)}
                  onFocus={(e) => {
                    // Remove formatting on focus for easier editing
                    const numValue = parseFloat(e.target.value.replace(/,/g, ''));
                    if (!isNaN(numValue)) {
                      handleAmountChange(account.account_id, numValue.toFixed(2));
                    }
                  }}
                  disabled={saving}
                  className={`
                    w-40 px-3 py-1.5 text-right border rounded
                    focus:outline-none focus:ring-2 focus:ring-blue-500
                    bg-white text-gray-900 text-sm
                    ${saving ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  placeholder="0.00"
                />
              </div>
            )}
          </div>
        </div>

        {/* Recursive Children */}
        {account.children.map(child => renderAccount(child, depth + 1))}
      </div>
    );
  }, [editedValues, saving, projectId]);

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

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <h2 className="text-2xl font-bold text-gray-900">Operating Expenses</h2>
        <div className="text-right">
          <div className="text-sm text-gray-500">Total Annual</div>
          <div className="text-3xl font-bold text-gray-900">
            ${formatCurrency(Number(data.summary.total_operating_expenses))}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 p-6 bg-gray-50 border-b">
        <div>
          <div className="text-sm text-gray-500">Total Accounts</div>
          <div className="text-xl font-semibold">{data.summary.account_count}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Entry Accounts</div>
          <div className="text-xl font-semibold text-blue-600">{data.summary.leaf_account_count}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Calculated Accounts</div>
          <div className="text-xl font-semibold text-gray-600">
            {data.summary.account_count - data.summary.leaf_account_count}
          </div>
        </div>
      </div>

      {/* Hierarchy Display */}
      <div className="divide-y">
        {data.accounts.map(account => renderAccount(account, 0))}
      </div>

      {/* Footer Info */}
      <div className="p-4 bg-gray-50 border-t">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            <span className="font-medium">Note:</span> Calculated accounts automatically sum their children.
            Only leaf accounts can be edited.
          </div>
          {saving && (
            <div className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <span>Saving...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
