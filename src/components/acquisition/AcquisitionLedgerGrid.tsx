'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CFormInput,
  CFormSelect,
  CSpinner,
  CTooltip,
} from '@coreui/react';
import { cilPlus, cilTrash, cilReload, cilSettings } from '@coreui/icons';
import CIcon from '@coreui/icons-react';
import { SemanticBadge, SemanticButton } from '@/components/ui/landscape';
import {
  MILESTONE_ACTIONS,
  FINANCIAL_ACTIONS,
  isMilestoneAction,
  type AcquisitionEvent,
  type AcquisitionEventType,
  type AcquisitionCategoryOption,
  type AcquisitionCategoriesResponse,
} from '@/types/acquisition';
import { formatMoney } from '@/utils/formatters/number';

interface Props {
  projectId: number;
  onEventsChange?: (events: AcquisitionEvent[]) => void;
}

// Column configuration
interface ColumnConfig {
  key: string;
  label: string;
  defaultWidth: number;
  className?: string;
}

const COLUMN_CONFIGS: ColumnConfig[] = [
  { key: 'eventDate', label: 'Date', defaultWidth: 100 },
  { key: 'eventType', label: 'Action', defaultWidth: 110 },
  { key: 'category', label: 'Category', defaultWidth: 150 },
  { key: 'subcategory', label: 'Subcategory', defaultWidth: 150 },
  { key: 'description', label: 'Description', defaultWidth: 180 },
  { key: 'amount', label: 'Amount', defaultWidth: 110, className: 'text-end' },
  { key: 'isAppliedToPurchase', label: 'Apply', defaultWidth: 70, className: 'text-center' },
  { key: 'goesHard', label: 'Go-Hard', defaultWidth: 100, className: 'text-center' },
  { key: 'isConditional', label: 'Cond.', defaultWidth: 75, className: 'text-center' },
  { key: 'notes', label: 'Notes', defaultWidth: 140 },
  { key: 'actions', label: '', defaultWidth: 60, className: 'text-end' },
];

const DEFAULT_COLUMN_ORDER = COLUMN_CONFIGS.map(c => c.key);
const DEFAULT_COLUMN_WIDTHS: Record<string, number> = COLUMN_CONFIGS.reduce(
  (acc, c) => ({ ...acc, [c.key]: c.defaultWidth }),
  {}
);

const STORAGE_KEY_WIDTHS = 'acquisition-ledger-column-widths';
const STORAGE_KEY_ORDER = 'acquisition-ledger-column-order';
const STORAGE_KEY_VISIBILITY = 'acquisition-ledger-column-visibility';
const MIN_COLUMN_WIDTH = 50;

// Columns that can be hidden (with default visibility)
const HIDEABLE_COLUMNS: { key: string; label: string; defaultVisible: boolean }[] = [
  { key: 'category', label: 'Category', defaultVisible: true },
  { key: 'subcategory', label: 'Subcategory', defaultVisible: true },
  { key: 'description', label: 'Description', defaultVisible: true },
  { key: 'isAppliedToPurchase', label: 'Apply', defaultVisible: true },
  { key: 'goesHard', label: 'Go-Hard', defaultVisible: false },
  { key: 'isConditional', label: 'Conditional', defaultVisible: false },
  { key: 'notes', label: 'Notes', defaultVisible: false },
];

// Columns that cannot be hidden
const FIXED_COLUMNS = ['eventDate', 'eventType', 'amount', 'actions'];

// Default visibility state
const DEFAULT_COLUMN_VISIBILITY: Record<string, boolean> = HIDEABLE_COLUMNS.reduce(
  (acc, col) => ({ ...acc, [col.key]: col.defaultVisible }),
  {} as Record<string, boolean>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapRow = (row: any): AcquisitionEvent => ({
  acquisitionId: row.acquisition_id,
  projectId: row.project_id,
  contactId: row.contact_id,
  categoryId: row.category_id ?? null,
  subcategoryId: row.subcategory_id ?? null,
  categoryName: row.category_name ?? null,
  subcategoryName: row.subcategory_name ?? null,
  eventDate: row.event_date,
  eventType: (row.event_type ?? 'Deposit') as AcquisitionEventType,
  description: row.description,
  amount: row.amount === null || row.amount === undefined ? null : Number(row.amount),
  isAppliedToPurchase: row.is_applied_to_purchase ?? true,
  goesHardDate: row.goes_hard_date,
  isConditional: row.is_conditional ?? false,
  unitsConveyed: row.units_conveyed === null || row.units_conveyed === undefined ? null : Number(row.units_conveyed),
  measureId: row.measure_id,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const truncate = (value: string | null | undefined, length = 40) => {
  if (!value) return '';
  return value.length > length ? `${value.slice(0, length)}…` : value;
};

// New row placeholder ID
const NEW_ROW_ID = -1;

const emptyNewRow: Partial<AcquisitionEvent> = {
  eventType: 'Deposit',
  eventDate: '',
  categoryId: null,
  subcategoryId: null,
  description: '',
  amount: null,
  isAppliedToPurchase: true,
  goesHardDate: '',
  isConditional: false,
  notes: '',
};

export default function AcquisitionLedgerGrid({ projectId, onEventsChange }: Props) {
  const [events, setEvents] = useState<AcquisitionEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: number; field: string } | null>(null);
  const [inlineValues, setInlineValues] = useState<Record<number, Partial<AcquisitionEvent>>>({});
  const [showNewRow, setShowNewRow] = useState(false);
  const [newRowValues, setNewRowValues] = useState<Partial<AcquisitionEvent>>(emptyNewRow);

  // Category state
  const [categories, setCategories] = useState<AcquisitionCategoryOption[]>([]);
  const [subcategoriesByParent, setSubcategoriesByParent] = useState<Record<string, AcquisitionCategoryOption[]>>({});

  // Column resize state
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_WIDTHS);
      if (saved) {
        try {
          return { ...DEFAULT_COLUMN_WIDTHS, ...JSON.parse(saved) };
        } catch {
          return DEFAULT_COLUMN_WIDTHS;
        }
      }
    }
    return DEFAULT_COLUMN_WIDTHS;
  });

  const [resizing, setResizing] = useState<{
    columnKey: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  // Column order state
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_ORDER);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Validate that all keys exist
          if (Array.isArray(parsed) && parsed.every(k => DEFAULT_COLUMN_ORDER.includes(k))) {
            // Add any new columns that might have been added
            const missingKeys = DEFAULT_COLUMN_ORDER.filter(k => !parsed.includes(k));
            return [...parsed, ...missingKeys];
          }
        } catch {
          return DEFAULT_COLUMN_ORDER;
        }
      }
    }
    return DEFAULT_COLUMN_ORDER;
  });

  // Drag state for column reordering
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_VISIBILITY);
      if (saved) {
        try {
          return { ...DEFAULT_COLUMN_VISIBILITY, ...JSON.parse(saved) };
        } catch {
          return DEFAULT_COLUMN_VISIBILITY;
        }
      }
    }
    return DEFAULT_COLUMN_VISIBILITY;
  });

  // Column selector dropdown state
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const columnSelectorRef = useRef<HTMLDivElement>(null);

  const tableRef = useRef<HTMLTableElement>(null);

  // Check if a column is visible
  const isColumnVisible = useCallback((columnKey: string): boolean => {
    if (FIXED_COLUMNS.includes(columnKey)) return true;
    return columnVisibility[columnKey] !== false;
  }, [columnVisibility]);

  // Toggle column visibility
  const toggleColumnVisibility = useCallback((columnKey: string) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  }, []);

  // Get ordered and visible columns
  const orderedColumns = useMemo(() => {
    return columnOrder
      .map(key => COLUMN_CONFIGS.find(c => c.key === key))
      .filter((c): c is ColumnConfig => c !== undefined && isColumnVisible(c.key));
  }, [columnOrder, isColumnVisible]);

  // Save column widths to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_WIDTHS, JSON.stringify(columnWidths));
    }
  }, [columnWidths]);

  // Save column order to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_ORDER, JSON.stringify(columnOrder));
    }
  }, [columnOrder]);

  // Save column visibility to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_VISIBILITY, JSON.stringify(columnVisibility));
    }
  }, [columnVisibility]);

  // Close column selector on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target as Node)) {
        setShowColumnSelector(false);
      }
    };

    if (showColumnSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showColumnSelector]);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/api/acquisition/categories/`);
        if (!res.ok) {
          console.warn('Failed to fetch acquisition categories');
          return;
        }
        const data: AcquisitionCategoriesResponse = await res.json();
        setCategories(data.categories || []);
        setSubcategoriesByParent(data.subcategories_by_parent || {});
      } catch (err) {
        console.warn('Error fetching categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Column resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing({
      columnKey,
      startX: e.clientX,
      startWidth: columnWidths[columnKey] || DEFAULT_COLUMN_WIDTHS[columnKey] || 100,
    });
  }, [columnWidths]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizing) return;
    const delta = e.clientX - resizing.startX;
    const newWidth = Math.max(MIN_COLUMN_WIDTH, resizing.startWidth + delta);
    setColumnWidths(prev => ({
      ...prev,
      [resizing.columnKey]: newWidth,
    }));
  }, [resizing]);

  const handleResizeEnd = useCallback(() => {
    setResizing(null);
  }, []);

  // Add/remove resize event listeners
  useEffect(() => {
    if (resizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizing, handleResizeMove, handleResizeEnd]);

  // Column drag handlers for reordering
  const handleDragStart = useCallback((e: React.DragEvent, columnKey: string) => {
    // Don't allow dragging actions column
    if (columnKey === 'actions') {
      e.preventDefault();
      return;
    }
    setDraggedColumn(columnKey);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', columnKey);
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDraggedColumn(null);
    setDragOverColumn(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    if (columnKey === 'actions') return; // Can't drop on actions
    e.dataTransfer.dropEffect = 'move';
    if (draggedColumn && draggedColumn !== columnKey) {
      setDragOverColumn(columnKey);
    }
  }, [draggedColumn]);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetColumnKey: string) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetColumnKey || targetColumnKey === 'actions') {
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }

    setColumnOrder(prevOrder => {
      const newOrder = [...prevOrder];
      const draggedIndex = newOrder.indexOf(draggedColumn);
      const targetIndex = newOrder.indexOf(targetColumnKey);

      if (draggedIndex === -1 || targetIndex === -1) return prevOrder;

      // Remove dragged column and insert at target position
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedColumn);

      return newOrder;
    });

    setDraggedColumn(null);
    setDragOverColumn(null);
  }, [draggedColumn]);

  // Reset columns to default
  const handleResetColumns = useCallback(() => {
    setColumnOrder(DEFAULT_COLUMN_ORDER);
    setColumnWidths(DEFAULT_COLUMN_WIDTHS);
    setColumnVisibility(DEFAULT_COLUMN_VISIBILITY);
    localStorage.removeItem(STORAGE_KEY_ORDER);
    localStorage.removeItem(STORAGE_KEY_WIDTHS);
    localStorage.removeItem(STORAGE_KEY_VISIBILITY);
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/api/projects/${projectId}/acquisition/ledger/`);
      if (!res.ok) {
        throw new Error(`Failed to load ledger (${res.status})`);
      }
      const json = await res.json();
      const data = Array.isArray(json) ? json : (json.results || []);
      const mapped = data.map(mapRow);
      setEvents(mapped);
      onEventsChange?.(mapped);
    } catch (err) {
      console.error(err);
      setError('Unable to load acquisition ledger');
    } finally {
      setLoading(false);
    }
  }, [projectId, onEventsChange]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleDelete = async (acquisitionId: number) => {
    setDeletingId(acquisitionId);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/api/projects/${projectId}/acquisition/ledger/${acquisitionId}/`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error(`Delete failed (${res.status})`);
      }
      await fetchEvents();
    } catch (err) {
      console.error(err);
      setError('Failed to delete event');
    } finally {
      setDeletingId(null);
    }
  };

  const handleInlineSave = async (acquisitionId: number) => {
    const changes = inlineValues[acquisitionId];
    if (!changes) return;

    const apiUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
    const payload: Record<string, unknown> = {};

    if (changes.eventType !== undefined) payload.event_type = changes.eventType;
    if (changes.eventDate !== undefined) payload.event_date = changes.eventDate || null;
    if (changes.categoryId !== undefined) payload.category_id = changes.categoryId;
    if (changes.subcategoryId !== undefined) payload.subcategory_id = changes.subcategoryId;
    if (changes.description !== undefined) payload.description = changes.description || null;
    if (changes.amount !== undefined) payload.amount = changes.amount ?? null;
    if (changes.isAppliedToPurchase !== undefined) payload.is_applied_to_purchase = changes.isAppliedToPurchase;
    if (changes.goesHardDate !== undefined) payload.goes_hard_date = changes.goesHardDate || null;
    if (changes.isConditional !== undefined) payload.is_conditional = changes.isConditional;
    if (changes.notes !== undefined) payload.notes = changes.notes || null;

    try {
      const res = await fetch(`${apiUrl}/api/projects/${projectId}/acquisition/ledger/${acquisitionId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`Save failed (${res.status})`);
      }
      await fetchEvents();
      setInlineValues((prev) => {
        const updated = { ...prev };
        delete updated[acquisitionId];
        return updated;
      });
      setEditingCell(null);
    } catch (err) {
      console.error(err);
      setError('Failed to save changes');
    }
  };

  const handleCreateNewRow = async () => {
    if (!newRowValues.eventType) return;
    setSaving(true);
    const apiUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
    const payload = {
      event_type: newRowValues.eventType,
      event_date: newRowValues.eventDate || null,
      category_id: newRowValues.categoryId ?? null,
      subcategory_id: newRowValues.subcategoryId ?? null,
      description: newRowValues.description || null,
      amount: newRowValues.amount ?? null,
      is_applied_to_purchase: newRowValues.isAppliedToPurchase ?? true,
      goes_hard_date: newRowValues.goesHardDate || null,
      is_conditional: newRowValues.isConditional ?? false,
      notes: newRowValues.notes || null,
    };

    try {
      const res = await fetch(`${apiUrl}/api/projects/${projectId}/acquisition/ledger/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`Create failed (${res.status})`);
      }
      await fetchEvents();
      setNewRowValues(emptyNewRow);
      setShowNewRow(false);
      setEditingCell(null);
    } catch (err) {
      console.error(err);
      setError('Failed to create event');
    } finally {
      setSaving(false);
    }
  };

  const getInlineValue = (row: AcquisitionEvent, field: keyof AcquisitionEvent) => {
    const changes = inlineValues[row.acquisitionId];
    return changes?.[field] !== undefined ? changes[field] : row[field];
  };

  const setInlineValue = (rowId: number, field: keyof AcquisitionEvent, value: unknown) => {
    setInlineValues((prev) => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        [field]: value,
      },
    }));
  };

  const startEditing = (rowId: number, field: string) => {
    setEditingCell({ rowId, field });
  };

  const cancelEditing = () => {
    setEditingCell(null);
  };

  // Get subcategory options based on selected category
  const getSubcategoryOptions = (categoryId: number | null | undefined): AcquisitionCategoryOption[] => {
    if (!categoryId) return [];
    return subcategoriesByParent[String(categoryId)] || [];
  };

  // Handle category change - clear subcategory when category changes
  const handleCategoryChange = (rowId: number, categoryId: number | null, isNewRow: boolean = false) => {
    if (isNewRow) {
      setNewRowValues(prev => ({
        ...prev,
        categoryId,
        subcategoryId: null, // Clear subcategory when category changes
      }));
    } else {
      setInlineValue(rowId, 'categoryId', categoryId);
      setInlineValue(rowId, 'subcategoryId', null); // Clear subcategory when category changes
    }
  };

  const handleAddClick = () => {
    setShowNewRow(true);
    setNewRowValues(emptyNewRow);
    setTimeout(() => {
      setEditingCell({ rowId: NEW_ROW_ID, field: 'eventType' });
    }, 50);
  };

  const renderPicklistPlaceholder = (label: string) => (
    <span className="dropdown-placeholder">
      <span>{label}</span>
      <span className="dropdown-arrow" aria-hidden="true">⌄</span>
    </span>
  );

  const renderAmountCell = (amount: number | null | undefined) => {
    if (amount !== null && amount !== undefined) {
      return (
        <span className="fw-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatMoney(amount)}
        </span>
      );
    }
    return renderPicklistPlaceholder('Add amount');
  };

  // Render header cell with resize handle and drag support
  const renderHeaderCell = (column: ColumnConfig) => {
    const width = columnWidths[column.key] || column.defaultWidth;
    const isDragging = draggedColumn === column.key;
    const isDragOver = dragOverColumn === column.key;
    const canDrag = column.key !== 'actions';

    return (
      <th
        key={column.key}
        draggable={canDrag}
        onDragStart={canDrag ? (e) => handleDragStart(e, column.key) : undefined}
        onDragEnd={canDrag ? handleDragEnd : undefined}
        onDragOver={(e) => handleDragOver(e, column.key)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, column.key)}
        className={[
          column.className,
          column.key === 'eventDate' ? 'date-column' : null,
          isDragging ? 'dragging' : null,
          isDragOver ? 'drag-over' : null,
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          width: `${width}px`,
          minWidth: `${MIN_COLUMN_WIDTH}px`,
          position: 'relative',
          userSelect: 'none',
          cursor: canDrag ? 'grab' : 'default',
          opacity: isDragging ? 0.5 : 1,
          borderLeft: isDragOver ? '2px solid var(--cui-primary)' : undefined,
        }}
      >
        <CTooltip content={HEADER_TOOLTIP}>
          <span className="column-label">{column.label}</span>
        </CTooltip>
        <div
          className="resize-handle"
          onMouseDown={(e) => {
            e.stopPropagation(); // Prevent drag start
            handleResizeStart(e, column.key);
          }}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '5px',
            cursor: 'col-resize',
            background: resizing?.columnKey === column.key ? 'var(--cui-primary)' : 'transparent',
          }}
        />
      </th>
    );
  };

  // Render cell content based on column key
  const renderCellContent = (
    columnKey: string,
    row: AcquisitionEvent,
    isEditingField: (field: string) => boolean,
    rowCategoryId: number | null,
    rowSubcatOptions: AcquisitionCategoryOption[],
    isDepositRow: boolean
  ) => {
    switch (columnKey) {
      case 'eventDate':
        return isEditingField('eventDate') ? (
          <CFormInput
            size="sm"
            type="date"
            value={(getInlineValue(row, 'eventDate') as string) || ''}
            onChange={(e) => setInlineValue(row.acquisitionId, 'eventDate', e.target.value)}
            onBlur={() => handleInlineSave(row.acquisitionId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleInlineSave(row.acquisitionId);
              if (e.key === 'Escape') cancelEditing();
            }}
            autoFocus
          />
        ) : (
          (getInlineValue(row, 'eventDate') as string) || '—'
        );

      case 'eventType':
        return isEditingField('eventType') ? (
          <CFormSelect
            size="sm"
            value={getInlineValue(row, 'eventType') as string}
            onChange={(e) => setInlineValue(row.acquisitionId, 'eventType', e.target.value)}
            onBlur={() => handleInlineSave(row.acquisitionId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleInlineSave(row.acquisitionId);
              if (e.key === 'Escape') cancelEditing();
            }}
            autoFocus
          >
            {/* Milestone Events */}
            {MILESTONE_ACTIONS.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
            {/* Visual Separator */}
            <option disabled style={{ fontSize: '1px', backgroundColor: 'var(--cui-border-color)' }}>
              ────────────
            </option>
            {/* Financial Events */}
            {FINANCIAL_ACTIONS.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </CFormSelect>
        ) : (
          <span className="fw-semibold">{getInlineValue(row, 'eventType') as string}</span>
        );

      case 'category': {
        const isMilestone = isMilestoneAction(row.eventType);
        // Milestone actions - show empty cell (no dropdown needed)
        if (isMilestone) {
          return null;
        }
        return isEditingField('category') ? (
          <CFormSelect
            size="sm"
            value={rowCategoryId ?? ''}
            onChange={(e) => handleCategoryChange(row.acquisitionId, e.target.value ? parseInt(e.target.value) : null)}
            onBlur={() => handleInlineSave(row.acquisitionId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleInlineSave(row.acquisitionId);
              if (e.key === 'Escape') cancelEditing();
            }}
            autoFocus
          >
            <option value="">Select...</option>
            {categories.map((cat) => (
              <option key={cat.category_id} value={cat.category_id}>
                {cat.category_name}
              </option>
            ))}
          </CFormSelect>
        ) : (
          (() => {
            const label =
              truncate(
                categories.find(c => c.category_id === rowCategoryId)?.category_name || row.categoryName || '',
                20
              );
            return label
              ? <span title={row.categoryName || ''}>{label}</span>
              : renderPicklistPlaceholder('Select category');
          })()
        );
      }

      case 'subcategory': {
        const isMilestone = isMilestoneAction(row.eventType);
        // Milestone actions - show empty cell (no dropdown needed)
        if (isMilestone) {
          return null;
        }
        return isEditingField('subcategory') ? (
          <CFormSelect
            size="sm"
            value={(getInlineValue(row, 'subcategoryId') as number) ?? ''}
            onChange={(e) => setInlineValue(row.acquisitionId, 'subcategoryId', e.target.value ? parseInt(e.target.value) : null)}
            onBlur={() => handleInlineSave(row.acquisitionId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleInlineSave(row.acquisitionId);
              if (e.key === 'Escape') cancelEditing();
            }}
            disabled={!rowCategoryId}
            autoFocus
          >
            <option value="">Select...</option>
            {rowSubcatOptions.map((sub) => (
              <option key={sub.category_id} value={sub.category_id}>
                {sub.category_name}
              </option>
            ))}
          </CFormSelect>
        ) : (
          (() => {
            const label =
              truncate(
                rowSubcatOptions.find(s => s.category_id === (getInlineValue(row, 'subcategoryId') as number))?.category_name ||
                  row.subcategoryName ||
                  '',
                20
              );
            if (label) {
              return <span title={row.subcategoryName || ''}>{label}</span>;
            }
            if (!rowCategoryId) {
              return <span className="text-muted opacity-50">Select category first</span>;
            }
            return renderPicklistPlaceholder('Select subcategory');
          })()
        );
      }

      case 'description':
        return isEditingField('description') ? (
          <CFormInput
            size="sm"
            value={(getInlineValue(row, 'description') as string) || ''}
            onChange={(e) => setInlineValue(row.acquisitionId, 'description', e.target.value)}
            onBlur={() => handleInlineSave(row.acquisitionId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleInlineSave(row.acquisitionId);
              if (e.key === 'Escape') cancelEditing();
            }}
            placeholder={row.eventType === 'Milestone' ? 'e.g., DD Expires, Title Review...' : 'Description'}
            autoFocus
          />
        ) : (
          truncate(getInlineValue(row, 'description') as string, 25) || '—'
        );

      case 'amount': {
        const isMilestone = isMilestoneAction(row.eventType);
        // Milestone actions - show disabled input
        if (isMilestone) {
          return (
            <CFormInput
              size="sm"
              type="number"
              value=""
              disabled
              className="bg-light text-muted"
              style={{ cursor: 'not-allowed', opacity: 0.6 }}
            />
          );
        }
        return isEditingField('amount') ? (
          <CFormInput
            size="sm"
            type="number"
            step="0.01"
            value={(getInlineValue(row, 'amount') as number) ?? ''}
            onChange={(e) => setInlineValue(row.acquisitionId, 'amount', e.target.value === '' ? null : Number(e.target.value))}
            onBlur={() => handleInlineSave(row.acquisitionId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleInlineSave(row.acquisitionId);
              if (e.key === 'Escape') cancelEditing();
            }}
            autoFocus
          />
        ) : (
          renderAmountCell(getInlineValue(row, 'amount') as number | null)
        );
      }

      case 'isAppliedToPurchase':
        return (
          <SemanticBadge
            intent="action-state"
            value={(getInlineValue(row, 'isAppliedToPurchase') as boolean) ? 'yes' : 'no'}
          />
        );

      case 'goesHard':
        return isEditingField('goesHardDate') ? (
          <CFormInput
            size="sm"
            type="date"
            value={(getInlineValue(row, 'goesHardDate') as string) || ''}
            onChange={(e) => setInlineValue(row.acquisitionId, 'goesHardDate', e.target.value)}
            onBlur={() => handleInlineSave(row.acquisitionId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleInlineSave(row.acquisitionId);
              if (e.key === 'Escape') cancelEditing();
            }}
            autoFocus
          />
        ) : (
          (getInlineValue(row, 'goesHardDate') as string) || '—'
        );

      case 'isConditional':
        return !isDepositRow ? (
          <SemanticBadge
            intent="action-state"
            value={(getInlineValue(row, 'isConditional') as boolean) ? 'conditional' : 'firm'}
          />
        ) : (
          <span className="text-muted">—</span>
        );

      case 'notes':
        return isEditingField('notes') ? (
          <CFormInput
            size="sm"
            value={(getInlineValue(row, 'notes') as string) || ''}
            onChange={(e) => setInlineValue(row.acquisitionId, 'notes', e.target.value)}
            onBlur={() => handleInlineSave(row.acquisitionId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleInlineSave(row.acquisitionId);
              if (e.key === 'Escape') cancelEditing();
            }}
            autoFocus
          />
        ) : (
          truncate(getInlineValue(row, 'notes') as string, 20) || '—'
        );

      case 'actions':
        return (
          <CTooltip content="Delete">
            <CButton
              size="sm"
              color="light"
              variant="ghost"
              disabled={deletingId === row.acquisitionId}
              onClick={() => handleDelete(row.acquisitionId)}
            >
              {deletingId === row.acquisitionId ? <CSpinner size="sm" /> : <CIcon icon={cilTrash} size="sm" />}
            </CButton>
          </CTooltip>
        );

      default:
        return null;
    }
  };

  // Get cell click handler based on column key
  const getCellClickHandler = (
    columnKey: string,
    row: AcquisitionEvent,
    rowCategoryId: number | null,
    isDepositRow: boolean
  ) => {
    const isMilestone = isMilestoneAction(row.eventType);

    switch (columnKey) {
      case 'eventDate':
        return () => startEditing(row.acquisitionId, 'eventDate');
      case 'eventType':
        return () => startEditing(row.acquisitionId, 'eventType');
      case 'category':
        // Milestone rows don't have categories
        return isMilestone ? undefined : () => startEditing(row.acquisitionId, 'category');
      case 'subcategory':
        // Milestone rows don't have subcategories
        return (isMilestone || !rowCategoryId) ? undefined : () => startEditing(row.acquisitionId, 'subcategory');
      case 'description':
        return () => startEditing(row.acquisitionId, 'description');
      case 'amount':
        // Milestone rows don't have amounts
        return isMilestone ? undefined : () => startEditing(row.acquisitionId, 'amount');
      case 'isAppliedToPurchase':
        return () => {
          setInlineValue(row.acquisitionId, 'isAppliedToPurchase', !(getInlineValue(row, 'isAppliedToPurchase') as boolean));
          setTimeout(() => handleInlineSave(row.acquisitionId), 100);
        };
      case 'goesHard':
        return () => startEditing(row.acquisitionId, 'goesHardDate');
      case 'isConditional':
        return !isDepositRow ? () => {
          setInlineValue(row.acquisitionId, 'isConditional', !(getInlineValue(row, 'isConditional') as boolean));
          setTimeout(() => handleInlineSave(row.acquisitionId), 100);
        } : undefined;
      case 'notes':
        return () => startEditing(row.acquisitionId, 'notes');
      default:
        return undefined;
    }
  };

  // Get cell class based on column key
  const getCellClass = (columnKey: string, rowCategoryId: number | null, isDepositRow: boolean, eventType: AcquisitionEventType) => {
    const column = COLUMN_CONFIGS.find(c => c.key === columnKey);
    const baseClass = column?.className || '';
    const isMilestone = isMilestoneAction(eventType);

    switch (columnKey) {
      case 'eventDate':
        return `editable-cell date-column ${baseClass}`;
      case 'eventType':
        return `fw-semibold editable-cell ${baseClass}`;
      case 'category':
      case 'amount':
        // Milestone rows don't have these fields - not editable
        return isMilestone ? baseClass : `editable-cell ${baseClass}`;
      case 'subcategory':
        // Not editable for milestones or when no category selected
        return (isMilestone || !rowCategoryId) ? baseClass : `editable-cell ${baseClass}`;
      case 'isConditional':
        return !isDepositRow ? `editable-cell ${baseClass}` : baseClass;
      case 'actions':
        return baseClass;
      default:
        return `editable-cell ${baseClass}`;
    }
  };

  // Render new row cell content
  const renderNewRowCellContent = (columnKey: string) => {
    const isEditing = (field: string) => editingCell?.rowId === NEW_ROW_ID && editingCell?.field === field;
    const isDepositRow = newRowValues.eventType === 'Deposit';
    const newRowSubcatOptions = getSubcategoryOptions(newRowValues.categoryId);

    switch (columnKey) {
      case 'eventDate':
        return isEditing('eventDate') ? (
          <CFormInput
            size="sm"
            type="date"
            value={newRowValues.eventDate || ''}
            onChange={(e) => setNewRowValues((prev) => ({ ...prev, eventDate: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setShowNewRow(false); cancelEditing(); }
              if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); startEditing(NEW_ROW_ID, 'eventType'); }
            }}
            autoFocus
          />
        ) : (
          <span className="text-muted">{newRowValues.eventDate || 'Date'}</span>
        );

      case 'eventType':
        return isEditing('eventType') ? (
          <CFormSelect
            size="sm"
            value={newRowValues.eventType}
            onChange={(e) => setNewRowValues((prev) => ({ ...prev, eventType: e.target.value as AcquisitionEventType }))}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setShowNewRow(false); cancelEditing(); }
              if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); startEditing(NEW_ROW_ID, 'category'); }
            }}
            autoFocus
          >
            {/* Milestone Events */}
            {MILESTONE_ACTIONS.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
            {/* Visual Separator */}
            <option disabled style={{ fontSize: '1px', backgroundColor: 'var(--cui-border-color)' }}>
              ────────────
            </option>
            {/* Financial Events */}
            {FINANCIAL_ACTIONS.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </CFormSelect>
        ) : (
          <span className="fw-semibold">{newRowValues.eventType}</span>
        );

      case 'category': {
        const isMilestone = isMilestoneAction(newRowValues.eventType);
        // Milestone actions - show disabled dropdown
        if (isMilestone) {
          return (
            <CFormSelect
              size="sm"
              value=""
              disabled
              className="bg-light text-muted"
              style={{ cursor: 'not-allowed', opacity: 0.6 }}
            >
              <option value=""></option>
            </CFormSelect>
          );
        }
        return isEditing('category') ? (
          <CFormSelect
            size="sm"
            value={newRowValues.categoryId ?? ''}
            onChange={(e) => handleCategoryChange(NEW_ROW_ID, e.target.value ? parseInt(e.target.value) : null, true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setShowNewRow(false); cancelEditing(); }
              if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); startEditing(NEW_ROW_ID, 'subcategory'); }
            }}
            autoFocus
          >
            <option value="">Select...</option>
            {categories.map((cat) => (
              <option key={cat.category_id} value={cat.category_id}>
                {cat.category_name}
              </option>
            ))}
          </CFormSelect>
        ) : (
          <span className="text-muted">
            {categories.find(c => c.category_id === newRowValues.categoryId)?.category_name || 'Category'}
          </span>
        );
      }

      case 'subcategory': {
        const isMilestone = isMilestoneAction(newRowValues.eventType);
        // Milestone actions - show disabled dropdown
        if (isMilestone) {
          return (
            <CFormSelect
              size="sm"
              value=""
              disabled
              className="bg-light text-muted"
              style={{ cursor: 'not-allowed', opacity: 0.6 }}
            >
              <option value=""></option>
            </CFormSelect>
          );
        }
        return isEditing('subcategory') ? (
          <CFormSelect
            size="sm"
            value={newRowValues.subcategoryId ?? ''}
            onChange={(e) => setNewRowValues(prev => ({ ...prev, subcategoryId: e.target.value ? parseInt(e.target.value) : null }))}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setShowNewRow(false); cancelEditing(); }
              if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); startEditing(NEW_ROW_ID, 'description'); }
            }}
            disabled={!newRowValues.categoryId}
            autoFocus
          >
            <option value="">Select...</option>
            {newRowSubcatOptions.map((sub) => (
              <option key={sub.category_id} value={sub.category_id}>
                {sub.category_name}
              </option>
            ))}
          </CFormSelect>
        ) : (
          <span className={newRowValues.categoryId ? 'text-muted' : 'text-muted opacity-50'}>
            {newRowSubcatOptions.find(s => s.category_id === newRowValues.subcategoryId)?.category_name || 'Subcategory'}
          </span>
        );
      }

      case 'description':
        return isEditing('description') ? (
          <CFormInput
            size="sm"
            placeholder={newRowValues.eventType === 'Milestone' ? 'e.g., DD Expires, Title Review...' : 'Description'}
            value={newRowValues.description || ''}
            onChange={(e) => setNewRowValues((prev) => ({ ...prev, description: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setShowNewRow(false); cancelEditing(); }
              if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); startEditing(NEW_ROW_ID, 'amount'); }
            }}
            autoFocus
          />
        ) : (
          <span className="text-muted">{newRowValues.description || 'Description'}</span>
        );

      case 'amount': {
        const isMilestone = isMilestoneAction(newRowValues.eventType);
        // Milestone actions - show disabled input
        if (isMilestone) {
          return (
            <CFormInput
              size="sm"
              type="number"
              value=""
              disabled
              className="bg-light text-muted"
              style={{ cursor: 'not-allowed', opacity: 0.6 }}
            />
          );
        }
        return isEditing('amount') ? (
          <CFormInput
            size="sm"
            type="number"
            step="0.01"
            placeholder="0"
            value={newRowValues.amount ?? ''}
            onChange={(e) => setNewRowValues((prev) => ({ ...prev, amount: e.target.value === '' ? null : Number(e.target.value) }))}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setShowNewRow(false); cancelEditing(); }
              if (e.key === 'Enter') { handleCreateNewRow(); }
            }}
            autoFocus
          />
        ) : (
          <span className="text-muted">{renderAmountCell(newRowValues.amount)}</span>
        );
      }

      case 'isAppliedToPurchase':
        return (
          <SemanticBadge
            intent="action-state"
            value={newRowValues.isAppliedToPurchase ? 'yes' : 'no'}
          />
        );

      case 'goesHard':
        return isEditing('goesHardDate') ? (
          <CFormInput
            size="sm"
            type="date"
            value={newRowValues.goesHardDate || ''}
            onChange={(e) => setNewRowValues((prev) => ({ ...prev, goesHardDate: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setShowNewRow(false); cancelEditing(); }
            }}
            autoFocus
          />
        ) : (
          <span className="text-muted">{newRowValues.goesHardDate || '—'}</span>
        );

      case 'isConditional':
        return !isDepositRow ? (
          <SemanticBadge
            intent="action-state"
            value={newRowValues.isConditional ? 'conditional' : 'firm'}
          />
        ) : (
          <span className="text-muted">—</span>
        );

      case 'notes':
        return isEditing('notes') ? (
          <CFormInput
            size="sm"
            placeholder="Notes"
            value={newRowValues.notes || ''}
            onChange={(e) => setNewRowValues((prev) => ({ ...prev, notes: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setShowNewRow(false); cancelEditing(); }
              if (e.key === 'Enter') { handleCreateNewRow(); }
            }}
            autoFocus
          />
        ) : (
          <span className="text-muted">{truncate(newRowValues.notes, 30) || 'Notes'}</span>
        );

      case 'actions':
        return (
          <div className="d-flex gap-1 justify-content-end">
            <CTooltip content="Save">
              <CButton
                size="sm"
                color="success"
                variant="ghost"
                disabled={saving}
                onClick={handleCreateNewRow}
              >
                {saving ? <CSpinner size="sm" /> : '✓'}
              </CButton>
            </CTooltip>
            <CTooltip content="Cancel">
              <CButton
                size="sm"
                color="secondary"
                variant="ghost"
                onClick={() => { setShowNewRow(false); setNewRowValues(emptyNewRow); }}
              >
                ✕
              </CButton>
            </CTooltip>
          </div>
        );

      default:
        return null;
    }
  };

  // Get new row cell click handler
  const getNewRowCellClickHandler = (columnKey: string) => {
    const isDepositRow = newRowValues.eventType === 'Deposit';
    const isMilestone = isMilestoneAction(newRowValues.eventType);

    switch (columnKey) {
      case 'eventDate':
        return () => startEditing(NEW_ROW_ID, 'eventDate');
      case 'eventType':
        return () => startEditing(NEW_ROW_ID, 'eventType');
      case 'category':
        // Milestone rows don't have categories
        return isMilestone ? undefined : () => startEditing(NEW_ROW_ID, 'category');
      case 'subcategory':
        // Milestone rows don't have subcategories
        return (isMilestone || !newRowValues.categoryId) ? undefined : () => startEditing(NEW_ROW_ID, 'subcategory');
      case 'description':
        return () => startEditing(NEW_ROW_ID, 'description');
      case 'amount':
        // Milestone rows don't have amounts
        return isMilestone ? undefined : () => startEditing(NEW_ROW_ID, 'amount');
      case 'isAppliedToPurchase':
        return () => setNewRowValues((prev) => ({ ...prev, isAppliedToPurchase: !prev.isAppliedToPurchase }));
      case 'goesHard':
        return () => startEditing(NEW_ROW_ID, 'goesHardDate');
      case 'isConditional':
        return !isDepositRow ? () => setNewRowValues((prev) => ({ ...prev, isConditional: !prev.isConditional })) : undefined;
      case 'notes':
        return () => startEditing(NEW_ROW_ID, 'notes');
      default:
        return undefined;
    }
  };

  // Render new row
  const renderNewRow = () => {
    if (!showNewRow) return null;

    return (
      <tr style={{ backgroundColor: 'rgba(var(--cui-primary-rgb), 0.05)' }}>
        {orderedColumns.map((column) => {
          const onClick = getNewRowCellClickHandler(column.key);
          const classes = [column.className, column.key === 'eventDate' ? 'date-column' : null]
            .filter(Boolean)
            .join(' ');
          return (
            <td
              key={column.key}
              className={classes || undefined}
              onClick={onClick}
              style={{ cursor: onClick ? 'pointer' : 'default' }}
            >
              {renderNewRowCellContent(column.key)}
            </td>
          );
        })}
      </tr>
    );
  };

  const HEADER_TOOLTIP = 'Click cells to edit • Drag headers to reorder • Drag edges to resize';

  return (
      <CCard className="shadow-sm" style={{ overflow: 'hidden' }}>
      <style>{`
        .acq-table { table-layout: fixed; width: 100%; background-color: transparent; }
        .acq-table th, .acq-table td {
          padding: 0.25rem 0.4rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 0.875rem;
        }
        .acq-table th:not(:first-child),
        .acq-table td:not(:first-child) {
          border-left: 1px solid rgba(15, 23, 42, 0.08);
        }
        .acq-table tbody tr {
          height: 34px;
        }
        .dropdown-placeholder {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          height: 100%;
          padding: 0 0.35rem;
          border-radius: 0;
          border: none !important;
          background: transparent !important;
          box-shadow: none !important;
          font-size: 0.78rem;
          color: transparent;
        }
        .dropdown-arrow {
          font-size: 0.7rem;
          color: transparent;
        }
        .acq-table th.date-column,
        .acq-table td.date-column {
          padding-left: 1rem;
        }
        .acq-table .editable-cell {
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        .acq-table .editable-cell:hover {
          background-color: rgba(var(--cui-primary-rgb), 0.05);
        }
        .acq-table input, .acq-table select {
          font-size: 0.8125rem;
        }
        .resize-handle:hover {
          background: var(--cui-border-color) !important;
        }
        .acq-table thead th {
          border-right: 1px solid var(--cui-border-color-translucent);
          transition: background-color 0.15s ease, border-left 0.15s ease;
          background-color: #F7F7FB !important;
          background-image: none !important;
          color: var(--cui-body-color) !important;
        }
        .acq-table tbody th {
          background-color: transparent !important;
        }
        .acq-table th:last-child {
          border-right: none;
        }
        .acq-table th:active {
          cursor: grabbing;
        }
        .acq-table th.dragging {
          background: var(--cui-tertiary-bg);
        }
        .acq-table th.drag-over {
          background: rgba(var(--cui-primary-rgb), 0.1);
        }
        .acq-table .milestone-row {
          background-color: var(--cui-tertiary-bg);
        }
        .acq-table .milestone-row:hover {
          background-color: var(--cui-secondary-bg);
        }
      `}</style>
      <CCardHeader
        className="d-flex flex-wrap justify-content-between align-items-center gap-2 py-2"
        style={{ backgroundColor: '#F0F1F2', borderBottom: '1px solid var(--cui-border-color)' }}
      >
        <div>
          <CTooltip content={HEADER_TOOLTIP}>
            <h6 className="mb-0 fw-bold">Acquisition Ledger</h6>
          </CTooltip>
        </div>
        <div className="d-flex align-items-center gap-2">
          {/* Column Selector Dropdown */}
          <div ref={columnSelectorRef} style={{ position: 'relative' }}>
            <CTooltip content="Configure columns">
              <CButton
                color="secondary"
                variant="ghost"
                size="sm"
                onClick={() => setShowColumnSelector(!showColumnSelector)}
              >
                <CIcon icon={cilSettings} size="sm" />
              </CButton>
            </CTooltip>
            {showColumnSelector && (
              <div
                className="dropdown-menu show"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  minWidth: '180px',
                  padding: '8px 0',
                  zIndex: 1000,
                  marginTop: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
              >
                <div className="px-3 py-2 text-muted small fw-semibold border-bottom mb-1">
                  Show/Hide Columns
                </div>
                {HIDEABLE_COLUMNS.map(col => (
                  <label
                    key={col.key}
                    className="dropdown-item d-flex align-items-center gap-2 py-1"
                    style={{ cursor: 'pointer', fontSize: '0.875rem' }}
                  >
                    <input
                      type="checkbox"
                      checked={columnVisibility[col.key] !== false}
                      onChange={() => toggleColumnVisibility(col.key)}
                      className="form-check-input m-0"
                      style={{ width: '14px', height: '14px' }}
                    />
                    <span>{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <CTooltip content="Reset column order and widths">
            <SemanticButton intent="tertiary-action" variant="ghost" size="sm" onClick={handleResetColumns}>
              <CIcon icon={cilReload} size="sm" />
            </SemanticButton>
          </CTooltip>
          <SemanticButton intent="primary-action" size="sm" onClick={handleAddClick} disabled={showNewRow}>
            <CIcon icon={cilPlus} size="sm" className="me-1" /> Add
          </SemanticButton>
        </div>
      </CCardHeader>
      <CCardBody className="p-0">
        {error && <div className="alert alert-danger py-2 mx-3 mt-3 mb-0">{error}</div>}
        {loading ? (
          <div className="d-flex align-items-center text-muted p-4" style={{ minHeight: 120 }}>
            <CSpinner size="sm" className="me-2" /> Loading ledger...
          </div>
        ) : (
          <div
            style={{
              overflowX: 'auto',
              borderRadius: '0 0 var(--cui-card-border-radius) var(--cui-card-border-radius)',
              backgroundColor: 'var(--cui-card-bg)',
            }}
          >
            <table ref={tableRef} className="table table-hover align-middle mb-0 acq-table">
              <thead>
                <tr>
                  {orderedColumns.map((column) => renderHeaderCell(column))}
                </tr>
              </thead>
              <tbody>
                {renderNewRow()}
                {events.length === 0 && !showNewRow && (
                  <tr>
                    <td colSpan={orderedColumns.length} className="text-center text-muted py-4">
                      No acquisition events yet. Click &quot;Add&quot; to create your first event.
                    </td>
                  </tr>
                )}
                {events.map((row) => {
                  const isDepositRow = row.eventType === 'Deposit';
                  const isEditingField = (field: string) => editingCell?.rowId === row.acquisitionId && editingCell?.field === field;
                  const rowCategoryId = getInlineValue(row, 'categoryId') as number | null;
                  const rowSubcatOptions = getSubcategoryOptions(rowCategoryId);

                  return (
                    <tr key={row.acquisitionId} className={isMilestoneAction(row.eventType) ? 'milestone-row' : ''}>
                      {orderedColumns.map((column) => {
                        const onClick = getCellClickHandler(column.key, row, rowCategoryId, isDepositRow);
                        const cellClass = getCellClass(column.key, rowCategoryId, isDepositRow, row.eventType);

                        return (
                          <td
                            key={column.key}
                            className={cellClass}
                            onClick={onClick}
                            title={column.key === 'description' ? (getInlineValue(row, 'description') as string) || '' :
                                   column.key === 'notes' ? (getInlineValue(row, 'notes') as string) || '' : undefined}
                          >
                            {renderCellContent(column.key, row, isEditingField, rowCategoryId, rowSubcatOptions, isDepositRow)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CCardBody>
    </CCard>
  );
}
