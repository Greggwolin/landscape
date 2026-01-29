/**
 * Color Registry - CoreUI+ Design System
 *
 * Single source of truth for all colors displayed in the Style Catalog.
 * Each entry maps to a CSS variable defined in coreui-theme.css.
 * Includes explicit light/dark hex values to avoid DOM manipulation.
 *
 * @module config/colorRegistry
 */

export interface ColorDefinition {
  /** CSS variable name (e.g., '--cui-primary') */
  variable: string;
  /** Display name in Proper Case */
  name: string;
  /** Section/category for grouping */
  category: string;
  /** Optional usage description */
  description?: string;
  /** Optional: if this has an RGB variant for rgba() usage */
  rgbVariable?: string;
  /** Optional: paired text color CSS variable for contrast */
  textVariable?: string;
  /** Light mode hex value */
  lightValue: string;
  /** Dark mode hex value */
  darkValue: string;
}

/**
 * All CoreUI+ colors organized by category
 * Values extracted from coreui-theme.css
 */
export const colorRegistry: ColorDefinition[] = [
  // ============================================
  // SECTION 1: CoreUI Semantic Colors
  // ============================================
  {
    variable: '--cui-primary',
    name: 'Primary',
    category: 'CoreUI Semantic',
    description: 'Primary actions, links, focus states',
    rgbVariable: '--cui-primary-rgb',
    textVariable: '#ffffff',
    lightValue: '#0ea5e9',
    darkValue: '#0ea5e9',
  },
  {
    variable: '--cui-secondary',
    name: 'Secondary',
    category: 'CoreUI Semantic',
    description: 'Secondary actions, muted elements',
    rgbVariable: '--cui-secondary-rgb',
    textVariable: '#ffffff',
    lightValue: '#6b7785',
    darkValue: '#6b7785',
  },
  {
    variable: '--cui-success',
    name: 'Success',
    category: 'CoreUI Semantic',
    description: 'Positive states, complete, approved',
    rgbVariable: '--cui-success-rgb',
    textVariable: '#ffffff',
    lightValue: '#198754',
    darkValue: '#198754',
  },
  {
    variable: '--cui-danger',
    name: 'Danger',
    category: 'CoreUI Semantic',
    description: 'Errors, delete, negative actions',
    rgbVariable: '--cui-danger-rgb',
    textVariable: '#ffffff',
    lightValue: '#dc3545',
    darkValue: '#dc3545',
  },
  {
    variable: '--cui-warning',
    name: 'Warning',
    category: 'CoreUI Semantic',
    description: 'Caution, attention needed',
    rgbVariable: '--cui-warning-rgb',
    textVariable: '--cui-dark',
    lightValue: '#ffc107',
    darkValue: '#ffc107',
  },
  {
    variable: '--cui-info',
    name: 'Info',
    category: 'CoreUI Semantic',
    description: 'Informational, neutral highlight',
    rgbVariable: '--cui-info-rgb',
    textVariable: '#ffffff',
    lightValue: '#0dcaf0',
    darkValue: '#0dcaf0',
  },

  // ============================================
  // SECTION 2: Surface Colors
  // ============================================
  {
    variable: '--cui-ls-surface-bg',
    name: 'Surface Background',
    category: 'Surfaces',
    description: 'Page/body background',
    textVariable: '--cui-body-color',
    lightValue: '#ffffff',
    darkValue: '#0b1220',
  },
  {
    variable: '--cui-ls-surface-card',
    name: 'Surface Card',
    category: 'Surfaces',
    description: 'Card backgrounds',
    textVariable: '--cui-body-color',
    lightValue: '#f7f7fb',
    darkValue: '#111827',
  },
  {
    variable: '--cui-ls-surface-card-header',
    name: 'Card Header',
    category: 'Surfaces',
    description: 'Card header backgrounds',
    textVariable: '--cui-body-color',
    lightValue: '#f0f1f2',
    darkValue: '#1f2937',
  },
  {
    variable: '--cui-ls-surface-page-bg',
    name: 'Page Background',
    category: 'Surfaces',
    description: 'Main content area background',
    textVariable: '--cui-body-color',
    lightValue: '#e6e7eb',
    darkValue: '#0b1220',
  },
  {
    variable: '--cui-ls-surface-900',
    name: 'Surface 900',
    category: 'Surfaces',
    description: 'Deepest background (dark mode)',
    textVariable: '--cui-ls-text-inverse',
    lightValue: '#0f172a',
    darkValue: '#0f172a',
  },
  {
    variable: '--cui-ls-surface-800',
    name: 'Surface 800',
    category: 'Surfaces',
    description: 'Card backgrounds (dark mode)',
    textVariable: '--cui-ls-text-inverse',
    lightValue: '#1e293b',
    darkValue: '#1e293b',
  },
  {
    variable: '--cui-ls-surface-700',
    name: 'Surface 700',
    category: 'Surfaces',
    description: 'Elevated surfaces (dark mode)',
    textVariable: '--cui-ls-text-inverse',
    lightValue: '#334155',
    darkValue: '#334155',
  },

  // ============================================
  // SECTION 3: Text Colors
  // ============================================
  {
    variable: '--cui-ls-text-primary',
    name: 'Text Primary',
    category: 'Text',
    description: 'Primary body text',
    textVariable: '--cui-body-bg',
    lightValue: '#0f172a',
    darkValue: '#e5e7eb',
  },
  {
    variable: '--cui-ls-text-secondary',
    name: 'Text Secondary',
    category: 'Text',
    description: 'Secondary/muted text',
    textVariable: '--cui-body-bg',
    lightValue: '#475569',
    darkValue: '#9ca3af',
  },
  {
    variable: '--cui-ls-text-inverse',
    name: 'Text Inverse',
    category: 'Text',
    description: 'Text on dark backgrounds',
    textVariable: '--cui-dark',
    lightValue: '#ffffff',
    darkValue: '#111827',
  },

  // ============================================
  // SECTION 4: Border/Line Colors
  // ============================================
  {
    variable: '--cui-ls-line-soft',
    name: 'Line Soft',
    category: 'Borders',
    description: 'Subtle borders, dividers',
    textVariable: '--cui-body-color',
    lightValue: '#e5e7eb',
    darkValue: '#1f2937',
  },
  {
    variable: '--cui-ls-line-strong',
    name: 'Line Strong',
    category: 'Borders',
    description: 'Prominent borders',
    textVariable: '--cui-body-color',
    lightValue: '#cbd5e1',
    darkValue: '#374151',
  },

  // ============================================
  // SECTION 5: Brand Colors
  // ============================================
  {
    variable: '--cui-ls-brand-primary',
    name: 'Brand Primary',
    category: 'Brand',
    description: 'Primary brand color',
    textVariable: '#ffffff',
    lightValue: '#0ea5e9',
    darkValue: '#0ea5e9',
  },
  {
    variable: '--cui-ls-brand-accent',
    name: 'Brand Accent',
    category: 'Brand',
    description: 'Secondary brand accent',
    textVariable: '#ffffff',
    lightValue: '#14b8a6',
    darkValue: '#14b8a6',
  },
  {
    variable: '--cui-ls-landscaper-cyan',
    name: 'Landscaper Cyan',
    category: 'Brand',
    description: 'AI assistant accent color',
    textVariable: '#ffffff',
    lightValue: '#00d9ff',
    darkValue: '#00d9ff',
  },
  {
    variable: '--cui-ls-accent-purple',
    name: 'Accent Purple',
    category: 'Brand',
    description: 'Purple accent (distinct from CoreUI info)',
    textVariable: '#ffffff',
    lightValue: '#7a80ec',
    darkValue: '#7a80ec',
  },

  // ============================================
  // SECTION 6: Navigation Tab Colors
  // ============================================
  {
    variable: '--cui-ls-nav-home',
    name: 'Home',
    category: 'Navigation Tabs',
    description: 'Home/Overview tab',
    textVariable: '#ffffff',
    lightValue: '#3d99f5',
    darkValue: '#3d99f5',
  },
  {
    variable: '--cui-ls-nav-property',
    name: 'Property',
    category: 'Navigation Tabs',
    description: 'Property tab',
    textVariable: '#ffffff',
    lightValue: '#57c68a',
    darkValue: '#57c68a',
  },
  {
    variable: '--cui-ls-nav-operations',
    name: 'Operations',
    category: 'Navigation Tabs',
    description: 'Operations/Budget tab',
    textVariable: '#ffffff',
    lightValue: '#7a80ec',
    darkValue: '#7a80ec',
  },
  {
    variable: '--cui-ls-nav-valuation',
    name: 'Valuation',
    category: 'Navigation Tabs',
    description: 'Valuation/Feasibility tab',
    textVariable: '--cui-dark',
    lightValue: '#f2c40d',
    darkValue: '#f2c40d',
  },
  {
    variable: '--cui-ls-nav-capitalization',
    name: 'Capitalization',
    category: 'Navigation Tabs',
    description: 'Capital structure tab',
    textVariable: '#ffffff',
    lightValue: '#9b59b6',
    darkValue: '#9b59b6',
  },
  {
    variable: '--cui-ls-nav-reports',
    name: 'Reports',
    category: 'Navigation Tabs',
    description: 'Reports tab',
    textVariable: '#ffffff',
    lightValue: '#6b7785',
    darkValue: '#6b7785',
  },
  {
    variable: '--cui-ls-nav-documents',
    name: 'Documents',
    category: 'Navigation Tabs',
    description: 'Documents tab',
    textVariable: '#ffffff',
    lightValue: '#272d35',
    darkValue: '#272d35',
  },
  {
    variable: '--cui-ls-nav-map',
    name: 'Map',
    category: 'Navigation Tabs',
    description: 'Map/GIS tab',
    textVariable: '#ffffff',
    lightValue: '#2563eb',
    darkValue: '#2563eb',
  },

  // ============================================
  // SECTION 7: Project Types
  // ============================================
  {
    variable: '--cui-ls-project-land-dev',
    name: 'Land Development',
    category: 'Project Types',
    description: 'Land development projects',
    textVariable: '#ffffff',
    lightValue: '#16a34a',
    darkValue: '#16a34a',
  },
  {
    variable: '--cui-ls-project-multifamily',
    name: 'Multifamily',
    category: 'Project Types',
    description: 'Multifamily projects',
    textVariable: '#ffffff',
    lightValue: '#7c3aed',
    darkValue: '#7c3aed',
  },
  {
    variable: '--cui-ls-project-office',
    name: 'Office',
    category: 'Project Types',
    description: 'Office projects',
    textVariable: '#ffffff',
    lightValue: '#2563eb',
    darkValue: '#2563eb',
  },
  {
    variable: '--cui-ls-project-retail',
    name: 'Retail',
    category: 'Project Types',
    description: 'Retail projects',
    textVariable: '#ffffff',
    lightValue: '#ea580c',
    darkValue: '#ea580c',
  },
  {
    variable: '--cui-ls-project-industrial',
    name: 'Industrial',
    category: 'Project Types',
    description: 'Industrial projects',
    textVariable: '#ffffff',
    lightValue: '#64748b',
    darkValue: '#64748b',
  },
  {
    variable: '--cui-ls-project-mixed-use',
    name: 'Mixed Use',
    category: 'Project Types',
    description: 'Mixed-use projects',
    textVariable: '#ffffff',
    lightValue: '#0891b2',
    darkValue: '#0891b2',
  },
  {
    variable: '--cui-ls-project-hotel',
    name: 'Hotel',
    category: 'Project Types',
    description: 'Hotel/hospitality projects',
    textVariable: '#ffffff',
    lightValue: '#db2777',
    darkValue: '#db2777',
  },

  // ============================================
  // SECTION 8: Analysis Types
  // ============================================
  {
    variable: '--cui-ls-analysis-valuation',
    name: 'Valuation',
    category: 'Analysis Types',
    description: 'Property valuation analysis',
    textVariable: '--cui-dark',
    lightValue: '#f2c40d',
    darkValue: '#f2c40d',
  },
  {
    variable: '--cui-ls-analysis-investment',
    name: 'Investment',
    category: 'Analysis Types',
    description: 'Investment analysis',
    textVariable: '#ffffff',
    lightValue: '#2563eb',
    darkValue: '#2563eb',
  },
  {
    variable: '--cui-ls-analysis-development',
    name: 'Development',
    category: 'Analysis Types',
    description: 'Development feasibility',
    textVariable: '#ffffff',
    lightValue: '#16a34a',
    darkValue: '#16a34a',
  },
  {
    variable: '--cui-ls-analysis-feasibility',
    name: 'Feasibility',
    category: 'Analysis Types',
    description: 'General feasibility study',
    textVariable: '#ffffff',
    lightValue: '#7c3aed',
    darkValue: '#7c3aed',
  },

  // ============================================
  // SECTION 9: Land Use Families
  // ============================================
  {
    variable: '--cui-ls-family-residential',
    name: 'Residential',
    category: 'Land Use Families',
    description: 'Residential land use',
    textVariable: '#ffffff',
    lightValue: '#16a34a',
    darkValue: '#16a34a',
  },
  {
    variable: '--cui-ls-family-commercial',
    name: 'Commercial',
    category: 'Land Use Families',
    description: 'Commercial land use',
    textVariable: '#ffffff',
    lightValue: '#2563eb',
    darkValue: '#2563eb',
  },
  {
    variable: '--cui-ls-family-industrial',
    name: 'Industrial',
    category: 'Land Use Families',
    description: 'Industrial land use',
    textVariable: '#ffffff',
    lightValue: '#64748b',
    darkValue: '#64748b',
  },
  {
    variable: '--cui-ls-family-common-areas',
    name: 'Common Areas',
    category: 'Land Use Families',
    description: 'Common area land use',
    textVariable: '#ffffff',
    lightValue: '#0d9488',
    darkValue: '#0d9488',
  },
  {
    variable: '--cui-ls-family-public',
    name: 'Public',
    category: 'Land Use Families',
    description: 'Public land use',
    textVariable: '#ffffff',
    lightValue: '#7c3aed',
    darkValue: '#7c3aed',
  },
  {
    variable: '--cui-ls-family-other',
    name: 'Other',
    category: 'Land Use Families',
    description: 'Other land use',
    textVariable: '--cui-dark',
    lightValue: '#6b7280',
    darkValue: '#6b7280',
  },
  {
    variable: '--cui-ls-family-institutional',
    name: 'Institutional',
    category: 'Land Use Families',
    description: 'Institutional land use',
    textVariable: '#ffffff',
    lightValue: '#4f46e5',
    darkValue: '#4f46e5',
  },
  {
    variable: '--cui-ls-family-mixed-use',
    name: 'Mixed Use',
    category: 'Land Use Families',
    description: 'Mixed-use land use',
    textVariable: '#ffffff',
    lightValue: '#0891b2',
    darkValue: '#0891b2',
  },
  {
    variable: '--cui-ls-family-open-space',
    name: 'Open Space',
    category: 'Land Use Families',
    description: 'Open space land use',
    textVariable: '#ffffff',
    lightValue: '#059669',
    darkValue: '#059669',
  },

  // ============================================
  // SECTION 10: Status Colors
  // ============================================
  {
    variable: '--cui-ls-status-complete',
    name: 'Complete',
    category: 'Status Colors',
    description: 'Task/item complete',
    textVariable: '#ffffff',
    lightValue: '#198754',
    darkValue: '#198754',
  },
  {
    variable: '--cui-ls-status-partial',
    name: 'Partial',
    category: 'Status Colors',
    description: 'Partially complete',
    textVariable: '--cui-dark',
    lightValue: '#ffc107',
    darkValue: '#ffc107',
  },
  {
    variable: '--cui-ls-status-pending',
    name: 'Pending',
    category: 'Status Colors',
    description: 'Awaiting action',
    textVariable: '#ffffff',
    lightValue: '#6b7785',
    darkValue: '#6b7785',
  },
  {
    variable: '--cui-ls-status-blocked',
    name: 'Blocked',
    category: 'Status Colors',
    description: 'Blocked/error state',
    textVariable: '#ffffff',
    lightValue: '#dc3545',
    darkValue: '#dc3545',
  },

  // ============================================
  // SECTION 11: Chip/Badge Colors
  // ============================================
  {
    variable: '--cui-ls-chip-info',
    name: 'Chip Info',
    category: 'Chips',
    description: 'Informational badges',
    textVariable: '#ffffff',
    lightValue: '#2563eb',
    darkValue: '#2563eb',
  },
  {
    variable: '--cui-ls-chip-success',
    name: 'Chip Success',
    category: 'Chips',
    description: 'Success badges',
    textVariable: '#ffffff',
    lightValue: '#16a34a',
    darkValue: '#16a34a',
  },
  {
    variable: '--cui-ls-chip-warning',
    name: 'Chip Warning',
    category: 'Chips',
    description: 'Warning badges',
    textVariable: '--cui-dark',
    lightValue: '#ca8a04',
    darkValue: '#ca8a04',
  },
  {
    variable: '--cui-ls-chip-error',
    name: 'Chip Error',
    category: 'Chips',
    description: 'Error badges',
    textVariable: '#ffffff',
    lightValue: '#dc2626',
    darkValue: '#dc2626',
  },
  {
    variable: '--cui-ls-chip-muted',
    name: 'Chip Muted',
    category: 'Chips',
    description: 'Muted/neutral badges',
    textVariable: '--cui-body-color',
    lightValue: '#4b5563',
    darkValue: '#4b5563',
  },

  // ============================================
  // SECTION 12: Operations P&L Colors
  // ============================================
  {
    variable: '--cui-ls-ops-positive',
    name: 'Positive',
    category: 'Operations P&L',
    description: 'Positive values/growth',
    textVariable: '#ffffff',
    lightValue: '#68d391',
    darkValue: '#68d391',
  },
  {
    variable: '--cui-ls-ops-negative',
    name: 'Negative',
    category: 'Operations P&L',
    description: 'Negative values/decline',
    textVariable: '#ffffff',
    lightValue: '#fc8181',
    darkValue: '#fc8181',
  },
  {
    variable: '--cui-ls-ops-neutral',
    name: 'Neutral',
    category: 'Operations P&L',
    description: 'Neutral values',
    textVariable: '--cui-body-color',
    lightValue: '#6b7785',
    darkValue: '#6b7785',
  },
  {
    variable: '--cui-ls-ops-muted',
    name: 'Muted',
    category: 'Operations P&L',
    description: 'De-emphasized values',
    textVariable: '--cui-body-color',
    lightValue: '#a0aec0',
    darkValue: '#a0aec0',
  },
  {
    variable: '--cui-ls-ops-warn',
    name: 'Warning',
    category: 'Operations P&L',
    description: 'Caution indicators',
    textVariable: '--cui-dark',
    lightValue: '#f6ad55',
    darkValue: '#f6ad55',
  },
];

/**
 * Get colors grouped by category
 */
export function getColorsByCategory(): Record<string, ColorDefinition[]> {
  return colorRegistry.reduce((acc, color) => {
    if (!acc[color.category]) {
      acc[color.category] = [];
    }
    acc[color.category].push(color);
    return acc;
  }, {} as Record<string, ColorDefinition[]>);
}

/**
 * Category display order
 */
export const categoryOrder = [
  'CoreUI Semantic',
  'Surfaces',
  'Text',
  'Borders',
  'Brand',
  'Navigation Tabs',
  'Project Types',
  'Analysis Types',
  'Land Use Families',
  'Status Colors',
  'Chips',
  'Operations P&L',
];
