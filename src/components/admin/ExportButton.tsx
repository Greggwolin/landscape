'use client';

import React, { useState } from 'react';
import { CDropdown, CDropdownToggle, CDropdownMenu, CDropdownItem } from '@coreui/react';
import { LandscapeButton } from '@/components/ui/landscape';
import { useReportTemplatesForTab, useGenerateReport } from '@/hooks/useReports';
import type { ReportTemplate } from '@/hooks/useReports';

interface ExportButtonProps {
  tabName: string;
  projectId: string;
}

/**
 * ExportButton
 *
 * Dynamic export button that appears on project tabs.
 * Shows dropdown of available report templates assigned to this tab.
 * Handles report generation and download.
 */
export default function ExportButton({ tabName, projectId }: ExportButtonProps) {
  const { data: templates, isLoading } = useReportTemplatesForTab(tabName);
  const generateReport = useGenerateReport();
  const [generatingId, setGeneratingId] = useState<number | null>(null);

  const handleExport = async (template: ReportTemplate) => {
    setGeneratingId(template.id);

    try {
      const result = await generateReport.mutateAsync({
        templateId: template.id,
        projectId,
      });

      // Create download link
      const url = window.URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;

      // Determine file extension
      const ext = template.output_format === 'pdf' ? 'pdf' :
                  template.output_format === 'excel' ? 'xlsx' : 'pptx';

      link.download = `${template.template_name}_${projectId}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setGeneratingId(null);
    }
  };

  // Don't show button if no templates assigned to this tab
  if (!templates || templates.length === 0) {
    return null;
  }

  // If only one template, show simple button
  if (templates.length === 1) {
    const template = templates[0];
    const isGenerating = generatingId === template.id;

    return (
      <LandscapeButton
        variant="outline-primary"
        onClick={() => handleExport(template)}
        disabled={isGenerating || isLoading}
      >
        {isGenerating ? 'Generating...' : `Export ${template.output_format.toUpperCase()}`}
      </LandscapeButton>
    );
  }

  // Multiple templates - show dropdown
  return (
    <CDropdown variant="btn-group">
      <CDropdownToggle
        className="btn btn-outline-primary"
        disabled={isLoading || !!generatingId}
      >
        {generatingId ? 'Generating...' : 'Export Report'}
      </CDropdownToggle>
      <CDropdownMenu>
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
      </CDropdownMenu>
    </CDropdown>
  );
}
