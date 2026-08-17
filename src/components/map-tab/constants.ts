/**
 * Map Tab Constants
 *
 * Configuration and styling constants for the Map tab
 */

import type { LayerGroup, BasemapStyle, FeatureCategory } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Basemap Configurations
// ─────────────────────────────────────────────────────────────────────────────

export const BASEMAP_OPTIONS: { value: BasemapStyle; label: string }[] = [
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'roadmap', label: 'Map' },
  { value: 'satellite', label: 'Satellite' },
  { value: 'terrain', label: 'Terrain' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Layer Colors
// ─────────────────────────────────────────────────────────────────────────────

export const LAYER_COLORS = {
  // Project boundary layers.
  // Bright yellow, not amber: the boundary has to stay legible over satellite
  // imagery of bare desert ground, which is itself amber (Gregg, 2026-08-14).
  siteBoundary: '#facc15',
  taxParcels: '#3b82f6',
  planParcels: '#10b981',

  // Location intel layers
  demoRings: '#8b5cf6',
  blockGroups: '#6366f1',
  pois: '#ec4899',
  userPoints: '#14b8a6',

  // Comparable layers
  saleComps: '#ef4444',
  rentComps: '#f97316',
  landSales: '#84cc16',

  // Market layers
  recentSales: '#22c55e',
  competitiveProjects: '#f43f5e',

  // Annotation layers
  drawnShapes: '#06b6d4',
  measurements: '#a855f7',
  notes: '#fbbf24',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Ring Colors (matching location-intelligence)
// ─────────────────────────────────────────────────────────────────────────────

export const RING_COLORS: Record<number, { stroke: string; fill: string }> = {
  1: { stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.1)' },
  3: { stroke: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.1)' },
  5: { stroke: '#ec4899', fill: 'rgba(236, 72, 153, 0.1)' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Feature Category Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const FEATURE_CATEGORIES: {
  value: FeatureCategory;
  label: string;
  color: string;
}[] = [
  { value: 'boundary', label: 'Boundary', color: '#f59e0b' },
  { value: 'trade_area', label: 'Trade Area', color: '#8b5cf6' },
  { value: 'land_sale', label: 'Land Sale', color: '#84cc16' },
  { value: 'building_sale', label: 'Building Sale', color: '#ef4444' },
  { value: 'annotation', label: 'Annotation', color: '#06b6d4' },
  { value: 'measurement', label: 'Measurement', color: '#a855f7' },
  { value: 'custom', label: 'Custom', color: '#6b7280' },
];

// Categories organized by feature type
export const CATEGORIES_BY_FEATURE_TYPE: Record<
  'Point' | 'LineString' | 'Polygon',
  { value: FeatureCategory; label: string }[]
> = {
  Point: [
    { value: 'annotation', label: 'Point of Interest' },
    { value: 'custom', label: 'Custom' },
  ],
  LineString: [
    { value: 'measurement', label: 'Measurement' },
    { value: 'boundary', label: 'Boundary Line' },
    { value: 'custom', label: 'Custom' },
  ],
  Polygon: [
    { value: 'boundary', label: 'Site Boundary' },
    { value: 'trade_area', label: 'Trade Area' },
    { value: 'land_sale', label: 'Land Sale Boundary' },
    { value: 'building_sale', label: 'Building Sale Boundary' },
    { value: 'annotation', label: 'Annotation' },
    { value: 'custom', label: 'Custom' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Default Layer State
// ─────────────────────────────────────────────────────────────────────────────

/**
 * How Comparable Unit Sales pins are coloured — by where each sale price falls
 * among the OTHER comps currently on the map.
 *
 * The thresholds are the 25th and 75th percentiles of the filtered set, not
 * fixed dollar amounts, so they move when the radius / days / year filters
 * change. A pin can therefore change colour without the sale changing: it is a
 * statement about that sale's position in this comp set, not a price band.
 *
 * Exported so the legend and the map read the same three values. They were
 * inline literals in MapTab's recentSales memo, which is exactly how a legend
 * ends up describing colours the map no longer uses.
 */
export const RECENT_SALES_PRICE_TIERS = {
  low: { color: '#22c55e', label: 'Lower quarter' },
  mid: { color: '#eab308', label: 'Middle half' },
  high: { color: '#ef4444', label: 'Upper quarter' },
} as const;

export function getDefaultLayerGroups(isDevelopment = false): LayerGroup[] {
  return [
    // LOCATION (MK28 §2) — the land itself and its context. Group id stays
    // 'project-boundary': MapTab and MapCanvas both look layers up by it
    // (taxParcelsLayerVisible, the count wiring), and renaming the id would be
    // a data change dressed as a rename.
    {
      id: 'project-boundary',
      label: 'Location',
      expanded: true,
      layers: [
        {
          id: 'site-boundary',
          label: 'Project Location',
          visible: true,
          color: LAYER_COLORS.siteBoundary,
        },
        {
          id: 'tax-parcels',
          label: 'Tax Parcels',
          visible: true,
          color: LAYER_COLORS.taxParcels,
        },
        {
          id: 'plan-parcels',
          label: 'Plan Parcels',
          visible: true,
          color: LAYER_COLORS.planParcels,
        },
        {
          // Moved out of Market (MK28 §2). Rings are context about WHERE the
          // site is — who lives within a mile of it — not comparable evidence
          // about what it is worth.
          id: 'demo-rings',
          label: 'Demo Rings',
          visible: false,
          color: LAYER_COLORS.demoRings,
        },
      ],
    },
    // MARKET (MK28 §2) — what comparable evidence exists for this deal.
    //
    // The distinction that makes this grouping worth having: COMPARABLE SALES
    // is the asset trading; COMPARABLE UNIT SALES is what the asset produces.
    // A bulk land sale and a house resale down the road are both "sales" and
    // are not remotely the same evidence — which is what made a single
    // "Recent Sales" entry confusing.
    //
    // Each row means something different by project type, so the LAYER ID
    // differs by type while the label stays constant:
    //
    //   row                    land dev              multifamily / income
    //   Comparable Sales       land-sales            sale-comps
    //                          (bulk land trading)   (whole assets trading)
    //   Comparable Unit Sales  recent-sales          rent-comps
    //                          (SFR resales)         (comparable rentals)
    //   Building Permits       building-permits      building-permits
    //
    // Ids are unchanged from before this regrouping — MapTab's count wiring
    // and MapCanvas's visibility lookups key on them, and this is a
    // re-labelling, not a data change.
    {
      id: 'market',
      label: 'Market',
      expanded: true,
      layers: [
        isDevelopment
          ? {
              id: 'land-sales',
              label: 'Comparable Sales',
              visible: false,
              color: LAYER_COLORS.landSales,
            }
          : {
              id: 'sale-comps',
              label: 'Comparable Sales',
              visible: true,
              color: LAYER_COLORS.saleComps,
            },
        isDevelopment
          ? {
              // On by default for development projects so the map's sales
              // layer matches the live feed on Property > Market.
              id: 'recent-sales',
              label: 'Comparable Unit Sales',
              visible: true,
              color: LAYER_COLORS.recentSales,
            }
          : {
              id: 'rent-comps',
              label: 'Comparable Unit Sales',
              visible: true,
              color: LAYER_COLORS.rentComps,
            },
        {
          // PLACEHOLDER — nothing is wired to this, deliberately (MK28 §2).
          // It is named so the shape is visible: permits belong here and have
          // not been connected. Same principle as the zero counts — an empty
          // thing that is NAMED tells you what is missing; a thing that isn't
          // there tells you nothing.
          //
          // Two facts worth not rediscovering:
          //  • Jurisdiction-level permit history ALREADY EXISTS in
          //    landscape.mkt_permit_history — monthly SF and MF counts, 427
          //    months for the City of Maricopa plus Pinal and Maricopa
          //    Counties, with views vw_permit_annual_by_jurisdiction and
          //    vw_permit_msa_monthly. It is a market indicator that CHARTS; it
          //    carries no locations and does not map.
          //  • Lot-level permits — the mappable kind, from the city's own
          //    portal — come from a separate tool outside the app. That is the
          //    piece this placeholder is waiting on.
          id: 'building-permits',
          label: 'Building Permits',
          visible: false,
          color: LAYER_COLORS.competitiveProjects,
        },
        {
          // Not one of the three rows Gregg named, but it renders real data
          // and dropping it would be a silent regression. Left in Market,
          // which is where it belongs.
          id: 'competitive-projects',
          label: 'Competitive Projects',
          visible: false,
          color: LAYER_COLORS.competitiveProjects,
        },
      ],
    },
    {
      id: 'annotations',
      label: 'Annotations',
      expanded: true,
      layers: [
        {
          id: 'drawn-shapes',
          label: 'Drawn Shapes',
          visible: true,
          color: LAYER_COLORS.drawnShapes,
        },
        {
          id: 'measurements',
          label: 'Measurements',
          visible: true,
          color: LAYER_COLORS.measurements,
        },
        {
          id: 'notes',
          label: 'Notes',
          visible: false,
          color: LAYER_COLORS.notes,
        },
      ],
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Map Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_MAP_CENTER: [number, number] = [-111.789, 33.448]; // Phoenix, AZ
export const DEFAULT_MAP_ZOOM = 12;

// ESRI Tile URLs
export const ESRI_IMAGERY_URL =
  'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
export const ESRI_TRANSPORTATION_URL =
  'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}';
export const ESRI_BOUNDARIES_URL =
  'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
export const OSM_STREETS_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// ─────────────────────────────────────────────────────────────────────────────
// Draw Tool Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const DRAW_TOOLS = [
  { id: 'point', label: 'Point', icon: 'pin', shortcut: 'P' },
  { id: 'line', label: 'Line', icon: 'ruler', shortcut: 'L' },
  { id: 'polygon', label: 'Polygon', icon: 'hexagon', shortcut: 'G' },
  { id: 'edit', label: 'Edit', icon: 'pencil', shortcut: 'E' },
  { id: 'delete', label: 'Delete', icon: 'trash', shortcut: 'D' },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Measurement Units
// ─────────────────────────────────────────────────────────────────────────────

export const MEASUREMENT_UNITS = {
  length: {
    feet: { factor: 3.28084, suffix: 'ft' },
    miles: { factor: 0.000621371, suffix: 'mi' },
    meters: { factor: 1, suffix: 'm' },
  },
  area: {
    sqft: { factor: 10.7639, suffix: 'sq ft' },
    acres: { factor: 0.000247105, suffix: 'acres' },
    sqmeters: { factor: 1, suffix: 'sq m' },
  },
};
