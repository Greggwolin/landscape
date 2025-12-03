'use client';

import React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useUserTier } from '@/hooks/useUserTier';

interface TileConfig {
  id: string;
  label: string;
  colorClass: string;
  textClass: string;
  borderClass: string;
  route: string;
  proOnly?: boolean;
}

interface LifecycleTileNavProps {
  projectId: string;
  propertyType?: string;
}

// Land Development Tiles
const LAND_DEV_TILES: TileConfig[] = [
  {
    id: 'home',
    label: 'Project Home',
    colorClass: '', // Custom color below
    textClass: 'text-white',
    borderClass: 'border-primary',
    route: '' // Empty route = base project route
  },
  {
    id: 'acquisition',
    label: 'Acquisition',
    colorClass: '', // Use Info base: #7a80ec
    textClass: 'text-white',
    borderClass: 'border-info',
    route: '/acquisition'
  },
  {
    id: 'planning',
    label: 'Planning',
    colorClass: '', // Use Success base: #57c68a
    textClass: 'text-white',
    borderClass: 'border-success',
    route: '/planning/market'
  },
  {
    id: 'development',
    label: 'Development',
    colorClass: '', // Use Warning base: #f2c40d
    textClass: 'text-dark',
    borderClass: 'border-warning',
    route: '/development/phasing'
  },
  {
    id: 'sales',
    label: 'Sales',
    colorClass: '', // Use Primary base: #3d99f5
    textClass: 'text-white',
    borderClass: 'border-primary',
    route: '/sales-marketing'
  },
  {
    id: 'capitalization',
    label: 'Capital',
    colorClass: '', // Use Danger base: #e64072
    textClass: 'text-white',
    borderClass: 'border-danger',
    route: '/capitalization',
    proOnly: true
  },
  {
    id: 'analysis',
    label: 'Analysis',
    colorClass: '', // Use Secondary base: #6b7785
    textClass: 'text-white',
    borderClass: 'border-secondary',
    route: '/analysis'
  },
  {
    id: 'documents',
    label: 'Documents',
    colorClass: '', // Use dark gray
    textClass: 'text-white',
    borderClass: 'border-dark',
    route: '/documents'
  },
];

// Multifamily / Income Property Tiles
const MULTIFAMILY_TILES: TileConfig[] = [
  {
    id: 'project',
    label: 'Project',
    colorClass: '',
    textClass: 'text-white',
    borderClass: 'border-light',
    route: '' // Query param: ?tab=project
  },
  {
    id: 'property',
    label: 'Property',
    colorClass: '',
    textClass: 'text-white',
    borderClass: 'border-primary',
    route: '' // Query param: ?tab=property
  },
  {
    id: 'operations',
    label: 'Operations',
    colorClass: '',
    textClass: 'text-white',
    borderClass: 'border-success',
    route: '' // Query param: ?tab=operations
  },
  {
    id: 'valuation',
    label: 'Valuation',
    colorClass: '',
    textClass: 'text-white',
    borderClass: 'border-info',
    route: '' // Query param: ?tab=valuation
  },
  {
    id: 'capitalization',
    label: 'Capitalization',
    colorClass: '',
    textClass: 'text-white',
    borderClass: 'border-danger',
    route: '', // Query param: ?tab=capitalization
    proOnly: true
  },
  {
    id: 'reports',
    label: 'Reports',
    colorClass: '',
    textClass: 'text-white',
    borderClass: 'border-warning',
    route: '' // Query param: ?tab=reports
  },
  {
    id: 'documents',
    label: 'Documents',
    colorClass: '',
    textClass: 'text-white',
    borderClass: 'border-secondary',
    route: '' // Query param: ?tab=documents
  },
];

export function LifecycleTileNav({ projectId, propertyType }: LifecycleTileNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: tierLevel, isLoading } = useUserTier();

  // Detect if we're in dark mode
  const isDarkMode = typeof window !== 'undefined' &&
    document.documentElement.getAttribute('data-coreui-theme') === 'dark';

  // Determine which tile set to use based on property type
  const propertyTypeCode = propertyType?.toUpperCase() || '';
  const isMultifamily = ['MF', 'OFF', 'RET', 'IND', 'HTL', 'MXU'].includes(propertyTypeCode);
  const isLandDev = ['LAND', 'MPC'].includes(propertyTypeCode);

  // Select tile configuration
  const tiles = isMultifamily ? MULTIFAMILY_TILES : LAND_DEV_TILES;

  // Filter tiles based on tier level
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

  // Check if a tile is active based on current path or query params
  const isActive = (tile: TileConfig) => {
    if (isMultifamily) {
      // For multifamily, check query parameter
      const currentTab = searchParams.get('tab') || 'project';
      return currentTab === tile.id;
    } else {
      // For land dev, check route
      if (tile.route === '') {
        // Home tile is active when on the exact project route (not a subroute)
        const projectBasePath = `/projects/${projectId}`;
        return pathname === projectBasePath || pathname === `${projectBasePath}/`;
      }

      // Extract the lifecycle stage from the tile route (first segment after projectId)
      // e.g., '/planning/market' -> 'planning', '/development/phasing' -> 'development'
      const lifecycleStage = tile.route.split('/')[1]; // Get first segment after leading slash

      // Check if current path is within this lifecycle stage
      // e.g., for planning tile, match both /planning/market and /planning/budget
      return pathname.includes(`/projects/${projectId}/${lifecycleStage}`);
    }
  };

  // Navigate to tile route
  const handleTileClick = (tile: TileConfig) => {
    if (isMultifamily) {
      // Use query param routing for multifamily
      router.push(`/projects/${projectId}?tab=${tile.id}`);
    } else {
      // Use route-based navigation for land dev
      if (tile.route === '') {
        router.push(`/projects/${projectId}`);
      } else {
        router.push(`/projects/${projectId}${tile.route}`);
      }
    }
  };

  // Get background color for each tile using CoreUI base brand colors
  const getTileBackgroundColor = (tileId: string): string => {
    // Land Development tiles
    if (isLandDev) {
      switch (tileId) {
        case 'home':
          return '#3d99f5'; // Primary base
        case 'acquisition':
          return '#7a80ec'; // Info base
        case 'planning':
          return '#e64072'; // Danger base
        case 'development':
          return '#f2c40d'; // Warning base
        case 'sales':
          return '#57c68a'; // Success base
        case 'capitalization':
          return '#e64072'; // Danger base
        case 'results':
          return '#6b7785'; // Secondary base
        case 'documents':
          return '#272d35'; // Secondary 800 (dark)
        default:
          return '#6b7785';
      }
    }

    // Multifamily tiles - same color sequence as land dev
    switch (tileId) {
      case 'project':
        return '#3d99f5'; // Primary base (same as home)
      case 'property':
        return '#7a80ec'; // Info base (same as acquisition)
      case 'operations':
        return '#e64072'; // Danger base (same as planning)
      case 'valuation':
        return '#f2c40d'; // Warning base (same as development)
      case 'capitalization':
        return '#57c68a'; // Success base (same as sales)
      case 'reports':
        return '#6b7785'; // Secondary base (same as results)
      case 'documents':
        return '#272d35'; // Dark gray (same as documents)
      default:
        return '#6b7785';
    }
  };

  return (
    <div className="d-flex gap-3 overflow-x-auto align-items-center">
      {visibleTiles.map(tile => {
        const active = isActive(tile);
        const backgroundColor = getTileBackgroundColor(tile.id);
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
