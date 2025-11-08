/**
 * Annual Inventory Gauge
 * Displays year-by-year lot inventory position with color-coded cells
 */

'use client';

import React from 'react';
import { useInventoryGauge } from '@/hooks/useSalesAbsorption';
import type { InventoryYear } from '@/types/sales-absorption';

interface Props {
  projectId: number;
}

export default function AnnualInventoryGauge({ projectId }: Props) {
  const { data, isLoading, error } = useInventoryGauge(projectId);

  if (isLoading) {
    return (
      <div className="p-4 bg-white rounded border">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-3"></div>
          <div className="flex gap-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded flex-1"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
        <p>Failed to load inventory gauge data</p>
      </div>
    );
  }

  if (!data || data.years.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded text-gray-600">
        <p>No inventory data available</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded border">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">Annual Inventory Gauge</h3>
      <div className="grid auto-cols-fr grid-flow-col gap-2">
        {data.years.map((year, index) => (
          <InventoryCell key={year.year} year={year} yearIndex={index} />
        ))}
      </div>
    </div>
  );
}

interface CellProps {
  year: InventoryYear;
  yearIndex: number;
}

function InventoryCell({ year, yearIndex }: CellProps) {
  // Calculate color based on inventory level
  // For simplicity, using thresholds based on absolute inventory
  // In production, this should use months-of-inventory calculation
  const color = getInventoryColor(year.year_end_inventory);

  return (
    <div
      className="flex flex-col items-center justify-center p-3 rounded border-2 transition-all hover:shadow-md"
      style={{
        backgroundColor: color.bg,
        borderColor: color.border,
      }}
    >
      <div className="text-xs font-medium text-gray-700 mb-1">
        Yr {yearIndex + 1}
      </div>
      <div className="text-sm font-mono text-gray-600">
        {year.year}
      </div>
      <div className="text-2xl font-bold mt-2" style={{ color: color.text }}>
        {year.year_end_inventory.toLocaleString()}
      </div>
      <div className="text-xs text-gray-500 mt-1">
        lots
      </div>

      {/* Tooltip details */}
      <div className="text-xs text-gray-600 mt-2 space-y-0.5 w-full">
        <div className="flex justify-between">
          <span>Delivered:</span>
          <span className="font-mono">{year.lots_delivered}</span>
        </div>
        <div className="flex justify-between">
          <span>Absorbed:</span>
          <span className="font-mono">{year.lots_absorbed}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Determine color based on inventory level
 * TODO: Calculate actual months-of-inventory based on absorption velocity
 */
function getInventoryColor(inventory: number): {
  bg: string;
  border: string;
  text: string;
} {
  // Simplified logic - in production, calculate months of inventory
  if (inventory === 0) {
    return {
      bg: '#BDBDBD',
      border: '#9E9E9E',
      text: '#616161',
    };
  }

  if (inventory > 500) {
    // Healthy - green
    return {
      bg: '#C8E6C9',
      border: '#4CAF50',
      text: '#2E7D32',
    };
  }

  if (inventory > 200) {
    // Tightening - yellow
    return {
      bg: '#FFF9C4',
      border: '#FFEB3B',
      text: '#F57F17',
    };
  }

  // Critical - red
  return {
    bg: '#FFCDD2',
    border: '#F44336',
    text: '#C62828',
  };
}
