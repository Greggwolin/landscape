'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ComplexityTier } from '@/types/assumptions';
import { basket1Config } from '@/config/assumptions/basket1-the-deal';
import { basket2Config } from '@/config/assumptions/basket2-revenue';
import { basket3Config } from '@/config/assumptions/basket3-expenses';
import { basket4Config } from '@/config/assumptions/basket4-financing';
import { basket5Config } from '@/config/assumptions/basket5-equity';
import { AssumptionBasket } from '@/app/components/assumptions/AssumptionBasket';
import { getFieldsForTier } from '@/config/assumptions';
import '@/app/styles/assumptions.css';

export default function AssumptionsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  // Load mode preference from localStorage
  const [globalMode, setGlobalMode] = useState<ComplexityTier>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('assumptionsMode');
      return (saved as ComplexityTier) || 'napkin';
    }
    return 'napkin';
  });

  // State for all baskets
  const [acquisitionData, setAcquisitionData] = useState<Record<string, string | number | boolean | null>>({});
  const [revenueData, setRevenueData] = useState<Record<string, string | number | boolean | null>>({});
  const [expenseData, setExpenseData] = useState<Record<string, string | number | boolean | null>>({});
  const [financingData, setFinancingData] = useState<Record<string, string | number | boolean | null>>({});
  const [equityData, setEquityData] = useState<Record<string, string | number | boolean | null>>({});

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Define save functions before useEffect hooks that reference them
  const saveAcquisitionData = useCallback(async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/assumptions/acquisition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(acquisitionData)
      });

      if (response.ok) {
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Error saving acquisition assumptions:', error);
    } finally {
      setIsSaving(false);
    }
  }, [projectId, acquisitionData]);

  const saveRevenueData = useCallback(async () => {
    try {
      await fetch(`/api/projects/${projectId}/assumptions/revenue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(revenueData)
      });
    } catch (error) {
      console.error('Error saving revenue assumptions:', error);
    }
  }, [projectId, revenueData]);

  const saveExpenseData = useCallback(async () => {
    try {
      await fetch(`/api/projects/${projectId}/assumptions/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData)
      });
    } catch (error) {
      console.error('Error saving expense assumptions:', error);
    }
  }, [projectId, expenseData]);

  const saveEquityData = useCallback(async () => {
    try {
      await fetch(`/api/projects/${projectId}/assumptions/equity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(equityData)
      });
    } catch (error) {
      console.error('Error saving equity assumptions:', error);
    }
  }, [projectId, equityData]);

  // Save mode preference to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('assumptionsMode', globalMode);
    }
  }, [globalMode]);

  // Load all assumptions data
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        const [acqRes, revRes, expRes, finRes, eqRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/assumptions/acquisition`),
          fetch(`/api/projects/${projectId}/assumptions/revenue`),
          fetch(`/api/projects/${projectId}/assumptions/expenses`),
          fetch(`/api/projects/${projectId}/assumptions/financing`),
          fetch(`/api/projects/${projectId}/assumptions/equity`)
        ]);

        const [acq, rev, exp, fin, eq] = await Promise.all([
          acqRes.json(),
          revRes.json(),
          expRes.json(),
          finRes.json(),
          eqRes.json()
        ]);

        setAcquisitionData(acq);
        setRevenueData(rev);
        setExpenseData(exp);
        setFinancingData(fin);
        setEquityData(eq);
      } catch (error) {
        console.error('Error fetching assumptions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [projectId]);

  // Auto-save acquisition data
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (Object.keys(acquisitionData).length > 0 && acquisitionData.project_id) {
        saveAcquisitionData();
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [acquisitionData, saveAcquisitionData]);

  // Auto-save revenue data
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (Object.keys(revenueData).length > 0) {
        saveRevenueData();
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [revenueData, saveRevenueData]);

  // Auto-save expense data
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (Object.keys(expenseData).length > 0) {
        saveExpenseData();
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [expenseData, saveExpenseData]);

  // Auto-save equity data
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (Object.keys(equityData).length > 0) {
        saveEquityData();
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [equityData, saveEquityData]);

  // Calculate total field counts across all baskets
  const fieldCounts = {
    napkin:
      getFieldsForTier(1, 'napkin').length +
      getFieldsForTier(2, 'napkin').length +
      getFieldsForTier(3, 'napkin').length +
      getFieldsForTier(4, 'napkin').length +
      getFieldsForTier(5, 'napkin').length,
    mid:
      getFieldsForTier(1, 'mid').length +
      getFieldsForTier(2, 'mid').length +
      getFieldsForTier(3, 'mid').length +
      getFieldsForTier(4, 'mid').length +
      getFieldsForTier(5, 'mid').length,
    pro:
      getFieldsForTier(1, 'pro').length +
      getFieldsForTier(2, 'pro').length +
      getFieldsForTier(3, 'pro').length +
      getFieldsForTier(4, 'pro').length +
      getFieldsForTier(5, 'pro').length
  };

  if (isLoading) {
    return (
      <div className="assumptions-page">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading assumptions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="assumptions-page">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1>Investment Assumptions</h1>
          <p className="text-gray-600">
            Configure your deal assumptions from napkin math to institutional-grade analysis
          </p>
        </div>
        <div className="save-status">
          {isSaving && <span className="text-blue-600">Saving...</span>}
          {lastSaved && !isSaving && (
            <span className="text-green-600">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Global mode toggle */}
      <div className="global-mode-toggle">
        <div>
          <h3 className="text-lg font-semibold mb-1">Complexity Level</h3>
          <p className="text-sm text-gray-600">
            Switch between simplified and detailed views across all baskets
          </p>
        </div>
        <div className="toggle-buttons">
          <button
            className={`toggle-btn ${globalMode === 'napkin' ? 'active' : ''}`}
            onClick={() => setGlobalMode('napkin')}
          >
            <span className="toggle-btn-label">Napkin</span>
            <span className="toggle-btn-count">{fieldCounts.napkin} fields</span>
          </button>
          <button
            className={`toggle-btn ${globalMode === 'mid' ? 'active' : ''}`}
            onClick={() => setGlobalMode('mid')}
          >
            <span className="toggle-btn-label">Mid</span>
            <span className="toggle-btn-count">{fieldCounts.mid} fields</span>
          </button>
          <button
            className={`toggle-btn ${globalMode === 'pro' ? 'active' : ''}`}
            onClick={() => setGlobalMode('pro')}
          >
            <span className="toggle-btn-label">Kitchen Sink</span>
            <span className="toggle-btn-count">{fieldCounts.pro} fields</span>
          </button>
        </div>
      </div>

      {/* Basket 1: The Deal (Acquisition) */}
      <AssumptionBasket
        basket={basket1Config}
        values={acquisitionData}
        currentMode={globalMode}
        onChange={(key, value) => setAcquisitionData(prev => ({ ...prev, [key]: value }))}
        onModeChange={setGlobalMode}
        showModeToggle={false}
      />

      {/* Basket 2: The Cash In (Revenue) */}
      <AssumptionBasket
        basket={basket2Config}
        values={revenueData}
        currentMode={globalMode}
        onChange={(key, value) => setRevenueData(prev => ({ ...prev, [key]: value }))}
        showModeToggle={false}
      />

      {/* Basket 3: The Cash Out (Expenses) */}
      <AssumptionBasket
        basket={basket3Config}
        values={expenseData}
        currentMode={globalMode}
        onChange={(key, value) => setExpenseData(prev => ({ ...prev, [key]: value }))}
        showModeToggle={false}
      />

      {/* Basket 4: The Financing */}
      <AssumptionBasket
        basket={basket4Config}
        values={financingData}
        currentMode={globalMode}
        onChange={(key, value) => setFinancingData(prev => ({ ...prev, [key]: value }))}
        showModeToggle={false}
      />

      {/* Basket 5: The Split (Equity) */}
      <AssumptionBasket
        basket={basket5Config}
        values={equityData}
        currentMode={globalMode}
        onChange={(key, value) => setEquityData(prev => ({ ...prev, [key]: value }))}
        showModeToggle={false}
      />

      {/* Footer with info */}
      <div className="text-center py-12 border-t border-gray-200 mt-8">
        <p className="text-gray-600 mb-2">
          <strong>{fieldCounts[globalMode]} fields</strong> visible in {globalMode} mode
        </p>
        <p className="text-sm text-gray-500">
          Mode preference saved automatically
        </p>
      </div>
    </div>
  );
}
