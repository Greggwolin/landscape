import type { PropertyData, GranularityLevel, Tab } from '../types';

/**
 * Get tabs to display based on granularity level
 */
export const getTabsForGranularity = (level: GranularityLevel): Tab[] => {
  const tabs = {
    basic: [
      { id: 'property-details', label: 'Property Details', icon: '🏢' },
      { id: 'assumptions', label: 'Assumptions', icon: '📊' },
      { id: 'results', label: 'Results', icon: '💰' }
    ],
    mid: [
      { id: 'property-details', label: 'Property Details', icon: '🏢' },
      { id: 'market', label: 'Market', icon: '📈' },
      { id: 'financial', label: 'Financial', icon: '💵' },
      { id: 'operations', label: 'Operations', icon: '⚙️' },
      { id: 'results', label: 'Results', icon: '💰' },
      { id: 'documents', label: 'Documents', icon: '📁' }
    ],
    detailed: [
      { id: 'property-details', label: 'Property Details', icon: '🏢' },
      { id: 'market', label: 'Market', icon: '📈' },
      { id: 'financial', label: 'Financial', icon: '💵' },
      { id: 'operations', label: 'Operations', icon: '⚙️' },
      { id: 'tax-legal', label: 'Tax & Legal', icon: '⚖️' },
      { id: 'results', label: 'Results', icon: '💰' },
      { id: 'documents', label: 'Documents', icon: '📁' },
      { id: 'reports', label: 'Reports', icon: '📄' }
    ]
  };
  return tabs[level] || tabs.basic;
};

/**
 * Check if Property Details tab is complete
 */
export const isPropertyDetailsComplete = (property: PropertyData | null): boolean => {
  if (!property) return false;

  return Boolean(
    property.propertyType &&
    property.name &&
    property.unitMix?.length > 0 &&
    property.granularityLevel
  );
};

/**
 * Check if minimum assumptions are entered to show Results
 */
export const hasMinimumAssumptions = (property: PropertyData | null): boolean => {
  if (!property) return false;

  const hasUnitMix = property.unitMix?.length > 0;
  const hasRents = property.unitMix?.every(u => u.avgRent > 0);
  const hasVacancy = property.vacancyRate !== undefined && property.vacancyRate !== null;

  if (property.granularityLevel === 'basic') {
    return hasUnitMix && hasRents && hasVacancy;
  }

  // Mid/Detailed need more complete assumptions
  const hasExpenses = property.operatingExpenses !== undefined && property.operatingExpenses !== null;
  const hasHoldPeriod = (property.holdPeriod ?? 0) > 0;

  return hasUnitMix && hasRents && hasVacancy && hasExpenses && hasHoldPeriod;
};

/**
 * Get list of enabled tab IDs
 */
export const getEnabledTabs = (property: PropertyData | null): string[] => {
  if (!property) return ['property-details'];

  const enabled = ['property-details']; // Always enabled

  // Check if Property Details complete
  if (isPropertyDetailsComplete(property)) {
    // Enable all assumption tabs
    enabled.push('market', 'financial', 'operations', 'tax-legal', 'assumptions', 'documents', 'reports');
  }

  // Check if Results can be shown
  if (hasMinimumAssumptions(property)) {
    enabled.push('results');
  }

  return enabled;
};

/**
 * Get tooltip message for disabled tabs
 */
export const getDisabledTabTooltip = (tabId: string, property: PropertyData | null): string => {
  if (tabId === 'results' && !hasMinimumAssumptions(property)) {
    const missing: string[] = [];
    if (!property?.unitMix?.length) missing.push('unit mix');
    if (!property?.unitMix?.every(u => u.avgRent > 0)) missing.push('unit rents');
    if (property?.vacancyRate === undefined) missing.push('vacancy rate');
    if (property?.granularityLevel !== 'basic') {
      if (!property?.operatingExpenses) missing.push('operating expenses');
      if (!property?.holdPeriod) missing.push('hold period');
    }
    return `Enter minimum assumptions to view results: ${missing.join(', ')}`;
  }

  if (!isPropertyDetailsComplete(property)) {
    const missing: string[] = [];
    if (!property?.propertyType) missing.push('property type');
    if (!property?.name) missing.push('property name');
    if (!property?.unitMix?.length) missing.push('unit mix');
    if (!property?.granularityLevel) missing.push('granularity level');
    return `Complete required property details first: ${missing.join(', ')}`;
  }

  return 'This tab is not yet available';
};
