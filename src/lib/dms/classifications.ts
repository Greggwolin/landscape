// Mirrors landscape.lu_media_classification (active rows only).
// IDs and codes MUST match the DB exactly — reclassify writes use classification_id.
// badge_color may be a CoreUI semantic name (success/info/etc.) OR any CSS color
// value (hex, rgb, var()) — the renderer falls through to the literal value.
// Each classification gets a distinct hue so the badge color uniquely identifies it.

export interface Classification {
  classification_id: number;
  code: string;
  name: string;
  badge_color: string;
}

const BADGE_COLOR_VARS: Record<string, string> = {
  primary: 'var(--cui-primary)',
  secondary: 'var(--cui-secondary)',
  success: 'var(--cui-success)',
  danger: 'var(--cui-danger)',
  warning: 'var(--cui-warning)',
  info: 'var(--cui-info)',
  light: 'var(--cui-light)',
  dark: 'var(--cui-dark)',
};

export function badgeColorToCssVar(color?: string | null): string {
  if (!color) return 'var(--cui-secondary)';
  return BADGE_COLOR_VARS[color] ?? color;
}

export const ALL_CLASSIFICATIONS: Classification[] = [
  { classification_id: 1,  code: 'property_photo',   name: 'Photo: Exterior',   badge_color: '#3b82f6' }, // blue (blue-500)
  { classification_id: 5,  code: 'aerial_map',       name: 'Photo: Interior',   badge_color: '#6366f1' }, // blue (indigo-500)
  { classification_id: 2,  code: 'aerial_photo',     name: 'Photo: Aerial',     badge_color: '#0ea5e9' }, // blue (sky-500)
  { classification_id: 16, code: 'photo_comparable', name: 'Photo: Comparable', badge_color: '#06b6d4' }, // blue (cyan-500)
  { classification_id: 7,  code: 'location_map',     name: 'Location Map',      badge_color: '#22c55e' }, // green (green-500)
  { classification_id: 15, code: 'other_map',        name: 'Other Map',         badge_color: '#10b981' }, // green (emerald-500)
  { classification_id: 6,  code: 'zoning_map',       name: 'Zoning Map',        badge_color: '#16a34a' }, // green (green-600)
  { classification_id: 3,  code: 'site_plan',        name: 'Site Plan',         badge_color: '#84cc16' }, // green (lime-500)
  { classification_id: 10, code: 'infographic',      name: 'Infographic',       badge_color: '#eab308' }, // yellow
  { classification_id: 4,  code: 'floor_plan',       name: 'Floor Plan',        badge_color: '#f97316' }, // orange
  { classification_id: 11, code: 'rendering',        name: 'Rendering',         badge_color: '#ef4444' }, // red
  { classification_id: 14, code: 'other',            name: 'Misc / Other',      badge_color: '#6b7280' }, // gray
];

export function findByCode(code: string): Classification | undefined {
  return ALL_CLASSIFICATIONS.find((c) => c.code === code);
}

export function findById(id: number): Classification | undefined {
  return ALL_CLASSIFICATIONS.find((c) => c.classification_id === id);
}
