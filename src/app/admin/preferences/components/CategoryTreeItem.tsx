'use client';

import React from 'react';
import { ChevronRight, ChevronDown, Plus } from 'lucide-react';
import CIcon from '@coreui/icons-react';
import type { UnitCostCategoryHierarchy, UnitCostCategoryReference } from '@/types/benchmarks';
import { LIFECYCLE_STAGE_ICONS } from './lifecycle-icons';

interface CategoryTreeItemProps {
  category: UnitCostCategoryHierarchy;
  selectedCategory: UnitCostCategoryReference | null;
  expandedCategories: Set<number>;
  onSelectCategory: (category: UnitCostCategoryReference) => void;
  onToggleExpanded: (categoryId: number) => void;
  onAddSubcategory: (parentCategory: UnitCostCategoryReference) => void;
  depth?: number;
  parentId?: number;
  parentName?: string;
}

export default function CategoryTreeItem({
  category,
  selectedCategory,
  expandedCategories,
  onSelectCategory,
  onToggleExpanded,
  onAddSubcategory,
  depth = 0,
  parentId,
  parentName,
}: CategoryTreeItemProps) {
  const hasChildren = category.children.length > 0;
  const isExpanded = expandedCategories.has(category.category_id);
  const isSelected = selectedCategory?.category_id === category.category_id;

  const handleClick = () => {
    onSelectCategory({
      category_id: category.category_id,
      category_name: category.category_name,
      activitys: category.activitys,
      tags: category.tags,
      sort_order: category.sort_order,
      is_active: category.is_active,
      has_children: hasChildren,
      item_count: 0, // Will be populated from backend
      parent: parentId,
      parent_name: parentName,
    });
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggleExpanded(category.category_id);
    }
  };

  const handleAddSubcategory = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddSubcategory({
      category_id: category.category_id,
      category_name: category.category_name,
      activitys: category.activitys,
      tags: category.tags,
      sort_order: category.sort_order,
      is_active: category.is_active,
      has_children: hasChildren,
      item_count: 0,
    });
  };

  return (
    <div className="category-tree-item">
      <div
        className={`tree-item-row ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
        onClick={handleClick}
      >
        <div className="tree-item-expand" onClick={handleToggle}>
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )
          ) : (
            <span style={{ width: 16, display: 'inline-block' }} />
          )}
        </div>

        <div className="tree-item-content">
          <div className="tree-item-header">
            {category.activitys.length > 0 && (
              <span className="tree-item-lifecycle-icon">
                <CIcon icon={LIFECYCLE_STAGE_ICONS[category.activitys[0]]} size="sm" />
              </span>
            )}
            <span className="tree-item-name">{category.category_name}</span>
            {category.tags.length > 0 && (
              <div className="tree-item-tags">
                {category.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="tag-badge">
                    {tag}
                  </span>
                ))}
                {category.tags.length > 2 && (
                  <span className="tag-badge-more">+{category.tags.length - 2}</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="tree-item-meta">
          {category.activitys.map((stage) => (
            <span key={stage} className="lifecycle-badge" data-stage={stage}>
              {stage.charAt(0)}
            </span>
          ))}
        </div>

        <button
          className="btn btn-sm btn-success tree-item-add-sub"
          onClick={handleAddSubcategory}
          title="Add Subcategory"
        >
          <Plus size={14} />
        </button>
      </div>

      {hasChildren && isExpanded && (
        <div className="tree-item-children">
          {category.children.map((child) => (
            <CategoryTreeItem
              key={child.category_id}
              category={child}
              selectedCategory={selectedCategory}
              expandedCategories={expandedCategories}
              onSelectCategory={onSelectCategory}
              onToggleExpanded={onToggleExpanded}
              onAddSubcategory={onAddSubcategory}
              depth={depth + 1}
              parentId={category.category_id}
              parentName={category.category_name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
