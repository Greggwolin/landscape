'use client';

/**
 * TenantCreditPanel — NNN SLB Tenant & Credit Analysis
 *
 * Sections:
 *  1. Guarantor Profile (2-col: profile card + net worth)
 *  2. Pre/Post SLB Income Statement
 *  3. Key Credit Ratios (KPI cards with coverage bars)
 *
 * Conditionally renders Personal vs Corporate guarantor fields.
 *
 * @version 1.0
 * @created 2026-02-23
 * @session QT2
 */

import React, { memo } from 'react';
import {
  GUARANTOR,
  NET_WORTH,
  INCOME_STATEMENT,
  CREDIT_RATIOS,
  fmtCurrency,
  fmtPercent,
  fmtMultiple,
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

function TenantCreditPanel() {
  const isPersonal = GUARANTOR.type === 'Personal';

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1060 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--cui-body-color)' }}>Tenant &amp; Credit</div>
          <div style={{ fontSize: 12, color: 'var(--cui-secondary-color)', marginTop: 3 }}>
            {isPersonal ? 'Personal guarantor' : 'Corporate guarantor'} · {GUARANTOR.name} · AZ Gas &amp; C-Store Operator
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Chip label={`${GUARANTOR.type} Guarantor`} variant="muted" />
          <button className="btn btn-ghost-secondary" style={{ fontSize: '11.5px', padding: '5px 12px' }}>Edit</button>
        </div>
      </div>

      {/* Two-column: Profile + Net Worth */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* Guarantor Profile */}
        <div style={{ ...sectionStyle, marginBottom: 0 }}>
          <div style={sectionHeadStyle}><div style={sectionTitleStyle}>Guarantor Profile</div></div>
          <div style={sectionBodyStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--cui-primary), var(--chip-vertical-text, #7c3aed))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 14, color: 'white', flexShrink: 0,
              }}>
                {GUARANTOR.initials}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cui-body-color)' }}>{GUARANTOR.name}</div>
                <div style={{ fontSize: 11, color: 'var(--cui-secondary-color)' }}>{GUARANTOR.type} Guarantor · AZ Operator</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px 16px' }}>
              <FieldItem label="Type" value={GUARANTOR.type} />
              <FieldItem label="Statements" value={GUARANTOR.statements} />
              <FieldItem label="Concepts" value={GUARANTOR.concepts} />
              <FieldItem label="Units" value={String(GUARANTOR.units)} />
              <FieldItem label="Yrs Operating" value={String(GUARANTOR.yearsOperating)} />
              <div>
                <div style={labelStyle}>Watchlist</div>
                <Chip label={GUARANTOR.watchlist} variant="green" />
              </div>
            </div>
          </div>
        </div>

        {/* Net Worth */}
        <div style={{ ...sectionStyle, marginBottom: 0 }}>
          <div style={sectionHeadStyle}>
            <div style={sectionTitleStyle}>{isPersonal ? 'Personal Net Worth (2024)' : 'Corporate Balance Sheet'}</div>
          </div>
          <div style={sectionBodyStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <tbody>
                <NWRow label="Real Estate" value={NET_WORTH.realEstate} muted />
                <NWRow label="Business Interests" value={NET_WORTH.businessInterests} muted />
                <NWRow label="Cash & Liquid" value={NET_WORTH.cashLiquid} muted />
                <NWRow label="Other Assets" value={NET_WORTH.otherAssets} muted />
                <NWRow label="Total Assets" value={NET_WORTH.totalAssets} bold />
                <NWRow label="Total Liabilities" value={-NET_WORTH.totalLiabilities} muted color="var(--cui-danger)" />
                <NWRow label="Net Worth" value={NET_WORTH.netWorth} bold color="var(--cui-success)" />
                <NWRow label="NW / Annual Rent" value={null} bold color="var(--cui-success)" display={`${NET_WORTH.nwToRentRatio}x`} />
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pre/Post SLB Income Statement */}
      <div style={sectionStyle}>
        <div style={sectionHeadStyle}>
          <div style={sectionTitleStyle}>Income Statement — Pre / Post SLB Comparison</div>
        </div>
        <div style={sectionBodyStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <Th>Line Item</Th>
                <Th align="right">FY2022</Th>
                <Th align="right">FY2023</Th>
                <Th align="right">FY2024 Pre-SLB</Th>
                <Th align="right">FY2024 Post-SLB</Th>
              </tr>
            </thead>
            <tbody>
              {INCOME_STATEMENT.map((row) => {
                const isEbitdar = row.label === 'EBITDAR';
                const isPostSLB = row.label === 'EBITDA Post-SLB';
                const isNewRent = row.label === 'Less: New SLB Rent';
                return (
                  <tr
                    key={row.label}
                    style={isPostSLB ? { fontWeight: 600, background: 'var(--hover-overlay)', borderTop: '1px solid var(--cui-border-color)' } : undefined}
                  >
                    <td style={{
                      padding: '8px 11px',
                      paddingLeft: row.indent ? 18 : 11,
                      fontWeight: row.bold ? 600 : 400,
                      color: row.indent ? 'var(--cui-secondary-color)' : 'var(--cui-body-color)',
                      borderBottom: '1px solid var(--line-soft)',
                    }}>
                      {row.label}
                    </td>
                    <TdVal val={row.fy2022} green={isEbitdar} />
                    <TdVal val={row.fy2023} green={isEbitdar} />
                    <TdVal val={row.fy2024Pre} green={isEbitdar} />
                    <TdVal val={row.fy2024Post} green={isEbitdar} amber={isNewRent || isPostSLB} />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Credit Ratios */}
      <div style={sectionStyle}>
        <div style={sectionHeadStyle}>
          <div style={sectionTitleStyle}>Key Credit Ratios</div>
        </div>
        <div style={sectionBodyStyle}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
            {/* EBITDAR Coverage */}
            <KPICard
              label="EBITDAR Coverage (Post-SLB)"
              value={fmtMultiple(CREDIT_RATIOS.ebitdarCoverage)}
              color="var(--cui-success)"
              sub={`Floor: ${CREDIT_RATIOS.ebitdarCoverageFloor}x · Preferred: ${CREDIT_RATIOS.ebitdarCoveragePreferred}x`}
              barPct={65}
              barColor="var(--cui-success)"
            />
            {/* NW / Rent */}
            <KPICard
              label="Net Worth / Annual Rent"
              value={`${CREDIT_RATIOS.nwToRent}x`}
              color="var(--cui-success)"
              sub="Personal guarantor strength"
            />
            {/* Coverage ex-Owner Comp */}
            <KPICard
              label="Coverage ex-Owner Comp"
              value={fmtMultiple(CREDIT_RATIOS.coverageExOwnerComp)}
              color="var(--cui-warning)"
              sub="Below 2.0x — verify addback"
              barPct={44}
              barColor="var(--cui-warning)"
            />
            {/* Owner Comp Addback */}
            <KPICard
              label="Owner Comp Addback"
              value={fmtCurrency(CREDIT_RATIOS.ownerCompAddback)}
              color="var(--cui-warning)"
              sub={`${fmtPercent(CREDIT_RATIOS.ownerCompPctEbitdar)} of EBITDAR`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function FieldItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--cui-body-color)' }}>{value}</div>
    </div>
  );
}

function Chip({ label, variant }: { label: string; variant: 'green' | 'amber' | 'red' | 'blue' | 'muted' }) {
  const styles: Record<string, React.CSSProperties> = {
    green: { background: 'rgba(22,163,74,0.1)', color: 'var(--cui-success)', border: '1px solid rgba(22,163,74,0.25)' },
    amber: { background: 'rgba(202,138,4,0.1)', color: 'var(--cui-warning)', border: '1px solid rgba(202,138,4,0.25)' },
    red: { background: 'rgba(220,38,38,0.08)', color: 'var(--cui-danger)', border: '1px solid rgba(220,38,38,0.2)' },
    blue: { background: 'var(--chip-horizontal-bg)', color: 'var(--chip-horizontal-text)', border: '1px solid var(--chip-horizontal-border)' },
    muted: { background: 'var(--hover-overlay)', color: 'var(--cui-secondary-color)', border: '1px solid var(--cui-border-color)' },
  };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 3,
      fontSize: 10, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' as const,
      ...styles[variant],
    }}>
      {label}
    </span>
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

function TdVal({ val, green, amber }: { val: number | null; green?: boolean; amber?: boolean }) {
  let color = 'var(--cui-body-color)';
  if (val === null) color = 'var(--cui-secondary-color)';
  else if (amber && val !== null) color = 'var(--cui-warning)';
  else if (green && val !== null && val > 0) color = 'var(--cui-success)';
  else if (val !== null && val < 0) color = 'var(--cui-secondary-color)';

  return (
    <td style={{ padding: '8px 11px', textAlign: 'right', borderBottom: '1px solid var(--line-soft)', color }}>
      {val === null ? '—' : fmtCurrency(val)}
    </td>
  );
}

function NWRow({ label, value, bold, muted, color, display }: {
  label: string; value: number | null; bold?: boolean; muted?: boolean; color?: string; display?: string;
}) {
  const isTotalRow = bold && (label === 'Total Assets' || label === 'Net Worth');
  return (
    <tr style={isTotalRow ? { fontWeight: 600, background: 'var(--hover-overlay)', borderTop: '1px solid var(--cui-border-color)' } : undefined}>
      <td style={{
        padding: '8px 11px',
        color: muted ? 'var(--cui-secondary-color)' : 'var(--cui-body-color)',
        fontWeight: bold ? 600 : 400,
        borderBottom: '1px solid var(--line-soft)',
      }}>
        {label}
      </td>
      <td style={{
        padding: '8px 11px', textAlign: 'right',
        color: color || 'var(--cui-body-color)',
        fontWeight: bold ? 600 : 400,
        borderBottom: '1px solid var(--line-soft)',
      }}>
        {display || (value !== null ? fmtCurrency(value) : '—')}
      </td>
    </tr>
  );
}

function KPICard({ label, value, color, sub, barPct, barColor }: {
  label: string; value: string; color: string; sub: string; barPct?: number; barColor?: string;
}) {
  return (
    <div style={{
      backgroundColor: 'var(--cui-card-bg)', border: '1px solid var(--cui-border-color)',
      borderRadius: 7, padding: '11px 15px', flex: 1, minWidth: 160,
    }}>
      <div style={labelStyle}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 600, color }}>{value}</div>
      {barPct !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
          <div style={{ flex: 1, height: 5, background: 'var(--hover-overlay)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${barPct}%`, borderRadius: 3, background: barColor }} />
          </div>
        </div>
      )}
      <div style={{ fontSize: 10, color: 'var(--cui-tertiary-color, var(--text-secondary))', marginTop: 2 }}>{sub}</div>
    </div>
  );
}

export default memo(TenantCreditPanel);
