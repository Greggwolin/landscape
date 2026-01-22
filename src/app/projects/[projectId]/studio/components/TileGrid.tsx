'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import CIcon from '@coreui/icons-react';
import {
  cilHome,
  cilBuilding,
  cilChartLine,
  cilSearch,
  cilGraph,
  cilFile,
  cilFolder,
  cilPencil,
  cilDollar,
  cilClipboard,
  cilTag,
  cilSpeedometer,
} from '@coreui/icons';
import type { StudioTile, TileIconName } from '@/lib/utils/studioTiles';

// Map icon names to actual CoreUI icon objects
const ICON_MAP: Record<TileIconName, string[]> = {
  cilHome,
  cilBuilding,
  cilChartLine,
  cilSearch,
  cilGraph,
  cilFile,
  cilFolder,
  cilPencil,
  cilDollar,
  cilClipboard,
  cilTag,
  cilSpeedometer,
};

interface TileGridProps {
  projectId: number;
  tiles: StudioTile[];
}

export default function TileGrid({ projectId, tiles }: TileGridProps) {
  const router = useRouter();
  const pathname = usePathname();

  const segments = pathname?.split('/') || [];
  const studioIndex = segments.indexOf('studio');
  const activeSegment = studioIndex >= 0 ? segments[studioIndex + 1] : undefined;
  const activeTileId = activeSegment || 'home';

  const getTileUrl = (tile: StudioTile) => {
    const base = tile.route
      ? `/projects/${projectId}/studio/${tile.route}`
      : `/projects/${projectId}/studio`;
    if (tile.tabs && tile.tabs.length > 0) {
      return `${base}?tab=${tile.tabs[0].id}`;
    }
    return base;
  };

  const handleTileClick = (tile: StudioTile) => {
    router.push(getTileUrl(tile));
  };

  return (
    <div className="studio-tile-grid">
      <div className="studio-tile-grid-header">
        <span className="studio-tile-grid-title">Studio</span>
      </div>
      <div className="studio-tile-grid-body">
        {tiles.map((tile) => {
          const isActive = activeTileId === (tile.route || 'home') || activeTileId === tile.id;
          const iconDef = ICON_MAP[tile.icon];
          return (
            <button
              key={tile.id}
              type="button"
              className={`studio-tile ${isActive ? 'studio-tile-active' : ''}`}
              style={{ background: tile.gradient }}
              onClick={() => handleTileClick(tile)}
              aria-current={isActive ? 'page' : undefined}
            >
              <CIcon icon={iconDef} className="studio-tile-icon" />
              <span className="studio-tile-label">{tile.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
