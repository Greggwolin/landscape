// Template Editor Modal - Budget Categories
// v1.0 · 2025-11-02

'use client';

import React, { useState, useEffect } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CAlert,
  CSpinner,
  CButtonGroup,
} from '@coreui/react';
import CategoryTreeManager from './CategoryTreeManager';
import { useBudgetCategories } from '@/hooks/useBudgetCategories';

interface TemplateEditorModalProps {
  open: boolean;
  templateName: string;
  projectTypeCode: string;
  projectId: number;
  onClose: () => void;
  onSaved?: () => void;
}

type SaveAction = 'project-only' | 'update-global' | 'save-as-new';

export default function TemplateEditorModal({
  open,
  templateName,
  projectTypeCode,
  projectId,
  onClose,
  onSaved,
}: TemplateEditorModalProps) {
  const [saveAction, setSaveAction] = useState<SaveAction>('project-only');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Load template categories (we'll create a temporary project-level copy for editing)
  const { tree, loading, error, fetchTree } = useBudgetCategories({
    projectId,
    autoFetch: open,
  });

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSaveAction('project-only');
      setNewTemplateName(`${templateName} (Custom)`);
      setMessage(null);
    }
  }, [open, templateName]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      if (saveAction === 'save-as-new' && !newTemplateName.trim()) {
        setMessage({
          type: 'error',
          text: 'Please enter a name for the new template.',
        });
        setSaving(false);
        return;
      }

      // Step 1: Apply template to project (or verify it's already applied)
      const applyResponse = await fetch('/api/budget/category-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          template_name: templateName,
          project_type_code: projectTypeCode,
          overwrite_existing: true,
        }),
      });

      if (!applyResponse.ok) {
        const errorData = await applyResponse.json();
        throw new Error(errorData.error || 'Failed to apply template');
      }

      // Step 2: Handle save action
      if (saveAction === 'project-only') {
        setMessage({
          type: 'success',
          text: 'Template applied to project successfully!',
        });
        setTimeout(() => {
          onSaved?.();
          onClose();
        }, 1500);
      } else if (saveAction === 'update-global') {
        // Update the global template with current project categories
        const updateResponse = await fetch('/api/budget/category-templates/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId,
            template_name: templateName,
            project_type_code: projectTypeCode,
          }),
        });

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json();
          throw new Error(errorData.error || 'Failed to update global template');
        }

        setMessage({
          type: 'success',
          text: 'Global template updated successfully!',
        });
        setTimeout(() => {
          onSaved?.();
          onClose();
        }, 1500);
      } else if (saveAction === 'save-as-new') {
        // Save as a new global template
        const saveNewResponse = await fetch('/api/budget/category-templates/save-new', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId,
            template_name: newTemplateName.trim(),
            project_type_code: projectTypeCode,
          }),
        });

        if (!saveNewResponse.ok) {
          const errorData = await saveNewResponse.json();
          throw new Error(errorData.error || 'Failed to save new template');
        }

        setMessage({
          type: 'success',
          text: `New template "${newTemplateName}" created successfully!`,
        });
        setTimeout(() => {
          onSaved?.();
          onClose();
        }, 1500);
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save template',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <CModal
      visible={open}
      onClose={onClose}
      size="xl"
      backdrop="static"
      keyboard={false}
    >
      <CModalHeader>
        <CModalTitle>Edit Template: {templateName}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {message && (
          <CAlert
            color={message.type === 'success' ? 'success' : message.type === 'error' ? 'danger' : 'info'}
            dismissible
            onClose={() => setMessage(null)}
          >
            {message.text}
          </CAlert>
        )}

        <div className="mb-4">
          <p className="text-medium-emphasis">
            Make changes to the category structure below. When you're done, choose how to save your changes.
          </p>
        </div>

        {/* Category Tree Editor */}
        <div className="mb-4 p-3 border rounded">
          {loading ? (
            <div className="text-center py-5">
              <CSpinner color="primary" />
              <p className="text-medium-emphasis mt-2">Loading template...</p>
            </div>
          ) : error ? (
            <CAlert color="danger">
              <strong>Error:</strong> {error}
            </CAlert>
          ) : (
            <CategoryTreeManager projectId={projectId} />
          )}
        </div>

        {/* Save Options */}
        <div className="mb-3">
          <CFormLabel><strong>Save Options</strong></CFormLabel>
          <div className="d-flex flex-column gap-2">
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                name="saveAction"
                id="projectOnly"
                value="project-only"
                checked={saveAction === 'project-only'}
                onChange={(e) => setSaveAction(e.target.value as SaveAction)}
              />
              <label className="form-check-label" htmlFor="projectOnly">
                <strong>Use for this project only</strong>
                <div className="small text-medium-emphasis">
                  Apply changes to this project without affecting global templates
                </div>
              </label>
            </div>

            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                name="saveAction"
                id="updateGlobal"
                value="update-global"
                checked={saveAction === 'update-global'}
                onChange={(e) => setSaveAction(e.target.value as SaveAction)}
              />
              <label className="form-check-label" htmlFor="updateGlobal">
                <strong>Update global template "{templateName}"</strong>
                <div className="small text-medium-emphasis">
                  Save changes back to the global template (will affect new projects using this template)
                </div>
              </label>
            </div>

            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                name="saveAction"
                id="saveAsNew"
                value="save-as-new"
                checked={saveAction === 'save-as-new'}
                onChange={(e) => setSaveAction(e.target.value as SaveAction)}
              />
              <label className="form-check-label" htmlFor="saveAsNew">
                <strong>Save as new global template</strong>
                <div className="small text-medium-emphasis">
                  Create a new template based on your changes
                </div>
              </label>
            </div>

            {saveAction === 'save-as-new' && (
              <div className="ms-4 mt-2">
                <CFormLabel htmlFor="newTemplateName">New Template Name</CFormLabel>
                <CFormInput
                  id="newTemplateName"
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="Enter template name"
                  required
                />
              </div>
            )}
          </div>
        </div>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </CButton>
        <CButton color="primary" onClick={handleSave} disabled={saving || loading}>
          {saving ? (
            <>
              <CSpinner size="sm" className="me-2" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </CButton>
      </CModalFooter>
    </CModal>
  );
}
