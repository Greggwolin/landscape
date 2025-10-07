'use client';

import React, { useState, useEffect } from 'react';
import { useProjectContext } from '@/app/components/ProjectProvider';
import TemplateDesigner from '@/components/dms/admin/TemplateDesigner';
import type { DMSTemplate } from '@/lib/dms/db';

export default function DMSTemplatesAdminPage() {
  const { activeProject: currentProject } = useProjectContext();
  const [templates, setTemplates] = useState<DMSTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DMSTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [defaultWorkspaceId, setDefaultWorkspaceId] = useState<number>(1);

  // Fetch templates for current project
  useEffect(() => {
    async function fetchTemplates() {
      try {
        const params = new URLSearchParams({
          workspaceId: defaultWorkspaceId.toString(),
        });

        if (currentProject) {
          params.append('projectId', currentProject.project_id.toString());
        }

        const response = await fetch(`/api/dms/templates?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch templates');
        }
        const data = await response.json();
        setTemplates(data.templates || []);

        // Select default template if available
        const defaultTemplate = data.templates?.find((t: DMSTemplate) => t.is_default);
        if (defaultTemplate) {
          setSelectedTemplate(defaultTemplate);
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTemplates();
  }, [currentProject, defaultWorkspaceId]);

  const handleSaveTemplate = async (template: Partial<DMSTemplate>, attributeConfigs: any[]) => {
    try {
      const response = await fetch('/api/dms/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: {
            ...template,
            workspace_id: defaultWorkspaceId,
            project_id: currentProject?.project_id || null,
          },
          attributeConfigs,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save template');
      }

      const data = await response.json();

      // Refresh templates list
      const params = new URLSearchParams({
        workspaceId: defaultWorkspaceId.toString(),
      });
      if (currentProject) {
        params.append('projectId', currentProject.project_id.toString());
      }

      const refreshResponse = await fetch(`/api/dms/templates?${params.toString()}`);
      const refreshData = await refreshResponse.json();
      setTemplates(refreshData.templates || []);
      setSelectedTemplate(data.template);

      alert('Template saved successfully!');
    } catch (error) {
      console.error('Save error:', error);
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Document Templates
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure which attributes are required or optional for different document types
          {currentProject && (
            <>
              {' '}
              in <strong>{currentProject.project_name}</strong>
            </>
          )}
        </p>
      </div>

      {!currentProject && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Select a project to create project-specific templates, or create workspace-level
            templates below.
          </p>
        </div>
      )}

      {/* Existing Templates */}
      {templates.length > 0 && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Existing Templates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <button
                key={template.template_id}
                onClick={() => setSelectedTemplate(template)}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  selectedTemplate?.template_id === template.template_id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      {template.template_name}
                    </h3>
                    {template.doc_type && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        For: {template.doc_type}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {(template as any).attribute_count || 0} attributes
                    </p>
                  </div>
                  {template.is_default && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                      Default
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Template Designer */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <TemplateDesigner
          workspaceId={defaultWorkspaceId}
          projectId={currentProject?.project_id}
          initialTemplate={selectedTemplate || undefined}
          onSave={handleSaveTemplate}
          onCancel={() => setSelectedTemplate(null)}
        />
      </div>

      {/* Help Section */}
      <div className="mt-8 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          About Templates
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Template Levels
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <li>
                <strong>Workspace Templates:</strong> Apply to all projects in the workspace
              </li>
              <li>
                <strong>Project Templates:</strong> Override workspace templates for specific
                projects
              </li>
              <li>
                <strong>Doc Type Templates:</strong> Different requirements for PDFs, contracts,
                etc.
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Best Practices
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <li>Start with a default template for all document types</li>
              <li>Mark essential fields as required</li>
              <li>Create specialized templates for contracts, permits, etc.</li>
              <li>Use display order to group related fields</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
