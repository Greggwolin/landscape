/**
 * Project Profile Types
 *
 * Type definitions for project profile metadata displayed in the Project Profile tile
 */

import type { AnalysisType, PropertySubtype, PropertyClass } from './project-taxonomy';

// ============================================================================
// Core Types
// ============================================================================

export interface ProjectProfile {
  project_id: number;
  project_name: string;
  analysis_type?: AnalysisType;
  property_subtype?: PropertySubtype;
  target_units?: number;
  gross_acres?: number;
  address?: string;
  city?: string;
  county?: string;
  state?: string;
  zip_code?: string;
  msa_id?: number;
  msa_name?: string; // Joined from tbl_msa
  state_abbreviation?: string; // Joined from tbl_msa
  apn?: string;
  ownership_type?: OwnershipType;
  property_class?: PropertyClass;
  created_at?: Date;
  updated_at?: Date;
}

export interface MSA {
  msa_id: number;
  msa_name: string;
  msa_code?: string;
  state_abbreviation: string;
  primary_city?: string;
  is_active: boolean;
  display_order?: number;
}

// ============================================================================
// Form Data Types
// ============================================================================

export interface ProjectProfileFormData {
  project_name?: string;
  analysis_type: AnalysisType;
  property_subtype?: PropertySubtype;
  target_units?: number;
  gross_acres?: number;
  address?: string;
  city?: string;
  county?: string;
  state?: string;
  zip_code?: string;
  msa_id?: number;
  apn?: string;
  ownership_type?: OwnershipType;
}

// ============================================================================
// Enum Types
// ============================================================================

export type ProjectStatus =
  | 'Planning'
  | 'Entitled'
  | 'Under Development'
  | 'Active'
  | 'Complete'
  | 'On Hold'
  | 'Cancelled';

export const PROJECT_STATUSES: readonly ProjectStatus[] = [
  'Planning',
  'Entitled',
  'Under Development',
  'Active',
  'Complete',
  'On Hold',
  'Cancelled'
] as const;

export type OwnershipType =
  | 'Fee Simple'
  | 'Leased Fee'
  | 'Leasehold'
  | 'Ground Lease'
  | 'Condo'
  | 'Joint Venture'
  | 'Partnership';

export const OWNERSHIP_TYPES: readonly OwnershipType[] = [
  'Fee Simple',
  'Leased Fee',
  'Leasehold',
  'Ground Lease',
  'Condo',
  'Joint Venture',
  'Partnership'
] as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format gross acres as integer with commas (e.g., 1,500 ac)
 */
export function formatGrossAcres(acres?: number | null): string {
  if (acres === null || acres === undefined) return 'Not specified';
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(acres)} ac`;
}

/**
 * Format target units with commas
 */
export function formatTargetUnits(units?: number | null): string {
  if (units === null || units === undefined) return 'Not specified';
  return new Intl.NumberFormat('en-US').format(units);
}

/**
 * Format MSA display name
 */
export function formatMSADisplay(msaName?: string, stateAbbr?: string): string {
  if (!msaName) return 'Not specified';
  // MSA name already includes state, no need to append
  return msaName;
}

/**
 * Get display value for any profile field
 */
export function getDisplayValue(value: any, defaultText: string = 'Not specified'): string {
  if (value === null || value === undefined || value === '') {
    return defaultText;
  }
  return String(value);
}

// ============================================================================
// Validation
// ============================================================================

export function isValidProjectStatus(value: unknown): value is ProjectStatus {
  return typeof value === 'string' && PROJECT_STATUSES.includes(value as ProjectStatus);
}

export function isValidOwnershipType(value: unknown): value is OwnershipType {
  return typeof value === 'string' && OWNERSHIP_TYPES.includes(value as OwnershipType);
}

/**
 * Validate target units (must be positive integer)
 */
export function validateTargetUnits(units: number): boolean {
  return Number.isInteger(units) && units > 0;
}

/**
 * Validate gross acres (must be positive, max 2 decimal places)
 */
export function validateGrossAcres(acres: number): boolean {
  if (acres <= 0) return false;
  // Check if has more than 2 decimal places
  const decimalPlaces = (acres.toString().split('.')[1] || '').length;
  return decimalPlaces <= 2;
}
