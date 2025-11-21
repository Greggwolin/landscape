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
    id: 'home',
    label: 'Project Home',
    colorClass: 'bg-light',
    textClass: 'text-dark',
    borderClass: 'border-secondary',
    route: '' // Empty route = base project route
  },
  {
    id: 'acquisition',
    label: 'Acquisition',
    colorClass: 'bg-info',
    textClass: 'text-white',
    borderClass: 'border-info',
    route: '/acquisition'
  },
  {
    id: 'planning',
    label: 'Planning',
    colorClass: 'bg-success',
    textClass: 'text-white',
    borderClass: 'border-success',
    route: '/planning/market'
  },
  {
    id: 'development',
    label: 'Development',
    colorClass: 'bg-warning',
    textClass: 'text-dark',
    borderClass: 'border-warning',
    route: '/development/phasing'
  },
  {
    id: 'sales',
    label: 'Sales',
    colorClass: 'bg-primary',
    textClass: 'text-white',
    borderClass: 'border-primary',
    route: '/sales-marketing'
  },
  {
    id: 'capitalization',
    label: 'Capital',
    colorClass: 'bg-danger',
    textClass: 'text-white',
    borderClass: 'border-danger',
    route: '/capitalization',
    proOnly: true
  },
  {
    id: 'results',
    label: 'Results',
    colorClass: 'bg-secondary',
    textClass: 'text-white',
    borderClass: 'border-secondary',
    route: '/results'
  },
  {
    id: 'documents',
    label: 'Documents',
    colorClass: 'bg-dark',
    textClass: 'text-white',
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
    if (tileRoute === '') {
      // Home tile is active when on the exact project route (not a subroute)
      const projectBasePath = `/projects/${projectId}`;
      return pathname === projectBasePath || pathname === `${projectBasePath}/`;
    }
    return pathname.includes(`/projects/${projectId}${tileRoute}`);
  };

  // Navigate to tile route
  const handleTileClick = (route: string) => {
    if (route === '') {
      // Navigate to project home
      router.push(`/projects/${projectId}`);
    } else {
      router.push(`/projects/${projectId}${route}`);
    }
  };

  return (
    <div className="d-flex gap-2 overflow-x-auto align-items-center">
      {visibleTiles.map(tile => {
        const active = isActive(tile.route);

        return (
          <div
            key={tile.id}
            className={`
              tile rounded-2 px-3 py-2 text-center
              ${tile.colorClass}
              ${tile.textClass}
              ${active ? `border border-2 ${tile.borderClass}` : ''}
            `}
            onClick={() => handleTileClick(tile.route)}
            style={{
              minWidth: '100px',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              boxShadow: active ? '0 0 0 0.1rem rgba(var(--bs-primary-rgb), 0.25)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.opacity = '0.85';
                e.currentTarget.style.transform = 'translateY(-1px)';
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
