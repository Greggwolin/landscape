// v1.5 · 2025-11-07 · Added area/phase filters
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  CButton,
  CCard,
  CCardBody,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CNav,
  CNavItem,
  CNavLink,
} from '@coreui/react';
import ModeSelector, { type BudgetMode } from './ModeSelector';
import BudgetDataGrid from './BudgetDataGrid';
import TimelineChart from './custom/TimelineChart';
import FiltersAccordion from './FiltersAccordion';
import { useBudgetData } from './hooks/useBudgetData';
import type { BudgetItem } from './ColumnDefinitions';
import BudgetItemModalV2, { type BudgetItemFormValues } from './BudgetItemModalV2';
import TimelineTab from './TimelineTab';
import AssumptionsTab from './AssumptionsTab';
import AnalysisTab from './AnalysisTab';
import CostCategoriesTab from './CostCategoriesTab';
import QuickAddCategoryModal from './QuickAddCategoryModal';
import IncompleteCategoriesReminder from './IncompleteCategoriesReminder';
import { useContainers } from '@/hooks/useContainers';
import { LAND_DEVELOPMENT_SUBTYPES } from '@/types/project-taxonomy';
import type { BudgetCategory, QuickAddCategoryResponse } from '@/types/budget-categories';

interface Props {
  projectId: number;
}

type SubTab = 'grid' | 'timeline' | 'assumptions' | 'analysis' | 'categories';

// Helper to check if project is Land Development type
function isLandDevelopmentProject(projectTypeCode?: string): boolean {
  if (!projectTypeCode) return false;
  // Check if the project type code matches any Land Development subtype
  return LAND_DEVELOPMENT_SUBTYPES.some(
    subtype => projectTypeCode.toUpperCase() === subtype.toUpperCase()
  );
}

export default function BudgetGridTab({ projectId }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('grid');
  const [mode, setMode] = useState<BudgetMode>('napkin');
  const [selected, setSelected] = useState<BudgetItem | undefined>();
  const [showGantt, setShowGantt] = useState(false);
  const [projectTypeCode, setProjectTypeCode] = useState<string | undefined>(undefined);

  const filterStorageKey = `budget_filters_${projectId}`;
  const getStoredFilters = () => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(filterStorageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  // Container filtering state
  const [selectedAreaIds, setSelectedAreaIds] = useState<number[]>(() => getStoredFilters()?.areas ?? []);
  const [selectedPhaseIds, setSelectedPhaseIds] = useState<number[]>(() => getStoredFilters()?.phases ?? []);
  const [includeProjectLevel, setIncludeProjectLevel] = useState<boolean>(() => {
    const stored = getStoredFilters();
    return stored?.includeProjectLevel ?? true;
  });

  useEffect(() => {
    const stored = getStoredFilters();
    setSelectedAreaIds(stored?.areas ?? []);
    setSelectedPhaseIds(stored?.phases ?? []);
    setIncludeProjectLevel(stored?.includeProjectLevel ?? true);
  }, [projectId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload = {
      areas: selectedAreaIds,
      phases: selectedPhaseIds,
      includeProjectLevel,
    };
    try {
      window.localStorage.setItem(filterStorageKey, JSON.stringify(payload));
    } catch (err) {
      console.warn('Unable to persist budget filters', err);
    }
  }, [selectedAreaIds, selectedPhaseIds, includeProjectLevel, filterStorageKey]);

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

  const projectLevelCount = useMemo(
    () => rawData.filter(item => !item.container_id).length,
    [rawData]
  );

  // Filter budget data by selected containers
  const data = useMemo(() => {
    const containerFilterActive = selectedAreaIds.length > 0 || selectedPhaseIds.length > 0;

    const containerIds = new Set<number>();
    selectedAreaIds.forEach(id => containerIds.add(id));
    selectedPhaseIds.forEach(id => containerIds.add(id));

    if (selectedAreaIds.length > 0 && selectedPhaseIds.length === 0) {
      phases
        .filter(phase => selectedAreaIds.includes(phase.parent_id!))
        .forEach(phase => containerIds.add(phase.container_id));
    }

    return rawData.filter(item => {
      if (!item.container_id) {
        return includeProjectLevel;
      }
      if (!containerFilterActive) {
        return true;
      }
      return containerIds.has(item.container_id);
    });
  }, [rawData, selectedAreaIds, selectedPhaseIds, phases, includeProjectLevel]);

  const [modalState, setModalState] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    item?: BudgetItem | null;
    initialValues?: Partial<BudgetItemFormValues>;
  }>({ open: false, mode: 'create', item: undefined, initialValues: undefined });
  const [pendingDelete, setPendingDelete] = useState<BudgetItem | null>(null);

  const activeContainerContext = useMemo(() => {
    if (selectedPhaseIds.length === 1) {
      return selectedPhaseIds[0];
    }
    if (selectedAreaIds.length === 1 && selectedPhaseIds.length === 0) {
      return selectedAreaIds[0];
    }
    return null;
  }, [selectedAreaIds, selectedPhaseIds]);

  // Quick-add category modal state
  const [quickAddCategoryOpen, setQuickAddCategoryOpen] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<BudgetCategory[]>([]);

  // Check if any items have dates (to determine if Gantt should be available)
  const hasDateData = data.some(
    (item) => item.start_date || item.end_date || item.start_period || item.periods_to_complete
  );

  // Mode change handler
  const handleModeChange = (newMode: BudgetMode) => {
    setMode(newMode);
  };

  const handleProjectLevelToggle = (value: boolean) => {
    setIncludeProjectLevel(value);
  };

  const handleAddFromRow = (item: BudgetItem) => {
    openCreateModalWithDefaults({
      container_id: item.container_id ?? null,
      category_l1_id: item.category_l1_id ?? null,
      category_l2_id: item.category_l2_id ?? null,
      category_l3_id: item.category_l3_id ?? null,
      category_l4_id: item.category_l4_id ?? null,
    });
  };

  const handleGroupAdd = (context: { level: number; pathIds: number[]; pathNames: string[] }) => {
    openCreateModalWithDefaults({
      container_id: activeContainerContext ?? null,
      category_l1_id: context.pathIds[0] ?? null,
      category_l2_id: context.pathIds[1] ?? null,
      category_l3_id: context.pathIds[2] ?? null,
      category_l4_id: context.pathIds[3] ?? null,
    });
  };

  const handleRequestDelete = (item: BudgetItem) => {
    setPendingDelete(item);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteItem(pendingDelete.fact_id);
      if (selected?.fact_id === pendingDelete.fact_id) {
        setSelected(undefined);
      }
    } catch (err) {
      console.error('Failed to delete budget item', err);
      alert(err instanceof Error ? err.message : 'Failed to delete budget item, please try again.');
    } finally {
      setPendingDelete(null);
    }
  };

  const handleCancelDelete = () => setPendingDelete(null);

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

  // Note: QuickAddCategoryModal fetches its own categories from /api/budget/categories if needed
  // The legacy /api/financial/budget-categories endpoint has been deprecated

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
      'container_id',
      'lifecycle_stage',
      'start_period',
      'periods_to_complete',
      'start_date',
      'end_date',
      'vendor_name',
      'escalation_rate',
      'escalation_method',
      'contingency_pct',
      'timing_method',
      'curve_profile',
      'curve_steepness',
      'funding_id',
      'curve_id',
      'milestone_id',
      'cf_start_flag',
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

  const openCreateModalWithDefaults = (initialValues?: Partial<BudgetItemFormValues>) => {
    setModalState({ open: true, mode: 'create', item: undefined, initialValues });
  };

  const openCreateModal = () => {
    openCreateModalWithDefaults();
  };

  const openEditModal = (item: BudgetItem) => {
    setSelected(item);
    setModalState({ open: true, mode: 'edit', item, initialValues: undefined });
  };

  const closeModal = () =>
    setModalState((prev) => ({ ...prev, open: false, initialValues: undefined }));

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
        escalation_rate: values.escalation_rate ?? null,
        contingency_pct: values.contingency_pct ?? null,
        timing_method: values.timing_method ?? null,
        funding_id: values.funding_id ?? null,
        curve_id: values.curve_id ?? null,
        milestone_id: values.milestone_id ?? null,
        cf_start_flag: values.cf_start_flag ?? null,
        start_date: values.start_date ?? null,
        end_date: values.end_date ?? null,
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
        escalation_rate: values.escalation_rate ?? null,
        contingency_pct: values.contingency_pct ?? null,
        timing_method: values.timing_method ?? null,
        funding_id: values.funding_id ?? null,
        curve_id: values.curve_id ?? null,
        milestone_id: values.milestone_id ?? null,
        cf_start_flag: values.cf_start_flag ?? null,
        start_date: values.start_date ?? null,
        end_date: values.end_date ?? null,
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

  const handleQuickAddSuccess = (newCategory: QuickAddCategoryResponse) => {
    // Add new category to available categories
    setAvailableCategories((prev) => [...prev, newCategory]);
    // Could also auto-select this category in the grid if needed
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
            {/* Incomplete Categories Reminder */}
            <IncompleteCategoriesReminder projectId={projectId} className="mb-3" />

            {/* Filters Accordion */}
            <div className="mb-3">
              <FiltersAccordion
                projectId={projectId}
                selectedAreaIds={selectedAreaIds}
                selectedPhaseIds={selectedPhaseIds}
                onAreaSelect={handleAreaSelect}
                onPhaseSelect={handlePhaseSelect}
                onClearFilters={handleClearFilters}
                includeProjectLevel={includeProjectLevel}
                projectLevelItemCount={projectLevelCount}
                onProjectLevelToggle={handleProjectLevelToggle}
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
                <CButton
                  color="secondary"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickAddCategoryOpen(true)}
                >
                  + Quick Add Category
                </CButton>
                <CButton color="primary" size="sm" onClick={openCreateModal}>
                  + Add Item
                </CButton>
              </div>
            </div>
            <div className="row g-3">
              <div className={
                hasDateData && showGantt ? 'col-lg-9' : 'col-12'
              }>
                <BudgetDataGrid
                  data={data}
                  mode={mode}
                  projectId={projectId}
                  selectedItem={selected}
                  onRowSelect={setSelected}
                  onInlineCommit={handleInlineCommit}
                  onOpenModal={mode === 'napkin' ? undefined : openEditModal}
                  projectTypeCode={projectTypeCode}
                  onRequestRowAdd={handleAddFromRow}
                  onRequestRowDelete={handleRequestDelete}
                  onRequestGroupAdd={handleGroupAdd}
                />
              </div>
              {hasDateData && showGantt && (
                <div className="col-lg-3">
                  <div className="mb-3">
                    <TimelineChart data={data} selectedItem={selected} onItemSelect={setSelected} />
                  </div>
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
        initialFormValues={modalState.initialValues}
        activeBudgetMode={mode}
        onClose={closeModal}
        onSave={handleModalSave}
        onDelete={modalState.mode === 'edit' ? handleModalDelete : undefined}
      />

      {/* Quick Add Category Modal */}
      <QuickAddCategoryModal
        isOpen={quickAddCategoryOpen}
        onClose={() => setQuickAddCategoryOpen(false)}
        onSuccess={handleQuickAddSuccess}
        projectId={projectId}
        availableCategories={availableCategories}
      />

      <CModal visible={Boolean(pendingDelete)} onClose={handleCancelDelete}>
        <CModalHeader>
          <CModalTitle>Delete this budget item?</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="mb-1">
            {pendingDelete?.notes || '(No description)'}
          </p>
          <p className="text-muted small mb-0">
            This action cannot be undone.
          </p>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={handleCancelDelete}>
            Cancel
          </CButton>
          <CButton color="danger" onClick={handleConfirmDelete}>
            Delete
          </CButton>
        </CModalFooter>
      </CModal>
    </CCard>
  );
}
