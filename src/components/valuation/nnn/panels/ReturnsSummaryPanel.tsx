'use client';

/**
 * ReturnsSummaryPanel — Investment Perspective Value Conclusion
 *
 * Replaces ValueConclusionPanel when analysis_perspective = INVESTMENT.
 * Shows investor return metrics instead of cap rate derivation.
 *
 * Sections:
 *  1. Returns KPI grid (Going-in Cap, IRR, Cash-on-Cash, Hold Period, Exit)
 *  2. Analyst Notes (editable textarea, auto-save on blur)
 *
 * @version 1.0
 * @created 2026-02-23
 * @session QT2
 */

import React, { memo, useState, useCallback } from 'react';
import { VALUE_CONCLUSION, fmtCurrency, fmtPercent } from '../nnnMockData';

// ─── Mock Returns Data (Investment perspective) ──────────────────────

const RETURNS = {
  goingInCap: 0.075,
  unleveragedIRR: 0.0825,
  leveragedIRR: null as number | null, // null = no debt assumed
  cashOnCashYr1: 0.075,
  holdPeriod: '10 Years',
  exitCapRate: 0.08,
  exitValue: 4843750, // Year 10 NOI / 8.0%
  purchasePrice: 4300000,
};

const RETURNS_NARRATIVE = 'Unleveraged IRR of 8.25% reflects the fixed-bump NNN rent structure over a 10-year hold. Going-in yield equals the cap rate at 7.50% given absolute NNN with no landlord obligations. Exit at 8.00% cap (50 bps of terminal cap expansion) is conservative for a 5-year remaining primary term at disposition. All-cash basis — no debt assumption modeled. Returns are adequate for a stabilized NNN portfolio with personal guarantor credit quality.';

// ─── Shared Styles ───────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  backgroundColor: 'var(--cui-card-bg)',
  border: '1px solid var(--cui-border-color)',
  borderRadius: 7,
  marginBottom: 14,
  overflow: 'hidden',
};

const sectionHeadStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderBottom: '1px solid var(--cui-border-color)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  color: 'var(--cui-secondary-color)',
};

const sectionBodyStyle: React.CSSProperties = { padding: '14px 16px' };

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  color: 'var(--cui-tertiary-color, var(--text-secondary))',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.07em',
  marginBottom: 4,
};

const kpiStyle: React.CSSProperties = {
  backgroundColor: 'var(--cui-card-bg)',
  border: '1px solid var(--cui-border-color)',
  borderRadius: 7,
  padding: '11px 15px',
  flex: 1,
  minWidth: 130,
};

const subStyle: React.CSSProperties = {
  fontSize: 10,
  color: 'var(--cui-tertiary-color, var(--text-secondary))',
  marginTop: 2,
};

// ─── Component ───────────────────────────────────────────────────────

function ReturnsSummaryPanel() {
  const [notes, setNotes] = useState(RETURNS_NARRATIVE);

  const handleBlur = useCallback(() => {
    console.log('[NNN] Returns narrative auto-save:', notes.substring(0, 50) + '...');
  }, [notes]);

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1060 }}>
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--cui-body-color)' }}>
          Returns Summary — Investment Analysis
        </div>
        <div style={{ fontSize: 12, color: 'var(--cui-secondary-color)', marginTop: 3 }}>
          Unleveraged · 10-Year Hold · Absolute NNN master lease
        </div>
      </div>

      {/* Returns KPI Grid */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' as const }}>
        <div style={kpiStyle}>
          <div style={labelStyle}>Going-in Cap Rate</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--cui-success)' }}>
            {fmtPercent(RETURNS.goingInCap, 2)}
          </div>
          <div style={subStyle}>Year 1 NOI / Price</div>
        </div>

        <div style={kpiStyle}>
          <div style={labelStyle}>Unleveraged IRR</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--cui-success)' }}>
            {fmtPercent(RETURNS.unleveragedIRR, 2)}
          </div>
          <div style={subStyle}>10-year hold</div>
        </div>

        <div style={kpiStyle}>
          <div style={labelStyle}>Leveraged IRR</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--cui-secondary-color)' }}>
            {RETURNS.leveragedIRR ? fmtPercent(RETURNS.leveragedIRR, 2) : 'N/A'}
          </div>
          <div style={subStyle}>{RETURNS.leveragedIRR ? 'With debt' : 'No debt assumed'}</div>
        </div>

        <div style={kpiStyle}>
          <div style={labelStyle}>Cash-on-Cash Yr 1</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--cui-body-color)' }}>
            {fmtPercent(RETURNS.cashOnCashYr1, 2)}
          </div>
          <div style={subStyle}>Equals cap (NNN)</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' as const }}>
        <div style={kpiStyle}>
          <div style={labelStyle}>Hold Period</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--cui-body-color)' }}>{RETURNS.holdPeriod}</div>
          <div style={subStyle}>5 yrs remaining at exit</div>
        </div>

        <div style={kpiStyle}>
          <div style={labelStyle}>Exit Cap Rate</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--cui-warning)' }}>
            {fmtPercent(RETURNS.exitCapRate, 2)}
          </div>
          <div style={subStyle}>+50 bps terminal expansion</div>
        </div>

        <div style={kpiStyle}>
          <div style={labelStyle}>Exit Value</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--cui-body-color)' }}>
            {fmtCurrency(RETURNS.exitValue)}
          </div>
          <div style={subStyle}>Yr 10 NOI / exit cap</div>
        </div>

        <div style={kpiStyle}>
          <div style={labelStyle}>Purchase Price</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--cui-body-color)' }}>
            {fmtCurrency(VALUE_CONCLUSION.purchasePrice)}
          </div>
          <div style={subStyle}>All-cash basis</div>
        </div>
      </div>

      {/* Analyst Notes */}
      <div style={sectionStyle}>
        <div style={sectionHeadStyle}>
          <div style={sectionTitleStyle}>Analyst Notes</div>
        </div>
        <div style={sectionBodyStyle}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleBlur}
            style={{
              width: '100%',
              minHeight: 100,
              fontSize: 12,
              color: 'var(--cui-secondary-color)',
              lineHeight: 1.7,
              backgroundColor: 'var(--cui-tertiary-bg, var(--surface-card))',
              borderRadius: 5,
              padding: '12px 14px',
              border: '1px solid var(--cui-border-color)',
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default memo(ReturnsSummaryPanel);
