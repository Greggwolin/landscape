/**
 * GeoJSON type definitions for map features
 */

export type LngLat = [number, number];

export interface SiteFeatureProps {
  id: string;
  name?: string;
  // Either height in meters or stories; if neither provided, defaultStories is used
  height?: number | null;
  stories?: number | null;
  defaultStories?: number; // fallback, e.g., 3
  color?: string; // optional hex
}

export interface FeatureCollection<TProps = SiteFeatureProps> {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    id?: string | number;
    properties: TProps;
    geometry: {
      type: 'Polygon' | 'MultiPolygon';
      coordinates: number[][][] | number[][][][];
    };
  }>;
}

export interface ProjectMapData {
  center: LngLat; // e.g., project centroid
  footprint: FeatureCollection; // subject property polygons
  context?: FeatureCollection; // optional parcels/roads (unstyled lines/fills)
}

export interface CompFeatureProps extends SiteFeatureProps {
  compId: string; // internal comp key
  type: 'sale' | 'listing' | 'rental';
  price?: number | null;
  date?: string | null; // ISO
  selected?: boolean;
}

export interface CompsMapData {
  center: LngLat;
  subject: FeatureCollection;           // subject footprint
  comps: FeatureCollection<CompFeatureProps>; // comp footprints or point buffers
}
