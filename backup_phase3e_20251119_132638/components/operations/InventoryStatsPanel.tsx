'use client';

import { useEffect, useState } from 'react';

interface InventoryStats {
  unsold_parcels: number;
  total_parcels: number;
  unsold_acres: number;
  total_acres: number;
  pct_unsold: number;
}

interface InventoryStatsPanelProps {
  projectId: number;
}

export function InventoryStatsPanel({ projectId }: InventoryStatsPanelProps) {
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadStats = async () => {
      try {
        setError(null);
        const response = await fetch(`/api/projects/${projectId}/operating-expenses/inventory-stats`);
        if (!response.ok) {
          throw new Error('Failed to load inventory stats');
        }
        const payload = await response.json();
        if (isMounted) {
          setStats(payload);
        }
      } catch (err) {
        console.error('Error loading inventory stats:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load inventory stats');
        }
      }
    };

    loadStats();
    return () => {
      isMounted = false;
    };
  }, [projectId]);

  if (error) {
    return (
      <div className="rounded border border-red-500 bg-red-900/40 p-3 text-sm text-red-100">
        {error}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center rounded border border-gray-800 bg-gray-900/40 p-3 text-sm text-gray-300">
        Loading inventory stats...
      </div>
    );
  }

  return (
    <div className="rounded border border-gray-800 bg-gray-900/40 p-4 text-gray-100">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Unsold Inventory</h3>
      <div className="mt-3 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold">{stats.unsold_parcels}</div>
          <div className="text-xs text-gray-400">of {stats.total_parcels} parcels</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{stats.unsold_acres.toFixed(1)} ac</div>
          <div className="text-xs text-gray-400">of {stats.total_acres.toFixed(1)} acres</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{stats.pct_unsold}%</div>
          <div className="text-xs text-gray-400">unsold</div>
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-500">
        Operating expenses auto-adjust based on unsold inventory levels.
      </div>
    </div>
  );
}
