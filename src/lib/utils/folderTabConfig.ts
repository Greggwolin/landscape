/**
 * Folder Tab Configuration
 *
 * Defines the ARGUS-style stacked folder tab navigation structure.
 * EXACTLY matches the subtab structure from main branch tileConfig.ts.
 *
 * Row 1: Top-level folder tabs (7 folders, always visible)
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

export interface SubTab {
  id: string;
  label: string;
  /** Optional: restrict to specific project types */
  projectTypes?: ProjectTypeCategory[];
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

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Filter subtabs by project type
// ─────────────────────────────────────────────────────────────────────────────

function filterSubtabsByType(
  subtabs: SubTab[],
  projectType?: string
): SubTab[] {
  const category = getProjectCategory(projectType);
  return subtabs.filter((tab) => {
    if (!tab.projectTypes) return true;
    return tab.projectTypes.includes(category);
  });
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
// 7-Folder Configuration Generator
// MUST MATCH main branch tileConfig.ts EXACTLY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates the 7-folder configuration based on project type.
 * Subtabs match tileConfig.ts from main branch EXACTLY.
 *
 * Position 1: Home (Project Home) - NO subtabs in main
 * Position 2: Property
 * Position 3: Budget/Operations (contextual)
 * Position 4: Feasibility/Valuation
 * Position 5: Capital (Capitalization)
 * Position 6: Reports
 * Position 7: Documents
 */
export function createFolderConfig(projectType?: string): FolderTabConfig {
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
    // LAND: market, land-use, parcels
    // INCOME: details, market, rent-roll (matches PropertyTab's internal navigation)
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
        ],
        projectType
      ),
    },

    // ========================================
    // Position 3: Budget (Land) / Operations (Income)
    // Land: budget, schedule, sales, draws
    // Income: Single unified page (no subtabs) - shows P&L view with all sections
    // ========================================
    {
      id: isIncome ? 'operations' : 'budget',
      label: isIncome
        ? 'Operations'
        : { primary: 'Development', secondary: 'Sales' },
      color: TILE_COLORS.devOps,
      subTabs: isIncome
        ? [] // Single page - no subtabs
        : [
            { id: 'budget', label: 'Budget' },
            { id: 'schedule', label: 'Schedule' },
            { id: 'sales', label: 'Sales' },
            { id: 'draws', label: 'Draws' },
          ],
    },

    // ========================================
    // Position 4: Valuation
    // Land: feasibility, cashflow, returns, sensitivity
    // Income: sales-comparison, cost, income (matches ValuationTab's internal tabs)
    // ========================================
    {
      id: isIncome ? 'valuation' : 'feasibility',
      label: 'Valuation',
      color: TILE_COLORS.feasVal,
      subTabs: isIncome
        ? [
            { id: 'sales-comparison', label: 'Sales Comparison' },
            { id: 'cost', label: 'Cost Approach' },
            { id: 'income', label: 'Income Approach' },
          ]
        : [
            { id: 'feasibility', label: 'Feasibility' },
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
      subTabs: [
        { id: 'summary', label: 'Summary' },
        { id: 'export', label: 'Export' },
      ],
    },

    // ========================================
    // Position 7: Documents
    // Subtabs: all, extractions
    // ========================================
    {
      id: 'documents',
      label: 'Documents',
      color: TILE_COLORS.documents,
      subTabs: [
        { id: 'all', label: 'All Documents' },
        { id: 'extractions', label: 'Extractions' },
      ],
    },
  ];

  return { folders };
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy API (for backward compatibility with existing code)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get folder tab configuration based on property type
 */
export function getFolderTabsForPropertyType(
  propertyType?: string,
  _analysisType?: string
): FolderTabConfig {
  return createFolderConfig(propertyType);
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
  projectType?: string
): FolderTab | undefined {
  const config = createFolderConfig(projectType);
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
  projectType?: string
): string {
  const folder = getFolderById(folderId, projectType);
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
  projectType?: string
): boolean {
  const folder = getFolderById(folderId, projectType);
  if (!folder) return false;
  // If folder has no subtabs, any tab is "valid" (we just show the folder content)
  if (!folder.subTabs.length) return true;
  return folder.subTabs.some((tab) => tab.id === tabId);
}
