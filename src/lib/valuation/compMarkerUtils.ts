/**
 * Shared marker color utilities for comparable property maps
 *
 * Extracted to a standalone module to avoid circular/heavy dependency chains
 * between ComparablesMap and SalesCompDetailModal.
 */

/** High-contrast colors that pop on aerial/satellite imagery. Indexed by (compNumber - 1). */
export const COMP_MARKER_COLORS = [
  '#FF1744', // vivid red
  '#2979FF', // electric blue
  '#00E676', // neon green
  '#FF9100', // hot orange
  '#D500F9', // electric purple
  '#FFEA00', // bright yellow
  '#00E5FF', // cyan
  '#FF4081', // hot pink
  '#76FF03', // lime
  '#FF6D00', // deep orange
  '#651FFF', // deep purple
  '#1DE9B6', // teal accent
];

const LIGHT_BG_COLORS = new Set(['#FFEA00', '#76FF03', '#00E5FF', '#00E676', '#1DE9B6']);

/** Returns the marker color for a given comp number (1-based). */
export function getCompMarkerColor(compNumber: number) {
  const bg = COMP_MARKER_COLORS[(compNumber - 1) % COMP_MARKER_COLORS.length];
  const text = LIGHT_BG_COLORS.has(bg) ? '#000' : '#fff';
  return { bg, text };
}
