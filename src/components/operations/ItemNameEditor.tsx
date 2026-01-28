'use client';

import React, { useRef, useEffect } from 'react';
import { CFormSelect } from '@coreui/react';
import {
  useOpexCategoriesByParent,
  OpexCategory
} from '@/hooks/useOpexCategories';

interface ItemNameEditorProps {
  /** Current category ID of the expense */
  currentCategoryId: number | null;
  /** Parent category string (e.g., 'taxes_insurance') for filtering options */
  parentCategory: string;
  /** Current display label (for initial search value) */
  currentLabel: string;
  /** Callback when a category is selected */
  onSave: (categoryId: number, categoryName: string) => void;
  /** Callback when editing is cancelled */
  onCancel: () => void;
}

/**
 * ItemNameEditor - Dropdown picklist for editing expense item names
 *
 * Uses CFormSelect for native browser dropdown styling that matches
 * other picklists in the app (System Picklists, etc.)
 */
export function ItemNameEditor({
  currentCategoryId,
  parentCategory,
  onSave,
  onCancel
}: ItemNameEditorProps) {
  const selectRef = useRef<HTMLSelectElement>(null);

  // Fetch categories for this parent
  const { categories, isLoading } = useOpexCategoriesByParent(parentCategory);

  // Focus and open the select on mount
  useEffect(() => {
    if (selectRef.current && !isLoading) {
      selectRef.current.focus();
      // Programmatically open the dropdown
      selectRef.current.click();
    }
  }, [isLoading]);

  // Handle selection change
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = parseInt(e.target.value, 10);
    if (isNaN(selectedId)) {
      onCancel();
      return;
    }

    const selectedCategory = categories.find(c => c.category_id === selectedId);
    if (selectedCategory) {
      onSave(selectedCategory.category_id, selectedCategory.category_name);
    } else {
      onCancel();
    }
  };

  // Handle blur - cancel if no selection made
  const handleBlur = () => {
    // Small delay to allow change event to fire first
    setTimeout(() => {
      onCancel();
    }, 100);
  };

  // Handle keyboard
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  if (isLoading) {
    return <span className="text-muted small">Loading...</span>;
  }

  return (
    <CFormSelect
      ref={selectRef}
      size="sm"
      value={currentCategoryId?.toString() || ''}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      style={{ width: 'auto', minWidth: '180px' }}
    >
      <option value="">Select category...</option>
      {categories.map((cat: OpexCategory) => (
        <option key={cat.category_id} value={cat.category_id}>
          {cat.account_number} — {cat.category_name}
        </option>
      ))}
    </CFormSelect>
  );
}

export default ItemNameEditor;
