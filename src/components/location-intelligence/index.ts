/**
 * Location Intelligence Components
 *
 * Export all location intelligence components and hooks
 */

// Main component
export { LocationMapFlyout } from './LocationMapFlyout';
export { default as LocationMapFlyoutDefault } from './LocationMapFlyout';

// Sub-components
export { LocationMap } from './LocationMap';
export { DemographicsPanel } from './DemographicsPanel';
export { MapLayerToggle } from './MapLayerToggle';
export { AddPointPopover } from './AddPointPopover';

// Hooks
export { useDemographics } from './useDemographics';
export { useReverseGeocode } from './useReverseGeocode';

// Types
export type {
  RingDemographics,
  DemographicsResponse,
  UserMapPoint,
  ReverseGeocodeResult,
  LayerVisibility,
  LocationMapFlyoutProps,
  LocationMapProps,
  DemographicsPanelProps,
  MapLayerToggleProps,
  AddPointPopoverProps,
  BlockGroupStats,
  PointCategoryConfig,
} from './types';

// Constants
export {
  LOCATION_INTELLIGENCE_API_BASE,
  RING_RADII,
  RING_COLORS,
  POINT_CATEGORIES,
  DEFAULT_LAYER_VISIBILITY,
  DEMOGRAPHIC_FIELDS,
  formatDemographicValue,
} from './constants';
