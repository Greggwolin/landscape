'use client';

// ============================================================================
// TAB 1: RENT ROLL
// ============================================================================
// Purpose: Lease data grid with inline editing
// Data: tbl_cre_lease, tbl_cre_space, tbl_cre_tenant
// ============================================================================

import { useState, useEffect } from 'react';
import { RentRollSpace, RentRollSummary, AnalysisViewSettings } from '../types/analysis.types';

interface RentRollTabProps {
  propertyId: number;
  viewSettings: AnalysisViewSettings;
  onComplete: (isComplete: boolean) => void;
  onNext: () => void;
}

export function RentRollTab({
  propertyId,
  viewSettings,
  onComplete,
  onNext,
}: RentRollTabProps) {
  const [spaces, setSpaces] = useState<RentRollSpace[]>([]);
  const [summary, setSummary] = useState<RentRollSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSpaceId, setExpandedSpaceId] = useState<number | null>(null);

  // ============================================================================
  // FETCH RENT ROLL DATA
  // ============================================================================

  useEffect(() => {
    const fetchRentRoll = async () => {
      try {
        setLoading(true);

        const response = await fetch(`/api/cre/properties/${propertyId}/rent-roll`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        setSpaces(data.spaces);
        setSummary(data.summary);
        setError(null);

        // Mark tab as complete once data is loaded
        if (data.spaces.length > 0) {
          // Use setTimeout to avoid calling setState during render
          setTimeout(() => onComplete(true), 0);
        }
      } catch (err) {
        console.error('Failed to load rent roll:', err);
        setError('Failed to load rent roll data');
      } finally {
        setLoading(false);
      }
    };

    fetchRentRoll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]); // Only depend on propertyId, not onComplete

  // ============================================================================
  // LEASE STATUS COLOR
  // ============================================================================

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-800 text-white';
      case 'Expiring':
        return 'bg-amber-700 text-white';
      case 'Vacant':
        return 'bg-red-800 text-red-100';
      case 'Future':
        return 'bg-blue-800 text-white';
      default:
        return 'bg-gray-800 text-gray-200';
    }
  };

  // ============================================================================
  // FORMAT CURRENCY
  // ============================================================================

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-800 border border-red-600 rounded text-white">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Rent Roll</h2>
          <p className="text-sm text-gray-400 mt-1">
            Current lease inventory and tenant information
          </p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 text-sm border border-gray-700 rounded hover:bg-gray-800">
            Import CSV
          </button>
          <button className="px-4 py-2 text-sm border border-gray-700 rounded hover:bg-gray-800">
            Export Excel
          </button>
          <button
            onClick={onNext}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Next: Define Market Rents →
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-blue-800 border border-blue-600 rounded">
            <div className="text-sm text-blue-200">Total Spaces</div>
            <div className="text-2xl font-semibold text-white mt-1">
              {summary.total_spaces}
            </div>
            <div className="text-xs text-blue-200 mt-1">
              {formatNumber(summary.total_sf)} SF
            </div>
          </div>

          <div className="p-4 bg-emerald-800 border border-emerald-600 rounded">
            <div className="text-sm text-emerald-200">Occupancy</div>
            <div className="text-2xl font-semibold text-white mt-1">
              {summary.occupancy_pct.toFixed(1)}%
            </div>
            <div className="text-xs text-emerald-200 mt-1">
              {summary.occupied_spaces} occupied
            </div>
          </div>

          <div className="p-4 bg-purple-800 border border-purple-600 rounded">
            <div className="text-sm text-purple-200">Monthly Rent</div>
            <div className="text-2xl font-semibold text-white mt-1">
              {formatCurrency(summary.total_monthly_rent)}
            </div>
            <div className="text-xs text-purple-200 mt-1">
              ${summary.avg_rent_psf.toFixed(2)}/SF avg
            </div>
          </div>

          <div className="p-4 bg-amber-700 border border-amber-600 rounded">
            <div className="text-sm text-amber-200">Expiring 2026</div>
            <div className="text-2xl font-semibold text-white mt-1">
              {summary.expiring_within_12mo}
            </div>
            <div className="text-xs text-amber-200 mt-1">
              {((summary.expiring_within_12mo / summary.occupied_spaces) * 100).toFixed(1)}% of leases
            </div>
          </div>
        </div>
      )}

      {/* Rent Roll Grid */}
      <div className="border border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Suite
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  SF
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Lease Term
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Monthly Rent
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  $/SF/Yr
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-900 divide-y divide-gray-200">
              {spaces.map((space) => (
                <tr
                  key={space.space_id}
                  className={`hover:bg-gray-800 ${
                    space.occupancy_status === 'Vacant' ? 'bg-gray-800' : ''
                  }`}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">
                    {space.suite_number}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-white">
                    {space.tenant_name || (
                      <span className="text-gray-400 italic">Vacant</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-white">
                    {formatNumber(space.rentable_sf)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                        space.lease_status
                      )}`}
                    >
                      {space.lease_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-white">
                    {space.lease_start_date && space.lease_end_date ? (
                      <div>
                        <div>{new Date(space.lease_start_date).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500">
                          to {new Date(space.lease_end_date).toLocaleDateString()}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-white">
                    {space.monthly_base_rent > 0
                      ? formatCurrency(space.monthly_base_rent)
                      : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-white">
                    {space.rent_psf_annual > 0 ? `$${space.rent_psf_annual.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-white">
                    {space.lease_type || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <button
                      onClick={() =>
                        setExpandedSpaceId(
                          expandedSpaceId === space.space_id ? null : space.space_id
                        )
                      }
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {expandedSpaceId === space.space_id ? '▼' : '▶'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {spaces.length === 0 && (
        <div className="text-center py-12 bg-gray-800 border border-gray-800 rounded-lg">
          <p className="text-gray-400 mb-4">No spaces found for this property.</p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Add First Space
          </button>
        </div>
      )}
    </div>
  );
}
