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
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

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
// Mirrors LifecycleTileNav from src/components/projects/tiles/tileConfig.ts
// Income properties use ?tab= query params; Land dev uses path routes
const TILE_CONFIGS: Record<AnalysisType, TileConfig[]> = {
  // VALUATION: Appraisal workflow - uses income property tabs
  VALUATION: [
    { id: 'home', label: 'Project Home', icon: '🏠', route: '?tab=project', color: 'home' },
    { id: 'property', label: 'Property', icon: '🏢', route: '?tab=property', color: 'property' },
    { id: 'operations', label: 'Operations', icon: '📋', route: '?tab=operations', color: 'operations' },
    { id: 'valuation', label: 'Valuation', icon: '📈', route: '?tab=valuation', color: 'valuation' },
    { id: 'capitalization', label: 'Capitalization', icon: '🏦', route: '/capitalization/equity', color: 'capitalization' },
    { id: 'reports', label: 'Reports', icon: '📑', route: '?tab=reports', color: 'reports' },
    { id: 'documents', label: 'Documents', icon: '📁', route: '?tab=documents', color: 'documents' },
  ],
  // INVESTMENT: Multifamily acquisition/disposition
  // Property tab: Rent Roll, Floorplan Matrix, Comp Map (via PropertyTab)
  // Operations tab: Rent Roll subtab, Expenses, NOI
  INVESTMENT: [
    { id: 'home', label: 'Project Home', icon: '🏠', route: '?tab=project', color: 'home' },
    { id: 'property', label: 'Property', icon: '🏢', route: '?tab=property', color: 'property' },
    { id: 'operations', label: 'Operations', icon: '📋', route: '?tab=operations', color: 'operations' },
    { id: 'valuation', label: 'Valuation', icon: '📈', route: '?tab=valuation', color: 'valuation' },
    { id: 'capitalization', label: 'Capitalization', icon: '🏦', route: '/capitalization/equity', color: 'capitalization' },
    { id: 'reports', label: 'Reports', icon: '📑', route: '?tab=reports', color: 'reports' },
    { id: 'documents', label: 'Documents', icon: '📁', route: '?tab=documents', color: 'documents' },
  ],
  // DEVELOPMENT: Land development workflow (path-based routing)
  DEVELOPMENT: [
    { id: 'home', label: 'Project Home', icon: '🏠', route: '', color: 'home' },
    { id: 'planning', label: 'Planning', icon: '📐', route: '/planning/market', color: 'property' },
    { id: 'budget', label: 'Budget', icon: '💰', route: '/budget', color: 'operations' },
    { id: 'sales', label: 'Sales', icon: '🏷️', route: '/project/sales', color: 'capitalization' },
    { id: 'feasibility', label: 'Feasibility', icon: '📊', route: '/results', color: 'valuation' },
    { id: 'capitalization', label: 'Capitalization', icon: '🏦', route: '/capitalization/equity', color: 'capitalization' },
    { id: 'reports', label: 'Reports', icon: '📑', route: '/analysis', color: 'reports' },
    { id: 'documents', label: 'Documents', icon: '📁', route: '/documents', color: 'documents' },
  ],
  // FEASIBILITY: HBU analysis - uses income property tabs
  FEASIBILITY: [
    { id: 'home', label: 'Project Home', icon: '🏠', route: '?tab=project', color: 'home' },
    { id: 'property', label: 'Property', icon: '🏢', route: '?tab=property', color: 'property' },
    { id: 'operations', label: 'Operations', icon: '📋', route: '?tab=operations', color: 'operations' },
    { id: 'valuation', label: 'Valuation', icon: '📈', route: '?tab=valuation', color: 'valuation' },
    { id: 'capitalization', label: 'Capitalization', icon: '🏦', route: '/capitalization/equity', color: 'capitalization' },
    { id: 'reports', label: 'Reports', icon: '📑', route: '?tab=reports', color: 'reports' },
    { id: 'documents', label: 'Documents', icon: '📁', route: '?tab=documents', color: 'documents' },
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
  const searchParams = useSearchParams();

  const tiles = TILE_CONFIGS[analysisType] || TILE_CONFIGS.INVESTMENT;
  const badgeStyle = ANALYSIS_BADGE_STYLES[analysisType];

  // Determine active tile from URL
  // Priority: 1) explicit activeTile prop, 2) ?tab= param, 3) path segment
  const tabParam = searchParams.get('tab');
  const pathSegments = pathname?.split('/') || [];
  const lastSegment = pathSegments[pathSegments.length - 1];

  // Map tab param or path segment to tile id
  const getCurrentTileId = () => {
    if (activeTile) return activeTile;
    if (tabParam) return tabParam; // ?tab=property -> 'property'
    // Fall back to path-based detection for non-tab routes
    if (lastSegment === 'studio' || lastSegment === String(projectId)) return 'home';
    return lastSegment || 'home';
  };
  const currentTile = getCurrentTileId();

  const handleTileClick = (route: string) => {
    // Routes starting with ? are tab params on the main project page
    // Other routes are direct paths (e.g., analysis/market-data)
    if (route.startsWith('?')) {
      router.push(`/projects/${projectId}${route}`);
    } else {
      router.push(`/projects/${projectId}/${route}`);
    }
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
      className="p-4 flex-shrink-0"
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
          // For tab-based routes (?tab=property), extract the tab name
          const tileTab = tile.route.startsWith('?tab=') ? tile.route.replace('?tab=', '') : tile.id;
          const isActive = currentTile === tileTab || currentTile === tile.id;
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
