'use client';

import React from 'react';
import { Plus } from 'lucide-react';
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
    <div className="category-tree">
      <div className="tree-header">
        <div className="tree-header-content">
          <div className="tree-header-left">
            <h5>Categories</h5>
            <span className="tree-count">{totalCategories} total</span>
          </div>
          <p className="tree-header-description">
            Browse and select categories to view details
          </p>
        </div>
        <button
          className="btn btn-sm btn-primary"
          onClick={onAddCategory}
          title="Add Category"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="tree-content">
        {categories.length === 0 ? (
          <div className="tree-empty">
            <p className="text-muted">No categories match the selected filters</p>
          </div>
        ) : (
          <div className="tree-list">
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
      </div>
    </div>
  );
}

// Helper function to count all categories recursively
function countCategories(categories: UnitCostCategoryHierarchy[]): number {
  return categories.reduce((count, cat) => {
    return count + 1 + countCategories(cat.children);
  }, 0);
}
