'use client';

import { useState } from 'react';
import {
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CCard,
  CCardBody,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
} from '@coreui/react';

interface ShadowDelta {
  metric: string;
  baseline: number | string;
  current: number | string;
  delta: number | string;
}

export interface ScenarioStep {
  index: number;
  label: string;
  assumption_key: string;
  original_value: number | string;
  override_value: number | string;
  unit: string;
  deltas: Record<string, number>;
}

interface ICResultsTabsProps {
  projectId: number;
  shadowDeltas?: ShadowDelta[];
  scenarioSteps?: ScenarioStep[];
  baselineMetrics?: Record<string, number | string>;
  currentMetrics?: Record<string, number | string>;
}

const METRIC_LABELS: Record<string, string> = {
  irr: 'IRR',
  equity_multiple: 'Equity Multiple',
  total_profit: 'Total Profit',
  total_revenue: 'Total Revenue',
  total_cost: 'Total Cost',
  noi: 'NOI',
  cap_rate: 'Cap Rate',
  cash_on_cash: 'Cash-on-Cash Return',
  dscr: 'DSCR',
  npv: 'NPV',
};

function formatValue(val: number | string | undefined, metric?: string): string {
  if (val === undefined || val === null) return '-';
  if (typeof val === 'string') return val;
  if (metric && (metric.includes('pct') || metric.includes('rate') || metric === 'irr' || metric === 'cap_rate' || metric === 'cash_on_cash')) {
    return `${(val * (val < 1 ? 100 : 1)).toFixed(2)}%`;
  }
  if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (Math.abs(val) >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
  return val.toFixed(2);
}

function formatDelta(val: number | string | undefined): string {
  if (val === undefined || val === null) return '-';
  if (typeof val === 'string') return val;
  const sign = val > 0 ? '+' : '';
  if (Math.abs(val) >= 1_000_000) return `${sign}$${(val / 1_000_000).toFixed(2)}M`;
  if (Math.abs(val) >= 1_000) return `${sign}$${(val / 1_000).toFixed(1)}K`;
  return `${sign}${val.toFixed(2)}`;
}

export function ICResultsTabs({
  shadowDeltas = [],
  scenarioSteps = [],
  baselineMetrics = {},
  currentMetrics = {},
}: ICResultsTabsProps) {
  const [activeTab, setActiveTab] = useState<'cashflow' | 'returns' | 'sensitivity' | 'compare'>('returns');

  return (
    <div>
      <CNav variant="pills" className="mb-3">
        {(['cashflow', 'returns', 'sensitivity', 'compare'] as const).map((tab) => (
          <CNavItem key={tab}>
            <CNavLink
              active={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              style={{ cursor: 'pointer', fontSize: '0.85rem' }}
            >
              {tab === 'cashflow' ? 'Cash Flow' : tab === 'returns' ? 'Returns' : tab === 'sensitivity' ? 'Sensitivity' : 'Compare'}
            </CNavLink>
          </CNavItem>
        ))}
      </CNav>

      <CTabContent>
        {/* Cash Flow Tab */}
        <CTabPane visible={activeTab === 'cashflow'}>
          <CCard>
            <CCardBody>
              <div className="text-body-secondary mb-3" style={{ fontSize: '0.85rem' }}>
                Cash flow projections update in real time as scenarios are tested.
              </div>
              {Object.keys(baselineMetrics).length > 0 ? (
                <CTable small bordered>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Metric</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Baseline</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Current Shadow</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Delta</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {Object.entries(baselineMetrics).map(([key, baseline]) => {
                      const current = currentMetrics[key];
                      const delta = typeof baseline === 'number' && typeof current === 'number'
                        ? current - baseline : undefined;
                      return (
                        <CTableRow key={key}>
                          <CTableDataCell>{METRIC_LABELS[key] || key}</CTableDataCell>
                          <CTableDataCell className="text-end">{formatValue(baseline, key)}</CTableDataCell>
                          <CTableDataCell className="text-end">{formatValue(current, key)}</CTableDataCell>
                          <CTableDataCell
                            className="text-end"
                            style={{ color: delta && delta > 0 ? '#22c55e' : delta && delta < 0 ? '#ef4444' : undefined }}
                          >
                            {formatDelta(delta)}
                          </CTableDataCell>
                        </CTableRow>
                      );
                    })}
                  </CTableBody>
                </CTable>
              ) : (
                <div className="text-body-secondary py-4 text-center">
                  Start an IC session to see cash flow projections here.
                </div>
              )}
            </CCardBody>
          </CCard>
        </CTabPane>

        {/* Returns Tab */}
        <CTabPane visible={activeTab === 'returns'}>
          <CCard>
            <CCardBody>
              <div className="text-body-secondary mb-3" style={{ fontSize: '0.85rem' }}>
                Key return metrics — Baseline vs Current Shadow
              </div>
              {shadowDeltas.length > 0 ? (
                <CTable small bordered>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Metric</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Baseline</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Current</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Delta</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {shadowDeltas.map((d, i) => (
                      <CTableRow key={i}>
                        <CTableDataCell>{METRIC_LABELS[d.metric] || d.metric}</CTableDataCell>
                        <CTableDataCell className="text-end">{formatValue(d.baseline)}</CTableDataCell>
                        <CTableDataCell className="text-end">{formatValue(d.current)}</CTableDataCell>
                        <CTableDataCell
                          className="text-end fw-medium"
                          style={{
                            color: typeof d.delta === 'number'
                              ? d.delta > 0 ? '#22c55e' : d.delta < 0 ? '#ef4444' : undefined
                              : undefined,
                          }}
                        >
                          {formatDelta(d.delta)}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              ) : (
                <div className="text-body-secondary py-4 text-center">
                  Challenge assumptions in the chat to see return impacts here.
                </div>
              )}
            </CCardBody>
          </CCard>
        </CTabPane>

        {/* Sensitivity Tab */}
        <CTabPane visible={activeTab === 'sensitivity'}>
          <CCard>
            <CCardBody>
              <div className="text-body-secondary mb-3" style={{ fontSize: '0.85rem' }}>
                Sensitivity matrix — assumptions tested vs KPI impacts
              </div>
              {scenarioSteps.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <CTable small bordered>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>Assumption Changed</CTableHeaderCell>
                        <CTableHeaderCell className="text-center">Change</CTableHeaderCell>
                        {Object.keys(scenarioSteps[0]?.deltas || {}).map((metric) => (
                          <CTableHeaderCell key={metric} className="text-end">
                            {METRIC_LABELS[metric] || metric}
                          </CTableHeaderCell>
                        ))}
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {scenarioSteps.map((step, i) => (
                        <CTableRow key={i}>
                          <CTableDataCell>{step.label}</CTableDataCell>
                          <CTableDataCell className="text-center" style={{ fontSize: '0.8rem' }}>
                            {step.original_value} {'\u2192'} {step.override_value} {step.unit}
                          </CTableDataCell>
                          {Object.entries(step.deltas).map(([metric, delta]) => (
                            <CTableDataCell
                              key={metric}
                              className="text-end"
                              style={{
                                color: delta > 0 ? '#22c55e' : delta < 0 ? '#ef4444' : undefined,
                                fontSize: '0.85rem',
                              }}
                            >
                              {formatDelta(delta)}
                            </CTableDataCell>
                          ))}
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                </div>
              ) : (
                <div className="text-body-secondary py-4 text-center">
                  Test multiple assumptions to build a sensitivity matrix.
                </div>
              )}
            </CCardBody>
          </CCard>
        </CTabPane>

        {/* Scenario Compare Tab */}
        <CTabPane visible={activeTab === 'compare'}>
          <CCard>
            <CCardBody>
              <div className="text-body-secondary mb-3" style={{ fontSize: '0.85rem' }}>
                Compare saved scenarios from this IC session side-by-side.
              </div>
              <div className="text-body-secondary py-4 text-center">
                Save scenarios during the IC review to compare them here.
              </div>
            </CCardBody>
          </CCard>
        </CTabPane>
      </CTabContent>
    </div>
  );
}
