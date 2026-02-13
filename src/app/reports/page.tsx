'use client';

import { PropertySummaryView } from '@/components/reports/PropertySummaryView';
import { ScenarioHistoryPanel } from '@/components/landscaper/ScenarioHistoryPanel';
import { useState } from 'react';
import { CButton, CButtonGroup, CCard, CCardBody, CNav, CNavItem, CNavLink, CTabContent, CTabPane } from '@coreui/react';

export default function ReportsPage() {
  const [scenario, setScenario] = useState<'current' | 'proforma'>('current');
  const [activeTab, setActiveTab] = useState<'reports' | 'scenarios'>('reports');
  const propertyId = '17'; // 14105 Chadron Ave

  return (
    <div className="p-4">
      {/* Page Header */}
      <div className="mb-4">
        <h1 className="text-3xl font-semibold mb-2">Financial Reports</h1>
        <p className="text-body-secondary">
          Professional property analysis and reporting for 14105 Chadron Avenue
        </p>
      </div>

      {/* Tab Navigation */}
      <CNav variant="tabs" className="mb-4">
        <CNavItem>
          <CNavLink
            active={activeTab === 'reports'}
            onClick={() => setActiveTab('reports')}
            style={{ cursor: 'pointer' }}
          >
            Reports
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink
            active={activeTab === 'scenarios'}
            onClick={() => setActiveTab('scenarios')}
            style={{ cursor: 'pointer' }}
          >
            Scenario History
          </CNavLink>
        </CNavItem>
      </CNav>

      <CTabContent>
        {/* Reports Tab */}
        <CTabPane visible={activeTab === 'reports'}>
          {/* Scenario Selector Card */}
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

          {/* Report Content */}
          <PropertySummaryView propertyId={propertyId} scenario={scenario} />
        </CTabPane>

        {/* Scenario History Tab */}
        <CTabPane visible={activeTab === 'scenarios'}>
          <ScenarioHistoryPanel projectId={propertyId} />
        </CTabPane>
      </CTabContent>
    </div>
  );
}
