// Budget Item Modal V2 - Compact 3-row layout with template integration
// Date: 2025-11-07
'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  CAccordion,
  CAccordionBody,
  CAccordionHeader,
  CAccordionItem,
  CButton,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CCol,
} from '@coreui/react';
import type { BudgetItem } from './ColumnDefinitions';
import type { BudgetMode } from './ModeSelector';
import type { UnitCostTemplateSummary } from '@/types/benchmarks';
import { useUnitCostCategoriesForBudget } from '@/hooks/useUnitCostCategoriesForBudget';
import './BudgetItemModal.css';
import { UOMSelect } from '@/components/common/UOMSelect';

export interface BudgetItemFormValues {
  fact_id?: number;
  project_id?: number;
  division_id?: number | null;
  category_l1_id?: number | null;
  category_l2_id?: number | null;
  category_l3_id?: number | null;
  category_l4_id?: number | null;
  vendor_name?: string | null;
  notes: string | null;
  qty: number | null;
  rate: number | null;
  amount: number | null;
  uom_code: string | null;
  start_period?: number | null;
  periods?: number | null;
  end_period?: number | null;
   escalation_rate?: number | null;
   contingency_pct?: number | null;
   timing_method?: string | null;
   start_date?: string | null;
   end_date?: string | null;
   funding_id?: number | null;
   curve_id?: number | null;
   milestone_id?: number | null;
   cf_start_flag?: boolean | null;
}

interface BudgetItemModalV2Props {
  open: boolean;
  mode: 'create' | 'edit';
  initialItem?: BudgetItem | null;
  projectId: number;
  initialFormValues?: Partial<BudgetItemFormValues>;
  activeBudgetMode: BudgetMode;
  onClose: () => void;
  onSave: (values: BudgetItemFormValues) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}

interface Container {
  division_id: number;
  display_name: string;
  tier: number;
  parent_division_id: number | null;
}

interface ProjectConfig {
  level1_label: string;
  level2_label: string;
  level3_label: string;
}

interface UnitCostCategory {
  category_id: number;
  category_name: string;
  template_count: number;
}

export default function BudgetItemModalV2({
  open,
  mode,
  initialItem,
  projectId,
  initialFormValues,
  activeBudgetMode,
  onClose,
  onSave,
  onDelete,
}: BudgetItemModalV2Props) {
  // Form state
  const [divisionId, setContainerId] = useState<number | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string>(''); // e.g., 'Acquisition', 'Development'
  const [categoryL1Id, setCategoryL1Id] = useState<number | null>(null);
  const [categoryL2Id, setCategoryL2Id] = useState<number | null>(null);
  const [categoryL3Id, setCategoryL3Id] = useState<number | null>(null);
  const [categoryL4Id, setCategoryL4Id] = useState<number | null>(null);
  const [vendorName, setVendorName] = useState<string>('');
  const [itemDescription, setItemDescription] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [uom, setUom] = useState<string>('EA');
  const [rate, setRate] = useState<string>('');
  const [startPeriod, setStartPeriod] = useState<string>('');
  const [periods, setPeriods] = useState<string>('');
  const [projectScopeSelected, setProjectScopeSelected] = useState<boolean>(false);
  const [escalationRate, setEscalationRate] = useState<string>('');
  const [contingencyPct, setContingencyPct] = useState<string>('');
  const [timingMethod, setTimingMethod] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [fundingId, setFundingId] = useState<string>('');
  const [curveId, setCurveId] = useState<string>('');
  const [milestoneId, setMilestoneId] = useState<string>('');
  const [cashFlowStartFlag, setCashFlowStartFlag] = useState<boolean>(false);

  // Calculated fields
  const total = useMemo(() => {
    const q = parseFloat(quantity) || 0;
    const r = parseFloat(rate) || 0;
    return q * r;
  }, [quantity, rate]);

  // Fetch Unit Cost Categories (used in Admin → Preferences)
  const {
    stageOptions,
    loading: stageLoading,
    error: stageError,
    getCategoriesByStage,
    getChildren,
  } = useUnitCostCategoriesForBudget();

  // Get L1 categories for the selected lifecycle stage
  const level1Options = useMemo(() => {
    if (!selectedActivity) {
      console.log('[BudgetItemModalV2] No lifecycle stage selected');
      return [];
    }
    const options = getCategoriesByStage(selectedActivity);
    console.log('[BudgetItemModalV2] level1Options for', selectedActivity, ':', options);
    return options;
  }, [selectedActivity, getCategoriesByStage]);

  const level2Options = useMemo(() => getChildren(categoryL1Id ?? null), [getChildren, categoryL1Id]);
  const level3Options = useMemo(() => getChildren(categoryL2Id ?? null), [getChildren, categoryL2Id]);
  const level4Options = useMemo(() => getChildren(categoryL3Id ?? null), [getChildren, categoryL3Id]);
  const showStandardFields = activeBudgetMode === 'standard' || activeBudgetMode === 'detail';
  const showDetailFields = activeBudgetMode === 'detail';
  const accordionActiveItems = showStandardFields ? ['standard'] : undefined;
  const totalDisplay = useMemo(() => {
    if (!Number.isFinite(total)) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(total);
  }, [total]);

  // Fetched data
  const [containers, setContainers] = useState<Container[]>([]);
  const [projectConfig, setProjectConfig] = useState<ProjectConfig | null>(null);
  const [templates, setTemplates] = useState<UnitCostTemplateSummary[]>([]);
  const [error, setError] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const endPeriod = useMemo(() => {
    const start = parseInt(startPeriod) || 0;
    const duration = parseInt(periods) || 0;
    return start > 0 && duration > 0 ? start + duration - 1 : null;
  }, [startPeriod, periods]);

  // Build display names with level labels (e.g., "Village 1", "Phase 1.1")
  // Only show Level 1 and Level 2 containers (Villages and Phases)
  const containerOptions = useMemo(() => {
    if (!containers.length || !projectConfig) return [];

    // Map level to label
    const getLevelLabel = (level: number): string => {
      switch (level) {
        case 1:
          return projectConfig.level1_label;
        case 2:
          return projectConfig.level2_label;
        case 3:
          return projectConfig.level3_label;
        default:
          return 'Container';
      }
    };

    // Filter to only Level 1 and Level 2, then sort by level first, then by display name
    return [...containers]
      .filter(c => c.tier === 1 || c.tier === 2)
      .sort((a, b) => {
        if (a.tier !== b.tier) {
          return a.tier - b.tier;
        }
        // Natural sort for names like "1.1", "1.2", "2.1"
        return a.display_name.localeCompare(b.display_name, undefined, { numeric: true });
      })
      .map(container => {
        const levelLabel = getLevelLabel(container.tier);
        const displayName = container.display_name;

        // Check if display_name already contains the level label (case-insensitive)
        // or already looks like a descriptive name (contains spaces or starts with a word)
        const hasLabel = displayName.toLowerCase().includes(levelLabel.toLowerCase());
        const looksDescriptive = displayName.includes(' ') || /^[A-Za-z]/.test(displayName);

        // Only prepend label if it's a simple number/code and doesn't already have the label
        const finalName = (hasLabel || looksDescriptive)
          ? displayName
          : `${levelLabel} ${displayName}`;

        return {
          division_id: container.division_id,
          display_name: finalName,
          level: container.tier,
        };
      });
  }, [containers, projectConfig]);

  // Get container label as breadcrumb based on project config
  // Only show Level 1 > Level 2 (e.g., "Village > Phase")
  const containerLabel = useMemo(() => {
    if (!projectConfig) return 'Container';

    const labels: string[] = [];
    if (projectConfig.level1_label) labels.push(projectConfig.level1_label);
    if (projectConfig.level2_label) labels.push(projectConfig.level2_label);

    return labels.length > 0 ? labels.join(' > ') : 'Container';
  }, [projectConfig]);

  // Load containers and project config on mount
  useEffect(() => {
    if (open && projectId) {
      // Load containers - API returns tree structure, we need to flatten it
      fetch(`/api/projects/${projectId}/containers`)
        .then(r => r.json())
        .then(data => {
          const tree = data.containers || [];
          // Flatten tree structure into a flat list
          const flattenTree = (nodes: any[]): Container[] => {
            const result: Container[] = [];
            const traverse = (node: any) => {
              result.push({
                division_id: node.division_id,
                display_name: node.display_name,
                tier: node.tier,
                parent_division_id: node.parent_division_id || null,
              });
              if (node.children && node.children.length > 0) {
                node.children.forEach(traverse);
              }
            };
            nodes.forEach(traverse);
            return result;
          };
          const flattened = flattenTree(tree);
          console.log('Flattened containers:', flattened.length, flattened);
          setContainers(flattened);
        })
        .catch(err => console.error('Error loading containers:', err));

      // Load project config for level labels
      fetch(`/api/projects/${projectId}/config`)
        .then(r => r.json())
        .then(data => {
          if (data.config) {
            setProjectConfig({
              level1_label: data.config.level1_label || 'Area',
              level2_label: data.config.level2_label || 'Phase',
              level3_label: data.config.level3_label || 'Parcel',
            });
          }
        })
        .catch(err => console.error('Error loading project config:', err));
    }
  }, [open, projectId]);

  // Load cost library items when category changes (renamed from templates to items)
  useEffect(() => {
    if (categoryL1Id) {
      fetch(`/api/unit-costs/items/?category_id=${categoryL1Id}`)
        .then(r => r.json())
        .then(data => {
          // Django REST framework returns {count, next, previous, results}
          const items = data.results || data.templates || data.data || [];
          setTemplates(items);
        })
        .catch(err => console.error('Error loading cost library items:', err));
    } else {
      setTemplates([]);
    }
  }, [categoryL1Id]);

  // Initialize form from initialItem
  useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && initialItem) {
      setContainerId(initialItem.division_id ?? null);
      setProjectScopeSelected(initialItem.division_id === null);
      setCategoryL1Id(initialItem.category_l1_id || null);
      setCategoryL2Id(initialItem.category_l2_id || null);
      setCategoryL3Id(initialItem.category_l3_id || null);
      setCategoryL4Id(initialItem.category_l4_id || null);
      setVendorName(initialItem.vendor_name || '');
      setItemDescription(initialItem.notes || '');
      setQuantity(initialItem.qty?.toString() || '');
      setUom(initialItem.uom_code || 'EA');
      setRate(initialItem.rate?.toString() || '');
      setStartPeriod(initialItem.start_period?.toString() || '');
      setPeriods(initialItem.periods_to_complete?.toString() || '');
      setEscalationRate(
        initialItem.escalation_rate !== null && initialItem.escalation_rate !== undefined
          ? initialItem.escalation_rate.toString()
          : ''
      );
      setContingencyPct(
        initialItem.contingency_pct !== null && initialItem.contingency_pct !== undefined
          ? initialItem.contingency_pct.toString()
          : ''
      );
      setTimingMethod(initialItem.timing_method || '');
      setStartDate(initialItem.start_date || '');
      setEndDate(initialItem.end_date || '');
      setFundingId(initialItem.funding_id ? initialItem.funding_id.toString() : '');
      setCurveId(initialItem.curve_id ? initialItem.curve_id.toString() : '');
      setMilestoneId(initialItem.milestone_id ? initialItem.milestone_id.toString() : '');
      setCashFlowStartFlag(Boolean(initialItem.cf_start_flag));
    } else if (mode === 'create') {
      const shouldSelectProjectScope =
        initialFormValues !== undefined &&
        Object.prototype.hasOwnProperty.call(initialFormValues, 'division_id') &&
        initialFormValues.division_id === null;

      setProjectScopeSelected(Boolean(shouldSelectProjectScope));
      setContainerId(initialFormValues?.division_id ?? null);
      setCategoryL1Id(initialFormValues?.category_l1_id ?? null);
      setCategoryL2Id(initialFormValues?.category_l2_id ?? null);
      setCategoryL3Id(initialFormValues?.category_l3_id ?? null);
      setCategoryL4Id(initialFormValues?.category_l4_id ?? null);
      setVendorName('');
      setItemDescription('');
      setQuantity('');
      setUom('EA');
      setRate('');
      setStartPeriod('');
      setPeriods('');
      setEscalationRate('');
      setContingencyPct('');
      setTimingMethod('');
      setStartDate('');
      setEndDate('');
      setFundingId('');
      setCurveId('');
      setMilestoneId('');
      setCashFlowStartFlag(initialFormValues?.cf_start_flag ?? false);
    }
    setError('');
  }, [open, initialItem, mode, initialFormValues]);

  // Handle template selection from datalist
  const handleItemDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setItemDescription(value);

    // Check if user selected a template
    const selectedTemplate = templates.find(t => t.item_name === value);
    if (selectedTemplate) {
      // Auto-fill rate, UOM, and vendor from template
      setRate(selectedTemplate.typical_mid_value?.toString() || '');
      setUom(selectedTemplate.default_uom_code || 'EA');
      setVendorName(selectedTemplate.source || '');
    }
  };

  // Check if item is custom (not in template list)
  const isCustomItem = useMemo(() => {
    return itemDescription && !templates.find(t => t.item_name === itemDescription);
  }, [itemDescription, templates]);

  // Handle save button click
  const handleSave = async () => {
    // Validate required fields
    const scopeSelected = projectScopeSelected || (divisionId !== null && divisionId !== undefined);
    if (!scopeSelected) {
      setError('Scope is required');
      return;
    }
    if (!selectedActivity) {
      setError('Stage (lifecycle) is required');
      return;
    }
    if (!categoryL1Id) {
      setError('Category is required');
      return;
    }
    if (!itemDescription) {
      setError('Item description is required');
      return;
    }

    // If custom item and not editing, show confirmation
    if (isCustomItem && mode === 'create') {
      setShowConfirmation(true);
      return;
    }

    // Save directly
    await saveBudgetItem(false);
  };

  // Save budget item (with optional template save)
  const saveBudgetItem = async (addToTemplate: boolean) => {
    try {
      // 1. Add to cost library if requested (renamed from templates to items)
      if (addToTemplate && isCustomItem) {
        const response = await fetch('/api/unit-costs/items/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category_id: categoryL1Id,
            item_name: itemDescription,
            source: vendorName || null,
            typical_mid_value: parseFloat(rate) || null,
            default_uom_code: uom,
            project_type_code: 'LAND', // TODO: Get from project config
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Failed to save to cost library:', errorData);
          throw new Error(errorData.error || errorData.message || 'Failed to save to cost library');
        }
      }

      // 2. Save budget item
      const values: BudgetItemFormValues = {
        fact_id: initialItem?.fact_id,
        project_id: projectId,
        division_id: projectScopeSelected ? null : divisionId ?? null,
        category_l1_id: categoryL1Id,
        category_l2_id: categoryL2Id,
        category_l3_id: categoryL3Id,
        category_l4_id: categoryL4Id,
        vendor_name: vendorName || null,
        notes: itemDescription,
        qty: parseFloat(quantity) || null,
        rate: parseFloat(rate) || null,
        amount: total,
        uom_code: uom,
        start_period: parseInt(startPeriod) || null,
        periods: parseInt(periods) || null,
        end_period: endPeriod,
        escalation_rate: escalationRate !== '' ? parseFloat(escalationRate) : null,
        contingency_pct: contingencyPct !== '' ? parseFloat(contingencyPct) : null,
        timing_method: timingMethod || null,
        start_date: startDate || null,
        end_date: endDate || null,
        funding_id: fundingId !== '' ? Number(fundingId) : null,
        curve_id: curveId !== '' ? Number(curveId) : null,
        milestone_id: milestoneId !== '' ? Number(milestoneId) : null,
        cf_start_flag: cashFlowStartFlag,
      };

      await onSave(values);
      setShowConfirmation(false);
      onClose();
    } catch (err) {
      console.error('Error saving budget item:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save budget item';
      setError(`Failed to save budget item: ${errorMessage}`);
    }
  };

  return (
    <>
      {/* Main Modal */}
      <CModal visible={open} onClose={onClose} size="xl" backdrop="static">
        <CModalHeader>
          <CModalTitle>{mode === 'create' ? 'Add' : 'Edit'} Budget Item</CModalTitle>
        </CModalHeader>

        <CModalBody>
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <CRow className="mb-3">
            <CCol md={4} style={{ minWidth: '260px' }}>
              <CFormLabel htmlFor="container">{containerLabel} *</CFormLabel>
              <CFormSelect
                id="container"
                value={projectScopeSelected ? 'PROJECT' : (divisionId ?? '')}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'PROJECT') {
                    setProjectScopeSelected(true);
                    setContainerId(null);
                  } else if (value === '') {
                    setProjectScopeSelected(false);
                    setContainerId(null);
                  } else {
                    setProjectScopeSelected(false);
                    setContainerId(parseInt(value, 10));
                  }
                }}
                style={{ color: projectScopeSelected || divisionId ? 'inherit' : '#6c757d' }}
              >
                <option value="" style={{ color: '#6c757d' }}>Select Scope</option>
                <option value="PROJECT">Project-Wide</option>
                {containerOptions.map((opt) => (
                  <option key={opt.division_id} value={opt.division_id}>
                    {opt.display_name}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
          </CRow>

          <CRow className="mb-3 g-3 align-items-end">
            <CCol md={3}>
              <CFormLabel htmlFor="stage">Stage *</CFormLabel>
              <CFormSelect
                id="stage"
                value={selectedActivity}
                onChange={(e) => {
                  const stage = e.target.value;
                  console.log('[Stage onChange] Selected:', stage);
                  setSelectedActivity(stage);
                  setCategoryL1Id(null);
                  setCategoryL2Id(null);
                  setCategoryL3Id(null);
                  setCategoryL4Id(null);
                }}
                disabled={stageLoading || mode === 'edit'}
                required
              >
                <option value="">-- Select Stage --</option>
                {stageOptions.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </CFormSelect>
              {stageError && (
                <small className="text-danger d-block mt-1">
                  {stageError?.message || 'Unable to load stages'}
                </small>
              )}
            </CCol>
            <CCol md={3}>
              <CFormLabel htmlFor="category">Category *</CFormLabel>
              <CFormSelect
                id="category"
                value={categoryL1Id || ''}
                onChange={(e) => {
                  const next = e.target.value ? parseInt(e.target.value, 10) : null;
                  setCategoryL1Id(next);
                  setCategoryL2Id(null);
                  setCategoryL3Id(null);
                  setCategoryL4Id(null);
                }}
                disabled={!selectedActivity || mode === 'edit'}
                required
              >
                <option value="">-- Select Category --</option>
                {level1Options.map((category) => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.name}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol md={6}>
              <CFormLabel htmlFor="item">Item Description *</CFormLabel>
              <CFormInput
                id="item"
                list="items-list"
                value={itemDescription}
                onChange={handleItemDescriptionChange}
                placeholder="Select or type item..."
                required
              />
              <datalist id="items-list">
                {templates.map((template) => (
                  <option key={template.template_id} value={template.item_name} />
                ))}
              </datalist>
              {templates.length > 0 && (
                <small className="text-muted">
                  {templates.length} template{templates.length !== 1 ? 's' : ''} available
                </small>
              )}
            </CCol>
          </CRow>

          <CRow className="align-items-end g-2 mb-2">
            <CCol xs={6} sm={4} md={2}>
              <CFormLabel htmlFor="qty" className="w-100 text-center">Quantity</CFormLabel>
              <CFormInput
                type="number"
                id="qty"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                step="0.01"
                placeholder="0"
                className="text-center mx-auto"
                style={{
                  width: '7.2ch',
                  MozAppearance: 'textfield' as const,
                  WebkitAppearance: 'none' as const,
                  appearance: 'textfield' as const,
                } as React.CSSProperties}
                onWheel={(e) => e.currentTarget.blur()}
              />
            </CCol>
            <CCol xs={6} sm={4} md={2}>
              <CFormLabel htmlFor="uom" className="w-100 text-center">UOM</CFormLabel>
              <UOMSelect
                context="budget_cost"
                value={uom}
                onChange={setUom}
                className="w-100"
              />
            </CCol>
            <CCol xs={6} sm={4} md={2}>
              <CFormLabel htmlFor="rate" className="w-100 text-end">$/Unit</CFormLabel>
              <CFormInput
                type="number"
                id="rate"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                step="0.01"
                placeholder="0.00"
                className="text-end"
                style={{
                  width: '9.6ch',
                  marginLeft: 'auto',
                  MozAppearance: 'textfield' as const,
                  WebkitAppearance: 'none' as const,
                  appearance: 'textfield' as const,
                } as React.CSSProperties}
                onWheel={(e) => e.currentTarget.blur()}
              />
            </CCol>
            <CCol xs={6} sm={4} md={3}>
              <CFormLabel className="w-100 text-end">Total</CFormLabel>
              <CFormInput
                value={totalDisplay}
                readOnly
                className="text-end bg-light"
                style={{
                  width: '14.4ch',
                  marginLeft: 'auto'
                }}
              />
            </CCol>
          </CRow>

          {(showStandardFields || showDetailFields) && (
            <CAccordion activeItemKey={accordionActiveItems} className="mt-3">
              {showStandardFields && (
                <CAccordionItem itemKey="standard">
                  <CAccordionHeader>Standard Fields</CAccordionHeader>
                  <CAccordionBody>
                    <CRow className="g-3 mb-3">
                      <CCol md={6}>
                        <CFormLabel>Subcategory (Level 3)</CFormLabel>
                        <CFormSelect
                          value={categoryL3Id || ''}
                          onChange={(e) => {
                            const next = e.target.value ? parseInt(e.target.value, 10) : null;
                            setCategoryL3Id(next);
                            setCategoryL4Id(null);
                          }}
                          disabled={!categoryL2Id || mode === 'edit'}
                        >
                          <option value="">Select Subcategory...</option>
                          {level3Options.map((category) => (
                            <option key={category.category_id} value={category.category_id}>
                              {category.name}
                            </option>
                          ))}
                        </CFormSelect>
                      </CCol>
                      <CCol md={6}>
                        <CFormLabel>Detail Category (Level 4)</CFormLabel>
                        <CFormSelect
                          value={categoryL4Id || ''}
                          onChange={(e) => {
                            const next = e.target.value ? parseInt(e.target.value, 10) : null;
                            setCategoryL4Id(next);
                          }}
                          disabled={!categoryL3Id || mode === 'edit'}
                        >
                          <option value="">Select Detail...</option>
                          {level4Options.map((category) => (
                            <option key={category.category_id} value={category.category_id}>
                              {category.name}
                            </option>
                          ))}
                        </CFormSelect>
                      </CCol>
                    </CRow>

                    <CRow className="g-3 mb-3">
                      <CCol md={4}>
                        <CFormLabel htmlFor="start-period">Start Period</CFormLabel>
                        <CFormInput
                          type="number"
                          id="start-period"
                          value={startPeriod}
                          onChange={(e) => setStartPeriod(e.target.value)}
                          placeholder="1"
                          min="1"
                        />
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel htmlFor="duration">Duration (Periods)</CFormLabel>
                        <CFormInput
                          type="number"
                          id="duration"
                          value={periods}
                          onChange={(e) => setPeriods(e.target.value)}
                          placeholder="12"
                          min="1"
                        />
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel>End Period</CFormLabel>
                        <CFormInput value={endPeriod !== null ? endPeriod.toString() : ''} readOnly className="bg-light" />
                      </CCol>
                    </CRow>

                    <CRow className="g-3 mb-3">
                      <CCol md={4}>
                        <CFormLabel htmlFor="vendor">Vendor / Source</CFormLabel>
                        <CFormInput
                          id="vendor"
                          value={vendorName}
                          onChange={(e) => setVendorName(e.target.value)}
                          placeholder="Enter vendor or source"
                        />
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel htmlFor="timing-method">Timing Method</CFormLabel>
                        <CFormInput
                          id="timing-method"
                          value={timingMethod}
                          onChange={(e) => setTimingMethod(e.target.value)}
                          placeholder="Curve / rule"
                        />
                      </CCol>
                      <CCol md={2}>
                        <CFormLabel htmlFor="escalation">Escalation %</CFormLabel>
                        <CFormInput
                          type="number"
                          id="escalation"
                          value={escalationRate}
                          onChange={(e) => setEscalationRate(e.target.value)}
                          placeholder="0"
                          step="0.01"
                        />
                      </CCol>
                      <CCol md={2}>
                        <CFormLabel htmlFor="contingency">Contingency %</CFormLabel>
                        <CFormInput
                          type="number"
                          id="contingency"
                          value={contingencyPct}
                          onChange={(e) => setContingencyPct(e.target.value)}
                          placeholder="0"
                          step="0.01"
                        />
                      </CCol>
                    </CRow>
                  </CAccordionBody>
                </CAccordionItem>
              )}

              {showDetailFields && (
                <CAccordionItem itemKey="detail">
                  <CAccordionHeader>Detail Fields</CAccordionHeader>
                  <CAccordionBody>
                    <CRow className="g-3 mb-3">
                      <CCol md={6}>
                        <CFormLabel htmlFor="start-date">Start Date</CFormLabel>
                        <CFormInput
                          type="date"
                          id="start-date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </CCol>
                      <CCol md={6}>
                        <CFormLabel htmlFor="end-date">End Date</CFormLabel>
                        <CFormInput
                          type="date"
                          id="end-date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </CCol>
                    </CRow>

                    <CRow className="g-3 mb-3">
                      <CCol md={4}>
                        <CFormLabel htmlFor="funding">Funding ID</CFormLabel>
                        <CFormInput
                          type="number"
                          id="funding"
                          value={fundingId}
                          onChange={(e) => setFundingId(e.target.value)}
                          placeholder="0"
                        />
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel htmlFor="curve">Curve ID</CFormLabel>
                        <CFormInput
                          type="number"
                          id="curve"
                          value={curveId}
                          onChange={(e) => setCurveId(e.target.value)}
                          placeholder="0"
                        />
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel htmlFor="milestone">Milestone ID</CFormLabel>
                        <CFormInput
                          type="number"
                          id="milestone"
                          value={milestoneId}
                          onChange={(e) => setMilestoneId(e.target.value)}
                          placeholder="0"
                        />
                      </CCol>
                    </CRow>

                    <CFormCheck
                      id="cashflow-start"
                      label="Cash flow starts this period"
                      checked={cashFlowStartFlag}
                      onChange={(e) => setCashFlowStartFlag(e.target.checked)}
                    />
                  </CAccordionBody>
                </CAccordionItem>
              )}
            </CAccordion>
          )}
        </CModalBody>

        <CModalFooter>
          {mode === 'edit' && onDelete && (
            <CButton color="danger" variant="outline" onClick={onDelete} className="me-auto">
              Delete
            </CButton>
          )}
          <CButton color="secondary" onClick={onClose}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleSave}>
            Save
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Confirmation Modal for Custom Item */}
      <CModal
        visible={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        size="sm"
        backdrop="static"
      >
        <CModalHeader>
          <CModalTitle>Save to Cost Library?</CModalTitle>
        </CModalHeader>

        <CModalBody>
          <p>Save "{itemDescription}" to cost library for future use?</p>
          <dl className="row mb-0">
            <dt className="col-sm-5">Quantity:</dt>
            <dd className="col-sm-7">{quantity || '0'} {uom}</dd>

            <dt className="col-sm-5">Vendor:</dt>
            <dd className="col-sm-7">{vendorName || '(none)'}</dd>

            <dt className="col-sm-5">Default Rate:</dt>
            <dd className="col-sm-7">
              ${rate} / {uom}
            </dd>
          </dl>
        </CModalBody>

        <CModalFooter>
          <CButton
            color="secondary"
            onClick={async () => {
              await saveBudgetItem(false);
            }}
          >
            Skip
          </CButton>
          <CButton
            color="primary"
            onClick={async () => {
              await saveBudgetItem(true);
            }}
          >
            Save to Cost Library
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  );
}
