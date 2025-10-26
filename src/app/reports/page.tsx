'use client';

import { PropertySummaryView } from '@/components/reports/PropertySummaryView';
import { useState } from 'react';
import { CButton, CButtonGroup, CCard, CCardBody } from '@coreui/react';

export default function ReportsPage() {
  const [scenario, setScenario] = useState<'current' | 'proforma'>('current');
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
    </div>
  );
}
