'use client';

import React from 'react';
import { ChevronRight, ChevronDown, Plus } from 'lucide-react';
import { CBadge, CButton } from '@coreui/react';
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

const STAGE_COLORS: Record<string, 'success' | 'info' | 'primary' | 'warning' | 'danger' | 'secondary'> = {
  Acquisition: 'success',
  'Planning & Engineering': 'info',
  Improvements: 'primary',
  Development: 'primary',
  Operations: 'info',
  Disposition: 'warning',
  Financing: 'danger',
};

const stageColor = (stage: string) => STAGE_COLORS[stage] || 'secondary';

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
  const primaryStage = category.activitys[0];
  const primaryTone = primaryStage ? `var(--cui-${stageColor(primaryStage)})` : 'var(--cui-primary)';

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
    <div>
      <div
        className="d-flex align-items-center gap-2 border rounded px-2 py-2"
        style={{
          marginLeft: `${depth * 16}px`,
          backgroundColor: isSelected
            ? `color-mix(in srgb, ${primaryTone} 16%, var(--cui-body-bg))`
            : 'var(--cui-body-bg)',
          borderStyle: 'solid',
          borderWidth: 1,
          borderColor: isSelected ? primaryTone : 'var(--cui-border-color)',
          borderLeftWidth: 3,
          borderLeftColor: primaryTone,
          cursor: 'pointer',
        }}
        onClick={handleClick}
      >
        <button
          type="button"
          className="btn btn-sm p-0 border-0 d-inline-flex align-items-center justify-content-center"
          style={{ width: 16, height: 16, color: 'var(--cui-secondary-color)' }}
          onClick={handleToggle}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )
          ) : (
            <span style={{ width: 16, display: 'inline-block' }} aria-hidden />
          )}
        </button>

        <div className="d-flex align-items-center flex-wrap gap-2 flex-grow-1 min-w-0">
          {category.activitys.length > 0 && (
            <span
              className="d-inline-flex align-items-center justify-content-center"
              style={{ color: primaryTone }}
            >
                <CIcon icon={LIFECYCLE_STAGE_ICONS[category.activitys[0]]} size="sm" />
            </span>
          )}
          <span className="fw-semibold text-truncate">{category.category_name}</span>
          {category.tags.slice(0, 2).map((tag) => (
            <CBadge key={tag} color="secondary" shape="rounded-pill">
              {tag}
            </CBadge>
          ))}
          {category.tags.length > 2 && (
            <CBadge color="light" shape="rounded-pill">
              +{category.tags.length - 2}
            </CBadge>
          )}
        </div>

        <div className="d-flex align-items-center gap-1">
          {category.activitys.map((stage) => (
            <CBadge key={stage} color={stageColor(stage)} shape="rounded-pill" title={stage}>
              {stage.charAt(0)}
            </CBadge>
          ))}
        </div>

        <CButton
          color="primary"
          variant="ghost"
          size="sm"
          onClick={handleAddSubcategory}
          title="Add Subcategory"
        >
          <Plus size={14} />
        </CButton>
      </div>

      {hasChildren && isExpanded && (
        <div className="mt-1 d-flex flex-column gap-1">
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
