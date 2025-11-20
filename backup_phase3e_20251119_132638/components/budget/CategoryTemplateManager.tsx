// Category Template Manager Component
// v1.0 · 2025-11-02

'use client';

import React, { useState, useEffect } from 'react';
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CAlert,
  CSpinner,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CBadge,
  CFormCheck,
} from '@coreui/react';
import type { BudgetCategoryTemplate } from '@/types/budget-categories';

interface CategoryTemplateManagerProps {
  selectedProjectId: number | null;
  onTemplateApplied?: () => void;
}

export default function CategoryTemplateManager({
  selectedProjectId,
  onTemplateApplied,
}: CategoryTemplateManagerProps) {
  const [templates, setTemplates] = useState<BudgetCategoryTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  // Modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<BudgetCategoryTemplate | null>(null);
  const [overwriteExisting, setOverwriteExisting] = useState(false);

  // Preview state
  const [previewTree, setPreviewTree] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/budget/category-templates');
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (template: BudgetCategoryTemplate) => {
    setSelectedTemplate(template);
    setShowApplyModal(true);
    setLoadingPreview(true);

    try {
      const response = await fetch(
        `/api/budget/categories/tree?template_name=${encodeURIComponent(template.template_name)}&project_type_code=${encodeURIComponent(template.project_type_code)}`
      );

      if (response.ok) {
        const data = await response.json();
        setPreviewTree(data.categories || []);
      }
    } catch (err) {
      console.error('Error loading preview:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleApply = async () => {
    if (!selectedTemplate || !selectedProjectId) return;

    setApplying(true);
    setError(null);

    try {
      const response = await fetch('/api/budget/category-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProjectId,
          template_name: selectedTemplate.template_name,
          project_type_code: selectedTemplate.project_type_code,
          overwrite_existing: overwriteExisting,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to apply template');
      }

      const result = await response.json();

      setShowApplyModal(false);
      setSelectedTemplate(null);
      setOverwriteExisting(false);

      // Notify parent
      if (onTemplateApplied) {
        onTemplateApplied();
      }

      // Show success message
      alert(`Template applied successfully! ${result.categories_created} categories created.`);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setApplying(false);
    }
  };

  const renderPreviewNode = (node: any, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.category_id}>
        <div
          className="py-1 px-2"
          style={{
            marginLeft: `${depth * 20}px`,
            fontSize: '0.875rem',
          }}
        >
          <span className="text-medium-emphasis me-2">L{node.level}</span>
          <span className="fw-semibold">{node.code}</span>
          <span className="text-medium-emphasis ms-2">— {node.name}</span>
        </div>

        {hasChildren && (
          <div>
            {node.children.map((child: any) => renderPreviewNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
        <p className="text-medium-emphasis mt-2">Loading templates...</p>
      </div>
    );
  }

  if (error && !selectedTemplate) {
    return (
      <CAlert color="danger">
        <strong>Error:</strong> {error}
      </CAlert>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h5 className="mb-2">Category Templates</h5>
        <p className="text-medium-emphasis mb-0">
          Quick-start your budget with pre-built category hierarchies optimized for different project types.
          {!selectedProjectId && ' Select a project above to apply a template.'}
        </p>
      </div>

      {templates.length === 0 ? (
        <CAlert color="info">
          No templates available. Contact support to add standard templates.
        </CAlert>
      ) : (
        <CRow>
          {templates.map(template => (
            <CCol key={`${template.template_name}-${template.project_type_code}`} md={6} lg={4} className="mb-3">
              <CCard className="h-100">
                <CCardHeader className="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 className="mb-1">{template.template_name}</h6>
                    <CBadge color="secondary">{template.project_type_code}</CBadge>
                  </div>
                </CCardHeader>

                <CCardBody>
                  <p className="text-medium-emphasis small mb-3">
                    {template.description}
                  </p>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="small">Total Categories:</span>
                      <strong>{template.category_count}</strong>
                    </div>
                    <div className="d-flex justify-content-between small text-medium-emphasis">
                      <span>Levels:</span>
                      <span>
                        L1: {template.level_1_count} · L2: {template.level_2_count} ·
                        L3: {template.level_3_count} · L4: {template.level_4_count}
                      </span>
                    </div>
                  </div>

                  <div className="d-grid gap-2">
                    <CButton
                      color="info"
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(template)}
                    >
                      Preview
                    </CButton>
                    <CButton
                      color="primary"
                      size="sm"
                      onClick={() => handlePreview(template)}
                      disabled={!selectedProjectId}
                    >
                      Apply to Project
                    </CButton>
                  </div>
                </CCardBody>
              </CCard>
            </CCol>
          ))}
        </CRow>
      )}

      {/* Apply Template Modal */}
      <CModal visible={showApplyModal} onClose={() => setShowApplyModal(false)} size="xl">
        <CModalHeader>
          <CModalTitle>
            {selectedTemplate ? `Apply Template: ${selectedTemplate.template_name}` : 'Template Preview'}
          </CModalTitle>
        </CModalHeader>

        <CModalBody>
          {error && (
            <CAlert color="danger" className="mb-3">
              <strong>Error:</strong> {error}
            </CAlert>
          )}

          {selectedTemplate && (
            <div className="mb-3">
              <p className="text-medium-emphasis mb-2">
                {selectedTemplate.description}
              </p>
              <div className="d-flex gap-3 mb-3">
                <CBadge color="secondary">{selectedTemplate.project_type_code}</CBadge>
                <span className="text-medium-emphasis small">
                  {selectedTemplate.category_count} categories across {' '}
                  {[
                    selectedTemplate.level_1_count > 0 && 'Level 1',
                    selectedTemplate.level_2_count > 0 && 'Level 2',
                    selectedTemplate.level_3_count > 0 && 'Level 3',
                    selectedTemplate.level_4_count > 0 && 'Level 4',
                  ].filter(Boolean).join(', ')}
                </span>
              </div>
            </div>
          )}

          <h6 className="mb-3">Category Hierarchy Preview:</h6>

          {loadingPreview ? (
            <div className="text-center py-4">
              <CSpinner size="sm" />
              <p className="text-medium-emphasis mt-2 mb-0">Loading preview...</p>
            </div>
          ) : previewTree.length === 0 ? (
            <CAlert color="warning">No categories found in template.</CAlert>
          ) : (
            <div className="border rounded p-3" style={{ maxHeight: '400px', overflow: 'auto' }}>
              {previewTree.map(node => renderPreviewNode(node))}
            </div>
          )}

          {selectedProjectId && (
            <div className="mt-4">
              <CFormCheck
                id="overwrite-checkbox"
                label="Overwrite existing categories (if any)"
                checked={overwriteExisting}
                onChange={(e) => setOverwriteExisting(e.target.checked)}
              />
              <small className="text-medium-emphasis ms-4">
                Warning: This will delete all existing categories for this project
              </small>
            </div>
          )}
        </CModalBody>

        <CModalFooter>
          <CButton
            color="secondary"
            onClick={() => {
              setShowApplyModal(false);
              setSelectedTemplate(null);
              setOverwriteExisting(false);
              setError(null);
            }}
          >
            Cancel
          </CButton>
          {selectedProjectId && (
            <CButton
              color="primary"
              onClick={handleApply}
              disabled={applying || !selectedTemplate}
            >
              {applying ? (
                <>
                  <CSpinner size="sm" className="me-2" />
                  Applying...
                </>
              ) : (
                'Apply Template'
              )}
            </CButton>
          )}
        </CModalFooter>
      </CModal>
    </div>
  );
}
