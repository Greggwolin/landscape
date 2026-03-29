'use client';

/**
 * IncomeApproachContent Component
 *
 * Wrapper component that uses the useIncomeApproach hook and renders
 * the Income Approach UI components with internal pill navigation:
 *   Rent Comps | Expense Comps | Direct Cap | Cash Flow
 *
 * Each pill view has its own contextual sidebar content.
 *
 * @created 2026-01-25
 * @updated 2026-03-15 — QV17: Pill navigation + Expense Comps + Rent Comps
 */

import { useState } from 'react';
import { CCard, CCardBody } from '@coreui/react';
import { useIncomeApproach } from '@/hooks/useIncomeApproach';
import {
  AssumptionsPanel,
  DirectCapView,
} from '@/components/valuation/income-approach';
import { DCFView } from '@/components/valuation/income-approach/DCFView';
import { RentCompsView } from '@/components/valuation/income-approach/RentCompsView';
import { ExpenseCompsView } from '@/components/valuation/income-approach/ExpenseCompsView';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type IncomePill = 'rent-comps' | 'expense-comps' | 'direct-cap' | 'cash-flow';

interface IncomeApproachContentProps {
  projectId: number;
  projectName?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

const PILLS: { id: IncomePill; label: string; badgeClass: string }[] = [
  { id: 'rent-comps', label: 'Rent Comps', badgeClass: 'studio-badge-success' },
  { id: 'expense-comps', label: 'Expense Comps', badgeClass: 'studio-badge-error' },
  { id: 'direct-cap', label: 'Direct Cap', badgeClass: 'studio-badge-info' },
  { id: 'cash-flow', label: 'Cash Flow', badgeClass: 'studio-badge-info' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function IncomeApproachContent({ projectId, projectName, latitude, longitude }: IncomeApproachContentProps) {
  const [activePill, setActivePill] = useState<IncomePill>('rent-comps');

  const {
    data,
    isLoading,
    isSaving,
    error,
    selectedBasis,
    setSelectedBasis,
    updateAssumption,
    reload,
    dcfData,
    isDCFLoading,
    activeMethod,
    setActiveMethod,
    fetchDCF,
    monthlyDcfData,
    isMonthlyDCFLoading,
  } = useIncomeApproach(projectId);

  const selectedTile = data?.value_tiles.find((t) => t.id === selectedBasis);

  // ── Loading state ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--cui-secondary-color)' }}>
        <div
          style={{
            display: 'inline-block',
            width: '3rem',
            height: '3rem',
            borderRadius: '9999px',
            borderBottom: '2px solid var(--cui-primary)',
            marginBottom: '1rem',
            animation: 'spin 1s linear infinite',
          }}
        />
        <p style={{ fontSize: '1rem' }}>Loading Income Approach data...</p>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────
  if (error) {
    return (
      <CCard style={{ borderColor: 'var(--cui-danger)' }}>
        <CCardBody
          style={{ padding: '8px', textAlign: 'center', backgroundColor: 'var(--cui-danger-bg)', color: 'var(--cui-danger)' }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Error Loading Income Approach Data
          </h3>
          <p style={{ fontSize: '0.9375rem', marginBottom: '1rem' }}>{error}</p>
          <button
            onClick={reload}
            style={{
              padding: '0.5rem 1rem',
              fontWeight: 500,
              borderRadius: '0.25rem',
              fontSize: '0.9375rem',
              backgroundColor: 'var(--cui-danger)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </CCardBody>
      </CCard>
    );
  }

  // ── No data state ──────────────────────────────────────────────────────
  if (!data) {
    return (
      <div className="folder-content-placeholder">
        <div className="folder-content-placeholder-icon">💰</div>
        <h2>No Income Approach Data</h2>
        <p>No income approach data is available for this project.</p>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────
  return (
    <div className="income-approach-content" style={{ backgroundColor: 'var(--surface-subheader)' }}>
      {/* Saving indicator */}
      {isSaving && (
        <div
          style={{
            position: 'fixed',
            top: '1rem',
            right: '1rem',
            zIndex: 50,
            padding: '0.5rem 0.75rem',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'var(--cui-primary)',
            color: 'white',
          }}
        >
          <div
            style={{
              width: '1rem',
              height: '1rem',
              border: '2px solid white',
              borderTop: '2px solid transparent',
              borderRadius: '9999px',
              animation: 'spin 1s linear infinite',
            }}
          />
          <span style={{ fontSize: '0.875rem' }}>Saving...</span>
        </div>
      )}

      {/* ── Pill Navigation ─────────────────────────────────────────────── */}
      <div
        style={{
          padding: '0.4rem 1rem',
          backgroundColor: 'var(--surface-subheader)',
          borderBottom: '1px solid var(--cui-border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
        }}
      >
        {PILLS.map((pill) => {
          const isActive = activePill === pill.id;
          return (
            <button
              key={pill.id}
              type="button"
              className={isActive ? pill.badgeClass : undefined}
              onClick={() => {
                setActivePill(pill.id);
                if (pill.id === 'direct-cap') setActiveMethod('direct_cap');
                if (pill.id === 'cash-flow') setActiveMethod('dcf');
              }}
              style={isActive ? activeBtnOverride : inactiveBtnStyle}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* ── Two-Panel Layout: Sidebar + Main ────────────────────────────── */}
      <div className="d-flex" style={{ gap: '1.5rem', minHeight: '600px', padding: '0.75rem', backgroundColor: 'var(--cui-body-bg)' }}>
        {/* Left Panel — Contextual Sidebar */}
        <div
          style={{
            width: '26%',
            minWidth: '280px',
            maxWidth: '340px',
            flexShrink: 0,
            borderRadius: '0.5rem',
            overflow: 'hidden',
            backgroundColor: 'var(--cui-card-bg)',
            border: '1px solid var(--cui-border-color)',
          }}
        >
          {activePill === 'rent-comps' && (
            <RentCompsSidebar
              projectName={projectName || 'Subject'}
              unitCount={data.property_summary?.unit_count}
              avgRent={data.rent_roll?.forward_gpr
                ? Math.round(data.rent_roll.forward_gpr / 12 / (data.property_summary?.unit_count || 1))
                : undefined}
            />
          )}
          {activePill === 'expense-comps' && (
            <ExpenseCompsSidebar
              projectName={projectName || 'Subject'}
              unitCount={data.property_summary?.unit_count}
              totalSqft={data.property_summary?.total_sf}
              totalOpex={data.operating_expenses?.total}
            />
          )}
          {(activePill === 'direct-cap' || activePill === 'cash-flow') && (
            <AssumptionsPanel
              assumptions={data.assumptions}
              rentRoll={data.rent_roll}
              operatingExpenses={data.operating_expenses}
              onAssumptionChange={updateAssumption}
              isLoading={isLoading}
              isSaving={isSaving}
              activeMethod={activeMethod}
              onMethodChange={setActiveMethod}
            />
          )}
        </div>

        {/* Right Panel — Main Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {activePill === 'rent-comps' && (
            <RentCompsView
              projectId={projectId}
              projectName={projectName}
              latitude={latitude}
              longitude={longitude}
            />
          )}
          {activePill === 'expense-comps' && (
            <ExpenseCompsView
              projectId={projectId}
              subjectName={projectName}
              subjectUnitCount={data.property_summary?.unit_count}
              subjectTotalSqft={data.property_summary?.total_sf}
            />
          )}
          {activePill === 'direct-cap' && selectedTile && (
            <DirectCapView
              calculation={selectedTile.calculation}
              value={selectedTile.value}
              capRate={selectedTile.cap_rate}
              propertySummary={data.property_summary}
              rentRollItems={data.rent_roll.items}
              opexItems={data.operating_expenses.items}
              opexGroups={data.operating_expenses.groups}
              sensitivityMatrix={data.sensitivity_matrix}
              keyMetrics={data.key_metrics}
              selectedBasis={selectedBasis}
              allTiles={data.value_tiles}
              onMethodChange={setActiveMethod}
            />
          )}
          {activePill === 'cash-flow' && (
            <DCFView
              data={dcfData!}
              propertySummary={data.property_summary}
              isLoading={isDCFLoading || isMonthlyDCFLoading}
              onMethodChange={setActiveMethod}
              monthlyData={monthlyDcfData}
              projectId={projectId}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar: Rent Comps
// ─────────────────────────────────────────────────────────────────────────────

function RentCompsSidebar({
  projectName,
  unitCount,
  avgRent,
}: {
  projectName: string;
  unitCount?: number;
  avgRent?: number;
}) {
  return (
    <div style={{ height: '100%', overflowY: 'auto', backgroundColor: 'var(--cui-card-bg)' }}>
      {/* Header */}
      <div
        style={{
          padding: '0.375rem 1rem',
          backgroundColor: 'var(--cui-card-header-bg)',
          borderBottom: '1px solid var(--cui-border-color)',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--cui-body-color)' }}>
          Rent Comps
        </h2>
      </div>

      <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Subject Rent Summary */}
        <div>
          <div style={sidebarSectionLabel}>Subject Property</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--cui-body-color)', marginBottom: '0.25rem' }}>
            {projectName}
          </div>
          {unitCount != null && (
            <div style={sidebarDetailRow}>
              <span>Units</span>
              <span style={{ fontWeight: 500 }}>{unitCount}</span>
            </div>
          )}
          {avgRent != null && (
            <div style={sidebarDetailRow}>
              <span>Avg Rent/Unit</span>
              <span style={{ fontWeight: 500 }}>${avgRent.toLocaleString()}/mo</span>
            </div>
          )}
        </div>

        {/* ── Comp Search Parameters (Coming Soon) ────────────────────── */}
        <div>
          <div className="d-flex align-items-center" style={{ gap: '0.5rem', marginBottom: '0.375rem' }}>
            <span style={sidebarSectionLabel}>Comp Search</span>
            <span style={comingSoonBadge}>Coming Soon</span>
          </div>
          <p style={{ fontSize: '0.6875rem', color: 'var(--cui-tertiary-color)', margin: '0 0 0.5rem 0', lineHeight: 1.4 }}>
            Available after connecting a rental comp database or external data source via Landscaper.
          </p>

          {/* Search Radius */}
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={disabledLabel}>Search Radius (mi)</label>
            <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
              <input
                type="range"
                min={1}
                max={10}
                defaultValue={3}
                disabled
                style={{ flex: 1, opacity: 0.4, cursor: 'not-allowed' }}
              />
              <span style={{ ...disabledInputStyle, width: '3rem', textAlign: 'center', padding: '0.25rem' }}>3</span>
            </div>
          </div>

          {/* Year Built Range */}
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={disabledLabel}>Year Built</label>
            <div className="d-flex" style={{ gap: '0.375rem' }}>
              <input
                type="text"
                placeholder="From"
                disabled
                style={{ ...disabledInputStyle, flex: 1 }}
              />
              <span style={{ color: 'var(--cui-tertiary-color)', fontSize: '0.75rem', alignSelf: 'center' }}>–</span>
              <input
                type="text"
                placeholder="To"
                disabled
                style={{ ...disabledInputStyle, flex: 1 }}
              />
            </div>
          </div>

          {/* Unit Count Range */}
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={disabledLabel}>Unit Count</label>
            <div className="d-flex" style={{ gap: '0.375rem' }}>
              <input
                type="text"
                placeholder="Min"
                disabled
                style={{ ...disabledInputStyle, flex: 1 }}
              />
              <span style={{ color: 'var(--cui-tertiary-color)', fontSize: '0.75rem', alignSelf: 'center' }}>–</span>
              <input
                type="text"
                placeholder="Max"
                disabled
                style={{ ...disabledInputStyle, flex: 1 }}
              />
            </div>
          </div>

          {/* Property Class */}
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={disabledLabel}>Property Class</label>
            <select disabled style={{ ...disabledInputStyle, width: '100%' }}>
              <option>All Classes</option>
            </select>
          </div>

          {/* Amenities */}
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={disabledLabel}>Amenities</label>
            <div className="d-flex" style={{ gap: '0.25rem', flexWrap: 'wrap' }}>
              {['Pool', 'Fitness', 'Garage', 'W/D'].map((tag) => (
                <span key={tag} style={disabledChip}>{tag}</span>
              ))}
            </div>
          </div>

          {/* Bedroom Filter */}
          <div>
            <label style={disabledLabel}>Bedrooms</label>
            <div className="d-flex" style={{ gap: '0.25rem' }}>
              {['All', 'Studio', '1', '2', '3+'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  disabled
                  style={{
                    flex: 1,
                    padding: '0.1875rem 0',
                    fontSize: '0.6875rem',
                    fontWeight: 500,
                    borderRadius: '0.25rem',
                    border: '1px solid var(--cui-border-color)',
                    backgroundColor: opt === 'All' ? 'var(--cui-tertiary-bg)' : 'transparent',
                    color: 'var(--cui-tertiary-color)',
                    cursor: 'not-allowed',
                    opacity: 0.5,
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Data Source ─────────────────────────────────────────────── */}
        <div style={{ borderTop: '1px solid var(--cui-border-color)', paddingTop: '0.75rem' }}>
          <div className="d-flex align-items-center" style={{ gap: '0.5rem', marginBottom: '0.375rem' }}>
            <span style={sidebarSectionLabel}>Data Source</span>
            <span style={comingSoonBadge}>Coming Soon</span>
          </div>
          <p style={{ fontSize: '0.6875rem', color: 'var(--cui-tertiary-color)', margin: 0, lineHeight: 1.4 }}>
            Connect a rental comp database (CoStar, Yardi Matrix, RealPage) or upload a comp export
            to enable live search and auto-refresh.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar: Expense Comps
// ─────────────────────────────────────────────────────────────────────────────

function ExpenseCompsSidebar({
  projectName,
  unitCount,
  totalSqft,
  totalOpex,
}: {
  projectName: string;
  unitCount?: number;
  totalSqft?: number;
  totalOpex?: number;
}) {
  const [localDisplayMode, setLocalDisplayMode] = useState<'per_unit' | 'per_sf' | 'total'>('per_unit');

  const modes = [
    { id: 'per_unit' as const, label: '$/unit' },
    { id: 'per_sf' as const, label: '$/SF' },
    { id: 'total' as const, label: 'Total' },
  ];

  return (
    <div style={{ height: '100%', overflowY: 'auto', backgroundColor: 'var(--cui-card-bg)' }}>
      {/* Header */}
      <div
        style={{
          padding: '0.375rem 1rem',
          backgroundColor: 'var(--cui-card-header-bg)',
          borderBottom: '1px solid var(--cui-border-color)',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--cui-body-color)' }}>
          Expense Comps
        </h2>
      </div>

      <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Subject Section */}
        <div>
          <div style={sidebarSectionLabel}>Subject Property</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--cui-body-color)', marginBottom: '0.25rem' }}>
            {projectName}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
            {unitCount != null && (
              <div style={sidebarDetailRow}>
                <span>Units</span>
                <span style={{ fontWeight: 500 }}>{unitCount}</span>
              </div>
            )}
            {totalSqft != null && (
              <div style={sidebarDetailRow}>
                <span>Total SF</span>
                <span style={{ fontWeight: 500 }}>{totalSqft.toLocaleString()}</span>
              </div>
            )}
            {totalOpex != null && (
              <div style={sidebarDetailRow}>
                <span>F-12 OpEx</span>
                <span style={{ fontWeight: 500 }}>${Math.round(totalOpex).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Display Toggle */}
        <div>
          <div style={sidebarSectionLabel}>Display</div>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {modes.map((mode) => {
              const isActive = localDisplayMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setLocalDisplayMode(mode.id)}
                  style={{
                    flex: 1,
                    padding: '0.25rem 0.375rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '0.25rem',
                    border: `1px solid ${isActive ? 'var(--cui-primary)' : 'var(--cui-border-color)'}`,
                    cursor: 'pointer',
                    backgroundColor: isActive ? 'var(--cui-primary)' : 'transparent',
                    color: isActive ? 'white' : 'var(--cui-secondary-color)',
                  }}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Project Comps Section */}
        <div>
          <div style={sidebarSectionLabel}>Project Comps</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--cui-secondary-color)', lineHeight: 1.5 }}>
            No comparable projects found. Ask Landscaper to suggest operating statement uploads.
          </div>
        </div>

        {/* Platform KB Section */}
        <div>
          <div style={sidebarSectionLabel}>Platform Knowledge</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--cui-secondary-color)', lineHeight: 1.5 }}>
            Source: Landscaper KB synthesis. MSA-level benchmarks from indexed operating statements.
            Data scope and coverage details will be populated when KB data is available.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared sidebar styles
// ─────────────────────────────────────────────────────────────────────────────

// Active: larger button, override studio-badge pill radius to rectangular
const activeBtnOverride: React.CSSProperties = {
  borderRadius: '0.25rem',
  padding: '0.35rem 0.75rem',
  fontSize: '0.8125rem',
};

// Inactive: smaller, subtle
const inactiveBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.2rem 0.5rem',
  fontSize: '0.6875rem',
  fontWeight: 500,
  borderRadius: '0.25rem',
  cursor: 'pointer',
  border: '1px solid var(--cui-border-color)',
  backgroundColor: 'transparent',
  color: 'var(--cui-secondary-color)',
  transition: 'all 0.15s ease',
};

const comingSoonBadge: React.CSSProperties = {
  fontSize: '0.5625rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  padding: '0.0625rem 0.375rem',
  borderRadius: '999px',
  backgroundColor: 'var(--cui-warning-bg, #FFF3CD)',
  color: 'var(--cui-warning, #856404)',
  border: '1px solid var(--cui-warning, #856404)',
  lineHeight: '1.4',
  whiteSpace: 'nowrap',
};

const disabledLabel: React.CSSProperties = {
  display: 'block',
  fontSize: '0.6875rem',
  fontWeight: 600,
  color: 'var(--cui-tertiary-color)',
  marginBottom: '0.1875rem',
};

const disabledInputStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  padding: '0.25rem 0.5rem',
  borderRadius: '0.25rem',
  border: '1px solid var(--cui-border-color)',
  backgroundColor: 'var(--cui-tertiary-bg)',
  color: 'var(--cui-tertiary-color)',
  cursor: 'not-allowed',
  opacity: 0.5,
};

const disabledChip: React.CSSProperties = {
  fontSize: '0.625rem',
  fontWeight: 500,
  padding: '0.125rem 0.375rem',
  borderRadius: '999px',
  border: '1px solid var(--cui-border-color)',
  color: 'var(--cui-tertiary-color)',
  backgroundColor: 'transparent',
  opacity: 0.5,
};

const sidebarSectionLabel: React.CSSProperties = {
  fontSize: '0.6875rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--cui-secondary-color)',
  marginBottom: '0.375rem',
};

const sidebarDetailRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '0.8125rem',
  color: 'var(--cui-secondary-color)',
  padding: '0.0625rem 0',
};

export default IncomeApproachContent;
