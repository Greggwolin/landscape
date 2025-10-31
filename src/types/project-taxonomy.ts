/**
 * Project Taxonomy Types
 *
 * Defines the hierarchical taxonomy for project classification:
 * 1. Analysis Type (top level) - What kind of financial analysis
 * 2. Property Subtype (second level) - What is being built/analyzed
 * 3. Property Class (optional, Income Property only) - Quality/institutional grade
 *
 * Migration: 013_restructure_project_taxonomy.up.sql
 */

// ============================================================================
// Analysis Type (Top Level)
// ============================================================================

export type AnalysisType = 'Land Development' | 'Income Property';

export const ANALYSIS_TYPES: readonly AnalysisType[] = [
  'Land Development',
  'Income Property'
] as const;

export const ANALYSIS_TYPE_DESCRIPTIONS: Record<AnalysisType, string> = {
  'Land Development': 'Development feasibility, lot absorption, phased infrastructure, residual value',
  'Income Property': 'NOI analysis, cap rates, leasing, stabilization, existing property valuation'
};

// ============================================================================
// Property Subtypes (Second Level - Cascading)
// ============================================================================

// Land Development Subtypes
export type LandDevelopmentSubtype =
  | 'Master Planned Community'
  | 'Subdivision'
  | 'Multifamily Development'
  | 'Commercial Development'
  | 'Industrial Development'
  | 'Mixed-Use Development';

export const LAND_DEVELOPMENT_SUBTYPES: readonly LandDevelopmentSubtype[] = [
  'Master Planned Community',
  'Subdivision',
  'Multifamily Development',
  'Commercial Development',
  'Industrial Development',
  'Mixed-Use Development'
] as const;

// Income Property Subtypes
export type MultifamilyIncomeSubtype =
  | 'Garden Multifamily'
  | 'Mid-Rise Multifamily'
  | 'High-Rise Multifamily'
  | 'Student Housing'
  | 'Senior Housing'
  | 'Affordable Housing';

export type OfficeIncomeSubtype =
  | 'Class A Office'
  | 'Class B Office'
  | 'Class C Office'
  | 'Medical Office'
  | 'Flex/R&D'
  | 'Coworking';

export type RetailIncomeSubtype =
  | 'Neighborhood Retail'
  | 'Community Retail'
  | 'Power Center'
  | 'Lifestyle Center'
  | 'Strip Center'
  | 'Regional Mall';

export type IndustrialIncomeSubtype =
  | 'Warehouse/Distribution'
  | 'Manufacturing'
  | 'Flex Space'
  | 'Cold Storage'
  | 'Self-Storage';

export type OtherIncomeSubtype =
  | 'Hotel'
  | 'Mixed-Use Office/Retail'
  | 'Mixed-Use Office/Multifamily'
  | 'Mixed-Use Retail/Multifamily';

export type IncomePropertySubtype =
  | MultifamilyIncomeSubtype
  | OfficeIncomeSubtype
  | RetailIncomeSubtype
  | IndustrialIncomeSubtype
  | OtherIncomeSubtype;

export const MULTIFAMILY_INCOME_SUBTYPES: readonly MultifamilyIncomeSubtype[] = [
  'Garden Multifamily',
  'Mid-Rise Multifamily',
  'High-Rise Multifamily',
  'Student Housing',
  'Senior Housing',
  'Affordable Housing'
] as const;

export const OFFICE_INCOME_SUBTYPES: readonly OfficeIncomeSubtype[] = [
  'Class A Office',
  'Class B Office',
  'Class C Office',
  'Medical Office',
  'Flex/R&D',
  'Coworking'
] as const;

export const RETAIL_INCOME_SUBTYPES: readonly RetailIncomeSubtype[] = [
  'Neighborhood Retail',
  'Community Retail',
  'Power Center',
  'Lifestyle Center',
  'Strip Center',
  'Regional Mall'
] as const;

export const INDUSTRIAL_INCOME_SUBTYPES: readonly IndustrialIncomeSubtype[] = [
  'Warehouse/Distribution',
  'Manufacturing',
  'Flex Space',
  'Cold Storage',
  'Self-Storage'
] as const;

export const OTHER_INCOME_SUBTYPES: readonly OtherIncomeSubtype[] = [
  'Hotel',
  'Mixed-Use Office/Retail',
  'Mixed-Use Office/Multifamily',
  'Mixed-Use Retail/Multifamily'
] as const;

export const INCOME_PROPERTY_SUBTYPES: readonly IncomePropertySubtype[] = [
  ...MULTIFAMILY_INCOME_SUBTYPES,
  ...OFFICE_INCOME_SUBTYPES,
  ...RETAIL_INCOME_SUBTYPES,
  ...INDUSTRIAL_INCOME_SUBTYPES,
  ...OTHER_INCOME_SUBTYPES
] as const;

// Union type for all property subtypes
export type PropertySubtype = LandDevelopmentSubtype | IncomePropertySubtype;

// ============================================================================
// Property Class (Third Level - Income Property Only)
// ============================================================================

export const PROPERTY_CLASSES = [
  'Class A',
  'Class B',
  'Class C',
  'Class D'
] as const;

export type PropertyClass = typeof PROPERTY_CLASSES[number];

export const PROPERTY_CLASS_DESCRIPTIONS: Record<PropertyClass, string> = {
  'Class A': 'Highest quality, newest construction, premier locations, institutional-grade finishes',
  'Class B': 'Good quality, may be older but well-maintained, solid locations, attractive to regional investors',
  'Class C': 'Older properties, functional but dated, secondary locations, value-add opportunities',
  'Class D': 'Significant deferred maintenance, marginal locations, requires substantial renovation'
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get available property subtypes based on the selected analysis type
 */
export function getSubtypesForAnalysisType(analysisType: AnalysisType): readonly PropertySubtype[] {
  return analysisType === 'Land Development'
    ? LAND_DEVELOPMENT_SUBTYPES
    : INCOME_PROPERTY_SUBTYPES;
}

/**
 * Determine if property class field should be shown (Income Property only)
 */
export function showsPropertyClass(analysisType: AnalysisType): boolean {
  return analysisType === 'Income Property';
}

/**
 * Get income property category for a given subtype
 */
export function getIncomePropertyCategory(subtype: IncomePropertySubtype): string {
  if (MULTIFAMILY_INCOME_SUBTYPES.includes(subtype as MultifamilyIncomeSubtype)) {
    return 'Multifamily';
  } else if (OFFICE_INCOME_SUBTYPES.includes(subtype as OfficeIncomeSubtype)) {
    return 'Office';
  } else if (RETAIL_INCOME_SUBTYPES.includes(subtype as RetailIncomeSubtype)) {
    return 'Retail';
  } else if (INDUSTRIAL_INCOME_SUBTYPES.includes(subtype as IndustrialIncomeSubtype)) {
    return 'Industrial';
  } else {
    return 'Other';
  }
}

/**
 * Validate that a subtype is valid for the given analysis type
 */
export function isValidSubtypeForAnalysisType(
  analysisType: AnalysisType,
  subtype: PropertySubtype
): boolean {
  const validSubtypes = getSubtypesForAnalysisType(analysisType);
  return validSubtypes.includes(subtype);
}

// ============================================================================
// Grouped Subtype Structure (for UI rendering)
// ============================================================================

export interface SubtypeGroup {
  category: string;
  subtypes: readonly PropertySubtype[];
}

export const INCOME_PROPERTY_SUBTYPE_GROUPS: readonly SubtypeGroup[] = [
  {
    category: 'Multifamily',
    subtypes: MULTIFAMILY_INCOME_SUBTYPES
  },
  {
    category: 'Office',
    subtypes: OFFICE_INCOME_SUBTYPES
  },
  {
    category: 'Retail',
    subtypes: RETAIL_INCOME_SUBTYPES
  },
  {
    category: 'Industrial',
    subtypes: INDUSTRIAL_INCOME_SUBTYPES
  },
  {
    category: 'Other',
    subtypes: OTHER_INCOME_SUBTYPES
  }
] as const;

// ============================================================================
// Full Taxonomy Structure (for API responses)
// ============================================================================

export interface PropertyTaxonomy {
  analysis_types: readonly AnalysisType[];
  subtypes: {
    'Land Development': readonly LandDevelopmentSubtype[];
    'Income Property': readonly IncomePropertySubtype[];
  };
  property_classes: readonly PropertyClass[];
  income_property_groups: readonly SubtypeGroup[];
}

export const PROPERTY_TAXONOMY: PropertyTaxonomy = {
  analysis_types: ANALYSIS_TYPES,
  subtypes: {
    'Land Development': LAND_DEVELOPMENT_SUBTYPES,
    'Income Property': INCOME_PROPERTY_SUBTYPES
  },
  property_classes: PROPERTY_CLASSES,
  income_property_groups: INCOME_PROPERTY_SUBTYPE_GROUPS
} as const;

// ============================================================================
// Project Type Definitions (extends database Project type)
// ============================================================================

export interface ProjectTaxonomyFields {
  analysis_type: AnalysisType;
  property_subtype: PropertySubtype;
  property_class?: PropertyClass | null;
}

/**
 * Type guard to check if a value is a valid AnalysisType
 */
export function isAnalysisType(value: unknown): value is AnalysisType {
  return typeof value === 'string' && ANALYSIS_TYPES.includes(value as AnalysisType);
}

/**
 * Type guard to check if a value is a valid PropertySubtype
 */
export function isPropertySubtype(value: unknown): value is PropertySubtype {
  return typeof value === 'string' && (
    LAND_DEVELOPMENT_SUBTYPES.includes(value as LandDevelopmentSubtype) ||
    INCOME_PROPERTY_SUBTYPES.includes(value as IncomePropertySubtype)
  );
}

/**
 * Type guard to check if a value is a valid PropertyClass
 */
export function isPropertyClass(value: unknown): value is PropertyClass {
  return typeof value === 'string' && PROPERTY_CLASSES.includes(value as PropertyClass);
}
