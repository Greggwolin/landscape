'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CAlert, CCard, CCardBody } from '@coreui/react';

interface NapkinWaterfallFormProps {
  projectId: number;
  onSaved?: (data: unknown) => void;
}

type SaveState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

type WaterfallType = 'IRR' | 'EM' | 'IRR_EM';

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
const inputCellStyle: React.CSSProperties = {
  backgroundColor: '#f3f4f6',
  border: '1px solid #e5e7eb',
  padding: '4px 8px',
  textAlign: 'center',
  minWidth: '70px',
};

// Styles for calculated cells (white background)
const calcCellStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  padding: '4px 8px',
  textAlign: 'center',
  minWidth: '70px',
};

// Styles for header cells
const headerCellStyle: React.CSSProperties = {
  padding: '6px 8px',
  textAlign: 'center',
  fontWeight: 600,
  color: 'var(--cui-secondary-color)',
  fontSize: '0.75rem',
};

// Styles for row label cells
const labelCellStyle: React.CSSProperties = {
  padding: '6px 8px',
  textAlign: 'right',
  fontWeight: 500,
  color: 'var(--cui-body-color)',
  fontSize: '0.75rem',
};

export default function NapkinWaterfallForm({
  projectId,
  onSaved,
}: NapkinWaterfallFormProps) {
  // Waterfall type toggle
  const [waterfallType, setWaterfallType] = useState<WaterfallType>('IRR');

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

    async function loadEquity() {
      try {
        setEquityError(null);

        const res = await fetch(`/api/projects/${projectId}/cash-flow/summary`);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Failed to load equity requirement');
        }

        const json = await res.json();
        const equity =
          json?.data?.summary?.peakEquity !== undefined
            ? Math.abs(Number(json.data.summary.peakEquity))
            : null;

        if (!cancelled) {
          setTotalEquityRequired(
            typeof equity === 'number' && Number.isFinite(equity) ? equity : null
          );
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Unable to load equity requirement.';
          setEquityError(message);
        }
      }
    }

    loadEquity();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

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
      setSaveState({ status: 'success', message: 'Napkin waterfall saved.' });
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

  return (
    <CCard>
      <CCardBody>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">Napkin Mode Waterfall</h5>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={saveState.status === 'saving'}
          >
            {saveState.status === 'saving' ? 'Saving…' : 'Save Waterfall'}
          </button>
        </div>

        {saveState.status === 'error' && (
          <CAlert color="danger" className="mb-3">{saveState.message}</CAlert>
        )}
        {saveState.status === 'success' && (
          <CAlert color="success" className="mb-3">{saveState.message}</CAlert>
        )}
        {equityError && (
          <CAlert color="warning" className="mb-3">{equityError}</CAlert>
        )}

        {/* Equity Contributions Section */}
        <div className="mb-4">
          <table style={{ borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr>
                <th style={{ ...headerCellStyle, textAlign: 'right', minWidth: '160px' }}>Equity Contributions</th>
                <th style={headerCellStyle}>GP</th>
                <th style={headerCellStyle}>LP</th>
                <th style={headerCellStyle}>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={labelCellStyle}>Equity Contributions %</td>
                <td style={inputCellStyle}>
                  <input
                    type="text"
                    value={typeof gpContributionPct === 'number' ? gpContributionPct.toString() : ''}
                    onChange={(e) => setGpContributionPct(parseNumber(e.target.value))}
                    style={{
                      width: '50px',
                      textAlign: 'center',
                      border: 'none',
                      background: 'transparent',
                      fontSize: '0.8rem',
                    }}
                  />
                  <span>%</span>
                </td>
                <td style={calcCellStyle}>{lpOwnershipPct}%</td>
                <td style={calcCellStyle}>100%</td>
              </tr>
              <tr>
                <td style={labelCellStyle}>Equity Contributions $</td>
                <td style={calcCellStyle}>{effectiveTotalEquity > 0 ? formatInt(gpCapital) : '—'}</td>
                <td style={calcCellStyle}>{effectiveTotalEquity > 0 ? formatInt(lpCapital) : '—'}</td>
                <td style={calcCellStyle}>{effectiveTotalEquity > 0 ? formatInt(effectiveTotalEquity) : '—'}</td>
              </tr>
            </tbody>
          </table>
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
            <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px', color: 'var(--cui-body-color)' }}>
              IRR Waterfall
            </div>
            <table style={{ borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th style={{ ...headerCellStyle, textAlign: 'right', minWidth: '160px' }}></th>
                  <th style={headerCellStyle}>Rate</th>
                  <th style={headerCellStyle}>Promote</th>
                  <th style={headerCellStyle}>LP</th>
                  <th style={headerCellStyle}>GP</th>
                </tr>
              </thead>
              <tbody>
                {/* Preferred + Capital Row */}
                <tr>
                  <td style={labelCellStyle}>Preferred + Capital</td>
                  <td style={inputCellStyle}>
                    <input
                      type="text"
                      value={typeof prefRateIrr === 'number' ? prefRateIrr.toString() : ''}
                      onChange={(e) => setPrefRateIrr(parseNumber(e.target.value))}
                      style={{
                        width: '40px',
                        textAlign: 'center',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '0.8rem',
                      }}
                    />
                    <span>%</span>
                  </td>
                  <td style={calcCellStyle}>—</td>
                  <td style={inputCellStyle}>
                    <input
                      type="text"
                      value={typeof prefLpPct === 'number' ? prefLpPct.toString() : ''}
                      onChange={(e) => setPrefLpPct(parseNumber(e.target.value))}
                      style={{
                        width: '40px',
                        textAlign: 'center',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '0.8rem',
                      }}
                    />
                    <span>%</span>
                  </td>
                  <td style={calcCellStyle}>{prefGpPct}%</td>
                </tr>
                {/* Hurdle Row */}
                <tr>
                  <td style={labelCellStyle}>Hurdle 1</td>
                  <td style={inputCellStyle}>
                    <input
                      type="text"
                      value={typeof hurdleIrr === 'number' ? hurdleIrr.toString() : ''}
                      onChange={(e) => setHurdleIrr(parseNumber(e.target.value))}
                      style={{
                        width: '40px',
                        textAlign: 'center',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '0.8rem',
                      }}
                    />
                    <span>%</span>
                  </td>
                  <td style={inputCellStyle}>
                    <input
                      type="text"
                      value={typeof promotePct === 'number' ? promotePct.toString() : ''}
                      onChange={(e) => setPromotePct(parseNumber(e.target.value))}
                      style={{
                        width: '40px',
                        textAlign: 'center',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '0.8rem',
                      }}
                    />
                    <span>%</span>
                  </td>
                  <td style={inputCellStyle}>
                    <input
                      type="text"
                      value={typeof promoteLpPct === 'number' ? promoteLpPct.toString() : ''}
                      onChange={(e) => setPromoteLpPct(parseNumber(e.target.value))}
                      style={{
                        width: '40px',
                        textAlign: 'center',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '0.8rem',
                      }}
                    />
                    <span>%</span>
                  </td>
                  <td style={calcCellStyle}>{promoteGpPct}%</td>
                </tr>
                {/* Residual Row */}
                <tr>
                  <td style={labelCellStyle}>Residual</td>
                  <td style={calcCellStyle}>—</td>
                  <td style={calcCellStyle}>—</td>
                  <td style={inputCellStyle}>
                    <input
                      type="text"
                      value={typeof residualLpPct === 'number' ? residualLpPct.toString() : ''}
                      onChange={(e) => setResidualLpPct(parseNumber(e.target.value))}
                      style={{
                        width: '40px',
                        textAlign: 'center',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '0.8rem',
                      }}
                    />
                    <span>%</span>
                  </td>
                  <td style={calcCellStyle}>{residualGpPct}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* EM Waterfall Table */}
        {showEmTable && (
          <div className="mb-4">
            <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px', color: 'var(--cui-body-color)' }}>
              Equity Multiples
            </div>
            <table style={{ borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th style={{ ...headerCellStyle, textAlign: 'right', minWidth: '160px' }}></th>
                  <th style={headerCellStyle}>Rate</th>
                  <th style={headerCellStyle}>Promote</th>
                  <th style={headerCellStyle}>LP</th>
                  <th style={headerCellStyle}>GP</th>
                </tr>
              </thead>
              <tbody>
                {/* Preferred + Capital Row */}
                <tr>
                  <td style={labelCellStyle}>Preferred + Capital</td>
                  <td style={inputCellStyle}>
                    <input
                      type="text"
                      value={typeof prefRateEm === 'number' ? prefRateEm.toFixed(2) : ''}
                      onChange={(e) => setPrefRateEm(parseNumber(e.target.value))}
                      style={{
                        width: '50px',
                        textAlign: 'center',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '0.8rem',
                      }}
                    />
                    <span>x</span>
                  </td>
                  <td style={calcCellStyle}>—</td>
                  <td style={waterfallType === 'IRR_EM' ? calcCellStyle : inputCellStyle}>
                    {waterfallType === 'IRR_EM' ? (
                      <span>{typeof prefLpPct === 'number' ? prefLpPct : 90}%</span>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={typeof prefLpPct === 'number' ? prefLpPct.toString() : ''}
                          onChange={(e) => setPrefLpPct(parseNumber(e.target.value))}
                          style={{
                            width: '40px',
                            textAlign: 'center',
                            border: 'none',
                            background: 'transparent',
                            fontSize: '0.8rem',
                          }}
                        />
                        <span>%</span>
                      </>
                    )}
                  </td>
                  <td style={calcCellStyle}>{prefGpPct}%</td>
                </tr>
                {/* Hurdle Row */}
                <tr>
                  <td style={labelCellStyle}>Hurdle 1</td>
                  <td style={inputCellStyle}>
                    <input
                      type="text"
                      value={typeof hurdleEm === 'number' ? hurdleEm.toFixed(2) : ''}
                      onChange={(e) => setHurdleEm(parseNumber(e.target.value))}
                      style={{
                        width: '50px',
                        textAlign: 'center',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '0.8rem',
                      }}
                    />
                    <span>x</span>
                  </td>
                  <td style={waterfallType === 'IRR_EM' ? calcCellStyle : inputCellStyle}>
                    {waterfallType === 'IRR_EM' ? (
                      <span>{typeof promotePct === 'number' ? promotePct : 20}%</span>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={typeof promotePct === 'number' ? promotePct.toString() : ''}
                          onChange={(e) => setPromotePct(parseNumber(e.target.value))}
                          style={{
                            width: '40px',
                            textAlign: 'center',
                            border: 'none',
                            background: 'transparent',
                            fontSize: '0.8rem',
                          }}
                        />
                        <span>%</span>
                      </>
                    )}
                  </td>
                  <td style={waterfallType === 'IRR_EM' ? calcCellStyle : inputCellStyle}>
                    {waterfallType === 'IRR_EM' ? (
                      <span>{typeof promoteLpPct === 'number' ? promoteLpPct : 72}%</span>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={typeof promoteLpPct === 'number' ? promoteLpPct.toString() : ''}
                          onChange={(e) => setPromoteLpPct(parseNumber(e.target.value))}
                          style={{
                            width: '40px',
                            textAlign: 'center',
                            border: 'none',
                            background: 'transparent',
                            fontSize: '0.8rem',
                          }}
                        />
                        <span>%</span>
                      </>
                    )}
                  </td>
                  <td style={calcCellStyle}>{promoteGpPct}%</td>
                </tr>
                {/* Residual Row */}
                <tr>
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
                          value={typeof residualLpPct === 'number' ? residualLpPct.toString() : ''}
                          onChange={(e) => setResidualLpPct(parseNumber(e.target.value))}
                          style={{
                            width: '40px',
                            textAlign: 'center',
                            border: 'none',
                            background: 'transparent',
                            fontSize: '0.8rem',
                          }}
                        />
                        <span>%</span>
                      </>
                    )}
                  </td>
                  <td style={calcCellStyle}>{residualGpPct}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </CCardBody>
    </CCard>
  );
}
