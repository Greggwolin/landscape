'use client';

/**
 * UnitEconomicsPanel — NNN SLB Unit-Level Economics
 *
 * Sections:
 *  1. Portfolio Summary table (per-unit with data source chips)
 *  2. Site Detail cards (collapsible, fuel + inside metrics)
 *  3. Master Lease Stress Test (scenario table)
 *
 * @version 1.0
 * @created 2026-02-23
 * @session QT2
 */

import React, { memo } from 'react';
import {
  UNIT_SUMMARY,
  TUCSON_DETAIL,
  STRESS_TESTS,
  PORTFOLIO_TOTALS,
  fmtCurrency,
  fmtPercent,
  fmtMultiple,
  fmtNumber,
  type DataSourceStatus,
} from '../nnnMockData';

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
  letterSpacing: '0.06em',
  marginBottom: 3,
};

// ─── Component ───────────────────────────────────────────────────────

function UnitEconomicsPanel() {
  const completedUnits = UNIT_SUMMARY.filter((u) => u.dataSource === 'Unit P&L').length;
  const totalUnits = UNIT_SUMMARY.length;

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1060 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--cui-body-color)' }}>Unit Economics</div>
          <div style={{ fontSize: 12, color: 'var(--cui-secondary-color)', marginTop: 3 }}>
            Site-level P&amp;L · Annualized 2024 · Master lease coverage by unit
          </div>
        </div>
        <StatusChip label={`${completedUnits} of ${totalUnits} Units Complete`} variant="amber" />
      </div>

      {/* Portfolio Summary */}
      <div style={sectionStyle}>
        <div style={sectionHeadStyle}>
          <div style={sectionTitleStyle}>Portfolio Summary</div>
        </div>
        <div style={sectionBodyStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <Th>Property</Th>
                <Th>Concept</Th>
                <Th align="right">Revenue</Th>
                <Th align="right">EBITDAR</Th>
                <Th align="right">Margin</Th>
                <Th align="right">Unit Rent</Th>
                <Th align="right">Coverage</Th>
                <Th>Data Source</Th>
              </tr>
            </thead>
            <tbody>
              {UNIT_SUMMARY.map((unit) => (
                <tr key={unit.property}>
                  <Td>{unit.property}</Td>
                  <Td><ConceptChip label={unit.concept} /></Td>
                  <Td align="right" muted={unit.revenue === null}>{fmtCurrency(unit.revenue)}</Td>
                  <Td align="right" color={unit.ebitdar ? 'var(--cui-success)' : undefined} muted={unit.ebitdar === null}>
                    {fmtCurrency(unit.ebitdar)}
                  </Td>
                  <Td align="right" muted={unit.margin === null}>{fmtPercent(unit.margin, 1)}</Td>
                  <Td align="right">{fmtCurrency(unit.unitRent)}</Td>
                  <Td align="right" color={unit.coverage ? 'var(--cui-success)' : undefined} muted={unit.coverage === null}>
                    {fmtMultiple(unit.coverage)}
                  </Td>
                  <Td><DataSourceChip status={unit.dataSource} /></Td>
                </tr>
              ))}
              {/* Portfolio total */}
              <tr style={{ fontWeight: 600, background: 'var(--hover-overlay)', borderTop: '1px solid var(--cui-border-color)' }}>
                <Td colSpan={2}>Portfolio (Guarantor Level)</Td>
                <Td align="right">{fmtCurrency(4820000)}</Td>
                <Td align="right" color="var(--cui-success)">{fmtCurrency(788000)}</Td>
                <Td align="right">{fmtPercent(0.164, 1)}</Td>
                <Td align="right">{fmtCurrency(PORTFOLIO_TOTALS.allocRent)}</Td>
                <Td align="right" color="var(--cui-success)">{fmtMultiple(2.44)}</Td>
                <Td><DataSourceChip status="Guarantor" /></Td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tucson Site Detail */}
      <div style={sectionStyle}>
        <div style={sectionHeadStyle}>
          <div style={sectionTitleStyle}>Tucson DQ / Shell — Site Detail</div>
          <StatusChip label="Complete" variant="green" />
        </div>
        <div style={sectionBodyStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px 20px' }}>
            <FieldItem label="Gas Gallons / Yr" value={fmtNumber(TUCSON_DETAIL.gasGallonsYr)} />
            <FieldItem label="Fuel Margin / Gal" value={`$${TUCSON_DETAIL.fuelMarginPerGal.toFixed(2)}`} />
            <FieldItem label="Fuel Revenue" value={fmtCurrency(TUCSON_DETAIL.fuelRevenue)} />
            <FieldItem label="Inside Store Sales" value={fmtCurrency(TUCSON_DETAIL.insideStoreSales)} />
            <FieldItem label="Inside Margin" value={fmtPercent(TUCSON_DETAIL.insideMargin, 1)} color="var(--cui-warning)" />
            <FieldItem label="Total Revenue" value={fmtCurrency(TUCSON_DETAIL.totalRevenue)} />
            <FieldItem label="EBITDAR" value={fmtCurrency(TUCSON_DETAIL.ebitdar)} color="var(--cui-success)" />
            <FieldItem label="Unit Coverage" value={fmtMultiple(TUCSON_DETAIL.unitCoverage)} color="var(--cui-success)" />
          </div>
        </div>
      </div>

      {/* Stress Test */}
      <div style={sectionStyle}>
        <div style={sectionHeadStyle}>
          <div style={sectionTitleStyle}>Master Lease Stress Testing</div>
        </div>
        <div style={sectionBodyStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <Th>Scenario</Th>
                <Th align="right">EBITDAR Avail.</Th>
                <Th align="right">Total Rent</Th>
                <Th align="right">Coverage</Th>
                <Th>Assessment</Th>
              </tr>
            </thead>
            <tbody>
              {STRESS_TESTS.map((test) => (
                <tr key={test.scenario}>
                  <Td>{test.scenario}</Td>
                  <Td align="right" color={test.assessment === 'Pass' ? 'var(--cui-success)' : undefined}>
                    {fmtCurrency(test.ebitdarAvail)}
                  </Td>
                  <Td align="right">{fmtCurrency(test.totalRent)}</Td>
                  <Td
                    align="right"
                    color={
                      test.assessment === 'Pass' ? 'var(--cui-success)' :
                      test.assessment === 'Marginal' ? 'var(--cui-warning)' :
                      'var(--cui-danger)'
                    }
                  >
                    {fmtMultiple(test.coverage)}
                  </Td>
                  <Td>
                    <StatusChip
                      label={test.assessment}
                      variant={test.assessment === 'Pass' ? 'green' : test.assessment === 'Marginal' ? 'amber' : 'red'}
                    />
                  </Td>
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

function FieldItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <div style={{ fontSize: 12.5, fontWeight: 500, color: color || 'var(--cui-body-color)' }}>{value}</div>
    </div>
  );
}

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

function ConceptChip({ label }: { label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 3,
      fontSize: 10, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' as const,
      background: 'var(--chip-horizontal-bg)', color: 'var(--chip-horizontal-text)',
      border: '1px solid var(--chip-horizontal-border)',
    }}>{label}</span>
  );
}

function StatusChip({ label, variant }: { label: string; variant: 'green' | 'amber' | 'red' }) {
  const styles: Record<string, React.CSSProperties> = {
    green: { background: 'rgba(22,163,74,0.1)', color: 'var(--cui-success)', border: '1px solid rgba(22,163,74,0.25)' },
    amber: { background: 'rgba(202,138,4,0.1)', color: 'var(--cui-warning)', border: '1px solid rgba(202,138,4,0.25)' },
    red: { background: 'rgba(220,38,38,0.08)', color: 'var(--cui-danger)', border: '1px solid rgba(220,38,38,0.2)' },
  };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 3,
      fontSize: 10, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' as const,
      ...styles[variant],
    }}>{label}</span>
  );
}

function DataSourceChip({ status }: { status: DataSourceStatus }) {
  const variant = status === 'Unit P&L' ? 'green' : status === 'Pending' ? 'amber' : 'blue';
  const styles: Record<string, React.CSSProperties> = {
    green: { background: 'rgba(22,163,74,0.1)', color: 'var(--cui-success)', border: '1px solid rgba(22,163,74,0.25)' },
    amber: { background: 'rgba(202,138,4,0.1)', color: 'var(--cui-warning)', border: '1px solid rgba(202,138,4,0.25)' },
    blue: { background: 'var(--chip-horizontal-bg)', color: 'var(--chip-horizontal-text)', border: '1px solid var(--chip-horizontal-border)' },
  };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 3,
      fontSize: 10, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' as const,
      ...styles[variant],
    }}>{status}</span>
  );
}

export default memo(UnitEconomicsPanel);
