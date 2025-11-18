/**
 * TileNavigationGrid - Progressive tile grid with subdivision
 *
 * Main container for the progressive tile navigation system.
 * Displays tiles that can subdivide into smaller tiles on click.
 *
 * Behavior:
 * - Level 1: Single horizontal row of compact main tiles
 * - Level 2: Second row appears below with child tiles
 * - Clicking Level 1 tile shows/hides its Level 2 children
 * - Smooth CSS transitions between states
 *
 * Layout:
 * - Row 1: Property | Budget & Finance | Planning & Sales | Market & Reports
 * - Row 2: [Child tiles when Level 1 tile is clicked]
 *
 * @version 1.1
 * @date 2025-11-18
 */
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import ProgressiveTile from './ProgressiveTile';
import { type TileConfig } from '@/config/tile-hierarchy';

export interface TileNavigationGridProps {
  /** Current tiles to display */
  tiles: TileConfig[];

  /** Current navigation level (1 or 2) */
  level: 1 | 2;

  /** Parent tile (for Level 2 navigation) */
  parentTile?: TileConfig;

  /** Active tile ID */
  activeTileId?: string;

  /** Click handler for tiles */
  onTileClick: (tile: TileConfig) => void;

  /** Back navigation handler (for Level 2) */
  onBack?: () => void;

  /** Project ID for route generation */
  projectId: number;
}

/**
 * TileNavigationGrid Component
 *
 * Renders a responsive grid of progressive navigation tiles.
 * Tiles can subdivide into children (Level 1 -> Level 2) or navigate directly to routes.
 */
export default function TileNavigationGrid({
  tiles,
  level,
  parentTile,
  activeTileId,
  onTileClick,
  onBack,
  projectId,
}: TileNavigationGridProps) {
  const router = useRouter();

  /**
   * Handle tile click
   * - If tile has children: show children (subdivision)
   * - If tile has route: navigate to route
   */
  const handleTileClick = (tile: TileConfig) => {
    if (tile.children && tile.children.length > 0) {
      // Tile has children - subdivide to Level 2
      onTileClick(tile);
    } else if (tile.route) {
      // Tile has route - navigate
      const route = tile.route.replace('[projectId]', String(projectId));
      router.push(route);
    } else {
      // Fallback - just trigger onClick
      onTileClick(tile);
    }
  };

  return (
    <div className="tile-navigation-container w-full space-y-3">
      {/* Row 1: Level 1 Tiles (Always Visible) */}
      <div className="flex flex-wrap gap-3">
        {tiles.map((tile) => (
          <ProgressiveTile
            key={tile.id}
            config={tile}
            onClick={() => handleTileClick(tile)}
            active={tile.active}
            selected={tile.selected}
          />
        ))}
      </div>

      {/* Row 2: Level 2 Tiles (Shown when parent is selected) */}
      {level === 2 && parentTile && parentTile.children && (
        <div className="tile-grid-animate">
          {/* Level 2 Tiles Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {parentTile.children.map((child) => (
              <ProgressiveTile
                key={child.id}
                config={child}
                onClick={() => handleTileClick(child)}
                active={child.active}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
