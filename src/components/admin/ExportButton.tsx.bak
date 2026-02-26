'use client';

import React, { useState } from 'react';
import { CDropdown, CDropdownToggle, CDropdownMenu, CDropdownItem, CDropdownDivider } from '@coreui/react';
import { LandscapeButton } from '@/components/ui/landscape';
import { useReportTemplatesForTab, useGenerateReport } from '@/hooks/useReports';
import ReportTemplateEditorModal from './ReportTemplateEditorModal';
import type { ReportTemplate } from '@/hooks/useReports';

interface ExportButtonProps {
  tabName: string;
  projectId: string;
  size?: 'sm' | 'lg';
}

/**
 * ExportButton
 *
 * Dynamic export button that appears on project tabs.
 * Always visible - shows dropdown of available report templates OR "Create Template" option.
 * Handles report generation and download.
 */
export default function ExportButton({ tabName, projectId, size }: ExportButtonProps) {
  const { data: templates, isLoading } = useReportTemplatesForTab(tabName);
  const generateReport = useGenerateReport();
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const sizeClass = size ? `btn-${size}` : '';

  const handleExport = async (template: ReportTemplate) => {
    setGeneratingId(template.id);

    try {
      const result = await generateReport.mutateAsync({
        templateId: template.id,
        projectId,
      });

      const url = window.URL.createObjectURL(result.blob);

      // Determine file extension
      const ext = template.output_format === 'pdf' ? 'pdf' :
                  template.output_format === 'excel' ? 'xlsx' : 'pptx';

      if (template.output_format === 'pdf') {
        // Open PDF in new tab for preview (user can save from browser)
        window.open(url, '_blank');

        // Clean up the blob URL after a delay (gives browser time to load)
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 100);
      } else {
        // For Excel and PowerPoint, download directly (can't preview in browser)
        const link = document.createElement('a');
        link.href = url;
        link.download = `${template.template_name}_${projectId}.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setGeneratingId(null);
    }
  };

  const handleCreateTemplate = () => {
    setShowTemplateEditor(true);
  };

  const hasTemplates = templates && templates.length > 0;

  // If only one template, show split button with dropdown for "Create Template"
  if (hasTemplates && templates.length === 1) {
    const template = templates[0];
    const isGenerating = generatingId === template.id;

    return (
      <>
        <CDropdown variant="btn-group">
        <LandscapeButton
          variant="outline-primary"
          onClick={() => handleExport(template)}
          disabled={isGenerating || isLoading}
          size={size}
        >
          {isGenerating ? 'Generating...' : `Export ${template.output_format.toUpperCase()}`}
        </LandscapeButton>
        <CDropdownToggle
          split
          className={`btn btn-outline-primary ${sizeClass}`.trim()}
          disabled={isLoading || !!generatingId}
        />
          <CDropdownMenu>
            <CDropdownItem onClick={handleCreateTemplate}>
              <span className="me-2">➕</span>
              Create Template
            </CDropdownItem>
          </CDropdownMenu>
        </CDropdown>

        {showTemplateEditor && (
          <ReportTemplateEditorModal
            template={null}
            onClose={() => setShowTemplateEditor(false)}
            defaultTab={tabName}
          />
        )}
      </>
    );
  }

  // Multiple templates OR no templates - show dropdown
  return (
    <>
      <CDropdown variant="btn-group">
        <CDropdownToggle
          className={`btn btn-outline-primary ${sizeClass}`.trim()}
          disabled={isLoading || !!generatingId}
        >
          {generatingId ? 'Generating...' : 'Export Report'}
        </CDropdownToggle>
        <CDropdownMenu>
          {hasTemplates ? (
            <>
              {templates.map((template) => {
                const formatIcon = {
                  pdf: '📄',
                  excel: '📊',
                  powerpoint: '📽️',
                };

                return (
                  <CDropdownItem
                    key={template.id}
                    onClick={() => handleExport(template)}
                    disabled={!!generatingId}
                  >
                    <span className="me-2">{formatIcon[template.output_format]}</span>
                    {template.template_name}
                  </CDropdownItem>
                );
              })}
              <CDropdownDivider />
              <CDropdownItem onClick={handleCreateTemplate}>
                <span className="me-2">➕</span>
                Create Template
              </CDropdownItem>
            </>
          ) : (
            <CDropdownItem onClick={handleCreateTemplate}>
              <span className="me-2">➕</span>
              Create Template for {tabName}
            </CDropdownItem>
          )}
        </CDropdownMenu>
      </CDropdown>

      {showTemplateEditor && (
        <ReportTemplateEditorModal
          template={null}
          onClose={() => setShowTemplateEditor(false)}
          defaultTab={tabName}
        />
      )}
    </>
  );
}
