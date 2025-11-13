'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type {
  UnitCostCategoryReference,
  UnitCostCategoryHierarchy,
  CategoryTag,
  LifecycleStage,
} from '@/types/benchmarks';
import { fetchCategories, fetchTags, buildCategoryHierarchy } from '@/lib/api/categories';
import { useToast } from '@/components/ui/toast';
import LifecycleStageFilter from './LifecycleStageFilter';
import CategoryTree from './CategoryTree';
import CategoryDetailPanel from './CategoryDetailPanel';
import AddCategoryModal from './AddCategoryModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import MobileWarning from './MobileWarning';
import './category-taxonomy.css';

const LIFECYCLE_STAGES: LifecycleStage[] = [
  'Acquisition',
  'Development',
  'Operations',
  'Disposition',
  'Financing',
];

const LIFECYCLE_STAGE_ALIASES: Record<string, LifecycleStage> = {
  acquisition: 'Acquisition',
  acquisitions: 'Acquisition',
  due_diligence: 'Acquisition',
  development: 'Development',
  predevelopment: 'Development',
  construction: 'Development',
  operations: 'Operations',
  operating: 'Operations',
  disposition: 'Disposition',
  exit: 'Disposition',
  financing: 'Financing',
  finance: 'Financing',
  capital: 'Financing',
};

const normalizeLifecycleStages = (rawStages?: (string | null)[]): LifecycleStage[] => {
  if (!rawStages || rawStages.length === 0) {
    return ['Development'];
  }

  const normalized = rawStages
    .map((stage) => {
      if (!stage) return null;
      const trimmed = stage.toString().trim();
      if (!trimmed) return null;
      const lower = trimmed.toLowerCase();
      if (LIFECYCLE_STAGE_ALIASES[lower]) {
        return LIFECYCLE_STAGE_ALIASES[lower];
      }
      if (LIFECYCLE_STAGES.includes(trimmed as LifecycleStage)) {
        return trimmed as LifecycleStage;
      }
      return null;
    })
    .filter((stage): stage is LifecycleStage => stage !== null);

  if (normalized.length === 0) {
    return ['Development'];
  }

  return Array.from(new Set(normalized));
};

const normalizeCategory = (category: UnitCostCategoryReference): UnitCostCategoryReference => {
  const lifecycleStages = normalizeLifecycleStages(
    category.lifecycle_stages && category.lifecycle_stages.length > 0
      ? category.lifecycle_stages
      : (category as any).lifecycle_stage
        ? [(category as any).lifecycle_stage as string]
        : []
  );

  return {
    ...category,
    lifecycle_stages: lifecycleStages,
    tags: Array.isArray(category.tags) ? category.tags : [],
  };
};

export default function UnitCostCategoryManager() {
  const { showToast } = useToast();

  // State management
  const [categories, setCategories] = useState<UnitCostCategoryReference[]>([]);
  const [tags, setTags] = useState<CategoryTag[]>([]);
  const [selectedStages, setSelectedStages] = useState<LifecycleStage[]>(LIFECYCLE_STAGES);
  const [selectedCategory, setSelectedCategory] = useState<UnitCostCategoryReference | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<UnitCostCategoryReference | null>(null);

  // Resizable columns state
  const [leftPanelWidth, setLeftPanelWidth] = useState(20); // Percentage for lifecycle filter
  const [middlePanelWidth, setMiddlePanelWidth] = useState(40); // Percentage for category tree
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [categoriesData, tagsData] = await Promise.all([
        fetchCategories(),
        fetchTags(),
      ]);
      setCategories(categoriesData.map((cat) => normalizeCategory(cat)));
      setTags(tagsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter categories by selected lifecycle stages
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const stages = cat.lifecycle_stages && cat.lifecycle_stages.length > 0
        ? cat.lifecycle_stages
        : ['Development'];
      return stages.some((stage) => selectedStages.includes(stage));
    });
  }, [categories, selectedStages]);

  // Build hierarchy from filtered categories
  const categoryHierarchy = useMemo(() => {
    return buildCategoryHierarchy(filteredCategories);
  }, [filteredCategories]);

  // Count categories per lifecycle stage
  const stageCounts = useMemo(() => {
    const counts: Record<LifecycleStage, number> = {
      Acquisition: 0,
      Development: 0,
      Operations: 0,
      Disposition: 0,
      Financing: 0,
    };
    categories.forEach((cat) => {
      const stages = cat.lifecycle_stages && cat.lifecycle_stages.length > 0
        ? cat.lifecycle_stages
        : ['Development'];
      stages.forEach((stage) => {
        counts[stage] = (counts[stage] || 0) + 1;
      });
    });
    return counts;
  }, [categories]);

  // Toggle lifecycle stage filter
  const toggleStage = (stage: LifecycleStage) => {
    setSelectedStages((prev) => {
      if (prev.includes(stage)) {
        return prev.filter((s) => s !== stage);
      } else {
        return [...prev, stage];
      }
    });
  };

  // Select all / deselect all lifecycle stages
  const selectAllStages = () => {
    setSelectedStages(LIFECYCLE_STAGES);
  };

  const deselectAllStages = () => {
    setSelectedStages([]);
  };

  // Toggle category expansion in tree
  const toggleExpanded = (categoryId: number) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Handle category selection
  const handleSelectCategory = (category: UnitCostCategoryReference) => {
    setSelectedCategory(category);
  };

  // Handle category update
  const handleCategoryUpdated = (updated: UnitCostCategoryReference) => {
    const normalized = normalizeCategory(updated);
    setCategories((prev) =>
      prev.map((cat) => (cat.category_id === normalized.category_id ? normalized : cat))
    );
    setSelectedCategory(normalized);
    showToast('Category updated successfully', 'success');
  };

  // Handle category creation
  const handleCategoryCreated = (newCategory: UnitCostCategoryReference) => {
    const normalized = normalizeCategory(newCategory);
    setCategories((prev) => [...prev, normalized]);
    setSelectedCategory(normalized);
    setShowAddCategoryModal(false);
    showToast('Category created successfully', 'success');
  };


  // Handle delete category request
  const handleDeleteRequest = (category: UnitCostCategoryReference) => {
    setCategoryToDelete(category);
    setShowDeleteModal(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirmed = () => {
    if (categoryToDelete) {
      setCategories((prev) =>
        prev.filter((cat) => cat.category_id !== categoryToDelete.category_id)
      );
      if (selectedCategory?.category_id === categoryToDelete.category_id) {
        setSelectedCategory(null);
      }
      setShowDeleteModal(false);
      setCategoryToDelete(null);
      showToast('Category deleted successfully', 'success');
    }
  };

  // Resize handlers for left divider
  const handleMouseDownLeft = () => {
    setIsDraggingLeft(true);
  };

  const handleMouseMoveLeft = (e: MouseEvent) => {
    if (isDraggingLeft) {
      const newWidth = (e.clientX / window.innerWidth) * 100;
      // Constrain between 15% and 35%
      if (newWidth >= 15 && newWidth <= 35) {
        setLeftPanelWidth(newWidth);
      }
    }
  };

  const handleMouseUpLeft = () => {
    setIsDraggingLeft(false);
  };

  // Resize handlers for right divider
  const handleMouseDownRight = () => {
    setIsDraggingRight(true);
  };

  const handleMouseMoveRight = (e: MouseEvent) => {
    if (isDraggingRight) {
      const totalLeft = leftPanelWidth;
      const newMiddleWidth = (e.clientX / window.innerWidth) * 100 - totalLeft;
      // Constrain middle panel between 25% and 60%
      if (newMiddleWidth >= 25 && newMiddleWidth <= 60) {
        setMiddlePanelWidth(newMiddleWidth);
      }
    }
  };

  const handleMouseUpRight = () => {
    setIsDraggingRight(false);
  };

  // Setup mouse event listeners for resizing
  useEffect(() => {
    if (isDraggingLeft) {
      window.addEventListener('mousemove', handleMouseMoveLeft as any);
      window.addEventListener('mouseup', handleMouseUpLeft);
      return () => {
        window.removeEventListener('mousemove', handleMouseMoveLeft as any);
        window.removeEventListener('mouseup', handleMouseUpLeft);
      };
    }
  }, [isDraggingLeft, leftPanelWidth]);

  useEffect(() => {
    if (isDraggingRight) {
      window.addEventListener('mousemove', handleMouseMoveRight as any);
      window.addEventListener('mouseup', handleMouseUpRight);
      return () => {
        window.removeEventListener('mousemove', handleMouseMoveRight as any);
        window.removeEventListener('mouseup', handleMouseUpRight);
      };
    }
  }, [isDraggingRight, leftPanelWidth, middlePanelWidth]);

  if (isMobile) {
    return <MobileWarning />;
  }

  if (isLoading) {
    return (
      <div className="category-manager-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3 text-muted">Loading category taxonomy...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="category-manager-error">
        <div className="alert alert-danger" role="alert">
          <h5 className="alert-heading">Error Loading Categories</h5>
          <p>{error}</p>
          <button className="btn btn-sm btn-outline-danger mt-2" onClick={loadData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const rightPanelWidth = 100 - leftPanelWidth - middlePanelWidth;

  return (
    <div className="unit-cost-category-manager">
      <div className="manager-content">
        {/* Column 1: Lifecycle Stage Filter */}
        <div style={{ width: `${leftPanelWidth}%`, flexShrink: 0 }}>
          <LifecycleStageFilter
            stages={LIFECYCLE_STAGES}
            selectedStages={selectedStages}
            stageCounts={stageCounts}
            onToggleStage={toggleStage}
            onSelectAll={selectAllStages}
            onDeselectAll={deselectAllStages}
          />
        </div>

        {/* Left Resizer */}
        <div
          className="column-resizer"
          style={{
            width: '4px',
            flexShrink: 0,
            cursor: 'col-resize',
            backgroundColor: isDraggingLeft ? 'var(--cui-primary)' : 'var(--cui-border-color)',
            transition: isDraggingLeft ? 'none' : 'background-color 0.15s',
            position: 'relative',
          }}
          onMouseDown={handleMouseDownLeft}
          onMouseEnter={(e) => !isDraggingLeft && (e.currentTarget.style.backgroundColor = 'var(--cui-secondary-color)')}
          onMouseLeave={(e) => !isDraggingLeft && (e.currentTarget.style.backgroundColor = 'var(--cui-border-color)')}
        >
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '2px',
              height: '48px',
              borderRadius: '4px',
              backgroundColor: 'var(--cui-secondary-color)',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Column 2: Category Tree */}
        <div style={{ width: `${middlePanelWidth}%`, flexShrink: 0 }}>
          <CategoryTree
            categories={categoryHierarchy}
            selectedCategory={selectedCategory}
            expandedCategories={expandedCategories}
            onSelectCategory={handleSelectCategory}
            onToggleExpanded={toggleExpanded}
            onAddCategory={() => setShowAddCategoryModal(true)}
          />
        </div>

        {/* Right Resizer */}
        <div
          className="column-resizer"
          style={{
            width: '4px',
            flexShrink: 0,
            cursor: 'col-resize',
            backgroundColor: isDraggingRight ? 'var(--cui-primary)' : 'var(--cui-border-color)',
            transition: isDraggingRight ? 'none' : 'background-color 0.15s',
            position: 'relative',
          }}
          onMouseDown={handleMouseDownRight}
          onMouseEnter={(e) => !isDraggingRight && (e.currentTarget.style.backgroundColor = 'var(--cui-secondary-color)')}
          onMouseLeave={(e) => !isDraggingRight && (e.currentTarget.style.backgroundColor = 'var(--cui-border-color)')}
        >
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '2px',
              height: '48px',
              borderRadius: '4px',
              backgroundColor: 'var(--cui-secondary-color)',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Column 3: Category Detail Panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <CategoryDetailPanel
            category={selectedCategory}
            tags={tags}
            onUpdate={handleCategoryUpdated}
            onDelete={handleDeleteRequest}
            onCreateTag={() => {}} // No-op since we use inline tag input now
          />
        </div>
      </div>

      {/* Modals */}
      {showAddCategoryModal && (
        <AddCategoryModal
          tags={tags}
          categories={categories}
          onClose={() => setShowAddCategoryModal(false)}
          onCreated={handleCategoryCreated}
        />
      )}

      {showDeleteModal && categoryToDelete && (
        <DeleteConfirmationModal
          category={categoryToDelete}
          onClose={() => {
            setShowDeleteModal(false);
            setCategoryToDelete(null);
          }}
          onConfirm={handleDeleteConfirmed}
        />
      )}
    </div>
  );
}
