'use client';

/**
 * ValueTiles Component
 *
 * Displays three Direct Cap valuation perspectives plus DCF in prominent tiles.
 * Tiles: F-12 Current, F-12 Market, Stabilized, (DCF placeholder)
 * Clicking a tile selects that NOI basis for detailed view.
 *
 * Session: QK-11 (original), QK-30 (3-basis consolidation)
 */

import React from 'react';
import type { ValueTile, ValueTilesProps } from '@/types/income-approach';
import {
  formatCurrencyCompact,
  formatPercent,
  formatPerUnit,
  TILE_COLORS,
  DCF_TILE_COLOR,
  NOI_BASIS_LABELS,
} from '@/types/income-approach';

export function ValueTiles({
  tiles,
  selectedBasis,
  onSelectBasis,
  unitCount,
}: ValueTilesProps) {
  // Filter to only show the 3 Direct Cap tiles (in case backend sends more)
  const directCapTiles = tiles.filter(t =>
    t.id === 'f12_current' || t.id === 'f12_market' || t.id === 'stabilized'
  );

  return (
    <div className="grid grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
      {directCapTiles.map((tile) => (
        <ValueTileCard
          key={tile.id}
          tile={tile}
          isSelected={tile.id === selectedBasis}
          onClick={() => onSelectBasis(tile.id)}
          unitCount={unitCount}
        />
      ))}
      {/* DCF Placeholder Tile - Coming Soon */}
      <DCFPlaceholderTile />
    </div>
  );
}

/**
 * DCF Placeholder Tile - shows coming soon message
 */
function DCFPlaceholderTile() {
  return (
    <div
      className="relative rounded-lg p-4 text-left opacity-60"
      style={{
        backgroundColor: DCF_TILE_COLOR.bg,
        borderWidth: '1px',
        borderStyle: 'dashed',
        borderColor: DCF_TILE_COLOR.border,
      }}
    >
      {/* Label */}
      <div
        className="text-xs font-medium uppercase tracking-wider mb-2 opacity-70"
        style={{ color: DCF_TILE_COLOR.text }}
      >
        DCF
      </div>

      {/* Coming Soon */}
      <div
        className="text-lg font-medium mb-1"
        style={{ color: 'var(--cui-secondary-color)' }}
      >
        Coming Soon
      </div>

      <div
        className="text-xs mt-2"
        style={{ color: 'var(--cui-secondary-color)' }}
      >
        Multi-year cash flow analysis
      </div>
    </div>
  );
}

interface ValueTileCardProps {
  tile: ValueTile;
  isSelected: boolean;
  onClick: () => void;
  unitCount: number;
}

function ValueTileCard({ tile, isSelected, onClick, unitCount: _unitCount }: ValueTileCardProps) {
  // Get colors for tile, fallback to market colors if not found
  const colors = TILE_COLORS[tile.id] || TILE_COLORS['f12_market'];
  void _unitCount; // Reserved for future unit-based calculations

  return (
    <button
      onClick={onClick}
      className="relative rounded-lg p-4 text-left transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2"
      style={{
        backgroundColor: colors.bg,
        borderWidth: isSelected ? '3px' : '1px',
        borderStyle: 'solid',
        borderColor: isSelected ? colors.border : 'rgba(255,255,255,0.1)',
        boxShadow: isSelected ? `0 0 20px ${colors.border}40` : 'none',
      }}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div
          className="absolute top-2 right-2 w-2 h-2 rounded-full"
          style={{ backgroundColor: colors.border }}
        />
      )}

      {/* Label */}
      <div
        className="text-xs font-medium uppercase tracking-wider mb-2 opacity-70"
        style={{ color: colors.text }}
      >
        {NOI_BASIS_LABELS[tile.id]}
      </div>

      {/* Primary Value */}
      <div
        className="text-2xl font-bold mb-1"
        style={{ color: 'var(--cui-body-color)' }}
      >
        {tile.value ? formatCurrencyCompact(tile.value) : '—'}
      </div>

      {/* Cap Rate */}
      <div
        className="text-sm mb-2"
        style={{ color: colors.text }}
      >
        {formatPercent(tile.cap_rate)} cap
      </div>

      {/* Price per Unit */}
      <div
        className="text-sm opacity-80"
        style={{ color: 'var(--cui-secondary-color)' }}
      >
        {tile.price_per_unit ? formatPerUnit(tile.price_per_unit) : '—'}
      </div>

      {/* NOI */}
      <div
        className="text-xs mt-2 pt-2 border-t"
        style={{
          color: 'var(--cui-secondary-color)',
          borderColor: 'rgba(255,255,255,0.1)',
        }}
      >
        NOI: {formatCurrencyCompact(tile.noi)}
      </div>

      {/* Stabilized vacancy indicator */}
      {tile.uses_stabilized_vacancy && (
        <div
          className="absolute bottom-2 right-2 text-[10px] px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            color: 'var(--cui-secondary-color)',
          }}
        >
          Stabilized Vacancy
        </div>
      )}
    </button>
  );
}

export default ValueTiles;
