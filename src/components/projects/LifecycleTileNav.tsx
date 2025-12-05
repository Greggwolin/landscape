'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUserTier } from '@/hooks/useUserTier';
import { useProjectMode } from '@/contexts/ProjectModeContext';

interface TileConfig {
  id: string;
  label: string;
  route: string;
  background: string;
  proOnly?: boolean;
}

interface LifecycleTileNavProps {
  projectId: string;
}

const STANDARD_TILES: TileConfig[] = [
  {
    id: 'home',
    label: 'Project Home',
    background: '#3d99f5',
    route: '' // Empty route = base project route
  },
  {
    id: 'planning',
    label: 'Planning',
    background: '#57c68a',
    route: '/planning/market'
  },
  {
    id: 'budget',
    label: 'Budget',
    background: '#7a80ec',
    route: '/budget'
  },
  {
    id: 'sales',
    label: 'Sales',
    background: '#e64072',
    route: '/sales-marketing'
  },
  {
    id: 'cashflow',
    label: 'Cash Flow',
    background: '#f2c40d',
    route: '/results'
  },
  {
    id: 'waterfall',
    label: 'Waterfall',
    background: '#d97706',
    route: '/capitalization/equity'
  },
  {
    id: 'reports',
    label: 'Reports',
    background: '#6b7785',
    route: '/analysis'
  },
  {
    id: 'documents',
    label: 'Documents',
    background: '#272d35',
    route: '/documents'
  }
];

const NAPKIN_TILES: TileConfig[] = [
  {
    id: 'home',
    label: 'Project Home',
    background: '#3d99f5',
    route: ''
  },
  {
    id: 'planning',
    label: 'Planning',
    background: '#57c68a',
    route: '/planning/market'
  },
  {
    id: 'budget',
    label: 'Budget',
    background: '#7a80ec',
    route: '/budget'
  },
  {
    id: 'waterfall',
    label: 'Waterfall',
    background: '#d97706',
    route: '/napkin/waterfall'
  },
];

const NAV_TILES: Record<'napkin' | 'standard', TileConfig[]> = {
  napkin: NAPKIN_TILES,
  standard: STANDARD_TILES
};

export function LifecycleTileNav({ projectId }: LifecycleTileNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: tierLevel, isLoading } = useUserTier();
  const { mode } = useProjectMode();

  // Detect if we're in dark mode
  const isDarkMode = typeof window !== 'undefined' &&
    document.documentElement.getAttribute('data-coreui-theme') === 'dark';

  const tiles = NAV_TILES[mode] ?? STANDARD_TILES;

  const visibleTiles = tiles.filter((tile: TileConfig) => {
    if (tile.proOnly && tierLevel !== 'pro') return false;
    return true;
  });

  // Show loading state while fetching tier
  if (isLoading) {
    return (
      <div className="d-flex gap-3 overflow-x-auto align-items-center">
        <div className="text-muted small">Loading navigation...</div>
      </div>
    );
  }

  // Check if a tile is active based on current path
  const isActive = (tile: TileConfig) => {
    if (tile.route === '') {
      const projectBasePath = `/projects/${projectId}`;
      return pathname === projectBasePath || pathname === `${projectBasePath}/`;
    }
    return pathname.startsWith(`/projects/${projectId}${tile.route}`);
  };

  // Navigate to tile route
  const handleTileClick = (tile: TileConfig) => {
    if (tile.route === '') {
      router.push(`/projects/${projectId}`);
      return;
    }
    router.push(`/projects/${projectId}${tile.route}`);
  };

  return (
    <div className="d-flex gap-3 overflow-x-auto align-items-center">
      {visibleTiles.map(tile => {
        const active = isActive(tile);
        const backgroundColor = tile.background;
        const activeBorderColor = isDarkMode ? '#ffffff' : '#6b7785';
        const borderWidth = isDarkMode ? '3px' : '2px';

        return (
          <div
            key={tile.id}
            className="tile rounded-3 px-4 text-center"
            onClick={() => handleTileClick(tile)}
            style={{
              backgroundColor,
              width: '140px',
              height: '81px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              border: active ? `${borderWidth} solid ${activeBorderColor}` : `${borderWidth} solid transparent`,
              flexShrink: 0,
              color: '#ffffff'
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.opacity = '0.85';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span className="fw-semibold">{tile.label}</span>
          </div>
        );
      })}
    </div>
  );
}
