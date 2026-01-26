'use client';

/**
 * ValueTiles Component
 *
 * Displays three Direct Cap valuation perspectives plus DCF in prominent tiles.
 * Tiles: F-12 Current, F-12 Market, Stabilized, DCF
 * Clicking a tile selects that NOI basis for detailed view.
 *
 * Session: QK-11 (original), QK-30 (3-basis consolidation), DCF Implementation
 */

import React from 'react';
import type { ValueTile, ValueTilesProps, DCFAnalysisData } from '@/types/income-approach';
import {
  formatCurrencyCompact,
  formatPercent,
  formatPerUnit,
  TILE_COLORS,
  DCF_TILE_COLOR,
  NOI_BASIS_LABELS,
} from '@/types/income-approach';

export type ValuationMethod = 'direct_cap' | 'dcf';

export interface ExtendedValueTilesProps extends ValueTilesProps {
  dcfData?: DCFAnalysisData | null;
  isDCFLoading?: boolean;
  activeMethod?: ValuationMethod;
  onMethodChange?: (method: ValuationMethod) => void;
}

export function ValueTiles({
  tiles,
  selectedBasis,
  onSelectBasis,
  unitCount,
  dcfData,
  isDCFLoading,
  activeMethod = 'direct_cap',
  onMethodChange,
}: ExtendedValueTilesProps) {
  // Filter to only show the 3 Direct Cap tiles (in case backend sends more)
  const directCapTiles = tiles.filter(t =>
    t.id === 'f12_current' || t.id === 'f12_market' || t.id === 'stabilized'
  );

  const handleDCFClick = () => {
    if (onMethodChange) {
      onMethodChange('dcf');
    }
  };

  const handleDirectCapClick = (basisId: string) => {
    if (onMethodChange) {
      onMethodChange('direct_cap');
    }
    onSelectBasis(basisId as any);
  };

  return (
    <div className="grid grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
      {directCapTiles.map((tile) => (
        <ValueTileCard
          key={tile.id}
          tile={tile}
          isSelected={activeMethod === 'direct_cap' && tile.id === selectedBasis}
          onClick={() => handleDirectCapClick(tile.id)}
          unitCount={unitCount}
        />
      ))}
      {/* DCF Tile */}
      <DCFTile
        dcfData={dcfData}
        isLoading={isDCFLoading}
        isSelected={activeMethod === 'dcf'}
        onClick={handleDCFClick}
      />
    </div>
  );
}

/**
 * DCF Tile - shows DCF valuation or loading state
 */
interface DCFTileProps {
  dcfData?: DCFAnalysisData | null;
  isLoading?: boolean;
  isSelected: boolean;
  onClick: () => void;
}

function DCFTile({ dcfData, isLoading, isSelected, onClick }: DCFTileProps) {
  // Loading state
  if (isLoading) {
    return (
      <div
        className="relative rounded-lg p-4 text-left"
        style={{
          backgroundColor: DCF_TILE_COLOR.bg,
          borderWidth: '1px',
          borderStyle: 'dashed',
          borderColor: DCF_TILE_COLOR.border,
        }}
      >
        <div
          className="text-xs font-medium uppercase tracking-wider mb-2 opacity-70"
          style={{ color: DCF_TILE_COLOR.text }}
        >
          DCF
        </div>
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500" />
          <span style={{ color: 'var(--cui-secondary-color)' }}>Loading...</span>
        </div>
      </div>
    );
  }

  // No data state
  if (!dcfData) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="relative rounded-lg p-4 text-left transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer"
        style={{
          backgroundColor: DCF_TILE_COLOR.bg,
          borderWidth: '1px',
          borderStyle: 'dashed',
          borderColor: DCF_TILE_COLOR.border,
        }}
      >
        <div
          className="text-xs font-medium uppercase tracking-wider mb-2 opacity-70"
          style={{ color: DCF_TILE_COLOR.text }}
        >
          DCF
        </div>
        <div
          className="text-lg font-medium mb-1"
          style={{ color: 'var(--cui-body-color)' }}
        >
          Click to Load
        </div>
        <div
          className="text-xs mt-2"
          style={{ color: 'var(--cui-secondary-color)' }}
        >
          Multi-year cash flow analysis
        </div>
      </button>
    );
  }

  // Active DCF tile with data
  const { metrics, assumptions } = dcfData;

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative rounded-lg p-4 text-left transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2"
      style={{
        backgroundColor: DCF_TILE_COLOR.bg,
        borderWidth: isSelected ? '3px' : '1px',
        borderStyle: 'solid',
        borderColor: isSelected ? DCF_TILE_COLOR.border : 'rgba(255,255,255,0.1)',
        boxShadow: isSelected ? `0 0 20px ${DCF_TILE_COLOR.border}40` : 'none',
      }}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div
          className="absolute top-2 right-2 w-2 h-2 rounded-full"
          style={{ backgroundColor: DCF_TILE_COLOR.border }}
        />
      )}

      {/* Label */}
      <div
        className="text-xs font-medium uppercase tracking-wider mb-2 opacity-70"
        style={{ color: DCF_TILE_COLOR.text }}
      >
        DCF
      </div>

      {/* Primary Value - Present Value */}
      <div
        className="text-2xl font-bold mb-1"
        style={{ color: 'var(--cui-body-color)' }}
      >
        {formatCurrencyCompact(metrics.present_value)}
      </div>

      {/* IRR */}
      <div
        className="text-sm mb-2"
        style={{ color: DCF_TILE_COLOR.text }}
      >
        {metrics.irr !== null ? `${formatPercent(metrics.irr)} IRR` : '— IRR'}
      </div>

      {/* Price per Unit */}
      <div
        className="text-sm opacity-80"
        style={{ color: 'var(--cui-secondary-color)' }}
      >
        {metrics.price_per_unit ? formatPerUnit(metrics.price_per_unit) : '—'}
      </div>

      {/* Hold Period */}
      <div
        className="text-xs mt-2 pt-2 border-t"
        style={{
          color: 'var(--cui-secondary-color)',
          borderColor: 'rgba(255,255,255,0.1)',
        }}
      >
        {assumptions.hold_period_years}-year hold
      </div>
    </button>
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
