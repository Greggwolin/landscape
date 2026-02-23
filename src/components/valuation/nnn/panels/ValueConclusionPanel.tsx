'use client';

/**
 * ValueConclusionPanel — NNN SLB Value Conclusion (Valuation Perspective)
 *
 * Sections:
 *  1. KPI row (NOI, Cap Rate Range, Applied Rate, Indicated Value, Value/SF)
 *  2. Cap Rate Support (field grid)
 *  3. Analyst Notes (editable textarea, auto-save on blur)
 *
 * @version 1.0
 * @created 2026-02-23
 * @session QT2
 */

import React, { memo, useState, useCallback } from 'react';
import { VALUE_CONCLUSION, fmtCurrency, fmtPercent } from '../nnnMockData';

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
  minWidth: 120,
};

const subStyle: React.CSSProperties = {
  fontSize: 10,
  color: 'var(--cui-tertiary-color, var(--text-secondary))',
  marginTop: 2,
};

// ─── Component ───────────────────────────────────────────────────────

function ValueConclusionPanel() {
  const [notes, setNotes] = useState(VALUE_CONCLUSION.analystNotes);

  const handleBlur = useCallback(() => {
    // TODO: Auto-save to API on blur
    console.log('[NNN] Analyst notes auto-save:', notes.substring(0, 50) + '...');
  }, [notes]);

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1060 }}>
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--cui-body-color)' }}>
          Value Conclusion — Income Approach
        </div>
        <div style={{ fontSize: 12, color: 'var(--cui-secondary-color)', marginTop: 3 }}>
          Direct Capitalization · Absolute NNN master lease
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' as const }}>
        <div style={kpiStyle}>
          <div style={labelStyle}>Stabilized NOI</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--cui-body-color)' }}>{fmtCurrency(VALUE_CONCLUSION.stabilizedNOI)}</div>
          <div style={subStyle}>Yr 1 master rent · NNN</div>
        </div>
        <div style={kpiStyle}>
          <div style={labelStyle}>Cap Rate Range</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--cui-body-color)' }}>{VALUE_CONCLUSION.capRateRange}</div>
          <div style={subStyle}>Market derived</div>
        </div>
        <div style={kpiStyle}>
          <div style={labelStyle}>Cap Rate Applied</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--cui-success)' }}>{fmtPercent(VALUE_CONCLUSION.capRateApplied, 2)}</div>
          <div style={subStyle}>Size / portfolio adj.</div>
        </div>
        <div style={kpiStyle}>
          <div style={labelStyle}>Indicated Value</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--cui-success)' }}>{fmtCurrency(VALUE_CONCLUSION.indicatedValue)}</div>
          <div style={subStyle}>Income approach</div>
        </div>
        <div style={kpiStyle}>
          <div style={labelStyle}>Value / SF</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--cui-body-color)' }}>${VALUE_CONCLUSION.valuePerSf.toFixed(2)}</div>
          <div style={subStyle}>Blended 11,600 SF</div>
        </div>
      </div>

      {/* Cap Rate Support */}
      <div style={sectionStyle}>
        <div style={sectionHeadStyle}>
          <div style={sectionTitleStyle}>Cap Rate Support</div>
        </div>
        <div style={sectionBodyStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px 20px' }}>
            <FieldItem label="Sales Comp Range" value={VALUE_CONCLUSION.salesCompRange} />
            <FieldItem label="Market Midpoint" value={VALUE_CONCLUSION.marketMidpoint} />
            <FieldItem label="Adjustment" value={VALUE_CONCLUSION.adjustment} color="var(--cui-warning)" />
            <FieldItem label="Applied Rate" value={fmtPercent(VALUE_CONCLUSION.capRateApplied, 2)} color="var(--cui-success)" />
            <FieldItem label="Indicated Value" value={fmtCurrency(VALUE_CONCLUSION.indicatedValue)} color="var(--cui-success)" />
            <FieldItem label="Purchase Price" value={fmtCurrency(VALUE_CONCLUSION.purchasePrice)} />
          </div>
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

// ─── Sub-components ──────────────────────────────────────────────────

function FieldItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <div style={{ fontSize: 12.5, fontWeight: 500, color: color || 'var(--cui-body-color)' }}>{value}</div>
    </div>
  );
}

export default memo(ValueConclusionPanel);
