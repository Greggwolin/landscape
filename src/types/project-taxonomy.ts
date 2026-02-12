/**
 * Project Taxonomy Types
 *
 * This file defines the Property Category taxonomy (what the asset is):
 * 1. Property Category (top level) - Land Development vs Income Property
 * 2. Property Subtype (second level) - Specific property type
 * 3. Property Class (optional, Income Property only) - Quality/institutional grade
 *
 * NOTE: As of migration 061, "Analysis Type" is now a SEPARATE orthogonal dimension
 * that describes what the user is doing (VALUATION, INVESTMENT, DEVELOPMENT, FEASIBILITY).
 * See useAnalysisTypeConfig.ts for the new Analysis Type system.
 *
 * Migration: 013_restructure_project_taxonomy.up.sql (original)
 * Migration: 061_analysis_type_refactor.sql (orthogonal analysis types)
 */

// ============================================================================
// NEW: Analysis Type (Orthogonal - What the user is doing)
// ============================================================================

/**
 * Analysis Type - What the user is trying to accomplish.
 * Orthogonal to Property Category (what the asset is).
 */
export type AnalysisType = 'VALUATION' | 'INVESTMENT' | 'VALUE_ADD' | 'DEVELOPMENT' | 'FEASIBILITY';

export const ANALYSIS_TYPES: readonly AnalysisType[] = [
  'VALUATION',
  'INVESTMENT',
  'VALUE_ADD',
  'DEVELOPMENT',
  'FEASIBILITY'
] as const;

export const ANALYSIS_TYPE_LABELS: Record<AnalysisType, string> = {
  'VALUATION': 'Valuation',
  'INVESTMENT': 'Investment',
  'VALUE_ADD': 'Value-Add',
  'DEVELOPMENT': 'Development',
  'FEASIBILITY': 'Feasibility'
};

export const ANALYSIS_TYPE_DESCRIPTIONS: Record<AnalysisType, string> = {
  'VALUATION': 'Market value opinion - USPAP compliant appraisal',
  'INVESTMENT': 'Acquisition underwriting - IRR, returns analysis',
  'VALUE_ADD': 'Acquisition with renovation/repositioning upside',
  'DEVELOPMENT': 'Ground-up or redevelopment returns',
  'FEASIBILITY': 'Go/no-go binary feasibility analysis'
};

// ============================================================================
// New Taxonomy Dimensions (Perspective + Purpose)
// ============================================================================

export type AnalysisPerspective = 'INVESTMENT' | 'DEVELOPMENT';
export type AnalysisPurpose = 'VALUATION' | 'UNDERWRITING';

export const ANALYSIS_PERSPECTIVES: readonly AnalysisPerspective[] = [
  'INVESTMENT',
  'DEVELOPMENT',
] as const;

export const ANALYSIS_PURPOSES: readonly AnalysisPurpose[] = [
  'VALUATION',
  'UNDERWRITING',
] as const;

export const PERSPECTIVE_LABELS: Record<AnalysisPerspective, string> = {
  INVESTMENT: 'Investment',
  DEVELOPMENT: 'Development',
};

export const PURPOSE_LABELS: Record<AnalysisPurpose, string> = {
  VALUATION: 'Valuation',
  UNDERWRITING: 'Underwriting',
};

export interface AnalysisDimensions {
  analysis_perspective: AnalysisPerspective;
  analysis_purpose: AnalysisPurpose;
  value_add_enabled: boolean;
}

/**
 * Map legacy analysis_type values to new dimensions.
 */
export function deriveDimensionsFromAnalysisType(analysisType?: string | null): AnalysisDimensions {
  const normalized = analysisType?.toUpperCase().trim();

  switch (normalized) {
    case 'DEVELOPMENT':
    case 'FEASIBILITY':
      return {
        analysis_perspective: 'DEVELOPMENT',
        analysis_purpose: 'UNDERWRITING',
        value_add_enabled: false,
      };
    case 'VALUATION':
      return {
        analysis_perspective: 'INVESTMENT',
        analysis_purpose: 'VALUATION',
        value_add_enabled: false,
      };
    case 'VALUE_ADD':
      return {
        analysis_perspective: 'INVESTMENT',
        analysis_purpose: 'UNDERWRITING',
        value_add_enabled: true,
      };
    case 'INVESTMENT':
    default:
      return {
        analysis_perspective: 'INVESTMENT',
        analysis_purpose: 'UNDERWRITING',
        value_add_enabled: false,
      };
  }
}

/**
 * Derive legacy analysis_type from new dimensions for backward compatibility.
 * Per migration bridge policy:
 * - DEVELOPMENT + VALUATION maps to DEVELOPMENT (closest legacy equivalent).
 */
export function deriveLegacyAnalysisType(
  analysisPerspective?: AnalysisPerspective | null,
  analysisPurpose?: AnalysisPurpose | null,
  valueAddEnabled: boolean = false
): AnalysisType {
  if (analysisPerspective === 'DEVELOPMENT') {
    return 'DEVELOPMENT';
  }
  if (analysisPerspective === 'INVESTMENT' && analysisPurpose === 'VALUATION') {
    return 'VALUATION';
  }
  if (analysisPerspective === 'INVESTMENT' && analysisPurpose === 'UNDERWRITING') {
    return valueAddEnabled ? 'VALUE_ADD' : 'INVESTMENT';
  }
  return 'INVESTMENT';
}

// ============================================================================
// Property Category (Top Level - What the asset is)
// ============================================================================

/**
 * @deprecated Use PropertyCategory instead. This type alias exists for backward compatibility.
 */
export type LegacyAnalysisType = 'Land Development' | 'Income Property';

export type PropertyCategory = 'Land Development' | 'Income Property';

export const PROPERTY_CATEGORIES: readonly PropertyCategory[] = [
  'Land Development',
  'Income Property'
] as const;

export const PROPERTY_CATEGORY_DESCRIPTIONS: Record<PropertyCategory, string> = {
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
 * Get available property subtypes based on the selected property category
 */
export function getSubtypesForPropertyCategory(category: PropertyCategory): readonly PropertySubtype[] {
  return category === 'Land Development'
    ? LAND_DEVELOPMENT_SUBTYPES
    : INCOME_PROPERTY_SUBTYPES;
}

/**
 * @deprecated Use getSubtypesForPropertyCategory instead
 */
export function getSubtypesForAnalysisType(category: PropertyCategory): readonly PropertySubtype[] {
  return getSubtypesForPropertyCategory(category);
}

/**
 * Determine if property class field should be shown (Income Property only)
 */
export function showsPropertyClass(category: PropertyCategory): boolean {
  return category === 'Income Property';
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
 * Validate that a subtype is valid for the given property category
 */
export function isValidSubtypeForPropertyCategory(
  category: PropertyCategory,
  subtype: PropertySubtype
): boolean {
  const validSubtypes = getSubtypesForPropertyCategory(category);
  return validSubtypes.includes(subtype);
}

/**
 * @deprecated Use isValidSubtypeForPropertyCategory instead
 */
export function isValidSubtypeForAnalysisType(
  category: PropertyCategory,
  subtype: PropertySubtype
): boolean {
  return isValidSubtypeForPropertyCategory(category, subtype);
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
  property_categories: readonly PropertyCategory[];
  subtypes: {
    'Land Development': readonly LandDevelopmentSubtype[];
    'Income Property': readonly IncomePropertySubtype[];
  };
  property_classes: readonly PropertyClass[];
  income_property_groups: readonly SubtypeGroup[];
}

export const PROPERTY_TAXONOMY: PropertyTaxonomy = {
  analysis_types: ANALYSIS_TYPES,
  property_categories: PROPERTY_CATEGORIES,
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
  property_category?: PropertyCategory;  // What the asset is
  property_subtype: PropertySubtype;
  property_class?: PropertyClass | null;
}

/**
 * Type guard to check if a value is a valid AnalysisType (new orthogonal type)
 */
export function isAnalysisType(value: unknown): value is AnalysisType {
  return typeof value === 'string' && ANALYSIS_TYPES.includes(value as AnalysisType);
}

/**
 * Type guard to check if a value is a valid PropertyCategory
 */
export function isPropertyCategory(value: unknown): value is PropertyCategory {
  return typeof value === 'string' && PROPERTY_CATEGORIES.includes(value as PropertyCategory);
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
