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
  // Project boundary layers
  siteBoundary: '#f59e0b',
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

export function getDefaultLayerGroups(): LayerGroup[] {
  return [
    {
      id: 'project-boundary',
      label: 'Project Location',
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
      ],
    },
    {
      id: 'location-intel',
      label: 'Location Intel',
      expanded: true,
      layers: [
        {
          id: 'demo-rings',
          label: 'Demo Rings',
          visible: false,
          color: LAYER_COLORS.demoRings,
        },
        // {
        //   id: 'block-groups',
        //   label: 'Block Groups',
        //   visible: false,
        //   color: LAYER_COLORS.blockGroups,
        // },
        // {
        //   id: 'pois',
        //   label: 'POIs',
        //   visible: false,
        //   color: LAYER_COLORS.pois,
        // },
        // {
        //   id: 'user-points',
        //   label: 'User Points',
        //   visible: true,
        //   color: LAYER_COLORS.userPoints,
        // },
      ],
    },
    {
      id: 'comparables',
      label: 'Comparables',
      expanded: true,
      layers: [
        {
          id: 'sale-comps',
          label: 'Sale Comps',
          visible: true,
          color: LAYER_COLORS.saleComps,
        },
        {
          id: 'rent-comps',
          label: 'Rent Comps',
          visible: true,
          color: LAYER_COLORS.rentComps,
        },
        {
          id: 'land-sales',
          label: 'Land Sales',
          visible: false,
          color: LAYER_COLORS.landSales,
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
