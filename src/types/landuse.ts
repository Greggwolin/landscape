// types/landuse.ts
// Standardized TypeScript interfaces for the unified land use system

export interface LandUseChoice {
  // Primary identifiers
  code: string;
  display_name: string;
  category: string;
  is_active: boolean;

  // Family information (optional)
  family_id?: number;
  family_code?: string;
  family_name?: string;
  family_active?: boolean;

  // Type information (renamed from subtype)
  type_id?: number;
  type_code?: string;
  type_name?: string;
  type_order?: number;
  type_active?: boolean;

  // UI helpers
  has_family: boolean;
  has_type: boolean;

  // Display ordering
  category_order: number;
  display_order: number;
}

export interface FamilyChoice {
  family_id: number;
  family_code: string;
  family_name: string;
  family_active: boolean;
  density_category?: string;
}

export interface TypeChoice {
  type_id: number;
  type_code: string;
  type_name: string;
  type_order: number;
  type_active: boolean;
}

export interface ProductChoice {
  product_id: number;
  product_name: string;
  code: string;
  lot_width?: number;
  lot_depth?: number;
  lot_area_sf?: number;
  type_id?: number;
}

export interface LandUseCodeChoice {
  code: string;
  display_name: string;
  category: string;
  family_id?: number;
  family_name?: string;
  type_id?: number;
  type_name?: string;
  has_family: boolean;
  has_type: boolean;
}

// API response types
export type LandUseChoicesResponse = LandUseChoice[];
export type FamilyChoicesResponse = FamilyChoice[];
export type TypeChoicesResponse = TypeChoice[];
export type ProductChoicesResponse = ProductChoice[];
export type LandUseCodeChoicesResponse = LandUseCodeChoice[];

// API request parameters
export interface LandUseChoicesParams {
  type?: 'families' | 'types' | 'codes' | 'products';
  family_id?: string;
  type_id?: string;
  jurisdiction_id?: string; // For future use
}

// New four-field taxonomy types
export interface DensityClassification {
  id: number;
  code: string;
  name: string;
  description?: string;
  min_density?: number;
  max_density?: number;
  units: string;
  active: boolean;
  family_category?: string;
}

export interface TaxonomySelection {
  family_name?: string | '';
  density_code?: string | '';
  type_code?: string | '';
  product_code?: string | '';
}

export interface ParcelTaxonomy extends TaxonomySelection {
  id?: number;
  parcel_id?: number;
  created_at?: string;
  updated_at?: string;
}

// Updated parcel interface to include new taxonomy fields
export interface ParcelWithTaxonomy {
  id: number;
  name: string;
  family_name?: string;
  density_code?: string;
  type_code?: string;
  product_code?: string;
  acres?: number;
  units?: number;
  status?: string;
  description?: string;
  notes?: string;
}