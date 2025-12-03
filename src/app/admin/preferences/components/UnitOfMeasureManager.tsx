'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CAlert, CSpinner } from '@coreui/react';
import { useToast } from '@/components/ui/toast';
import {
  MEASURE_CATEGORY_SET,
  UnitOfMeasure,
  UnitOfMeasureDraft,
  normalizeMeasureCategory,
  normalizeMeasureCode,
  normalizeMeasureName,
  sortMeasures,
  getDefaultUsageContexts,
} from '@/lib/measures';
import UOMTable from './UOMTable';
import DeleteUOMModal from './DeleteUOMModal';
import './uom-manager.css';

type SaveResult = { ok: boolean; error?: string };

const UnitOfMeasureManager: React.FC = () => {
  const { showToast } = useToast();
  const [measures, setMeasures] = useState<UnitOfMeasure[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<UnitOfMeasure | null>(null);

  const existingCodes = useMemo(
    () => new Set(measures.map((m) => normalizeMeasureCode(m.measure_code))),
    [measures]
  );

  useEffect(() => {
    loadMeasures();
  }, []);

  const loadMeasures = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/measures', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to fetch measures');
      }
      const normalized = (payload.data || []).map((item: UnitOfMeasure) => {
        const contexts = Array.isArray(item.usage_contexts) ? item.usage_contexts : [];
        return {
          ...item,
          measure_category: normalizeMeasureCategory(item.measure_category),
          usage_contexts: contexts.length > 0 ? contexts : getDefaultUsageContexts(item.measure_code),
        };
      });
      setMeasures(sortMeasures(normalized));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch measures';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const validateDraft = (draft: UnitOfMeasureDraft, currentCode?: string): string | null => {
    const normalizedCode = normalizeMeasureCode(draft.measure_code);
    const normalizedCurrent = currentCode ? normalizeMeasureCode(currentCode) : null;
    if (!/^[A-Za-z0-9]{2,10}$/.test(normalizedCode)) {
      return 'Code must be 2-10 alphanumeric characters';
    }
    const name = normalizeMeasureName(draft.measure_name);
    if (!name) return 'Name is required';
    if (name.length > 100) return 'Name must be 100 characters or fewer';
    const category = normalizeMeasureCategory(draft.measure_category);
    if (!MEASURE_CATEGORY_SET.has(category)) {
      return 'Please select a valid category';
    }
    if (existingCodes.has(normalizedCode) && normalizedCode !== normalizedCurrent) {
      return 'This code already exists';
    }
    return null;
  };

  const handleAddClick = () => {
    setEditingCode(null);
    setIsAdding(true);
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
  };

  const handleSaveNew = async (draft: UnitOfMeasureDraft): Promise<SaveResult> => {
    const normalizedDraft: UnitOfMeasureDraft = {
      ...draft,
      measure_code: normalizeMeasureCode(draft.measure_code),
      measure_name: normalizeMeasureName(draft.measure_name),
      measure_category: normalizeMeasureCategory(draft.measure_category),
    };
    const validationError = validateDraft(draft);
    if (validationError) {
      return { ok: false, error: validationError };
    }

    setSavingCode('NEW');
    try {
      const response = await fetch('/api/admin/measures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedDraft),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to create measure');
      }
      setMeasures((prev) =>
        sortMeasures([
          ...prev,
          {
            ...payload.data,
            measure_category: normalizeMeasureCategory(payload.data.measure_category),
            usage_contexts:
              Array.isArray(payload.data.usage_contexts) && payload.data.usage_contexts.length > 0
                ? payload.data.usage_contexts
                : getDefaultUsageContexts(payload.data.measure_code),
          },
        ])
      );
      setIsAdding(false);
      showToast('Unit added', 'success');
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create measure';
      return { ok: false, error: message };
    } finally {
      setSavingCode(null);
    }
  };

  const handleStartEdit = (code: string) => {
    setIsAdding(false);
    setEditingCode(code);
  };

  const handleCancelEdit = () => {
    setEditingCode(null);
  };

  const handleSaveEdit = async (
    code: string,
    draft: UnitOfMeasureDraft
  ): Promise<SaveResult> => {
    const normalizedDraft: UnitOfMeasureDraft = {
      ...draft,
      measure_name: normalizeMeasureName(draft.measure_name),
      measure_category: normalizeMeasureCategory(draft.measure_category),
      measure_code: normalizeMeasureCode(code),
    };
    const validationError = validateDraft(normalizedDraft, code);
    if (validationError) {
      return { ok: false, error: validationError };
    }
    setSavingCode(code);
    try {
      const response = await fetch(`/api/admin/measures/${encodeURIComponent(code)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          measure_name: normalizedDraft.measure_name,
          measure_category: normalizedDraft.measure_category,
          is_system: normalizedDraft.is_system,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to update measure');
      }
      setMeasures((prev) =>
        sortMeasures(
          prev.map((item) =>
            normalizeMeasureCode(item.measure_code) === normalizeMeasureCode(code)
            ? {
                ...payload.data,
                measure_category: normalizeMeasureCategory(payload.data.measure_category),
                usage_contexts:
                  Array.isArray(payload.data.usage_contexts) && payload.data.usage_contexts.length > 0
                    ? payload.data.usage_contexts
                    : getDefaultUsageContexts(payload.data.measure_code),
              }
              : item
          )
        )
      );
      setEditingCode(null);
      showToast('Unit updated', 'success');
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update measure';
      return { ok: false, error: message };
    } finally {
      setSavingCode(null);
    }
  };

  const handleRequestDelete = (measure: UnitOfMeasure) => {
    setPendingDelete(measure);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    const code = pendingDelete.measure_code;
    setSavingCode(code);
    try {
      const response = await fetch(`/api/admin/measures/${encodeURIComponent(code)}`, {
        method: 'DELETE',
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to deactivate measure');
      }
      setMeasures((prev) =>
        prev.map((item) =>
          normalizeMeasureCode(item.measure_code) === normalizeMeasureCode(code)
            ? {
                ...payload.data,
                measure_category: normalizeMeasureCategory(payload.data.measure_category),
                usage_contexts:
                  Array.isArray(payload.data.usage_contexts) && payload.data.usage_contexts.length > 0
                    ? payload.data.usage_contexts
                    : getDefaultUsageContexts(payload.data.measure_code),
              }
            : item
        )
      );
      setEditingCode(null);
      showToast('Unit deactivated', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deactivate measure';
      setError(message);
    } finally {
      setSavingCode(null);
      setPendingDelete(null);
    }
  };

  const handleReorder = async (orderedCodes: string[]) => {
    // Optimistically reorder
    setMeasures((prev) => {
      const lookup = new Map(prev.map((m) => [normalizeMeasureCode(m.measure_code), m]));
      const ordered = orderedCodes
        .map((code, idx) => {
          const entry = lookup.get(normalizeMeasureCode(code));
          return entry ? { ...entry, sort_order: idx + 1 } : null;
        })
        .filter(Boolean) as UnitOfMeasure[];
      return ordered.length > 0 ? ordered : prev;
    });

    try {
      await fetch('/api/admin/uom/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uom_codes: orderedCodes }),
      });
      showToast('Order updated', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reorder';
      setError(message);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <CAlert color="danger" className="mb-2">
          {error}
        </CAlert>
      )}

      {loading && measures.length === 0 ? (
        <div className="d-flex align-items-center gap-2 py-4">
          <CSpinner />
          <div>Loading measures...</div>
        </div>
      ) : (
        <UOMTable
          measures={measures}
          isAdding={isAdding}
          onAddClick={handleAddClick}
          onCancelAdd={handleCancelAdd}
          onSaveNew={handleSaveNew}
          editingCode={editingCode}
          savingCode={savingCode}
          onStartEdit={handleStartEdit}
          onCancelEdit={handleCancelEdit}
          onSaveEdit={handleSaveEdit}
          onRequestDelete={handleRequestDelete}
          loading={loading}
          onReorder={handleReorder}
        />
      )}

      <DeleteUOMModal
        open={Boolean(pendingDelete)}
        measure={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
        isProcessing={Boolean(savingCode)}
      />
    </div>
  );
};

export default UnitOfMeasureManager;
