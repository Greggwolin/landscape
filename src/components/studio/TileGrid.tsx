'use client';

/**
 * TileGrid - Studio panel tile navigation
 *
 * STYLING RULES:
 * - All colors use CSS variables from studio-theme.css
 * - No Tailwind color classes (bg-*, text-*, border-* with colors)
 * - Tailwind layout utilities (flex, grid, gap, p-*, m-*) are allowed
 *
 * @version 1.0
 * @created 2026-01-20
 */

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';

// Types
export type AnalysisType = 'VALUATION' | 'INVESTMENT' | 'DEVELOPMENT' | 'FEASIBILITY';

export type TileStatus = 'ready' | 'review' | 'locked' | 'none';

export interface TileConfig {
  id: string;
  label: string;
  icon: string;
  route: string;
  color: string; // CSS variable name without --studio-tile-
  status?: TileStatus;
  statusText?: string;
}

export interface TileGridProps {
  projectId: number;
  analysisType: AnalysisType;
  activeTile?: string;
  /** Optional tile status overrides */
  tileStatuses?: Record<string, { status: TileStatus; statusText?: string }>;
}

// Tile configuration by Analysis Type
const TILE_CONFIGS: Record<AnalysisType, TileConfig[]> = {
  VALUATION: [
    { id: 'home', label: 'Project Home', icon: '🏠', route: 'overview', color: 'home' },
    { id: 'property', label: 'Property', icon: '🏢', route: 'property', color: 'property' },
    { id: 'market', label: 'Market', icon: '📊', route: 'market', color: 'market' },
    { id: 'hbu', label: 'H&BU', icon: '⚖️', route: 'hbu', color: 'hbu' },
    { id: 'valuation', label: 'Valuation', icon: '📈', route: 'valuation', color: 'valuation' },
    { id: 'reports', label: 'Reports', icon: '📑', route: 'reports', color: 'reports' },
    { id: 'documents', label: 'Documents', icon: '📁', route: 'documents', color: 'documents' },
  ],
  INVESTMENT: [
    { id: 'home', label: 'Project Home', icon: '🏠', route: 'overview', color: 'home' },
    { id: 'property', label: 'Property', icon: '🏢', route: 'property', color: 'property' },
    { id: 'operations', label: 'Operations', icon: '📋', route: 'operations', color: 'operations' },
    { id: 'capitalization', label: 'Capitalization', icon: '🏦', route: 'capitalization', color: 'capitalization' },
    { id: 'reports', label: 'Reports', icon: '📑', route: 'reports', color: 'reports' },
    { id: 'documents', label: 'Documents', icon: '📁', route: 'documents', color: 'documents' },
  ],
  DEVELOPMENT: [
    { id: 'home', label: 'Project Home', icon: '🏠', route: 'overview', color: 'home' },
    { id: 'property', label: 'Property', icon: '🏢', route: 'property', color: 'property' },
    { id: 'planning', label: 'Planning', icon: '📐', route: 'planning', color: 'market' },
    { id: 'budget', label: 'Budget', icon: '💰', route: 'budget', color: 'operations' },
    { id: 'sales', label: 'Sales', icon: '🏷️', route: 'sales', color: 'capitalization' },
    { id: 'capitalization', label: 'Capitalization', icon: '🏦', route: 'capitalization', color: 'capitalization' },
    { id: 'reports', label: 'Reports', icon: '📑', route: 'reports', color: 'reports' },
    { id: 'documents', label: 'Documents', icon: '📁', route: 'documents', color: 'documents' },
  ],
  FEASIBILITY: [
    { id: 'home', label: 'Project Home', icon: '🏠', route: 'overview', color: 'home' },
    { id: 'property', label: 'Property', icon: '🏢', route: 'property', color: 'property' },
    { id: 'hbu', label: 'H&BU', icon: '⚖️', route: 'hbu', color: 'hbu' },
    { id: 'valuation', label: 'Valuation', icon: '📈', route: 'valuation', color: 'valuation' },
    { id: 'capitalization', label: 'Capitalization', icon: '🏦', route: 'capitalization', color: 'capitalization' },
    { id: 'reports', label: 'Reports', icon: '📑', route: 'reports', color: 'reports' },
    { id: 'documents', label: 'Documents', icon: '📁', route: 'documents', color: 'documents' },
  ],
};

// Analysis Type badge colors (using inline styles with semantic values)
const ANALYSIS_BADGE_STYLES: Record<AnalysisType, { bg: string; color: string }> = {
  VALUATION: { bg: 'rgba(131, 24, 67, 0.3)', color: '#f9a8d4' },
  INVESTMENT: { bg: 'rgba(30, 64, 175, 0.3)', color: '#93c5fd' },
  DEVELOPMENT: { bg: 'rgba(22, 101, 52, 0.3)', color: '#86efac' },
  FEASIBILITY: { bg: 'rgba(146, 64, 14, 0.3)', color: '#fcd34d' },
};

/**
 * TileGrid - Studio panel tile navigation
 *
 * Displays a 2-column grid of tiles based on the project's Analysis Type.
 * Each tile navigates to its corresponding route.
 */
export function TileGrid({
  projectId,
  analysisType,
  activeTile,
  tileStatuses,
}: TileGridProps): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();

  const tiles = TILE_CONFIGS[analysisType] || TILE_CONFIGS.INVESTMENT;
  const badgeStyle = ANALYSIS_BADGE_STYLES[analysisType];

  // Determine active tile from pathname if not provided
  const currentTile = activeTile || pathname?.split('/').pop() || 'overview';

  const handleTileClick = (route: string) => {
    router.push(`/projects/${projectId}/${route}`);
  };

  // Get status for a tile
  const getTileStatus = (tile: TileConfig) => {
    if (tileStatuses && tileStatuses[tile.id]) {
      return tileStatuses[tile.id];
    }
    return { status: tile.status || 'none', statusText: tile.statusText };
  };

  return (
    <div
      className="p-4"
      style={{ borderBottom: '1px solid var(--studio-border-soft)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--studio-text-muted)' }}
        >
          Studio
        </span>
        <span
          className="text-xs font-semibold uppercase px-2 py-1 rounded"
          style={{
            backgroundColor: badgeStyle.bg,
            color: badgeStyle.color,
            letterSpacing: '0.5px',
          }}
        >
          {analysisType}
        </span>
      </div>

      {/* Tile Grid */}
      <div className="grid grid-cols-2 gap-2">
        {tiles.map((tile) => {
          const isActive = currentTile === tile.route || currentTile === tile.id;
          const { status, statusText } = getTileStatus(tile);

          return (
            <div
              key={tile.id}
              onClick={() => handleTileClick(tile.route)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleTileClick(tile.route);
                }
              }}
              className="p-2.5 rounded-lg cursor-pointer flex flex-col gap-1 transition-all duration-200"
              style={{
                background: `linear-gradient(135deg, var(--studio-tile-${tile.color}-from), var(--studio-tile-${tile.color}-to))`,
                border: isActive
                  ? '2px solid var(--studio-tile-border-active)'
                  : '2px solid transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = 'var(--studio-tile-shadow-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span className="text-base">{tile.icon}</span>
              <span
                className="text-xs font-semibold"
                style={{ color: 'var(--studio-tile-label)' }}
              >
                {tile.label}
              </span>
              {statusText && (
                <span
                  className="text-xs"
                  style={{ color: 'var(--studio-tile-status)' }}
                >
                  {status === 'ready' && '✓ '}
                  {status === 'review' && '⚠ '}
                  {status === 'locked' && '🔒 '}
                  {statusText}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TileGrid;
