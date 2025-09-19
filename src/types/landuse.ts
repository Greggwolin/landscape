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

  // Subtype information (optional)
  subtype_id?: number;
  subtype_code?: string;
  subtype_name?: string;
  subtype_order?: number;
  subtype_active?: boolean;

  // UI helpers
  has_family: boolean;
  has_subtype: boolean;

  // Display ordering
  category_order: number;
  display_order: number;
}

export interface FamilyChoice {
  family_id: number;
  family_code: string;
  family_name: string;
  family_active: boolean;
}

export interface SubtypeChoice {
  subtype_id: number;
  subtype_code: string;
  subtype_name: string;
  subtype_order: number;
  subtype_active: boolean;
}

export interface ProductChoice {
  product_id: number;
  product_name: string;
  lot_width?: number;
  lot_depth?: number;
}

export interface LandUseCodeChoice {
  code: string;
  display_name: string;
  category: string;
  family_id?: number;
  family_name?: string;
  subtype_id?: number;
  subtype_name?: string;
  has_family: boolean;
  has_subtype: boolean;
}

// API response types
export type LandUseChoicesResponse = LandUseChoice[];
export type FamilyChoicesResponse = FamilyChoice[];
export type SubtypeChoicesResponse = SubtypeChoice[];
export type ProductChoicesResponse = ProductChoice[];
export type LandUseCodeChoicesResponse = LandUseCodeChoice[];

// API request parameters
export interface LandUseChoicesParams {
  type?: 'families' | 'subtypes' | 'codes' | 'products';
  family_id?: string;
  subtype_id?: string;
  jurisdiction_id?: string; // For future use
}