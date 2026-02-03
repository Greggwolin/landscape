import type { AnalysisType, PropertyCategory } from '@/types/project-taxonomy'

// Re-export for backwards compatibility
export type DevelopmentType = PropertyCategory

export type LocationMode = 'address' | 'cross_streets' | 'coordinates' | 'map_pin'

// New Analysis Type (orthogonal to property type)
export type { AnalysisType } from '@/types/project-taxonomy'

export type SiteAreaUnit = 'AC' | 'SF' | 'SM'

export type ScaleInputMethod = 'units' | 'density' | 'later'

export type ProjectCreationPath = 'immediate' | 'extended_wizard' | 'ai_extraction'

// Property subtype options used in the New Project modal (value codes)
export type PropertySubtypeCode =
  | 'MPC'
  | 'INFILL'
  | 'LAND_BANK'
  | 'LOT_DEVELOPMENT'
  | 'ENTITLED_LAND'
  | 'MULTIFAMILY'
  | 'OFFICE'
  | 'RETAIL'
  | 'INDUSTRIAL'
  | 'MIXED_USE'
  | 'HOTEL'
  | 'SELF_STORAGE'

// Property class options (Income Property only)
export type PropertyClassCode = 'CLASS_A' | 'CLASS_B' | 'CLASS_C' | 'CLASS_D'

export interface UploadedDocument {
  id: string
  filename: string
  size: number
  pages?: number
  status: 'pending' | 'processing' | 'complete' | 'failed'
  uploadedAt?: string
  extractionConfidence?: number
}

export interface NewProjectFormData {
  // Step 1: Asset Classification (two orthogonal dimensions)
  // What the user is doing (VALUATION, INVESTMENT, DEVELOPMENT, FEASIBILITY)
  analysis_type: AnalysisType | ''
  // What the asset is (Land Development, Income Property)
  property_category: PropertyCategory | ''
  // Property subtype cascades from property_category
  property_subtype: PropertySubtypeCode | ''
  // Property class (Income Property only)
  property_class: PropertyClassCode | ''

  // DEPRECATED: keeping for backwards compatibility
  development_type: PropertyCategory | ''
  project_type_code: string

  // Location
  location_mode: LocationMode
  single_line_address: string
  street_address: string
  city: string
  state: string
  zip: string
  county: string
  cross_streets: string
  latitude: string
  longitude: string
  project_name: string

  // Step 2: Property Data
  total_units: string
  building_sf: string
  site_area: string
  site_area_unit: SiteAreaUnit
  total_lots_units: string
  density: string
  scale_input_method: ScaleInputMethod
  analysis_start_date: string

  // Acquisition
  asking_price: string

  // Step 3: Creation Path
  path_choice: ProjectCreationPath | ''
}

export interface LocationTabOption {
  id: LocationMode
  label: string
  description: string
}

export interface PropertyTypeOption {
  value: string
  label: string
}
