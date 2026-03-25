'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { CSpinner } from '@coreui/react';
import { useReportDefinitions } from '@/hooks/useReports';
import ReportBrowser from '@/components/reports/ReportBrowser';
import ReportViewer from '@/components/reports/ReportViewer';
import { useLandscaperRefresh } from '@/hooks/useLandscaperRefresh';
import type { ReportDefinition } from '@/types/report-definitions';

interface Project {
  project_id: number;
  project_name: string;
  project_type_code?: string;
  project_type?: string;
  property_subtype?: string;
}

interface ReportsTabProps {
  project: Project;
}

export default function ReportsTab({ project }: ReportsTabProps) {
  const effectiveProjectType = project.project_type_code
    || project.project_type
    || project.property_subtype
    || 'LAND';

  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const { data: definitions, isLoading, error } = useReportDefinitions(effectiveProjectType);

  // Force child remount on Landscaper mutations
  const [refreshKey, setRefreshKey] = useState(0);
  const watchedTables = useMemo(() => ['project', 'cashflow', 'budget', 'container'], []);
  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  useLandscaperRefresh(project.project_id, watchedTables, handleRefresh);

  const selectedDefinition: ReportDefinition | null = useMemo(() => {
    if (!selectedCode || !definitions) return null;
    return definitions.find(d => d.report_code === selectedCode) ?? null;
  }, [selectedCode, definitions]);

  if (isLoading) {
    return (
      <div className="d-flex align-items-center justify-content-center"
        style={{ minHeight: '500px' }}
      >
        <CSpinner color="primary" />
        <span className="ms-2" style={{ color: 'var(--cui-secondary-color)' }}>
          Loading report catalog...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="d-flex align-items-center justify-content-center"
        style={{ minHeight: '500px', color: 'var(--cui-danger)' }}
      >
        Failed to load report catalog: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="d-flex" style={{
      height: 'calc(100vh - 220px)',
      border: '1px solid var(--cui-border-color)',
      borderRadius: '6px',
      overflow: 'hidden',
      background: 'var(--cui-body-bg)',
    }}>
      {/* Left panel: Report catalog browser */}
      <ReportBrowser
        definitions={definitions || []}
        selectedCode={selectedCode}
        onSelect={setSelectedCode}
      />

      {/* Right panel: Report viewer */}
      <div key={refreshKey} style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        <ReportViewer
          definition={selectedDefinition}
          projectId={project.project_id}
        />
      </div>
    </div>
  );
}
