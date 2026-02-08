'use client';

// ============================================================================
// QUICK STATS COMPONENT
// ============================================================================
// Purpose: Always-visible property summary stats in page header
// ============================================================================

import { useState, useEffect } from 'react';
import { QuickStats as QuickStatsType, QuickStat, TabId, StatHealth } from '../types/analysis.types';

interface QuickStatsProps {
  propertyId: number;
  onStatClick: (tabId: TabId) => void;
}

export function QuickStats({ propertyId, onStatClick }: QuickStatsProps) {
  const [stats, setStats] = useState<QuickStatsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // FETCH QUICK STATS
  // ============================================================================

  useEffect(() => {
    const fetchQuickStats = async () => {
      try {
        setLoading(true);
        // TODO: Replace with actual API call
        // const response = await fetch(`/api/cre/properties/${propertyId}/quick-stats`);
        // const data = await response.json();

        // Mock data for now
        const mockData: QuickStatsType = {
          occupancy_pct: 97.6,
          noi_annual: 3700000,
          irr: 0.1423,
          vacant_spaces: 2,
          expiring_next_year_pct: 15.2,
          dscr: 1.85,
        };

        setStats(mockData);
        setError(null);
      } catch (err) {
        console.error('Failed to load quick stats:', err);
        setError('Failed to load stats');
      } finally {
        setLoading(false);
      }
    };

    fetchQuickStats();
  }, [propertyId]);

  // ============================================================================
  // CALCULATE STAT HEALTH
  // ============================================================================

  const getStatHealth = (stat: string, value: number | null): StatHealth => {
    if (value === null) return 'warning';

    switch (stat) {
      case 'occupancy_pct':
        if (value >= 95) return 'good';
        if (value >= 85) return 'warning';
        return 'critical';

      case 'dscr':
        if (value >= 1.5) return 'good';
        if (value >= 1.25) return 'warning';
        return 'critical';

      case 'irr':
        if (value >= 0.15) return 'good';
        if (value >= 0.10) return 'warning';
        return 'critical';

      case 'vacant_spaces':
        if (value <= 2) return 'good';
        if (value <= 5) return 'warning';
        return 'critical';

      case 'expiring_next_year_pct':
        if (value <= 20) return 'good';
        if (value <= 40) return 'warning';
        return 'critical';

      default:
        return 'good';
    }
  };

  // ============================================================================
  // FORMAT STAT VALUE
  // ============================================================================

  const formatStatValue = (stat: string, value: number | null): string => {
    if (value === null) return 'N/A';

    switch (stat) {
      case 'occupancy_pct':
      case 'expiring_next_year_pct':
        return `${value.toFixed(1)}%`;

      case 'noi_annual':
        return `$${(value / 1000000).toFixed(1)}M`;

      case 'irr':
        return `${(value * 100).toFixed(1)}%`;

      case 'dscr':
        return `${value.toFixed(2)}x`;

      case 'vacant_spaces':
        return value.toString();

      default:
        return value.toString();
    }
  };

  // ============================================================================
  // BUILD STAT CARDS
  // ============================================================================

  const buildStatCards = (stats: QuickStatsType): QuickStat[] => {
    return [
      {
        label: 'Occupancy',
        value: formatStatValue('occupancy_pct', stats.occupancy_pct),
        health: getStatHealth('occupancy_pct', stats.occupancy_pct),
        targetTab: 'rent-roll',
        icon: '📊',
      },
      {
        label: 'NOI',
        value: formatStatValue('noi_annual', stats.noi_annual),
        health: 'good',
        targetTab: 'cash-flow',
        icon: '💰',
      },
      {
        label: 'IRR',
        value: stats.irr ? formatStatValue('irr', stats.irr) : 'Not Calc',
        health: stats.irr ? getStatHealth('irr', stats.irr) : 'warning',
        targetTab: 'returns',
        icon: '📈',
      },
      {
        label: 'Vacant',
        value: `${stats.vacant_spaces} spaces`,
        health: getStatHealth('vacant_spaces', stats.vacant_spaces),
        targetTab: 'rent-roll',
        icon: '⚠️',
      },
      {
        label: 'Expiring 2026',
        value: formatStatValue('expiring_next_year_pct', stats.expiring_next_year_pct),
        health: getStatHealth('expiring_next_year_pct', stats.expiring_next_year_pct),
        targetTab: 'rent-roll',
        icon: '⏰',
      },
      {
        label: 'DSCR',
        value: stats.dscr ? formatStatValue('dscr', stats.dscr) : 'Not Calc',
        health: stats.dscr ? getStatHealth('dscr', stats.dscr) : 'warning',
        targetTab: 'cash-flow',
        icon: '✓',
      },
    ];
  };

  // ============================================================================
  // HEALTH COLOR CLASSES
  // ============================================================================

  const getHealthColor = (health: StatHealth): string => {
    switch (health) {
      case 'good':
        return 'bg-emerald-800 border-emerald-600 text-white';
      case 'warning':
        return 'bg-amber-700 border-amber-600 text-white';
      case 'critical':
        return 'bg-red-800 border-red-600 text-white';
    }
  };

  const getHealthIndicator = (health: StatHealth): string => {
    switch (health) {
      case 'good':
        return '●';
      case 'warning':
        return '●';
      case 'critical':
        return '●';
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="mt-4 animate-pulse">
        <div className="grid grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-16 bg-gray-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="mt-4 p-4 bg-red-900/30 border border-red-700 rounded text-sm text-white">
        {error || 'Failed to load quick stats'}
      </div>
    );
  }

  const statCards = buildStatCards(stats);

  return (
    <div className="mt-4">
      <div className="grid grid-cols-6 gap-4">
        {statCards.map((stat) => (
          <button
            key={stat.label}
            onClick={() => onStatClick(stat.targetTab)}
            className={`p-3 border rounded transition-all hover:shadow-md ${getHealthColor(
              stat.health
            )}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-lg">{stat.icon}</span>
              <span className="text-sm font-medium" style={{
                color: stat.health === 'good' ? '#16a34a' :
                       stat.health === 'warning' ? '#ca8a04' : '#dc2626'
              }}>
                {getHealthIndicator(stat.health)}
              </span>
            </div>
            <div className="text-xs text-gray-400 mb-1">{stat.label}</div>
            <div className="text-lg font-semibold">{stat.value}</div>
          </button>
        ))}
      </div>

      {/* Mobile View (Stacked) */}
      <div className="md:hidden mt-4 space-y-2">
        {statCards.map((stat) => (
          <button
            key={stat.label}
            onClick={() => onStatClick(stat.targetTab)}
            className={`w-full p-3 border rounded flex items-center justify-between ${getHealthColor(
              stat.health
            )}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{stat.icon}</span>
              <div className="text-left">
                <div className="text-xs text-gray-400">{stat.label}</div>
                <div className="text-lg font-semibold">{stat.value}</div>
              </div>
            </div>
            <span className="text-xl" style={{
              color: stat.health === 'good' ? '#16a34a' :
                     stat.health === 'warning' ? '#ca8a04' : '#dc2626'
            }}>
              {getHealthIndicator(stat.health)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
