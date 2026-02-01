/**
 * Helper for mapping folder/tab combinations to Landscaper page contexts.
 */

function isLandDevelopmentProject(projectTypeCode?: string, projectType?: string): boolean {
  if (projectTypeCode) {
    return projectTypeCode.toLowerCase().startsWith('land');
  }

  if (projectType) {
    return projectType.toLowerCase().includes('land');
  }

  return false;
}

export function getLandscaperPageContext(
  folder: string,
  tab: string,
  projectTypeCode?: string,
  projectType?: string
): string {
  const normalizedFolder = (folder || 'home').toLowerCase();
  const normalizedTab = (tab || '').toLowerCase();
  const isLand = isLandDevelopmentProject(projectTypeCode, projectType);

  const defaultHome = isLand ? 'land_home' : 'mf_home';

  switch (normalizedFolder) {
    case 'home':
      return defaultHome;
    case 'property':
      return isLand ? 'land_planning' : 'mf_property';
    case 'operations':
      return 'mf_operations';
    case 'valuation':
      return 'mf_valuation';
    case 'capital':
    case 'capitalization':
      return isLand ? 'land_capitalization' : 'mf_capitalization';
    case 'budget':
      if (isLand) {
        if (['schedule', 'sales'].includes(normalizedTab)) {
          return 'land_schedule';
        }
        return 'land_budget';
      }
      return defaultHome;
    case 'feasibility':
      return 'land_valuation';
    case 'documents':
      return 'documents';
    case 'reports':
      return 'reports';
    case 'map':
      return 'map';
    case 'alpha_assistant':
      return 'alpha_assistant';
    default:
      return defaultHome;
  }
}
