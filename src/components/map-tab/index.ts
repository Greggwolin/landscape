/**
 * Map Tab Component Exports
 */

export { MapTab, default } from './MapTab';
export { MapCanvas } from './MapCanvas';
export type { MapCanvasRef } from './MapCanvas';
export { LayerPanel } from './LayerPanel';
export { DrawToolbar } from './DrawToolbar';
export { FeatureModal } from './FeatureModal';
export type { FeatureGeometryType } from './FeatureModal';

// Hooks
export { useMapDraw } from './hooks/useMapDraw';
export type { DrawMode, DrawnFeature } from './hooks/useMapDraw';
export { useMapFeatures } from './hooks/useMapFeatures';
export type { MapFeatureRecord } from './hooks/useMapFeatures';

// Types
export type {
  MapTabProps,
  MapCanvasProps,
  LayerPanelProps,
  DrawToolbarProps,
  MapFeature,
  FeatureType,
  FeatureCategory,
  LayerState,
  LayerGroup,
  LayerGroupId,
  LayerItem,
  BasemapStyle,
  DrawTool,
  MapViewState,
  Project,
} from './types';

// Constants
export {
  BASEMAP_OPTIONS,
  LAYER_COLORS,
  RING_COLORS,
  FEATURE_CATEGORIES,
  CATEGORIES_BY_FEATURE_TYPE,
  getDefaultLayerGroups,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
} from './constants';
