'use client';

// ============================================================================
// TAB 7: SENSITIVITY ANALYSIS (COMPUTED)
// ============================================================================
// Purpose: Display tornado charts, top assumptions, scenarios
// API: POST /api/cre/properties/:id/sensitivity-analysis
// ============================================================================

import { useState, useEffect } from 'react';
import { SensitivityResult, SensitivitySummary, AnalysisViewSettings, CalculationStatus } from '../types/analysis.types';

interface SensitivityTabProps {
  propertyId: number;
  viewSettings: AnalysisViewSettings;
  calculationStatus: CalculationStatus;
  onPrev: () => void;
}

export function SensitivityTab({
  propertyId,
  viewSettings,
  calculationStatus,
  onPrev,
}: SensitivityTabProps) {
  const [results, setResults] = useState<SensitivityResult[]>([]);
  const [summary, setSummary] = useState<SensitivitySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!calculationStatus.last_calculated) {
      return;
    }

    const fetchSensitivity = async () => {
      try {
        setLoading(true);
        // TODO: Replace with actual API call
        // const response = await fetch(`/api/cre/properties/${propertyId}/sensitivity-analysis`, {
        //   method: 'POST',
        // });
        // const data = await response.json();

        const mockResults: SensitivityResult[] = [
          {
            assumption_name: 'exit_cap_rate',
            assumption_display: 'Exit Cap Rate',
            baseline_value: 6.75,
            baseline_irr: 14.23,
            minus_20_value: 5.40,
            minus_20_irr: 18.45,
            minus_20_impact_bps: 422,
            minus_10_value: 6.08,
            minus_10_irr: 16.12,
            minus_10_impact_bps: 189,
            plus_10_value: 7.43,
            plus_10_irr: 12.58,
            plus_10_impact_bps: -165,
            plus_20_value: 8.10,
            plus_20_irr: 11.12,
            plus_20_impact_bps: -311,
            max_impact_bps: 422,
            criticality: 'CRITICAL',
            rank: 1,
          },
          {
            assumption_name: 'market_rent_psf',
            assumption_display: 'Market Rent ($/SF)',
            baseline_value: 45.0,
            baseline_irr: 14.23,
            minus_20_value: 36.0,
            minus_20_irr: 10.85,
            minus_20_impact_bps: -338,
            minus_10_value: 40.5,
            minus_10_irr: 12.45,
            minus_10_impact_bps: -178,
            plus_10_value: 49.5,
            plus_10_irr: 15.92,
            plus_10_impact_bps: 169,
            plus_20_value: 54.0,
            plus_20_irr: 17.58,
            plus_20_impact_bps: 335,
            max_impact_bps: 338,
            criticality: 'CRITICAL',
            rank: 2,
          },
          {
            assumption_name: 'vacancy_pct',
            assumption_display: 'Vacancy %',
            baseline_value: 5.0,
            baseline_irr: 14.23,
            minus_20_value: 4.0,
            minus_20_irr: 15.12,
            minus_20_impact_bps: 89,
            minus_10_value: 4.5,
            minus_10_irr: 14.68,
            minus_10_impact_bps: 45,
            plus_10_value: 5.5,
            plus_10_irr: 13.78,
            plus_10_impact_bps: -45,
            plus_20_value: 6.0,
            plus_20_irr: 13.32,
            plus_20_impact_bps: -91,
            max_impact_bps: 91,
            criticality: 'MEDIUM',
            rank: 3,
          },
        ];

        const mockSummary: SensitivitySummary = {
          total_assumptions_tested: 15,
          critical_count: 2,
          high_count: 4,
          medium_count: 6,
          low_count: 3,
          top_5_assumptions: [
            'Exit Cap Rate',
            'Market Rent ($/SF)',
            'Rent Escalation %',
            'Operating Expense Growth',
            'Vacancy %',
          ],
        };

        setResults(mockResults);
        setSummary(mockSummary);
        setError(null);
      } catch (err) {
        console.error('Failed to load sensitivity analysis:', err);
        setError('Failed to load sensitivity analysis');
      } finally {
        setLoading(false);
      }
    };

    fetchSensitivity();
  }, [propertyId, calculationStatus.last_calculated]);

  const getCriticalityColor = (criticality: string): string => {
    switch (criticality) {
      case 'CRITICAL':
        return 'bg-red-800 text-red-100 border-red-300';
      case 'HIGH':
        return 'bg-orange-800 text-orange-100 border-orange-300';
      case 'MEDIUM':
        return 'bg-amber-700 text-white border-yellow-300';
      case 'LOW':
        return 'bg-emerald-800 text-white border-green-300';
      default:
        return 'bg-gray-800 text-gray-200 border-gray-700';
    }
  };

  const formatBps = (bps: number): string => {
    return `${bps > 0 ? '+' : ''}${bps} bps`;
  };

  if (!calculationStatus.last_calculated) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎯</div>
        <h3 className="text-xl font-semibold text-white mb-2">Sensitivity Analysis Not Run</h3>
        <p className="text-gray-400 mb-4">Run calculations to see which assumptions matter most.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;
  }

  if (error) {
    return <div className="p-4 bg-red-800 border border-red-600 rounded text-white">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Sensitivity Analysis</h2>
          <p className="text-sm text-gray-400 mt-1">Test assumptions to identify key drivers of IRR</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onPrev} className="px-4 py-2 text-sm border border-gray-700 rounded hover:bg-gray-800">
            ← Previous
          </button>
          <button className="px-4 py-2 text-sm border border-gray-700 rounded hover:bg-gray-800">
            Export Report
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-5 gap-4">
          <div className="p-4 bg-gray-800 border border-gray-800 rounded">
            <div className="text-sm text-gray-400">Total Tested</div>
            <div className="text-2xl font-semibold text-white mt-1">{summary.total_assumptions_tested}</div>
          </div>
          <div className="p-4 bg-red-800 border border-red-600 rounded">
            <div className="text-sm text-gray-400">Critical</div>
            <div className="text-2xl font-semibold text-white mt-1">{summary.critical_count}</div>
            <div className="text-xs text-gray-500 mt-1">≥500 bps impact</div>
          </div>
          <div className="p-4 bg-orange-800 border border-orange-600 rounded">
            <div className="text-sm text-gray-400">High</div>
            <div className="text-2xl font-semibold text-orange-100 mt-1">{summary.high_count}</div>
            <div className="text-xs text-gray-500 mt-1">200-500 bps</div>
          </div>
          <div className="p-4 bg-amber-700 border border-amber-600 rounded">
            <div className="text-sm text-gray-400">Medium</div>
            <div className="text-2xl font-semibold text-white mt-1">{summary.medium_count}</div>
            <div className="text-xs text-gray-500 mt-1">50-200 bps</div>
          </div>
          <div className="p-4 bg-emerald-800 border border-emerald-600 rounded">
            <div className="text-sm text-gray-400">Low</div>
            <div className="text-2xl font-semibold text-white mt-1">{summary.low_count}</div>
            <div className="text-xs text-gray-500 mt-1">&lt;50 bps</div>
          </div>
        </div>
      )}

      {/* Top 5 Critical Assumptions */}
      <div className="p-6 bg-red-900 border-2 border-red-700 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-3">🔥 Focus Here: Top Assumptions by IRR Impact</h3>
        <p className="text-sm text-red-200 mb-4">
          These assumptions have the biggest impact on returns. Get these right first.
        </p>
        <div className="grid grid-cols-5 gap-3">
          {summary?.top_5_assumptions.map((assumption, index) => (
            <div key={index} className="p-3 bg-gray-900 border border-red-600 rounded text-center">
              <div className="text-2xl font-bold text-red-100 mb-1">{index + 1}</div>
              <div className="text-xs text-gray-400 font-medium">{assumption}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sensitivity Table */}
      <div>
        <h3 className="text-lg font-medium text-white mb-3">Detailed Sensitivity Results</h3>
        <div className="border border-gray-800 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Assumption</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Baseline</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase bg-red-900">-20%</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase bg-red-900">-10%</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase bg-emerald-900">+10%</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase bg-emerald-900">+20%</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Max Impact</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Criticality</th>
              </tr>
            </thead>
            <tbody className="bg-gray-900 divide-y divide-gray-200">
              {results.map((result) => (
                <tr key={result.assumption_name} className="hover:bg-gray-800">
                  <td className="px-4 py-3 text-center font-bold text-white">{result.rank}</td>
                  <td className="px-4 py-3 font-medium text-white">{result.assumption_display}</td>
                  <td className="px-4 py-3 text-center text-white">
                    <div>{result.baseline_value}</div>
                    <div className="text-xs text-blue-600">{result.baseline_irr.toFixed(2)}% IRR</div>
                  </td>
                  <td className="px-4 py-3 text-center bg-red-900">
                    <div className="text-sm">{result.minus_20_irr.toFixed(2)}%</div>
                    <div className={`text-xs font-medium ${result.minus_20_impact_bps > 0 ? 'text-green-600' : 'text-red-100'}`}>
                      {formatBps(result.minus_20_impact_bps)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center bg-red-900">
                    <div className="text-sm">{result.minus_10_irr.toFixed(2)}%</div>
                    <div className={`text-xs font-medium ${result.minus_10_impact_bps > 0 ? 'text-green-600' : 'text-red-100'}`}>
                      {formatBps(result.minus_10_impact_bps)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center bg-emerald-900">
                    <div className="text-sm">{result.plus_10_irr.toFixed(2)}%</div>
                    <div className={`text-xs font-medium ${result.plus_10_impact_bps > 0 ? 'text-green-600' : 'text-red-100'}`}>
                      {formatBps(result.plus_10_impact_bps)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center bg-emerald-900">
                    <div className="text-sm">{result.plus_20_irr.toFixed(2)}%</div>
                    <div className={`text-xs font-medium ${result.plus_20_impact_bps > 0 ? 'text-green-600' : 'text-red-100'}`}>
                      {formatBps(result.plus_20_impact_bps)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="text-lg font-bold text-white">{Math.abs(result.max_impact_bps)}</div>
                    <div className="text-xs text-gray-500">bps</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getCriticalityColor(result.criticality)}`}>
                      {result.criticality}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Methodology Note */}
      <div className="p-4 bg-blue-800 border border-blue-600 rounded text-sm text-gray-300">
        <strong>Methodology:</strong> Each assumption is tested at ±10% and ±20% from baseline.
        IRR impact is measured in basis points (bps). Criticality levels:
        CRITICAL ≥500 bps, HIGH 200-500 bps, MEDIUM 50-200 bps, LOW &lt;50 bps.
      </div>
    </div>
  );
}
