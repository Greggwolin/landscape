/**
 * Navigation Constants
 *
 * Centralized constants for navigation links, menu items, and configuration.
 */

// Global navigation links (Tier 1)
export const GLOBAL_NAV_LINKS = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { id: 'dms', label: 'Documents', href: '/dms' },
] as const;

// Sandbox dropdown pages (developer/prototype reference)
export const SANDBOX_PAGES = [
  'Development Status',
  'Documentation Center',
  'Prototypes',
  '---', // Separator
  'Project',
  'Operating Expenses',
  'Rent Roll',
  'Financial Reports',
  'Document Library',
  'DMS Admin',
  'Assumptions & Factors',
  'Market Assumptions (Old)',
  'Market Intel (Old)',
  'Project Overview (Old)',
  'Theme Demo',
  'Budget Grid',
  'Budget Grid v2',
  'GIS Test',
  'Parcel Test',
  'Database Schema Viewer',
] as const;

// User menu items
export const USER_MENU_ITEMS = [
  { label: 'Profile', action: 'profile' },
  { label: 'Account Settings', action: 'account-settings' },
] as const;

// Settings menu items
export const SETTINGS_ACTIONS = [
  { label: 'Global Preferences', action: 'global-preferences' },
  { label: 'Landscaper Configuration', action: 'landscaper-config' },
  { label: 'DMS Admin', action: 'dms-admin', href: '/admin/dms/templates' },
] as const;

// Z-index layers for consistent stacking
export const Z_INDEX = {
  NAVIGATION: 50,
  DROPDOWN: 60,
  MODAL: 100,
} as const;
