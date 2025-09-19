// Feature flag configuration for UI component implementations
export interface FeatureFlags {
  ui: {
    landUse: 'tanstack' | 'current';
    budget: 'tanstack' | 'current';
    planning: 'tanstack' | 'current';
    dashboard: 'recharts' | 'current';
    maps: 'mapbox' | 'current';
  }
}

// Default feature flags - new implementations as default for prototyping
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  ui: {
    landUse: 'tanstack',
    budget: 'current', 
    planning: 'current',
    dashboard: 'current',
    maps: 'current',
  }
}

// Feature flag context for runtime switching
export function getFeatureFlag<T extends keyof FeatureFlags>(
  category: T, 
  flag: keyof FeatureFlags[T]
): FeatureFlags[T][keyof FeatureFlags[T]] {
  // In a real app, this would read from localStorage, env vars, or remote config
  // For now, return defaults
  return DEFAULT_FEATURE_FLAGS[category][flag]
}

// Helper to check if we should use the new TanStack implementation
export function useTanStackLandUse(): boolean {
  return getFeatureFlag('ui', 'landUse') === 'tanstack'
}