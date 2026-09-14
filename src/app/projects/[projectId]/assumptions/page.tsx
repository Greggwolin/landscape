'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useParams } from 'next/navigation';
import { ComplexityTier } from '@/types/assumptions';
import { basket1Config } from '@/config/assumptions/basket1-the-deal';
import { basket2Config } from '@/config/assumptions/basket2-revenue';
import { basket3Config } from '@/config/assumptions/basket3-expenses';
import { basket4Config } from '@/config/assumptions/basket4-financing';
import { basket5Config } from '@/config/assumptions/basket5-equity';
import { AssumptionBasket } from '@/app/components/assumptions/AssumptionBasket';
import { getFieldsForTier } from '@/config/assumptions';
import { getAuthHeaders } from '@/lib/authHeaders';
import {
  armsAutoSave,
  shouldAutoSaveAssumptions,
  type ChangeOrigin
} from '@/lib/assumptions/autoSave';
import '@/app/styles/assumptions.css';

type BasketKey = 'acquisition' | 'revenue' | 'expenses' | 'financing' | 'equity';

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

  // The project's type, used to hide fields that do not apply to it — a land
  // development is not asked for an exit cap rate. Null until it arrives, and
  // null shows everything, so a slow or failed fetch never blanks the page.
  const [projectType, setProjectType] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${projectId}`, { headers: getAuthHeaders() })
      .then(r => (r.ok ? r.json() : null))
      .then(p => {
        if (!cancelled && p) {
          setProjectType(p.project_type_code ?? p.project_type ?? null);
        }
      })
      .catch(() => { /* leave null: every field stays visible */ });
    return () => { cancelled = true; };
  }, [projectId]);

  // Which baskets a PERSON has edited since this page loaded. Nothing is saved
  // for a basket that is not in here.
  //
  // Loading the page is itself a state change — the fetched payload lands in
  // state, and auto-calculated fields fire on mount — so without this gate the
  // 1s debounce below wrote back whatever the server handed over as though the
  // user had entered it. For a project with no acquisition record the server
  // used to hand over a full set of deal terms it had invented (7-year hold,
  // 5.5% exit cap, 20/80 land split, ...), and visiting the page made them
  // permanent. The server no longer invents them; this makes sure the page
  // could not persist them even if something else did.
  const [editedBaskets, setEditedBaskets] = useState<Set<BasketKey>>(new Set());

  const recordChange = useCallback(
    (
      basket: BasketKey,
      setter: Dispatch<SetStateAction<Record<string, string | number | boolean | null>>>
    ) => (key: string, value: string | number | boolean | null, origin: ChangeOrigin) => {
      setter(prev => ({ ...prev, [key]: value }));
      if (armsAutoSave(origin)) {
        setEditedBaskets(prev => (prev.has(basket) ? prev : new Set(prev).add(basket)));
      }
    },
    []
  );

  // Define save functions before useEffect hooks that reference them
  const saveAcquisitionData = useCallback(async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/assumptions/acquisition`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
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
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
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
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
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
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
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

  // Load all assumptions data.
  //
  // NOTE (2026-09-04): these five relative `/api/projects/:id/assumptions/*`
  // paths have NO Next.js route file and no rewrite — `next.config.ts` defines
  // redirects only, and `middleware.ts` passes `/api` straight through. Every
  // request 404s with an HTML body, `.json()` throws, `Promise.all` rejects and
  // the catch below leaves all five baskets empty. The Django endpoint that
  // backs acquisition is `POST/GET {DJANGO_API_URL}/api/projects/:id/
  // assumptions/acquisition/` (note the absolute host and trailing slash); the
  // other four baskets have no server at all. Left as-is deliberately: this
  // change is about not inventing assumptions, not about waking a dead path.
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        const [acqRes, revRes, expRes, finRes, eqRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/assumptions/acquisition`, { headers: getAuthHeaders() }),
          fetch(`/api/projects/${projectId}/assumptions/revenue`, { headers: getAuthHeaders() }),
          fetch(`/api/projects/${projectId}/assumptions/expenses`, { headers: getAuthHeaders() }),
          fetch(`/api/projects/${projectId}/assumptions/financing`, { headers: getAuthHeaders() }),
          fetch(`/api/projects/${projectId}/assumptions/equity`, { headers: getAuthHeaders() })
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

  // Auto-save acquisition data — only once a person has edited this basket.
  useEffect(() => {
    if (!shouldAutoSaveAssumptions({
      values: acquisitionData,
      userEdited: editedBaskets.has('acquisition')
    })) return;

    const timeoutId = setTimeout(saveAcquisitionData, 1000);
    return () => clearTimeout(timeoutId);
  }, [acquisitionData, saveAcquisitionData, editedBaskets]);

  // Auto-save revenue data
  useEffect(() => {
    if (!shouldAutoSaveAssumptions({
      values: revenueData,
      userEdited: editedBaskets.has('revenue')
    })) return;

    const timeoutId = setTimeout(saveRevenueData, 1000);
    return () => clearTimeout(timeoutId);
  }, [revenueData, saveRevenueData, editedBaskets]);

  // Auto-save expense data
  useEffect(() => {
    if (!shouldAutoSaveAssumptions({
      values: expenseData,
      userEdited: editedBaskets.has('expenses')
    })) return;

    const timeoutId = setTimeout(saveExpenseData, 1000);
    return () => clearTimeout(timeoutId);
  }, [expenseData, saveExpenseData, editedBaskets]);

  // Auto-save equity data
  useEffect(() => {
    if (!shouldAutoSaveAssumptions({
      values: equityData,
      userEdited: editedBaskets.has('equity')
    })) return;

    const timeoutId = setTimeout(saveEquityData, 1000);
    return () => clearTimeout(timeoutId);
  }, [equityData, saveEquityData, editedBaskets]);

  // Calculate total field counts across all baskets
  const fieldCounts = {
    napkin:
      getFieldsForTier(1, 'napkin', projectType).length +
      getFieldsForTier(2, 'napkin', projectType).length +
      getFieldsForTier(3, 'napkin', projectType).length +
      getFieldsForTier(4, 'napkin', projectType).length +
      getFieldsForTier(5, 'napkin', projectType).length,
    mid:
      getFieldsForTier(1, 'mid', projectType).length +
      getFieldsForTier(2, 'mid', projectType).length +
      getFieldsForTier(3, 'mid', projectType).length +
      getFieldsForTier(4, 'mid', projectType).length +
      getFieldsForTier(5, 'mid', projectType).length,
    pro:
      getFieldsForTier(1, 'pro', projectType).length +
      getFieldsForTier(2, 'pro', projectType).length +
      getFieldsForTier(3, 'pro', projectType).length +
      getFieldsForTier(4, 'pro', projectType).length +
      getFieldsForTier(5, 'pro', projectType).length
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
        onChange={recordChange('acquisition', setAcquisitionData)}
        onModeChange={setGlobalMode}
        showModeToggle={false}
        projectType={projectType}
      />

      {/* Basket 2: The Cash In (Revenue) */}
      <AssumptionBasket
        basket={basket2Config}
        values={revenueData}
        currentMode={globalMode}
        onChange={recordChange('revenue', setRevenueData)}
        showModeToggle={false}
        projectType={projectType}
      />

      {/* Basket 3: The Cash Out (Expenses) */}
      <AssumptionBasket
        basket={basket3Config}
        values={expenseData}
        currentMode={globalMode}
        onChange={recordChange('expenses', setExpenseData)}
        showModeToggle={false}
        projectType={projectType}
      />

      {/* Basket 4: The Financing */}
      <AssumptionBasket
        basket={basket4Config}
        values={financingData}
        currentMode={globalMode}
        onChange={recordChange('financing', setFinancingData)}
        showModeToggle={false}
        projectType={projectType}
      />

      {/* Basket 5: The Split (Equity) */}
      <AssumptionBasket
        basket={basket5Config}
        values={equityData}
        currentMode={globalMode}
        onChange={recordChange('equity', setEquityData)}
        showModeToggle={false}
        projectType={projectType}
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
