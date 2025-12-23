'use client';

import React from 'react';
import useSWR from 'swr';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CBadge,
  CSpinner,
} from '@coreui/react';

interface ExtractionLog {
  log_id: number;
  mapping_id: number | null;
  project_id: number | null;
  doc_id: number | null;
  source_pattern_matched: string | null;
  extracted_value: string | null;
  transformed_value: string | null;
  previous_value: string | null;
  confidence_score: number | null;
  extraction_context: string | null;
  was_written: boolean;
  was_accepted: boolean | null;
  rejection_reason: string | null;
  extracted_at: string;
  reviewed_at: string | null;
  mapping?: {
    document_type: string;
    target_table: string;
    target_field: string;
  };
}

interface ExtractionHistoryPanelProps {
  projectId: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ExtractionHistoryPanel({ projectId }: ExtractionHistoryPanelProps) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  const { data, error, isLoading } = useSWR<{ logs: ExtractionLog[]; count: number }>(
    `${backendUrl}/api/landscaper/logs/?project_id=${projectId}`,
    fetcher,
    { refreshInterval: 30000 } // Refresh every 30 seconds
  );

  const getStatusBadge = (log: ExtractionLog) => {
    if (log.was_accepted === true) {
      return <CBadge color="success">Accepted</CBadge>;
    }
    if (log.was_accepted === false) {
      return <CBadge color="danger">Rejected</CBadge>;
    }
    if (log.was_written) {
      return <CBadge color="info">Written</CBadge>;
    }
    return <CBadge color="warning">Pending</CBadge>;
  };

  const getConfidenceBadge = (score: number | null) => {
    if (score === null) return <span className="text-muted">—</span>;
    const pct = Math.round(score * 100);
    if (pct >= 80) return <CBadge color="success">{pct}%</CBadge>;
    if (pct >= 50) return <CBadge color="warning">{pct}%</CBadge>;
    return <CBadge color="danger">{pct}%</CBadge>;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const truncateValue = (val: string | null, maxLen = 50) => {
    if (!val) return '—';
    if (val.length <= maxLen) return val;
    return val.slice(0, maxLen) + '...';
  };

  if (isLoading) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <CSpinner color="primary" />
          <p className="mt-3 text-body-secondary">Loading extraction history...</p>
        </CCardBody>
      </CCard>
    );
  }

  if (error) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <p className="text-danger">Failed to load extraction history</p>
          <p className="text-body-secondary small">{error.message}</p>
        </CCardBody>
      </CCard>
    );
  }

  const logs = data?.logs || [];

  if (logs.length === 0) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <h5>No Extraction History</h5>
          <p className="text-body-secondary">
            No AI extractions have been performed for this project yet.
            Upload documents and use Landscaper to extract data.
          </p>
        </CCardBody>
      </CCard>
    );
  }

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <span className="fw-medium">Extraction History</span>
        <CBadge color="secondary">{logs.length} records</CBadge>
      </CCardHeader>
      <CCardBody className="p-0">
        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
          <CTable hover striped responsive className="mb-0">
            <CTableHead className="sticky-top bg-body">
              <CTableRow>
                <CTableHeaderCell style={{ width: '140px' }}>Date</CTableHeaderCell>
                <CTableHeaderCell style={{ width: '120px' }}>Field</CTableHeaderCell>
                <CTableHeaderCell>Extracted Value</CTableHeaderCell>
                <CTableHeaderCell style={{ width: '100px' }}>Confidence</CTableHeaderCell>
                <CTableHeaderCell style={{ width: '100px' }}>Status</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {logs.map((log) => (
                <CTableRow key={log.log_id}>
                  <CTableDataCell className="text-nowrap small">
                    {formatDate(log.extracted_at)}
                  </CTableDataCell>
                  <CTableDataCell>
                    <div className="fw-medium">
                      {log.mapping?.target_field || log.source_pattern_matched || '—'}
                    </div>
                    {log.mapping?.document_type && (
                      <div className="text-muted small">{log.mapping.document_type}</div>
                    )}
                  </CTableDataCell>
                  <CTableDataCell>
                    <div>{truncateValue(log.transformed_value || log.extracted_value)}</div>
                    {log.previous_value && (
                      <div className="text-muted small">
                        was: {truncateValue(log.previous_value, 30)}
                      </div>
                    )}
                  </CTableDataCell>
                  <CTableDataCell className="text-center">
                    {getConfidenceBadge(log.confidence_score)}
                  </CTableDataCell>
                  <CTableDataCell>
                    {getStatusBadge(log)}
                    {log.rejection_reason && (
                      <div className="text-muted small mt-1" title={log.rejection_reason}>
                        {truncateValue(log.rejection_reason, 20)}
                      </div>
                    )}
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
        </div>
      </CCardBody>
    </CCard>
  );
}
