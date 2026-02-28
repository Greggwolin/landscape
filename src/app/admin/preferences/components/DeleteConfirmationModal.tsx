'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  CAlert,
  CButton,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from '@coreui/react';
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
    <CModal visible onClose={onClose} backdrop="static" alignment="center">
      <CModalHeader closeButton>
        <CModalTitle className="d-flex align-items-center gap-2">
          <AlertTriangle size={18} className="text-warning" />
          Confirm Delete Category
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        {isLoading ? (
          <div className="d-flex align-items-center gap-2 py-3">
            <CSpinner size="sm" />
            <span className="text-medium-emphasis">Checking deletion impact...</span>
          </div>
        ) : error ? (
          <CAlert color="danger" className="mb-0">
            <strong>Error:</strong> {error}
          </CAlert>
        ) : (
          <>
            <p>
              Are you sure you want to delete the category <strong>{category.category_name}</strong>?
            </p>

            {impact && (
              <div className="d-flex flex-column gap-2 mt-3">
                <h6 className="mb-1">Deletion Impact</h6>

                {impact.child_categories.length > 0 && (
                  <CAlert color="warning" className="mb-0">
                    <div className="fw-semibold mb-1">Child Categories ({impact.child_categories.length})</div>
                    <ul className="mb-1">
                      {impact.child_categories.map((child) => (
                        <li key={child.category_id}>{child.category_name}</li>
                      ))}
                    </ul>
                    <small>These child categories will also be deleted (soft delete).</small>
                  </CAlert>
                )}

                {impact.item_count > 0 && (
                  <CAlert color="warning" className="mb-0">
                    <div className="fw-semibold mb-1">Unit Cost Items ({impact.item_count})</div>
                    <small>
                      {impact.item_count} item{impact.item_count !== 1 ? 's' : ''} linked to this
                      category will become uncategorized.
                    </small>
                  </CAlert>
                )}

                {impact.project_usage_count && impact.project_usage_count > 0 && (
                  <CAlert color="danger" className="mb-0">
                    <div className="fw-semibold mb-1">
                      Project Usage ({impact.project_usage_count})
                    </div>
                    <small>
                      This category is used in {impact.project_usage_count} active project
                      {impact.project_usage_count !== 1 ? 's' : ''}.
                    </small>
                  </CAlert>
                )}

                {!hasImpact && (
                  <CAlert color="info" className="mb-0">
                    No dependencies found. This category can be safely deleted.
                  </CAlert>
                )}
              </div>
            )}

            {hasImpact && (
              <CAlert color="warning" className="mt-3 mb-0">
                <strong>Note:</strong> This is a soft delete. The category will be marked as inactive.
              </CAlert>
            )}
          </>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton type="button" color="secondary" onClick={onClose} disabled={isDeleting}>
          Cancel
        </CButton>
        <CButton
          type="button"
          color="danger"
          onClick={handleDelete}
          disabled={isLoading || isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete Category'}
        </CButton>
      </CModalFooter>
    </CModal>
  );
}
