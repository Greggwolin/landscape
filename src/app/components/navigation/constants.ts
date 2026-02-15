/**
 * Navigation Constants
 *
 * Centralized constants for navigation links, menu items, and configuration.
 */

// Global navigation links (Tier 1)
export const GLOBAL_NAV_LINKS = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
] as const;

// Sandbox dropdown pages (developer/prototype reference)
// Only includes pages that actually exist with page.tsx files
export const SANDBOX_PAGES = [
  { label: 'Development Status', href: '/dev-status' },
  { label: 'Documentation Center', href: '/documentation' },
  { label: 'Prototypes Hub', href: '/prototypes' },
  { label: 'Database Schema', href: '/db-schema' },
  { separator: true },
  { label: 'Planning (Peoria Lakes)', href: '/planning' },
  { label: 'Peoria Lakes (Project 7)', href: '/projects/7' },
  { label: 'Assumptions (Peoria Lakes)', href: '/projects/7/assumptions' },
  { label: 'Project Setup', href: '/projects/setup' },
  { separator: true },
  { label: 'Rent Roll Inputs', href: '/prototypes/multifam/rent-roll-inputs' },
  { label: 'Multifam Prototypes', href: '/prototypes-multifam' },
  { label: 'Budget Grid', href: '/budget-grid' },
  { label: 'Budget Grid v2', href: '/budget-grid-v2' },
  { separator: true },
  { label: 'Market Assumptions (Peoria Lakes)', href: '/market-assumptions' },
  { label: 'Growth Rates (Materio)', href: '/growthrates' },
  { label: 'Growth Rates (Original)', href: '/growthrates-original' },
  { label: 'Growth Rate Detail', href: '/growthratedetail' },
  { label: 'Growth Rates Manager', href: '/growthratesmanager' },
  { separator: true },
  { label: 'Document Review', href: '/documents/review' },
  { label: 'AI Document Review', href: '/ai-document-review' },
  { label: 'DMS Admin', href: '/admin/dms/templates' },
  { separator: true },
  { label: 'Market Intel', href: '/market' },
  { label: 'Inventory', href: '/inventory' },
  { separator: true },
  { label: 'GIS Test', href: '/gis-test' },
  { label: 'GIS Simple Test', href: '/gis-simple-test' },
  { label: 'Map Debug', href: '/map-debug' },
  { separator: true },
  { label: 'Test CoreUI', href: '/test-coreui' },
  { label: 'Breadcrumb Demo', href: '/breadcrumb-demo' },
] as const;

// User menu items
export const USER_MENU_ITEMS = [
  { label: 'Profile', action: 'profile' },
  { label: 'Account Settings', action: 'account-settings' },
] as const;

// Settings menu items
export const SETTINGS_ACTIONS = [
  { label: 'System Preferences', action: 'admin-preferences', href: '/admin/preferences' },
  { label: 'Benchmarks', action: 'admin-benchmarks', href: '/admin/benchmarks' },
  { label: 'Landscaper Configuration', action: 'landscaper-config' },
  { label: 'Landscaper Training', action: 'landscaper-training', href: '/documents/review' },
  { label: 'DMS Admin', action: 'dms-admin', href: '/admin/dms/templates' },
] as const;

// Z-index layers for consistent stacking
export const Z_INDEX = {
  NAVIGATION: 50,
  DROPDOWN: 60,
  MODAL: 100,
} as const;
