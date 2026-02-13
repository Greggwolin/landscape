'use client';

import {
  CCard,
  CCardBody,
  CCardHeader,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CBadge,
  CSpinner,
} from '@coreui/react';
import { useCallback, useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

interface ComparisonData {
  baseline: Record<string, any>;
  [scenarioName: string]: any;
  delta_a_vs_b: Record<string, any>;
}

interface ScenarioCompareViewProps {
  projectId: number | string;
  scenarioIdA: number;
  scenarioIdB: number;
  onClose?: () => void;
}

const METRIC_LABELS: Record<string, string> = {
  irr: 'IRR',
  npv: 'NPV',
  equity_multiple: 'Equity Multiple',
  cash_on_cash: 'Cash on Cash',
  dscr: 'DSCR',
  cap_rate: 'Cap Rate',
  noi: 'NOI',
  total_revenue: 'Total Revenue',
  total_cost: 'Total Cost',
  profit: 'Profit',
  yield_on_cost: 'Yield on Cost',
  going_in_cap_rate: 'Going-In Cap',
  exit_cap_rate: 'Exit Cap',
};

function formatMetricValue(key: string, value: any): string {
  if (value == null) return '—';
  if (typeof value !== 'number') return String(value);

  const pctKeys = ['irr', 'cap_rate', 'cash_on_cash', 'yield_on_cost', 'going_in_cap_rate', 'exit_cap_rate'];
  if (pctKeys.includes(key)) return `${(value * 100).toFixed(2)}%`;

  const ratioKeys = ['equity_multiple', 'dscr'];
  if (ratioKeys.includes(key)) return value.toFixed(2) + 'x';

  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;

  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDelta(key: string, value: any): { text: string; color: string } {
  if (value == null || value === 0) return { text: '—', color: '' };
  if (typeof value !== 'number') return { text: String(value), color: '' };

  const sign = value > 0 ? '+' : '';

  const pctKeys = ['irr', 'cap_rate', 'cash_on_cash', 'yield_on_cost', 'going_in_cap_rate', 'exit_cap_rate'];
  let text: string;
  if (pctKeys.includes(key)) {
    text = `${sign}${(value * 100).toFixed(2)}%`;
  } else if (Math.abs(value) >= 1_000_000) {
    text = `${sign}$${(value / 1_000_000).toFixed(2)}M`;
  } else if (Math.abs(value) >= 1_000) {
    text = `${sign}$${(value / 1_000).toFixed(1)}K`;
  } else {
    text = `${sign}${value.toFixed(2)}`;
  }

  // Positive IRR/NPV is good, negative is bad
  const goodMetrics = ['irr', 'npv', 'noi', 'total_revenue', 'profit', 'equity_multiple', 'cash_on_cash', 'dscr'];
  const color = goodMetrics.includes(key)
    ? (value > 0 ? 'text-success' : 'text-danger')
    : (value < 0 ? 'text-success' : 'text-danger');

  return { text, color };
}

export function ScenarioCompareView({
  projectId,
  scenarioIdA,
  scenarioIdB,
  onClose,
}: ScenarioCompareViewProps) {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nameA, setNameA] = useState('Scenario A');
  const [nameB, setNameB] = useState('Scenario B');

  const fetchComparison = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Use the Django API through the scenario_compare tool endpoint
      // For the frontend, we call the REST API that wraps the tool
      const res = await fetch(
        `${API_BASE}/api/landscaper/projects/${projectId}/scenarios/${scenarioIdA}/`,
      );
      const scenA = await res.json();

      const res2 = await fetch(
        `${API_BASE}/api/landscaper/projects/${projectId}/scenarios/${scenarioIdB}/`,
      );
      const scenB = await res2.json();

      if (!scenA.success || !scenB.success) {
        setError('Failed to load one or both scenarios');
        return;
      }

      setNameA(scenA.scenario?.scenario_name || `Scenario ${scenarioIdA}`);
      setNameB(scenB.scenario?.scenario_name || `Scenario ${scenarioIdB}`);

      // For now, show the raw metrics from each scenario
      const metricsA = scenA.scenario?.scenario_data?.computed_results?.metrics || {};
      const metricsB = scenB.scenario?.scenario_data?.computed_results?.metrics || {};
      const baseline = scenA.scenario?.scenario_data?.baseline_snapshot?.metrics || {};

      // Compute deltas
      const deltaAvB: Record<string, any> = {};
      for (const key of Object.keys({ ...metricsA, ...metricsB })) {
        const valA = typeof metricsA[key] === 'number' ? metricsA[key] : null;
        const valB = typeof metricsB[key] === 'number' ? metricsB[key] : null;
        if (valA != null && valB != null) {
          deltaAvB[key] = valB - valA;
        }
      }

      setData({
        baseline,
        [scenA.scenario?.scenario_name || 'A']: { metrics: metricsA },
        [scenB.scenario?.scenario_name || 'B']: { metrics: metricsB },
        delta_a_vs_b: deltaAvB,
      });
    } catch (err: any) {
      setError(err?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [projectId, scenarioIdA, scenarioIdB]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  if (loading) {
    return (
      <div className="text-center py-4">
        <CSpinner color="primary" />
        <p className="mt-2 text-body-secondary">Loading comparison...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  if (!data) return null;

  // Collect all metric keys across baseline, A, B
  const allKeys = new Set<string>();
  for (const key of Object.keys(data.baseline || {})) allKeys.add(key);
  for (const key of Object.keys(data[nameA]?.metrics || {})) allKeys.add(key);
  for (const key of Object.keys(data[nameB]?.metrics || {})) allKeys.add(key);

  const metricKeys = Array.from(allKeys).filter(
    (k) => typeof (data.baseline?.[k] ?? data[nameA]?.metrics?.[k] ?? data[nameB]?.metrics?.[k]) === 'number',
  );

  return (
    <CCard>
      <CCardHeader className="d-flex align-items-center justify-content-between">
        <strong>Scenario Comparison</strong>
        {onClose && (
          <button className="btn btn-sm btn-close" onClick={onClose} aria-label="Close" />
        )}
      </CCardHeader>
      <CCardBody className="p-0">
        <CTable bordered hover responsive className="mb-0">
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell>Metric</CTableHeaderCell>
              <CTableHeaderCell className="text-center">Baseline</CTableHeaderCell>
              <CTableHeaderCell className="text-center">
                <CBadge color="info" className="me-1">A</CBadge>
                {nameA}
              </CTableHeaderCell>
              <CTableHeaderCell className="text-center">
                <CBadge color="warning" className="me-1">B</CBadge>
                {nameB}
              </CTableHeaderCell>
              <CTableHeaderCell className="text-center">A vs B</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {metricKeys.map((key) => {
              const delta = formatDelta(key, data.delta_a_vs_b?.[key]);
              return (
                <CTableRow key={key}>
                  <CTableDataCell className="fw-medium">
                    {METRIC_LABELS[key] || key}
                  </CTableDataCell>
                  <CTableDataCell className="text-center text-body-secondary">
                    {formatMetricValue(key, data.baseline?.[key])}
                  </CTableDataCell>
                  <CTableDataCell className="text-center">
                    {formatMetricValue(key, data[nameA]?.metrics?.[key])}
                  </CTableDataCell>
                  <CTableDataCell className="text-center">
                    {formatMetricValue(key, data[nameB]?.metrics?.[key])}
                  </CTableDataCell>
                  <CTableDataCell className={`text-center ${delta.color}`}>
                    {delta.text}
                  </CTableDataCell>
                </CTableRow>
              );
            })}
          </CTableBody>
        </CTable>
      </CCardBody>
    </CCard>
  );
}
