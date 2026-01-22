// CoreUI icon name type for tile icons
export type TileIconName = 'cilHome' | 'cilBuilding' | 'cilChartLine' | 'cilSearch' | 'cilGraph' | 'cilFile' | 'cilFolder' | 'cilPencil' | 'cilDollar' | 'cilClipboard' | 'cilTag' | 'cilSpeedometer';

export interface StudioTile {
  id: string;
  name: string;
  icon: TileIconName;
  route: string;
  gradient: string;
  tabs?: { id: string; label: string }[];
}

const INCOME_TILES: StudioTile[] = [
  { id: 'home', name: 'Project Home', icon: 'cilHome', route: '', gradient: 'linear-gradient(135deg, var(--studio-tile-home-from), var(--studio-tile-home-to))' },
  {
    id: 'property',
    name: 'Property',
    icon: 'cilBuilding',
    route: 'property',
    gradient: 'linear-gradient(135deg, var(--studio-tile-property-from), var(--studio-tile-property-to))',
    tabs: [
      { id: 'summary', label: 'Summary' },
      { id: 'units', label: 'Units' },
      { id: 'building', label: 'Building' },
    ],
  },
  {
    id: 'market',
    name: 'Market',
    icon: 'cilChartLine',
    route: 'market',
    gradient: 'linear-gradient(135deg, var(--studio-tile-market-from), var(--studio-tile-market-to))',
    tabs: [
      { id: 'overview', label: 'Overview' },
      { id: 'comps', label: 'Comps' },
      { id: 'trends', label: 'Trends' },
    ],
  },
  {
    id: 'hbu',
    name: 'Highest & Best Use',
    icon: 'cilSearch',
    route: 'hbu',
    gradient: 'linear-gradient(135deg, var(--studio-tile-hbu-from), var(--studio-tile-hbu-to))',
    tabs: [
      { id: 'analysis', label: 'Analysis' },
      { id: 'conclusion', label: 'Conclusion' },
    ],
  },
  {
    id: 'valuation',
    name: 'Valuation',
    icon: 'cilGraph',
    route: 'valuation',
    gradient: 'linear-gradient(135deg, var(--studio-tile-valuation-from), var(--studio-tile-valuation-to))',
    tabs: [
      { id: 'sales', label: 'Sales Comparison' },
      { id: 'cost', label: 'Cost Approach' },
      { id: 'income', label: 'Income Approach' },
      { id: 'reconciliation', label: 'Reconciliation' },
    ],
  },
  { id: 'reports', name: 'Reports', icon: 'cilFile', route: 'reports', gradient: 'linear-gradient(135deg, var(--studio-tile-reports-from), var(--studio-tile-reports-to))' },
  { id: 'documents', name: 'Documents', icon: 'cilFolder', route: 'documents', gradient: 'linear-gradient(135deg, var(--studio-tile-documents-from), var(--studio-tile-documents-to))' },
];

const LAND_DEV_TILES: StudioTile[] = [
  { id: 'home', name: 'Project Home', icon: 'cilHome', route: '', gradient: 'linear-gradient(135deg, var(--studio-tile-home-from), var(--studio-tile-home-to))' },
  {
    id: 'planning',
    name: 'Planning',
    icon: 'cilPencil',
    route: 'planning',
    gradient: 'linear-gradient(135deg, var(--studio-tile-property-from), var(--studio-tile-property-to))',
    tabs: [
      { id: 'areas', label: 'Areas' },
      { id: 'phases', label: 'Phases' },
      { id: 'parcels', label: 'Parcels' },
    ],
  },
  {
    id: 'budget',
    name: 'Budget',
    icon: 'cilDollar',
    route: 'budget',
    gradient: 'linear-gradient(135deg, var(--studio-tile-market-from), var(--studio-tile-market-to))',
    tabs: [
      { id: 'summary', label: 'Summary' },
      { id: 'details', label: 'Details' },
      { id: 'timeline', label: 'Timeline' },
    ],
  },
  {
    id: 'operations',
    name: 'Operations',
    icon: 'cilClipboard',
    route: 'operations',
    gradient: 'linear-gradient(135deg, var(--studio-tile-operations-from), var(--studio-tile-operations-to))',
    tabs: [
      { id: 'chart', label: 'Chart of Accounts' },
    ],
  },
  {
    id: 'sales',
    name: 'Sales',
    icon: 'cilTag',
    route: 'sales',
    gradient: 'linear-gradient(135deg, var(--studio-tile-hbu-from), var(--studio-tile-hbu-to))',
    tabs: [
      { id: 'absorption', label: 'Absorption' },
      { id: 'pricing', label: 'Pricing' },
      { id: 'inventory', label: 'Inventory' },
    ],
  },
  {
    id: 'feasibility',
    name: 'Feasibility',
    icon: 'cilSpeedometer',
    route: 'feasibility',
    gradient: 'linear-gradient(135deg, var(--studio-tile-valuation-from), var(--studio-tile-valuation-to))',
    tabs: [
      { id: 'residual', label: 'Residual' },
      { id: 'cash-flow', label: 'Cash Flow' },
    ],
  },
  { id: 'reports', name: 'Reports', icon: 'cilFile', route: 'reports', gradient: 'linear-gradient(135deg, var(--studio-tile-reports-from), var(--studio-tile-reports-to))' },
  { id: 'documents', name: 'Documents', icon: 'cilFolder', route: 'documents', gradient: 'linear-gradient(135deg, var(--studio-tile-documents-from), var(--studio-tile-documents-to))' },
];

/**
 * Get tiles based on analysis_type field
 * @param analysisType - The analysis_type from project profile (e.g., "Land Development", "Income Property")
 */
export function getStudioTilesForAnalysisType(analysisType?: string): StudioTile[] {
  const normalized = analysisType?.trim().toUpperCase();
  if (normalized === 'LAND DEVELOPMENT') {
    return LAND_DEV_TILES;
  }
  if (normalized === 'INCOME PROPERTY') {
    return INCOME_TILES;
  }
  return INCOME_TILES;
}

/**
 * Property type codes that should show Land Development tiles
 */
const LAND_DEV_PROPERTY_TYPES = [
  'LAND',
  'MPC',
  'SUBDIVISION',
  'MASTER PLANNED COMMUNITY',
  'MULTIFAMILY DEVELOPMENT',
  'COMMERCIAL DEVELOPMENT',
  'INDUSTRIAL DEVELOPMENT',
  'MIXED-USE DEVELOPMENT',
];

/**
 * Get tiles based on property_type_code or property_subtype field
 * Falls back to Income Property tiles if not a known land dev type
 *
 * @param propertyType - The property_type_code or property_subtype from project
 */
export function getStudioTilesForPropertyType(propertyType?: string): StudioTile[] {
  if (!propertyType) return INCOME_TILES;

  const normalizedType = propertyType.trim().toUpperCase();

  // Check if it matches any land development type (case-insensitive)
  if (LAND_DEV_PROPERTY_TYPES.some((t) => t === normalizedType)) {
    return LAND_DEV_TILES;
  }

  // Default to income property tiles
  return INCOME_TILES;
}

/**
 * Determine if a project is land development based on analysis_type OR property_type
 * This is useful for components that need to know the project category
 */
export function isLandDevelopment(analysisType?: string, propertyType?: string): boolean {
  const normalizedAnalysis = analysisType?.trim().toUpperCase();
  const normalizedProperty = propertyType?.trim().toUpperCase();

  if (normalizedAnalysis === 'LAND DEVELOPMENT') {
    return true;
  }

  if (normalizedProperty && LAND_DEV_PROPERTY_TYPES.some((t) => t === normalizedProperty)) {
    return true;
  }

  return false;
}
