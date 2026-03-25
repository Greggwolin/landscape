'use client';

import React from 'react';
import { CCard, CCardBody, CCardHeader, CSpinner, CBadge, CButton } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCloudDownload } from '@coreui/icons';
import { useReportPreview, useReportExport } from '@/hooks/useReports';
import type { ReportDefinition, ReportPreviewSection, ReportColumn } from '@/types/report-definitions';
import ReportPlaceholder from './ReportPlaceholder';

interface ReportViewerProps {
  definition: ReportDefinition | null;
  projectId: string | number;
}

export default function ReportViewer({ definition, projectId }: ReportViewerProps) {
  const { data: preview, isLoading, error } = useReportPreview(
    definition?.report_code ?? null,
    projectId
  );
  const exportMutation = useReportExport();

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
          Loading {definition.report_name}...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <CCard>
        <CCardBody style={{ color: 'var(--cui-danger)' }}>
          Error loading report: {(error as Error).message}
        </CCardBody>
      </CCard>
    );
  }

  // Not implemented
  if (preview?.status === 'not_implemented') {
    return <ReportPlaceholder definition={definition} message={preview.message} />;
  }

  // Error from backend
  if (preview?.status === 'error') {
    return (
      <ReportPlaceholder
        definition={definition}
        message={`Error: ${preview.message || preview.error || 'Unknown error generating report'}`}
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
          a.download = `${definition.report_code}_${projectId}.${fmt}`;
          a.click();
          URL.revokeObjectURL(url);
        },
      }
    );
  };

  const reportData = preview?.data;

  return (
    <div>
      {/* Report header */}
      <CCard className="mb-3">
        <CCardHeader className="d-flex align-items-center justify-content-between"
          style={{ padding: '10px 16px' }}
        >
          <div>
            <h5 style={{ margin: 0, color: 'var(--cui-body-color)' }}>
              {reportData?.title || definition.report_name}
            </h5>
            {reportData?.subtitle && (
              <small style={{ color: 'var(--cui-secondary-color)' }}>
                {reportData.subtitle}
              </small>
            )}
          </div>
          <div className="d-flex gap-2 align-items-center">
            {preview?.generation_time_ms && (
              <small style={{ color: 'var(--cui-tertiary-color)', marginRight: '8px' }}>
                {preview.generation_time_ms}ms
              </small>
            )}
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

      {/* Report sections */}
      {reportData?.sections?.map((section, idx) => (
        <ReportSection key={idx} section={section} />
      ))}

      {/* Empty data message */}
      {reportData?.message && (!reportData.sections || reportData.sections.length === 0) && (
        <CCard>
          <CCardBody style={{ color: 'var(--cui-secondary-color)', textAlign: 'center' }}>
            {reportData.message}
          </CCardBody>
        </CCard>
      )}
    </div>
  );
}


// =============================================================================
// Section renderer
// =============================================================================

function ReportSection({ section }: { section: ReportPreviewSection }) {
  if (section.type === 'kpi_cards') {
    return (
      <CCard className="mb-3">
        {section.heading && (
          <CCardHeader style={{ padding: '8px 16px', fontWeight: 600, fontSize: '0.85rem' }}>
            {section.heading}
          </CCardHeader>
        )}
        <CCardBody>
          <div className="d-flex gap-3 flex-wrap">
            {section.cards?.map((card, i) => (
              <div key={i} style={{
                padding: '12px 20px',
                border: '1px solid var(--cui-border-color)',
                borderRadius: '6px',
                minWidth: '140px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--cui-secondary-color)', marginBottom: '4px' }}>
                  {card.label}
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--cui-body-color)' }}>
                  {card.value}
                </div>
              </div>
            ))}
          </div>
        </CCardBody>
      </CCard>
    );
  }

  if (section.type === 'table') {
    return (
      <CCard className="mb-3">
        {section.heading && (
          <CCardHeader style={{ padding: '8px 16px', fontWeight: 600, fontSize: '0.85rem' }}>
            {section.heading}
          </CCardHeader>
        )}
        <CCardBody style={{ padding: 0, overflow: 'auto' }}>
          <ReportTable columns={section.columns || []} rows={section.rows || []} totals={section.totals} />
        </CCardBody>
      </CCard>
    );
  }

  if (section.type === 'text') {
    return (
      <CCard className="mb-3">
        {section.heading && (
          <CCardHeader style={{ padding: '8px 16px', fontWeight: 600, fontSize: '0.85rem' }}>
            {section.heading}
          </CCardHeader>
        )}
        <CCardBody>
          <p style={{ color: 'var(--cui-body-color)', whiteSpace: 'pre-wrap' }}>
            {section.content}
          </p>
        </CCardBody>
      </CCard>
    );
  }

  return null;
}


// =============================================================================
// Table renderer
// =============================================================================

function ReportTable({
  columns,
  rows,
  totals,
}: {
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  totals?: Record<string, unknown>;
}) {
  const formatValue = (value: unknown, format?: string): string => {
    if (value === null || value === undefined) return '—';
    if (format === 'currency') {
      const num = Number(value);
      return isNaN(num) ? String(value) : `$${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    if (format === 'number') {
      const num = Number(value);
      return isNaN(num) ? String(value) : num.toLocaleString('en-US');
    }
    if (format === 'percentage') {
      const num = Number(value);
      return isNaN(num) ? String(value) : `${num.toFixed(1)}%`;
    }
    return String(value);
  };

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
      <thead>
        <tr style={{ borderBottom: '2px solid var(--cui-border-color)' }}>
          {columns.map(col => (
            <th
              key={col.key}
              style={{
                padding: '8px 12px',
                textAlign: (col.align || 'left') as 'left' | 'right' | 'center',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--cui-secondary-color)',
                whiteSpace: 'normal',
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
              }}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIdx) => (
          <tr
            key={rowIdx}
            style={{
              borderBottom: '1px solid var(--cui-border-color)',
              background: rowIdx % 2 === 0 ? 'transparent' : 'var(--cui-tertiary-bg)',
            }}
          >
            {columns.map(col => (
              <td
                key={col.key}
                style={{
                  padding: '6px 12px',
                  textAlign: (col.align || 'left') as 'left' | 'right' | 'center',
                  fontSize: '0.85rem',
                  color: 'var(--cui-body-color)',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatValue(row[col.key], col.format)}
              </td>
            ))}
          </tr>
        ))}
        {totals && (
          <tr style={{
            borderTop: '2px solid var(--cui-border-color)',
            fontWeight: 700,
            background: 'var(--cui-tertiary-bg)',
          }}>
            {columns.map((col, i) => (
              <td
                key={col.key}
                style={{
                  padding: '8px 12px',
                  textAlign: (col.align || 'left') as 'left' | 'right' | 'center',
                  fontSize: '0.85rem',
                  color: 'var(--cui-body-color)',
                }}
              >
                {i === 0 ? 'Total' : formatValue(totals[col.key], col.format)}
              </td>
            ))}
          </tr>
        )}
      </tbody>
    </table>
  );
}
