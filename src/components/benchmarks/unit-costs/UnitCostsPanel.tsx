'use client';

import dynamic from 'next/dynamic';
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
export const DEFAULT_PROJECT_TYPE = 'LAND';
const ALLOWED_UOMS: ReadonlyArray<string> = ['EA', 'LF', 'CY', 'SF', 'SY', 'LS', 'MO', 'DAY', '%'];
const ALLOWED_UOM_SET = new Set(ALLOWED_UOMS);

const COST_TYPE_TABS: Array<{ key: UnitCostType; label: string }> = [
  { key: 'hard', label: 'Hard' },
  { key: 'soft', label: 'Soft' },
  { key: 'deposit', label: 'Deposits' },
  { key: 'other', label: 'Other' }
];

type EditableField =
  | 'category_id'
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
  editingRowKey: string | null;
  startEdit: (rowKey: string, field: EditableField) => void;
  clearActiveCell: () => void;
  setEditingRow: (rowKey: string | null, focusField?: EditableField) => void;
  onCommitField: (rowKey: string, field: EditableField, rawValue: string) => void;
  uomOptions: UomOption[];
};

type UnitCostsPanelProps = {
  projectTypeFilter: string;
};

const CATEGORY_COLOR_PALETTE = ['#2563EB', '#7C3AED', '#059669', '#DB2777', '#D97706', '#0EA5E9', '#F43F5E', '#14B8A6'];

const UnitCostCategoryManager = dynamic(
  () => import('@/app/admin/preferences/components/UnitCostCategoryManager'),
  { ssr: false }
);

function getCategoryColor(categoryId: number): string {
  const index = Math.abs(categoryId) % CATEGORY_COLOR_PALETTE.length;
  return CATEGORY_COLOR_PALETTE[index];
}

function hexToRgba(hex: string, alpha: number): string {
  const sanitized = hex.replace('#', '');
  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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
    case 'category_id': {
      if (!trimmed) return null;
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) {
        return Number.NaN;
      }
      return parsed;
    }
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
    case 'category_id':
      if (value === null || value === undefined || value === '') {
        return 'Select a category.';
      }
      if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
        return 'Select a valid category.';
      }
      return null;
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

export default function UnitCostsPanel({ projectTypeFilter }: UnitCostsPanelProps) {
  const [categories, setCategories] = useState<UnitCostCategoryReference[]>([]);
  const [activeCostType, setActiveCostType] = useState<UnitCostType>('hard');
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
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const templatesByCategoryRef = useRef<TemplatesByCategory>({});

  const loadCategoriesData = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams({ activity: 'Development' });
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

  const handleCloseCategoryManager = useCallback(() => {
    setShowCategoryManager(false);
    void loadCategoriesData();
    setOpenCategories([]);
    setTemplatesByCategory({});
    setSelectedCategories([]);
  }, [loadCategoriesData]);

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

  const categoryNameLookup = useMemo(() => {
    const lookup = new Map<number, string>();
    categories.forEach((category) => {
      lookup.set(category.category_id, category.category_name);
    });
    return lookup;
  }, [categories]);

  const categorySelectOptions = useMemo<UomOption[]>(() => {
    return filteredCategories
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((category) => ({
        value: String(category.category_id),
        label: category.category_name
      }));
  }, [filteredCategories]);

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

      const nextCategoryId =
        field === 'category_id' && typeof normalizedValue === 'number' ? normalizedValue : null;
      const nextCategoryName =
        nextCategoryId !== null ? categoryNameLookup.get(nextCategoryId) ?? currentRow.category_name : undefined;

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
            ...(nextCategoryName ? { category_name: nextCategoryName } : {}),
            fieldErrors: clearFieldError(entry.fieldErrors, field),
            savingFields: addSavingField(entry.savingFields, field),
            rowError: null
          } as TemplateRowState;
          if (nextCategoryName) {
            nextRow.category_name = nextCategoryName;
          }
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
          if (nextCategoryId !== null && nextCategoryId !== categoryId) {
            void loadTemplates(nextCategoryId, true);
          }
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
        if (nextCategoryId !== null && nextCategoryId !== categoryId) {
          void loadTemplates(categoryId, true);
          void loadTemplates(nextCategoryId, true);
        } else {
          const normalizedRow = mapServerRow(updated, nextCategoryName ?? updatedRowSnapshot.category_name);
          setCategoryRows(categoryId, (entries) =>
            entries.map((entry) => (entry.rowKey === rowKey ? normalizedRow : entry))
          );
        }
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
    [templatesByCategory, setCategoryRows, loadCategoriesData, loadTemplates, categoryNameLookup]
  );


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
    <div className="text-text-primary">
      <main className="space-y-6 bg-surface-card px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex space-x-2">
            {COST_TYPE_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveCostType(tab.key)}
                className={clsx(
                  'rounded border px-4 py-2 text-sm font-medium transition-colors',
                  activeCostType === tab.key
                    ? 'border-brand-primary bg-brand-primary text-text-inverse shadow'
                    : 'border-line-soft bg-surface-card text-text-secondary hover:bg-surface-card/80'
                )}
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
              className="w-72 rounded border border-line-soft bg-surface-bg px-3 py-2 text-sm text-text-primary shadow-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/30"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-text-secondary whitespace-nowrap">Filter Categories:</span>
            <button
              type="button"
              onClick={() => setShowCategoryManager(true)}
              className="inline-flex items-center gap-1 rounded-full border border-line-soft px-3 py-1 text-xs font-semibold text-text-secondary transition-colors hover:border-brand-primary hover:text-brand-primary"
            >
              <Pencil size={12} />
              Manage Categories
            </button>
            <span className="text-[11px] text-text-secondary">
              Categories sync from Admin &gt; Preferences &gt; Unit Cost Categories.
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {filteredCategories
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((category) => {
                const isSelected = selectedCategories.includes(category.category_id);
                const chipColor = getCategoryColor(category.category_id);
                return (
                  <button
                    key={category.category_id}
                    onClick={() => toggleCategoryFilter(category.category_id)}
                    className={clsx(
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors whitespace-nowrap',
                      isSelected ? 'shadow-sm' : 'opacity-90 hover:opacity-100'
                    )}
                    style={{
                      borderColor: chipColor,
                      color: chipColor,
                      backgroundColor: hexToRgba(chipColor, isSelected ? 0.25 : 0.08),
                      outline: `2px solid ${hexToRgba(chipColor, isSelected ? 0.75 : 0.45)}`,
                      outlineOffset: '2px'
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: chipColor }}
                    />
                    {category.category_name}
                  </button>
                );
              })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-text-secondary">Show Columns:</span>
          <button
            onClick={() => setVisibleColumns((prev) => ({ ...prev, quantity: !prev.quantity }))}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              visibleColumns.quantity
                ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                : 'border-line-soft bg-surface-card text-text-secondary hover:bg-surface-card/80'
            )}
          >
            <span className={clsx('h-1.5 w-1.5 rounded-full', visibleColumns.quantity ? 'bg-brand-primary' : 'bg-line-soft')} />
            Qty
          </button>
          <button
            onClick={() => setVisibleColumns((prev) => ({ ...prev, location: !prev.location }))}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              visibleColumns.location
                ? 'border-chip-success bg-chip-success/10 text-chip-success'
                : 'border-line-soft bg-surface-card text-text-secondary hover:bg-surface-card/80'
            )}
          >
            <span className={clsx('h-1.5 w-1.5 rounded-full', visibleColumns.location ? 'bg-chip-success' : 'bg-line-soft')} />
            Location
          </button>
          <button
            onClick={() => setVisibleColumns((prev) => ({ ...prev, source: !prev.source }))}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              visibleColumns.source
                ? 'border-brand-accent bg-brand-accent/10 text-brand-accent'
                : 'border-line-soft bg-surface-card text-text-secondary hover:bg-surface-card/80'
            )}
          >
            <span className={clsx('h-1.5 w-1.5 rounded-full', visibleColumns.source ? 'bg-brand-accent' : 'bg-line-soft')} />
            Source
          </button>
        </div>

      {error && (
        <div className="rounded border border-chip-error/60 bg-chip-error/10 px-4 py-3 text-sm text-chip-error">
          {error}
        </div>
      )}

      {filteredCategories.length === 0 ? (
        <div className="rounded border border-dashed border-line-strong bg-surface-card/60 px-6 py-12 text-center text-text-secondary">
          No categories available for this filter. Adjust the project type or seed additional data.
        </div>
      ) : (
          <UnifiedUnitCostTable
            rows={displayedRows}
            uomOptions={uomOptions}
            categoryOptions={categorySelectOptions}
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

      {showCategoryManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-line-soft bg-surface-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Manage Unit Cost Categories</h2>
                <p className="text-xs text-text-secondary">
                  These categories load from Admin &gt; Preferences &gt; Unit Cost Categories.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseCategoryManager}
                className="rounded-full border border-line-soft px-3 py-1 text-xs font-semibold text-text-secondary transition-colors hover:border-brand-primary hover:text-brand-primary"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-auto bg-surface-card p-4">
                <UnitCostCategoryManager />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface UnifiedTableProps {
  rows: Array<TemplateRowState & { category_name: string; category_id: number }>;
  uomOptions: UomOption[];
  categoryOptions: UomOption[];
  visibleColumns: { quantity: boolean; location: boolean; source: boolean };
  onCommitField: (rowKey: string, field: EditableField, rawValue: string) => void;
  onDeleteRow: (row: TemplateRowState) => void;
}

function UnifiedUnitCostTable({
  rows,
  uomOptions,
  categoryOptions,
  visibleColumns,
  onCommitField,
  onDeleteRow
}: UnifiedTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
  const [activeCell, setActiveCell] = useState<{ rowKey: string; field: EditableField } | null>(null);
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null);

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
        accessorKey: 'category_id',
        header: () => <div className="text-left">Category</div>,
        size: 220,
        enableSorting: true,
        meta: { align: 'left' },
        cell: (context) => (
          <EditableSelectCell
            context={context as CellContext<TemplateRowState, unknown>}
            field="category_id"
            options={categoryOptions}
            required
            align="left"
          />
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
        cell: ({ row, table }) => {
          const meta = table.options.meta as TableMeta | undefined;
          const isEditing = meta?.editingRowKey === row.original.rowKey;
          return (
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => {
                  if (isEditing) {
                    meta?.setEditingRow(null);
                  } else {
                    meta?.setEditingRow(row.original.rowKey);
                  }
                }}
                className={clsx(
                  'inline-flex h-6 w-6 items-center justify-center rounded border text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/30',
                  isEditing
                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                    : 'border-line-soft text-text-secondary hover:bg-surface-card'
                )}
                title={isEditing ? 'Stop editing row' : 'Edit entire row'}
              >
                <Pencil size={12} />
              </button>
              <button
                type="button"
                onClick={() => onDeleteRow(row.original)}
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-red-300 text-chip-error hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300"
                title="Archive row"
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        }
      }
    ];

    return allColumns;
  }, [uomOptions, categoryOptions, onDeleteRow, visibleColumns]);

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
      editingRowKey,
      startEdit: (rowKey: string, field: EditableField) => {
        setActiveCell({ rowKey, field });
      },
      clearActiveCell: () => {
        setActiveCell(null);
      },
      setEditingRow: (rowKey: string | null, focusField?: EditableField) => {
        setEditingRowKey(rowKey);
        if (rowKey && focusField) {
          setActiveCell({ rowKey, field: focusField });
        }
        if (!rowKey) {
          setActiveCell(null);
        }
      },
      onCommitField: (rowKey: string, field: EditableField, rawValue: string) => {
        setActiveCell({ rowKey, field });
        onCommitField(rowKey, field, rawValue);
      },
      uomOptions
    } satisfies TableMeta
  });

  const totalPages = table.getPageCount();

  useEffect(() => {
    if (!editingRowKey) return;
    const stillExists = rows.some((row) => row.rowKey === editingRowKey);
    if (!stillExists) {
      setEditingRowKey(null);
      setActiveCell(null);
    }
  }, [rows, editingRowKey, setActiveCell]);

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <div className="rounded border border-dashed border-line-soft bg-surface-card px-4 py-6 text-sm text-text-secondary">
          No unit costs yet. Add line items to seed this category.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded border border-line-strong">
            <table className="min-w-full border-collapse bg-surface-card">
              <thead className="sticky top-0 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="border border-line-soft bg-surface-card px-1.5 py-1 text-xs font-semibold text-text-primary"
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
                  <tr key={row.id} className="hover:bg-surface-card">
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="border border-line-soft bg-surface-card px-1.5 py-0.5 text-sm text-text-primary"
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
            <div className="flex items-center justify-between text-sm text-text-secondary">
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
                  className="rounded border border-line-strong px-3 py-1 text-xs disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="rounded border border-line-strong px-3 py-1 text-xs disabled:opacity-50"
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
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null);

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
        cell: ({ row, table }) => {
          const meta = table.options.meta as TableMeta | undefined;
          const isEditing = meta?.editingRowKey === row.original.rowKey;
          return (
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => {
                if (isEditing) {
                  meta?.setEditingRow(null);
                } else {
                  meta?.setEditingRow(row.original.rowKey);
                }
                }}
                className={clsx(
                  'inline-flex h-6 w-6 items-center justify-center rounded border text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/30',
                  isEditing
                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                    : 'border-line-soft text-text-secondary hover:bg-surface-card'
                )}
                title={isEditing ? 'Stop editing row' : 'Edit entire row'}
              >
                <Pencil size={12} />
              </button>
              <button
                type="button"
                onClick={() => onDeleteRow(row.original)}
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-red-300 text-chip-error hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300"
                title="Archive row"
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        }
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
      editingRowKey,
      startEdit: (rowKey: string, field: EditableField) => setActiveCell({ rowKey, field }),
      clearActiveCell: () => setActiveCell(null),
      setEditingRow: (rowKey: string | null, focusField?: EditableField) => {
        setEditingRowKey(rowKey);
        if (rowKey && focusField) {
          setActiveCell({ rowKey, field: focusField });
        }
        if (!rowKey) {
          setActiveCell(null);
        }
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
        <div className="rounded border border-dashed border-line-soft bg-surface-card px-4 py-6 text-sm text-text-secondary">
          No unit costs yet. Add line items to seed this category.
          <div className="mt-4">
            <button
              onClick={onAddRow}
              className="inline-flex items-center gap-2 rounded border border-blue-500 bg-blue-500 px-3 py-2 text-xs font-medium text-white hover:bg-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            >
              <Plus size={14} />
              Add Row
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-line-strong">
          <table className="min-w-full border-collapse bg-surface-card">
            <thead className="sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className="border border-line-soft bg-surface-card px-1.5 py-1 text-left text-xs font-semibold text-text-primary"
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
                      <td key={cell.id} className="border border-line-soft bg-surface-card px-1.5 py-0.5 text-sm text-text-primary">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {row.original.rowError && (
                    <tr>
                      <td colSpan={table.getVisibleLeafColumns().length} className="border-x border-b border-line-soft px-3 py-2">
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
        <div className="flex items-center justify-end gap-2 text-xs text-text-primary">
          <button
            className="rounded border border-line-soft px-2 py-1 hover:bg-surface-card disabled:opacity-40"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            First
          </button>
          <button
            className="rounded border border-line-soft px-2 py-1 hover:bg-surface-card disabled:opacity-40"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Prev
          </button>
          <span>
            Page {pagination.pageIndex + 1} of {totalPages}
          </span>
          <button
            className="rounded border border-line-soft px-2 py-1 hover:bg-surface-card disabled:opacity-40"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </button>
          <button
            className="rounded border border-line-soft px-2 py-1 hover:bg-surface-card disabled:opacity-40"
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
        'h-4 w-4 rounded border border-slate-400 bg-surface-card text-blue-600 focus:ring-brand-primary/40',
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
  const rowIsEditing = tableMeta?.editingRowKey === row.original.rowKey;

  const [editing, setEditing] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>(() => toInputString(field, row.original));
  const timeoutRef = React.useRef<number | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!rowIsEditing) {
      setEditing(false);
      setInputValue(toInputString(field, row.original));
      return;
    }
    const currentlyActive = Boolean(isActive);
    setEditing(currentlyActive);
    if (!currentlyActive) {
      setInputValue(toInputString(field, row.original));
    } else {
      setInputValue(toInputString(field, row.original));
    }
  }, [rowIsEditing, isActive, row.original, field]);

  useEffect(() => {
    if (!rowIsEditing || !editing || !isActive) return;
    const id = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(id);
  }, [editing, isActive, rowIsEditing]);

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

  const showEditor = rowIsEditing;

  return (
    <div className="flex flex-col">
      {showEditor ? (
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          maxLength={maxLength}
          placeholder={placeholder}
          className={clsx(
            'w-full border bg-surface-card px-1.5 py-0.5 text-sm text-text-primary focus:outline-none focus:ring-2',
            alignClass,
            error ? 'border-red-500 focus:ring-red-300' : 'border-blue-500 focus:ring-brand-primary/40'
          )}
          inputMode={type === 'number' || type === 'currency' ? 'decimal' : undefined}
          type={type === 'date' ? 'date' : 'text'}
        />
      ) : (
        <div
          className={clsx(
            'w-full px-1.5 py-0.5 text-sm',
            alignClass,
            error ? 'text-chip-error' : 'text-text-primary',
            (required && !row.original[field]) ? 'font-medium' : ''
          )}
        >
          {displayValue || (
            <span className={clsx('text-text-secondary', required ? 'italic' : undefined)}>
              {required ? 'Required' : '—'}
            </span>
          )}
        </div>
      )}
      {(error || isSaving) && (
        <div className="flex items-center justify-between px-1.5">
          {error && <span className="text-xs text-chip-error">{error}</span>}
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
  align?: 'left' | 'center' | 'right';
}

const toSelectString = (input: unknown): string => {
  if (input === null || input === undefined) return '';
  return String(input);
};

function EditableSelectCell({
  context,
  field,
  options,
  required = false,
  align = 'center'
}: EditableSelectCellProps) {
  const { row, table } = context;
  const tableMeta = table.options.meta as TableMeta | undefined;
  const isActive =
    tableMeta?.activeCell?.rowKey === row.original.rowKey && tableMeta.activeCell.field === field;
  const rowIsEditing = tableMeta?.editingRowKey === row.original.rowKey;

  const [editing, setEditing] = useState<boolean>(false);
  const [value, setValue] = useState<string>(() => toSelectString(row.original[field]));
  const timeoutRef = React.useRef<number | null>(null);
  const selectRef = React.useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (!rowIsEditing) {
      setEditing(false);
      setValue(toSelectString(row.original[field]));
      return;
    }
    const currentlyActive = Boolean(isActive);
    setEditing(currentlyActive);
    if (!currentlyActive) {
      setValue(toSelectString(row.original[field]));
    } else {
      setValue(toSelectString(row.original[field]));
    }
  }, [rowIsEditing, isActive, row.original, field]);

  useEffect(() => {
    if (editing && isActive && rowIsEditing) {
      const id = window.setTimeout(() => {
        selectRef.current?.focus();
      }, 0);
      return () => window.clearTimeout(id);
    }
  }, [editing, isActive, rowIsEditing]);

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

  const displayValue =
    value ? options.find((option) => option.value === value)?.label ?? value : '—';
  const showEditor = rowIsEditing;
  const alignClass = align === 'right' ? 'text-right' : align === 'left' ? 'text-left' : 'text-center';

  return (
    <div className="flex flex-col">
      {showEditor ? (
        <select
          ref={selectRef}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            scheduleCommit(event.target.value);
          }}
          onBlur={handleBlur}
          className={clsx(
            'w-full border bg-surface-card px-1.5 py-0.5 text-sm text-text-primary focus:outline-none focus:ring-2',
            alignClass,
            error ? 'border-red-500 focus:ring-red-300' : 'border-blue-500 focus:ring-brand-primary/40'
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
        <div className={clsx('w-full px-1.5 py-0.5 text-sm text-text-primary', alignClass)}>
          {displayValue}
        </div>
      )}
      {(error || isSaving) && (
        <div className="flex items-center justify-between px-1.5">
          {error && <span className="text-xs text-chip-error">{error}</span>}
          {isSaving && <span className="text-xs text-green-600">Saving…</span>}
        </div>
      )}
    </div>
  );
}
