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
 * @version 1.0
 * @created 2026-01-20
 */

// Layout components
export { StudioLayout } from './layout/StudioLayout';

// Core components (placeholders for future)
// export { StudioPanel } from './core/StudioPanel';
// export { StudioCard } from './core/StudioCard';

// Property components (placeholders for future)
// export { PropertyAttributeForm } from './property/PropertyAttributeForm';
// export { PropertyAttributeGrid } from './property/PropertyAttributeGrid';

// Valuation components (placeholders for future)
// export { ValuationSummary } from './valuation/ValuationSummary';
// export { HBUPanel } from './valuation/HBUPanel';

// Form components (placeholders for future)
// export { StudioInput } from './forms/StudioInput';
// export { StudioSelect } from './forms/StudioSelect';

// Shared components (placeholders for future)
// export { StudioBadge } from './shared/StudioBadge';
// export { StudioDivider } from './shared/StudioDivider';
