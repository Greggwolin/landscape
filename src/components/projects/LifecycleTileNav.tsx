'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';

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
  tierLevel: 'analyst' | 'pro';
}

const TILES: TileConfig[] = [
  {
    id: 'acquisition',
    label: 'Acquisition',
    colorClass: 'bg-info-subtle',
    textClass: 'text-info-emphasis',
    borderClass: 'border-info',
    route: '/acquisition'
  },
  {
    id: 'planning',
    label: 'Planning &\nEngineering',
    colorClass: 'bg-success-subtle',
    textClass: 'text-success-emphasis',
    borderClass: 'border-success',
    route: '/planning/market'
  },
  {
    id: 'development',
    label: 'Development',
    colorClass: 'bg-warning-subtle',
    textClass: 'text-warning-emphasis',
    borderClass: 'border-warning',
    route: '/development/phasing'
  },
  {
    id: 'sales',
    label: 'Sales &\nMarketing',
    colorClass: 'bg-primary-subtle',
    textClass: 'text-primary-emphasis',
    borderClass: 'border-primary',
    route: '/sales-marketing'
  },
  {
    id: 'capitalization',
    label: 'Capitalization\nDebt/Equity',
    colorClass: 'bg-danger-subtle',
    textClass: 'text-danger-emphasis',
    borderClass: 'border-danger',
    route: '/capitalization',
    proOnly: true
  },
  {
    id: 'results',
    label: 'Project\nResults',
    colorClass: 'bg-secondary-subtle',
    textClass: 'text-secondary-emphasis',
    borderClass: 'border-secondary',
    route: '/results'
  },
  {
    id: 'documents',
    label: 'Documents',
    colorClass: 'bg-dark-subtle',
    textClass: 'text-dark-emphasis',
    borderClass: 'border-dark',
    route: '/documents'
  },
];

export function LifecycleTileNav({ projectId, tierLevel }: LifecycleTileNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Filter tiles based on tier level
  const visibleTiles = TILES.filter(tile => {
    if (tile.proOnly && tierLevel !== 'pro') return false;
    return true;
  });

  // Check if a tile is active based on current path
  const isActive = (tileRoute: string) => {
    return pathname.includes(`/projects/${projectId}${tileRoute}`);
  };

  // Navigate to tile route
  const handleTileClick = (route: string) => {
    router.push(`/projects/${projectId}${route}`);
  };

  return (
    <div className="lifecycle-tile-nav d-flex gap-3 overflow-x-auto mb-4 pb-2">
      {visibleTiles.map(tile => {
        const active = isActive(tile.route);

        return (
          <div
            key={tile.id}
            className={`
              tile rounded-3 p-3 text-center
              ${tile.colorClass}
              ${tile.textClass}
              ${active ? `border border-3 ${tile.borderClass}` : ''}
            `}
            onClick={() => handleTileClick(tile.route)}
            style={{
              minWidth: '140px',
              whiteSpace: 'pre-line',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: active ? '0 0 0 0.2rem rgba(var(--bs-primary-rgb), 0.25)' : 'none'
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
