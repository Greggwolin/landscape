'use client';

/**
 * NNNComparableSales — NNN SLB Comparable Sales Grid
 *
 * Investment perspective equivalent of SalesComparisonApproach.
 * Uses NNN-specific columns (concept, cap rate, remaining term)
 * from nnnMockData. Will be replaced with API data once backend wires up.
 *
 * @version 1.0
 * @created 2026-02-23
 * @session QT2
 */

import React, { memo } from 'react';
import { SALES_COMPS, fmtCurrency, fmtPercent } from './nnnMockData';

// ─── Styles ──────────────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  backgroundColor: 'var(--cui-card-bg)',
  border: '1px solid var(--cui-border-color)',
  borderRadius: 7,
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

// ─── Component ──────────────────────────────────────────────────────

function NNNComparableSales() {
  return (
    <div style={{ padding: '20px 24px', maxWidth: 1060 }}>
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--cui-body-color)' }}>
          Comparable Sales
        </div>
        <div style={{ fontSize: 12, color: 'var(--cui-secondary-color)', marginTop: 3 }}>
          NNN sale-leaseback comparable transactions
        </div>
      </div>

      {/* Grid */}
      <div style={sectionStyle}>
        <div style={sectionHeadStyle}>
          <div style={sectionTitleStyle}>NNN Sales Comparables</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <Th>Comp</Th>
                <Th>Location</Th>
                <Th>Concept</Th>
                <Th>Date</Th>
                <Th align="right">Sale Price</Th>
                <Th align="right">$/SF</Th>
                <Th align="right">Cap Rate</Th>
                <Th>Remaining Term</Th>
              </tr>
            </thead>
            <tbody>
              {SALES_COMPS.map((comp) => (
                <tr
                  key={comp.label}
                  style={comp.isSubject ? {
                    background: 'var(--hover-overlay)',
                    fontWeight: 600,
                  } : undefined}
                >
                  <Td>
                    {comp.isSubject ? (
                      <span style={{
                        background: 'var(--cui-primary)',
                        color: '#fff',
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 3,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}>
                        Subject
                      </span>
                    ) : comp.label}
                  </Td>
                  <Td>{comp.location}</Td>
                  <Td muted>{comp.concept}</Td>
                  <Td muted>{comp.date}</Td>
                  <Td align="right">{fmtCurrency(comp.salePrice)}</Td>
                  <Td align="right">{fmtCurrency(comp.priceSf)}</Td>
                  <Td align="right" color={comp.isSubject ? 'var(--cui-success)' : undefined}>
                    {fmtPercent(comp.capRate, 2)}
                  </Td>
                  <Td>{comp.remainingTerm}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function Th({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th style={{
      textAlign: align || 'left',
      padding: '7px 11px',
      fontSize: 10,
      fontWeight: 600,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.07em',
      color: 'var(--cui-tertiary-color, var(--text-secondary))',
      borderBottom: '1px solid var(--cui-border-color)',
      whiteSpace: 'nowrap' as const,
    }}>
      {children}
    </th>
  );
}

function Td({ children, align, color, muted }: {
  children: React.ReactNode;
  align?: 'left' | 'right';
  color?: string;
  muted?: boolean;
}) {
  return (
    <td style={{
      padding: '8px 11px',
      textAlign: align || 'left',
      borderBottom: '1px solid var(--line-soft)',
      color: color || (muted ? 'var(--cui-tertiary-color, var(--text-secondary))' : 'var(--cui-body-color)'),
    }}>
      {children}
    </td>
  );
}

export default memo(NNNComparableSales);
