'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type CellContext,
  type ColumnDef,
  type PaginationState,
  type SortingState,
  useReactTable
} from '@tanstack/react-table';
import clsx from 'clsx';
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import type {
  UnitCostCategoryReference,
  UnitCostTemplateSummary,
  UnitCostType
} from '@/types/benchmarks';

const COST_SCOPE = 'development';
const AUTO_SAVE_DELAY_MS = 500;
const DEFAULT_LOCATION = 'Maricopa, AZ';
const DEFAULT_SOURCE = 'Copper Nail Development';
const DEFAULT_PROJECT_TYPE = 'LAND';
const ALLOWED_UOMS: ReadonlyArray<string> = ['EA', 'LF', 'CY', 'SF', 'SY', 'LS', 'MO', 'DAY', '%'];
const ALLOWED_UOM_SET = new Set(ALLOWED_UOMS);

const COST_TYPE_TABS: Array<{ key: UnitCostType; label: string }> = [
  { key: 'hard', label: 'Hard' },
  { key: 'soft', label: 'Soft' },
  { key: 'deposit', label: 'Deposits' },
  { key: 'other', label: 'Other' }
];

const PROJECT_TYPE_OPTIONS = ['LAND'];

type EditableField =
  | 'item_name'
  | 'default_uom_code'
  | 'quantity'
  | 'typical_mid_value'
  | 'market_geography'
  | 'source'
  | 'as_of_date';

type TemplateRowState = UnitCostTemplateSummary & {
  rowKey: string;
  status: 'saved' | 'draft';
  savingFields: EditableField[];
  fieldErrors: Partial<Record<EditableField, string>>;
  rowError: string | null;
};

type TemplatesByCategory = Record<number, TemplateRowState[]>;

type UomOption = {
  value: string;
  label: string;
};

type TableMeta = {
  categoryId: number;
  activeCell: { rowKey: string; field: EditableField } | null;
  startEdit: (rowKey: string, field: EditableField) => void;
  clearActiveCell: () => void;
  onCommitField: (rowKey: string, field: EditableField, rawValue: string) => void;
  uomOptions: UomOption[];
};

async function fetchJSON<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const baseError =
      payload && typeof payload === 'object' && 'error' in payload
        ? (payload as { error: string }).error
        : response.statusText || 'Request failed';
    const details =
      payload && typeof payload === 'object' && 'details' in payload
        ? String((payload as { details: unknown }).details)
        : null;
    const message = details ? `${baseError}: ${details}` : baseError;
    throw new Error(typeof payload === 'string' ? payload : message);
  }
  return payload as T;
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${month}-${year}`;
  } catch {
    return '';
  }
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Number(value));
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function normalizeNumericInput(raw: string): number | null | typeof NaN {
  const trimmed = raw.replace(/[$,\s]/g, '');
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return Number.NaN;
  return parsed;
}

function normalizeFieldInput(field: EditableField, rawValue: string): string | number | null | typeof NaN {
  const trimmed = (rawValue ?? '').trim();
  switch (field) {
    case 'item_name':
      return trimmed;
    case 'default_uom_code':
      return trimmed.toUpperCase();
    case 'quantity':
      return normalizeNumericInput(trimmed);
    case 'typical_mid_value':
      return normalizeNumericInput(trimmed);
    case 'market_geography':
    case 'source':
      return trimmed ? trimmed : null;
    case 'as_of_date':
      return trimmed ? trimmed : null;
    default:
      return trimmed;
  }
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || a === undefined) {
    return b === null || b === undefined || b === '';
  }
  if (b === null || b === undefined) {
    return a === null || a === undefined || a === '';
  }
  if (typeof a === 'number' || typeof b === 'number') {
    const numA = Number(a);
    const numB = Number(b);
    if (Number.isNaN(numA) && Number.isNaN(numB)) return true;
    return numA === numB;
  }
  return String(a) === String(b);
}

function validateField(field: EditableField, value: string | number | null | typeof NaN): string | null {
  switch (field) {
    case 'item_name':
      if (!value || (typeof value === 'string' && !value.trim())) {
        return 'Item name is required.';
      }
      if (typeof value === 'string' && value.length > 200) {
        return 'Item name must be 200 characters or fewer.';
      }
      return null;
    case 'default_uom_code': {
      if (!value || (typeof value === 'string' && !value.trim())) {
        return 'Select a UOM.';
      }
      const upper = String(value).toUpperCase();
      if (!ALLOWED_UOM_SET.has(upper)) {
        return 'Choose a supported unit.';
      }
      return null;
    }
    case 'quantity':
      if (value === null) return null;
      if (typeof value !== 'number' || Number.isNaN(value)) {
        return 'Enter a numeric quantity.';
      }
      if (value < 0) {
        return 'Quantity must be zero or greater.';
      }
      return null;
    case 'typical_mid_value':
      if (value === null) return null;
      if (typeof value !== 'number' || Number.isNaN(value)) {
        return 'Enter a numeric value.';
      }
      if (value < 0) {
        return 'Value must be zero or greater.';
      }
      return null;
    case 'market_geography':
      if (!value) return null;
      if (typeof value === 'string' && value.length > 100) {
        return 'Location must be 100 characters or fewer.';
      }
      return null;
    case 'source':
      if (!value) return null;
      if (typeof value === 'string' && value.length > 200) {
        return 'Source must be 200 characters or fewer.';
      }
      return null;
    case 'as_of_date':
      if (!value) return null;
      if (typeof value !== 'string') {
        return 'Use YYYY-MM-DD format.';
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return 'Use YYYY-MM-DD format.';
      }
      const parsed = Date.parse(value);
      if (Number.isNaN(parsed)) {
        return 'Enter a valid date.';
      }
      return null;
    default:
      return null;
  }
}

function clearFieldError(
  errors: Partial<Record<EditableField, string>>,
  field: EditableField
): Partial<Record<EditableField, string>> {
  if (!(field in errors)) return errors;
  const next = { ...errors };
  delete next[field];
  return next;
}

function addSavingField(fields: EditableField[], field: EditableField): EditableField[] {
  if (fields.includes(field)) return fields;
  return [...fields, field];
}

function removeSavingField(fields: EditableField[], field: EditableField): EditableField[] {
  return fields.filter((item) => item !== field);
}

function hasRequiredFields(row: TemplateRowState): boolean {
  return Boolean(row.item_name && row.item_name.trim()) && Boolean(row.default_uom_code);
}

function mapServerRow(template: UnitCostTemplateSummary | Record<string, any>, fallbackCategoryName: string): TemplateRowState {
  const raw = template as Record<string, any>;
  const nested = (raw.template ?? raw.record ?? raw.fields ?? null) as Record<string, any> | null;
  const source = nested ? { ...nested, ...raw } : raw;
  const templateId =
    source.template_id ?? source.templateId ?? source.id ?? source.unit_cost_template_id ?? null;
  const categoryId =
    source.category_id ?? source.categoryId ?? source.category?.id ?? source.category ?? null;
  const categoryName =
    source.category_name ??
    source.categoryName ??
    source.category?.name ??
    fallbackCategoryName;
  const usageCount = source.usage_count ?? source.usageCount ?? 0;
  const defaultUom = source.default_uom_code ?? source.defaultUomCode ?? source.uom_code ?? '';
  const normalizedUom = typeof defaultUom === 'string' ? defaultUom.toUpperCase() : '';

  return {
    ...source,
    template_id: Number(templateId ?? -1),
    category_id: Number(categoryId ?? -1),
    category_name: categoryName,
    item_name: source.item_name ?? source.name ?? '',
    default_uom_code: normalizedUom,
    quantity:
      source.quantity !== null && source.quantity !== undefined
        ? Number(source.quantity)
        : null,
    typical_mid_value:
      source.typical_mid_value !== null && source.typical_mid_value !== undefined
        ? Number(source.typical_mid_value)
        : null,
    market_geography: source.market_geography ?? source.geography ?? source.location ?? null,
    source: source.source ?? source.data_source ?? null,
    as_of_date: source.as_of_date ?? source.asOfDate ?? null,
    project_type_code: source.project_type_code ?? source.projectTypeCode ?? DEFAULT_PROJECT_TYPE,
    usage_count: Number.isFinite(Number(usageCount)) ? Number(usageCount) : 0,
    last_used_date: source.last_used_date ?? source.lastUsedDate ?? null,
    has_benchmarks: Boolean(source.has_benchmarks ?? source.hasBenchmarks ?? false),
    created_from_ai: Boolean(source.created_from_ai ?? source.createdFromAi ?? false),
    created_from_project_id:
      source.created_from_project_id ?? source.createdFromProjectId ?? null,
    is_active: source.is_active ?? source.isActive ?? true,
    rowKey: templateId !== null ? String(templateId) : `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    status: 'saved',
    savingFields: [],
    fieldErrors: {},
    rowError: null
  };
}

function createDraftRow(category: UnitCostCategoryReference, projectType: string): TemplateRowState {
  const draftId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return {
    template_id: -Math.floor(Math.random() * 1_000_000) - 1,
    category_id: category.category_id,
    category_name: category.category_name,
    item_name: '',
    default_uom_code: 'EA',
    quantity: null,
    typical_mid_value: null,
    market_geography: DEFAULT_LOCATION,
    source: DEFAULT_SOURCE,
    as_of_date: new Date().toISOString().slice(0, 10),
    project_type_code: projectType || DEFAULT_PROJECT_TYPE,
    usage_count: 0,
    last_used_date: null,
    has_benchmarks: false,
    created_from_ai: false,
    created_from_project_id: null,
    is_active: true,
    rowKey: draftId,
    status: 'draft',
    savingFields: [],
    fieldErrors: {
      item_name: 'Item name is required.'
    },
    rowError: null
  };
}

function buildCreatePayload(row: TemplateRowState) {
  return {
    category_id: row.category_id,
    item_name: row.item_name.trim(),
    default_uom_code: row.default_uom_code,
    quantity: row.quantity === null ? null : Number(row.quantity),
    typical_mid_value: row.typical_mid_value === null ? null : Number(row.typical_mid_value),
    market_geography: row.market_geography ? row.market_geography : null,
    source: row.source ? row.source : null,
    as_of_date: row.as_of_date ? row.as_of_date : null,
    project_type_code: row.project_type_code || DEFAULT_PROJECT_TYPE
  };
}

function buildPatchPayload(field: EditableField, value: string | number | null) {
  return { [field]: value };
}

function getDisplayValue(field: EditableField, row: TemplateRowState): string {
  switch (field) {
    case 'item_name':
      return row.item_name || '';
    case 'default_uom_code':
      return row.default_uom_code || '';
    case 'quantity':
      return formatNumber(row.quantity);
    case 'typical_mid_value':
      return formatCurrency(row.typical_mid_value);
    case 'market_geography':
      return row.market_geography || '';
    case 'source':
      return row.source || '';
    case 'as_of_date':
      return formatDate(row.as_of_date);
    default:
      return '';
  }
}

function toInputString(field: EditableField, row: TemplateRowState): string {
  const value = row[field];
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    if (field === 'quantity') return String(value);
    if (field === 'typical_mid_value') return String(value);
  }
  return String(value);
}

export default function UnitCostsPanel() {
  const [categories, setCategories] = useState<UnitCostCategoryReference[]>([]);
  const [activeCostType, setActiveCostType] = useState<UnitCostType>('hard');
  const [projectTypeFilter, setProjectTypeFilter] = useState<string>(DEFAULT_PROJECT_TYPE);
  const [openCategories, setOpenCategories] = useState<number[]>([]);
  const [templatesByCategory, setTemplatesByCategory] = useState<TemplatesByCategory>({});
  const [templateLoading, setTemplateLoading] = useState<Record<number, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uomOptions, setUomOptions] = useState<UomOption[]>([]);
  const [visibleColumns, setVisibleColumns] = useState({
    quantity: false,
    location: false,
    source: false
  });
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const templatesByCategoryRef = useRef<TemplatesByCategory>({});

  const loadCategoriesData = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams({ lifecycle_stage: 'Development' });
      if (projectTypeFilter) {
        params.set('project_type_code', projectTypeFilter);
      }
      const payload = await fetchJSON<{ categories?: UnitCostCategoryReference[] } | UnitCostCategoryReference[]>(
        `/api/unit-costs/categories?${params.toString()}`
      );
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.categories)
          ? payload.categories
          : [];
      setCategories(list);
    } catch (err) {
      console.error('Failed to load unit cost categories', err);
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    }
  }, [projectTypeFilter]);

  useEffect(() => {
    void loadCategoriesData();
    setOpenCategories([]);
    setTemplatesByCategory({});
  }, [projectTypeFilter, loadCategoriesData]);

  useEffect(() => {
    const fetchUoms = async () => {
      try {
        const response = await fetchJSON<Array<{ code: string; label: string }>>('/api/measures?systemOnly=true');
        const filtered = response
          .filter((item) => ALLOWED_UOM_SET.has(item.code.toUpperCase()))
          .map<UomOption>((item) => ({
            value: item.code.toUpperCase(),
            label: item.code.toUpperCase()
          }));
        const deduped = ALLOWED_UOMS.filter((code) => filtered.some((option) => option.value === code)).map(
          (code) => ({
            value: code,
            label: code
          })
        );
        setUomOptions(deduped.length > 0 ? deduped : ALLOWED_UOMS.map((code) => ({ value: code, label: code })));
      } catch (err) {
        console.warn('Failed to load UOM options, falling back to defaults', err);
        setUomOptions(ALLOWED_UOMS.map((code) => ({ value: code, label: code })));
      }
    };
    void fetchUoms();
  }, []);

  const setCategoryRows = useCallback(
    (categoryId: number, updater: (rows: TemplateRowState[]) => TemplateRowState[]) => {
      setTemplatesByCategory((prev) => {
        const current = prev[categoryId] ?? [];
        const nextRows = updater([...current]);
        return { ...prev, [categoryId]: nextRows };
      });
    },
    []
  );

  useEffect(() => {
    templatesByCategoryRef.current = templatesByCategory;
  }, [templatesByCategory]);

  const loadTemplates = useCallback(
    async (categoryId: number, force = false) => {
      const cached = templatesByCategoryRef.current[categoryId];
      if (!force && cached && cached.length > 0) {
        return;
      }
      setTemplateLoading((prev) => ({ ...prev, [categoryId]: true }));
      try {
        const params = new URLSearchParams({ category_id: String(categoryId) });
        if (projectTypeFilter) params.set('project_type_code', projectTypeFilter);
        if (searchTerm.trim()) params.set('search', searchTerm.trim());
        const payload = await fetchJSON<unknown>(`/api/unit-costs/templates?${params.toString()}`);

        const extractTemplateEntries = (input: unknown): UnitCostTemplateSummary[] => {
          const visited = new Set<unknown>();
          const queue: unknown[] = [input];
          const results: UnitCostTemplateSummary[] = [];

          const looksLikeTemplate = (entry: unknown): entry is Record<string, unknown> =>
            Boolean(
              entry &&
              typeof entry === 'object' &&
              ('template_id' in entry ||
                'templateId' in entry ||
                'unit_cost_template_id' in entry ||
                'item_name' in entry ||
                'itemName' in entry ||
                'default_uom_code' in entry ||
                'defaultUomCode' in entry ||
                'template' in entry)
            );

          while (queue.length > 0) {
            const value = queue.shift();
            if (value === undefined || value === null) continue;
            if (visited.has(value)) continue;

            if (Array.isArray(value)) {
              for (const entry of value) {
                queue.push(entry);
              }
              continue;
            }

            if (typeof value === 'object') {
              visited.add(value);
              if (looksLikeTemplate(value)) {
                results.push(value as UnitCostTemplateSummary);
              }
              for (const child of Object.values(value)) {
                queue.push(child);
              }
            }
          }

          return results;
        };

        const list = extractTemplateEntries(payload);

        if (list.length === 0) {
          console.warn('UnitCostsPanel: Unit cost fetch returned no entries', {
            categoryId,
            params: params.toString(),
            payload
          });
        }

        const normalized = list.map((template) =>
          mapServerRow(template as UnitCostTemplateSummary, categories.find((c) => c.category_id === categoryId)?.category_name ?? '')
        );
        setTemplatesByCategory((prev) => ({ ...prev, [categoryId]: normalized }));
      } catch (err) {
        console.error('Failed to load unit costs', err);
        setError(err instanceof Error ? err.message : 'Failed to load unit costs');
      } finally {
        setTemplateLoading((prev) => ({ ...prev, [categoryId]: false }));
      }
    },
    [searchTerm, projectTypeFilter, categories]
  );

  useEffect(() => {
    openCategories.forEach((categoryId) => {
      void loadTemplates(categoryId, true);
    });
  }, [searchTerm, projectTypeFilter, loadTemplates, openCategories]);

  const handleToggleCategory = useCallback(
    (category: UnitCostCategoryReference) => {
      setOpenCategories((prev) => {
        if (prev.includes(category.category_id)) {
          return prev.filter((id) => id !== category.category_id);
          } else {
          void loadTemplates(category.category_id);
          return [...prev, category.category_id];
        }
      });
    },
    [loadTemplates]
  );

  const handleAddRow = useCallback(
    (category: UnitCostCategoryReference) => {
      const draft = createDraftRow(category, projectTypeFilter);
      setCategoryRows(category.category_id, (rows) => [...rows, draft]);
    },
    [projectTypeFilter, setCategoryRows]
  );

  const handleDeleteRow = useCallback(
    async (categoryId: number, row: TemplateRowState) => {
      if (row.status === 'draft') {
        setCategoryRows(categoryId, (rows) => rows.filter((entry) => entry.rowKey !== row.rowKey));
        return;
      }
      const confirmed = window.confirm(`Archive unit cost "${row.item_name}"?`);
      if (!confirmed) return;
      try {
        await fetchJSON(`/api/unit-costs/templates/${row.template_id}`, { method: 'DELETE' });
        setCategoryRows(categoryId, (rows) => rows.filter((entry) => entry.rowKey !== row.rowKey));
        void loadCategoriesData();
      } catch (err) {
        console.error('Failed to delete unit cost', err);
        const message = err instanceof Error ? err.message : 'Failed to delete unit cost';
        setCategoryRows(categoryId, (rows) =>
          rows.map((entry) =>
            entry.rowKey === row.rowKey
              ? {
                  ...entry,
                  rowError: message,
                  fieldErrors: {
                    ...entry.fieldErrors,
                    item_name: message
                  },
                  savingFields: []
                }
              : entry
          )
        );
        setError(message);
      }
    },
    [setCategoryRows, loadCategoriesData]
  );

  const handleCommitField = useCallback(
    async (categoryId: number, rowKey: string, field: EditableField, rawValue: string) => {
      const rows = templatesByCategory[categoryId] ?? [];
      const currentRow = rows.find((row) => row.rowKey === rowKey);
      if (!currentRow) return;

      const normalizedInput = normalizeFieldInput(field, rawValue);
      const validationMessage = validateField(field, normalizedInput);

      if (validationMessage) {
        setCategoryRows(categoryId, (entries) =>
          entries.map((entry) =>
            entry.rowKey === rowKey
              ? {
                  ...entry,
                  fieldErrors: {
                    ...entry.fieldErrors,
                    [field]: validationMessage
                  },
                  savingFields: removeSavingField(entry.savingFields, field)
                }
              : entry
          )
        );
        return;
      }

      const normalizedValue =
        typeof normalizedInput === 'number' && Number.isNaN(normalizedInput) ? null : normalizedInput;

      if (valuesEqual(currentRow[field], normalizedValue)) {
        setCategoryRows(categoryId, (entries) =>
          entries.map((entry) =>
            entry.rowKey === rowKey
              ? {
                  ...entry,
                  fieldErrors: clearFieldError(entry.fieldErrors, field)
                }
              : entry
          )
        );
        return;
      }

      let updatedRowSnapshot: TemplateRowState | null = null;
      const previousRow = { ...currentRow };

      setCategoryRows(categoryId, (entries) =>
        entries.map((entry) => {
          if (entry.rowKey !== rowKey) return entry;
          const nextRow = {
            ...entry,
            [field]: normalizedValue,
            fieldErrors: clearFieldError(entry.fieldErrors, field),
            savingFields: addSavingField(entry.savingFields, field),
            rowError: null
          } as TemplateRowState;
          updatedRowSnapshot = nextRow;
          return nextRow;
        })
      );

      if (!updatedRowSnapshot) return;

      if (updatedRowSnapshot.status === 'draft') {
        if (!hasRequiredFields(updatedRowSnapshot)) {
          setCategoryRows(categoryId, (entries) =>
            entries.map((entry) =>
              entry.rowKey === rowKey
                ? { ...entry, savingFields: removeSavingField(entry.savingFields, field) }
                : entry
            )
          );
          return;
        }

        try {
          const payload = buildCreatePayload(updatedRowSnapshot);
          const created = await fetchJSON<UnitCostTemplateSummary>('/api/unit-costs/templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const normalizedRow = mapServerRow(created, updatedRowSnapshot.category_name);
          setCategoryRows(categoryId, (entries) =>
            entries.map((entry) => (entry.rowKey === rowKey ? normalizedRow : entry))
          );
          void loadCategoriesData();
          void loadTemplates(categoryId, true);
        } catch (err) {
          console.error('Failed to create unit cost', err);
          const message = err instanceof Error ? err.message : 'Failed to save unit cost';
          setCategoryRows(categoryId, (entries) =>
            entries.map((entry) =>
              entry.rowKey === rowKey
                ? {
                    ...previousRow,
                    rowError: message,
                    fieldErrors: {
                      ...previousRow.fieldErrors,
                      [field]: message
                    },
                    savingFields: removeSavingField(previousRow.savingFields, field)
                  }
                : entry
            )
          );
          setError(message);
        }
        return;
      }

      try {
        const payload = buildPatchPayload(field, normalizedValue);
        const updated = await fetchJSON<UnitCostTemplateSummary>(
          `/api/unit-costs/templates/${previousRow.template_id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }
        );
        const normalizedRow = mapServerRow(updated, updatedRowSnapshot.category_name);
        setCategoryRows(categoryId, (entries) =>
          entries.map((entry) => (entry.rowKey === rowKey ? normalizedRow : entry))
        );
      } catch (err) {
        console.error('Failed to update unit cost', err);
        const message = err instanceof Error ? err.message : 'Failed to update unit cost';
        setCategoryRows(categoryId, (entries) =>
          entries.map((entry) =>
            entry.rowKey === rowKey
              ? {
                  ...previousRow,
                  rowError: message,
                  fieldErrors: {
                    ...previousRow.fieldErrors,
                    [field]: message
                  },
                  savingFields: removeSavingField(previousRow.savingFields, field)
                }
              : entry
          )
        );
        setError(message);
      }
    },
    [templatesByCategory, setCategoryRows, loadCategoriesData, loadTemplates]
  );

  const filteredCategories = useMemo(() => {
    // Map cost type tabs to tag names
    const tagForCostType: Record<UnitCostType, string> = {
      hard: 'Hard',
      soft: 'Soft',
      deposit: 'Deposits',
      other: 'Other',
    };

    const requiredTag = tagForCostType[activeCostType];
    return categories.filter((category) => {
      const hasTags = Array.isArray(category.tags);
      const hasRequiredTag = hasTags && category.tags.includes(requiredTag);
      return hasRequiredTag;
    });
  }, [categories, activeCostType]);

  // Auto-load all categories when they change
  useEffect(() => {
    filteredCategories.forEach((category) => {
      void loadTemplates(category.category_id, true);
    });
  }, [filteredCategories, loadTemplates]);

  // Flatten all rows from all categories with category info
  const allRows = useMemo(() => {
    const rows: Array<TemplateRowState & { category_name: string; category_id: number }> = [];
    filteredCategories.forEach((category) => {
      const categoryRows = templatesByCategory[category.category_id] ?? [];
      categoryRows.forEach((row) => {
        rows.push({
          ...row,
          category_name: category.category_name,
          category_id: category.category_id
        });
      });
    });
    return rows;
  }, [filteredCategories, templatesByCategory]);

  // Filter rows by selected categories
  const displayedRows = useMemo(() => {
    if (selectedCategories.length === 0) {
      return allRows;
    }
    return allRows.filter((row) => selectedCategories.includes(row.category_id));
  }, [allRows, selectedCategories]);

  const toggleCategoryFilter = useCallback((categoryId: number) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      }
      return [...prev, categoryId];
    });
  }, []);

  return (
    <div style={{ color: 'var(--cui-body-color)' }}>
      {/* Breadcrumb Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b" style={{ borderColor: 'var(--cui-border-color)', backgroundColor: 'var(--cui-card-bg)' }}>
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
          <a href="/preferences" style={{ color: 'var(--cui-primary)', textDecoration: 'none' }}>Global Preferences</a>
          <span style={{ color: 'var(--cui-border-color)' }}>/</span>
          <span>Cost Library</span>
        </div>
      </div>

      {/* Title Header */}
      <header className="border-b px-6 py-4 flex flex-wrap items-center justify-between gap-4" style={{ borderColor: 'var(--cui-border-color)', backgroundColor: 'var(--cui-card-bg)' }}>
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--cui-body-color)' }}>Unit Cost Library · Development</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs uppercase tracking-wide" style={{ color: 'var(--cui-secondary-color)' }}>Project Type</label>
            <select
              value={projectTypeFilter}
              onChange={(event) => setProjectTypeFilter(event.target.value)}
              className="border rounded px-3 py-1 text-sm focus:outline-none focus:ring-1"
              style={{
                backgroundColor: 'var(--cui-body-bg)',
                borderColor: 'var(--cui-border-color)',
                color: 'var(--cui-body-color)'
              }}
            >
              {PROJECT_TYPE_OPTIONS.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="px-6 py-6 space-y-6" style={{ backgroundColor: 'var(--cui-card-bg)' }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex space-x-2">
            {COST_TYPE_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveCostType(tab.key)}
                className="rounded px-4 py-2 text-sm font-medium transition"
                style={{
                  backgroundColor: activeCostType === tab.key ? 'var(--cui-primary)' : 'var(--cui-tertiary-bg)',
                  color: activeCostType === tab.key ? 'white' : 'var(--cui-body-color)',
                }}
                onMouseEnter={(e) => {
                  if (activeCostType !== tab.key) {
                    e.currentTarget.style.backgroundColor = 'var(--cui-border-color)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeCostType !== tab.key) {
                    e.currentTarget.style.backgroundColor = 'var(--cui-tertiary-bg)';
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search unit costs…"
              className="w-72 rounded border px-3 py-2 text-sm focus:outline-none focus:ring-1"
              style={{
                backgroundColor: 'var(--cui-body-bg)',
                borderColor: 'var(--cui-border-color)',
                color: 'var(--cui-body-color)'
              }}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--cui-secondary-color)' }}>Filter Categories:</span>
            {filteredCategories
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((category) => {
                const isSelected = selectedCategories.includes(category.category_id);
                return (
                  <button
                    key={category.category_id}
                    onClick={() => toggleCategoryFilter(category.category_id)}
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition border"
                    style={{
                      backgroundColor: isSelected ? 'rgba(251, 191, 36, 0.1)' : 'var(--cui-tertiary-bg)',
                      color: isSelected ? '#f59e0b' : 'var(--cui-secondary-color)',
                      borderColor: isSelected ? '#f59e0b' : 'var(--cui-border-color)'
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: isSelected ? '#fbbf24' : 'var(--cui-border-color)' }} />
                    {category.category_name}
                  </button>
                );
              })}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--cui-secondary-color)' }}>Show Columns:</span>
            <button
              onClick={() => setVisibleColumns((prev) => ({ ...prev, quantity: !prev.quantity }))}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition border"
              style={{
                backgroundColor: visibleColumns.quantity ? 'rgba(59, 130, 246, 0.1)' : 'var(--cui-tertiary-bg)',
                color: visibleColumns.quantity ? '#3b82f6' : 'var(--cui-secondary-color)',
                borderColor: visibleColumns.quantity ? '#3b82f6' : 'var(--cui-border-color)'
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: visibleColumns.quantity ? '#60a5fa' : 'var(--cui-border-color)' }} />
              Qty
            </button>
            <button
              onClick={() => setVisibleColumns((prev) => ({ ...prev, location: !prev.location }))}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition border"
              style={{
                backgroundColor: visibleColumns.location ? 'rgba(34, 197, 94, 0.1)' : 'var(--cui-tertiary-bg)',
                color: visibleColumns.location ? '#22c55e' : 'var(--cui-secondary-color)',
                borderColor: visibleColumns.location ? '#22c55e' : 'var(--cui-border-color)'
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: visibleColumns.location ? '#4ade80' : 'var(--cui-border-color)' }} />
              Location
            </button>
            <button
              onClick={() => setVisibleColumns((prev) => ({ ...prev, source: !prev.source }))}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition border"
              style={{
                backgroundColor: visibleColumns.source ? 'rgba(168, 85, 247, 0.1)' : 'var(--cui-tertiary-bg)',
                color: visibleColumns.source ? '#a855f7' : 'var(--cui-secondary-color)',
                borderColor: visibleColumns.source ? '#a855f7' : 'var(--cui-border-color)'
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: visibleColumns.source ? '#c084fc' : 'var(--cui-border-color)' }} />
              Source
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded border px-4 py-3 text-sm" style={{ borderColor: 'var(--cui-danger)', backgroundColor: 'var(--cui-danger-bg)', color: 'var(--cui-danger)' }}>
            {error}
          </div>
        )}

        {filteredCategories.length === 0 ? (
          <div className="rounded border border-dashed border-slate-700 bg-slate-800/60 px-6 py-12 text-center text-slate-400">
            No categories available for this filter. Adjust the project type or seed additional data.
          </div>
        ) : (
          <UnifiedUnitCostTable
            rows={displayedRows}
            uomOptions={uomOptions}
            visibleColumns={visibleColumns}
            onCommitField={(rowKey, field, value) => {
              const row = displayedRows.find((r) => r.rowKey === rowKey);
              if (row) {
                handleCommitField(row.category_id, rowKey, field, value);
              }
            }}
            onDeleteRow={(row) => handleDeleteRow(row.category_id, row)}
          />
        )}
      </main>
    </div>
  );
}

interface UnifiedTableProps {
  rows: Array<TemplateRowState & { category_name: string; category_id: number }>;
  uomOptions: UomOption[];
  visibleColumns: { quantity: boolean; location: boolean; source: boolean };
  onCommitField: (rowKey: string, field: EditableField, rawValue: string) => void;
  onDeleteRow: (row: TemplateRowState) => void;
}

function UnifiedUnitCostTable({
  rows,
  uomOptions,
  visibleColumns,
  onCommitField,
  onDeleteRow
}: UnifiedTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
  const [activeCell, setActiveCell] = useState<{ rowKey: string; field: EditableField } | null>(null);

  const columns = useMemo<ColumnDef<TemplateRowState & { category_name: string }, unknown>[]>(() => {
    const configureEditable = (
      field: EditableField,
      header: string,
      size: number,
      type: 'text' | 'select' | 'number' | 'currency' | 'date',
      align: 'left' | 'center' | 'right' = 'left',
      meta?: Record<string, unknown>
    ): ColumnDef<TemplateRowState & { category_name: string }, unknown> => ({
      accessorKey: field,
      header,
      size,
      enableSorting: field !== 'market_geography' && field !== 'source',
      meta: { align },
      cell: (context) => (
        <EditableCell
          context={context as CellContext<TemplateRowState, unknown>}
          field={field}
          type={type}
          align={align}
          meta={meta}
        />
      )
    });

    const allColumns: ColumnDef<TemplateRowState & { category_name: string }, unknown>[] = [
      {
        accessorKey: 'category_name',
        header: () => <div className="text-left">Category</div>,
        size: 150,
        enableSorting: true,
        cell: ({ getValue }) => (
          <div className="px-1.5 py-0.5 text-sm text-slate-900">
            {String(getValue())}
          </div>
        )
      },
      {
        ...configureEditable('item_name', 'Item Name / Description', 350, 'text', 'left', { maxLength: 200, required: true }),
        header: () => <div className="text-left">Item Name / Description</div>
      },
      {
        accessorKey: 'default_uom_code',
        header: () => <div className="text-center">UOM</div>,
        size: 60,
        enableSorting: true,
        meta: { align: 'center' },
        cell: (context) => (
          <EditableSelectCell context={context as CellContext<TemplateRowState, unknown>} field="default_uom_code" options={uomOptions} required />
        )
      },
      ...(visibleColumns.quantity
        ? [{
            ...configureEditable('quantity', 'Qty', 70, 'number', 'right'),
            header: () => <div className="text-right">Qty</div>
          }]
        : []),
      {
        ...configureEditable('typical_mid_value', 'Price', 90, 'currency', 'right'),
        header: () => <div className="text-right">Price</div>
      },
      ...(visibleColumns.location
        ? [{
            ...configureEditable('market_geography', 'Location', 140, 'text', 'left', { placeholder: DEFAULT_LOCATION }),
            header: () => <div className="text-left">Location</div>
          }]
        : []),
      ...(visibleColumns.source
        ? [{
            ...configureEditable('source', 'Source', 140, 'text', 'left', { placeholder: DEFAULT_SOURCE }),
            header: () => <div className="text-left">Source</div>
          }]
        : []),
      {
        ...configureEditable('as_of_date', 'As of Date', 80, 'date', 'center'),
        header: () => <div className="text-center">As of Date</div>
      },
      {
        id: 'actions',
        header: '',
        size: 70,
        enableSorting: false,
        cell: ({ row, table }) => (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => {
                const meta = table.options.meta as TableMeta | undefined;
                meta?.startEdit(row.original.rowKey, 'item_name');
              }}
              className="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-300 text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-300"
              title="Edit row"
            >
              <Pencil size={12} />
            </button>
            <button
              type="button"
              onClick={() => onDeleteRow(row.original)}
              className="inline-flex h-6 w-6 items-center justify-center rounded border border-red-300 text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300"
              title="Archive row"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )
      }
    ];

    return allColumns;
  }, [uomOptions, onDeleteRow, visibleColumns]);

  const table = useReactTable<TemplateRowState & { category_name: string }>({
    data: rows,
    columns,
    state: {
      sorting,
      rowSelection,
      pagination
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    meta: {
      categoryId: 0,
      activeCell,
      startEdit: (rowKey: string, field: EditableField) => {
        setActiveCell({ rowKey, field });
      },
      clearActiveCell: () => {
        setActiveCell(null);
      },
      onCommitField: (rowKey: string, field: EditableField, rawValue: string) => {
        setActiveCell({ rowKey, field });
        onCommitField(rowKey, field, rawValue);
      },
      uomOptions
    } satisfies TableMeta
  });

  const totalPages = table.getPageCount();

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <div className="rounded border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
          No unit costs yet. Add line items to seed this category.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded border border-slate-700">
            <table className="min-w-full border-collapse bg-white">
              <thead className="sticky top-0 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="border border-slate-300 bg-slate-100 px-1.5 py-1 text-xs font-semibold text-slate-700"
                        style={{ width: header.column.getSize() }}
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={clsx(
                              header.column.getCanSort() ? 'cursor-pointer select-none' : ''
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="border border-slate-300 bg-white px-1.5 py-0.5 text-sm text-slate-900"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-slate-400">
              <div>
                Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  rows.length
                )}{' '}
                of {rows.length} items
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="rounded border border-slate-700 px-3 py-1 text-xs disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="rounded border border-slate-700 px-3 py-1 text-xs disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface CategoryTableProps {
  category: UnitCostCategoryReference;
  rows: TemplateRowState[];
  uomOptions: UomOption[];
  visibleColumns: { quantity: boolean; location: boolean; source: boolean };
  onAddRow: () => void;
  onCommitField: (rowKey: string, field: EditableField, rawValue: string) => void;
  onDeleteRow: (row: TemplateRowState) => void;
}

function UnitCostCategoryTable({
  category,
  rows,
  uomOptions,
  visibleColumns,
  onAddRow,
  onCommitField,
  onDeleteRow
}: CategoryTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
  const [activeCell, setActiveCell] = useState<{ rowKey: string; field: EditableField } | null>(null);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [rows.length]);

  const columns = useMemo<ColumnDef<TemplateRowState, unknown>[]>(() => {
    const configureEditable = (
      field: EditableField,
      header: string,
      size: number,
      type: 'text' | 'select' | 'number' | 'currency' | 'date',
      align: 'left' | 'center' | 'right' = 'left',
      meta?: Record<string, unknown>
    ): ColumnDef<TemplateRowState, unknown> => ({
      accessorKey: field,
      header,
      size,
      enableSorting: field !== 'market_geography' && field !== 'source',
      meta: { align },
      cell: (context) => (
        <EditableCell
          context={context}
          field={field}
          type={type}
          align={align}
          meta={meta}
        />
      )
    });

    const allColumns: ColumnDef<TemplateRowState, unknown>[] = [
      configureEditable('item_name', 'Item Name / Description', 400, 'text', 'left', { maxLength: 200, required: true }),
      {
        accessorKey: 'default_uom_code',
        header: () => <div className="text-center">UOM</div>,
        size: 60,
        enableSorting: true,
        meta: { align: 'center' },
        cell: (context) => (
          <EditableSelectCell context={context} field="default_uom_code" options={uomOptions} required />
        )
      },
      ...(visibleColumns.quantity
        ? [{
            ...configureEditable('quantity', 'Qty', 70, 'number', 'right'),
            header: () => <div className="text-right">Qty</div>
          }]
        : []),
      {
        ...configureEditable('typical_mid_value', 'Value', 90, 'currency', 'right'),
        header: () => <div className="text-right">Value</div>
      },
      ...(visibleColumns.location
        ? [configureEditable('market_geography', 'Location', 140, 'text', 'left', { placeholder: DEFAULT_LOCATION })]
        : []),
      ...(visibleColumns.source
        ? [configureEditable('source', 'Source', 140, 'text', 'left', { placeholder: DEFAULT_SOURCE })]
        : []),
      {
        ...configureEditable('as_of_date', 'As of Date', 80, 'date', 'center'),
        header: () => <div className="text-center">As of Date</div>
      },
      {
        id: 'actions',
        header: '',
        size: 70,
        enableSorting: false,
        cell: ({ row, table }) => (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => {
                const meta = table.options.meta as TableMeta | undefined;
                meta?.startEdit(row.original.rowKey, 'item_name');
              }}
              className="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-300 text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-300"
              title="Edit row"
            >
              <Pencil size={12} />
            </button>
            <button
              type="button"
              onClick={() => onDeleteRow(row.original)}
              className="inline-flex h-6 w-6 items-center justify-center rounded border border-red-300 text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300"
              title="Archive row"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )
      }
    ];

    return allColumns;
  }, [uomOptions, onDeleteRow, visibleColumns]);

  const table = useReactTable<TemplateRowState>({
    data: rows,
    columns,
    state: {
      sorting,
      rowSelection,
      pagination
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.rowKey,
    manualPagination: false,
    columnResizeMode: 'onChange',
    enableRowSelection: true,
    meta: {
      categoryId: category.category_id,
      activeCell,
      startEdit: (rowKey: string, field: EditableField) => setActiveCell({ rowKey, field }),
      clearActiveCell: () => setActiveCell(null),
      onCommitField: (rowKey: string, field: EditableField, rawValue: string) => {
        setActiveCell({ rowKey, field });
        onCommitField(rowKey, field, rawValue);
      },
      uomOptions
    } satisfies TableMeta
  });

  const totalPages = table.getPageCount();

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <div className="rounded border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
          No unit costs yet. Add line items to seed this category.
          <div className="mt-4">
            <button
              onClick={onAddRow}
              className="inline-flex items-center gap-2 rounded border border-blue-500 bg-blue-500 px-3 py-2 text-xs font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <Plus size={14} />
              Add Row
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-700">
          <table className="min-w-full border-collapse bg-white">
            <thead className="sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className="border border-slate-300 bg-slate-100 px-1.5 py-1 text-left text-xs font-semibold text-slate-700"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <tr className="hover:bg-blue-50/50">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="border border-slate-300 bg-white px-1.5 py-0.5 text-sm text-slate-900">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {row.original.rowError && (
                    <tr>
                      <td colSpan={table.getVisibleLeafColumns().length} className="border-x border-b border-slate-300 px-3 py-2">
                        <div className="rounded border border-red-500/50 bg-red-50 px-3 py-2 text-xs text-red-700">
                          {row.original.rowError}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-xs text-slate-700">
          <button
            className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100 disabled:opacity-40"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            First
          </button>
          <button
            className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100 disabled:opacity-40"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Prev
          </button>
          <span>
            Page {pagination.pageIndex + 1} of {totalPages}
          </span>
          <button
            className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100 disabled:opacity-40"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </button>
          <button
            className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100 disabled:opacity-40"
            onClick={() => table.setPageIndex(totalPages - 1)}
            disabled={!table.getCanNextPage()}
          >
            Last
          </button>
        </div>
      )}
    </div>
  );
}

function IndeterminateCheckbox({
  indeterminate,
  className = '',
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { indeterminate?: boolean }) {
  const ref = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = Boolean(indeterminate) && !rest.checked;
    }
  }, [ref, indeterminate, rest.checked]);

  return (
    <input
      type="checkbox"
      ref={ref}
      className={clsx(
        'h-4 w-4 rounded border border-slate-400 bg-white text-blue-600 focus:ring-blue-300',
        className
      )}
      {...rest}
    />
  );
}

interface EditableCellProps {
  context: CellContext<TemplateRowState, unknown>;
  field: EditableField;
  type: 'text' | 'number' | 'currency' | 'date';
  align?: 'left' | 'center' | 'right';
  meta?: Record<string, unknown>;
}

function EditableCell({ context, field, type, align = 'left', meta = {} }: EditableCellProps) {
  const { row, table } = context;
  const tableMeta = table.options.meta as TableMeta | undefined;
  const isActive =
    tableMeta?.activeCell?.rowKey === row.original.rowKey && tableMeta.activeCell.field === field;

  const [editing, setEditing] = useState<boolean>(Boolean(isActive));
  const [inputValue, setInputValue] = useState<string>(() => toInputString(field, row.original));
  const timeoutRef = React.useRef<number | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditing(Boolean(isActive));
    if (isActive) {
      setInputValue(toInputString(field, row.original));
    }
  }, [isActive, row.original, field]);

  useEffect(() => {
    if (!editing) return;
    const id = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(id);
  }, [editing]);

  useEffect(() => {
    if (!editing) {
      setInputValue(toInputString(field, row.original));
    }
  }, [row.original, field, editing]);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    []
  );

  const scheduleCommit = useCallback(
    (value: string) => {
      if (!tableMeta) return;
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        tableMeta.onCommitField(row.original.rowKey, field, value);
      }, AUTO_SAVE_DELAY_MS);
    },
    [tableMeta, row.original.rowKey, field]
  );

  const handleBlur = () => {
    scheduleCommit(inputValue);
    setEditing(false);
    tableMeta?.clearActiveCell();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      scheduleCommit(inputValue);
      setEditing(false);
      tableMeta?.clearActiveCell();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setInputValue(toInputString(field, row.original));
      setEditing(false);
      tableMeta?.clearActiveCell();
    }
  };

  const error = row.original.fieldErrors[field];
  const isSaving = row.original.savingFields.includes(field);
  const required = Boolean(meta.required);
  const placeholder = typeof meta.placeholder === 'string' ? meta.placeholder : undefined;
  const maxLength = typeof meta.maxLength === 'number' ? meta.maxLength : undefined;

  const displayValue = getDisplayValue(field, row.original) || (placeholder ?? '—');
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  return (
    <div className="flex flex-col">
      {editing ? (
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          maxLength={maxLength}
          placeholder={placeholder}
          className={clsx(
            'w-full border bg-white px-1.5 py-0.5 text-sm text-slate-900 focus:outline-none focus:ring-2',
            alignClass,
            error ? 'border-red-500 focus:ring-red-300' : 'border-blue-500 focus:ring-blue-300'
          )}
          inputMode={type === 'number' || type === 'currency' ? 'decimal' : undefined}
          type={type === 'date' ? 'date' : 'text'}
        />
      ) : (
        <div
          className={clsx(
            'w-full px-1.5 py-0.5 text-sm',
            alignClass,
            error ? 'text-red-600' : 'text-slate-900',
            (required && !row.original[field]) ? 'font-medium' : ''
          )}
        >
          {displayValue || (
            <span className={clsx('text-slate-400', required ? 'italic' : undefined)}>
              {required ? 'Required' : '—'}
            </span>
          )}
        </div>
      )}
      {(error || isSaving) && (
        <div className="flex items-center justify-between px-1.5">
          {error && <span className="text-xs text-red-600">{error}</span>}
          {isSaving && <span className="text-xs text-green-600">Saving…</span>}
        </div>
      )}
    </div>
  );
}

interface EditableSelectCellProps {
  context: CellContext<TemplateRowState, unknown>;
  field: EditableField;
  options: UomOption[];
  required?: boolean;
}

function EditableSelectCell({ context, field, options, required = false }: EditableSelectCellProps) {
  const { row, table } = context;
  const tableMeta = table.options.meta as TableMeta | undefined;
  const isActive =
    tableMeta?.activeCell?.rowKey === row.original.rowKey && tableMeta.activeCell.field === field;

  const [editing, setEditing] = useState<boolean>(Boolean(isActive));
  const [value, setValue] = useState<string>(() => (row.original[field] as string) ?? '');
  const timeoutRef = React.useRef<number | null>(null);
  const selectRef = React.useRef<HTMLSelectElement>(null);

  useEffect(() => {
    setEditing(Boolean(isActive));
    if (isActive) {
      setValue((row.original[field] as string) ?? '');
    }
  }, [isActive, row.original, field]);

  useEffect(() => {
    if (!editing) {
      setValue((row.original[field] as string) ?? '');
    }
  }, [row.original, field, editing]);

  useEffect(() => {
    if (editing) {
      const id = window.setTimeout(() => {
        selectRef.current?.focus();
      }, 0);
      return () => window.clearTimeout(id);
    }
  }, [editing]);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    []
  );

  const error = row.original.fieldErrors[field];
  const isSaving = row.original.savingFields.includes(field);

  const scheduleCommit = (next: string) => {
    if (!tableMeta) return;
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      tableMeta.onCommitField(row.original.rowKey, field, next);
    }, AUTO_SAVE_DELAY_MS);
  };

  const handleBlur = () => {
    scheduleCommit(value);
    setEditing(false);
    tableMeta?.clearActiveCell();
  };

  const displayValue = value || '—';

  return (
    <div className="flex flex-col">
      {editing ? (
        <select
          ref={selectRef}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            scheduleCommit(event.target.value);
          }}
          onBlur={handleBlur}
          className={clsx(
            'w-full border bg-white px-1.5 py-0.5 text-center text-sm text-slate-900 focus:outline-none focus:ring-2',
            error ? 'border-red-500 focus:ring-red-300' : 'border-blue-500 focus:ring-blue-300'
          )}
        >
          {!required && <option value="">—</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <div className="w-full px-1.5 py-0.5 text-center text-sm text-slate-900">
          {displayValue}
        </div>
      )}
      {(error || isSaving) && (
        <div className="flex items-center justify-between px-1.5">
          {error && <span className="text-xs text-red-600">{error}</span>}
          {isSaving && <span className="text-xs text-green-600">Saving…</span>}
        </div>
      )}
    </div>
  );
}
