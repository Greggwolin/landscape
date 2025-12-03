'use client';

import React, { useState } from 'react';
import { CCard, CCardHeader, CCardBody, CCollapse, CFormInput } from '@coreui/react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface InfrastructurePanelProps {
  hasData?: boolean; // Reserved for future use when wiring real data
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function InfrastructurePanel(_props: InfrastructurePanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Mock editable state values
  const [backboneCosts, setBackboneCosts] = useState({
    phase1: 8500000,
    phase2: 6200000,
    phase3: 4800000
  });

  const [offsiteCosts, setOffsiteCosts] = useState({
    trafficSignal: 950000,
    arterialImprov: 2100000,
    utilityOversizing: 850000
  });

  const [timeline, setTimeline] = useState({
    timeToFirstSale: 20,
    absorption: 185,
    projectDuration: 6
  });

  const [globalAssumptions, setGlobalAssumptions] = useState({
    contingency: 5,
    costEscalation: 3.0,
    revenueEscalation: 3.5,
    discountRate: 10
  });

  const formatCurrencyInput = (value: number) => {
    return value.toLocaleString();
  };

  return (
    <CCard style={{ backgroundColor: 'var(--cui-tertiary-bg)', border: '1px solid var(--cui-border-color)' }}>
      <CCardHeader
        className="d-flex justify-content-between align-items-center cursor-pointer py-3"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ backgroundColor: 'var(--surface-card-header)', cursor: 'pointer' }}
      >
        <h6 className="mb-0 fw-bold" style={{ color: 'var(--cui-body-color)' }}>
          Infrastructure & Timeline
        </h6>
        <div className="d-flex align-items-center gap-2">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </CCardHeader>

      <CCollapse visible={isExpanded}>
        <CCardBody className="py-3">
          <div className="row g-4">
            {/* Backbone Costs */}
            <div className="col-md-6">
              <h6 className="small fw-bold mb-3" style={{ color: 'var(--cui-secondary-color)', textTransform: 'uppercase' }}>
                Backbone Costs
              </h6>
              <div className="d-flex flex-column gap-2">
                <div className="d-flex align-items-center justify-content-between">
                  <label className="small" style={{ color: 'var(--cui-body-color)' }}>Phase 1:</label>
                  <div className="input-group" style={{ width: '150px' }}>
                    <span className="input-group-text" style={{ fontSize: '0.85rem' }}>$</span>
                    <CFormInput
                      type="text"
                      value={formatCurrencyInput(backboneCosts.phase1)}
                      onChange={(e) => setBackboneCosts({ ...backboneCosts, phase1: parseInt(e.target.value.replace(/,/g, '')) || 0 })}
                      size="sm"
                      className="text-end"
                    />
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between">
                  <label className="small" style={{ color: 'var(--cui-body-color)' }}>Phase 2:</label>
                  <div className="input-group" style={{ width: '150px' }}>
                    <span className="input-group-text" style={{ fontSize: '0.85rem' }}>$</span>
                    <CFormInput
                      type="text"
                      value={formatCurrencyInput(backboneCosts.phase2)}
                      onChange={(e) => setBackboneCosts({ ...backboneCosts, phase2: parseInt(e.target.value.replace(/,/g, '')) || 0 })}
                      size="sm"
                      className="text-end"
                    />
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between">
                  <label className="small" style={{ color: 'var(--cui-body-color)' }}>Phase 3:</label>
                  <div className="input-group" style={{ width: '150px' }}>
                    <span className="input-group-text" style={{ fontSize: '0.85rem' }}>$</span>
                    <CFormInput
                      type="text"
                      value={formatCurrencyInput(backboneCosts.phase3)}
                      onChange={(e) => setBackboneCosts({ ...backboneCosts, phase3: parseInt(e.target.value.replace(/,/g, '')) || 0 })}
                      size="sm"
                      className="text-end"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Offsite Costs */}
            <div className="col-md-6">
              <h6 className="small fw-bold mb-3" style={{ color: 'var(--cui-secondary-color)', textTransform: 'uppercase' }}>
                Offsite Costs
              </h6>
              <div className="d-flex flex-column gap-2">
                <div className="d-flex align-items-center justify-content-between">
                  <label className="small" style={{ color: 'var(--cui-body-color)' }}>Traffic Signal:</label>
                  <div className="input-group" style={{ width: '150px' }}>
                    <span className="input-group-text" style={{ fontSize: '0.85rem' }}>$</span>
                    <CFormInput
                      type="text"
                      value={formatCurrencyInput(offsiteCosts.trafficSignal)}
                      onChange={(e) => setOffsiteCosts({ ...offsiteCosts, trafficSignal: parseInt(e.target.value.replace(/,/g, '')) || 0 })}
                      size="sm"
                      className="text-end"
                    />
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between">
                  <label className="small" style={{ color: 'var(--cui-body-color)' }}>Arterial Improv:</label>
                  <div className="input-group" style={{ width: '150px' }}>
                    <span className="input-group-text" style={{ fontSize: '0.85rem' }}>$</span>
                    <CFormInput
                      type="text"
                      value={formatCurrencyInput(offsiteCosts.arterialImprov)}
                      onChange={(e) => setOffsiteCosts({ ...offsiteCosts, arterialImprov: parseInt(e.target.value.replace(/,/g, '')) || 0 })}
                      size="sm"
                      className="text-end"
                    />
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between">
                  <label className="small" style={{ color: 'var(--cui-body-color)' }}>Utility Oversizing:</label>
                  <div className="input-group" style={{ width: '150px' }}>
                    <span className="input-group-text" style={{ fontSize: '0.85rem' }}>$</span>
                    <CFormInput
                      type="text"
                      value={formatCurrencyInput(offsiteCosts.utilityOversizing)}
                      onChange={(e) => setOffsiteCosts({ ...offsiteCosts, utilityOversizing: parseInt(e.target.value.replace(/,/g, '')) || 0 })}
                      size="sm"
                      className="text-end"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="col-md-6">
              <h6 className="small fw-bold mb-3" style={{ color: 'var(--cui-secondary-color)', textTransform: 'uppercase' }}>
                Timeline
              </h6>
              <div className="d-flex flex-column gap-2">
                <div className="d-flex align-items-center justify-content-between">
                  <label className="small" style={{ color: 'var(--cui-body-color)' }}>Time to First Sale:</label>
                  <div className="input-group" style={{ width: '120px' }}>
                    <CFormInput
                      type="number"
                      value={timeline.timeToFirstSale}
                      onChange={(e) => setTimeline({ ...timeline, timeToFirstSale: parseInt(e.target.value) || 0 })}
                      size="sm"
                      className="text-end"
                    />
                    <span className="input-group-text" style={{ fontSize: '0.85rem' }}>mo</span>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between">
                  <label className="small" style={{ color: 'var(--cui-body-color)' }}>Absorption:</label>
                  <div className="input-group" style={{ width: '120px' }}>
                    <CFormInput
                      type="number"
                      value={timeline.absorption}
                      onChange={(e) => setTimeline({ ...timeline, absorption: parseInt(e.target.value) || 0 })}
                      size="sm"
                      className="text-end"
                    />
                    <span className="input-group-text" style={{ fontSize: '0.85rem' }}>/yr</span>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between">
                  <label className="small" style={{ color: 'var(--cui-body-color)' }}>Project Duration:</label>
                  <div className="input-group" style={{ width: '120px' }}>
                    <CFormInput
                      type="number"
                      value={timeline.projectDuration}
                      onChange={(e) => setTimeline({ ...timeline, projectDuration: parseInt(e.target.value) || 0 })}
                      size="sm"
                      className="text-end"
                    />
                    <span className="input-group-text" style={{ fontSize: '0.85rem' }}>yrs</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Global Assumptions */}
            <div className="col-md-6">
              <h6 className="small fw-bold mb-3" style={{ color: 'var(--cui-secondary-color)', textTransform: 'uppercase' }}>
                Global Assumptions
              </h6>
              <div className="d-flex flex-column gap-2">
                <div className="d-flex align-items-center justify-content-between">
                  <label className="small" style={{ color: 'var(--cui-body-color)' }}>Contingency:</label>
                  <div className="input-group" style={{ width: '100px' }}>
                    <CFormInput
                      type="number"
                      value={globalAssumptions.contingency}
                      onChange={(e) => setGlobalAssumptions({ ...globalAssumptions, contingency: parseFloat(e.target.value) || 0 })}
                      size="sm"
                      className="text-end"
                    />
                    <span className="input-group-text" style={{ fontSize: '0.85rem' }}>%</span>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between">
                  <label className="small" style={{ color: 'var(--cui-body-color)' }}>Cost Escalation:</label>
                  <div className="input-group" style={{ width: '100px' }}>
                    <CFormInput
                      type="number"
                      step="0.1"
                      value={globalAssumptions.costEscalation}
                      onChange={(e) => setGlobalAssumptions({ ...globalAssumptions, costEscalation: parseFloat(e.target.value) || 0 })}
                      size="sm"
                      className="text-end"
                    />
                    <span className="input-group-text" style={{ fontSize: '0.85rem' }}>%</span>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between">
                  <label className="small" style={{ color: 'var(--cui-body-color)' }}>Revenue Escalation:</label>
                  <div className="input-group" style={{ width: '100px' }}>
                    <CFormInput
                      type="number"
                      step="0.1"
                      value={globalAssumptions.revenueEscalation}
                      onChange={(e) => setGlobalAssumptions({ ...globalAssumptions, revenueEscalation: parseFloat(e.target.value) || 0 })}
                      size="sm"
                      className="text-end"
                    />
                    <span className="input-group-text" style={{ fontSize: '0.85rem' }}>%</span>
                  </div>
                </div>
                <div className="d-flex align-items-center justify-content-between">
                  <label className="small" style={{ color: 'var(--cui-body-color)' }}>Discount Rate:</label>
                  <div className="input-group" style={{ width: '100px' }}>
                    <CFormInput
                      type="number"
                      value={globalAssumptions.discountRate}
                      onChange={(e) => setGlobalAssumptions({ ...globalAssumptions, discountRate: parseFloat(e.target.value) || 0 })}
                      size="sm"
                      className="text-end"
                    />
                    <span className="input-group-text" style={{ fontSize: '0.85rem' }}>%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Source Indicator */}
          <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--cui-border-color)' }}>
            <span className="small" style={{ color: 'var(--cui-secondary-color)' }}>
              Source: 🟡 Landscaper defaults (editable)
            </span>
          </div>
        </CCardBody>
      </CCollapse>
    </CCard>
  );
}
