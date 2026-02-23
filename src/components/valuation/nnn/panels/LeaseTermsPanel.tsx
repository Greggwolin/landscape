'use client';

/**
 * LeaseTermsPanel — NNN SLB Lease Terms
 *
 * Sections:
 *  1. KPI row (Structure, Term, Rent, Escalation, Rent/SF)
 *  2. Lease Parameters (4-col field grid)
 *  3. Rent Schedule (table)
 *  4. Property Allocation (table with concept chips)
 *
 * @version 1.0
 * @created 2026-02-23
 * @session QT2
 */

import React, { memo } from 'react';
import {
  LEASE_PARAMS,
  RENT_SCHEDULE,
  PROPERTY_ALLOCATIONS,
  PORTFOLIO_TOTALS,
  fmtCurrency,
  fmtPercent,
} from '../nnnMockData';

// ─── Shared Styling Helpers ──────────────────────────────────────────

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

const sectionBodyStyle: React.CSSProperties = {
  padding: '14px 16px',
};

const kpiStyle: React.CSSProperties = {
  backgroundColor: 'var(--cui-card-bg)',
  border: '1px solid var(--cui-border-color)',
  borderRadius: 7,
  padding: '11px 15px',
  flex: 1,
  minWidth: 120,
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  color: 'var(--cui-tertiary-color, var(--text-secondary))',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.07em',
  marginBottom: 4,
};

const valStyle: React.CSSProperties = {
  fontSize: 17,
  fontWeight: 600,
  color: 'var(--cui-body-color)',
};

const subStyle: React.CSSProperties = {
  fontSize: 10,
  color: 'var(--cui-tertiary-color, var(--text-secondary))',
  marginTop: 2,
};

// ─── Component ───────────────────────────────────────────────────────

function LeaseTermsPanel() {
  return (
    <div style={{ padding: '20px 24px', maxWidth: 1060 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--cui-body-color)' }}>Lease Terms</div>
          <div style={{ fontSize: 12, color: 'var(--cui-secondary-color)', marginTop: 3 }}>
            Absolute NNN · Master Lease · 3 properties cross-collateralized
          </div>
        </div>
        <button
          className="btn btn-ghost-secondary"
          style={{ fontSize: '11.5px', padding: '5px 12px' }}
        >
          Edit
        </button>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' as const }}>
        <div style={kpiStyle}>
          <div style={labelStyle}>Structure</div>
          <div style={{ ...valStyle, fontSize: 14 }}>{LEASE_PARAMS.structure}</div>
          <div style={subStyle}>Master · Cross-default</div>
        </div>
        <div style={kpiStyle}>
          <div style={labelStyle}>Primary Term</div>
          <div style={valStyle}>{LEASE_PARAMS.primaryTermYears} Yrs</div>
          <div style={subStyle}>+ {LEASE_PARAMS.renewalOptions.toLowerCase()}</div>
        </div>
        <div style={kpiStyle}>
          <div style={labelStyle}>Annual Rent (Yr 1)</div>
          <div style={{ ...valStyle, color: 'var(--cui-success)' }}>{fmtCurrency(PORTFOLIO_TOTALS.allocRent)}</div>
          <div style={subStyle}>All 3 properties</div>
        </div>
        <div style={kpiStyle}>
          <div style={labelStyle}>Escalation</div>
          <div style={valStyle}>10% / 5 Yrs</div>
          <div style={subStyle}>Fixed bumps</div>
        </div>
        <div style={kpiStyle}>
          <div style={labelStyle}>Rent / SF</div>
          <div style={valStyle}>${PORTFOLIO_TOTALS.rentPerSf.toFixed(2)}</div>
          <div style={subStyle}>Blended · {PORTFOLIO_TOTALS.sf.toLocaleString()} SF</div>
        </div>
      </div>

      {/* Lease Parameters */}
      <div style={sectionStyle}>
        <div style={sectionHeadStyle}>
          <div style={sectionTitleStyle}>Lease Parameters</div>
        </div>
        <div style={sectionBodyStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px 20px' }}>
            <FieldItem label="Commencement" value="01/01/2025" />
            <FieldItem label="Expiration" value="12/31/2039" />
            <FieldItem label="Remaining Term" value={`${LEASE_PARAMS.remainingTermYears} Years`} color="var(--cui-success)" />
            <FieldItem label="Renewal Options" value={LEASE_PARAMS.renewalOptions} />
            <FieldItem label="Renewal Rent" value={LEASE_PARAMS.renewalRent} />
            <FieldItem label="Landlord Obligations" value={LEASE_PARAMS.landlordObligations} muted />
            <FieldItem label="Cross-Default" value="Yes" color="var(--cui-success)" />
            <FieldItem label="All-or-None" value="Yes" color="var(--cui-success)" />
          </div>
        </div>
      </div>

      {/* Rent Schedule */}
      <div style={sectionStyle}>
        <div style={sectionHeadStyle}>
          <div style={sectionTitleStyle}>Rent Schedule</div>
        </div>
        <div style={sectionBodyStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <Th>Period</Th>
                <Th>Years</Th>
                <Th align="right">Annual Rent</Th>
                <Th align="right">Escalation</Th>
                <Th align="right">Cumulative</Th>
              </tr>
            </thead>
            <tbody>
              {RENT_SCHEDULE.map((row) => (
                <tr key={row.period}>
                  <Td>{row.period}</Td>
                  <Td>{row.years}</Td>
                  <Td align="right" color={row.isFMV ? 'var(--cui-warning)' : row.period === 'Base' ? 'var(--cui-success)' : undefined}>
                    {row.isFMV ? 'FMV' : fmtCurrency(row.annualRent)}
                  </Td>
                  <Td align="right" color={row.escalation ? 'var(--cui-success)' : undefined} muted={!row.escalation}>
                    {row.escalation ? `+${fmtPercent(row.escalation)}` : row.isFMV ? 'FMV' : '—'}
                  </Td>
                  <Td align="right" color={row.cumulative ? 'var(--cui-success)' : undefined} muted={!row.cumulative}>
                    {row.cumulative ? `+${fmtPercent(row.cumulative)}` : '—'}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Property Allocation */}
      <div style={sectionStyle}>
        <div style={sectionHeadStyle}>
          <div style={sectionTitleStyle}>Property Allocation</div>
        </div>
        <div style={sectionBodyStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <Th>Property</Th>
                <Th>Concept</Th>
                <Th align="right">SF</Th>
                <Th align="right">Alloc. Price</Th>
                <Th align="right">Alloc. Rent</Th>
                <Th align="right">Rent/SF</Th>
                <Th align="right">Cap Rate</Th>
              </tr>
            </thead>
            <tbody>
              {PROPERTY_ALLOCATIONS.map((prop) => (
                <tr key={prop.name}>
                  <Td>{prop.name}</Td>
                  <Td><ConceptChip label={prop.concept} /></Td>
                  <Td align="right">{prop.sf.toLocaleString()}</Td>
                  <Td align="right">{fmtCurrency(prop.allocPrice)}</Td>
                  <Td align="right" color="var(--cui-success)">{fmtCurrency(prop.allocRent)}</Td>
                  <Td align="right">${prop.rentPerSf.toFixed(2)}</Td>
                  <Td align="right">{fmtPercent(prop.capRate, 2)}</Td>
                </tr>
              ))}
              {/* Total row */}
              <tr style={{ fontWeight: 600, background: 'var(--hover-overlay)', borderTop: '1px solid var(--cui-border-color)' }}>
                <Td colSpan={2}>Portfolio</Td>
                <Td align="right">{PORTFOLIO_TOTALS.sf.toLocaleString()}</Td>
                <Td align="right">{fmtCurrency(PORTFOLIO_TOTALS.allocPrice)}</Td>
                <Td align="right" color="var(--cui-success)">{fmtCurrency(PORTFOLIO_TOTALS.allocRent)}</Td>
                <Td align="right">${PORTFOLIO_TOTALS.rentPerSf.toFixed(2)}</Td>
                <Td align="right" color="var(--cui-success)">{fmtPercent(PORTFOLIO_TOTALS.capRate, 2)}</Td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function FieldItem({ label, value, color, muted }: { label: string; value: string; color?: string; muted?: boolean }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <div style={{ fontSize: 12.5, fontWeight: 500, color: color || (muted ? 'var(--cui-secondary-color)' : 'var(--cui-body-color)') }}>
        {value}
      </div>
    </div>
  );
}

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

function Td({ children, align, color, muted, colSpan }: {
  children: React.ReactNode;
  align?: 'left' | 'right';
  color?: string;
  muted?: boolean;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      style={{
        padding: '8px 11px',
        textAlign: align || 'left',
        borderBottom: '1px solid var(--line-soft)',
        color: color || (muted ? 'var(--cui-tertiary-color, var(--text-secondary))' : 'var(--cui-body-color)'),
      }}
    >
      {children}
    </td>
  );
}

function ConceptChip({ label }: { label: string }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 7px',
      borderRadius: 3,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.03em',
      textTransform: 'uppercase' as const,
      background: 'var(--chip-info, rgba(37,99,235,0.12))',
      color: 'var(--chip-horizontal-text, #1d4ed8)',
      border: '1px solid var(--chip-horizontal-border, rgba(37,99,235,0.45))',
    }}>
      {label}
    </span>
  );
}

export default memo(LeaseTermsPanel);
