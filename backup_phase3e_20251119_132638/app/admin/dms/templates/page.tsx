'use client';

import React, { useState, useEffect } from 'react';
import { CButton, CForm, CFormInput, CFormLabel, CFormTextarea, CCard, CCardBody, CCardHeader } from '@coreui/react';

interface Template {
  template_id: number;
  template_name: string;
  description: string | null;
  doc_type_options: string[];
  is_default: boolean;
  workspace_id: number | null;
  project_id: number | null;
  created_at: string;
  updated_at: string;
}

interface TemplateFormData {
  template_name: string;
  description: string;
  doc_type_options: string;
  is_default: boolean;
}

export default function TemplatesAdminPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<TemplateFormData>({
    template_name: '',
    description: '',
    doc_type_options: '',
    is_default: false
  });

  const workspaceId = 1; // TODO: Get from context

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/dms/templates?workspace_id=${workspaceId}`);

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

  const handleCreate = () => {
    setEditingId(null);
    setFormData({
      template_name: '',
      description: '',
      doc_type_options: '',
      is_default: false
    });
    setShowCreateForm(true);
  };

  const handleEdit = (template: Template) => {
    setEditingId(template.template_id);
    setFormData({
      template_name: template.template_name,
      description: template.description || '',
      doc_type_options: template.doc_type_options.join('\n'),
      is_default: template.is_default
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setShowCreateForm(false);
    setFormData({
      template_name: '',
      description: '',
      doc_type_options: '',
      is_default: false
    });
  };

  const handleSave = async () => {
    try {
      const docTypeArray = formData.doc_type_options
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (docTypeArray.length === 0) {
        alert('Please enter at least one document type');
        return;
      }

      const payload = {
        template_name: formData.template_name,
        description: formData.description || null,
        doc_type_options: docTypeArray,
        is_default: formData.is_default,
        workspace_id: workspaceId
      };

      let response;
      if (editingId) {
        // Update existing template
        response = await fetch(`/api/dms/templates/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // Create new template
        response = await fetch('/api/dms/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save template');
      }

      handleCancel();
      fetchTemplates();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save template');
    }
  };

  const handleDelete = async (template: Template) => {
    if (template.is_default) {
      alert('Cannot delete the default template. Please set another template as default first.');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${template.template_name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/dms/templates/${template.template_id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete template');
      }

      fetchTemplates();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">Loading templates...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-red-600 dark:text-red-400">Error: {error}</div>
          <CButton color="primary" onClick={fetchTemplates} className="mt-4">
            Retry
          </CButton>
        </div>
      </div>
    );
  }

  // Color palette for document type chips
  const chipColors = [
    { bg: 'rgba(13, 110, 253, 0.1)', text: 'rgb(13, 110, 253)', border: 'rgba(13, 110, 253, 0.3)' }, // blue
    { bg: 'rgba(25, 135, 84, 0.1)', text: 'rgb(25, 135, 84)', border: 'rgba(25, 135, 84, 0.3)' }, // green
    { bg: 'rgba(220, 53, 69, 0.1)', text: 'rgb(220, 53, 69)', border: 'rgba(220, 53, 69, 0.3)' }, // red
    { bg: 'rgba(255, 193, 7, 0.1)', text: 'rgb(193, 115, 0)', border: 'rgba(255, 193, 7, 0.3)' }, // yellow
    { bg: 'rgba(111, 66, 193, 0.1)', text: 'rgb(111, 66, 193)', border: 'rgba(111, 66, 193, 0.3)' }, // purple
    { bg: 'rgba(13, 202, 240, 0.1)', text: 'rgb(13, 162, 200)', border: 'rgba(13, 202, 240, 0.3)' }, // cyan
    { bg: 'rgba(253, 126, 20, 0.1)', text: 'rgb(253, 126, 20)', border: 'rgba(253, 126, 20, 0.3)' }, // orange
    { bg: 'rgba(214, 51, 132, 0.1)', text: 'rgb(214, 51, 132)', border: 'rgba(214, 51, 132, 0.3)' }, // pink
  ];

  const getChipColor = (index: number) => chipColors[index % chipColors.length];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--cui-body-color)' }}>
            Document Templates
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--cui-secondary-color)' }}>
            Manage document type options for your workspace
          </p>
        </div>
        <CButton color="primary" onClick={handleCreate}>
          + Create Template
        </CButton>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <CCard className="mb-4">
          <CCardHeader>
            <h3 className="text-lg font-medium">Create New Template</h3>
          </CCardHeader>
          <CCardBody>
            <CForm>
              <div className="mb-3">
                <CFormLabel htmlFor="template_name">Template Name *</CFormLabel>
                <CFormInput
                  type="text"
                  id="template_name"
                  value={formData.template_name}
                  onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                  placeholder="e.g., Standard Document Types"
                />
              </div>

              <div className="mb-3">
                <CFormLabel htmlFor="description">Description</CFormLabel>
                <CFormInput
                  type="text"
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>

              <div className="mb-3">
                <CFormLabel htmlFor="doc_type_options">Document Types * (one per line)</CFormLabel>
                <CFormTextarea
                  id="doc_type_options"
                  rows={10}
                  value={formData.doc_type_options}
                  onChange={(e) => setFormData({ ...formData, doc_type_options: e.target.value })}
                  placeholder={'Contract\nInvoice\nReport\nPlan\nProposal'}
                />
                <small className="text-gray-500 dark:text-gray-400">
                  Enter each document type on a new line
                </small>
              </div>

              <div className="mb-3 form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="is_default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="is_default">
                  Set as default template
                </label>
              </div>

              <div className="d-flex gap-2">
                <CButton color="primary" onClick={handleSave}>
                  Create Template
                </CButton>
                <CButton color="secondary" onClick={handleCancel}>
                  Cancel
                </CButton>
              </div>
            </CForm>
          </CCardBody>
        </CCard>
      )}

      {/* Templates List */}
      {templates.length === 0 && !showCreateForm ? (
        <div
          className="text-center py-12 rounded-lg border"
          style={{
            backgroundColor: 'var(--cui-card-bg)',
            borderColor: 'var(--cui-border-color)'
          }}
        >
          <div className="mb-4" style={{ color: 'var(--cui-secondary-color)' }}>
            No templates found
          </div>
          <CButton color="primary" onClick={handleCreate}>
            Create Your First Template
          </CButton>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => {
            const isEditing = editingId === template.template_id;

            if (isEditing) {
              return (
                <CCard key={template.template_id}>
                  <CCardHeader>
                    <h3 className="text-lg font-medium">Edit Template</h3>
                  </CCardHeader>
                  <CCardBody>
                    <CForm>
                      <div className="mb-3">
                        <CFormLabel htmlFor={`edit_name_${template.template_id}`}>Template Name *</CFormLabel>
                        <CFormInput
                          type="text"
                          id={`edit_name_${template.template_id}`}
                          value={formData.template_name}
                          onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                        />
                      </div>

                      <div className="mb-3">
                        <CFormLabel htmlFor={`edit_desc_${template.template_id}`}>Description</CFormLabel>
                        <CFormInput
                          type="text"
                          id={`edit_desc_${template.template_id}`}
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                      </div>

                      <div className="mb-3">
                        <CFormLabel htmlFor={`edit_types_${template.template_id}`}>Document Types * (one per line)</CFormLabel>
                        <CFormTextarea
                          id={`edit_types_${template.template_id}`}
                          rows={10}
                          value={formData.doc_type_options}
                          onChange={(e) => setFormData({ ...formData, doc_type_options: e.target.value })}
                        />
                      </div>

                      <div className="mb-3 form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id={`edit_default_${template.template_id}`}
                          checked={formData.is_default}
                          onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                        />
                        <label className="form-check-label" htmlFor={`edit_default_${template.template_id}`}>
                          Set as default template
                        </label>
                      </div>

                      <div className="d-flex gap-2">
                        <CButton color="primary" onClick={handleSave}>
                          Save Changes
                        </CButton>
                        <CButton color="secondary" onClick={handleCancel}>
                          Cancel
                        </CButton>
                      </div>
                    </CForm>
                  </CCardBody>
                </CCard>
              );
            }

            return (
              <div
                key={template.template_id}
                className="rounded-lg border p-5"
                style={{
                  backgroundColor: 'var(--cui-card-bg)',
                  borderColor: 'var(--cui-border-color)'
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-medium" style={{ color: 'var(--cui-body-color)' }}>
                        {template.template_name}
                      </h3>
                      {template.is_default && (
                        <span
                          className="px-2 py-1 text-xs font-medium rounded"
                          style={{
                            backgroundColor: 'rgba(13, 110, 253, 0.1)',
                            color: 'rgb(13, 110, 253)',
                            border: '1px solid rgba(13, 110, 253, 0.3)'
                          }}
                        >
                          Default
                        </span>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm mt-1" style={{ color: 'var(--cui-secondary-color)' }}>
                        {template.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <CButton
                      color="warning"
                      size="sm"
                      onClick={() => handleEdit(template)}
                    >
                      Edit
                    </CButton>
                    <CButton
                      color="danger"
                      size="sm"
                      onClick={() => handleDelete(template)}
                      disabled={template.is_default}
                    >
                      Delete
                    </CButton>
                  </div>
                </div>

                {/* Document Types */}
                <div className="mt-3">
                  <div className="text-xs font-medium mb-2" style={{ color: 'var(--cui-body-color)' }}>
                    Document Types ({template.doc_type_options.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {template.doc_type_options.map((docType, idx) => {
                      const color = getChipColor(idx);
                      return (
                        <span
                          key={idx}
                          className="px-3 py-1 text-sm rounded-full"
                          style={{
                            backgroundColor: color.bg,
                            color: color.text,
                            border: `1px solid ${color.border}`
                          }}
                        >
                          {docType}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Metadata */}
                <div className="mt-3 pt-3 text-xs" style={{
                  borderTop: '1px solid var(--cui-border-color)',
                  color: 'var(--cui-secondary-color)'
                }}>
                  Created: {new Date(template.created_at).toLocaleDateString()} •
                  Updated: {new Date(template.updated_at).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
