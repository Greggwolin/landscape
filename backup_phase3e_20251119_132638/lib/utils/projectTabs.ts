/**
 * Project Tabs Utility
 *
 * Determines which tabs to display based on project property type.
 */

export interface Tab {
  id: string;
  label: string;
  hasMode?: boolean; // Whether this tab supports mode (Napkin/Standard/Detail)
}

/**
 * Get tabs for a specific property type
 *
 * @param propertyType - The property type code (e.g., 'MPC', 'MULTIFAMILY', etc.)
 * @returns Array of tab objects with id and label
 *
 * @example
 * const tabs = getTabsForPropertyType('MPC');
 * // Returns land development tabs (Planning, Budget, Sales, etc.)
 *
 * const tabs = getTabsForPropertyType('MULTIFAMILY');
 * // Returns income property tabs (Property, Operations, Valuation, etc.)
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
    // Land Development (MPC & Subdivision): 8 tabs
    return [
      { id: 'project', label: 'Project', hasMode: true },
      { id: 'planning', label: 'Planning', hasMode: true },
      { id: 'budget', label: 'Budget', hasMode: true },
      { id: 'operations', label: 'Operations', hasMode: true },
      { id: 'sales', label: 'Sales & Absorption', hasMode: true },
      { id: 'feasibility', label: 'Feasibility', hasMode: false },
      { id: 'capitalization', label: 'Capitalization', hasMode: false },
      { id: 'reports', label: 'Reports', hasMode: false },
      { id: 'documents', label: 'Documents', hasMode: false },
    ];
  }

  // Income Properties (standardized codes: MF, OFF, RET, IND, HTL, MXU): 7 tabs
  return [
    { id: 'project', label: 'Project', hasMode: true },
    { id: 'property', label: 'Property', hasMode: true },
    { id: 'operations', label: 'Operations', hasMode: true },
    { id: 'valuation', label: 'Valuation', hasMode: true },
    { id: 'capitalization', label: 'Capitalization', hasMode: false },
    { id: 'reports', label: 'Reports', hasMode: false },
    { id: 'documents', label: 'Documents', hasMode: false },
  ];
}
