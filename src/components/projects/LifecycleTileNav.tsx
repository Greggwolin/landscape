'use client';

import React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useUserTier } from '@/hooks/useUserTier';
import {
  createTileConfig,
  isTwoLineLabel,
  TileConfig,
} from './tiles/tileConfig';

interface LifecycleTileNavProps {
  projectId: string;
  propertyType?: string;
}

export function LifecycleTileNav({ projectId, propertyType }: LifecycleTileNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: tierLevel, isLoading } = useUserTier();
  const standardHomePath = `/projects/${projectId}`;

  // Detect if we're in dark mode
  const isDarkMode = typeof window !== 'undefined' &&
    document.documentElement.getAttribute('data-coreui-theme') === 'dark';

  // Get tiles based on project type (7 static tiles)
  const tiles = createTileConfig(propertyType);

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

  // Check if a tile is active based on current path or query param
  const isActive = (tile: TileConfig) => {
    // Income property tiles use query param routing
    if (tile.tabKey) {
      const currentTab = searchParams.get('tab') || 'project';
      const isProjectBase = pathname === standardHomePath || pathname === `${standardHomePath}/`;
      return isProjectBase && currentTab === tile.tabKey;
    }

    if (tile.route === '') {
      const projectBasePath = `/projects/${projectId}`;
      return pathname === projectBasePath || pathname === `${projectBasePath}/`;
    }
    return pathname.startsWith(`/projects/${projectId}${tile.route}`);
  };

  // Navigate to tile route
  const handleTileClick = (tile: TileConfig) => {
    // Income property tiles use query param routing
    if (tile.tabKey) {
      const tabParam = tile.tabKey === 'project' ? '' : `?tab=${tile.tabKey}`;
      router.push(`${standardHomePath}${tabParam}`);
      return;
    }

    if (tile.route === '') {
      router.push(`/projects/${projectId}`);
      return;
    }
    router.push(`/projects/${projectId}${tile.route}`);
  };

  // Render tile label (handles both simple string and two-line labels)
  const renderLabel = (label: string | { primary: string; secondary?: string }) => {
    if (isTwoLineLabel(label)) {
      return (
        <div className="d-flex flex-column align-items-center" style={{ lineHeight: 1.2 }}>
          <span className="fw-semibold">{label.primary}</span>
          <div
            style={{
              width: '100%',
              height: '1px',
              backgroundColor: 'var(--surface-card-header)',
              margin: '2px 0',
            }}
          />
          <span className="fw-semibold">{label.secondary}</span>
        </div>
      );
    }
    // Handle "Project Home" as two lines
    if (label === 'Project Home') {
      return (
        <div className="d-flex flex-column align-items-center" style={{ lineHeight: 1.2 }}>
          <span className="fw-semibold">Project</span>
          <span className="fw-semibold">Home</span>
        </div>
      );
    }
    return <span className="fw-semibold">{label}</span>;
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
            {renderLabel(tile.label)}
          </div>
        );
      })}
    </div>
  );
}
