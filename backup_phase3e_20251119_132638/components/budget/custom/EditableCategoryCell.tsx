// Editable Category Cell - Cascading Dropdown for Budget Categories
// v1.0 · 2025-11-03

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CButton, CFormSelect } from '@coreui/react';
import type { BudgetItem } from '../ColumnDefinitions';

interface EditableCategoryCellProps {
  row: { original: BudgetItem };
  projectId: number;
  onCommit: (categoryIds: {
    category_l1_id: number | null;
    category_l2_id: number | null;
    category_l3_id: number | null;
    category_l4_id: number | null;
  }) => Promise<void>;
}

interface Category {
  category_id: number;
  name: string;
  code: string;
  level: number;
  parent_id: number | null;
}

export default function EditableCategoryCell({
  row,
  projectId,
  onCommit,
}: EditableCategoryCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  // Current selections
  const [selectedL1, setSelectedL1] = useState<number | null>(row.original.category_l1_id || null);
  const [selectedL2, setSelectedL2] = useState<number | null>(row.original.category_l2_id || null);
  const [selectedL3, setSelectedL3] = useState<number | null>(row.original.category_l3_id || null);
  const [selectedL4, setSelectedL4] = useState<number | null>(row.original.category_l4_id || null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch categories when editing starts
  useEffect(() => {
    if (isEditing && categories.length === 0) {
      fetchCategories();
    }
  }, [isEditing]);

  // Click outside to close
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleCancel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/budget/categories?project_id=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await onCommit({
        category_l1_id: selectedL1,
        category_l2_id: selectedL2,
        category_l3_id: selectedL3,
        category_l4_id: selectedL4,
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving category:', err);
    }
  };

  const handleCancel = () => {
    setSelectedL1(row.original.category_l1_id || null);
    setSelectedL2(row.original.category_l2_id || null);
    setSelectedL3(row.original.category_l3_id || null);
    setSelectedL4(row.original.category_l4_id || null);
    setIsEditing(false);
  };

  // Get categories for each level
  const l1Categories = categories.filter(c => c.level === 1);
  const l2Categories = categories.filter(c => c.level === 2 && c.parent_id === selectedL1);
  const l3Categories = categories.filter(c => c.level === 3 && c.parent_id === selectedL2);
  const l4Categories = categories.filter(c => c.level === 4 && c.parent_id === selectedL3);

  // Build breadcrumb for display
  const buildBreadcrumb = () => {
    const parts: string[] = [];
    if (selectedL1) {
      const cat = categories.find(c => c.category_id === selectedL1);
      if (cat) parts.push(cat.name);
    }
    if (selectedL2) {
      const cat = categories.find(c => c.category_id === selectedL2);
      if (cat) parts.push(cat.name);
    }
    if (selectedL3) {
      const cat = categories.find(c => c.category_id === selectedL3);
      if (cat) parts.push(cat.name);
    }
    if (selectedL4) {
      const cat = categories.find(c => c.category_id === selectedL4);
      if (cat) parts.push(cat.name);
    }
    return parts.length > 0 ? parts.join(' → ') : '-';
  };

  const displayValue = row.original.category_breadcrumb || buildBreadcrumb();

  if (!isEditing) {
    return (
      <div
        className="editable-cell-display"
        onClick={() => setIsEditing(true)}
        style={{
          cursor: 'pointer',
          padding: '4px 8px',
          minHeight: '32px',
          display: 'flex',
          alignItems: 'center',
        }}
        title="Click to edit category"
      >
        <span className="d-inline-block text-truncate" style={{ maxWidth: '260px' }}>
          {displayValue}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="editable-category-cell p-2 border rounded bg-light"
      style={{ minWidth: '320px', maxWidth: '400px', position: 'relative', zIndex: 1000 }}
    >
      {loading ? (
        <div className="text-center py-2">Loading categories...</div>
      ) : (
        <>
          <div className="mb-2">
            <label className="form-label mb-1 small">Level 1</label>
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
            >
              <option value="">Select L1...</option>
              {l1Categories.map(cat => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.name}
                </option>
              ))}
            </CFormSelect>
          </div>

          {selectedL1 && l2Categories.length > 0 && (
            <div className="mb-2">
              <label className="form-label mb-1 small">Level 2</label>
              <CFormSelect
                size="sm"
                value={selectedL2 || ''}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value) : null;
                  setSelectedL2(val);
                  setSelectedL3(null);
                  setSelectedL4(null);
                }}
              >
                <option value="">Select L2...</option>
                {l2Categories.map(cat => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.name}
                  </option>
                ))}
              </CFormSelect>
            </div>
          )}

          {selectedL2 && l3Categories.length > 0 && (
            <div className="mb-2">
              <label className="form-label mb-1 small">Level 3</label>
              <CFormSelect
                size="sm"
                value={selectedL3 || ''}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value) : null;
                  setSelectedL3(val);
                  setSelectedL4(null);
                }}
              >
                <option value="">Select L3...</option>
                {l3Categories.map(cat => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.name}
                  </option>
                ))}
              </CFormSelect>
            </div>
          )}

          {selectedL3 && l4Categories.length > 0 && (
            <div className="mb-2">
              <label className="form-label mb-1 small">Level 4</label>
              <CFormSelect
                size="sm"
                value={selectedL4 || ''}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value) : null;
                  setSelectedL4(val);
                }}
              >
                <option value="">Select L4...</option>
                {l4Categories.map(cat => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.name}
                  </option>
                ))}
              </CFormSelect>
            </div>
          )}

          <div className="d-flex gap-2 mt-2">
            <CButton color="primary" size="sm" onClick={handleSave}>
              Save
            </CButton>
            <CButton color="secondary" size="sm" onClick={handleCancel}>
              Cancel
            </CButton>
          </div>
        </>
      )}
    </div>
  );
}
