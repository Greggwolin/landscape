// v1.0 · 2025-11-02 · UI-only editing; no saves
'use client';

import { useEffect, useRef, useState } from 'react';
import ColoredDotIndicator from './ColoredDotIndicator';
import type { UnitCostTemplateSummary } from '@/types/benchmarks';

type SelectOption = { value: string; label: string };

interface LegacyProps {
  value: string | number | null;
  type: 'text' | 'number' | 'currency' | 'date' | 'select';
  options?: SelectOption[];
  editable?: boolean;
  onSave: (newValue: any) => void | Promise<void>;
  className?: string;
  decimals?: number;
}

interface TanStackProps {
  getValue: () => any;
  row: any;
  column: any;
}

type EditableCellProps = LegacyProps | TanStackProps;

type ColumnMeta = {
  editable?: boolean;
  inputType?: 'text' | 'number' | 'currency' | 'select' | 'category-select' | 'template-autocomplete';
  options?: SelectOption[];
  projectId?: number;
  isGrouped?: boolean;
  onCommit?: (value: any, row: any, columnId: string) => Promise<void> | void;
  projectTypeCode?: string;
  onAutocompleteSelect?: (template: UnitCostTemplateSummary, row: any) => Promise<void> | void;
  align?: 'left' | 'center' | 'right';
};

const isTanStackProps = (props: EditableCellProps): props is TanStackProps =>
  typeof (props as TanStackProps).getValue === 'function' &&
  typeof (props as TanStackProps).row === 'object' &&
  typeof (props as TanStackProps).column === 'object';

function TanStackEditableCell({ getValue, row, column }: TanStackProps) {
  const meta = (column.columnDef.meta || {}) as ColumnMeta;
  const editable = meta.editable ?? false;
  const inputType = meta.inputType ?? 'text';
  const selectOptions = meta.options ?? [];

  const [value, setValue] = useState(() => getValue());
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
  const [suggestions, setSuggestions] = useState<UnitCostTemplateSummary[]>([]);
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const skipCommitRef = useRef(false);

  useEffect(() => {
    if (!editing && !saving) {
      setValue(getValue());
    }
  }, [getValue, editing, saving]);

  // Fetch categories when editing starts for category-select
  useEffect(() => {
    if (editing && inputType === 'category-select' && meta.projectId) {
      const fetchCategories = async () => {
        try {
          // Get activity from the current row to filter categories
          const activity = row?.original?.activity;

          // Build URL with optional activity filter
          let url = `/api/budget/categories?project_id=${meta.projectId}`;
          if (activity) {
            url += `&activity=${encodeURIComponent(activity)}`;
          }

          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            console.log('📋 Category API Response:', {
              url,
              activity,
              totalCategories: data.categories?.length,
              categories: data.categories
            });
            // core_fin_category doesn't have a level field
            // Filter for top-level categories (no parent_id)
            const topLevelCategories = data.categories.filter((c: any) => !c.parent_id);
            console.log('📋 Filtered Top-Level Categories:', topLevelCategories);
            setCategoryOptions(topLevelCategories.map((c: any) => ({
              value: String(c.category_id),
              label: c.name || c.code
            })));
          }
        } catch (err) {
          console.error('Error fetching categories:', err);
        }
      };
      void fetchCategories();
    }
  }, [editing, inputType, meta.projectId, row?.original?.activity]);

  const parseValue = (raw: any) => {
    if (raw === '' || raw === null || raw === undefined) {
      return null;
    }
    if (inputType === 'number' || inputType === 'currency') {
      const parsed = Number(raw);
      return Number.isNaN(parsed) ? null : parsed;
    }
    if (inputType === 'category-select') {
      // Category IDs should be numeric
      const parsed = Number(raw);
      console.log('📋 Parsing category value:', { raw, parsed, isNaN: Number.isNaN(parsed) });
      return Number.isNaN(parsed) ? null : parsed;
    }
    return raw;
  };

  const formatDisplay = (val: any) => {
    if (val === null || val === undefined || val === '') return '-';
    if (inputType === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Number(val));
    }
    if (inputType === 'number') {
      return Number(val).toLocaleString();
    }
    if (inputType === 'select') {
      const option = selectOptions.find((opt) => opt.value === val);
      return option ? option.label : val;
    }
    if (inputType === 'category-select') {
      // Use ColoredDotIndicator to show category hierarchy with visual indicators
      return null; // We'll render this in the JSX below instead
    }
    return String(val);
  };

  const commitChange = async () => {
    if (skipCommitRef.current) {
      skipCommitRef.current = false;
      setEditing(false);
      setError(null);
      return;
    }

    const initial = getValue();
    const parsed = parseValue(value);

    if (inputType === 'category-select') {
      console.log('📋 Category commit:', {
        columnId: column.id,
        initial,
        value,
        parsed,
        rowData: row.original
      });
    }

    const valuesEqual =
      (parsed === null && (initial === null || initial === undefined || initial === '')) ||
      String(parsed) === String(initial);

    if (valuesEqual) {
      if (inputType === 'category-select') {
        console.log('📋 Category values equal, skipping save');
      }
      setEditing(false);
      setError(null);
      setValue(initial);
      return;
    }

    if (!meta.onCommit) {
      console.error('📋 No onCommit handler!');
      setEditing(false);
      return;
    }

    try {
      setSaving(true);
      if (inputType === 'category-select') {
        console.log('📋 Calling onCommit with:', { parsed, columnId: column.id });
      }
      await meta.onCommit(parsed, row.original, column.id);
      if (inputType === 'category-select') {
        console.log('📋 Category saved successfully');
      }
      setError(null);
    } catch (err) {
      console.error('Failed to save cell value', err);
      setError(err instanceof Error ? err.message : 'Failed to save value');
      setValue(initial);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const handleBlur = () => {
    if (!editable) return;
    if (inputType === 'template-autocomplete') {
      setTimeout(() => {
        setSuggestionsVisible(false);
        void commitChange();
      }, 120);
      return;
    }
    void commitChange();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void commitChange();
    } else if (event.key === 'Escape') {
      setEditing(false);
      setError(null);
      setValue(getValue());
    }
  };

  useEffect(() => {
    if (!(editing && inputType === 'template-autocomplete')) {
      setSuggestions([]);
      setSuggestionsVisible(false);
      return;
    }

    const query = (value ?? '').toString().trim();
    if (query.length < 2) {
      setSuggestions([]);
      setSuggestionsVisible(false);
      return;
    }

    const controller = new AbortController();
    setSuggestionLoading(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ search: query });
        if (meta.projectTypeCode) {
          params.set('project_type_code', meta.projectTypeCode);
        }
        params.set('limit', '10');
        const response = await fetch(`/api/unit-costs/templates?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json();
        const list: UnitCostTemplateSummary[] = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.results)
            ? payload.results
            : Array.isArray(payload?.templates)
              ? payload.templates
              : [];
        setSuggestions(list.slice(0, 10));
        setSuggestionsVisible(true);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error('Failed to fetch unit cost templates', err);
        }
        setSuggestions([]);
        setSuggestionsVisible(false);
      } finally {
        setSuggestionLoading(false);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [editing, inputType, value, meta.projectTypeCode]);

  const handleSuggestionSelect = async (template: UnitCostTemplateSummary) => {
    skipCommitRef.current = true;
    setSuggestions([]);
    setSuggestionsVisible(false);
    setValue(template.item_name);

    try {
      if (meta.onAutocompleteSelect) {
        await meta.onAutocompleteSelect(template, row.original);
      } else if (meta.onCommit) {
        await meta.onCommit(template.item_name, row.original, column.id);
      }
    } catch (err) {
      console.error('Failed to apply template selection', err);
      setError(err instanceof Error ? err.message : 'Failed to apply template');
    } finally {
      setEditing(false);
    }
  };

  const getAlignmentClass = () => {
    if (meta.align === 'center') return 'text-center';
    if (meta.align === 'right') return 'text-end';
    if (inputType === 'currency' || inputType === 'number') return 'text-end';
    return '';
  };

  const getAlignmentStyle = (): React.CSSProperties => {
    if (meta.align === 'center') return { textAlign: 'center' };
    if (meta.align === 'right') return { textAlign: 'right' };
    if (inputType === 'currency' || inputType === 'number') return { textAlign: 'right' };
    return {};
  };

  return editing ? (
    inputType === 'select' || inputType === 'category-select' ? (
      <select
        autoFocus
        className={`form-select form-select-sm ${getAlignmentClass()}`}
        style={getAlignmentStyle()}
        value={value ?? ''}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={saving}
      >
        <option value="">Select…</option>
        {(inputType === 'category-select' ? categoryOptions : selectOptions).map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    ) : inputType === 'template-autocomplete' ? (
      <div className="position-relative">
        <input
          autoFocus
          className={`form-control form-control-sm ${getAlignmentClass()}`}
          style={getAlignmentStyle()}
          type="text"
          value={value ?? ''}
          onChange={(event) => {
            setValue(event.target.value);
            setSuggestionsVisible(true);
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={saving}
          placeholder="Search templates…"
        />
        {suggestionsVisible && (suggestions.length > 0 || suggestionLoading) && (
          <div className="position-absolute start-0 end-0 mt-1 rounded border border-secondary bg-dark shadow-lg" style={{ zIndex: 1055 }}>
            {suggestionLoading && (
              <div className="px-3 py-2 text-muted small">Searching…</div>
            )}
            {suggestions.map((template) => (
              <button
                key={template.template_id}
                type="button"
                className="dropdown-item text-light bg-transparent"
                style={{ whiteSpace: 'normal' }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  void handleSuggestionSelect(template);
                }}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <span className="fw-semibold text-light">{template.item_name}</span>
                  <span className="badge bg-secondary text-light">{template.default_uom_code}</span>
                </div>
                <div className="small text-muted">
                  {template.market_geography || '—'} · Usage {template.usage_count ?? 0}
                </div>
              </button>
            ))}
            {!suggestionLoading && suggestions.length === 0 && (
              <div className="px-3 py-2 text-muted small">No matches found.</div>
            )}
          </div>
        )}
      </div>
    ) : (
      <input
        autoFocus
        className={`form-control form-control-sm ${getAlignmentClass()}`}
        style={getAlignmentStyle()}
        type={inputType === 'number' || inputType === 'currency' ? 'number' : 'text'}
        value={value ?? ''}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={saving}
      />
    )
  ) : (
    <>
      {inputType === 'category-select' ? (
        <ColoredDotIndicator
          categoryL1Name={row.original.category_l1_name}
          categoryL2Name={row.original.category_l2_name}
          categoryL3Name={row.original.category_l3_name}
          categoryL4Name={row.original.category_l4_name}
          isGrouped={meta.isGrouped || false}
          onClick={() => editable && !saving && setEditing(true)}
        />
      ) : (
        <div
          onClick={() => editable && !saving && setEditing(true)}
          className={
            meta.align ?
              (meta.align === 'center' ? 'text-center' : meta.align === 'right' ? 'text-end' : '') :
              (inputType === 'currency' || inputType === 'number' ? 'text-end' : '')
          }
          style={{
            cursor: editable ? 'pointer' : 'default',
            minHeight: '1.5rem',
            textAlign: meta.align === 'center' ? 'center' : meta.align === 'right' ? 'right' : (inputType === 'currency' || inputType === 'number' ? 'right' : undefined)
          }}
        >
          {formatDisplay(getValue())}
          {saving && <span className="ms-2 spinner-border spinner-border-sm text-primary" />}
        </div>
      )}
      {error && <small className="text-danger d-block">{error}</small>}
    </>
  );
}

function LegacyEditableCell({
  value,
  type,
  options = [],
  editable = true,
  onSave,
  className = '',
  decimals = 2,
}: LegacyProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const formatDisplay = (val: string | number | null): string => {
    if (val === null || val === undefined) return '';

    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(Number(val));
      case 'number':
        return Number(val).toFixed(decimals);
      case 'date':
        return new Date(val).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      default:
        return String(val);
    }
  };

  const handleEdit = () => {
    if (!editable) return;
    setIsEditing(true);

    if (type === 'date' && value) {
      const date = new Date(value);
      setEditValue(date.toISOString().split('T')[0]);
    } else {
      setEditValue(value !== null ? String(value) : '');
    }
  };

  const commitValue = async (raw: string) => {
    let parsedValue: any = raw;

    switch (type) {
      case 'number':
      case 'currency':
        parsedValue = raw === '' ? null : parseFloat(raw);
        break;
      case 'date':
      case 'select':
      case 'text':
      default:
        parsedValue = raw;
    }

    await onSave(parsedValue);
  };

  const handleSave = () => {
    setIsEditing(false);

    if (editValue === String(value ?? '')) return;
    void commitValue(editValue);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSave();
    } else if (event.key === 'Escape') {
      setIsEditing(false);
    }
  };

  if (!editable) {
    return <div className={`editable-cell non-editable ${className}`}>{formatDisplay(value)}</div>;
  }

  if (isEditing) {
    if (type === 'select') {
      return (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={`editable-cell-input ${className}`}
        >
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={type === 'date' ? 'date' : type === 'currency' || type === 'number' ? 'number' : 'text'}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        step={type === 'number' ? '0.01' : undefined}
        className={`editable-cell-input ${className}`}
      />
    );
  }

  return (
    <div
      onClick={handleEdit}
      className={`editable-cell ${className}`}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => event.key === 'Enter' && handleEdit()}
    >
      {formatDisplay(value)}
    </div>
  );
}

export default function EditableCell(props: EditableCellProps) {
  if (isTanStackProps(props)) {
    return <TanStackEditableCell {...props} />;
  }
  return <LegacyEditableCell {...props} />;
}
