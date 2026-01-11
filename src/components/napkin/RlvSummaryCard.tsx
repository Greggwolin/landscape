'use client';

import React from 'react';
import { CCard, CCardBody, CButton } from '@coreui/react';

interface RlvSummaryCardProps {
  hasData: boolean;
}

// Mock data for UI shell
const MOCK_RLV_DATA = {
  rlvLow: 48000000,
  rlvHigh: 70000000,
  rlvBase: 58000000,
  irr: 18.2,
  margin: 22,
  units: 1071,
  duration: 6,
  confidence: 78
};

export default function RlvSummaryCard({ hasData }: RlvSummaryCardProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(0)}M`;
    }
    return `$${value.toLocaleString()}`;
  };

  // Empty state
  if (!hasData) {
    return (
      <CCard style={{ backgroundColor: 'var(--cui-tertiary-bg)', border: '1px solid var(--cui-border-color)' }}>
        <CCardBody className="py-4">
          <h6 className="fw-bold mb-3" style={{ color: 'var(--cui-body-color)' }}>
            Residual Land Value
          </h6>
          <div className="text-center py-4" style={{ color: 'var(--cui-secondary-color)' }}>
            <p className="mb-2">No analysis data yet.</p>
            <p className="small mb-0">
              Upload a parcel table or describe your project to Landscaper to get started.
            </p>
          </div>
        </CCardBody>
      </CCard>
    );
  }

  return (
    <CCard style={{ backgroundColor: 'var(--cui-tertiary-bg)', border: '1px solid var(--cui-border-color)' }}>
      <CCardBody className="py-4">
        <h6 className="fw-bold mb-4" style={{ color: 'var(--cui-body-color)' }}>
          Residual Land Value
        </h6>

        <div className="row g-4">
          {/* RLV Range */}
          <div className="col-md-5">
            <div
              className="p-3 rounded"
              style={{
                backgroundColor: 'var(--cui-body-bg)',
                border: '1px solid var(--cui-border-color)'
              }}
            >
              <div className="small mb-2" style={{ color: 'var(--cui-secondary-color)' }}>
                RLV RANGE
              </div>
              <div className="h4 fw-bold mb-1" style={{ color: '#57c68a' }}>
                {formatCurrency(MOCK_RLV_DATA.rlvLow)} - {formatCurrency(MOCK_RLV_DATA.rlvHigh)}
              </div>
              <div className="small" style={{ color: 'var(--cui-secondary-color)' }}>
                Base: {formatCurrency(MOCK_RLV_DATA.rlvBase)}
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="col-md-7">
            <div
              className="p-3 rounded"
              style={{
                backgroundColor: 'var(--cui-body-bg)',
                border: '1px solid var(--cui-border-color)'
              }}
            >
              <div className="small mb-2" style={{ color: 'var(--cui-secondary-color)' }}>
                KEY METRICS
              </div>
              <div className="d-flex flex-wrap gap-3">
                <div>
                  <span className="fw-bold" style={{ color: 'var(--cui-body-color)' }}>
                    IRR: ~{MOCK_RLV_DATA.irr}%
                  </span>
                </div>
                <span style={{ color: 'var(--cui-secondary-color)' }}>•</span>
                <div>
                  <span className="fw-bold" style={{ color: 'var(--cui-body-color)' }}>
                    Margin: ~{MOCK_RLV_DATA.margin}%
                  </span>
                </div>
                <span style={{ color: 'var(--cui-secondary-color)' }}>•</span>
                <div>
                  <span className="fw-bold" style={{ color: 'var(--cui-body-color)' }}>
                    Units: {MOCK_RLV_DATA.units.toLocaleString()}
                  </span>
                </div>
                <span style={{ color: 'var(--cui-secondary-color)' }}>•</span>
                <div>
                  <span className="fw-bold" style={{ color: 'var(--cui-body-color)' }}>
                    Duration: {MOCK_RLV_DATA.duration} yrs
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Confidence Bar & Actions */}
        <div className="d-flex justify-content-between align-items-center mt-4">
          <div className="d-flex align-items-center gap-2">
            <span className="small" style={{ color: 'var(--cui-secondary-color)' }}>
              Confidence:
            </span>
            <div
              className="d-flex align-items-center gap-1"
              style={{ width: '100px' }}
            >
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: '8px',
                    height: '16px',
                    borderRadius: '2px',
                    backgroundColor: i < Math.round(MOCK_RLV_DATA.confidence / 10)
                      ? '#57c68a'
                      : 'var(--cui-border-color)'
                  }}
                />
              ))}
            </div>
            <span className="small fw-semibold" style={{ color: 'var(--cui-body-color)' }}>
              {MOCK_RLV_DATA.confidence}%
            </span>
          </div>

          <CButton
            color="secondary"
            variant="ghost"
            size="sm"
          >
            View Assumptions Detail
          </CButton>
        </div>
      </CCardBody>
    </CCard>
  );
}
