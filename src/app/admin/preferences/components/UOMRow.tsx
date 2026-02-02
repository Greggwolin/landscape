'use client';

import React, { useEffect, useRef, useState, forwardRef } from 'react';
import {
  CBadge,
  CButton,
  CFormCheck,
  CFormInput,
  CFormSelect,
  CTableDataCell,
  CTableRow,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilTrash, cilPencil, cilPlus } from '@coreui/icons';
import { MEASURE_CATEGORIES, UnitOfMeasure, UnitOfMeasureDraft, normalizeMeasureName } from '@/lib/measures';
import { SemanticBadge } from '@/components/ui/landscape';

type SaveResult = { ok: boolean; error?: string };

interface UOMRowProps {
  measure: UnitOfMeasure;
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onSave: (draft: UnitOfMeasureDraft) => Promise<SaveResult>;
  onCancel: () => void;
  onDelete: () => void;
  dragHandleAttributes?: any;
  dragHandleListeners?: any;
  dragStyle?: React.CSSProperties;
}

const formatContextLabel = (ctx: string) =>
  ctx
    .split('_')
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : ''))
    .join(' ');

const UOMRow = forwardRef<HTMLTableRowElement, UOMRowProps>(({
  measure,
  isEditing,
  isSaving,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  dragHandleAttributes,
  dragHandleListeners,
  dragStyle,
}, ref) => {
  const contexts = Array.isArray(measure.usage_contexts) ? measure.usage_contexts : [];

  const [draft, setDraft] = useState<UnitOfMeasureDraft>({
    measure_code: measure.measure_code,
    measure_name: measure.measure_name,
    measure_category: measure.measure_category,
    is_system: measure.is_system,
  });
  const [error, setError] = useState<string | null>(null);
  const rowRef = useRef<HTMLTableRowElement>(null);

  const combinedRef = (node: HTMLTableRowElement | null) => {
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      (ref as React.MutableRefObject<HTMLTableRowElement | null>).current = node;
    }
    rowRef.current = node;
  };

  useEffect(() => {
    if (isEditing) {
      setDraft({
        measure_code: measure.measure_code,
        measure_name: measure.measure_name,
        measure_category: measure.measure_category,
        is_system: measure.is_system,
      });
      setError(null);
      if (rowRef.current) {
        const input = rowRef.current.querySelector('input[name="measure_name"]') as HTMLInputElement | null;
        input?.focus();
      }
    }
  }, [isEditing, measure]);

  const handleSave = async () => {
    setError(null);
    const result = await onSave({
      ...draft,
      measure_name: normalizeMeasureName(draft.measure_name),
      measure_code: measure.measure_code,
    });
    if (!result.ok) {
      setError(result.error ?? 'Unable to save');
    }
  };

  const handleCancel = () => {
    setDraft({
      measure_code: measure.measure_code,
      measure_name: measure.measure_name,
      measure_category: measure.measure_category,
      is_system: measure.is_system,
    });
    setError(null);
    onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (rowRef.current && active && rowRef.current.contains(active)) return;
      if (isEditing && !isSaving) {
        handleSave();
      }
    });
  };

  if (!isEditing) {
    return (
      <CTableRow
        ref={combinedRef}
        onClick={onEdit}
        className="cursor-pointer"
        style={{ cursor: 'pointer', ...(dragStyle || {}) }}
      >
        <CTableDataCell style={{ width: '40px' }} className="text-muted">
          <span {...dragHandleAttributes} {...dragHandleListeners} style={{ cursor: 'grab' }}>⋮⋮</span>
        </CTableDataCell>
        <CTableDataCell className="uom-code-cell" style={{ width: '90px' }}>
          {measure.measure_code}
        </CTableDataCell>
        <CTableDataCell style={{ width: '240px' }} className={measure.is_system ? '' : 'uom-inactive'}>
          {measure.measure_name}
          {!measure.is_system && (
            <CBadge color="secondary" size="sm" className="ms-2">
              Inactive
            </CBadge>
          )}
        </CTableDataCell>
        <CTableDataCell style={{ width: '160px' }}>
          <SemanticBadge
            intent="category"
            value={measure.measure_category}
            className="uom-category-badge"
          >
            {MEASURE_CATEGORIES.find((opt) => opt.value === measure.measure_category)?.label ?? measure.measure_category}
          </SemanticBadge>
        </CTableDataCell>
        <CTableDataCell style={{ width: '200px' }}>
          <div className="d-flex flex-wrap gap-1">
              {contexts.length === 0 ? (
                <span className="text-muted small">—</span>
              ) : (
                contexts.map((ctx) => (
                  <SemanticBadge
                    key={ctx}
                    intent="category"
                    value={ctx}
                    title={ctx}
                    className="uom-context-badge"
                  >
                    {formatContextLabel(ctx)}
                  </SemanticBadge>
                ))
              )}
          </div>
        </CTableDataCell>
        <CTableDataCell style={{ width: '160px' }}>
          <div className="uom-actions">
            <CButton
              size="sm"
              color="secondary"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <CIcon icon={cilPlus} className="me-1" />
              Add
            </CButton>
            <CButton
              size="sm"
              color="secondary"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <CIcon icon={cilPencil} className="me-1" />
              Edit
            </CButton>
            <CButton
              size="sm"
              color="danger"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <CIcon icon={cilTrash} className="me-1" />
              Delete
            </CButton>
          </div>
        </CTableDataCell>
      </CTableRow>
    );
  }

  return (
    <CTableRow ref={combinedRef} className="uom-row-editing" style={dragStyle}>
      <CTableDataCell style={{ width: '40px' }} className="text-muted">
        <span {...dragHandleAttributes} {...dragHandleListeners} style={{ cursor: 'grab' }}>⋮⋮</span>
      </CTableDataCell>
      <CTableDataCell className="uom-code-cell" style={{ width: '90px' }}>
        <CFormInput
          value={measure.measure_code}
          disabled
          size="sm"
          aria-label="Measure code"
        />
      </CTableDataCell>
      <CTableDataCell style={{ width: '240px' }}>
        <CFormInput
          name="measure_name"
          value={draft.measure_name}
          onChange={(e) => setDraft((prev) => ({ ...prev, measure_name: e.target.value }))}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={isSaving}
          maxLength={100}
          size="sm"
        />
      </CTableDataCell>
      <CTableDataCell style={{ width: '160px' }}>
        <CFormSelect
          value={draft.measure_category}
          onChange={(e) =>
            setDraft((prev) => ({
              ...prev,
              measure_category: e.target.value as UnitOfMeasureDraft['measure_category'],
            }))
          }
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={isSaving}
          size="sm"
        >
          {MEASURE_CATEGORIES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </CFormSelect>
      </CTableDataCell>
      <CTableDataCell style={{ width: '200px' }}>
        <div className="d-flex flex-wrap gap-1">
          {contexts.length === 0 ? (
            <span className="text-muted small">—</span>
          ) : (
            contexts.map((ctx) => (
              <SemanticBadge
                key={ctx}
                intent="category"
                value={ctx}
                title={ctx}
                className="uom-context-badge"
              >
                {formatContextLabel(ctx)}
              </SemanticBadge>
            ))
          )}
        </div>
      </CTableDataCell>
      <CTableDataCell style={{ width: '160px' }}>
        <div className="uom-actions">
          <CFormCheck
            id={`uom-active-${measure.measure_code}`}
            checked={draft.is_system}
            onChange={(e) => setDraft((prev) => ({ ...prev, is_system: e.target.checked }))}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            disabled={isSaving}
            label="Active"
          />
          <CButton color="primary" size="sm" onClick={handleSave} disabled={isSaving}>
            Save
          </CButton>
          <CButton color="secondary" size="sm" variant="ghost" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </CButton>
        </div>
        {error && (
          <div className="text-danger small mt-1" role="alert">
            {error}
          </div>
        )}
      </CTableDataCell>
    </CTableRow>
  );
});
; // ensure statement termination

UOMRow.displayName = 'UOMRow';

export default UOMRow;
