// Create New Budget Category Template Modal
// v1.0 · 2025-11-03

'use client';

import React, { useState } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CAlert,
  CSpinner,
} from '@coreui/react';

interface CreateTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateTemplateModal({
  open,
  onClose,
  onCreated,
}: CreateTemplateModalProps) {
  const [templateName, setTemplateName] = useState('');
  const [projectTypeCode, setProjectTypeCode] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!templateName || !projectTypeCode) {
      setError('Template name and project type are required');
      return;
    }

    setCreating(true);

    try {
      // Create a minimal template with one L1 category
      const response = await fetch('/api/budget/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'ROOT',
          name: 'Root Category',
          level: 1,
          is_template: true,
          template_name: templateName,
          project_type_code: projectTypeCode,
          description: description || `${templateName} template`,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Success - reset form and notify parent
        setTemplateName('');
        setProjectTypeCode('');
        setDescription('');
        onCreated();
        onClose();
      } else {
        throw new Error(data.error || 'Failed to create template');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    if (!creating) {
      setError(null);
      setTemplateName('');
      setProjectTypeCode('');
      setDescription('');
      onClose();
    }
  };

  return (
    <CModal visible={open} onClose={handleClose} size="lg">
      <CForm onSubmit={handleSubmit}>
        <CModalHeader>
          <CModalTitle>Create New Template</CModalTitle>
        </CModalHeader>

        <CModalBody>
          {error && (
            <CAlert color="danger" dismissible onClose={() => setError(null)}>
              {error}
            </CAlert>
          )}

          <div className="mb-3">
            <CFormLabel htmlFor="templateName">Template Name</CFormLabel>
            <CFormInput
              id="templateName"
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., Commercial Development, Industrial Park"
              required
              disabled={creating}
            />
            <small className="text-medium-emphasis">
              A descriptive name for this budget category template
            </small>
          </div>

          <div className="mb-3">
            <CFormLabel htmlFor="projectTypeCode">Project Type</CFormLabel>
            <CFormSelect
              id="projectTypeCode"
              value={projectTypeCode}
              onChange={(e) => setProjectTypeCode(e.target.value)}
              required
              disabled={creating}
            >
              <option value="">Choose a project type...</option>
              <option value="LAND">Land Development</option>
              <option value="MF">Multifamily</option>
              <option value="RET">Retail</option>
              <option value="OFF">Office</option>
              <option value="IND">Industrial</option>
              <option value="MXD">Mixed Use</option>
              <option value="HOSP">Hospitality</option>
              <option value="OTHER">Other</option>
            </CFormSelect>
            <small className="text-medium-emphasis">
              Which project type should use this template
            </small>
          </div>

          <div className="mb-3">
            <CFormLabel htmlFor="description">Description (Optional)</CFormLabel>
            <CFormTextarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this template's purpose and structure..."
              disabled={creating}
            />
          </div>

          <div className="p-3 border rounded bg-light">
            <strong>💡 What happens next:</strong>
            <ul className="mb-0 mt-2">
              <li>A new template with a starter category will be created</li>
              <li>You can immediately start building your category hierarchy</li>
              <li>This template will be available globally for all projects</li>
            </ul>
          </div>
        </CModalBody>

        <CModalFooter>
          <CButton color="secondary" onClick={handleClose} disabled={creating}>
            Cancel
          </CButton>
          <CButton color="primary" type="submit" disabled={creating}>
            {creating ? (
              <>
                <CSpinner size="sm" className="me-2" />
                Creating...
              </>
            ) : (
              'Create Template'
            )}
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  );
}
