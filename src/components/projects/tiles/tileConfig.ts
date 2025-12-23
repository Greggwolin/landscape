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
 * Maps a project type code to its category.
 * Returns 'land_development' as default for unknown types.
 */
export function getProjectCategory(code: string | undefined): ProjectTypeCategory {
  if (!code) return 'land_development';
  const upperCode = code.toUpperCase() as ProjectTypeCode;
  return PROJECT_TYPE_MAP[upperCode] ?? 'land_development';
}

/**
 * Checks if project type is an income property (uses operations/valuation workflow)
 */
export function isIncomeProperty(code: string | undefined): boolean {
  const category = getProjectCategory(code);
  return category !== 'land_development';
}

// ─────────────────────────────────────────────────────────────────────────────
// Tile Colors (extracted from existing implementation)
// ─────────────────────────────────────────────────────────────────────────────

export const TILE_COLORS = {
  home: '#3d99f5',        // Blue
  planning: '#57c68a',    // Green
  devOps: '#7a80ec',      // Purple (Development/Operations)
  feasVal: '#f2c40d',     // Yellow (Feasibility/Valuation)
  capital: '#9b59b6',     // Purple (Capitalization)
  reports: '#6b7785',     // Gray
  documents: '#272d35',   // Dark Gray
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
 * Land Development → "Development"
 * Income Properties → "Operations"
 */
export function getTile3Label(projectType: string | undefined): string {
  return isIncomeProperty(projectType) ? 'Operations' : 'Development';
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
      route: isIncome ? '' : '/capitalization/equity',
      tabKey: isIncome ? 'capitalization' : undefined,
      proOnly: true,
      subtabs: [
        { id: 'equity', label: 'Equity', route: '/capitalization/equity' },
        { id: 'debt', label: 'Debt', route: '/capitalization/debt' },
        { id: 'waterfall', label: 'Waterfall', route: '/capitalization/waterfall' },
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
