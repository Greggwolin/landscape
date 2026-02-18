/**
 * Folder Tab Configuration
 *
 * Defines the ARGUS-style stacked folder tab navigation structure.
 * EXACTLY matches the subtab structure from main branch tileConfig.ts.
 *
 * Row 1: Top-level folder tabs (base set with analysis-type visibility)
 * Row 2: Sub-tabs that change dynamically based on selected folder
 *
 * @version 2.1
 * @created 2026-01-23
 * @updated 2026-01-23 - Fixed to match main branch tileConfig.ts EXACTLY
 */

import {
  TILE_COLORS,
  isIncomeProperty,
  getProjectCategory,
  type ProjectTypeCategory,
} from '@/components/projects/tiles/tileConfig';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Analysis type codes used in the application */
export type AnalysisTypeCode = 'VALUATION' | 'INVESTMENT' | 'VALUE_ADD' | 'DEVELOPMENT' | 'FEASIBILITY';

export interface AnalysisTypeTileConfig {
  analysis_type: string;
  tile_valuation: boolean;
  tile_capitalization: boolean;
  tile_returns: boolean;
  tile_development_budget: boolean;
}

/** Analysis purpose codes */
export type AnalysisPurposeCode = 'VALUATION' | 'UNDERWRITING';

export interface SubTab {
  id: string;
  label: string;
  /** Optional: restrict to specific project types */
  projectTypes?: ProjectTypeCategory[];
  /** Optional: restrict to specific analysis types */
  analysisTypes?: AnalysisTypeCode[];
  /** Optional: only show when value-add mode is enabled */
  requiresValueAdd?: boolean;
  /** Optional: hide this subtab when analysis_purpose matches any of these values */
  hideForPurpose?: AnalysisPurposeCode[];
}

export interface FolderTab {
  id: string;
  /** Label can be string or two-line format */
  label: string | { primary: string; secondary: string };
  /** CSS color for the folder's top border indicator */
  color: string;
  subTabs: SubTab[];
}

export interface FolderTabConfig {
  folders: FolderTab[];
}

interface FolderVisibilityOptions {
  isIncome: boolean;
  tileConfig?: AnalysisTypeTileConfig | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Filter subtabs by project type and analysis type
// ─────────────────────────────────────────────────────────────────────────────

function filterSubtabsByType(
  subtabs: SubTab[],
  projectType?: string,
  analysisType?: string,
  valueAddEnabled: boolean = false,
  analysisPurpose?: string
): SubTab[] {
  const category = getProjectCategory(projectType);
  return subtabs.filter((tab) => {
    // Check project type filter
    if (tab.projectTypes && !tab.projectTypes.includes(category)) {
      return false;
    }
    // Check analysis type filter
    if (tab.analysisTypes && analysisType) {
      if (!tab.analysisTypes.includes(analysisType as AnalysisTypeCode)) {
        return false;
      }
    } else if (tab.analysisTypes && !analysisType) {
      // If tab requires specific analysis types but none provided, hide it
      return false;
    }
    if (tab.requiresValueAdd && !valueAddEnabled) {
      return false;
    }
    // Check analysis purpose exclusion
    if (tab.hideForPurpose && analysisPurpose) {
      if (tab.hideForPurpose.includes(analysisPurpose as AnalysisPurposeCode)) {
        return false;
      }
    }
    return true;
  });
}

function shouldShowValuationOrFeasibilityFolder(
  tileConfig: AnalysisTypeTileConfig
): boolean {
  return Boolean(
    tileConfig.tile_valuation
      || tileConfig.tile_returns
  );
}

function applyFolderVisibilityByAnalysisType(
  folders: FolderTab[],
  options: FolderVisibilityOptions
): FolderTab[] {
  const { isIncome, tileConfig } = options;

  // Without analysis config, preserve legacy behavior (all folders visible).
  if (!tileConfig) {
    return folders;
  }

  const alwaysVisible = new Set(['home', 'property', 'reports', 'documents', 'map']);
  const visibleFolderIds = new Set<string>(alwaysVisible);

  if (isIncome || tileConfig.tile_development_budget) {
    visibleFolderIds.add(isIncome ? 'operations' : 'budget');
  }

  if (shouldShowValuationOrFeasibilityFolder(tileConfig)) {
    visibleFolderIds.add(isIncome ? 'valuation' : 'feasibility');
  }

  if (tileConfig.tile_capitalization) {
    visibleFolderIds.add('capital');
  }

  return folders.filter((folder) => visibleFolderIds.has(folder.id));
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Format label for display
// ─────────────────────────────────────────────────────────────────────────────

export function formatFolderLabel(
  label: string | { primary: string; secondary: string }
): string {
  if (typeof label === 'string') return label;
  return `${label.primary} ${label.secondary}`;
}

export function isTwoLineLabel(
  label: string | { primary: string; secondary: string }
): label is { primary: string; secondary: string } {
  return typeof label === 'object' && 'primary' in label;
}

// ─────────────────────────────────────────────────────────────────────────────
// Folder Configuration Generator
// Base structure matches main branch tileConfig.ts
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates the 7-folder configuration based on project type and analysis type.
 * Subtabs match tileConfig.ts from main branch EXACTLY.
 *
 * Position 1: Home (Project Home) - NO subtabs in main
 * Position 2: Property
 * Position 3: Budget/Operations (contextual)
 * Position 4: Feasibility/Valuation
 * Position 5: Capital (Capitalization)
 * Position 6: Reports
 * Position 7: Documents
 *
 * @param projectType - Project type code (e.g., 'MF', 'LAND')
 * @param analysisType - Analysis type code (e.g., 'VALUE_ADD', 'INVESTMENT')
 */
export function createFolderConfig(
  projectType?: string,
  analysisType?: string,
  tileConfig?: AnalysisTypeTileConfig | null,
  _analysisPerspective?: string,
  analysisPurpose?: string,
  valueAddEnabled: boolean = false
): FolderTabConfig {
  void _analysisPerspective;
  const isIncome = isIncomeProperty(projectType);

  const folders: FolderTab[] = [
    // ========================================
    // Position 1: Home (Project)
    // Main branch: NO subtabs defined
    // ========================================
    {
      id: 'home',
      label: 'Project',
      color: TILE_COLORS.home,
      subTabs: [], // Main has no subtabs for home
    },

    // ========================================
    // Position 2: Property
    // LAND: market, land-use, parcels, acquisition
    // INCOME: details, acquisition, market, rent-roll, renovation (VALUE_ADD only)
    // ========================================
    {
      id: 'property',
      label: 'Property',
      color: TILE_COLORS.planning,
      subTabs: filterSubtabsByType(
        [
          // Income property subtabs - match PropertyTab's internal CNav
          {
            id: 'details',
            label: 'Details',
            projectTypes: [
              'multifamily',
              'office',
              'retail',
              'industrial',
              'hotel',
              'mixed_use',
            ],
          },
          // Acquisition - ALL project types (land dev also has acquisition costs)
          // Hidden for VALUATION purpose (appraisal context has no acquisition)
          {
            id: 'acquisition',
            label: 'Acquisition',
            hideForPurpose: ['VALUATION'],
          },
          { id: 'market', label: 'Market' },
          {
            id: 'rent-roll',
            label: 'Rent Roll',
            projectTypes: [
              'multifamily',
              'office',
              'retail',
              'industrial',
              'hotel',
              'mixed_use',
            ],
          },
          // Land development subtabs
          {
            id: 'land-use',
            label: 'Land Use',
            projectTypes: ['land_development'],
          },
          {
            id: 'parcels',
            label: 'Parcels',
            projectTypes: ['land_development'],
          },
          // Renovation - VALUE_ADD analysis type only (income properties)
          {
            id: 'renovation',
            label: 'Renovation',
            projectTypes: [
              'multifamily',
              'office',
              'retail',
              'industrial',
              'hotel',
              'mixed_use',
            ],
            requiresValueAdd: true,
          },
        ],
        projectType,
        analysisType,
        valueAddEnabled,
        analysisPurpose
      ),
    },

    // ========================================
    // Position 3: Operations (Income) / Development Sales (Land)
    // Land: budget, sales subtabs - two-line label "Development / Sales"
    // Income: Single unified page (no subtabs) - shows P&L view with all sections
    // ========================================
    {
      id: isIncome ? 'operations' : 'budget',
      label: isIncome ? 'Operations' : { primary: 'Development', secondary: 'Sales' },
      color: TILE_COLORS.devOps,
      subTabs: isIncome
        ? [] // Single page - no subtabs
        : [
            { id: 'budget', label: 'Budget' },
            { id: 'sales', label: 'Sales' },
          ],
    },

    // ========================================
    // Position 4: Feasibility (Land) / Valuation (Income)
    // Land: feasibility, cashflow, returns, sensitivity - two-line label
    // Income: sales-comparison, cost, income (matches ValuationTab's internal tabs)
    // ========================================
    {
      id: isIncome ? 'valuation' : 'feasibility',
      label: isIncome ? 'Valuation' : { primary: 'Feasibility', secondary: 'Valuation' },
      color: TILE_COLORS.feasVal,
      subTabs: isIncome
        ? [
            { id: 'sales-comparison', label: 'Sales Comparison' },
            { id: 'cost', label: 'Cost Approach' },
            { id: 'income', label: 'Income Approach' },
          ]
        : [
            { id: 'cashflow', label: 'Cash Flow' },
            { id: 'returns', label: 'Returns' },
            { id: 'sensitivity', label: 'Sensitivity' },
          ],
    },

    // ========================================
    // Position 5: Capitalization
    // Subtabs: equity, debt
    // ========================================
    {
      id: 'capital',
      label: 'Capitalization',
      color: TILE_COLORS.capital,
      subTabs: [
        { id: 'equity', label: 'Equity' },
        { id: 'debt', label: 'Debt' },
      ],
    },

    // ========================================
    // Position 6: Reports
    // Subtabs: summary, export
    // ========================================
    {
      id: 'reports',
      label: 'Reports',
      color: TILE_COLORS.reports,
      subTabs: filterSubtabsByType(
        [
          { id: 'summary', label: 'Summary' },
          { id: 'export', label: 'Export' },
          { id: 'investment_committee', label: 'IC Review', hideForPurpose: ['VALUATION'] as AnalysisPurposeCode[] },
        ],
        projectType,
        analysisType,
        valueAddEnabled,
        analysisPurpose
      ),
    },

    // ========================================
    // Position 7: Documents
    // No subtabs - content handled by DMSView
    // ========================================
    {
      id: 'documents',
      label: 'Documents',
      color: TILE_COLORS.documents,
      subTabs: [],
    },

    // ========================================
    // Position 8: Map
    // Unified spatial hub - no subtabs
    // ========================================
    {
      id: 'map',
      label: 'Map',
      color: TILE_COLORS.map,
      subTabs: [], // Single page - no subtabs
    },
  ];

  return {
    folders: applyFolderVisibilityByAnalysisType(folders, {
      isIncome,
      tileConfig,
    }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy API (for backward compatibility with existing code)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get folder tab configuration based on property type and analysis type
 */
export function getFolderTabsForPropertyType(
  propertyType?: string,
  analysisType?: string,
  tileConfig?: AnalysisTypeTileConfig | null,
  analysisPerspective?: string,
  analysisPurpose?: string,
  valueAddEnabled: boolean = false
): FolderTabConfig {
  return createFolderConfig(
    propertyType,
    analysisType,
    tileConfig,
    analysisPerspective,
    analysisPurpose,
    valueAddEnabled
  );
}

/**
 * Property type codes that map to Land Development folders
 */
export const LAND_DEV_PROPERTY_TYPES = ['LAND'];

/**
 * Property type codes that map to Income Property folders
 */
export const INCOME_PROPERTY_TYPES = ['MF', 'OFF', 'RET', 'IND', 'MXU', 'HTL'];

/**
 * Determine if a project is land development based on property type
 */
export function isLandDevelopmentProject(
  propertyType?: string,
  _analysisType?: string
): boolean {
  void _analysisType;
  return !isIncomeProperty(propertyType);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a specific folder by ID from the configuration
 */
export function getFolderById(
  folderId: string,
  projectType?: string,
  analysisType?: string,
  tileConfig?: AnalysisTypeTileConfig | null,
  analysisPerspective?: string,
  analysisPurpose?: string,
  valueAddEnabled: boolean = false
): FolderTab | undefined {
  const config = createFolderConfig(
    projectType,
    analysisType,
    tileConfig,
    analysisPerspective,
    analysisPurpose,
    valueAddEnabled
  );
  return config.folders.find((folder) => folder.id === folderId);
}

/**
 * Get the default folder ID for a property type
 */
export function getDefaultFolderId(): string {
  return 'home';
}

/**
 * Get the default sub-tab ID for a folder
 *
 * Special cases to match main branch behavior:
 * - Property folder for Income: defaults to 'details' (first tab in PropertyTab)
 * - Property folder for Land: defaults to 'market' (first common subtab)
 * - Valuation folder for Income: defaults to 'sales-comparison' (first in ValuationTab)
 */
export function getDefaultSubTabId(
  folderId: string,
  projectType?: string,
  analysisType?: string,
  tileConfig?: AnalysisTypeTileConfig | null,
  analysisPerspective?: string,
  analysisPurpose?: string,
  valueAddEnabled: boolean = false
): string {
  const folder = getFolderById(
    folderId,
    projectType,
    analysisType,
    tileConfig,
    analysisPerspective,
    analysisPurpose,
    valueAddEnabled
  );
  // If folder has no subtabs (like home), return empty string
  if (!folder?.subTabs.length) return '';

  // Special handling for property folder to match main branch behavior
  if (folderId === 'property') {
    const isIncome = isIncomeProperty(projectType);
    if (isIncome) {
      // Income properties: default to 'details' subtab (first in PropertyTab)
      return 'details';
    } else {
      // Land dev: default to 'market' subtab
      return 'market';
    }
  }

  // Valuation/Feasibility folder defaults
  if (folderId === 'valuation') {
    return 'sales-comparison';
  }
  if (folderId === 'feasibility') {
    return 'feasibility';
  }

  return folder.subTabs[0].id;
}

/**
 * Validate if a folder/tab combination is valid
 */
export function isValidFolderTab(
  folderId: string,
  tabId: string,
  projectType?: string,
  analysisType?: string,
  tileConfig?: AnalysisTypeTileConfig | null,
  analysisPerspective?: string,
  analysisPurpose?: string,
  valueAddEnabled: boolean = false
): boolean {
  const folder = getFolderById(
    folderId,
    projectType,
    analysisType,
    tileConfig,
    analysisPerspective,
    analysisPurpose,
    valueAddEnabled
  );
  if (!folder) return false;
  // If folder has no subtabs, any tab is "valid" (we just show the folder content)
  if (!folder.subTabs.length) return true;
  return folder.subTabs.some((tab) => tab.id === tabId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Project Switch Navigation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts the current tab/path segment from a project URL.
 * Returns everything after /projects/[projectId]/
 *
 * Examples:
 * - /projects/123/budget → 'budget'
 * - /projects/123/valuation/income-approach → 'valuation/income-approach'
 * - /projects/123 → '' (home)
 */
export function extractCurrentTabFromPath(pathname: string): string {
  // Match /projects/{projectId}/{rest}
  const match = pathname.match(/^\/projects\/\d+\/?(.*)$/);
  if (!match) return '';
  return match[1] || '';
}

/**
 * Determines the target URL when switching between projects.
 * Preserves the current tab/page unless:
 * - Current page is valuation-related AND target project is income property (not land_dev)
 *
 * Supports both URL patterns:
 * 1. Path-based: /projects/123/budget
 * 2. Query-param based: /projects/123?folder=budget&tab=budget
 *
 * @param newProjectId - The project ID to switch to
 * @param currentPath - Current pathname from usePathname()
 * @param targetProjectType - The project_type_code of the target project
 * @param searchParams - Optional URLSearchParams for query-param based navigation
 * @returns The URL to navigate to
 */
export function getProjectSwitchUrl(
  newProjectId: number,
  currentPath: string,
  targetProjectType: string | null | undefined,
  searchParams?: URLSearchParams | null
): string {
  // First check path-based routes
  const pathTab = extractCurrentTabFromPath(currentPath);

  // Then check query-param based navigation (folder tabs)
  const folderParam = searchParams?.get('folder') || '';
  const tabParam = searchParams?.get('tab') || '';

  // Determine if we're on valuation tab (either via path or query param)
  const isOnValuationTab = pathTab.startsWith('valuation') || folderParam === 'valuation';

  // Check if target project is income property (not land_dev)
  const targetIsIncomeProperty = isIncomeProperty(targetProjectType || undefined);

  // Fallback to home if on valuation tab AND target is income property
  if (isOnValuationTab && targetIsIncomeProperty) {
    return `/projects/${newProjectId}`;
  }

  // Preserve path-based route if present
  if (pathTab) {
    return `/projects/${newProjectId}/${pathTab}`;
  }

  // Preserve query-param based navigation if present
  if (folderParam) {
    const params = new URLSearchParams();
    params.set('folder', folderParam);
    if (tabParam) {
      params.set('tab', tabParam);
    }
    return `/projects/${newProjectId}?${params.toString()}`;
  }

  return `/projects/${newProjectId}`;
}
