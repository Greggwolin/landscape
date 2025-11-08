// Budget Item Modal V2 - Compact 3-row layout with template integration
// Date: 2025-11-07
'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  CButton,
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
import CategoryCascadingDropdown from './CategoryCascadingDropdown';
import type { BudgetItem } from './ColumnDefinitions';
import type { UnitCostTemplateSummary } from '@/types/benchmarks';

export interface BudgetItemFormValues {
  fact_id?: number;
  project_id?: number;
  container_id?: number | null;
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
}

interface BudgetItemModalV2Props {
  open: boolean;
  mode: 'create' | 'edit';
  initialItem?: BudgetItem | null;
  projectId: number;
  onClose: () => void;
  onSave: (values: BudgetItemFormValues) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}

interface Container {
  container_id: number;
  display_name: string;
  container_level: number;
  parent_container_id: number | null;
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

const uomOptions = [
  { value: 'EA', label: 'Each' },
  { value: 'AC', label: 'Acre' },
  { value: 'SF', label: 'Square Feet' },
  { value: 'SY', label: 'Square Yards' },
  { value: 'LF', label: 'Linear Feet' },
  { value: 'CY', label: 'Cubic Yards' },
  { value: 'LOT', label: 'Lot' },
  { value: 'LS', label: 'Lump Sum' },
  { value: 'MO', label: 'Month' },
];

export default function BudgetItemModalV2({
  open,
  mode,
  initialItem,
  projectId,
  onClose,
  onSave,
  onDelete,
}: BudgetItemModalV2Props) {
  // Form state
  const [containerId, setContainerId] = useState<number | null>(null);
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

  // Fetched data
  const [containers, setContainers] = useState<Container[]>([]);
  const [projectConfig, setProjectConfig] = useState<ProjectConfig | null>(null);
  const [templates, setTemplates] = useState<UnitCostTemplateSummary[]>([]);
  const [error, setError] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Calculated fields
  const total = useMemo(() => {
    const q = parseFloat(quantity) || 0;
    const r = parseFloat(rate) || 0;
    return q * r;
  }, [quantity, rate]);

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
      .filter(c => c.container_level === 1 || c.container_level === 2)
      .sort((a, b) => {
        if (a.container_level !== b.container_level) {
          return a.container_level - b.container_level;
        }
        // Natural sort for names like "1.1", "1.2", "2.1"
        return a.display_name.localeCompare(b.display_name, undefined, { numeric: true });
      })
      .map(container => {
        const levelLabel = getLevelLabel(container.container_level);
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
          container_id: container.container_id,
          display_name: finalName,
          level: container.container_level,
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
                container_id: node.container_id,
                display_name: node.display_name,
                container_level: node.container_level,
                parent_container_id: node.parent_container_id || null,
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

  // Load templates when category changes
  useEffect(() => {
    if (categoryL1Id) {
      fetch(`/api/unit-costs/templates?category_id=${categoryL1Id}`)
        .then(r => r.json())
        .then(data => {
          const templates = data.templates || data.data || [];
          setTemplates(templates);
        })
        .catch(err => console.error('Error loading templates:', err));
    } else {
      setTemplates([]);
    }
  }, [categoryL1Id]);

  // Initialize form from initialItem
  useEffect(() => {
    if (open && initialItem && mode === 'edit') {
      setContainerId(initialItem.container_id || null);
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
    } else if (open && mode === 'create') {
      // Reset form
      setContainerId(null);
      setCategoryL1Id(null);
      setCategoryL2Id(null);
      setCategoryL3Id(null);
      setCategoryL4Id(null);
      setVendorName('');
      setItemDescription('');
      setQuantity('');
      setUom('EA');
      setRate('');
      setStartPeriod('');
      setPeriods('');
    }
    setError('');
  }, [open, initialItem, mode]);

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
    if (!containerId) {
      setError('Container is required');
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
      // 1. Add to template if requested
      if (addToTemplate && isCustomItem) {
        await fetch('/api/unit-costs/templates', {
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
      }

      // 2. Save budget item
      const values: BudgetItemFormValues = {
        fact_id: initialItem?.fact_id,
        project_id: projectId,
        container_id: containerId,
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
      };

      await onSave(values);
      setShowConfirmation(false);
      onClose();
    } catch (err) {
      console.error('Error saving budget item:', err);
      setError('Failed to save budget item');
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

          {/* Row 1: Container & Category */}
          <CRow className="mb-3">
            <CCol md={2}>
              <CFormLabel htmlFor="container">{containerLabel} *</CFormLabel>
              <CFormSelect
                id="container"
                value={containerId || ''}
                onChange={(e) => setContainerId(parseInt(e.target.value) || null)}
                required
                style={{ color: containerId ? 'inherit' : '#6c757d' }}
              >
                <option value="" style={{ color: '#6c757d' }}>Select Scope</option>
                <option value="0">Project-Wide</option>
                {containerOptions.map((opt) => (
                  <option key={opt.container_id} value={opt.container_id}>
                    {opt.display_name}
                  </option>
                ))}
              </CFormSelect>
            </CCol>

            <CCol md={2}>
              <CFormLabel htmlFor="category">Category *</CFormLabel>
              <CategoryCascadingDropdown
                projectId={projectId}
                value={{
                  level_1: categoryL1Id,
                  level_2: categoryL2Id,
                  level_3: categoryL3Id,
                  level_4: categoryL4Id,
                }}
                onChange={(value) => {
                  setCategoryL1Id(value.level_1 || null);
                  setCategoryL2Id(value.level_2 || null);
                  setCategoryL3Id(value.level_3 || null);
                  setCategoryL4Id(value.level_4 || null);
                }}
                complexityMode="standard"
                disabled={mode === 'edit'}
                required
                hideLabels={true}
              />
            </CCol>
          </CRow>

          {/* Row 2: Vendor & Item Description */}
          <CRow className="mb-3">
            <CCol md={4}>
              <CFormLabel htmlFor="vendor">Vendor / Source</CFormLabel>
              <CFormInput
                id="vendor"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="Enter vendor or source"
              />
            </CCol>

            <CCol md={8}>
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

          {/* Row 3: Quantities & Timing */}
          <CRow className="align-items-end">
            <CCol md={2}>
              <CFormLabel htmlFor="qty">Quantity</CFormLabel>
              <CFormInput
                type="number"
                id="qty"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                step="0.01"
                placeholder="0"
              />
            </CCol>

            <CCol md={1}>
              <CFormLabel htmlFor="uom">UOM</CFormLabel>
              <CFormSelect
                id="uom"
                value={uom}
                onChange={(e) => setUom(e.target.value)}
                style={{ fontSize: '0.875rem' }}
              >
                {uomOptions.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.value}
                  </option>
                ))}
              </CFormSelect>
            </CCol>

            <CCol md={2}>
              <CFormLabel htmlFor="rate">$/Unit</CFormLabel>
              <CFormInput
                type="number"
                id="rate"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                step="0.01"
                placeholder="0.00"
              />
            </CCol>

            <CCol md={2}>
              <CFormLabel>Total</CFormLabel>
              <CFormInput
                value={`$${total.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`}
                disabled
                className="bg-light"
              />
            </CCol>

            <CCol md={2}>
              <CFormLabel htmlFor="start">Start</CFormLabel>
              <CFormInput
                type="number"
                id="start"
                value={startPeriod}
                onChange={(e) => setStartPeriod(e.target.value)}
                placeholder="1"
                min="1"
              />
            </CCol>

            <CCol md={2}>
              <CFormLabel htmlFor="periods">Periods</CFormLabel>
              <CFormInput
                type="number"
                id="periods"
                value={periods}
                onChange={(e) => setPeriods(e.target.value)}
                placeholder="12"
                min="1"
              />
            </CCol>

            <CCol md={1}>
              <CFormLabel>End</CFormLabel>
              <CFormInput
                value={endPeriod !== null ? endPeriod.toString() : ''}
                disabled
                className="bg-light"
              />
            </CCol>
          </CRow>
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
          <CModalTitle>Save to Template Database?</CModalTitle>
        </CModalHeader>

        <CModalBody>
          <p>Save "{itemDescription}" to template database for future use?</p>
          <dl className="row mb-0">
            <dt className="col-sm-4">Category:</dt>
            <dd className="col-sm-8">Level {categoryL1Id}</dd>

            <dt className="col-sm-4">Vendor:</dt>
            <dd className="col-sm-8">{vendorName || '(none)'}</dd>

            <dt className="col-sm-4">Default Rate:</dt>
            <dd className="col-sm-8">
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
            Save to Template
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  );
}
