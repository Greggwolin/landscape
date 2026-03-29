'use client';

import React, { useEffect } from 'react';
import { CCard, CCardBody, CCardHeader, CSpinner, CButton } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCloudDownload, cilReload } from '@coreui/icons';
import { useReportPdfPreview, useReportExport } from '@/hooks/useReports';
import type { ReportDefinition } from '@/types/report-definitions';
import ReportPlaceholder from './ReportPlaceholder';

interface ReportViewerProps {
  definition: ReportDefinition | null;
  projectId: string | number;
}

export default function ReportViewer({ definition, projectId }: ReportViewerProps) {
  const {
    data: pdfUrl,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useReportPdfPreview(
    definition?.report_code ?? null,
    projectId
  );

  const exportMutation = useReportExport();

  // Clean up blob URL when component unmounts or URL changes
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  if (!definition) {
    return (
      <div className="d-flex align-items-center justify-content-center h-100"
        style={{ color: 'var(--cui-secondary-color)', minHeight: '400px' }}
      >
        Select a report from the catalog
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="d-flex align-items-center justify-content-center h-100"
        style={{ minHeight: '400px' }}
      >
        <CSpinner color="primary" />
        <span className="ms-2" style={{ color: 'var(--cui-secondary-color)' }}>
          Generating {definition.report_name}...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <ReportPlaceholder
        definition={definition}
        message={`Error: ${(error as Error).message}`}
      />
    );
  }

  const handleExport = (format: 'pdf' | 'excel') => {
    exportMutation.mutate(
      { reportCode: definition.report_code, projectId, format },
      {
        onSuccess: ({ blob, format: fmt }) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const ext = fmt === 'excel' ? 'xlsx' : fmt;
          a.download = `${definition.report_code}_${projectId}.${ext}`;
          a.click();
          URL.revokeObjectURL(url);
        },
      }
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Report header */}
      <CCard className="mb-2" style={{ flexShrink: 0 }}>
        <CCardHeader className="d-flex align-items-center justify-content-between"
          style={{ padding: '8px 16px' }}
        >
          <div>
            <h5 style={{ margin: 0, color: 'var(--cui-body-color)' }}>
              {definition.report_name}
            </h5>
          </div>
          <div className="d-flex gap-2 align-items-center">
            <CButton
              color="secondary"
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Regenerate report"
            >
              <CIcon icon={cilReload} size="sm" className={isFetching ? 'spin-icon' : ''} />
            </CButton>
            <CButton
              color="primary"
              variant="ghost"
              size="sm"
              onClick={() => handleExport('pdf')}
              disabled={exportMutation.isPending}
            >
              <CIcon icon={cilCloudDownload} size="sm" className="me-1" />
              PDF
            </CButton>
            <CButton
              color="primary"
              variant="ghost"
              size="sm"
              onClick={() => handleExport('excel')}
              disabled={exportMutation.isPending}
            >
              <CIcon icon={cilCloudDownload} size="sm" className="me-1" />
              Excel
            </CButton>
          </div>
        </CCardHeader>
      </CCard>

      {/* PDF preview iframe */}
      {pdfUrl ? (
        <div style={{ flex: 1, minHeight: '600px' }}>
          <iframe
            src={pdfUrl}
            style={{
              width: '100%',
              height: '100%',
              minHeight: '600px',
              border: '1px solid var(--cui-border-color)',
              borderRadius: '4px',
              backgroundColor: '#525659',
            }}
            title={`${definition.report_name} Preview`}
          />
        </div>
      ) : (
        <CCard>
          <CCardBody style={{ color: 'var(--cui-secondary-color)', textAlign: 'center' }}>
            No preview available
          </CCardBody>
        </CCard>
      )}
    </div>
  );
}
