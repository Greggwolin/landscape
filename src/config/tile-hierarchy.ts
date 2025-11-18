/**
 * Progressive Tile Navigation Hierarchy Configuration
 *
 * Defines the tile structure for the progressive navigation system.
 * Maps directly to the original tab system from projectTabs.ts
 *
 * IMPORTANT: This must match the original tab structure exactly:
 * - LAND projects: Project, Planning, Budget, Operations, Sales, Feasibility, Capitalization, Reports, Documents
 * - Income properties: Project, Property, Operations, Valuation, Capitalization, Reports, Documents
 *
 * @version 2.0
 * @date 2025-11-18
 */

export type TileSize = 'large' | 'medium' | 'small';
export type TileStatus = 'complete' | 'in-progress' | 'not-started' | 'empty';

export interface TileConfig {
  /** Unique identifier for the tile */
  id: string;

  /** Display label */
  label: string;

  /** Icon name from lucide-react */
  iconName?: string;

  /** Background color (Tailwind class, e.g., 'bg-blue-600') */
  color: string;

  /** Tile size variant */
  size: TileSize;

  /** Completion status (calculated dynamically) */
  status?: TileStatus;

  /** Child tiles (Level 2) */
  children?: TileConfig[];

  /** Route to navigate to when clicked (if no children) */
  route?: string;

  /** Legacy tab IDs that map to this tile (for URL compatibility) */
  mapsToTabs?: string[];

  /** Description for tooltip */
  description?: string;

  /** Whether this tile is currently active (matches current URL) */
  active?: boolean;

  /** Whether this tile is selected as the parent (showing children) */
  selected?: boolean;
}

/**
 * Level 1 Tiles - Main Navigation Categories
 *
 * These are grouped categories that subdivide into the actual tabs.
 * Each Level 1 tile contains Level 2 tiles that map to the original tabs.
 */
export const LEVEL_1_TILES: TileConfig[] = [
  {
    id: 'property',
    label: 'Property',
    iconName: 'building',
    color: 'bg-blue-600',
    size: 'small',
    description: 'Project and property information',
    mapsToTabs: ['project', 'property'],
    children: [
      {
        id: 'project-tab',
        label: 'Project',
        color: 'bg-blue-500',
        size: 'medium',
        route: '/projects/[projectId]?tab=project',
        description: 'Project overview and profile',
      },
      {
        id: 'property-tab',
        label: 'Property',
        color: 'bg-blue-500',
        size: 'medium',
        route: '/projects/[projectId]?tab=property',
        description: 'Property details (Income properties only)',
      },
    ],
  },
  {
    id: 'finance',
    label: 'Budget & Finance',
    iconName: 'calculator',
    color: 'bg-green-600',
    size: 'small',
    description: 'Financial analysis and budgeting',
    mapsToTabs: ['budget', 'operations', 'feasibility', 'capitalization'],
    children: [
      {
        id: 'budget-tab',
        label: 'Budget',
        color: 'bg-green-500',
        size: 'medium',
        route: '/projects/[projectId]?tab=budget',
        description: 'Development budget',
      },
      {
        id: 'operations-tab',
        label: 'Operations',
        color: 'bg-green-500',
        size: 'medium',
        route: '/projects/[projectId]?tab=operations',
        description: 'Operating expenses',
      },
      {
        id: 'feasibility-tab',
        label: 'Feasibility',
        color: 'bg-green-500',
        size: 'medium',
        route: '/projects/[projectId]?tab=feasibility',
        description: 'Financial feasibility analysis',
      },
      {
        id: 'capitalization-tab',
        label: 'Capitalization',
        color: 'bg-green-500',
        size: 'medium',
        route: '/projects/[projectId]?tab=capitalization',
        description: 'Capital structure and financing',
      },
    ],
  },
  {
    id: 'planning',
    label: 'Planning & Sales',
    iconName: 'layout-grid',
    color: 'bg-purple-600',
    size: 'small',
    description: 'Site planning and sales analysis',
    mapsToTabs: ['planning', 'sales', 'valuation'],
    children: [
      {
        id: 'planning-tab',
        label: 'Planning',
        color: 'bg-purple-500',
        size: 'medium',
        route: '/projects/[projectId]?tab=planning',
        description: 'Site planning and design (Land projects)',
      },
      {
        id: 'sales-tab',
        label: 'Sales & Absorption',
        color: 'bg-purple-500',
        size: 'medium',
        route: '/projects/[projectId]?tab=sales',
        description: 'Sales pricing and absorption',
      },
      {
        id: 'valuation-tab',
        label: 'Valuation',
        color: 'bg-purple-500',
        size: 'medium',
        route: '/projects/[projectId]?tab=valuation',
        description: 'Property valuation (Income properties)',
      },
    ],
  },
  {
    id: 'reports',
    label: 'Reports & Docs',
    iconName: 'file-text',
    color: 'bg-orange-600',
    size: 'small',
    description: 'Reports and documentation',
    mapsToTabs: ['reports', 'documents'],
    children: [
      {
        id: 'reports-tab',
        label: 'Reports',
        color: 'bg-orange-500',
        size: 'medium',
        route: '/projects/[projectId]?tab=reports',
        description: 'Generated reports and analytics',
      },
      {
        id: 'documents-tab',
        label: 'Documents',
        color: 'bg-orange-500',
        size: 'medium',
        route: '/projects/[projectId]?tab=documents',
        description: 'Project documentation',
      },
    ],
  },
];

/**
 * Get tile configuration by ID
 */
export function getTileById(id: string): TileConfig | undefined {
  // Search Level 1 tiles
  for (const tile of LEVEL_1_TILES) {
    if (tile.id === id) return tile;

    // Search Level 2 tiles (children)
    if (tile.children) {
      const child = tile.children.find((c) => c.id === id);
      if (child) return child;
    }
  }

  return undefined;
}

/**
 * Get Level 1 parent tile for a given tile ID
 */
export function getParentTile(tileId: string): TileConfig | undefined {
  for (const tile of LEVEL_1_TILES) {
    if (tile.id === tileId) return undefined; // Level 1 tiles have no parent

    if (tile.children?.some((c) => c.id === tileId)) {
      return tile;
    }
  }

  return undefined;
}

/**
 * Map legacy tab ID to corresponding tile
 * Used for backward compatibility with existing URL structure
 */
export function mapTabToTile(tabId: string): TileConfig | undefined {
  for (const tile of LEVEL_1_TILES) {
    // Check if Level 1 tile maps to this tab
    if (tile.mapsToTabs?.includes(tabId)) {
      // If tile has children, try to find specific child that matches
      if (tile.children) {
        for (const child of tile.children) {
          // Check if child's route includes the tab
          if (child.route?.includes(`tab=${tabId}`)) {
            return child;
          }
        }
        // Default to first child if no specific match
        return tile.children[0];
      }
      return tile;
    }

    // Check Level 2 tiles (children)
    if (tile.children) {
      for (const child of tile.children) {
        if (child.route?.includes(`tab=${tabId}`)) {
          return child;
        }
      }
    }
  }

  return undefined;
}

/**
 * Get breadcrumb path for a given tile ID
 * Returns array of tiles from Level 1 to the target tile
 */
export function getTileBreadcrumb(tileId: string): TileConfig[] {
  const path: TileConfig[] = [];

  // Find the tile and its parent
  const parent = getParentTile(tileId);
  const tile = getTileById(tileId);

  if (!tile) return path;

  if (parent) {
    path.push(parent);
  }

  path.push(tile);

  return path;
}
