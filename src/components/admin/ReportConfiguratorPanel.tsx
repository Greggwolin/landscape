'use client';

import React, { useState } from 'react';
import { LandscapeButton } from '@/components/ui/landscape';
import { useReportTemplates } from '@/hooks/useReports';
import ReportTemplateCard from './ReportTemplateCard';
import ReportTemplateEditorModal from './ReportTemplateEditorModal';
import type { ReportTemplate } from '@/hooks/useReports';

/**
 * ReportConfiguratorPanel
 *
 * Main panel for managing report templates in the Admin modal.
 * Displays grid of template cards with options to create, edit, and delete.
 */
export default function ReportConfiguratorPanel() {
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  const { data: templates, isLoading, error } = useReportTemplates();

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setShowEditor(true);
  };

  const handleEdit = (template: ReportTemplate) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setEditingTemplate(null);
  };

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <strong>Error loading report templates:</strong> {(error as Error).message}
      </div>
    );
  }

  return (
    <div style={{ height: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="mb-1">Report Templates</h5>
          <p className="text-muted mb-0" style={{ fontSize: '0.875rem' }}>
            Configure custom report templates and assign them to project tabs
          </p>
        </div>
        <LandscapeButton
          variant="primary"
          onClick={handleCreateNew}
          disabled={isLoading}
        >
          Create Template
        </LandscapeButton>
      </div>

      {/* Templates Grid */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted mt-2">Loading report templates...</p>
          </div>
        ) : templates && templates.length > 0 ? (
          <div className="row g-3">
            {templates.map((template) => (
              <div key={template.id} className="col-12 col-md-6 col-lg-4">
                <ReportTemplateCard
                  template={template}
                  onEdit={handleEdit}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-5">
            <p className="text-muted">No report templates configured yet.</p>
            <LandscapeButton variant="outline-primary" onClick={handleCreateNew}>
              Create Your First Template
            </LandscapeButton>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <ReportTemplateEditorModal
          template={editingTemplate}
          onClose={handleCloseEditor}
        />
      )}
    </div>
  );
}
