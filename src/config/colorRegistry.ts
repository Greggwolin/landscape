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
  // Base Colors
  // ============================================
  {
    variable: '--cui-primary',
    name: 'Primary',
    category: 'Base Colors',
    description: 'Primary actions, links, focus states',
    rgbVariable: '--cui-primary-rgb',
    textVariable: '#ffffff',
    lightValue: '#4f7fc7',
    darkValue: '#4f7fc7',
  },
  {
    variable: '--cui-secondary',
    name: 'Secondary',
    category: 'Base Colors',
    description: 'Secondary actions, muted elements',
    rgbVariable: '--cui-secondary-rgb',
    textVariable: '#ffffff',
    lightValue: '#6b7785',
    darkValue: '#6b7785',
  },
  {
    variable: '--cui-success',
    name: 'Success',
    category: 'Base Colors',
    description: 'Positive states, complete, approved',
    rgbVariable: '--cui-success-rgb',
    textVariable: '#080A0C',
    lightValue: '#57c68a',
    darkValue: '#57c68a',
  },
  {
    variable: '--cui-danger',
    name: 'Danger',
    category: 'Base Colors',
    description: 'Errors, delete, destructive actions',
    rgbVariable: '--cui-danger-rgb',
    textVariable: '#ffffff',
    lightValue: '#e55353',
    darkValue: '#e55353',
  },
  {
    variable: '--cui-warning',
    name: 'Warning',
    category: 'Base Colors',
    description: 'Warnings, caution states',
    rgbVariable: '--cui-warning-rgb',
    textVariable: '#080A0C',
    lightValue: '#f2c40d',
    darkValue: '#f2c40d',
  },
  {
    variable: '--cui-info',
    name: 'Info',
    category: 'Base Colors',
    description: 'Informational highlights',
    rgbVariable: '--cui-info-rgb',
    textVariable: '#ffffff',
    lightValue: '#7a80ec',
    darkValue: '#7a80ec',
  },

  // ============================================
  // Primary Variant Ramp
  // ============================================
  {
    variable: '--cui-primary-ramp-01',
    name: 'Primary Ramp 01',
    category: 'Primary Variant Ramp',
    description: 'Darkest primary action accent (buttons/pills).',
    textVariable: '#ffffff',
    lightValue: '#1f5fbf',
    darkValue: '#1f5fbf',
  },
  {
    variable: '--cui-primary-ramp-02',
    name: 'Primary Ramp 02',
    category: 'Primary Variant Ramp',
    description: 'Primary hover/active emphasis.',
    textVariable: '#ffffff',
    lightValue: '#316bc2',
    darkValue: '#316bc2',
  },
  {
    variable: '--cui-primary-ramp-03',
    name: 'Primary Ramp 03',
    category: 'Primary Variant Ramp',
    description: 'Primary base/intermediate shade.',
    textVariable: '#ffffff',
    lightValue: '#4f7fc7',
    darkValue: '#4f7fc7',
  },
  {
    variable: '--cui-primary-ramp-04',
    name: 'Primary Ramp 04',
    category: 'Primary Variant Ramp',
    description: 'Primary hover/active accent.',
    textVariable: '#ffffff',
    lightValue: '#6789bb',
    darkValue: '#6789bb',
  },
  {
    variable: '--cui-primary-ramp-05',
    name: 'Primary Ramp 05',
    category: 'Primary Variant Ramp',
    description: 'Lightest primary accent.',
    textVariable: '#ffffff',
    lightValue: '#7390bb',
    darkValue: '#7390bb',
  },

  // ============================================
  // Danger Variant Ramp
  // ============================================
  {
    variable: '--cui-danger-ramp-01',
    name: 'Danger Ramp 01',
    category: 'Danger Variant Ramp',
    description: 'Darkest danger action accent (buttons/pills).',
    textVariable: '#ffffff',
    lightValue: '#ae0303',
    darkValue: '#ae0303',
  },
  {
    variable: '--cui-danger-ramp-02',
    name: 'Danger Ramp 02',
    category: 'Danger Variant Ramp',
    description: 'Danger active emphasis.',
    textVariable: '#ffffff',
    lightValue: '#d53434',
    darkValue: '#d53434',
  },
  {
    variable: '--cui-danger-ramp-03',
    name: 'Danger Ramp 03',
    category: 'Danger Variant Ramp',
    description: 'Danger base/intermediate shade.',
    textVariable: '#ffffff',
    lightValue: '#e55353',
    darkValue: '#e55353',
  },
  {
    variable: '--cui-danger-ramp-04',
    name: 'Danger Ramp 04',
    category: 'Danger Variant Ramp',
    description: 'Danger hover/active accent.',
    textVariable: '#ffffff',
    lightValue: '#ed6565',
    darkValue: '#ed6565',
  },

  // ============================================
  // Dark Companions
  // ============================================
  {
    variable: '--cui-primary-dark',
    name: 'Primary Dark',
    category: 'Dark Companions',
    description: 'Dark mode primary emphasis',
    lightValue: '#1f5fbf',
    darkValue: '#1f5fbf',
  },
  {
    variable: '--cui-secondary-dark',
    name: 'Secondary Dark',
    category: 'Dark Companions',
    description: 'Dark mode secondary emphasis',
    lightValue: '#4b5563',
    darkValue: '#4b5563',
  },
  {
    variable: '--cui-success-dark',
    name: 'Success Dark',
    category: 'Dark Companions',
    description: 'Dark mode success hue',
    lightValue: '#2f855a',
    darkValue: '#2f855a',
  },
  {
    variable: '--cui-danger-dark',
    name: 'Danger Dark',
    category: 'Dark Companions',
    description: 'Dark mode danger hue',
    lightValue: '#ae0303',
    darkValue: '#ae0303',
  },
  {
    variable: '--cui-warning-dark',
    name: 'Warning Dark',
    category: 'Dark Companions',
    description: 'Dark mode warning hue',
    lightValue: '#b45309',
    darkValue: '#b45309',
  },
  {
    variable: '--cui-info-dark',
    name: 'Info Dark',
    category: 'Dark Companions',
    description: 'Dark mode info hue',
    lightValue: '#4c51bf',
    darkValue: '#4c51bf',
  },

  // ============================================
  // Structural Neutrals
  // ============================================
  {
    variable: '--cui-surface-900',
    name: 'Surface 900',
    category: 'Structural Neutrals',
    description: 'Deepest background (dark mode)',
    textVariable: '--cui-body-color',
    lightValue: '#0f172a',
    darkValue: '#0f172a',
  },
  {
    variable: '--cui-surface-800',
    name: 'Surface 800',
    category: 'Structural Neutrals',
    description: 'Elevated background for dark cards',
    textVariable: '--cui-body-color',
    lightValue: '#1e293b',
    darkValue: '#1e293b',
  },
  {
    variable: '--cui-surface-700',
    name: 'Surface 700',
    category: 'Structural Neutrals',
    description: 'Mid-range dark surfaces',
    textVariable: '--cui-body-color',
    lightValue: '#334155',
    darkValue: '#334155',
  },

  // ============================================
  // Primary Surface Ramp
  // ============================================
  {
    variable: '--cui-primary-surface-01',
    name: 'Primary Surface 01',
    category: 'Primary Surface Ramp',
    description: 'Dark structural blue surface.',
    textVariable: '#ffffff',
    lightValue: '#152744',
    darkValue: '#152744',
  },
  {
    variable: '--cui-primary-surface-02',
    name: 'Primary Surface 02',
    category: 'Primary Surface Ramp',
    description: 'Elevated structural blue surface.',
    textVariable: '#ffffff',
    lightValue: '#243a5e',
    darkValue: '#243a5e',
  },
  {
    variable: '--cui-primary-surface-03',
    name: 'Primary Surface 03',
    category: 'Primary Surface Ramp',
    description: 'Mid-tone structural blue.',
    textVariable: '#ffffff',
    lightValue: '#2c4368',
    darkValue: '#2c4368',
  },
  {
    variable: '--cui-primary-surface-04',
    name: 'Primary Surface 04',
    category: 'Primary Surface Ramp',
    description: 'Light structural blue surface.',
    textVariable: '#ffffff',
    lightValue: '#344b70',
    darkValue: '#344b70',
  },
  {
    variable: '--cui-primary-surface-05',
    name: 'Primary Surface 05',
    category: 'Primary Surface Ramp',
    description: 'Lightest structural blue surface.',
    textVariable: '#ffffff',
    lightValue: '#3f567a',
    darkValue: '#3f567a',
  },

  // ============================================
  // Background Variants (-bg)
  // ============================================
  {
    variable: '--cui-primary-bg',
    name: 'Primary BG',
    category: 'Background Variants',
    description: 'Primary background tint only — not for text',
    textVariable: '--cui-body-color',
    lightValue: 'rgba(61, 153, 245, 0.10)',
    darkValue: 'rgba(61, 153, 245, 0.10)',
  },
  {
    variable: '--cui-success-bg',
    name: 'Success BG',
    category: 'Background Variants',
    description: 'Success background tint only — not for text',
    textVariable: '--cui-body-color',
    lightValue: 'rgba(87, 198, 138, 0.10)',
    darkValue: 'rgba(87, 198, 138, 0.10)',
  },
  {
    variable: '--cui-danger-bg',
    name: 'Danger BG',
    category: 'Background Variants',
    description: 'Danger background tint only — not for text',
    textVariable: '--cui-body-color',
    lightValue: 'rgba(230, 64, 114, 0.10)',
    darkValue: 'rgba(230, 64, 114, 0.10)',
  },
  {
    variable: '--cui-warning-bg',
    name: 'Warning BG',
    category: 'Background Variants',
    description: 'Warning background tint only — not for text',
    textVariable: '--cui-body-color',
    lightValue: 'rgba(242, 196, 13, 0.10)',
    darkValue: 'rgba(242, 196, 13, 0.10)',
  },

  // ============================================
  // Subtle Background Variants (-bg-subtle)
  // ============================================
  {
    variable: '--cui-primary-bg-subtle',
    name: 'Primary BG Subtle',
    category: 'Subtle Background Variants',
    description: 'Lighter primary reminder background',
    textVariable: '--cui-primary',
    lightValue: 'rgba(61, 153, 245, 0.05)',
    darkValue: 'rgba(61, 153, 245, 0.05)',
  },
  {
    variable: '--cui-dark-bg-subtle',
    name: 'Dark BG Subtle',
    category: 'Subtle Background Variants',
    description: 'Subtle dark surface for depth',
    textVariable: '#ffffff',
    lightValue: 'rgba(33, 38, 49, 0.05)',
    darkValue: 'rgba(33, 38, 49, 0.05)',
  },
  {
    variable: '--cui-light-bg-subtle',
    name: 'Light BG Subtle',
    category: 'Subtle Background Variants',
    description: 'Soft light surface for cards',
    textVariable: '#0f172a',
    lightValue: 'rgba(243, 244, 247, 1)',
    darkValue: 'rgba(243, 244, 247, 1)',
  },

  // ============================================
  // Border Subtle Variants (-border-subtle)
  // ============================================
  {
    variable: '--cui-primary-border-subtle',
    name: 'Primary Border Subtle',
    category: 'Border Subtle Variants',
    description: 'Soft primary border tint',
    textVariable: '--cui-body-color',
    lightValue: 'rgba(61, 153, 245, 0.30)',
    darkValue: 'rgba(61, 153, 245, 0.30)',
  },
  {
    variable: '--cui-danger-border-subtle',
    name: 'Danger Border Subtle',
    category: 'Border Subtle Variants',
    description: 'Soft danger border tint',
    textVariable: '--cui-body-color',
    lightValue: 'rgba(230, 64, 114, 0.30)',
    darkValue: 'rgba(230, 64, 114, 0.30)',
  },

  // ============================================
  // Text Variants (-text)
  // ============================================
  {
    variable: '--cui-primary-text',
    name: 'Primary Text',
    category: 'Text Variants',
    description: 'Primary text color — light/dark aware',
    lightValue: '#2d7acc',
    darkValue: '#5aabf7',
  },
  {
    variable: '--cui-danger-text',
    name: 'Danger Text',
    category: 'Text Variants',
    description: 'Danger text color — always white',
    lightValue: '#ffffff',
    darkValue: '#ffffff',
  },

  // ============================================
  // Color Aliases (-color)
  // ============================================
  {
    variable: '--cui-primary-color',
    name: 'Primary Color Alias',
    category: 'Color Aliases',
    description: 'Alias for the primary brand color',
    lightValue: '#3d99f5',
    darkValue: '#3d99f5',
  },
  {
    variable: '--cui-success-color',
    name: 'Success Color Alias',
    category: 'Color Aliases',
    description: 'Alias for the success brand color',
    lightValue: '#57c68a',
    darkValue: '#57c68a',
  },
  {
    variable: '--cui-danger-color',
    name: 'Danger Color Alias',
    category: 'Color Aliases',
    description: 'Alias for the danger brand color',
    lightValue: '#e55353',
    darkValue: '#e55353',
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
  'Base Colors',
  'Dark Companions',
  'Structural Neutrals',
  'Background Variants',
  'Subtle Background Variants',
  'Border Subtle Variants',
  'Text Variants',
  'Color Aliases',
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
