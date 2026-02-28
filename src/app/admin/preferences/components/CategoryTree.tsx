'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { CButton, CCard, CCardBody, CCardHeader } from '@coreui/react';
import type { UnitCostCategoryHierarchy, UnitCostCategoryReference } from '@/types/benchmarks';
import CategoryTreeItem from './CategoryTreeItem';

interface CategoryTreeProps {
  categories: UnitCostCategoryHierarchy[];
  selectedCategory: UnitCostCategoryReference | null;
  expandedCategories: Set<number>;
  onSelectCategory: (category: UnitCostCategoryReference) => void;
  onToggleExpanded: (categoryId: number) => void;
  onAddCategory: () => void;
  onAddSubcategory: (parentCategory: UnitCostCategoryReference) => void;
}

export default function CategoryTree({
  categories,
  selectedCategory,
  expandedCategories,
  onSelectCategory,
  onToggleExpanded,
  onAddCategory,
  onAddSubcategory,
}: CategoryTreeProps) {
  const totalCategories = countCategories(categories);

  return (
    <CCard className="h-100">
      <CCardHeader
        className="d-flex align-items-center justify-content-between gap-2"
        style={{ backgroundColor: 'var(--surface-card-header)' }}
      >
        <div>
          <h6 className="mb-0">Categories</h6>
          <small className="text-medium-emphasis">{totalCategories} total</small>
        </div>
        <CButton color="primary" size="sm" onClick={onAddCategory} title="Add Category">
          <Plus size={14} className="me-1" />
          Add
        </CButton>
      </CCardHeader>
      <CCardBody className="p-2 overflow-auto">
        {categories.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-medium-emphasis mb-0">No categories match the selected filters</p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-1">
            {categories.map((category) => (
              <CategoryTreeItem
                key={category.category_id}
                category={category}
                selectedCategory={selectedCategory}
                expandedCategories={expandedCategories}
                onSelectCategory={onSelectCategory}
                onToggleExpanded={onToggleExpanded}
                onAddSubcategory={onAddSubcategory}
                depth={0}
              />
            ))}
          </div>
        )}
      </CCardBody>
    </CCard>
  );
}

// Helper function to count all categories recursively
function countCategories(categories: UnitCostCategoryHierarchy[]): number {
  return categories.reduce((count, cat) => {
    return count + 1 + countCategories(cat.children);
  }, 0);
}
