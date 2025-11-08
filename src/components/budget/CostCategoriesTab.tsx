// Cost Categories Tab - Project Budget View
// v1.0 · 2025-11-02

'use client';

import React, { useState } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CButtonGroup,
  CFormSelect,
  CAlert,
  CSpinner,
} from '@coreui/react';
import CategoryTreeManager from './CategoryTreeManager';
import TemplateEditorModal from './TemplateEditorModal';
import CreateTemplateModal from './CreateTemplateModal';
import { useBudgetCategories } from '@/hooks/useBudgetCategories';

interface CostCategoriesTabProps {
  projectId: number;
}

export default function CostCategoriesTab({ projectId }: CostCategoriesTabProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<{ name: string; typeCode: string } | null>(null);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);

  const { tree, loading, error, fetchTree } = useBudgetCategories({
    projectId,
    autoFetch: true,
  });

  // Load templates on mount
  React.useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await fetch('/api/budget/category-templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error('Error loading templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;

    const [templateName, projectTypeCode] = selectedTemplate.split('|');

    setApplyingTemplate(true);
    setMessage(null);

    try {
      const response = await fetch('/api/budget/category-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          template_name: templateName,
          project_type_code: projectTypeCode,
          overwrite_existing: false, // Default to false, user can confirm in modal if needed
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Template applied successfully! ${data.categories_created} categories created.`,
        });
        setSelectedTemplate('');
        await fetchTree(); // Refresh the tree
      } else {
        if (response.status === 409) {
          // Conflict - categories already exist
          if (window.confirm(
            `This project already has categories. Do you want to overwrite them with the "${templateName}" template?`
          )) {
            // Retry with overwrite flag
            const retryResponse = await fetch('/api/budget/category-templates', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                project_id: projectId,
                template_name: templateName,
                project_type_code: projectTypeCode,
                overwrite_existing: true,
              }),
            });

            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              setMessage({
                type: 'success',
                text: `Template applied! ${retryData.categories_created} categories created.`,
              });
              await fetchTree();
            } else {
              throw new Error(data.error || 'Failed to apply template');
            }
          }
        } else {
          throw new Error(data.error || 'Failed to apply template');
        }
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to apply template',
      });
    } finally {
      setApplyingTemplate(false);
    }
  };

  const handleEditTemplate = () => {
    if (!selectedTemplate) return;

    const [templateName, projectTypeCode] = selectedTemplate.split('|');
    setEditingTemplate({ name: templateName, typeCode: projectTypeCode });
    setShowTemplateEditor(true);
  };

  const handleTemplateEditorClose = () => {
    setShowTemplateEditor(false);
    setEditingTemplate(null);
  };

  const handleTemplateEditorSaved = () => {
    // Refresh templates and tree
    loadTemplates();
    fetchTree();
  };

  const handleCreateTemplateClose = () => {
    setShowCreateTemplate(false);
  };

  const handleCreateTemplateCreated = () => {
    // Refresh templates
    loadTemplates();
  };

  const hasCategoriesYet = tree.length > 0;

  return (
    <div>
      {/* Template Selector */}
      <CCard className="mb-4">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Quick Start: Apply Template</h6>
          <CButton
            color="success"
            size="sm"
            onClick={() => setShowCreateTemplate(true)}
          >
            + Create New Template
          </CButton>
        </CCardHeader>
        <CCardBody>
          <p className="text-medium-emphasis mb-3">
            Choose from pre-built category templates optimized for different project types.
          </p>

          {message && (
            <CAlert
              color={message.type === 'success' ? 'success' : message.type === 'error' ? 'danger' : 'info'}
              dismissible
              onClose={() => setMessage(null)}
            >
              {message.text}
            </CAlert>
          )}

          <div className="d-flex gap-3 align-items-end">
            <div className="flex-grow-1" style={{ maxWidth: '400px' }}>
              <label className="form-label">Select Template</label>
              <CFormSelect
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                disabled={loadingTemplates || applyingTemplate}
              >
                <option value="">Choose a template...</option>
                {templates.map(template => (
                  <option
                    key={`${template.template_name}|${template.project_type_code}`}
                    value={`${template.template_name}|${template.project_type_code}`}
                  >
                    {template.template_name} ({template.project_type_code}) - {template.category_count} categories
                  </option>
                ))}
              </CFormSelect>
            </div>

            <CButtonGroup>
              <CButton
                color="primary"
                onClick={handleApplyTemplate}
                disabled={!selectedTemplate || applyingTemplate || loadingTemplates}
              >
                {applyingTemplate ? (
                  <>
                    <CSpinner size="sm" className="me-2" />
                    Applying...
                  </>
                ) : (
                  'Apply Template'
                )}
              </CButton>
              <CButton
                color="success"
                variant="outline"
                onClick={handleEditTemplate}
                disabled={!selectedTemplate || loadingTemplates}
              >
                Edit Template
              </CButton>
            </CButtonGroup>
          </div>

          {!hasCategoriesYet && (
            <div className="mt-3 p-3 border rounded bg-light">
              <strong>💡 Tip:</strong> Start with a template to save time, then customize it below.
              Or create your own category structure from scratch using the tree view.
            </div>
          )}
        </CCardBody>
      </CCard>

      {/* Category Tree Manager */}
      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Cost Category Hierarchy</h6>
          <small className="text-medium-emphasis">
            Organize budget items into up to 4 levels
          </small>
        </CCardHeader>
        <CCardBody>
          {loading ? (
            <div className="text-center py-5">
              <CSpinner color="primary" />
              <p className="text-medium-emphasis mt-2">Loading categories...</p>
            </div>
          ) : error ? (
            <CAlert color="danger">
              <strong>Error:</strong> {error}
            </CAlert>
          ) : (
            <CategoryTreeManager projectId={projectId} />
          )}
        </CCardBody>
      </CCard>

      {/* Template Editor Modal */}
      {editingTemplate && (
        <TemplateEditorModal
          open={showTemplateEditor}
          templateName={editingTemplate.name}
          projectTypeCode={editingTemplate.typeCode}
          projectId={projectId}
          onClose={handleTemplateEditorClose}
          onSaved={handleTemplateEditorSaved}
        />
      )}

      {/* Create Template Modal */}
      <CreateTemplateModal
        open={showCreateTemplate}
        onClose={handleCreateTemplateClose}
        onCreated={handleCreateTemplateCreated}
      />
    </div>
  );
}
