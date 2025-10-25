'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useComplexityMode } from '@/contexts/ComplexityModeContext';
import { ModeToggle } from '@/components/shared/ModeToggle';
import { multifamilyOpExFields, getVisibleFields, fieldCounts } from '@/config/opex/multifamily-fields';

interface ExpenseData {
  [key: string]: {
    opex_id?: number;
    annualAmount: number;
    perUnit?: number;
    perSF?: number;
    escalationRate: number;
  };
}

export default function OperatingExpensesPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  const { getEffectiveMode, setTabMode, userCapabilities } = useComplexityMode();
  const currentMode = getEffectiveMode('opex');

  const [expenses, setExpenses] = useState<ExpenseData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load existing expenses or generate defaults
  useEffect(() => {
    loadExpenses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const loadExpenses = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(`/api/projects/${projectId}/opex`);
      const data = await response.json();

      if (data.expenses && data.expenses.length > 0) {
        // Convert array to object keyed by expense_type
        const expensesMap = data.expenses.reduce((acc: ExpenseData, exp: Record<string, unknown>) => {
          acc[exp.expense_type] = {
            opex_id: exp.opex_id,
            annualAmount: parseFloat(exp.annual_amount) || 0,
            perUnit: exp.amount_per_sf ? parseFloat(exp.amount_per_sf) : undefined,
            perSF: exp.amount_per_sf ? parseFloat(exp.amount_per_sf) : undefined,
            escalationRate: parseFloat(exp.escalation_rate) || 0.03
          };
          return acc;
        }, {});
        setExpenses(expensesMap);
      } else {
        // Generate defaults
        await generateDefaults();
      }

    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateDefaults = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/opex/generate-defaults`, {
        method: 'POST'
      });
      const data = await response.json();

      if (data.defaults) {
        setExpenses(data.defaults);
      }
    } catch (error) {
      console.error('Error generating defaults:', error);
    }
  };

  const handleFieldChange = (fieldKey: string, value: number) => {
    setExpenses(prev => ({
      ...prev,
      [fieldKey]: {
        ...prev[fieldKey],
        annualAmount: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Convert expenses object to array for API
      const expensesArray = Object.entries(expenses).map(([key, value]) => {
        const field = multifamilyOpExFields.find(f => f.key === key);
        return {
          opex_id: value.opex_id || null,
          expense_category: field?.category || 'general',
          expense_type: key,
          annual_amount: value.annualAmount,
          amount_per_sf: value.perSF,
          escalation_rate: value.escalationRate,
          escalation_type: 'FIXED_PERCENT',
          start_period: 1,
          payment_frequency: 'MONTHLY'
        };
      });

      const response = await fetch(`/api/projects/${projectId}/opex`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenses: expensesArray })
      });

      if (response.ok) {
        setHasUnsavedChanges(false);
        // Reload to get IDs for new records
        await loadExpenses();
      }

    } catch (error) {
      console.error('Error saving expenses:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const visibleFields = getVisibleFields(currentMode);

  // Calculate totals
  const totalAnnual = Object.values(expenses).reduce((sum, exp) => sum + (exp.annualAmount || 0), 0);
  const totalPerUnit = Object.values(expenses).reduce((sum, exp) => sum + (exp.perUnit || 0), 0);
  const totalPerSF = Object.values(expenses).reduce((sum, exp) => sum + (exp.perSF || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600">Loading operating expenses...</div>
      </div>
    );
  }

  return (
    <div className="operating-expenses-page min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="page-header border-b bg-white px-8 py-6 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Operating Expenses</h1>
            <p className="mt-1 text-sm text-gray-600">
              Annual property operating costs and escalation assumptions
            </p>
          </div>

          <div className="flex items-center gap-4">
            <ModeToggle
              currentMode={currentMode}
              availableModes={userCapabilities.modesAvailable}
              onChange={(mode) => setTabMode('opex', mode)}
              onRestrictedClick={(mode) => {
                alert(`Upgrade to access ${mode} mode`);
              }}
              showFieldCounts={true}
              fieldCounts={fieldCounts}
              size="md"
            />

            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors font-medium"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="bg-blue-50 border-b px-8 py-6">
        <div className="grid grid-cols-4 gap-6">
          <div>
            <div className="text-xs text-gray-600 uppercase font-medium mb-1">Total Operating Expenses</div>
            <div className="text-2xl font-bold text-gray-900">
              ${totalAnnual.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">per year</div>
          </div>
          <div>
            <div className="text-xs text-gray-600 uppercase font-medium mb-1">Per Unit</div>
            <div className="text-2xl font-bold text-gray-900">
              ${Math.round(totalPerUnit).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">annual</div>
          </div>
          <div>
            <div className="text-xs text-gray-600 uppercase font-medium mb-1">Per SF</div>
            <div className="text-2xl font-bold text-gray-900">
              ${totalPerSF.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">annual</div>
          </div>
          <div>
            <div className="text-xs text-gray-600 uppercase font-medium mb-1">Expense Ratio</div>
            <div className="text-2xl font-bold text-gray-900">--</div>
            <div className="text-xs text-gray-500">of EGI (TBD)</div>
          </div>
        </div>
      </div>

      {/* Expense Fields */}
      <div className="px-8 py-6 space-y-4 max-w-6xl mx-auto">
        {visibleFields.map(field => {
          const expenseData = expenses[field.key] || { annualAmount: 0, perUnit: 0, perSF: 0, escalationRate: field.defaultEscalation || 0.03 };

          return (
            <div key={field.key} className="border border-gray-200 rounded-lg p-5 bg-white hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    {field.label}
                    {field.tier !== 'basic' && (
                      <span className="ml-2 text-xs font-normal text-gray-500 uppercase">
                        {field.tier}
                      </span>
                    )}
                  </label>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {field.helpText[currentMode]}
                  </p>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1 font-medium">Annual Amount</div>
                    <input
                      type="text"
                      value={expenseData.annualAmount?.toLocaleString() || '0'}
                      onChange={(e) => {
                        const value = parseInt(e.target.value.replace(/,/g, '')) || 0;
                        handleFieldChange(field.key, value);
                      }}
                      className="w-36 px-3 py-2 border border-gray-300 rounded-md text-right font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      ${expenseData.perUnit?.toLocaleString() || 0}/unit
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1 font-medium">Escalation</div>
                    <div className="text-base font-semibold text-gray-700">
                      {((expenseData.escalationRate || 0) * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-400 mt-1">annual</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Save reminder */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-4 right-4 bg-orange-100 border border-orange-300 text-orange-800 px-4 py-3 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">You have unsaved changes</span>
            <button
              onClick={handleSave}
              className="ml-2 px-3 py-1 bg-orange-600 text-white rounded text-sm font-medium hover:bg-orange-700"
            >
              Save Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
