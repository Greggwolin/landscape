// v1.5 · 2025-11-07 · Added area/phase filters
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { CButton, CCard, CCardBody, CNav, CNavItem, CNavLink } from '@coreui/react';
import ModeSelector, { type BudgetMode } from './ModeSelector';
import BudgetDataGrid from './BudgetDataGrid';
import TimelineChart from './custom/TimelineChart';
import BudgetHealthWidget from './BudgetHealthWidget';
import FiltersAccordion from './FiltersAccordion';
import { useBudgetData } from './hooks/useBudgetData';
import type { BudgetItem } from './ColumnDefinitions';
import BudgetItemModalV2, { type BudgetItemFormValues } from './BudgetItemModalV2';
import TimelineTab from './TimelineTab';
import AssumptionsTab from './AssumptionsTab';
import AnalysisTab from './AnalysisTab';
import CostCategoriesTab from './CostCategoriesTab';
import VarianceAlertModal from './VarianceAlertModal';
import ReconciliationModal from './ReconciliationModal';
import { useBudgetVariance, type CategoryVariance } from '@/hooks/useBudgetVariance';
import { useContainers } from '@/hooks/useContainers';

interface Props {
  projectId: number;
}

type SubTab = 'grid' | 'timeline' | 'assumptions' | 'analysis' | 'categories';

export default function BudgetGridTab({ projectId }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('grid');
  const [mode, setMode] = useState<BudgetMode>('napkin');
  const [pendingMode, setPendingMode] = useState<BudgetMode | null>(null);
  const [selected, setSelected] = useState<BudgetItem | undefined>();
  const [showGantt, setShowGantt] = useState(false);
  const [showHealthWidget, setShowHealthWidget] = useState(true);
  const [showVarianceAlert, setShowVarianceAlert] = useState(false);
  const [showReconciliationModal, setShowReconciliationModal] = useState(false);
  const [varianceToReconcile, setVarianceToReconcile] = useState<CategoryVariance | null>(null);
  const [projectTypeCode, setProjectTypeCode] = useState<string | undefined>(undefined);
  const previousMode = useRef<BudgetMode>('napkin');

  // Container filtering state
  const [selectedAreaIds, setSelectedAreaIds] = useState<number[]>([]);
  const [selectedPhaseIds, setSelectedPhaseIds] = useState<number[]>([]);

  const {
    data: rawData,
    loading,
    error,
    updateItem,
    createItem,
    deleteItem,
    refetch,
  } = useBudgetData(projectId);

  // Get container hierarchy for filtering
  const { phases } = useContainers({ projectId, includeCosts: false });

  // Filter budget data by selected containers
  const data = useMemo(() => {
    if (selectedAreaIds.length === 0 && selectedPhaseIds.length === 0) {
      return rawData;
    }

    // Build set of container IDs to include
    const containerIds = new Set<number>();

    // Add selected areas
    selectedAreaIds.forEach(id => containerIds.add(id));

    // Add selected phases
    selectedPhaseIds.forEach(id => containerIds.add(id));

    // If areas are selected but no specific phases, include all phases in those areas
    if (selectedAreaIds.length > 0 && selectedPhaseIds.length === 0) {
      phases
        .filter(phase => selectedAreaIds.includes(phase.parent_id!))
        .forEach(phase => containerIds.add(phase.container_id));
    }

    // Filter budget items by container_id
    return rawData.filter(item => {
      if (!item.container_id) return true; // Always show project-level items
      return containerIds.has(item.container_id);
    });
  }, [rawData, selectedAreaIds, selectedPhaseIds, phases]);

  const [modalState, setModalState] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    item?: BudgetItem | null;
  }>({ open: false, mode: 'create', item: undefined });

  // Fetch variance data (only when switching to napkin mode from standard/detail)
  const { data: varianceData } = useBudgetVariance(
    projectId,
    5, // min_variance_pct = 5% for alerts
    pendingMode === 'napkin' && (previousMode.current === 'standard' || previousMode.current === 'detail')
  );

  // Check if any items have dates (to determine if Gantt should be available)
  const hasDateData = data.some(
    (item) => item.start_date || item.end_date || item.start_period || item.periods_to_complete
  );

  // Mode change handler with variance alert
  const handleModeChange = (newMode: BudgetMode) => {
    const isFromStandardOrDetail = mode === 'standard' || mode === 'detail';
    const isToNapkin = newMode === 'napkin';

    // Check if alert has been dismissed for this session
    const sessionKey = `variance_alert_dismissed_${projectId}`;
    const alertDismissed = sessionStorage.getItem(sessionKey) === 'true';

    if (isFromStandardOrDetail && isToNapkin && !alertDismissed) {
      // Store pending mode change and fetch variance data
      setPendingMode(newMode);
    } else {
      // No alert needed, just change mode
      previousMode.current = mode;
      setMode(newMode);
    }
  };

  // Show variance alert when variance data is loaded
  useEffect(() => {
    if (pendingMode === 'napkin' && varianceData) {
      const materialVariances = varianceData.variances.filter(
        v => v.variance_pct !== null && Math.abs(v.variance_pct) > 5
      );

      if (materialVariances.length > 0) {
        setShowVarianceAlert(true);
      } else {
        // No material variances, proceed with mode change
        previousMode.current = mode;
        setMode(pendingMode);
        setPendingMode(null);
      }
    }
  }, [varianceData, pendingMode, mode]);

  // Variance alert handlers
  const handleVarianceAlertClose = () => {
    setShowVarianceAlert(false);
    setPendingMode(null);
  };

  const handleReconcileNow = () => {
    // Switch to standard mode instead (where variance is visible)
    previousMode.current = mode;
    setMode('standard');
    setShowVarianceAlert(false);
    setPendingMode(null);

    // Mark alert as dismissed for this session
    sessionStorage.setItem(`variance_alert_dismissed_${projectId}`, 'true');
  };

  const handleSwitchToStandard = () => {
    // Switch to standard mode
    previousMode.current = mode;
    setMode('standard');
    setShowVarianceAlert(false);
    setPendingMode(null);

    // Mark alert as dismissed for this session
    sessionStorage.setItem(`variance_alert_dismissed_${projectId}`, 'true');
  };

  const handleContinueAnyway = () => {
    // Proceed with napkin mode change
    if (pendingMode) {
      previousMode.current = mode;
      setMode(pendingMode);
    }
    setShowVarianceAlert(false);
    setPendingMode(null);

    // Mark alert as dismissed for this session
    sessionStorage.setItem(`variance_alert_dismissed_${projectId}`, 'true');
  };

  // Reconciliation modal handlers
  const handleReconcileVariance = (variance: CategoryVariance) => {
    setVarianceToReconcile(variance);
    setShowReconciliationModal(true);
  };

  const handleReconciliationComplete = () => {
    // Refresh budget data after reconciliation
    refetch();
  };

  const handleReconciliationModalClose = () => {
    setShowReconciliationModal(false);
    setVarianceToReconcile(null);
  };

  // Container filter handlers
  const handleAreaSelect = (areaId: number | null) => {
    if (areaId === null) {
      setSelectedAreaIds([]);
      setSelectedPhaseIds([]);
    } else {
      setSelectedAreaIds((prev) =>
        prev.includes(areaId)
          ? prev.filter((id) => id !== areaId)
          : [...prev, areaId]
      );
    }
  };

  const handlePhaseSelect = (phaseId: number | null) => {
    if (phaseId === null) {
      setSelectedPhaseIds([]);
    } else {
      setSelectedPhaseIds((prev) =>
        prev.includes(phaseId)
          ? prev.filter((id) => id !== phaseId)
          : [...prev, phaseId]
      );
    }
  };

  const handleClearFilters = () => {
    setSelectedAreaIds([]);
    setSelectedPhaseIds([]);
  };

  useEffect(() => {
    const fetchProjectMetadata = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (!response.ok) return;
        const payload = await response.json();
        const code =
          payload?.project?.project_type_code ??
          payload?.project?.projectTypeCode ??
          payload?.project_type_code ??
          payload?.projectTypeCode;
        if (typeof code === 'string' && code.length > 0) {
          setProjectTypeCode(code.toUpperCase());
        }
      } catch (err) {
        console.error('Failed to load project metadata', err);
      }
    };

    void fetchProjectMetadata();
  }, [projectId]);

  const handleInlineCommit = async (
    item: BudgetItem,
    field: keyof BudgetItem,
    rawValue: unknown
  ) => {
    if (!item.fact_id) return;

    const editableFields: Array<keyof BudgetItem> = [
      'qty',
      'rate',
      'uom_code',
      'notes',
      'category_l1_id',
      'category_l2_id',
      'category_l3_id',
      'category_l4_id',
    ];
    if (!editableFields.includes(field)) {
      return;
    }

    let value = rawValue;

    if (field === 'qty' || field === 'rate') {
      value =
        rawValue === null || rawValue === undefined || rawValue === ''
          ? null
          : Number(rawValue);
    }

    if (field === 'notes' && typeof rawValue === 'string') {
      value = rawValue;
    }

    const patch: Partial<BudgetItem> = {
      [field]: value,
    };

    if (field === 'qty' || field === 'rate') {
      const qty =
        field === 'qty'
          ? (value as number | null) ?? 0
          : item.qty ?? 0;
      const rate =
        field === 'rate'
          ? (value as number | null) ?? 0
          : item.rate ?? 0;

      if (qty !== null && rate !== null) {
        patch.amount = Number(qty) * Number(rate);
      }
    }

    try {
      await updateItem(item.fact_id, patch);
    } catch (err) {
      console.error('Failed to save budget item', err);
      alert(
        err instanceof Error ? err.message : 'Failed to save budget item, please try again.'
      );
    }
  };

  const openCreateModal = () => {
    setModalState({ open: true, mode: 'create', item: undefined });
  };

  const openEditModal = (item: BudgetItem) => {
    setSelected(item);
    setModalState({ open: true, mode: 'edit', item });
  };

  const closeModal = () => setModalState((prev) => ({ ...prev, open: false }));

  const handleModalSave = async (values: BudgetItemFormValues) => {
    if (modalState.mode === 'create') {
      await createItem({
        project_id: projectId,
        category_l1_id: values.category_l1_id ?? null,
        category_l2_id: values.category_l2_id ?? null,
        category_l3_id: values.category_l3_id ?? null,
        category_l4_id: values.category_l4_id ?? null,
        container_id: values.container_id ?? null,
        qty: values.qty,
        rate: values.rate,
        amount: values.amount,
        start_period: values.start_period ?? null,
        periods: values.periods ?? null,
        vendor_name: values.vendor_name ?? null,
        notes: values.notes,
        uom_code: values.uom_code,
      });
    } else if (modalState.item) {
      const patch: Partial<BudgetItem> = {
        qty: values.qty,
        rate: values.rate,
        amount: values.amount,
        start_period: values.start_period ?? null,
        periods_to_complete: values.periods ?? null,
        vendor_name: values.vendor_name ?? null,
        notes: values.notes,
        uom_code: values.uom_code,
      };

      await updateItem(modalState.item.fact_id, patch);
      setSelected((prev) =>
        prev && modalState.item && prev.fact_id === modalState.item.fact_id
          ? ({
              ...prev,
              ...patch,
            } as BudgetItem)
          : prev
      );
    }
  };

  const handleModalDelete = async () => {
    if (!modalState.item) return;
    await deleteItem(modalState.item.fact_id);
    if (selected?.fact_id === modalState.item.fact_id) {
      setSelected(undefined);
    }
  };

  if (loading) {
    return <div className="py-5 text-center text-secondary">Loading budget data…</div>;
  }

  if (error) {
    return <div className="alert alert-danger">Error loading budget data: {String(error)}</div>;
  }

  return (
    <CCard>
      <CCardBody>
        {/* Sub-tab Navigation */}
        <CNav variant="tabs" className="mb-4">
          <CNavItem>
            <CNavLink
              active={activeSubTab === 'grid'}
              onClick={() => setActiveSubTab('grid')}
              style={{ cursor: 'pointer' }}
            >
              Budget Grid
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink
              active={activeSubTab === 'timeline'}
              onClick={() => setActiveSubTab('timeline')}
              style={{ cursor: 'pointer' }}
            >
              Timeline View
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink
              active={activeSubTab === 'assumptions'}
              onClick={() => setActiveSubTab('assumptions')}
              style={{ cursor: 'pointer' }}
            >
              Assumptions
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink
              active={activeSubTab === 'analysis'}
              onClick={() => setActiveSubTab('analysis')}
              style={{ cursor: 'pointer' }}
            >
              Analysis
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink
              active={activeSubTab === 'categories'}
              onClick={() => setActiveSubTab('categories')}
              style={{ cursor: 'pointer' }}
            >
              Cost Categories
            </CNavLink>
          </CNavItem>
        </CNav>

        {/* Tab Content */}
        {activeSubTab === 'grid' && (
          <>
            {/* Filters Accordion */}
            <div className="mb-3">
              <FiltersAccordion
                projectId={projectId}
                selectedAreaIds={selectedAreaIds}
                selectedPhaseIds={selectedPhaseIds}
                onAreaSelect={handleAreaSelect}
                onPhaseSelect={handlePhaseSelect}
                onClearFilters={handleClearFilters}
              />
            </div>

            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <ModeSelector activeMode={mode} onModeChange={handleModeChange} />
              <div className="d-flex gap-2 align-items-center">
                {hasDateData && (
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="ganttToggle"
                      checked={showGantt}
                      onChange={(e) => setShowGantt(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <label
                      className="form-check-label text-secondary small"
                      htmlFor="ganttToggle"
                      style={{ cursor: 'pointer' }}
                    >
                      Timeline
                    </label>
                  </div>
                )}
                {(mode === 'standard' || mode === 'detail') && (
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="healthToggle"
                      checked={showHealthWidget}
                      onChange={(e) => setShowHealthWidget(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <label
                      className="form-check-label text-secondary small"
                      htmlFor="healthToggle"
                      style={{ cursor: 'pointer' }}
                    >
                      Health
                    </label>
                  </div>
                )}
                <CButton color="primary" size="sm" onClick={openCreateModal}>
                  + Add Item
                </CButton>
              </div>
            </div>
            <div className="row g-3">
              <div className={
                (hasDateData && showGantt) || (showHealthWidget && (mode === 'standard' || mode === 'detail'))
                  ? 'col-lg-9'
                  : 'col-12'
              }>
                <BudgetDataGrid
                  data={data}
                  mode={mode}
                  projectId={projectId}
                  selectedItem={selected}
                  onRowSelect={setSelected}
                  onInlineCommit={handleInlineCommit}
                  onOpenModal={mode === 'napkin' ? undefined : openEditModal}
                  onReconcile={handleReconcileVariance}
                  projectTypeCode={projectTypeCode}
                />
              </div>
              {((hasDateData && showGantt) || (showHealthWidget && (mode === 'standard' || mode === 'detail'))) && (
                <div className="col-lg-3">
                  {hasDateData && showGantt && (
                    <div className="mb-3">
                      <TimelineChart data={data} selectedItem={selected} onItemSelect={setSelected} />
                    </div>
                  )}
                  {showHealthWidget && (mode === 'standard' || mode === 'detail') && (
                    <BudgetHealthWidget
                      projectId={projectId}
                      onViewDetails={() => {
                        // Switch to standard mode if not already there
                        if (mode !== 'standard') {
                          previousMode.current = mode;
                          setMode('standard');
                        }
                      }}
                    />
                  )}
                </div>
              )}
            </div>
            <div className="small text-secondary mt-2">
              Showing {data.length} budget item{data.length !== 1 ? 's' : ''}
            </div>
          </>
        )}

        {activeSubTab === 'timeline' && <TimelineTab projectId={projectId} />}
        {activeSubTab === 'assumptions' && <AssumptionsTab projectId={projectId} />}
        {activeSubTab === 'analysis' && <AnalysisTab projectId={projectId} />}
        {activeSubTab === 'categories' && <CostCategoriesTab projectId={projectId} />}
      </CCardBody>

      <BudgetItemModalV2
        open={modalState.open}
        mode={modalState.mode}
        projectId={projectId}
        initialItem={modalState.item ?? null}
        onClose={closeModal}
        onSave={handleModalSave}
        onDelete={modalState.mode === 'edit' ? handleModalDelete : undefined}
      />

      <VarianceAlertModal
        visible={showVarianceAlert}
        onClose={handleVarianceAlertClose}
        variances={varianceData?.variances || []}
        onReconcile={handleReconcileNow}
        onSwitchToStandard={handleSwitchToStandard}
        onContinueAnyway={handleContinueAnyway}
      />

      <ReconciliationModal
        visible={showReconciliationModal}
        onClose={handleReconciliationModalClose}
        variance={varianceToReconcile}
        projectId={projectId}
        onReconciled={handleReconciliationComplete}
      />
    </CCard>
  );
}
