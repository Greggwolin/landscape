/**
 * Project Tabs Utility
 *
 * Determines which tabs to display based on project property type.
 * Phase 1: Simplified 5-tab navigation structure
 */

export interface Tab {
  id: string;
  label: string;
  hasMode?: boolean; // Whether this tab supports mode (Napkin/Standard/Detail)
  href?: string; // Optional explicit href for routing
}

/**
 * Get tabs for a specific property type
 *
 * Phase 1: All projects now use 5 main tabs
 * - PROJECT: Contains Project, Planning, Budget, Operations, Sales sub-tabs
 * - FEASIBILITY/VALUATION: Market data, sensitivity analysis
 * - CAPITALIZATION: Debt, equity, operations
 * - LANDSCAPER: AI assistant interface
 * - DOCUMENTS: DMS and reports
 *
 * @param propertyType - The property type code (e.g., 'LAND', 'MF', etc.)
 * @returns Array of tab objects with id and label
 */
export function getTabsForPropertyType(propertyType?: string): Tab[] {
  const normalized = propertyType?.toUpperCase() || '';

  // Land Development projects (standardized code: LAND)
  const isLandDev =
    normalized === 'LAND' ||
    normalized === 'MPC' ||
    normalized === 'LAND DEVELOPMENT' ||
    propertyType?.includes('Land Development');

  if (isLandDev) {
    // Land Development: 5 main tabs
    return [
      { id: 'project', label: 'Project', hasMode: true },
      { id: 'feasibility', label: 'Feasibility', hasMode: false },
      { id: 'capitalization', label: 'Capitalization', hasMode: false },
      { id: 'landscaper', label: 'Landscaper AI', hasMode: false },
      { id: 'documents', label: 'Documents', hasMode: false },
    ];
  }

  // Income Properties: Same 5 main tabs (valuation replaces feasibility)
  return [
    { id: 'project', label: 'Project', hasMode: true },
    { id: 'valuation', label: 'Feasibility', hasMode: false },
    { id: 'capitalization', label: 'Capitalization', hasMode: false },
    { id: 'landscaper', label: 'Landscaper AI', hasMode: false },
    { id: 'documents', label: 'Documents', hasMode: false },
  ];
}

/**
 * Get the default route for a main tab
 * Each main tab has a default sub-page to navigate to
 */
export function getTabDefaultRoute(projectId: number, tabId: string): string {
  switch (tabId) {
    case 'project':
      return `/projects/${projectId}/project/summary`;
    case 'feasibility':
      return `/projects/${projectId}/feasibility/market-data`;
    case 'valuation':
      return `/projects/${projectId}/feasibility/market-data`;
    case 'capitalization':
      return `/projects/${projectId}/capitalization/debt`;
    case 'landscaper':
      return `/projects/${projectId}/landscaper`;
    case 'documents':
      return `/projects/${projectId}/documents/files`;
    default:
      return `/projects/${projectId}`;
  }
}
