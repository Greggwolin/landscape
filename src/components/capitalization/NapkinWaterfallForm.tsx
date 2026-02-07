'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CAlert, CCard, CCardBody } from '@coreui/react';

type WaterfallType = 'IRR' | 'EM' | 'IRR_EM';

interface NapkinWaterfallFormProps {
  projectId: number;
  onSaved?: (data: unknown) => void;
  waterfallType?: WaterfallType;
  onWaterfallTypeChange?: (type: WaterfallType) => void;
}

type SaveState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

const formatInt = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value) || value === 0) return '—';
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
};

const parseNumber = (value: string): number | '' => {
  const cleaned = value.replace(/[^0-9.+-]/g, '');
  if (!cleaned) return '';
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : '';
};

// Styles for input cells (grey background)
const cellBorder = '1px solid var(--cui-border-color)';

const inputCellStyle: React.CSSProperties = {
  backgroundColor: 'var(--cui-card-bg)',
  border: cellBorder,
  padding: '4px 10px',
  textAlign: 'center',
  minWidth: '70px',
};

// Styles for calculated cells (white background)
const calcCellStyle: React.CSSProperties = {
  backgroundColor: 'var(--cui-card-bg)',
  border: cellBorder,
  padding: '4px 10px',
  textAlign: 'center',
  minWidth: '70px',
};

// Styles for header cells
const headerCellStyle: React.CSSProperties = {
  padding: '8px 10px',
  textAlign: 'center',
  fontWeight: 600,
  color: 'var(--cui-secondary-color)',
  fontSize: '0.75rem',
  backgroundColor: 'var(--cui-tertiary-bg)',
  borderBottom: cellBorder,
  borderTop: cellBorder,
  borderLeft: cellBorder,
  borderRight: cellBorder,
};

// Styles for row label cells
const labelCellStyle: React.CSSProperties = {
  padding: '4px 10px',
  textAlign: 'left',
  fontWeight: 500,
  color: 'var(--cui-body-color)',
  fontSize: '0.75rem',
  border: cellBorder,
};

const inputFieldStyle: React.CSSProperties = {
  backgroundColor: 'var(--cui-card-bg)',
  border: '1px solid var(--cui-border-color)',
  borderRadius: 8,
  padding: '8px 10px',
  textAlign: 'center',
  fontSize: '0.8rem',
  lineHeight: 1.2,
  width: '64px',
};

const tableWrapperStyle: React.CSSProperties = {
  border: '1px solid var(--cui-border-color)',
  borderRadius: 10,
  overflow: 'hidden',
  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.8rem',
  backgroundColor: 'var(--cui-card-bg)',
};

const headerRowStyle: React.CSSProperties = {
  backgroundColor: 'var(--cui-tertiary-bg)',
  height: '32px',
};

const bodyRowStyle: React.CSSProperties = {
  backgroundColor: 'var(--cui-card-bg)',
  height: '32px',
};

const formatWithSuffix = (value: number | '' | null | undefined, suffix: string) => {
  if (value === '' || value === null || value === undefined) return '';
  return `${value}${suffix}`;
};

export default function NapkinWaterfallForm({
  projectId,
  onSaved,
  waterfallType: controlledWaterfallType,
  onWaterfallTypeChange,
}: NapkinWaterfallFormProps) {
  // Waterfall type toggle - use controlled value if provided, otherwise internal state
  const [internalWaterfallType, setInternalWaterfallType] = useState<WaterfallType>('IRR');
  const waterfallType = controlledWaterfallType ?? internalWaterfallType;
  const setWaterfallType = onWaterfallTypeChange ?? setInternalWaterfallType;
  const [inputsOpen, setInputsOpen] = useState(true);

  const waterfallHeaderLabel =
    waterfallType === 'IRR' ? 'IRR Waterfall' :
    waterfallType === 'EM' ? 'Equity Multiple Waterfall' :
    'IRR + EM Waterfall';

  // Equity Contributions
  const [gpContributionPct, setGpContributionPct] = useState<number | ''>(10);

  // IRR Waterfall inputs
  const [prefRateIrr, setPrefRateIrr] = useState<number | ''>(8);
  const [hurdleIrr, setHurdleIrr] = useState<number | ''>(15);

  // EM Waterfall inputs
  const [prefRateEm, setPrefRateEm] = useState<number | ''>(1.0);
  const [hurdleEm, setHurdleEm] = useState<number | ''>(1.5);

  // Shared splits (used by both IRR and EM tables)
  const [prefLpPct, setPrefLpPct] = useState<number | ''>(90);
  const [promotePct, setPromotePct] = useState<number | ''>(20);
  const [promoteLpPct, setPromoteLpPct] = useState<number | ''>(72);
  const [residualLpPct, setResidualLpPct] = useState<number | ''>(45);

  // Total equity from cash flow
  const [totalEquityRequired, setTotalEquityRequired] = useState<number | null>(null);
  const [equityError, setEquityError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ status: 'idle' });

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setEquityError(null);

        // Load equity requirement and waterfall config in parallel
        const [equityRes, waterfallRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/cash-flow/summary`),
          fetch(`/api/projects/${projectId}/waterfall`),
        ]);

        // Process equity requirement
        if (equityRes.ok) {
          const equityJson = await equityRes.json();
          const equity =
            equityJson?.data?.summary?.peakEquity !== undefined
              ? Math.abs(Number(equityJson.data.summary.peakEquity))
              : null;

          if (!cancelled) {
            setTotalEquityRequired(
              typeof equity === 'number' && Number.isFinite(equity) ? equity : null
            );
          }
        }

        // Process waterfall config to populate form
        if (waterfallRes.ok && !cancelled) {
          const waterfallJson = await waterfallRes.json();
          const tiers = waterfallJson?.waterfallTiers || [];
          const partners = waterfallJson?.equityPartners || [];

          if (tiers.length > 0) {
            // Derive waterfallType from hurdleType
            const tier1 = tiers.find((t: any) => t.tierNumber === 1);
            const tier2 = tiers.find((t: any) => t.tierNumber === 2);
            const tier3 = tiers.find((t: any) => t.tierNumber === 3);

            const hurdleType = tier1?.hurdleType || 'irr';
            let derivedWaterfallType: WaterfallType = 'IRR';
            if (hurdleType === 'hybrid') {
              derivedWaterfallType = 'IRR_EM';
            } else if (hurdleType === 'equity_multiple') {
              derivedWaterfallType = 'EM';
            }
            setWaterfallType(derivedWaterfallType);

            // IRR thresholds
            if (tier1?.hurdleRate !== null && tier1?.hurdleRate !== undefined) {
              setPrefRateIrr(tier1.hurdleRate);
            }
            if (tier2?.hurdleRate !== null && tier2?.hurdleRate !== undefined) {
              setHurdleIrr(tier2.hurdleRate);
            }

            // EMx thresholds
            if (tier1?.equityMultipleThreshold !== null && tier1?.equityMultipleThreshold !== undefined) {
              setPrefRateEm(tier1.equityMultipleThreshold);
            }
            if (tier2?.equityMultipleThreshold !== null && tier2?.equityMultipleThreshold !== undefined) {
              setHurdleEm(tier2.equityMultipleThreshold);
            }

            // Split percentages
            if (tier1?.lpSplitPct !== undefined) setPrefLpPct(tier1.lpSplitPct);
            if (tier2?.lpSplitPct !== undefined) setPromoteLpPct(tier2.lpSplitPct);
            if (tier3?.lpSplitPct !== undefined) setResidualLpPct(tier3.lpSplitPct);
          }

          // GP contribution percentage from partners
          const gpPartner = partners.find((p: any) => p.partnerType === 'GP');
          if (gpPartner?.ownershipPct !== null && gpPartner?.ownershipPct !== undefined) {
            setGpContributionPct(gpPartner.ownershipPct);
          }

          // Promote percentage from GP partner
          if (gpPartner?.promotePct !== null && gpPartner?.promotePct !== undefined) {
            setPromotePct(gpPartner.promotePct);
          }
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Unable to load data.';
          setEquityError(message);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [projectId, setWaterfallType]);

  const effectiveTotalEquity = totalEquityRequired ?? 0;

  // Calculated values
  const {
    lpOwnershipPct,
    lpCapital,
    gpCapital,
    prefGpPct,
    promoteGpPct,
    residualGpPct,
  } = useMemo(() => {
    const gpPctNum = typeof gpContributionPct === 'number' ? gpContributionPct : 0;
    const gpOwnership = Math.min(Math.max(gpPctNum, 0), 100);
    const lpOwnership = 100 - gpOwnership;

    const lpCap = (lpOwnership / 100) * effectiveTotalEquity;
    const gpCap = (gpOwnership / 100) * effectiveTotalEquity;

    const prefLp = typeof prefLpPct === 'number' ? prefLpPct : 90;
    const promoteLp = typeof promoteLpPct === 'number' ? promoteLpPct : 72;
    const residualLp = typeof residualLpPct === 'number' ? residualLpPct : 45;

    return {
      lpOwnershipPct: lpOwnership,
      lpCapital: lpCap,
      gpCapital: gpCap,
      prefGpPct: 100 - prefLp,
      promoteGpPct: 100 - promoteLp,
      residualGpPct: 100 - residualLp,
    };
  }, [gpContributionPct, prefLpPct, promoteLpPct, residualLpPct, effectiveTotalEquity]);

  const handleSave = useCallback(async () => {
    if (typeof gpContributionPct !== 'number') {
      setSaveState({ status: 'error', message: 'GP Contribution % is required.' });
      return;
    }

    if (effectiveTotalEquity <= 0) {
      setSaveState({ status: 'error', message: 'Total equity must be greater than zero.' });
      return;
    }

    setSaveState({ status: 'saving' });

    try {
      // Map new structure to existing API format
      const prefRate = typeof prefRateIrr === 'number' ? prefRateIrr : 8;
      const hurdle = typeof hurdleIrr === 'number' ? hurdleIrr : 15;
      const promote = typeof promotePct === 'number' ? promotePct : 20;
      const residGpPct = typeof residualGpPct === 'number' ? residualGpPct : 55;

      const response = await fetch(
        `/api/projects/${projectId}/waterfall/napkin`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lpCapital,
            gpCapital,
            prefRate,
            promotePct: promote,
            hurdleIrr: hurdle,
            residualGpPct: residGpPct,
            // Additional fields for expanded structure
            waterfallType,
            prefLpPct: typeof prefLpPct === 'number' ? prefLpPct : 90,
            promoteLpPct: typeof promoteLpPct === 'number' ? promoteLpPct : 72,
            residualLpPct: typeof residualLpPct === 'number' ? residualLpPct : 45,
            // EM fields
            prefRateEm: typeof prefRateEm === 'number' ? prefRateEm : 1.0,
            hurdleEm: typeof hurdleEm === 'number' ? hurdleEm : 1.5,
          }),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed with status ${response.status}`);
      }

      const payload = await response.json();
      setSaveState({ status: 'idle' });
      onSaved?.(payload);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save waterfall.';
      setSaveState({ status: 'error', message });
    }
  }, [
    projectId,
    gpContributionPct,
    prefRateIrr,
    hurdleIrr,
    prefRateEm,
    hurdleEm,
    promotePct,
    prefLpPct,
    promoteLpPct,
    residualLpPct,
    residualGpPct,
    lpCapital,
    gpCapital,
    effectiveTotalEquity,
    waterfallType,
    onSaved,
  ]);

  const showIrrTable = waterfallType === 'IRR' || waterfallType === 'IRR_EM';
  const showEmTable = waterfallType === 'EM' || waterfallType === 'IRR_EM';

  // Auto-save when waterfall type changes (after initial load)
  const isInitialMount = React.useRef(true);
  const prevWaterfallType = React.useRef(waterfallType);

  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevWaterfallType.current = waterfallType;
      return;
    }

    // Skip if waterfall type hasn't actually changed
    if (prevWaterfallType.current === waterfallType) {
      return;
    }
    prevWaterfallType.current = waterfallType;

    // Auto-save the new waterfall type to database
    // This ensures EMx thresholds are saved when switching to EM mode
    if (effectiveTotalEquity > 0 && typeof gpContributionPct === 'number') {
      handleSave();
    }
  }, [waterfallType, effectiveTotalEquity, gpContributionPct, handleSave]);

  return (
    <CCard>
      <div className="card-header d-flex align-items-center gap-2">
        <h5 className="mb-0">Equity Waterfall</h5>
        <button
          type="button"
          className="btn btn-primary btn-sm ms-auto"
          onClick={handleSave}
          disabled={saveState.status === 'saving'}
        >
          {saveState.status === 'saving' ? 'Saving…' : 'Save Waterfall'}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => setInputsOpen(!inputsOpen)}
          aria-expanded={inputsOpen}
          aria-label="Toggle Waterfall Inputs"
        >
          {inputsOpen ? '▾' : '▸'}
        </button>
      </div>
      {inputsOpen && (
      <CCardBody className="pt-2">

        {saveState.status === 'error' && (
          <CAlert color="danger" className="mb-3">{saveState.message}</CAlert>
        )}
        {equityError && (
          <CAlert color="warning" className="mb-3">{equityError}</CAlert>
        )}

        {/* Equity Contributions Section */}
        <div className="mb-3">
          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
              <thead>
                <tr style={headerRowStyle}>
                  <th style={{ ...headerCellStyle, textAlign: 'left', minWidth: '160px' }}>Equity Contributions</th>
                  <th style={headerCellStyle}>GP</th>
                  <th style={headerCellStyle}>LP</th>
                  <th style={headerCellStyle}>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr style={bodyRowStyle}>
                  <td style={labelCellStyle}>Equity Contributions %</td>
                  <td style={inputCellStyle}>
                    <input
                      type="text"
                      value={formatWithSuffix(gpContributionPct, '%')}
                      onChange={(e) => setGpContributionPct(parseNumber(e.target.value))}
                      style={{ ...inputFieldStyle, width: '72px' }}
                    />
                  </td>
                  <td style={calcCellStyle}>{lpOwnershipPct}%</td>
                  <td style={calcCellStyle}>100%</td>
                </tr>
                <tr style={{ ...bodyRowStyle, borderBottom: 'none' }}>
                  <td style={labelCellStyle}>Equity Contributions $</td>
                  <td style={calcCellStyle}>{effectiveTotalEquity > 0 ? formatInt(gpCapital) : '—'}</td>
                  <td style={calcCellStyle}>{effectiveTotalEquity > 0 ? formatInt(lpCapital) : '—'}</td>
                  <td style={calcCellStyle}>{effectiveTotalEquity > 0 ? formatInt(effectiveTotalEquity) : '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Waterfall Type Toggle */}
        <div className="mb-4">
          <div className="d-flex align-items-center gap-2">
            <span style={{ fontWeight: 500, fontSize: '0.85rem', marginRight: '8px' }}>Waterfall Type</span>
            <div className="btn-group btn-group-sm" role="group">
              <button
                type="button"
                className={`btn ${waterfallType === 'IRR' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setWaterfallType('IRR')}
              >
                IRR
              </button>
              <button
                type="button"
                className={`btn ${waterfallType === 'EM' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setWaterfallType('EM')}
              >
                Equity Mult
              </button>
              <button
                type="button"
                className={`btn ${waterfallType === 'IRR_EM' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setWaterfallType('IRR_EM')}
              >
                IRR + EM
              </button>
            </div>
          </div>
        </div>

        {/* IRR Waterfall Table */}
        {showIrrTable && (
          <div className="mb-4">
            <div style={tableWrapperStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr style={headerRowStyle}>
                    <th style={{ ...headerCellStyle, textAlign: 'left', minWidth: '160px' }}>{waterfallHeaderLabel}</th>
                    <th style={headerCellStyle}>Rate</th>
                    <th style={headerCellStyle}>Promote</th>
                    <th style={headerCellStyle}>LP</th>
                    <th style={headerCellStyle}>GP</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Preferred + Capital Row */}
                  <tr style={bodyRowStyle}>
                    <td style={labelCellStyle}>Preferred + Capital</td>
                    <td style={inputCellStyle}>
                      <input
                        type="text"
                        value={formatWithSuffix(prefRateIrr, '%')}
                        onChange={(e) => setPrefRateIrr(parseNumber(e.target.value))}
                        style={{ ...inputFieldStyle, width: '64px' }}
                      />
                    </td>
                    <td style={calcCellStyle}>—</td>
                    <td style={inputCellStyle}>
                      <input
                        type="text"
                        value={formatWithSuffix(prefLpPct, '%')}
                        onChange={(e) => setPrefLpPct(parseNumber(e.target.value))}
                        style={{ ...inputFieldStyle, width: '64px' }}
                      />
                    </td>
                    <td style={calcCellStyle}>{prefGpPct}%</td>
                  </tr>
                  {/* Hurdle Row */}
                  <tr style={bodyRowStyle}>
                    <td style={labelCellStyle}>Hurdle 1</td>
                    <td style={inputCellStyle}>
                      <input
                        type="text"
                        value={formatWithSuffix(hurdleIrr, '%')}
                        onChange={(e) => setHurdleIrr(parseNumber(e.target.value))}
                        style={{ ...inputFieldStyle, width: '64px' }}
                      />
                    </td>
                    <td style={inputCellStyle}>
                      <input
                        type="text"
                        value={formatWithSuffix(promotePct, '%')}
                        onChange={(e) => setPromotePct(parseNumber(e.target.value))}
                        style={{ ...inputFieldStyle, width: '64px' }}
                      />
                    </td>
                    <td style={inputCellStyle}>
                      <input
                        type="text"
                        value={formatWithSuffix(promoteLpPct, '%')}
                        onChange={(e) => setPromoteLpPct(parseNumber(e.target.value))}
                        style={{ ...inputFieldStyle, width: '64px' }}
                      />
                    </td>
                    <td style={calcCellStyle}>{promoteGpPct}%</td>
                  </tr>
                  {/* Residual Row */}
                  <tr style={{ ...bodyRowStyle, borderBottom: 'none' }}>
                    <td style={labelCellStyle}>Residual</td>
                    <td style={calcCellStyle}>—</td>
                    <td style={calcCellStyle}>—</td>
                    <td style={inputCellStyle}>
                      <input
                        type="text"
                        value={formatWithSuffix(residualLpPct, '%')}
                        onChange={(e) => setResidualLpPct(parseNumber(e.target.value))}
                        style={{ ...inputFieldStyle, width: '64px' }}
                      />
                    </td>
                    <td style={calcCellStyle}>{residualGpPct}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* EM Waterfall Table */}
        {showEmTable && (
          <div className="mb-4">
            <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px', color: 'var(--cui-body-color)' }}>
              Equity Multiples
            </div>
            <div style={tableWrapperStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr style={headerRowStyle}>
                    <th style={{ ...headerCellStyle, textAlign: 'left', minWidth: '160px' }}>
                      {waterfallType === 'IRR_EM' ? 'IRR + EM Waterfall' : 'Equity Multiple Waterfall'}
                    </th>
                    <th style={headerCellStyle}>Rate</th>
                    <th style={headerCellStyle}>Promote</th>
                    <th style={headerCellStyle}>LP</th>
                    <th style={headerCellStyle}>GP</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Preferred + Capital Row */}
                  <tr style={bodyRowStyle}>
                    <td style={labelCellStyle}>Preferred + Capital</td>
                    <td style={inputCellStyle}>
                      <input
                        type="text"
                        value={
                          typeof prefRateEm === 'number'
                            ? formatWithSuffix(prefRateEm.toFixed(2), 'x')
                            : ''
                        }
                        onChange={(e) => setPrefRateEm(parseNumber(e.target.value))}
                        style={{ ...inputFieldStyle, width: '72px' }}
                      />
                    </td>
                    <td style={calcCellStyle}>—</td>
                    <td style={waterfallType === 'IRR_EM' ? calcCellStyle : inputCellStyle}>
                      {waterfallType === 'IRR_EM' ? (
                        <span>{typeof prefLpPct === 'number' ? prefLpPct : 90}%</span>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={formatWithSuffix(prefLpPct, '%')}
                            onChange={(e) => setPrefLpPct(parseNumber(e.target.value))}
                            style={{ ...inputFieldStyle, width: '64px' }}
                          />
                        </>
                      )}
                    </td>
                    <td style={calcCellStyle}>{prefGpPct}%</td>
                  </tr>
                  {/* Hurdle Row */}
                  <tr style={bodyRowStyle}>
                    <td style={labelCellStyle}>Hurdle 1</td>
                    <td style={inputCellStyle}>
                      <input
                        type="text"
                        value={
                          typeof hurdleEm === 'number'
                            ? formatWithSuffix(hurdleEm.toFixed(2), 'x')
                            : ''
                        }
                        onChange={(e) => setHurdleEm(parseNumber(e.target.value))}
                        style={{ ...inputFieldStyle, width: '72px' }}
                      />
                    </td>
                    <td style={inputCellStyle}>
                      <input
                        type="text"
                        value={formatWithSuffix(promotePct, '%')}
                        onChange={(e) => setPromotePct(parseNumber(e.target.value))}
                        style={{ ...inputFieldStyle, width: '64px' }}
                      />
                    </td>
                    <td style={inputCellStyle}>
                      <input
                        type="text"
                        value={formatWithSuffix(promoteLpPct, '%')}
                        onChange={(e) => setPromoteLpPct(parseNumber(e.target.value))}
                        style={{ ...inputFieldStyle, width: '64px' }}
                      />
                    </td>
                    <td style={calcCellStyle}>{promoteGpPct}%</td>
                  </tr>
                  {/* Residual Row */}
                  <tr style={{ ...bodyRowStyle, borderBottom: 'none' }}>
                    <td style={labelCellStyle}>Residual</td>
                    <td style={calcCellStyle}>—</td>
                    <td style={calcCellStyle}>—</td>
                    <td style={waterfallType === 'IRR_EM' ? calcCellStyle : inputCellStyle}>
                      {waterfallType === 'IRR_EM' ? (
                        <span>{typeof residualLpPct === 'number' ? residualLpPct : 45}%</span>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={formatWithSuffix(residualLpPct, '%')}
                            onChange={(e) => setResidualLpPct(parseNumber(e.target.value))}
                            style={{ ...inputFieldStyle, width: '64px' }}
                          />
                        </>
                      )}
                    </td>
                    <td style={calcCellStyle}>{residualGpPct}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CCardBody>
      )}
    </CCard>
  );
}
