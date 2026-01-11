'use client';

import { useState, useEffect } from 'react';
import { useProjectContext } from '@/app/components/ProjectProvider';

interface Template {
  template_id: number;
  template_name: string;
  description: string | null;
  doc_type_options: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface FormData {
  template_name: string;
  description: string;
  doc_type_options: string[];
  is_default: boolean;
}

export default function TemplatesAdminPage() {
  const { activeProject } = useProjectContext();
  // Fallback to default workspace id 1 if no active project context is available
  const workspaceId = (activeProject as any)?.workspace_id ?? 1;
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState<FormData>({
    template_name: '',
    description: '',
    doc_type_options: [],
    is_default: false
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (workspaceId) {
      void fetchTemplates();
    }
  }, [workspaceId]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/dms/templates?workspace_id=${workspaceId}`
      );
      const { templates } = await response.json();
      setTemplates(templates);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setFormData({
      template_name: '',
      description: '',
      doc_type_options: [],
      is_default: false
    });
    setShowModal(true);
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name,
      description: template.description || '',
      doc_type_options: template.doc_type_options,
      is_default: template.is_default
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;
    setLoading(true);

    try {
      if (editingTemplate) {
        const response = await fetch(
          `/api/dms/templates/${editingTemplate.template_id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          }
        );

        if (!response.ok) throw new Error('Failed to update template');
      } else {
        const response = await fetch('/api/dms/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            workspace_id: workspaceId
          })
        });

        if (!response.ok) throw new Error('Failed to create template');
      }

      await fetchTemplates();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (templateId: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/dms/templates/${templateId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete template');

      await fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Document Templates
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage document type categories for your projects (workspace #{workspaceId})
            </p>
          </div>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            + Create Template
          </button>
        </div>

        {loading && templates.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Loading templates...
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No templates found. Create your first template to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {templates.map((template) => (
              <div
                key={template.template_id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {template.template_name}
                      </h3>
                      {template.is_default && (
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {template.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(template)}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Edit
                    </button>
                    {!template.is_default && (
                      <button
                        onClick={() => handleDelete(template.template_id)}
                        className="text-sm text-red-600 dark:text-red-400 hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {template.doc_type_options.map((docType) => (
                    <span
                      key={docType}
                      className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                    >
                      {docType}
                    </span>
                  ))}
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                  {template.doc_type_options.length} document types
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </h2>

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={formData.template_name}
                    onChange={(e) =>
                      setFormData({ ...formData, template_name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="e.g., Land Development"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    rows={3}
                    placeholder="Brief description of this template..."
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Document Types (one per line) *
                  </label>
                  <textarea
                    value={formData.doc_type_options.join('\n')}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        doc_type_options: e.target.value
                          .split('\n')
                          .map((s) => s.trim())
                          .filter((s) => s)
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm"
                    rows={12}
                    placeholder="Agreement&#10;Title&#10;Closing&#10;Reports&#10;Environmental&#10;Engineering&#10;..."
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Enter one document type per line. These will appear as filter categories.
                  </p>
                </div>

                <div className="mb-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_default}
                      onChange={(e) =>
                        setFormData({ ...formData, is_default: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Set as default template for this workspace
                    </span>
                  </label>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading
                      ? 'Saving...'
                      : editingTemplate
                      ? 'Save Changes'
                      : 'Create Template'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
