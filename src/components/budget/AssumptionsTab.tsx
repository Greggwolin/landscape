'use client';

import { useState } from 'react';
import { CCard, CCardHeader, CCardBody, CFormLabel, CFormSelect, CFormInput, CButton } from '@coreui/react';

interface AssumptionsTabProps {
  projectId: number;
}

export default function AssumptionsTab({ projectId }: AssumptionsTabProps) {
  const [assumptions, setAssumptions] = useState({
    confidenceLevel: 'MEDIUM',
    escalationRate: 3.5,
    startPeriod: 1,
    projectDuration: 60
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Saving assumptions:', assumptions);
      alert('Assumptions saved (simulated)');
    } catch (error) {
      console.error('Error saving assumptions:', error);
      alert('Error saving assumptions');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="row">
      <div className="col-lg-8">
        <h3 className="mb-4" style={{ color: 'var(--cui-body-color)' }}>
          Global Budget Assumptions
        </h3>

        {/* Confidence & Contingency */}
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Confidence & Contingency</strong>
          </CCardHeader>
          <CCardBody>
            <div className="mb-3">
              <CFormLabel htmlFor="confidenceLevel">Default Confidence Level</CFormLabel>
              <CFormSelect
                id="confidenceLevel"
                value={assumptions.confidenceLevel}
                onChange={(e) => setAssumptions({ ...assumptions, confidenceLevel: e.target.value })}
              >
                <option value="HIGH">High (5% contingency)</option>
                <option value="MEDIUM">Medium (10% contingency)</option>
                <option value="LOW">Low (15% contingency)</option>
                <option value="CONCEPTUAL">Conceptual (25% contingency)</option>
              </CFormSelect>
              <div className="form-text">Applied to new budget items unless overridden</div>
            </div>
          </CCardBody>
        </CCard>

        {/* Escalation */}
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Escalation</strong>
          </CCardHeader>
          <CCardBody>
            <div className="mb-3">
              <CFormLabel htmlFor="escalationRate">Annual Cost Escalation Rate (%)</CFormLabel>
              <CFormInput
                type="number"
                id="escalationRate"
                step="0.1"
                value={assumptions.escalationRate}
                onChange={(e) => setAssumptions({ ...assumptions, escalationRate: parseFloat(e.target.value) || 0 })}
                placeholder="3.5"
              />
              <div className="form-text">Applied to costs beyond Year 1</div>
            </div>
          </CCardBody>
        </CCard>

        {/* Timing */}
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Timing</strong>
          </CCardHeader>
          <CCardBody>
            <div className="mb-3">
              <CFormLabel htmlFor="startPeriod">Budget Start Period (Month)</CFormLabel>
              <CFormInput
                type="number"
                id="startPeriod"
                min="1"
                value={assumptions.startPeriod}
                onChange={(e) => setAssumptions({ ...assumptions, startPeriod: parseInt(e.target.value) || 1 })}
                placeholder="1"
              />
            </div>

            <div className="mb-3">
              <CFormLabel htmlFor="projectDuration">Total Project Duration (Months)</CFormLabel>
              <CFormInput
                type="number"
                id="projectDuration"
                min="1"
                max="240"
                value={assumptions.projectDuration}
                onChange={(e) => setAssumptions({ ...assumptions, projectDuration: parseInt(e.target.value) || 60 })}
                placeholder="60"
              />
              <div className="form-text">Maximum 240 months (20 years)</div>
            </div>
          </CCardBody>
        </CCard>

        {/* Save button */}
        <div className="d-flex justify-content-end">
          <CButton
            color="primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Assumptions'}
          </CButton>
        </div>
      </div>
    </div>
  );
}
