'use client';

/**
 * NNNReconciliation — NNN SLB Reconciliation Panel
 *
 * Sections:
 *  1. Indicated Values table (approach, value, weight, weighted value, rationale)
 *  2. Risks & Mitigants (color-coded pairs)
 *  3. Final Value & Analyst Narrative
 *
 * @version 1.0
 * @created 2026-02-23
 * @session QT2
 */

import React, { memo, useState, useCallback } from 'react';
import {
  RECONCILIATION_APPROACHES,
  FINAL_VALUE,
  RISKS_MITIGANTS,
  RECONCILIATION_NARRATIVE,
  VALUE_CONCLUSION,
  fmtCurrency,
  fmtPercent,
} from './nnnMockData';

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

// ─── Component ───────────────────────────────────────────────────────

function NNNReconciliation() {
  const [narrative, setNarrative] = useState(RECONCILIATION_NARRATIVE);

  const handleBlur = useCallback(() => {
    console.log('[NNN] Reconciliation narrative auto-save:', narrative.substring(0, 50) + '...');
  }, [narrative]);

  const priceVsValue = ((VALUE_CONCLUSION.purchasePrice - FINAL_VALUE) / FINAL_VALUE) * 100;

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1060 }}>
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--cui-body-color)' }}>Reconciliation</div>
        <div style={{ fontSize: 12, color: 'var(--cui-secondary-color)', marginTop: 3 }}>
          Indicated Values · Weighting · Risks &amp; Mitigants · Final Value
        </div>
      </div>

      {/* Indicated Values */}
      <div style={sectionStyle}>
        <div style={sectionHeadStyle}>
          <div style={sectionTitleStyle}>Indicated Values by Approach</div>
        </div>
        <div style={sectionBodyStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <Th>Approach</Th>
                <Th align="right">Indicated Value</Th>
                <Th align="right">Weight</Th>
                <Th align="right">Weighted Value</Th>
                <Th>Rationale</Th>
              </tr>
            </thead>
            <tbody>
              {RECONCILIATION_APPROACHES.map((row) => (
                <tr key={row.approach}>
                  <Td>{row.approach}</Td>
                  <Td
                    align="right"
                    color={row.approach === 'Income Approach' ? 'var(--cui-success)' : undefined}
                    muted={row.indicatedValue === null}
                  >
                    {row.indicatedValue ? fmtCurrency(row.indicatedValue) : 'N/A'}
                  </Td>
                  <Td
                    align="right"
                    color={row.approach === 'Income Approach' ? 'var(--cui-success)' : undefined}
                    muted={row.weight === 0}
                  >
                    {fmtPercent(row.weight)}
                  </Td>
                  <Td
                    align="right"
                    color={row.approach === 'Income Approach' ? 'var(--cui-success)' : undefined}
                    muted={row.weightedValue === null}
                  >
                    {row.weightedValue ? fmtCurrency(row.weightedValue) : '—'}
                  </Td>
                  <Td muted>{row.rationale}</Td>
                </tr>
              ))}
              {/* Total row */}
              <tr style={{ fontWeight: 600, background: 'var(--hover-overlay)', borderTop: '1px solid var(--cui-border-color)' }}>
                <Td colSpan={2}>Final Value</Td>
                <Td align="right">{fmtPercent(1)}</Td>
                <Td align="right" color="var(--cui-success)">
                  <span style={{ fontSize: 15 }}>{fmtCurrency(FINAL_VALUE)}</span>
                </Td>
                <Td>&nbsp;</Td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Risks & Mitigants */}
      <div style={sectionStyle}>
        <div style={sectionHeadStyle}>
          <div style={sectionTitleStyle}>Risks &amp; Mitigants</div>
          <button className="btn btn-ghost-secondary" style={{ fontSize: 11, padding: '3px 10px' }}>+ Add</button>
        </div>
        <div style={sectionBodyStyle}>
          {RISKS_MITIGANTS.map((item, idx) => {
            const isRisk = item.type === 'risk';
            const borderColor = item.severity === 'red' ? 'var(--cui-danger)' :
                               item.severity === 'amber' ? 'var(--cui-warning)' :
                               'var(--cui-success)';
            const bgColor = item.severity === 'red' ? 'rgba(220,38,38,0.06)' :
                           item.severity === 'amber' ? 'rgba(202,138,4,0.06)' :
                           'rgba(22,163,74,0.06)';
            const labelColor = item.severity === 'red' ? 'var(--cui-danger)' :
                              item.severity === 'amber' ? 'var(--cui-warning)' :
                              'var(--cui-success)';

            // Add divider between risk/mitigant pairs
            const showDivider = !isRisk && idx < RISKS_MITIGANTS.length - 1;

            return (
              <React.Fragment key={idx}>
                <div style={{
                  borderLeft: `3px solid ${borderColor}`,
                  background: bgColor,
                  borderRadius: '0 5px 5px 0',
                  padding: '9px 13px',
                  marginBottom: 10,
                }}>
                  <div style={{
                    fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const,
                    letterSpacing: '0.07em', marginBottom: 3, color: labelColor,
                  }}>
                    {isRisk ? (item.severity === 'red' ? '✕' : '⚠') : '✓'} {item.label}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--cui-secondary-color)', lineHeight: 1.5 }}>
                    {item.text}
                  </div>
                </div>
                {showDivider && (
                  <div style={{ height: 1, background: 'var(--cui-border-color)', margin: '14px 0' }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Final Value & Narrative */}
      <div style={sectionStyle}>
        <div style={sectionHeadStyle}>
          <div style={sectionTitleStyle}>Final Value &amp; Analyst Narrative</div>
        </div>
        <div style={sectionBodyStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px 20px', marginBottom: 14 }}>
            <div>
              <div style={labelStyle}>Final Value</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--cui-success)' }}>{fmtCurrency(FINAL_VALUE)}</div>
            </div>
            <div>
              <div style={labelStyle}>Purchase Price</div>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--cui-body-color)' }}>{fmtCurrency(VALUE_CONCLUSION.purchasePrice)}</div>
            </div>
            <div>
              <div style={labelStyle}>Price vs. Value</div>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--cui-warning)' }}>+{priceVsValue.toFixed(1)}% above concluded</div>
            </div>
          </div>

          <textarea
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
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

function Th({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th style={{
      textAlign: align || 'left', padding: '7px 11px', fontSize: 10, fontWeight: 600,
      textTransform: 'uppercase' as const, letterSpacing: '0.07em',
      color: 'var(--cui-tertiary-color, var(--text-secondary))',
      borderBottom: '1px solid var(--cui-border-color)', whiteSpace: 'nowrap' as const,
    }}>{children}</th>
  );
}

function Td({ children, align, color, muted, colSpan }: {
  children: React.ReactNode; align?: 'left' | 'right'; color?: string; muted?: boolean; colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} style={{
      padding: '8px 11px', textAlign: align || 'left',
      borderBottom: '1px solid var(--line-soft)',
      color: color || (muted ? 'var(--cui-tertiary-color, var(--text-secondary))' : 'var(--cui-body-color)'),
    }}>{children}</td>
  );
}

export default memo(NNNReconciliation);
