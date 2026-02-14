'use client';

import { useState, useCallback } from 'react';
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CBadge,
  CProgress,
} from '@coreui/react';

interface PresentationSlide {
  index: number;
  label: string;
  assumption_key: string;
  original_value: number | string;
  override_value: number | string;
  unit: string;
  challenge_text?: string;
  deltas: Record<string, number | string>;
}

interface PresentationModeViewProps {
  slides: PresentationSlide[];
  onExit: () => void;
  baselineMetrics?: Record<string, number | string>;
}

const METRIC_LABELS: Record<string, string> = {
  irr: 'IRR',
  equity_multiple: 'Equity Multiple',
  total_profit: 'Total Profit',
  total_revenue: 'Total Revenue',
  total_cost: 'Total Cost',
  noi: 'NOI',
  cap_rate: 'Cap Rate',
  cash_on_cash: 'Cash-on-Cash Return',
  dscr: 'DSCR',
  npv: 'NPV',
};

function formatDelta(val: number | string | undefined): string {
  if (val === undefined || val === null) return '-';
  if (typeof val === 'string') return val;
  const sign = val > 0 ? '+' : '';
  if (Math.abs(val) >= 1_000_000) return `${sign}$${(val / 1_000_000).toFixed(2)}M`;
  if (Math.abs(val) >= 1_000) return `${sign}$${(val / 1_000).toFixed(1)}K`;
  return `${sign}${val.toFixed(2)}`;
}

export function PresentationModeView({
  slides,
  onExit,
  baselineMetrics = {},
}: PresentationModeViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const slide = slides[currentIndex];
  const totalSlides = slides.length;
  const progress = totalSlides > 0 ? ((currentIndex + 1) / totalSlides) * 100 : 0;

  const handlePrevious = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(totalSlides - 1, i + 1));
  }, [totalSlides]);

  const handleJump = useCallback((idx: number) => {
    setCurrentIndex(idx);
  }, []);

  if (totalSlides === 0) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <div className="text-body-secondary mb-3">
            No scenarios to present. Run an IC session first.
          </div>
          <CButton color="secondary" onClick={onExit}>
            Exit Presentation Mode
          </CButton>
        </CCardBody>
      </CCard>
    );
  }

  return (
    <div className="d-flex flex-column h-100">
      {/* Header Bar */}
      <div className="d-flex align-items-center justify-content-between px-4 py-2 border-bottom bg-dark text-white">
        <div className="d-flex align-items-center gap-3">
          <span className="fw-semibold" style={{ fontSize: '0.9rem' }}>
            Presentation Mode
          </span>
          <CBadge color="light" textColor="dark">
            {currentIndex + 1} / {totalSlides}
          </CBadge>
        </div>
        <CButton
          color="light"
          size="sm"
          onClick={onExit}
        >
          Exit
        </CButton>
      </div>

      {/* Progress Bar */}
      <CProgress value={progress} height={4} color="warning" className="rounded-0" />

      {/* Slide Content */}
      <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center p-4">
        {slide && (
          <CCard style={{ maxWidth: 800, width: '100%' }}>
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <span className="fw-semibold" style={{ fontSize: '1.1rem' }}>
                Challenge {currentIndex + 1}: {slide.label}
              </span>
              <CBadge color="warning" shape="rounded-pill">
                Scenario {currentIndex + 1}
              </CBadge>
            </CCardHeader>
            <CCardBody>
              {/* Assumption Change */}
              <div className="mb-4 p-3 rounded" style={{ backgroundColor: 'var(--cui-tertiary-bg, #f8f9fa)' }}>
                <div className="text-body-secondary mb-1" style={{ fontSize: '0.8rem' }}>
                  Assumption Changed
                </div>
                <div className="d-flex align-items-center gap-3">
                  <span className="fw-medium" style={{ fontSize: '1.5rem' }}>
                    {slide.original_value}{slide.unit}
                  </span>
                  <span style={{ fontSize: '1.5rem', color: 'var(--cui-body-color-secondary)' }}>
                    {'\u2192'}
                  </span>
                  <span className="fw-bold" style={{ fontSize: '1.5rem', color: '#f59e0b' }}>
                    {slide.override_value}{slide.unit}
                  </span>
                </div>
                {slide.challenge_text && (
                  <div className="text-body-secondary mt-2" style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>
                    {slide.challenge_text}
                  </div>
                )}
              </div>

              {/* Results Impact */}
              <div className="mb-2">
                <div className="text-body-secondary mb-2" style={{ fontSize: '0.8rem' }}>
                  Impact on Results
                </div>
                <div className="d-flex flex-wrap gap-3">
                  {Object.entries(slide.deltas).map(([metric, delta]) => (
                    <div
                      key={metric}
                      className="p-2 border rounded text-center"
                      style={{ minWidth: 120 }}
                    >
                      <div className="text-body-secondary" style={{ fontSize: '0.75rem' }}>
                        {METRIC_LABELS[metric] || metric}
                      </div>
                      <div
                        className="fw-bold"
                        style={{
                          fontSize: '1.1rem',
                          color: typeof delta === 'number'
                            ? delta > 0 ? '#22c55e' : delta < 0 ? '#ef4444' : undefined
                            : undefined,
                        }}
                      >
                        {formatDelta(delta)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CCardBody>
          </CCard>
        )}
      </div>

      {/* Navigation Bar */}
      <div className="d-flex align-items-center justify-content-between px-4 py-3 border-top">
        <CButton
          color="secondary"
          size="sm"
          disabled={currentIndex === 0}
          onClick={handlePrevious}
        >
          Previous
        </CButton>

        {/* Jump Navigation */}
        <div className="d-flex gap-1">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => handleJump(idx)}
              className="btn btn-sm"
              style={{
                width: 28,
                height: 28,
                padding: 0,
                fontSize: '0.75rem',
                backgroundColor: idx === currentIndex ? '#f59e0b' : 'transparent',
                color: idx === currentIndex ? 'white' : 'var(--cui-body-color-secondary)',
                border: '1px solid var(--cui-border-color)',
                borderRadius: '50%',
              }}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        <CButton
          color="primary"
          size="sm"
          disabled={currentIndex === totalSlides - 1}
          onClick={handleNext}
        >
          Next
        </CButton>
      </div>
    </div>
  );
}
