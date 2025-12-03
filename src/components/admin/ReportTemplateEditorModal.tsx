'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormLabel,
  CFormInput,
  CFormTextarea,
  CFormSelect,
} from '@coreui/react';
import { LandscapeButton } from '@/components/ui/landscape';
import {
  useCreateReportTemplate,
  useUpdateReportTemplate,
  type ReportTemplate,
  type CreateReportTemplateData,
} from '@/hooks/useReports';
import { useUnsavedChanges, useKeyboardShortcuts } from '@/hooks/useUnsavedChanges';

interface ReportTemplateEditorModalProps {
  template: ReportTemplate | null;
  onClose: () => void;
  defaultTab?: string;
}

// Available tabs for assignment
const AVAILABLE_TABS = [
  'Budget',
  'Planning',
  'Sales & Absorption',
  'Feasibility',
  'Capitalization',
  'Valuation',
  'Operations',
  'Project',
  'Property',
];

// Available sections for reports
const AVAILABLE_SECTIONS = [
  'Overview',
  'Financial Summary',
  'Budget Details',
  'Sales & Absorption',
  'Cash Flow',
  'Development Timeline',
  'Market Data',
  'Assumptions',
  'Sensitivity Analysis',
  'Executive Summary',
];

/**
 * ReportTemplateEditorModal
 *
 * Modal for creating or editing report templates.
 * Provides form inputs for all template properties.
 */
export default function ReportTemplateEditorModal({
  template,
  onClose,
  defaultTab,
}: ReportTemplateEditorModalProps) {
  const isEditing = !!template;
  const createTemplate = useCreateReportTemplate();
  const updateTemplate = useUpdateReportTemplate();

  const initialData = useMemo<CreateReportTemplateData>(() => ({
    template_name: template?.template_name || '',
    description: template?.description || '',
    output_format: template?.output_format || 'pdf',
    assigned_tabs: template?.assigned_tabs || (defaultTab ? [defaultTab] : []),
    sections: template?.sections || [],
  }), [template, defaultTab]);

  const [formData, setFormData] = useState<CreateReportTemplateData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Detect if form has unsaved changes
  const hasChanges = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialData);
  }, [formData, initialData]);

  // Use unsaved changes hook for close confirmation
  const handleCloseWithConfirmation = useUnsavedChanges(hasChanges, onClose);

  // Add keyboard shortcuts (ESC to close, Cmd/Ctrl+Enter to submit)
  useKeyboardShortcuts(handleCloseWithConfirmation);

  const handleInputChange = (field: keyof CreateReportTemplateData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleTabToggle = (tab: string) => {
    setFormData((prev) => {
      const isSelected = prev.assigned_tabs.includes(tab);
      return {
        ...prev,
        assigned_tabs: isSelected
          ? prev.assigned_tabs.filter((t) => t !== tab)
          : [...prev.assigned_tabs, tab],
      };
    });
  };

  const handleSectionToggle = (section: string) => {
    setFormData((prev) => {
      const isSelected = prev.sections.includes(section);
      return {
        ...prev,
        sections: isSelected
          ? prev.sections.filter((s) => s !== section)
          : [...prev.sections, section],
      };
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.template_name.trim()) {
      newErrors.template_name = 'Template name is required';
    }

    if (formData.assigned_tabs.length === 0) {
      newErrors.assigned_tabs = 'Select at least one tab';
    }

    if (formData.sections.length === 0) {
      newErrors.sections = 'Select at least one section';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      if (isEditing && template) {
        await updateTemplate.mutateAsync({
          id: template.id,
          ...formData,
        });
      } else {
        await createTemplate.mutateAsync(formData);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save template:', error);
      setErrors({ submit: 'Failed to save template. Please try again.' });
    }
  };

  const isSaving = createTemplate.isPending || updateTemplate.isPending;

  return (
    <CModal visible={true} onClose={handleCloseWithConfirmation} size="lg" backdrop="static">
      <CModalHeader closeButton>
        <CModalTitle>
          {isEditing ? 'Edit Report Template' : 'Create Report Template'}
        </CModalTitle>
      </CModalHeader>

      <CForm onSubmit={handleSubmit}>
        <CModalBody>
          {/* Template Name */}
          <div className="mb-3">
            <CFormLabel htmlFor="template_name">
              Template Name <span className="text-danger">*</span>
            </CFormLabel>
            <CFormInput
              id="template_name"
              value={formData.template_name}
              onChange={(e) => handleInputChange('template_name', e.target.value)}
              invalid={!!errors.template_name}
              placeholder="e.g., Executive Summary Report"
            />
            {errors.template_name && (
              <div className="invalid-feedback d-block">{errors.template_name}</div>
            )}
          </div>

          {/* Description */}
          <div className="mb-3">
            <CFormLabel htmlFor="description">Description</CFormLabel>
            <CFormTextarea
              id="description"
              rows={2}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Brief description of this report template"
            />
          </div>

          {/* Output Format */}
          <div className="mb-3">
            <CFormLabel htmlFor="output_format">
              Output Format <span className="text-danger">*</span>
            </CFormLabel>
            <CFormSelect
              id="output_format"
              value={formData.output_format}
              onChange={(e) =>
                handleInputChange('output_format', e.target.value as 'pdf' | 'excel' | 'powerpoint')
              }
            >
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
              <option value="powerpoint">PowerPoint</option>
            </CFormSelect>
          </div>

          {/* Assigned Tabs */}
          <div className="mb-3">
            <CFormLabel>
              Assign to Tabs <span className="text-danger">*</span>
            </CFormLabel>
            <div className="border rounded p-3" style={{ maxHeight: '150px', overflowY: 'auto' }}>
              {AVAILABLE_TABS.map((tab) => (
                <div key={tab} className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id={`tab-${tab}`}
                    checked={formData.assigned_tabs.includes(tab)}
                    onChange={() => handleTabToggle(tab)}
                  />
                  <label className="form-check-label" htmlFor={`tab-${tab}`}>
                    {tab}
                  </label>
                </div>
              ))}
            </div>
            {errors.assigned_tabs && (
              <div className="text-danger mt-1" style={{ fontSize: '0.875rem' }}>
                {errors.assigned_tabs}
              </div>
            )}
          </div>

          {/* Sections */}
          <div className="mb-3">
            <CFormLabel>
              Include Sections <span className="text-danger">*</span>
            </CFormLabel>
            <div className="border rounded p-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {AVAILABLE_SECTIONS.map((section) => (
                <div key={section} className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id={`section-${section}`}
                    checked={formData.sections.includes(section)}
                    onChange={() => handleSectionToggle(section)}
                  />
                  <label className="form-check-label" htmlFor={`section-${section}`}>
                    {section}
                  </label>
                </div>
              ))}
            </div>
            {errors.sections && (
              <div className="text-danger mt-1" style={{ fontSize: '0.875rem' }}>
                {errors.sections}
              </div>
            )}
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="alert alert-danger" role="alert">
              {errors.submit}
            </div>
          )}
        </CModalBody>

        <CModalFooter>
          <LandscapeButton variant="secondary" onClick={handleCloseWithConfirmation} disabled={isSaving}>
            Cancel
          </LandscapeButton>
          <LandscapeButton variant="primary" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Template'}
          </LandscapeButton>
        </CModalFooter>
      </CForm>
    </CModal>
  );
}
