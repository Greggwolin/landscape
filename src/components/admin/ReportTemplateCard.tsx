'use client';

import React from 'react';
import { CCard, CCardBody, CCardTitle, CCardText, CBadge } from '@coreui/react';
import { LandscapeButton } from '@/components/ui/landscape';
import { useDeleteReportTemplate, useToggleReportTemplateActive } from '@/hooks/useReports';
import type { ReportTemplate } from '@/hooks/useReports';

interface ReportTemplateCardProps {
  template: ReportTemplate;
  onEdit: (template: ReportTemplate) => void;
}

/**
 * ReportTemplateCard
 *
 * Card component displaying a single report template with actions.
 * Shows template name, description, format, assigned tabs, and action buttons.
 */
export default function ReportTemplateCard({ template, onEdit }: ReportTemplateCardProps) {
  const deleteTemplate = useDeleteReportTemplate();
  const toggleActive = useToggleReportTemplateActive();

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${template.template_name}"?`)) {
      try {
        await deleteTemplate.mutateAsync(template.id);
      } catch (error) {
        console.error('Failed to delete template:', error);
        alert('Failed to delete template. Please try again.');
      }
    }
  };

  const handleToggleActive = async () => {
    try {
      await toggleActive.mutateAsync(template.id);
    } catch (error) {
      console.error('Failed to toggle active status:', error);
      alert('Failed to update template status. Please try again.');
    }
  };

  const formatIcon = {
    pdf: '📄',
    excel: '📊',
    powerpoint: '📽️',
  };

  return (
    <CCard
      style={{
        height: '100%',
        backgroundColor: template.is_active ? 'var(--cui-card-bg)' : 'var(--cui-secondary-bg)',
        borderColor: template.is_active ? 'var(--cui-border-color)' : 'var(--cui-border-color-translucent)',
      }}
    >
      <CCardBody className="d-flex flex-column">
        {/* Header with Title and Status Badge */}
        <div className="d-flex justify-content-between align-items-start mb-2">
          <CCardTitle className="mb-0 d-flex align-items-center gap-2">
            <span>{formatIcon[template.output_format]}</span>
            <span>{template.template_name}</span>
          </CCardTitle>
          <CBadge color={template.is_active ? 'success' : 'secondary'}>
            {template.is_active ? 'Active' : 'Inactive'}
          </CBadge>
        </div>

        {/* Description */}
        {template.description && (
          <CCardText className="text-muted mb-3" style={{ fontSize: '0.875rem' }}>
            {template.description}
          </CCardText>
        )}

        {/* Format Badge */}
        <div className="mb-3">
          <CBadge color="info" className="me-2">
            {template.output_format.toUpperCase()}
          </CBadge>
        </div>

        {/* Assigned Tabs */}
        {template.assigned_tabs && template.assigned_tabs.length > 0 && (
          <div className="mb-3">
            <small className="text-muted d-block mb-1">Assigned to:</small>
            <div className="d-flex flex-wrap gap-1">
              {template.assigned_tabs.map((tab) => (
                <CBadge key={tab} color="primary" style={{ fontSize: '0.75rem' }}>
                  {tab}
                </CBadge>
              ))}
            </div>
          </div>
        )}

        {/* Sections Count */}
        {template.sections && template.sections.length > 0 && (
          <div className="mb-3">
            <small className="text-muted">
              {template.sections.length} section{template.sections.length !== 1 ? 's' : ''}
            </small>
          </div>
        )}

        {/* Spacer to push buttons to bottom */}
        <div style={{ flex: 1 }} />

        {/* Action Buttons */}
        <div className="d-flex gap-2 mt-3">
          <LandscapeButton
            variant="outline-primary"
            size="sm"
            onClick={() => onEdit(template)}
            style={{ flex: 1 }}
          >
            Edit
          </LandscapeButton>
          <LandscapeButton
            variant={template.is_active ? 'outline-secondary' : 'outline-success'}
            size="sm"
            onClick={handleToggleActive}
            disabled={toggleActive.isPending}
          >
            {template.is_active ? 'Deactivate' : 'Activate'}
          </LandscapeButton>
          <LandscapeButton
            variant="outline-danger"
            size="sm"
            onClick={handleDelete}
            disabled={deleteTemplate.isPending}
          >
            Delete
          </LandscapeButton>
        </div>

        {/* Timestamp */}
        <small className="text-muted mt-2" style={{ fontSize: '0.75rem' }}>
          Updated: {new Date(template.updated_at).toLocaleDateString()}
        </small>
      </CCardBody>
    </CCard>
  );
}
