/**
 * Location Intelligence Types
 *
 * Type definitions for the location intelligence map flyout component
 */

// Ring demographics from the API
export interface RingDemographics {
  radius_miles: number;
  population: number | null;
  households: number | null;
  median_income: number | null;
  median_age: number | null;
  median_home_value: number | null;
  median_gross_rent: number | null;
  owner_occupied_pct: number | null;
  block_groups_included: number | null;
  total_land_area_sqmi: number | null;
}

// Full demographics API response
export interface DemographicsResponse {
  center: {
    lat: number;
    lon: number;
  };
  rings: RingDemographics[];
  source: string;
  calculated_at: string;
  cached?: boolean;
}

// User-added map point
export interface UserMapPoint {
  id: string;
  label: string;
  category: 'competitor' | 'amenity' | 'poi' | 'custom';
  coordinates: [number, number]; // [lng, lat]
  notes?: string;
  created_at?: string;
  markerColor?: string;
  markerLabel?: string;
  popupHtml?: string;
}

// Reverse geocoding result
export interface ReverseGeocodeResult {
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
  display_name: string;
}

// Map layer visibility state
export interface LayerVisibility {
  blockGroups: boolean;
  rings: boolean;
  userPoints: boolean;
  satellite: boolean;
}

// Props for the LocationMap component
export interface LocationMapProps {
  center: [number, number];
  rings: RingDemographics[];
  userPoints: UserMapPoint[];
  layers: LayerVisibility;
  selectedRadius: number | null;
  onMapClick?: (lngLat: [number, number]) => void;
  onPointClick?: (point: UserMapPoint) => void;
  isAddingPoint?: boolean;
  resizeToken?: number;
}

// Props for demographics panel
export interface DemographicsPanelProps {
  demographics: DemographicsResponse | null;
  isLoading: boolean;
  error: string | null;
  selectedRadius: number | null;
  onRadiusSelect: (radius: number | null) => void;
}

// Props for layer toggle
export interface MapLayerToggleProps {
  layers: LayerVisibility;
  onToggle: (layer: keyof LayerVisibility) => void;
}

// Props for add point popover
export interface AddPointPopoverProps {
  isOpen: boolean;
  coordinates: [number, number] | null;
  onClose: () => void;
  onSave: (point: Omit<UserMapPoint, 'id' | 'created_at'>) => void;
  reverseGeocodeResult?: ReverseGeocodeResult | null;
}

// Block group statistics from stats endpoint
export interface BlockGroupStats {
  block_groups: Record<string, number>;
  total_block_groups: number;
  demographics_loaded: number;
  acs_vintage: string | null;
}

// Point category config for UI
export interface PointCategoryConfig {
  value: UserMapPoint['category'];
  label: string;
  color: string;
  icon: string;
}
