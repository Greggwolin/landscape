/**
 * Studio Components - Barrel Export
 *
 * CRITICAL STYLING RULES:
 * 1. Use CSS variables from studio-theme.css for ALL colors
 * 2. NO Tailwind color classes (bg-*, text-*, border-* with colors)
 * 3. Tailwind layout utilities ARE allowed (flex, grid, p-*, m-*, gap-*, etc.)
 * 4. Use CoreUI React components as the base design system
 *
 * @example
 * // CORRECT - CSS variable for color
 * <div style={{ backgroundColor: 'var(--studio-panel-bg)' }}>
 *
 * // CORRECT - studio-* CSS class
 * <div className="studio-panel">
 *
 * // CORRECT - Tailwind layout utility
 * <div className="flex gap-4 p-4">
 *
 * // WRONG - Tailwind color class
 * <div className="bg-gray-800">  // NO!
 *
 * @version 1.1
 * @created 2026-01-20
 * @updated 2026-01-20 - Added TileGrid, LandscaperPanel, StudioPanel
 */

// =============================================================================
// LAYOUT COMPONENTS
// =============================================================================
export { StudioLayout } from './layout/StudioLayout';
export type { StudioLayoutProps } from './layout/StudioLayout';

// =============================================================================
// PANEL COMPONENTS
// =============================================================================
export { StudioPanel } from './StudioPanel';
export type { StudioPanelProps } from './StudioPanel';

// =============================================================================
// NAVIGATION COMPONENTS
// =============================================================================
export { TileGrid } from './TileGrid';
export type {
  TileGridProps,
  TileConfig,
  TileStatus,
  AnalysisType,
} from './TileGrid';

export { LandscaperPanel } from './LandscaperPanel';
export type { LandscaperPanelProps, ActivityItem } from './LandscaperPanel';

// =============================================================================
// CORE COMPONENTS (placeholders for future)
// =============================================================================
// export { StudioCard } from './core/StudioCard';

// =============================================================================
// PROPERTY COMPONENTS (placeholders for future)
// =============================================================================
// export { PropertyAttributeForm } from './property/PropertyAttributeForm';
// export { PropertyAttributeGrid } from './property/PropertyAttributeGrid';

// =============================================================================
// VALUATION COMPONENTS (placeholders for future)
// =============================================================================
// export { ValuationSummary } from './valuation/ValuationSummary';
// export { HBUPanel } from './valuation/HBUPanel';

// =============================================================================
// FORM COMPONENTS (placeholders for future)
// =============================================================================
// export { StudioInput } from './forms/StudioInput';
// export { StudioSelect } from './forms/StudioSelect';

// =============================================================================
// SHARED COMPONENTS (placeholders for future)
// =============================================================================
// export { StudioBadge } from './shared/StudioBadge';
// export { StudioDivider } from './shared/StudioDivider';
