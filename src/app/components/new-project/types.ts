export type DevelopmentType = 'Land Development' | 'Income Property'

export type LocationMode = 'address' | 'cross_streets' | 'coordinates'

export type SiteAreaUnit = 'AC' | 'SF' | 'SM'

export type ScaleInputMethod = 'units' | 'density' | 'later'

export type ProjectCreationPath = 'immediate' | 'extended_wizard' | 'ai_extraction'

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
  // Step 1
  development_type: DevelopmentType | ''
  property_type_code: string
  property_subtype: string
  location_mode: LocationMode
  single_line_address: string
  street_address: string
  city: string
  state: string
  zip: string
  cross_streets: string
  latitude: string
  longitude: string
  project_name: string

  // Step 2
  total_units: string
  building_sf: string
  site_area: string
  site_area_unit: SiteAreaUnit
  total_lots_units: string
  density: string
  scale_input_method: ScaleInputMethod
  analysis_start_date: string

  // Step 3
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
