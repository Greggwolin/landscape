'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  CFormCheck,
  CFormInput,
  CFormSelect,
  CTableDataCell,
  CTableRow,
} from '@coreui/react';
import { SemanticButton } from '@/components/ui/landscape';
import { MEASURE_CATEGORIES, UnitOfMeasureDraft, normalizeMeasureCode, normalizeMeasureName } from '@/lib/measures';

type SaveResult = { ok: boolean; error?: string };

interface AddUOMRowProps {
  onSave: (draft: UnitOfMeasureDraft) => Promise<SaveResult>;
  onCancel: () => void;
  isSaving?: boolean;
}

const AddUOMRow: React.FC<AddUOMRowProps> = ({ onSave, onCancel, isSaving = false }) => {
  const [draft, setDraft] = useState<UnitOfMeasureDraft>({
    measure_code: '',
    measure_name: '',
    measure_category: MEASURE_CATEGORIES[0].value,
    is_system: true,
  });
  const [error, setError] = useState<string | null>(null);
  const rowRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (rowRef.current) {
      const input = rowRef.current.querySelector('input[name="measure_code"]') as HTMLInputElement | null;
      input?.focus();
    }
  }, []);

  const handleSave = async () => {
    setError(null);
    const payload: UnitOfMeasureDraft = {
      measure_code: normalizeMeasureCode(draft.measure_code),
      measure_name: normalizeMeasureName(draft.measure_name),
      measure_category: draft.measure_category,
      is_system: draft.is_system,
    };
    const result = await onSave(payload);
    if (!result.ok) {
      setError(result.error ?? 'Unable to save');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleBlur = () => {
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (rowRef.current && active && rowRef.current.contains(active)) return;
      handleSave();
    });
  };

  return (
    <CTableRow ref={rowRef} className="uom-row-editing">
      <CTableDataCell style={{ width: '40px' }}>
        <span className="text-muted small">⋮⋮</span>
      </CTableDataCell>
      <CTableDataCell className="uom-code-cell" style={{ width: '90px' }}>
        <CFormInput
          name="measure_code"
          value={draft.measure_code}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, measure_code: e.target.value.toUpperCase() }))
          }
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={isSaving}
          maxLength={10}
          placeholder="Code"
          size="sm"
        />
      </CTableDataCell>
      <CTableDataCell style={{ width: '240px' }}>
        <CFormInput
          name="measure_name"
          value={draft.measure_name}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, measure_name: e.target.value }))
          }
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={isSaving}
          maxLength={100}
          placeholder="Name"
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
          <option value="">Select category</option>
          {MEASURE_CATEGORIES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </CFormSelect>
      </CTableDataCell>
      <CTableDataCell style={{ width: '160px' }}>
        <div className="uom-actions">
          <CFormCheck
            id="uom-add-active"
            checked={draft.is_system}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, is_system: e.target.checked }))
            }
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            disabled={isSaving}
            label="Active"
          />
          <SemanticButton intent="primary-action" size="sm" onClick={handleSave} disabled={isSaving}>
            Save
          </SemanticButton>
          <SemanticButton intent="secondary-action" size="sm" variant="ghost" onClick={onCancel} disabled={isSaving}>
            Cancel
          </SemanticButton>
        </div>
        {error && (
          <div className="text-danger small mt-1" role="alert">
            {error}
          </div>
        )}
      </CTableDataCell>
    </CTableRow>
  );
};

export default AddUOMRow;
