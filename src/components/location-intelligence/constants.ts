/**
 * Location Intelligence Constants
 *
 * Configuration and constants for the location intelligence map components
 */

import type { PointCategoryConfig, LayerVisibility } from './types';

// API base URL for location intelligence endpoints
export const LOCATION_INTELLIGENCE_API_BASE = '/api/v1/location-intelligence';

// Available ring radii in miles
export const RING_RADII = [1, 3, 5] as const;

// Ring colors for map visualization (matching PostGIS service)
export const RING_COLORS: Record<number, { fill: string; stroke: string }> = {
  1: { fill: 'rgba(59, 130, 246, 0.15)', stroke: '#3b82f6' },  // Blue
  3: { fill: 'rgba(34, 197, 94, 0.12)', stroke: '#22c55e' },   // Green
  5: { fill: 'rgba(168, 85, 247, 0.10)', stroke: '#a855f7' },  // Purple
};

// Point category configuration
export const POINT_CATEGORIES: PointCategoryConfig[] = [
  { value: 'competitor', label: 'Competitor', color: '#ef4444', icon: 'building' },
  { value: 'amenity', label: 'Amenity', color: '#22c55e', icon: 'star' },
  { value: 'poi', label: 'Point of Interest', color: '#3b82f6', icon: 'map-pin' },
  { value: 'custom', label: 'Custom', color: '#f59e0b', icon: 'flag' },
];

// Default layer visibility
export const DEFAULT_LAYER_VISIBILITY: LayerVisibility = {
  blockGroups: false,
  rings: true,
  userPoints: true,
  satellite: true,
};

// Map style URLs
export const MAP_STYLES = {
  satellite: 'aerial', // Uses ESRI World Imagery
  streets: 'https://api.maptiler.com/maps/streets-v2/style.json',
};

// Demographic field display configuration
export const DEMOGRAPHIC_FIELDS = [
  { key: 'population', label: 'Population', format: 'number' },
  { key: 'households', label: 'Households', format: 'number' },
  { key: 'median_income', label: 'Median Income', format: 'currency' },
  { key: 'median_age', label: 'Median Age', format: 'decimal' },
  { key: 'median_home_value', label: 'Median Home Value', format: 'currency' },
  { key: 'median_gross_rent', label: 'Median Rent', format: 'currency' },
  { key: 'owner_occupied_pct', label: 'Owner Occupied', format: 'percent' },
] as const;

// Format helpers for demographic values
export const formatDemographicValue = (
  value: number | null | undefined,
  format: 'number' | 'currency' | 'decimal' | 'percent'
): string => {
  if (value === null || value === undefined) return '—';

  switch (format) {
    case 'number':
      return value.toLocaleString();
    case 'currency':
      return `$${value.toLocaleString()}`;
    case 'decimal':
      return value.toFixed(1);
    case 'percent':
      // Value is already a percentage (e.g., 44.22), not a decimal (0.4422)
      return `${value.toFixed(1)}%`;
    default:
      return String(value);
  }
};

// Nominatim reverse geocoding endpoint (OSM)
export const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// Block group fill colors based on population density
export const BLOCK_GROUP_COLORS = {
  low: 'rgba(34, 197, 94, 0.3)',      // Green - low density
  medium: 'rgba(251, 191, 36, 0.3)', // Yellow - medium density
  high: 'rgba(239, 68, 68, 0.3)',    // Red - high density
};

// Population density thresholds (people per sq mi)
export const DENSITY_THRESHOLDS = {
  low: 1000,
  high: 5000,
};
