// Category Editor Row - Expanded row for editing budget categories
// v1.0 · 2025-11-03

'use client';

import React, { useState, useEffect } from 'react';
import { CFormSelect } from '@coreui/react';
import { SemanticButton } from '@/components/ui/landscape';
import type { BudgetItem } from '../ColumnDefinitions';
import type { BudgetMode } from '../ModeSelector';

interface CategoryEditorRowProps {
  item: BudgetItem;
  projectId: number;
  mode: BudgetMode;
  onSave: (categoryIds: {
    category_l1_id: number | null;
    category_l2_id: number | null;
    category_l3_id: number | null;
    category_l4_id: number | null;
  }) => Promise<void>;
  onCancel: () => void;
}

interface Category {
  category_id: number;
  name: string;
  code: string;
  level: number;
  parent_id: number | null;
}

export default function CategoryEditorRow({
  item,
  projectId,
  mode,
  onSave,
  onCancel,
}: CategoryEditorRowProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Current selections
  const [selectedL1, setSelectedL1] = useState<number | null>(item.category_l1_id || null);
  const [selectedL2, setSelectedL2] = useState<number | null>(item.category_l2_id || null);
  const [selectedL3, setSelectedL3] = useState<number | null>(item.category_l3_id || null);
  const [selectedL4, setSelectedL4] = useState<number | null>(item.category_l4_id || null);
  const [escPressCount, setEscPressCount] = useState(0);

  // Determine max levels based on mode
  const maxLevels = mode === 'napkin' ? 1 : mode === 'standard' ? 2 : 4;

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/budget/categories?project_id=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('[CategoryEditorRow] Fetched categories:', data.categories);
        console.log('[CategoryEditorRow] Level breakdown:', {
          level1: data.categories.filter((c: any) => c.level === 1).length,
          level2: data.categories.filter((c: any) => c.level === 2).length,
          level3: data.categories.filter((c: any) => c.level === 3).length,
          level4: data.categories.filter((c: any) => c.level === 4).length,
        });
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  // Check if any values have changed
  const hasChanges = () => {
    if (selectedL1 !== (item.category_l1_id || null)) return true;
    if (maxLevels >= 2 && selectedL2 !== (item.category_l2_id || null)) return true;
    if (maxLevels >= 3 && selectedL3 !== (item.category_l3_id || null)) return true;
    if (maxLevels >= 4 && selectedL4 !== (item.category_l4_id || null)) return true;
    return false;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        category_l1_id: selectedL1,
        category_l2_id: maxLevels >= 2 ? selectedL2 : null,
        category_l3_id: maxLevels >= 3 ? selectedL3 : null,
        category_l4_id: maxLevels >= 4 ? selectedL4 : null,
      });
    } catch (err) {
      console.error('Error saving category:', err);
    } finally {
      setSaving(false);
    }
  };

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();

        if (hasChanges()) {
          if (escPressCount === 0) {
            // First ESC - prompt to save
            setEscPressCount(1);
            const confirmSave = window.confirm('You have unsaved changes. Would you like to save them?');
            if (confirmSave) {
              void handleSave();
            } else {
              // User chose not to save, cancel
              onCancel();
            }
            setEscPressCount(0);
          }
        } else {
          // No changes, just cancel
          onCancel();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedL1, selectedL2, selectedL3, selectedL4, escPressCount, hasChanges, onCancel]);

  // Get categories for each level
  const l1Categories = categories.filter(c => c.level === 1);
  // Use Number() to ensure type matching
  const l2Categories = categories.filter(c => c.level === 2 && Number(c.parent_id) === Number(selectedL1));
  const l3Categories = categories.filter(c => c.level === 3 && Number(c.parent_id) === Number(selectedL2));
  const l4Categories = categories.filter(c => c.level === 4 && Number(c.parent_id) === Number(selectedL3));

  // Debug logging
  console.log('[CategoryEditorRow] Selected L1:', selectedL1, typeof selectedL1);
  console.log('[CategoryEditorRow] All L2 categories:', categories.filter(c => c.level === 2).map(c => ({
    id: c.category_id,
    name: c.name,
    parent_id: c.parent_id,
    parent_id_type: typeof c.parent_id
  })));
  console.log('[CategoryEditorRow] Filtered L2 categories:', l2Categories);

  if (loading) {
    return (
      <div className="p-3 text-center text-muted">
        Loading categories...
      </div>
    );
  }

  return (
    <div className="p-3 bg-light border-top border-bottom">
      <div className="row g-2">
        {/* Level 1 */}
        <div className={maxLevels === 1 ? 'col-md-10' : maxLevels >= 3 ? 'col-md-3' : 'col-md-6'}>
          <label className="form-label small mb-1">Category</label>
          <CFormSelect
            size="sm"
            value={selectedL1 || ''}
            onChange={(e) => {
              const val = e.target.value ? parseInt(e.target.value) : null;
              setSelectedL1(val);
              setSelectedL2(null);
              setSelectedL3(null);
              setSelectedL4(null);
            }}
            style={{ maxWidth: '25ch' }}
          >
            <option value="">Select category...</option>
            {l1Categories.map(cat => (
              <option key={cat.category_id} value={cat.category_id}>
                {cat.name}
              </option>
            ))}
          </CFormSelect>
        </div>

        {/* Level 2 - Show if maxLevels >= 2 and L1 is selected */}
        {maxLevels >= 2 && selectedL1 && (
          <div className={maxLevels >= 3 ? 'col-md-3' : 'col-md-6'}>
            <label className="form-label small mb-1">Level 2</label>
            <CFormSelect
              size="sm"
              value={selectedL2 || ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value) : null;
                setSelectedL2(val);
                setSelectedL3(null);
                setSelectedL4(null);
              }}
              disabled={l2Categories.length === 0}
              style={{ maxWidth: '25ch' }}
            >
              <option value="">{l2Categories.length === 0 ? 'No L2 categories available' : 'Select L2...'}</option>
              {l2Categories.map(cat => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.name}
                </option>
              ))}
            </CFormSelect>
          </div>
        )}

        {/* Level 3 - Show if maxLevels >= 3 and L2 is selected */}
        {maxLevels >= 3 && selectedL2 && (
          <div className="col-md-3">
            <label className="form-label small mb-1">Level 3</label>
            <CFormSelect
              size="sm"
              value={selectedL3 || ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value) : null;
                setSelectedL3(val);
                setSelectedL4(null);
              }}
              disabled={l3Categories.length === 0}
              style={{ maxWidth: '25ch' }}
            >
              <option value="">{l3Categories.length === 0 ? 'No L3 categories available' : 'Select L3...'}</option>
              {l3Categories.map(cat => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.name}
                </option>
              ))}
            </CFormSelect>
          </div>
        )}

        {/* Level 4 - Show if maxLevels >= 4 and L3 is selected */}
        {maxLevels >= 4 && selectedL3 && (
          <div className="col-md-3">
            <label className="form-label small mb-1">Level 4</label>
            <CFormSelect
              size="sm"
              value={selectedL4 || ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value) : null;
                setSelectedL4(val);
              }}
              disabled={l4Categories.length === 0}
              style={{ maxWidth: '25ch' }}
            >
              <option value="">{l4Categories.length === 0 ? 'No L4 categories available' : 'Select L4...'}</option>
              {l4Categories.map(cat => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.name}
                </option>
              ))}
            </CFormSelect>
          </div>
        )}

        {/* Save Button */}
        <div className="col-md-auto ms-auto d-flex align-items-end">
          <div className="d-flex gap-2">
            <SemanticButton
              intent="secondary-action"
              size="sm"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </SemanticButton>
            <SemanticButton
              intent="primary-action"
              size="sm"
              onClick={handleSave}
              disabled={saving || !selectedL1}
            >
              {saving ? 'Saving...' : 'Save'}
            </SemanticButton>
          </div>
        </div>
      </div>
    </div>
  );
}
