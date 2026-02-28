'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { CCard, CCardBody, CCardHeader } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilChevronBottom, cilChevronRight } from '@coreui/icons';
import { RentScheduleReport } from '@/components/reports/RentScheduleReport';
import { useLandscaperRefresh } from '@/hooks/useLandscaperRefresh';

interface Project {
  project_id: number;
  project_name: string;
}

interface ReportsTabProps {
  project: Project;
}

interface ReportItem {
  id: string;
  name: string;
  description: string;
  component?: React.ReactNode;
}

export default function ReportsTab({ project }: ReportsTabProps) {
  const [auditOpen, setAuditOpen] = useState(true);
  const [summariesOpen, setSummariesOpen] = useState(false);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  // Force child remount on Landscaper mutations
  const [refreshKey, setRefreshKey] = useState(0);
  const watchedTables = useMemo(() => ['project', 'cashflow'], []);
  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  useLandscaperRefresh(project.project_id, watchedTables, handleRefresh);

  const inflowReports: ReportItem[] = [
    {
      id: 'rent-schedule',
      name: 'Rent Schedule',
      description: 'Unit-level rent roll with current and market rents, vacancy, and concessions.',
      component: <RentScheduleReport key={refreshKey} projectId={project.project_id} />,
    },
  ];

  const toggleReport = (reportId: string) => {
    setExpandedReport((prev) => (prev === reportId ? null : reportId));
  };

  return (
    <div className="d-flex flex-column gap-3">

      {/* ── Audit Panel ── */}
      <CCard>
        <CCardHeader
          className="d-flex align-items-center justify-content-between"
          style={{ cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setAuditOpen(!auditOpen)}
        >
          <h5 className="mb-0 fw-semibold">Audit</h5>
          <CIcon icon={auditOpen ? cilChevronBottom : cilChevronRight} size="lg" />
        </CCardHeader>
        {auditOpen && (
          <CCardBody className="pt-2">

            {/* Inflows */}
            <h6
              className="text-uppercase text-body-secondary fw-semibold mb-3"
              style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}
            >
              Inflows
            </h6>
            <div className="d-flex flex-column gap-2 mb-4">
              {inflowReports.map((report) => (
                <div key={report.id}>
                  <div
                    className="d-flex align-items-center gap-2 px-3 py-2 rounded"
                    style={{
                      cursor: 'pointer',
                      backgroundColor: expandedReport === report.id
                        ? 'var(--cui-tertiary-bg)'
                        : 'transparent',
                    }}
                    onClick={() => toggleReport(report.id)}
                  >
                    <CIcon
                      icon={expandedReport === report.id ? cilChevronBottom : cilChevronRight}
                      size="sm"
                      className="text-body-secondary flex-shrink-0"
                    />
                    <span className="fw-medium">{report.name}</span>
                    <span className="text-body-secondary" style={{ fontSize: '0.85rem' }}>
                      — {report.description}
                    </span>
                  </div>
                  {expandedReport === report.id && (
                    <div className="mt-2 ms-4">
                      {report.component}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Outflows */}
            <h6
              className="text-uppercase text-body-secondary fw-semibold mb-3"
              style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}
            >
              Outflows
            </h6>
            <div className="px-3">
              <p className="text-body-secondary mb-0" style={{ fontStyle: 'italic' }}>
                Coming soon
              </p>
            </div>

          </CCardBody>
        )}
      </CCard>

      {/* ── Summaries Panel ── */}
      <CCard>
        <CCardHeader
          className="d-flex align-items-center justify-content-between"
          style={{ cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setSummariesOpen(!summariesOpen)}
        >
          <h5 className="mb-0 fw-semibold">Summaries</h5>
          <CIcon icon={summariesOpen ? cilChevronBottom : cilChevronRight} size="lg" />
        </CCardHeader>
        {summariesOpen && (
          <CCardBody>
            <p className="text-body-secondary mb-0" style={{ fontStyle: 'italic' }}>
              Coming soon
            </p>
          </CCardBody>
        )}
      </CCard>

    </div>
  );
}
