/**
 * Project Tabs Utility
 *
 * Determines which tabs to display based on project property type.
 */

export interface Tab {
  id: string;
  label: string;
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
      { id: 'project', label: 'Project' },
      { id: 'planning', label: 'Planning' },
      { id: 'budget', label: 'Budget' },
      { id: 'sales', label: 'Sales & Absorption' },
      { id: 'feasibility', label: 'Feasibility' },
      { id: 'capitalization', label: 'Capitalization' },
      { id: 'reports', label: 'Reports' },
      { id: 'documents', label: 'Documents' },
    ];
  }

  // Income Properties (standardized codes: MF, OFF, RET, IND, HTL, MXU): 7 tabs
  return [
    { id: 'project', label: 'Project' },
    { id: 'property', label: 'Property' },
    { id: 'operations', label: 'Operations' },
    { id: 'valuation', label: 'Valuation' },
    { id: 'capitalization', label: 'Capitalization' },
    { id: 'reports', label: 'Reports' },
    { id: 'documents', label: 'Documents' },
  ];
}
