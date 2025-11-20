'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { UnitCostCategoryReference } from '@/types/benchmarks';
import { getCategoryDeletionImpact, deleteCategory, type CategoryDeletionImpact } from '@/lib/api/categories';
import { useToast } from '@/components/ui/toast';

interface DeleteConfirmationModalProps {
  category: UnitCostCategoryReference;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmationModal({
  category,
  onClose,
  onConfirm,
}: DeleteConfirmationModalProps) {
  const { showToast } = useToast();

  const [impact, setImpact] = useState<CategoryDeletionImpact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadImpact();
  }, [category.category_id]);

  const loadImpact = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const impactData = await getCategoryDeletionImpact(category.category_id);
      setImpact(impactData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load deletion impact';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteCategory(category.category_id);
      onConfirm();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete category';
      showToast(message, 'error');
      setError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const hasImpact = impact && (
    impact.child_categories.length > 0 ||
    impact.item_count > 0 ||
    (impact.project_usage_count && impact.project_usage_count > 0)
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <AlertTriangle size={20} className="text-warning me-2" />
              Confirm Delete Category
            </h5>
            <button className="btn-close" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>

          <div className="modal-body">
            {isLoading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2 text-muted">Checking deletion impact...</p>
              </div>
            ) : error ? (
              <div className="alert alert-danger" role="alert">
                <strong>Error:</strong> {error}
              </div>
            ) : (
              <>
                <p>
                  Are you sure you want to delete the category <strong>{category.category_name}</strong>?
                </p>

                {impact && (
                  <div className="deletion-impact mt-3">
                    <h6 className="mb-3">Deletion Impact:</h6>

                    {/* Child Categories */}
                    {impact.child_categories.length > 0 && (
                      <div className="impact-section mb-3">
                        <div className="impact-label">
                          <AlertTriangle size={16} className="text-warning me-2" />
                          Child Categories ({impact.child_categories.length})
                        </div>
                        <div className="impact-details">
                          <ul className="mb-0">
                            {impact.child_categories.map((child) => (
                              <li key={child.category_id}>{child.category_name}</li>
                            ))}
                          </ul>
                          <small className="text-muted">
                            These child categories will also be deleted (soft delete)
                          </small>
                        </div>
                      </div>
                    )}

                    {/* Items */}
                    {impact.item_count > 0 && (
                      <div className="impact-section mb-3">
                        <div className="impact-label">
                          <AlertTriangle size={16} className="text-warning me-2" />
                          Unit Cost Items ({impact.item_count})
                        </div>
                        <div className="impact-details">
                          <small className="text-muted">
                            {impact.item_count} item{impact.item_count !== 1 ? 's' : ''} linked to this category will become uncategorized
                          </small>
                        </div>
                      </div>
                    )}

                    {/* Project Usage */}
                    {impact.project_usage_count && impact.project_usage_count > 0 && (
                      <div className="impact-section mb-3">
                        <div className="impact-label">
                          <AlertTriangle size={16} className="text-danger me-2" />
                          Project Usage ({impact.project_usage_count})
                        </div>
                        <div className="impact-details">
                          <small className="text-danger">
                            This category is used in {impact.project_usage_count} active project{impact.project_usage_count !== 1 ? 's' : ''}
                          </small>
                        </div>
                      </div>
                    )}

                    {!hasImpact && (
                      <div className="alert alert-info mb-0">
                        No dependencies found. This category can be safely deleted.
                      </div>
                    )}
                  </div>
                )}

                {hasImpact && (
                  <div className="alert alert-warning mt-3" role="alert">
                    <strong>Note:</strong> This is a soft delete. The category will be marked as inactive but data will be preserved.
                  </div>
                )}
              </>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={isLoading || isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Category'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
