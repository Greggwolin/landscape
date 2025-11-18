/**
 * ProgressiveTile - Individual navigation tile with status indicators
 *
 * Part of the Progressive Tile Navigation System.
 * Displays a clickable tile with:
 * - Color-coded background (600-weight pattern)
 * - Optional icon
 * - Status indicator dot
 * - Size variants (large, medium, small)
 * - Hover effects and transitions
 *
 * @version 1.0
 * @date 2025-11-18
 */
'use client';

import React from 'react';
import * as LucideIcons from 'lucide-react';
import { type TileConfig, type TileStatus } from '@/config/tile-hierarchy';

export interface ProgressiveTileProps {
  /** Tile configuration */
  config: TileConfig;

  /** Click handler */
  onClick?: () => void;

  /** Whether this tile is currently active */
  active?: boolean;

  /** Whether this tile is selected as parent (showing children) */
  selected?: boolean;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Get status indicator color
 */
function getStatusColor(status?: TileStatus): string {
  switch (status) {
    case 'complete':
      return 'bg-green-400';
    case 'in-progress':
      return 'bg-yellow-400';
    case 'not-started':
      return 'bg-gray-400';
    case 'empty':
      return 'bg-gray-300';
    default:
      return 'bg-gray-300';
  }
}

/**
 * Get icon component from lucide-react
 */
function getIconComponent(iconName?: string): React.ComponentType<{ size?: number; className?: string }> | null {
  if (!iconName) return null;

  // Convert kebab-case to PascalCase (e.g., 'trending-up' -> 'TrendingUp')
  const pascalName = iconName
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  // Get icon from lucide-react exports
  const IconComponent = (LucideIcons as Record<string, any>)[pascalName];

  return IconComponent || null;
}

/**
 * Get size-specific classes
 */
function getSizeClasses(size: 'large' | 'medium' | 'small'): string {
  switch (size) {
    case 'large':
      return 'p-6 min-h-[160px]';
    case 'medium':
      return 'p-4 min-h-[120px]';
    case 'small':
      return 'px-4 py-2 min-h-[48px]'; // Compact horizontal tile
  }
}

/**
 * ProgressiveTile Component
 *
 * A clickable navigation tile that can represent either:
 * - Level 1: Main category (large, subdivides into children)
 * - Level 2: Sub-category (medium/small, navigates directly)
 */
export default function ProgressiveTile({
  config,
  onClick,
  active = false,
  selected = false,
  className = '',
}: ProgressiveTileProps) {
  const IconComponent = getIconComponent(config.iconName);
  const statusColor = getStatusColor(config.status);
  const sizeClasses = getSizeClasses(config.size);

  // Use horizontal layout for small tiles
  const isHorizontal = config.size === 'small';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        progressive-tile
        relative flex ${isHorizontal ? 'flex-row items-center gap-3' : 'flex-col justify-between'}
        rounded-lg shadow-md
        transition-all duration-200
        hover:shadow-lg hover:scale-[1.02]
        ${config.color} text-white
        ${sizeClasses}
        ${active ? 'ring-4 ring-white ring-opacity-50' : ''}
        ${selected ? 'ring-2 ring-white' : ''}
        ${className}
      `.trim()}
      title={config.description}
    >
      {/* Status Indicator Dot (top-right) */}
      {config.status && (
        <div className={`absolute ${isHorizontal ? 'top-2 right-2' : 'top-3 right-3'}`}>
          <div className={`${isHorizontal ? 'w-2.5 h-2.5' : 'w-3 h-3'} rounded-full ${statusColor} border-2 border-white shadow-sm`} />
        </div>
      )}

      {/* Icon */}
      {IconComponent && (
        <div className="flex-shrink-0">
          <IconComponent size={config.size === 'large' ? 32 : config.size === 'medium' ? 24 : 20} className="opacity-90" />
        </div>
      )}

      {/* Tile Content */}
      <div className={`flex ${isHorizontal ? 'flex-row items-center gap-2 flex-1' : 'flex-col gap-3 flex-1'}`}>
        {/* Label */}
        <div className={isHorizontal ? 'flex-1' : 'text-left'}>
          <h3 className={`font-semibold ${config.size === 'large' ? 'text-xl' : config.size === 'medium' ? 'text-base' : 'text-sm'}`}>
            {config.label}
          </h3>

          {/* Description (only for large tiles) */}
          {config.size === 'large' && config.description && (
            <p className="text-sm opacity-80 mt-1 line-clamp-2">{config.description}</p>
          )}
        </div>

        {/* Child Count Indicator (for tiles with children) */}
        {config.children && config.children.length > 0 && (
          <div className={`flex items-center gap-1 text-xs opacity-75 ${isHorizontal ? '' : 'mt-auto'}`}>
            <LucideIcons.ChevronRight size={config.size === 'small' ? 12 : 14} />
            <span className="whitespace-nowrap">{config.children.length}</span>
          </div>
        )}
      </div>
    </button>
  );
}
