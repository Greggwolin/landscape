/**
 * Map Tab Types
 *
 * Type definitions for the unified spatial hub
 */

// ─────────────────────────────────────────────────────────────────────────────
// Feature Types
// ─────────────────────────────────────────────────────────────────────────────

export type FeatureType = 'point' | 'line' | 'polygon' | 'measurement';

export type FeatureCategory =
  | 'boundary'
  | 'trade_area'
  | 'land_sale'
  | 'building_sale'
  | 'annotation'
  | 'measurement'
  | 'custom';

export interface FeatureStyle {
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
  fillOpacity?: number;
  icon?: string;
}

export interface MapFeature {
  id: string;
  project_id: number;
  feature_type: FeatureType;
  category: FeatureCategory | null;
  geometry: GeoJSON.Geometry;
  label: string | null;
  notes: string | null;
  style: FeatureStyle;
  linked_table: string | null;
  linked_id: number | null;
  area_sqft: number | null;
  area_acres: number | null;
  perimeter_ft: number | null;
  length_ft: number | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer Types
// ─────────────────────────────────────────────────────────────────────────────

export type LayerGroupId =
  | 'project-boundary'
  | 'location-intel'
  | 'comparables'
  | 'market'
  | 'annotations';

export interface LayerItem {
  id: string;
  label: string;
  visible: boolean;
  disabled?: boolean;
  count?: number;
  color?: string;
  data?: unknown[];
}

export interface LayerGroup {
  id: LayerGroupId;
  label: string;
  expanded: boolean;
  layers: LayerItem[];
}

export interface LayerState {
  groups: LayerGroup[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Map State Types
// ─────────────────────────────────────────────────────────────────────────────

export type BasemapStyle = 'satellite' | 'streets' | 'hybrid' | 'roadmap' | 'terrain';

export type DrawTool = 'point' | 'line' | 'polygon' | 'measure' | 'edit' | 'delete' | null;

export interface MapViewState {
  center: [number, number];
  zoom: number;
  pitch?: number;
  bearing?: number;
  bounds?: [[number, number], [number, number]];
}

export interface MapTabState {
  basemap: BasemapStyle;
  activeTool: DrawTool;
  viewState: MapViewState;
  selectedFeatureId: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component Props
// ─────────────────────────────────────────────────────────────────────────────

export interface Project {
  project_id: number;
  project_name: string;
  project_type_code?: string;
  location_lat?: number | string | null;
  location_lon?: number | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  [key: string]: unknown;
}

export interface MapTabProps {
  project: Project;
  /** Called after the subject location/parcel is changed so the host can
   *  refresh its project context (e.g. the chat-first WrapperProject). */
  onProjectUpdated?: () => void;
}

export interface MapCanvasProps {
  center: [number, number];
  zoom: number;
  basemap: BasemapStyle;
  layers: LayerState;
  features: MapFeature[];
  activeTool: DrawTool;
  selectedFeatureId: string | null;
  planParcels?: GeoJSON.FeatureCollection | null;
  projectBoundary?: GeoJSON.Feature | null;
  taxParcels?: GeoJSON.FeatureCollection | null;
  selectedTaxParcelIds?: string[];
  parcelOutlineEnabled?: boolean;
  saleComps?: GeoJSON.FeatureCollection | null;
  rentComps?: GeoJSON.FeatureCollection | null;
  recentSales?: GeoJSON.FeatureCollection | null;
  competitiveProjects?: GeoJSON.FeatureCollection | null;
  parcelCollection?: GeoJSON.FeatureCollection | null;
  parcelSubjectApn?: string | null;
  parcelCompApns?: string[];
  selectedRingRadius?: number | null;
  onMapClick?: (coordinates: [number, number]) => void;
  onRingClick?: (radius: number, lngLat: [number, number]) => void;
  onFeatureClick?: (feature: MapFeature) => void;
  onTaxParcelToggle?: (feature: GeoJSON.Feature) => void;
  onFeatureCreate?: (geometry: GeoJSON.Geometry, type: FeatureType) => void;
  onViewStateChange?: (viewState: MapViewState) => void;
  /** Parcel-association (P1): when true, a click on a rendered tax parcel
   *  fires onParcelAttach instead of the boundary-selection toggle. */
  attachMode?: boolean;
  onParcelAttach?: (feature: GeoJSON.Feature) => void;
  /** Parcel-association (P2 / Gesture B): in attachMode a draggable subject
   *  marker is rendered at `center`; on dragend the dropped lngLat is reported
   *  here and the marker snaps back to `center`. */
  onSubjectDragEnd?: (lngLat: [number, number]) => void;
  /** Parcel-association (P3 / Gesture C): true while a boundary polygon is
   *  being drawn. Suppresses the P1 parcel-click handler so draw vertices that
   *  land on a parcel don't prematurely open the attach confirm. */
  attachDrawActive?: boolean;
  /** FB-323: fires when a competitor marker is clicked, passing its feature id
   *  ("competitor-<id>"). Optional so non-/w mounts that don't render a detail
   *  panel are unaffected. */
  onCompetitorClick?: (competitorFeatureId: string) => void;
}

export interface LayerPanelProps {
  layers: LayerState;
  onToggleLayer: (groupId: LayerGroupId, layerId: string) => void;
  onToggleGroup: (groupId: LayerGroupId) => void;
  onZoomToLayer: (groupId: LayerGroupId, layerId: string) => void;
}

export interface DrawToolbarProps {
  activeTool: DrawTool;
  onToolChange: (tool: DrawTool) => void;
  disabled?: boolean;
}

export interface FeatureModalProps {
  isOpen: boolean;
  feature: Partial<MapFeature> | null;
  onClose: () => void;
  onSave: (feature: Omit<MapFeature, 'id' | 'created_at' | 'updated_at'>) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateFeatureRequest {
  project_id: number;
  feature_type: FeatureType;
  category?: FeatureCategory;
  geometry: GeoJSON.Geometry;
  label?: string;
  notes?: string;
  style?: FeatureStyle;
  linked_table?: string;
  linked_id?: number;
}

export interface UpdateFeatureRequest {
  label?: string;
  notes?: string;
  category?: FeatureCategory;
  style?: FeatureStyle;
  geometry?: GeoJSON.Geometry;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ring/Demographics Types (from location-intelligence)
// ─────────────────────────────────────────────────────────────────────────────

export interface DemographicRing {
  radius_miles: number;
  population: number;
  households: number;
  median_income: number;
  median_age: number;
  owner_occupied_pct: number;
}

export interface UserPoint {
  id: string;
  label: string;
  category: 'poi' | 'comp' | 'site' | 'custom';
  coordinates: [number, number];
  notes?: string;
}
