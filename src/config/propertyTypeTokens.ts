/**
 * Property Type Token Registry
 *
 * Domain-level tokens for canonical property types.
 * These are not semantic intent colors and must remain separate from status/intent systems.
 */

export type CanonicalPropertyTypeCode = 'LAND' | 'MF' | 'RET' | 'OFF' | 'IND' | 'HTL' | 'MXU';

export interface PropertyTypeTokenRef {
  label: string;
  bgToken: string;
  textToken: string;
  bgVar: string;
  textVar: string;
}

export const propertyTypeTokenMap: Record<CanonicalPropertyTypeCode, PropertyTypeTokenRef> = {
  LAND: {
    label: 'Land Development',
    bgToken: '--pt-land-dev-bg',
    textToken: '--pt-land-dev-text',
    bgVar: 'var(--pt-land-dev-bg)',
    textVar: 'var(--pt-land-dev-text)',
  },
  MF: {
    label: 'Multifamily',
    bgToken: '--pt-multifamily-bg',
    textToken: '--pt-multifamily-text',
    bgVar: 'var(--pt-multifamily-bg)',
    textVar: 'var(--pt-multifamily-text)',
  },
  RET: {
    label: 'Retail',
    bgToken: '--pt-retail-bg',
    textToken: '--pt-retail-text',
    bgVar: 'var(--pt-retail-bg)',
    textVar: 'var(--pt-retail-text)',
  },
  OFF: {
    label: 'Office',
    bgToken: '--pt-office-bg',
    textToken: '--pt-office-text',
    bgVar: 'var(--pt-office-bg)',
    textVar: 'var(--pt-office-text)',
  },
  IND: {
    label: 'Industrial',
    bgToken: '--pt-industrial-bg',
    textToken: '--pt-industrial-text',
    bgVar: 'var(--pt-industrial-bg)',
    textVar: 'var(--pt-industrial-text)',
  },
  HTL: {
    label: 'Hospitality',
    bgToken: '--pt-hospitality-bg',
    textToken: '--pt-hospitality-text',
    bgVar: 'var(--pt-hospitality-bg)',
    textVar: 'var(--pt-hospitality-text)',
  },
  MXU: {
    label: 'Mixed Use',
    bgToken: '--pt-mixed-use-bg',
    textToken: '--pt-mixed-use-text',
    bgVar: 'var(--pt-mixed-use-bg)',
    textVar: 'var(--pt-mixed-use-text)',
  },
};

/**
 * Analysis Type Badge Colors
 * Maps orthogonal analysis type codes to CoreUI badge color variants.
 */
export type AnalysisTypeCode = 'VALUATION' | 'INVESTMENT' | 'VALUE_ADD' | 'DEVELOPMENT' | 'FEASIBILITY';

export interface AnalysisTypeBadgeRef {
  label: string;
  color: string; // CoreUI CBadge color prop
}

export const analysisTypeBadgeMap: Record<AnalysisTypeCode, AnalysisTypeBadgeRef> = {
  VALUATION:   { label: 'Valuation',   color: 'primary' },
  INVESTMENT:  { label: 'Investment',  color: 'info' },
  VALUE_ADD:   { label: 'Value-Add',   color: 'warning' },
  DEVELOPMENT: { label: 'Development', color: 'success' },
  FEASIBILITY: { label: 'Feasibility', color: 'secondary' },
};

export function getAnalysisTypeBadgeRef(value?: string | null): AnalysisTypeBadgeRef | null {
  if (!value) return null;
  const normalized = value.toUpperCase().trim().replace(/[\s-]+/g, '_') as AnalysisTypeCode;
  return analysisTypeBadgeMap[normalized] ?? null;
}

export const canonicalPropertyTypeOrder: CanonicalPropertyTypeCode[] = [
  'LAND',
  'MF',
  'RET',
  'OFF',
  'IND',
  'HTL',
  'MXU',
];

const propertyTypeAliases: Record<string, CanonicalPropertyTypeCode> = {
  // Land Development
  LAND: 'LAND',
  LAND_DEVELOPMENT: 'LAND',
  MPC: 'LAND',
  MASTER_PLANNED_COMMUNITY: 'LAND',
  SUBDIVISION: 'LAND',
  INFILL: 'LAND',
  LAND_BANK: 'LAND',
  LOT_DEVELOPMENT: 'LAND',
  ENTITLED_LAND: 'LAND',
  MULTIFAMILY_DEVELOPMENT: 'LAND',
  COMMERCIAL_DEVELOPMENT: 'LAND',
  INDUSTRIAL_DEVELOPMENT: 'LAND',

  // Multifamily
  MF: 'MF',
  MULTIFAMILY: 'MF',
  GARDEN_MULTIFAMILY: 'MF',
  MID_RISE_MULTIFAMILY: 'MF',
  HIGH_RISE_MULTIFAMILY: 'MF',
  STUDENT_HOUSING: 'MF',
  SENIOR_HOUSING: 'MF',
  AFFORDABLE_HOUSING: 'MF',

  // Retail
  RET: 'RET',
  RETAIL: 'RET',
  NEIGHBORHOOD_RETAIL: 'RET',
  COMMUNITY_RETAIL: 'RET',
  POWER_CENTER: 'RET',
  LIFESTYLE_CENTER: 'RET',
  STRIP_CENTER: 'RET',
  REGIONAL_MALL: 'RET',

  // Office
  OFF: 'OFF',
  OFFICE: 'OFF',
  CLASS_A_OFFICE: 'OFF',
  CLASS_B_OFFICE: 'OFF',
  CLASS_C_OFFICE: 'OFF',
  MEDICAL_OFFICE: 'OFF',
  FLEX_R_D: 'OFF',
  COWORKING: 'OFF',

  // Industrial
  IND: 'IND',
  INDUSTRIAL: 'IND',
  WAREHOUSE_DISTRIBUTION: 'IND',
  MANUFACTURING: 'IND',
  FLEX_SPACE: 'IND',
  COLD_STORAGE: 'IND',
  SELF_STORAGE: 'IND',

  // Hotel / Hospitality
  HTL: 'HTL',
  HOTEL: 'HTL',
  HOSPITALITY: 'HTL',

  // Mixed Use
  MXU: 'MXU',
  MIXED_USE: 'MXU',
  MIXEDUSE: 'MXU',
  COMMERCIAL: 'MXU',
  MIXED_USE_OFFICE_RETAIL: 'MXU',
  MIXED_USE_OFFICE_MULTIFAMILY: 'MXU',
  MIXED_USE_RETAIL_MULTIFAMILY: 'MXU',
};

const propertyTypeDisplayAliases: Record<string, string> = {
  // Land Development subtypes
  MPC: 'Master Planned Community',
  MASTER_PLANNED_COMMUNITY: 'Master Planned Community',
  SUBDIVISION: 'Subdivision',
  INFILL: 'Infill',
  LAND_BANK: 'Land Bank',
  LOT_DEVELOPMENT: 'Lot Development',
  ENTITLED_LAND: 'Entitled Land',
  MULTIFAMILY_DEVELOPMENT: 'Multifamily Development',
  COMMERCIAL_DEVELOPMENT: 'Commercial Development',
  INDUSTRIAL_DEVELOPMENT: 'Industrial Development',
  // Multifamily subtypes
  GARDEN_MULTIFAMILY: 'Garden Multifamily',
  MID_RISE_MULTIFAMILY: 'Mid-Rise Multifamily',
  HIGH_RISE_MULTIFAMILY: 'High-Rise Multifamily',
  STUDENT_HOUSING: 'Student Housing',
  SENIOR_HOUSING: 'Senior Housing',
  AFFORDABLE_HOUSING: 'Affordable Housing',
  // Retail subtypes
  NEIGHBORHOOD_RETAIL: 'Neighborhood Retail',
  COMMUNITY_RETAIL: 'Community Retail',
  POWER_CENTER: 'Power Center',
  LIFESTYLE_CENTER: 'Lifestyle Center',
  STRIP_CENTER: 'Strip Center',
  REGIONAL_MALL: 'Regional Mall',
  // Office subtypes
  CLASS_A_OFFICE: 'Class A Office',
  CLASS_B_OFFICE: 'Class B Office',
  CLASS_C_OFFICE: 'Class C Office',
  MEDICAL_OFFICE: 'Medical Office',
  FLEX_R_D: 'Flex/R&D',
  COWORKING: 'Coworking',
  // Industrial subtypes
  WAREHOUSE_DISTRIBUTION: 'Warehouse/Distribution',
  MANUFACTURING: 'Manufacturing',
  FLEX_SPACE: 'Flex Space',
  COLD_STORAGE: 'Cold Storage',
  SELF_STORAGE: 'Self-Storage',
  // Mixed Use subtypes
  COMMERCIAL: 'Commercial',
  MIXED_USE_OFFICE_RETAIL: 'Mixed-Use Office/Retail',
  MIXED_USE_OFFICE_MULTIFAMILY: 'Mixed-Use Office/Multifamily',
  MIXED_USE_RETAIL_MULTIFAMILY: 'Mixed-Use Retail/Multifamily',
};

const normalizePropertyTypeInput = (value?: string | null): string => {
  if (!value) return '';
  return value
    .toUpperCase()
    .trim()
    .replace(/[/&]+/g, '_')
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_');
};

export function resolveCanonicalPropertyTypeCode(value?: string | null): CanonicalPropertyTypeCode | null {
  const normalized = normalizePropertyTypeInput(value);
  if (!normalized) return null;
  return propertyTypeAliases[normalized] ?? null;
}

export function getPropertyTypeTokenRef(value?: string | null): PropertyTypeTokenRef | null {
  const code = resolveCanonicalPropertyTypeCode(value);
  if (!code) return null;
  return propertyTypeTokenMap[code];
}

export function getPropertyTypeLabel(value?: string | null): string {
  const normalized = normalizePropertyTypeInput(value);
  if (!normalized) return 'Not specified';
  if (propertyTypeDisplayAliases[normalized]) return propertyTypeDisplayAliases[normalized];

  const tokenRef = getPropertyTypeTokenRef(value);
  if (tokenRef) return tokenRef.label;

  return value || 'Not specified';
}
