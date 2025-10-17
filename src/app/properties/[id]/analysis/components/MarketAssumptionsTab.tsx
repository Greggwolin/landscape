'use client';

// ============================================================================
// TAB 2: MARKET ASSUMPTIONS
// ============================================================================
// Purpose: Market rent benchmarks and comparable data
// Data: tbl_market_assumption
// ============================================================================

import { useState, useEffect } from 'react';
import { MarketAssumption, AnalysisViewSettings } from '../types/analysis.types';

interface MarketAssumptionsTabProps {
  propertyId: number;
  viewSettings: AnalysisViewSettings;
  onComplete: (isComplete: boolean) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function MarketAssumptionsTab({
  propertyId,
  viewSettings,
  onComplete,
  onNext,
  onPrev,
}: MarketAssumptionsTabProps) {
  const [assumptions, setAssumptions] = useState<MarketAssumption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data
    const mockAssumptions: MarketAssumption[] = [
      {
        assumption_id: 1,
        space_type: 'Anchor Retail',
        market_rent_psf_min: 25.0,
        market_rent_psf_max: 35.0,
        market_rent_psf_avg: 30.0,
        ti_psf: 25.0,
        free_rent_months: 3,
        lease_term_months: 120,
        concession_notes: 'Strong anchors command premium',
        source: 'CoStar',
        as_of_date: '2025-01-01',
      },
      {
        assumption_id: 2,
        space_type: 'In-Line Retail',
        market_rent_psf_min: 40.0,
        market_rent_psf_max: 60.0,
        market_rent_psf_avg: 50.0,
        ti_psf: 40.0,
        free_rent_months: 2,
        lease_term_months: 60,
        concession_notes: 'High-quality location premium',
        source: 'CoStar',
        as_of_date: '2025-01-01',
      },
    ];

    setAssumptions(mockAssumptions);
    setLoading(false);
    if (mockAssumptions.length > 0) {
      setTimeout(() => onComplete(true), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Market Assumptions</h2>
          <p className="text-sm text-gray-400 mt-1">Market rent benchmarks by space type</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onPrev} className="px-4 py-2 text-sm border border-gray-700 rounded hover:bg-gray-800">
            ← Previous
          </button>
          <button onClick={onNext} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
            Next: Define Expenses →
          </button>
        </div>
      </div>

      <div className="border border-gray-800 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Space Type</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Market Rent ($/SF)</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">TI ($/SF)</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Free Rent</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Lease Term</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Source</th>
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-200">
            {assumptions.map((assumption) => (
              <tr key={assumption.assumption_id} className="hover:bg-gray-800">
                <td className="px-4 py-3 text-sm font-medium text-white">{assumption.space_type}</td>
                <td className="px-4 py-3 text-sm text-right text-white">
                  ${assumption.market_rent_psf_min.toFixed(2)} - ${assumption.market_rent_psf_max.toFixed(2)}
                  <div className="text-xs text-gray-500">Avg: ${assumption.market_rent_psf_avg.toFixed(2)}</div>
                </td>
                <td className="px-4 py-3 text-sm text-right text-white">${assumption.ti_psf.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-right text-white">{assumption.free_rent_months} months</td>
                <td className="px-4 py-3 text-sm text-right text-white">{assumption.lease_term_months} months</td>
                <td className="px-4 py-3 text-sm text-white">{assumption.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
