'use client';

// ============================================================================
// PROPERTY ANALYSIS - Main Page Container
// ============================================================================
// Purpose: Unified 7-tab interface for property analysis
// Route: /properties/:id/analysis
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { TabNavigation } from './components/TabNavigation';
import { QuickStats } from './components/QuickStats';
import { RentRollTab } from './components/RentRollTab';
import { MarketAssumptionsTab } from './components/MarketAssumptionsTab';
import { OperatingAssumptionsTab } from './components/OperatingAssumptionsTab';
import { FinancingAssumptionsTab } from './components/FinancingAssumptionsTab';
import { CashFlowTab } from './components/CashFlowTab';
import { InvestmentReturnsTab } from './components/InvestmentReturnsTab';
import { SensitivityTab } from './components/SensitivityTab';
import {
  TabId,
  Tab,
  AnalysisFormState,
  AnalysisViewSettings,
  CalculationStatus,
} from './types/analysis.types';

export default function PropertyAnalysisPage() {
  const params = useParams();
  const propertyId = parseInt(params.id as string, 10);

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [activeTab, setActiveTab] = useState<TabId>('rent-roll');
  const [viewSettings, setViewSettings] = useState<AnalysisViewSettings>({
    mode: 'beginner',
    showAdvancedFields: false,
    showCalculationDetail: false,
    periodView: 'annual',
  });

  const [tabs, setTabs] = useState<Tab[]>([
    {
      id: 'rent-roll',
      label: 'Rent Roll',
      type: 'input',
      description: 'Lease data and tenant information',
      isComplete: false,
      isLocked: false,
      hasErrors: false,
    },
    {
      id: 'market',
      label: 'Market',
      type: 'input',
      description: 'Market rent assumptions',
      isComplete: false,
      isLocked: false,
      hasErrors: false,
    },
    {
      id: 'operating',
      label: 'Operating',
      type: 'input',
      description: 'Operating expenses and assumptions',
      isComplete: false,
      isLocked: false,
      hasErrors: false,
    },
    {
      id: 'financing',
      label: 'Financing',
      type: 'input',
      description: 'Debt, equity, and exit assumptions',
      isComplete: false,
      isLocked: false,
      hasErrors: false,
    },
    {
      id: 'cash-flow',
      label: 'Cash Flow',
      type: 'computed',
      description: '10-year projection',
      isComplete: false,
      isLocked: true,
      hasErrors: false,
    },
    {
      id: 'returns',
      label: 'Returns',
      type: 'computed',
      description: 'IRR, NPV, equity multiple',
      isComplete: false,
      isLocked: true,
      hasErrors: false,
    },
    {
      id: 'sensitivity',
      label: 'Sensitivity',
      type: 'computed',
      description: 'Tornado charts and scenarios',
      isComplete: false,
      isLocked: true,
      hasErrors: false,
    },
  ]);

  const [calculationStatus, setCalculationStatus] = useState<CalculationStatus>({
    is_calculating: false,
    last_calculated: null,
    needs_recalculation: false,
    error_message: null,
  });

  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // ============================================================================
  // TAB NAVIGATION
  // ============================================================================

  const handleTabChange = (tabId: TabId) => {
    // Check if tab is locked
    const tab = tabs.find((t) => t.id === tabId);
    if (tab?.isLocked) {
      alert('Please complete input tabs 1-4 and run calculations first.');
      return;
    }
    setActiveTab(tabId);
  };

  const handleNextTab = () => {
    const currentIndex = tabs.findIndex((t) => t.id === activeTab);
    if (currentIndex < tabs.length - 1) {
      const nextTab = tabs[currentIndex + 1];
      if (!nextTab.isLocked) {
        setActiveTab(nextTab.id);
      }
    }
  };

  const handlePrevTab = () => {
    const currentIndex = tabs.findIndex((t) => t.id === activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1].id);
    }
  };

  // ============================================================================
  // CALCULATION TRIGGER
  // ============================================================================

  const handleCalculate = async () => {
    try {
      setCalculationStatus({
        ...calculationStatus,
        is_calculating: true,
        error_message: null,
      });

      // Validate that all input tabs are complete
      const inputTabs = tabs.filter((t) => t.type === 'input');
      const incompleteInputs = inputTabs.filter((t) => !t.isComplete);

      if (incompleteInputs.length > 0) {
        alert(
          `Please complete the following tabs first: ${incompleteInputs
            .map((t) => t.label)
            .join(', ')}`
        );
        setCalculationStatus({
          ...calculationStatus,
          is_calculating: false,
          error_message: 'Required input tabs incomplete',
        });
        return;
      }

      // Trigger calculation via API
      // This will be implemented when tabs are connected to backend
      console.log('Starting calculation for property:', propertyId);

      // Simulate calculation delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Unlock computed tabs
      setTabs(
        tabs.map((tab) => ({
          ...tab,
          isLocked: tab.type === 'computed' ? false : tab.isLocked,
          isComplete: tab.type === 'computed' ? true : tab.isComplete,
        }))
      );

      setCalculationStatus({
        is_calculating: false,
        last_calculated: new Date().toISOString(),
        needs_recalculation: false,
        error_message: null,
      });

      // Navigate to cash flow tab
      setActiveTab('cash-flow');
    } catch (error) {
      console.error('Calculation error:', error);
      setCalculationStatus({
        is_calculating: false,
        last_calculated: calculationStatus.last_calculated,
        needs_recalculation: true,
        error_message: error instanceof Error ? error.message : 'Calculation failed',
      });
    }
  };

  // ============================================================================
  // AUTO-SAVE
  // ============================================================================

  useEffect(() => {
    if (!isDirty) return;

    const timer = setTimeout(() => {
      // Auto-save logic here
      console.log('Auto-saving changes...');
      setLastSaved(new Date().toISOString());
      setIsDirty(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [isDirty]);

  // ============================================================================
  // TAB COMPLETION TRACKING
  // ============================================================================

  const handleTabComplete = useCallback((tabId: TabId, isComplete: boolean) => {
    setTabs((prevTabs) => {
      const currentTab = prevTabs.find((t) => t.id === tabId);
      if (currentTab?.isComplete === isComplete) {
        // No change needed, return same reference
        return prevTabs;
      }
      return prevTabs.map((tab) =>
        tab.id === tabId ? { ...tab, isComplete } : tab
      );
    });
    setIsDirty(true);

    // If an input tab changes, mark calculations as needing recalculation
    setCalculationStatus((prev) => {
      if (prev.last_calculated) {
        return { ...prev, needs_recalculation: true };
      }
      return prev;
    });
  }, []);

  // ============================================================================
  // VIEW MODE TOGGLE
  // ============================================================================

  const toggleViewMode = () => {
    setViewSettings({
      ...viewSettings,
      mode: viewSettings.mode === 'beginner' ? 'advanced' : 'beginner',
      showAdvancedFields: viewSettings.mode === 'beginner',
    });
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Page Header */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => window.history.back()}
                className="text-sm text-gray-400 hover:text-gray-200 mb-2 flex items-center gap-1"
              >
                ← Back to Properties
              </button>
              <h1 className="text-2xl font-semibold text-white">
                Property Analysis
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Property ID: {propertyId}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* View Mode Toggle */}
              <button
                onClick={toggleViewMode}
                className="px-4 py-2 text-sm border border-gray-700 rounded hover:bg-gray-800 text-gray-300"
              >
                {viewSettings.mode === 'beginner'
                  ? 'Show Advanced Options'
                  : 'Hide Advanced Options'}
              </button>

              {/* Auto-save Indicator */}
              {lastSaved && (
                <div className="text-sm text-gray-500">
                  Saved {new Date(lastSaved).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <QuickStats
            propertyId={propertyId}
            onStatClick={handleTabChange}
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-[1600px] mx-auto px-6">
          <TabNavigation
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            calculationStatus={calculationStatus}
          />
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          {activeTab === 'rent-roll' && (
            <RentRollTab
              propertyId={propertyId}
              viewSettings={viewSettings}
              onComplete={(isComplete) => handleTabComplete('rent-roll', isComplete)}
              onNext={handleNextTab}
            />
          )}

          {activeTab === 'market' && (
            <MarketAssumptionsTab
              propertyId={propertyId}
              viewSettings={viewSettings}
              onComplete={(isComplete) => handleTabComplete('market', isComplete)}
              onNext={handleNextTab}
              onPrev={handlePrevTab}
            />
          )}

          {activeTab === 'operating' && (
            <OperatingAssumptionsTab
              propertyId={propertyId}
              viewSettings={viewSettings}
              onComplete={(isComplete) => handleTabComplete('operating', isComplete)}
              onNext={handleNextTab}
              onPrev={handlePrevTab}
            />
          )}

          {activeTab === 'financing' && (
            <FinancingAssumptionsTab
              propertyId={propertyId}
              viewSettings={viewSettings}
              onComplete={(isComplete) => handleTabComplete('financing', isComplete)}
              onCalculate={handleCalculate}
              calculationStatus={calculationStatus}
              onPrev={handlePrevTab}
            />
          )}

          {activeTab === 'cash-flow' && (
            <CashFlowTab
              propertyId={propertyId}
              viewSettings={viewSettings}
              calculationStatus={calculationStatus}
              onNext={handleNextTab}
              onPrev={handlePrevTab}
            />
          )}

          {activeTab === 'returns' && (
            <InvestmentReturnsTab
              propertyId={propertyId}
              viewSettings={viewSettings}
              calculationStatus={calculationStatus}
              onNext={handleNextTab}
              onPrev={handlePrevTab}
            />
          )}

          {activeTab === 'sensitivity' && (
            <SensitivityTab
              propertyId={propertyId}
              viewSettings={viewSettings}
              calculationStatus={calculationStatus}
              onPrev={handlePrevTab}
            />
          )}
        </div>
      </div>

      {/* Calculation Status Banner */}
      {calculationStatus.needs_recalculation && (
        <div className="fixed bottom-6 right-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 shadow-lg rounded">
          <div className="flex items-center gap-3">
            <div className="text-sm text-yellow-800">
              ⚠️ Input data has changed. Recalculate to update results.
            </div>
            <button
              onClick={handleCalculate}
              className="px-4 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
            >
              Recalculate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
