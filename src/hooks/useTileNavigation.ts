/**
 * useTileNavigation Hook
 *
 * Manages state for progressive tile navigation system:
 * - Current navigation level (1 or 2)
 * - Active tile selection
 * - URL synchronization with query params
 * - Back navigation handling
 * - Tile subdivision logic
 *
 * @version 1.0
 * @date 2025-11-18
 */
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import {
  LEVEL_1_TILES,
  getTileById,
  getParentTile,
  mapTabToTile,
  type TileConfig,
} from '@/config/tile-hierarchy';

export interface UseTileNavigationReturn {
  /** Current tiles to display */
  currentTiles: TileConfig[];

  /** Current navigation level (1 or 2) */
  level: 1 | 2;

  /** Parent tile (when at Level 2) */
  parentTile?: TileConfig;

  /** Active tile ID */
  activeTileId?: string;

  /** Handle tile click */
  handleTileClick: (tile: TileConfig) => void;

  /** Navigate back to Level 1 */
  handleBack: () => void;

  /** Reset to Level 1 */
  resetToLevel1: () => void;
}

/**
 * useTileNavigation Hook
 *
 * Provides state management and navigation logic for the progressive tile system.
 * Syncs with URL query parameters for backward compatibility.
 */
export function useTileNavigation(projectId: number): UseTileNavigationReturn {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get tab from URL (for backward compatibility)
  const tabFromUrl = searchParams.get('tab');
  const sectionFromUrl = searchParams.get('section');

  // Track current selected parent tile (Level 1)
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

  /**
   * Initialize state from URL parameters
   * Maps legacy ?tab=budget to appropriate tile selection
   *
   * Auto-expand to Level 2 if the current tab belongs to a parent tile.
   * This keeps the Level 2 tiles visible when navigating between child pages.
   */
  useEffect(() => {
    if (!tabFromUrl) {
      setSelectedParentId(null);
      return;
    }

    // Find which tile this tab belongs to
    const mappedTile = mapTabToTile(tabFromUrl);
    if (!mappedTile) {
      setSelectedParentId(null);
      return;
    }

    // Get the parent of this tile
    const parent = getParentTile(mappedTile.id);
    if (parent) {
      // This is a Level 2 tile - keep its parent selected
      setSelectedParentId(parent.id);
    } else {
      // This is a Level 1 tile - check if it has children
      if (mappedTile.children && mappedTile.children.length > 0) {
        // Keep it collapsed initially - user can expand by clicking
        setSelectedParentId(null);
      } else {
        setSelectedParentId(null);
      }
    }
  }, [tabFromUrl]);

  /**
   * Determine current navigation level and tiles
   */
  const { level, currentTiles, parentTile, activeTileId } = useMemo(() => {
    if (!selectedParentId) {
      // Level 1: Show main tiles
      return {
        level: 1 as const,
        currentTiles: LEVEL_1_TILES,
        parentTile: undefined,
        activeTileId: undefined,
      };
    }

    // Get selected parent tile
    const parent = getTileById(selectedParentId);
    if (!parent) {
      // Invalid parent ID - reset to Level 1
      return {
        level: 1 as const,
        currentTiles: LEVEL_1_TILES,
        parentTile: undefined,
        activeTileId: undefined,
      };
    }

    // Level 2: Show children of selected parent
    if (parent.children && parent.children.length > 0) {
      // Try to determine active child from URL
      let activeId: string | undefined;
      if (tabFromUrl) {
        const mappedTile = mapTabToTile(tabFromUrl);
        if (mappedTile && parent.children.some((c) => c.id === mappedTile.id)) {
          activeId = mappedTile.id;
        }
      }

      return {
        level: 2 as const,
        currentTiles: LEVEL_1_TILES, // Always show Level 1 tiles in Row 1
        parentTile: parent,
        activeTileId: activeId,
      };
    }

    // Parent has no children - show as Level 1
    return {
      level: 1 as const,
      currentTiles: LEVEL_1_TILES,
      parentTile: undefined,
      activeTileId: selectedParentId,
    };
  }, [selectedParentId, tabFromUrl]);

  /**
   * Handle tile click
   * - If tile has children: select it as parent (Level 1 -> Level 2)
   * - If tile has route: navigation handled by TileNavigationGrid
   */
  const handleTileClick = useCallback(
    (tile: TileConfig) => {
      if (tile.children && tile.children.length > 0) {
        // Tile has children - show them (subdivision to Level 2)
        setSelectedParentId(tile.id);
      } else {
        // Tile will navigate via its route
        // Set as active tile ID for visual feedback
        setSelectedParentId(null);
      }
    },
    []
  );

  /**
   * Handle back navigation (Level 2 -> Level 1)
   */
  const handleBack = useCallback(() => {
    setSelectedParentId(null);

    // Update URL to remove tab/section params
    const newUrl = `/projects/${projectId}`;
    router.push(newUrl);
  }, [projectId, router]);

  /**
   * Reset to Level 1 (public API)
   */
  const resetToLevel1 = useCallback(() => {
    setSelectedParentId(null);
  }, []);

  return {
    currentTiles,
    level,
    parentTile,
    activeTileId,
    handleTileClick,
    handleBack,
    resetToLevel1,
  };
}
