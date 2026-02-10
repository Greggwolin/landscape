/**
 * Tile Configuration for Project Navigation
 *
 * This configuration provides a unified tile system that works across all project types.
 * 7 tiles are always visible with contextual labels based on project type.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Project Type Mapping
// ─────────────────────────────────────────────────────────────────────────────

export type ProjectTypeCode = 'LAND' | 'MF' | 'OFF' | 'RET' | 'IND' | 'HTL' | 'MXU';

export type ProjectTypeCategory = 'land_development' | 'multifamily' | 'office' | 'retail' | 'industrial' | 'hotel' | 'mixed_use';

/** Short code mapping (e.g., 'MF' → 'multifamily') */
export const PROJECT_TYPE_MAP: Record<ProjectTypeCode, ProjectTypeCategory> = {
  LAND: 'land_development',
  MF: 'multifamily',
  OFF: 'office',
  RET: 'retail',
  IND: 'industrial',
  HTL: 'hotel',
  MXU: 'mixed_use',
};

/**
 * Extended mapping for descriptive project subtypes from database taxonomy.
 * Maps full subtype names (e.g., "Garden Multifamily") to categories.
 * Case-insensitive lookup.
 */
const PROJECT_SUBTYPE_MAP: Record<string, ProjectTypeCategory> = {
  // Land Development subtypes
  'master planned community': 'land_development',
  'subdivision': 'land_development',
  'infill development': 'land_development',
  'entitled land': 'land_development',
  'raw land': 'land_development',
  'multifamily development': 'land_development',
  'commercial development': 'land_development',
  'industrial development': 'land_development',
  'mixed-use development': 'land_development',

  // Multifamily Income subtypes
  'garden multifamily': 'multifamily',
  'garden-style apartment': 'multifamily',
  'mid-rise multifamily': 'multifamily',
  'mid-rise apartment': 'multifamily',
  'high-rise multifamily': 'multifamily',
  'high-rise apartment': 'multifamily',
  'student housing': 'multifamily',
  'senior housing': 'multifamily',
  'affordable housing': 'multifamily',
  'workforce housing': 'multifamily',
  'luxury apartment': 'multifamily',

  // Office Income subtypes
  'class a office': 'office',
  'class b office': 'office',
  'class c office': 'office',
  'medical office': 'office',
  'flex/r&d': 'office',
  'coworking': 'office',
  'government': 'office',

  // Retail Income subtypes
  'neighborhood retail': 'retail',
  'neighborhood center': 'retail',
  'community retail': 'retail',
  'community center': 'retail',
  'power center': 'retail',
  'lifestyle center': 'retail',
  'strip center': 'retail',
  'regional mall': 'retail',
  'single-tenant retail': 'retail',
  'outlet center': 'retail',

  // Industrial Income subtypes
  'warehouse/distribution': 'industrial',
  'manufacturing': 'industrial',
  'flex space': 'industrial',
  'cold storage': 'industrial',
  'self-storage': 'industrial',
  'data center': 'industrial',
  'last-mile delivery': 'industrial',

  // Hotel subtypes
  'hotel': 'hotel',
  'full-service hotel': 'hotel',
  'limited-service hotel': 'hotel',
  'extended stay': 'hotel',
  'boutique hotel': 'hotel',
  'resort': 'hotel',
  'casino hotel': 'hotel',

  // Mixed-Use subtypes
  'mixed-use office/retail': 'mixed_use',
  'mixed-use office/multifamily': 'mixed_use',
  'mixed-use retail/multifamily': 'mixed_use',
  'vertical mixed-use': 'mixed_use',
  'horizontal mixed-use': 'mixed_use',
  'transit-oriented development': 'mixed_use',
  'live-work': 'mixed_use',
};

/**
 * Maps a project type code or subtype name to its category.
 * Supports both:
 * - Short codes: 'MF', 'LAND', 'OFF', etc.
 * - Descriptive subtypes: 'Garden Multifamily', 'Master Planned Community', etc.
 *
 * Returns 'land_development' as default for unknown types.
 */
export function getProjectCategory(code: string | undefined): ProjectTypeCategory {
  if (!code) return 'land_development';

  // First, try short code lookup (uppercase)
  const upperCode = code.toUpperCase() as ProjectTypeCode;
  if (PROJECT_TYPE_MAP[upperCode]) {
    return PROJECT_TYPE_MAP[upperCode];
  }

  // Second, try descriptive subtype lookup (lowercase)
  const lowerCode = code.toLowerCase();
  if (PROJECT_SUBTYPE_MAP[lowerCode]) {
    return PROJECT_SUBTYPE_MAP[lowerCode];
  }

  // Default to land_development for unrecognized types
  return 'land_development';
}

/**
 * Checks if project type is an income property (uses operations/valuation workflow)
 */
export function isIncomeProperty(code: string | undefined): boolean {
  const category = getProjectCategory(code);
  return category !== 'land_development';
}

// ─────────────────────────────────────────────────────────────────────────────
// Tile Colors - D12 Functional Color Coding
// EXACT VALUES — DO NOT MODIFY
// Grouped by function: Setup (Blue), Financial (Cyan/Teal), Output (Purple), Spatial (Green)
// Mode-stable: same colors in light and dark mode
// Tokens defined in src/styles/tokens.css (--nav-tab-*)
// ─────────────────────────────────────────────────────────────────────────────

export const TILE_COLORS = {
  // Setup Group (Blue)
  home: '#2563eb',        // Blue - Project
  planning: '#3b82f6',    // Blue - Property

  // Financial Group (Cyan/Teal)
  devOps: '#0891b2',      // Cyan - Operations/Budget
  feasVal: '#06b6d4',     // Cyan - Valuation
  capital: '#0d9488',     // Teal - Capitalization

  // Output Group (Purple)
  reports: '#7c3aed',     // Purple - Reports
  documents: '#8b5cf6',   // Purple - Documents

  // Spatial Group (Green)
  map: '#059669',         // Emerald - Map
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Tile Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface TileConfig {
  id: string;
  label: string | TileLabel;
  background: string;
  route: string;
  tabKey?: string;        // For query param routing (?tab=xxx)
  proOnly?: boolean;
  subtabs?: SubtabConfig[];
}

export interface TileLabel {
  primary: string;
  secondary?: string;     // For two-line labels like Feasibility/Valuation
}

export interface SubtabConfig {
  id: string;
  label: string;
  route: string;
  projectTypes?: ProjectTypeCategory[];  // If undefined, shows for all types
}

// ─────────────────────────────────────────────────────────────────────────────
// Static Tile Configuration (7 tiles, always visible)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get contextual label for tile position 3 based on project type.
 * All project types → "Operations"
 */
export function getTile3Label(_projectType: string | undefined): string | TileLabel {
  return 'Operations';
}

/**
 * Get the route for tile position 3 based on project type.
 */
export function getTile3Route(projectType: string | undefined): { route: string; tabKey?: string } {
  if (isIncomeProperty(projectType)) {
    return { route: '', tabKey: 'operations' };
  }
  return { route: '/budget' };
}

/**
 * Creates the 7 static tiles with contextual labels based on project type.
 */
export function createTileConfig(projectType: string | undefined): TileConfig[] {
  const isIncome = isIncomeProperty(projectType);

  return [
    // Position 1: Project Home
    {
      id: 'home',
      label: 'Project Home',
      background: TILE_COLORS.home,
      route: '',
      tabKey: isIncome ? 'project' : undefined,
    },

    // Position 2: Property
    {
      id: 'property',
      label: 'Property',
      background: TILE_COLORS.planning,
      route: isIncome ? '' : '/planning/market',
      tabKey: isIncome ? 'property' : undefined,
      subtabs: [
        { id: 'market', label: 'Market', route: '/planning/market' },
        { id: 'land-use', label: 'Land Use', route: '/planning/land-use', projectTypes: ['land_development'] },
        { id: 'parcels', label: 'Parcels', route: '/planning/parcels', projectTypes: ['land_development'] },
        { id: 'property', label: 'Property', route: '/planning/property', projectTypes: ['multifamily', 'office', 'retail', 'industrial', 'hotel', 'mixed_use'] },
      ],
    },

    // Position 3: Development (land) / Operations (income)
    {
      id: 'dev-ops',
      label: getTile3Label(projectType),
      background: TILE_COLORS.devOps,
      ...getTile3Route(projectType),
      subtabs: isIncome
        ? [
            { id: 'rent-roll', label: 'Rent Roll', route: '/operations/rent-roll' },
            { id: 'expenses', label: 'Expenses', route: '/operations/expenses' },
            { id: 'noi', label: 'NOI', route: '/operations/noi' },
          ]
        : [
            { id: 'budget', label: 'Budget', route: '/budget' },
            { id: 'schedule', label: 'Schedule', route: '/budget/schedule' },
            { id: 'sales', label: 'Sales', route: '/project/sales' },
            { id: 'draws', label: 'Draws', route: '/budget/draws' },
          ],
    },

    // Position 4: Feasibility/Valuation (two-line label)
    {
      id: 'feas-val',
      label: {
        primary: 'Feasibility',
        secondary: 'Valuation',
      },
      background: TILE_COLORS.feasVal,
      route: isIncome ? '' : '/results',
      tabKey: isIncome ? 'valuation' : undefined,
      subtabs: isIncome
        ? [
            { id: 'valuation', label: 'Valuation', route: '/valuation' },
            { id: 'sensitivity', label: 'Sensitivity', route: '/valuation/sensitivity' },
          ]
        : [
            { id: 'cashflow', label: 'Cash Flow', route: '/results' },
            { id: 'returns', label: 'Returns', route: '/results/returns' },
            { id: 'sensitivity', label: 'Sensitivity', route: '/results/sensitivity' },
          ],
    },

    // Position 5: Capitalization
    {
      id: 'capital',
      label: 'Capitalization',
      background: TILE_COLORS.capital,
      route: '/capitalization/equity',
      subtabs: [
        { id: 'equity', label: 'Equity', route: '/capitalization/equity' },
        { id: 'debt', label: 'Debt', route: '/capitalization/debt' },
      ],
    },

    // Position 6: Reports
    {
      id: 'reports',
      label: 'Reports',
      background: TILE_COLORS.reports,
      route: isIncome ? '' : '/analysis',
      tabKey: isIncome ? 'reports' : undefined,
      subtabs: [
        { id: 'summary', label: 'Summary', route: '/analysis' },
        { id: 'export', label: 'Export', route: '/analysis/export' },
      ],
    },

    // Position 7: Documents
    {
      id: 'documents',
      label: 'Documents',
      background: TILE_COLORS.documents,
      route: isIncome ? '' : '/documents',
      tabKey: isIncome ? 'documents' : undefined,
      subtabs: [
        { id: 'all', label: 'All Documents', route: '/documents' },
        { id: 'extractions', label: 'Extractions', route: '/documents/extractions' },
      ],
    },

    // Position 8: Map
    {
      id: 'map',
      label: 'Map',
      background: TILE_COLORS.map,
      route: '',
      tabKey: 'map',
      subtabs: [],  // No subtabs for now
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks if a label is a two-line TileLabel or a simple string.
 */
export function isTwoLineLabel(label: string | TileLabel): label is TileLabel {
  return typeof label === 'object' && 'primary' in label;
}

/**
 * Filters subtabs based on project type category.
 */
export function getVisibleSubtabs(
  subtabs: SubtabConfig[] | undefined,
  projectType: string | undefined
): SubtabConfig[] {
  if (!subtabs) return [];

  const category = getProjectCategory(projectType);

  return subtabs.filter(subtab => {
    if (!subtab.projectTypes) return true;
    return subtab.projectTypes.includes(category);
  });
}
