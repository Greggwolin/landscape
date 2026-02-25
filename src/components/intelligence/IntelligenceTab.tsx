'use client';

/**
 * IntelligenceTab — Document intake workflow hub (Intelligence v1)
 *
 * Replaces the "extractions" subtab in Documents folder.
 * Shows active/recent intake sessions and their status,
 * with drill-down into MappingScreen and ValueValidationScreen.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CBadge,
  CButton,
  CSpinner,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
} from '@coreui/react';
import MappingScreen from './MappingScreen';
import ValueValidationScreen from './ValueValidationScreen';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

interface IntakeSession {
  intakeUuid: string;
  projectId: number;
  docId: number | null;
  documentType: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface OverrideDetail {
  overrideId: number;
  fieldKey: string;
  calculatedValue: string | null;
  overrideValue: string | null;
  isActive: boolean;
}

interface OverrideInfo {
  overriddenFieldKeys: string[];
  count: number;
  overrides: OverrideDetail[];
}

interface IntelligenceTabProps {
  project: {
    project_id: number;
    project_name: string;
    project_type_code?: string;
    [key: string]: unknown;
  };
}

type ActiveView = 'list' | 'mapping' | 'validation';

const STATUS_COLORS: Record<string, string> = {
  draft: 'warning',
  mapping_complete: 'info',
  values_complete: 'primary',
  committed: 'success',
  abandoned: 'secondary',
};

async function triggerReExtract(intakeUuid: string): Promise<{ intakeUuid: string; status: string } | null> {
  try {
    const res = await fetch(`${DJANGO_API_URL}/api/intake/${intakeUuid}/re_extract/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (res.ok) {
      return res.json();
    }
    return null;
  } catch {
    return null;
  }
}

export default function IntelligenceTab({ project }: IntelligenceTabProps) {
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<IntakeSession[]>([]);
  const [overrides, setOverrides] = useState<OverrideInfo>({ overriddenFieldKeys: [], count: 0, overrides: [] });
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>('list');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  // Auto-open MappingScreen when intakeUuid is in the URL (from IntakeChoiceModal navigation)
  useEffect(() => {
    const intakeUuid = searchParams.get('intakeUuid');
    if (intakeUuid && activeView === 'list') {
      setSelectedSession(intakeUuid);
      setActiveView('mapping');
    }
  }, [searchParams, activeView]);

  const fetchSessions = useCallback(async () => {
    try {
      // Fetch intake sessions from the IntakeStartView list endpoint
      // The start endpoint also works as a session list when using GET on the project
      const res = await fetch(
        `${DJANGO_API_URL}/api/intake/start/?project_id=${project.project_id}`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.warn('[Intelligence] Failed to fetch sessions:', err);
    }
  }, [project.project_id]);

  const fetchOverrides = useCallback(async () => {
    try {
      const res = await fetch(
        `${DJANGO_API_URL}/api/landscaper/projects/${project.project_id}/overrides/`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        setOverrides({
          overriddenFieldKeys: data.overriddenFieldKeys || [],
          count: data.count || 0,
          overrides: data.overrides || [],
        });
      }
    } catch (err) {
      console.warn('[Intelligence] Failed to fetch overrides:', err);
    }
  }, [project.project_id]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSessions(), fetchOverrides()]).finally(() => setLoading(false));
  }, [fetchSessions, fetchOverrides]);

  const handleSessionClick = (session: IntakeSession) => {
    setSelectedSession(session.intakeUuid);
    if (session.status === 'draft') {
      setActiveView('mapping');
    } else if (session.status === 'mapping_complete' || session.status === 'values_complete') {
      setActiveView('validation');
    } else {
      setActiveView('list');
    }
  };

  const handleBackToList = () => {
    setActiveView('list');
    setSelectedSession(null);
    fetchSessions();
  };

  const handleMappingComplete = () => {
    setActiveView('validation');
    fetchSessions();
  };

  // Drill-in views
  if (activeView === 'mapping' && selectedSession) {
    return (
      <div>
        <CButton color="link" className="mb-3 ps-0" onClick={handleBackToList}>
          &larr; Back to Intelligence
        </CButton>
        <MappingScreen
          intakeUuid={selectedSession}
          projectId={project.project_id}
          onComplete={handleMappingComplete}
        />
      </div>
    );
  }

  if (activeView === 'validation' && selectedSession) {
    return (
      <div>
        <CButton color="link" className="mb-3 ps-0" onClick={handleBackToList}>
          &larr; Back to Intelligence
        </CButton>
        <ValueValidationScreen
          intakeUuid={selectedSession}
          projectId={project.project_id}
          onComplete={handleBackToList}
        />
      </div>
    );
  }

  // Main list view
  return (
    <div className="p-3">
      {/* Override summary with details */}
      {overrides.count > 0 && (
        <CCard className="mb-3 border-warning">
          <CCardHeader className="d-flex align-items-center gap-2 py-2">
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#e55353',
                display: 'inline-block',
              }}
            />
            <span className="text-body-secondary">
              {overrides.count} active override{overrides.count !== 1 ? 's' : ''} on calculated
              fields
            </span>
          </CCardHeader>
          {overrides.overrides.length > 0 && (
            <CCardBody className="py-2">
              <div className="d-flex flex-column gap-1">
                {overrides.overrides.map((ov) => (
                  <div
                    key={ov.overrideId}
                    className="d-flex align-items-center justify-content-between py-1 px-2"
                    style={{
                      borderRadius: 4,
                      backgroundColor: 'var(--cui-tertiary-bg)',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: '#e55353',
                          display: 'inline-block',
                        }}
                      />
                      <span className="fw-medium">
                        {ov.fieldKey.replace(/_/g, ' ')}
                      </span>
                      <span className="text-body-secondary">
                        {ov.calculatedValue ?? '—'} → {ov.overrideValue ?? '—'}
                      </span>
                    </div>
                    <CButton
                      size="sm"
                      color="secondary"
                      variant="ghost"
                      className="py-0 px-2"
                      style={{ fontSize: '0.7rem' }}
                      onClick={async () => {
                        try {
                          const res = await fetch(
                            `${DJANGO_API_URL}/api/landscaper/overrides/${ov.overrideId}/revert/`,
                            { method: 'POST', headers: { 'Content-Type': 'application/json' } }
                          );
                          if (res.ok) {
                            fetchOverrides();
                          }
                        } catch (err) {
                          console.warn('[Intelligence] Revert failed:', err);
                        }
                      }}
                    >
                      Revert
                    </CButton>
                  </div>
                ))}
              </div>
            </CCardBody>
          )}
        </CCard>
      )}

      {/* Session list */}
      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>Intake Sessions</strong>
          {loading && <CSpinner size="sm" />}
        </CCardHeader>
        <CCardBody>
          {!loading && sessions.length === 0 ? (
            <p className="text-body-secondary mb-0">
              No intake sessions yet. Upload a document via the Documents tab to start extraction.
            </p>
          ) : (
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Document</CTableHeaderCell>
                  <CTableHeaderCell>Type</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>Created</CTableHeaderCell>
                  <CTableHeaderCell>Actions</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {sessions.map((s) => (
                  <CTableRow
                    key={s.intakeUuid}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSessionClick(s)}
                  >
                    <CTableDataCell>
                      Doc #{s.docId || '—'}
                    </CTableDataCell>
                    <CTableDataCell>{s.documentType || '—'}</CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={STATUS_COLORS[s.status] || 'secondary'}>
                        {s.status.replace(/_/g, ' ')}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell>
                      {new Date(s.createdAt).toLocaleDateString()}
                    </CTableDataCell>
                    <CTableDataCell>
                      {s.status === 'draft' && (
                        <CButton size="sm" color="primary" variant="outline">
                          Map Fields
                        </CButton>
                      )}
                      {(s.status === 'mapping_complete' || s.status === 'values_complete') && (
                        <CButton size="sm" color="success" variant="outline">
                          Review Values
                        </CButton>
                      )}
                      {s.status === 'committed' && (
                        <>
                          <CBadge color="success" className="me-2">Done</CBadge>
                          <CButton
                            size="sm"
                            color="warning"
                            variant="outline"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const result = await triggerReExtract(s.intakeUuid);
                              if (result) {
                                fetchSessions();
                              }
                            }}
                          >
                            Re-extract
                          </CButton>
                        </>
                      )}
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
      </CCard>
    </div>
  );
}
