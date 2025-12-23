'use client';

import React, { useState } from 'react';
import { CCard, CCardBody, CButton, CButtonGroup, CNav, CNavItem, CNavLink } from '@coreui/react';
import { PropertySummaryView } from '@/components/reports/PropertySummaryView';
import { ExtractionHistoryReport } from '@/components/reports/ExtractionHistoryReport';
import CIcon from '@coreui/icons-react';
import { cilDescription, cilSpreadsheet, cilHome, cilHistory } from '@coreui/icons';

interface Project {
  project_id: number;
  project_name: string;
}

interface ReportsTabProps {
  project: Project;
}

type ReportType = 'summary' | 'cashflow' | 'rentroll' | 'extraction-history';

export default function ReportsTab({ project }: ReportsTabProps) {
  const [scenario, setScenario] = useState<'current' | 'proforma'>('current');
  const [reportType, setReportType] = useState<ReportType>('summary');

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';

  const handleDownloadPDF = (type: string) => {
    let pdfUrl = '';
    switch (type) {
      case 'summary':
        pdfUrl = `${backendUrl}/api/reports/${project.project_id}/property-summary.pdf/`;
        break;
      case 'cashflow':
        pdfUrl = `${backendUrl}/api/reports/${project.project_id}/cash-flow.pdf/`;
        break;
      case 'rentroll':
        pdfUrl = `${backendUrl}/api/reports/${project.project_id}/rent-roll.pdf/`;
        break;
    }
    window.open(pdfUrl, '_blank');
  };

  return (
    <div>
      {/* Report Type Selector */}
      <CCard className="mb-4">
        <CCardBody>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <label className="mb-0 fw-medium">Report Type:</label>
              <CNav variant="pills">
                <CNavItem>
                  <CNavLink
                    active={reportType === 'summary'}
                    onClick={() => setReportType('summary')}
                    style={{ cursor: 'pointer' }}
                  >
                    <CIcon icon={cilDescription} className="me-2" />
                    Property Summary
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink
                    active={reportType === 'cashflow'}
                    onClick={() => setReportType('cashflow')}
                    style={{ cursor: 'pointer' }}
                  >
                    <CIcon icon={cilSpreadsheet} className="me-2" />
                    Cash Flow
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink
                    active={reportType === 'rentroll'}
                    onClick={() => setReportType('rentroll')}
                    style={{ cursor: 'pointer' }}
                  >
                    <CIcon icon={cilHome} className="me-2" />
                    Rent Roll
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink
                    active={reportType === 'extraction-history'}
                    onClick={() => setReportType('extraction-history')}
                    style={{ cursor: 'pointer' }}
                  >
                    <CIcon icon={cilHistory} className="me-2" />
                    Extraction History
                  </CNavLink>
                </CNavItem>
              </CNav>
            </div>
            {reportType !== 'extraction-history' && (
              <CButton
                color="primary"
                onClick={() => handleDownloadPDF(reportType)}
              >
                Download PDF
              </CButton>
            )}
          </div>
        </CCardBody>
      </CCard>

      {/* Scenario Selector Card - hidden for extraction history */}
      {reportType !== 'extraction-history' && (
        <CCard className="mb-4">
          <CCardBody>
            <div className="d-flex align-items-center gap-3">
              <label className="mb-0 fw-medium">Scenario:</label>
              <CButtonGroup role="group">
                <CButton
                  color="primary"
                  variant={scenario === 'current' ? 'outline' : 'ghost'}
                  active={scenario === 'current'}
                  onClick={() => setScenario('current')}
                >
                  Current
                </CButton>
                <CButton
                  color="primary"
                  variant={scenario === 'proforma' ? 'outline' : 'ghost'}
                  active={scenario === 'proforma'}
                  onClick={() => setScenario('proforma')}
                >
                  Proforma
                </CButton>
              </CButtonGroup>
            </div>
          </CCardBody>
        </CCard>
      )}

      {/* Report Content */}
      {reportType === 'summary' && (
        <PropertySummaryView propertyId={String(project.project_id)} scenario={scenario} />
      )}
      {reportType === 'cashflow' && (
        <CCard>
          <CCardBody className="text-center py-5">
            <h5>Cash Flow Report</h5>
            <p className="text-body-secondary">
              Cash flow report viewer coming soon. Click "Download PDF" above to view the full cash flow projection.
            </p>
          </CCardBody>
        </CCard>
      )}
      {reportType === 'rentroll' && (
        <CCard>
          <CCardBody className="text-center py-5">
            <h5>Rent Roll Report</h5>
            <p className="text-body-secondary">
              Rent roll report viewer coming soon. Click "Download PDF" above to view the detailed rent roll.
            </p>
          </CCardBody>
        </CCard>
      )}
      {reportType === 'extraction-history' && (
        <ExtractionHistoryReport projectId={project.project_id} />
      )}
    </div>
  );
}
