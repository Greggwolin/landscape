/**
 * Preferences Tabs Configuration
 * Defines the tabs shown in the Global Preferences section
 */

export interface Tab {
  id: string;
  label: string;
}

/**
 * Returns the list of tabs for the Global Preferences section
 * Note: Cost Library and Benchmarks have moved to /admin routes
 */
export function getPreferencesTabs(): Tab[] {
  return [
    { id: 'products', label: 'Product Library' },
    { id: 'taxonomy', label: 'Land Use Manager' },
  ];
}
