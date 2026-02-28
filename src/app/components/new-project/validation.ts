import { z } from 'zod'
import type { NewProjectFormData } from './types'

import { deriveLegacyAnalysisType } from '@/types/project-taxonomy'

// Legacy bridge field (derived from perspective + purpose)
const analysisTypeEnum = z.enum(['VALUATION', 'INVESTMENT', 'VALUE_ADD', 'DEVELOPMENT', 'FEASIBILITY'])
const analysisPerspectiveEnum = z.enum(['INVESTMENT', 'DEVELOPMENT'])
const analysisPurposeEnum = z.enum(['VALUATION', 'UNDERWRITING'])
// Property category (what the asset is) - cascades to property_subtype
const propertyCategoryEnum = z.enum(['Land Development', 'Income Property'])
const developmentTypeEnum = propertyCategoryEnum // backwards compatibility
const locationModeEnum = z.enum(['address', 'cross_streets', 'coordinates', 'map_pin'])
const siteAreaUnitEnum = z.enum(['AC', 'SF', 'SM'])
const scaleMethodEnum = z.enum(['units', 'density', 'later'])

const optionalString = (message?: string) =>
  z.string({ required_error: message }).max(255).optional().or(z.literal(''))

export const newProjectSchema = z.object({
  // Asset classification (two orthogonal dimensions)
  analysis_type: analysisTypeEnum.optional().or(z.literal('')),
  analysis_perspective: analysisPerspectiveEnum.optional().or(z.literal('')),
  analysis_purpose: analysisPurposeEnum.optional().or(z.literal('')),
  value_add_enabled: z.boolean().default(false),
  property_category: propertyCategoryEnum.optional().or(z.literal('')), // What the asset is
  property_subtype: optionalString(), // Cascades from property_category
  property_class: optionalString(), // Income Property only

  // Deprecated fields (keeping for backwards compatibility)
  development_type: developmentTypeEnum.optional().or(z.literal('')),
  project_type_code: optionalString(),

  // Location fields
  location_mode: locationModeEnum.default('address'),
  single_line_address: optionalString(),
  street_address: optionalString(),
  city: optionalString(),
  state: optionalString(),
  zip: z
    .string()
    .max(10, 'ZIP Code too long')
    .optional()
    .or(z.literal('')),
  county: optionalString(),
  cross_streets: optionalString(),
  latitude: optionalString(),
  longitude: optionalString(),
  project_name: optionalString('Project name is required'),

  // Property data fields
  total_units: optionalString(),
  building_sf: optionalString(),
  site_area: optionalString(),
  site_area_unit: siteAreaUnitEnum.default('AC'),
  total_lots_units: optionalString(),
  density: optionalString(),
  scale_input_method: scaleMethodEnum.default('units'),
  analysis_start_date: optionalString(),

  // Acquisition
  asking_price: optionalString(),

  // Path selection
  path_choice: z.enum(['immediate', 'extended_wizard', 'ai_extraction']).optional().or(z.literal(''))
})
  .superRefine((data, ctx) => {
    if (!data.analysis_perspective) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Analysis perspective is required',
        path: ['analysis_perspective']
      })
    }

    if (!data.analysis_purpose) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Analysis purpose is required',
        path: ['analysis_purpose']
      })
    }

    if (data.analysis_perspective === 'DEVELOPMENT' && data.value_add_enabled) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Value-add is only available for Investment perspective',
        path: ['value_add_enabled']
      })
    }

    if (data.analysis_perspective && data.analysis_purpose && !data.analysis_type) {
      const derivedLegacyType = deriveLegacyAnalysisType(
        data.analysis_perspective,
        data.analysis_purpose,
        data.value_add_enabled
      )
      if (!derivedLegacyType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Unable to derive legacy analysis type',
          path: ['analysis_type']
        })
      }
    }

    const hasAddress =
      data.location_mode === 'address' &&
      data.street_address &&
      data.city &&
      data.state &&
      data.zip

    const hasCross =
      data.location_mode === 'cross_streets' &&
      data.cross_streets &&
      data.city &&
      data.state

    const hasCoordinates =
      data.location_mode === 'coordinates' &&
      data.latitude &&
      data.longitude

    const hasMapPin =
      data.location_mode === 'map_pin' &&
      data.latitude &&
      data.longitude

    if (!hasAddress && !hasCross && !hasCoordinates && !hasMapPin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide an address, cross streets, or drop a pin on the map',
        path: ['street_address']
      })
    }

    if (data.location_mode === 'coordinates' || data.location_mode === 'map_pin') {
      const lat = Number(data.latitude)
      const lon = Number(data.longitude)
      if (Number.isNaN(lat) || lat < -90 || lat > 90) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Latitude must be between -90 and 90',
          path: ['latitude']
        })
      }
      if (Number.isNaN(lon) || lon < -180 || lon > 180) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Longitude must be between -180 and 180',
          path: ['longitude']
        })
      }
    }

    // Use property_category (new) or fall back to development_type (deprecated) for validation
    // Note: analysis_type is now orthogonal and doesn't affect property data validation
    const propertyCategory = data.property_category || data.development_type

    if (propertyCategory === 'Income Property') {
      const units = data.total_units ? Number(data.total_units) : NaN
      const buildingSf = data.building_sf ? Number(data.building_sf) : NaN
      if (
        (Number.isNaN(units) || units <= 0) &&
        (Number.isNaN(buildingSf) || buildingSf <= 0)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter total units or building square feet',
          path: ['total_units']
        })
      }
      if (data.site_area && Number(data.site_area) < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Site area must be positive',
          path: ['site_area']
        })
      }
    }

    if (propertyCategory === 'Land Development') {
      // Site area is optional at creation (napkin mode) — validate positive if provided
      if (data.site_area) {
        const siteArea = Number(data.site_area)
        if (Number.isNaN(siteArea) || siteArea < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Site area must be a positive number',
            path: ['site_area']
          })
        }
      }

      // Scale fields only required when explicitly choosing units/density method
      // 'later' and empty site_area skip these checks entirely
      if (data.scale_input_method === 'units' && data.site_area) {
        const value = Number(data.total_lots_units)
        if (Number.isNaN(value) || value <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Enter total lots/units or choose "I\'ll add this later"',
            path: ['total_lots_units']
          })
        }
      }

      if (data.scale_input_method === 'density' && data.site_area) {
        const value = Number(data.density)
        if (Number.isNaN(value) || value <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Density must be greater than 0',
            path: ['density']
          })
        }
      }
    }
  })

export type NewProjectSchema = z.infer<typeof newProjectSchema>

export const emptyFormDefaults: NewProjectFormData = {
  // Asset classification (two orthogonal dimensions)
  analysis_type: '',
  analysis_perspective: '',
  analysis_purpose: '',
  value_add_enabled: false,
  property_category: '', // What the asset is
  property_subtype: '', // Cascades from property_category
  property_class: '', // Income Property only

  // Deprecated fields
  development_type: '',
  project_type_code: '',

  // Location fields
  location_mode: 'address',
  single_line_address: '',
  street_address: '',
  city: '',
  state: '',
  zip: '',
  county: '',
  cross_streets: '',
  latitude: '',
  longitude: '',
  project_name: '',

  // Property data fields
  total_units: '',
  building_sf: '',
  site_area: '',
  site_area_unit: 'AC',
  total_lots_units: '',
  density: '',
  scale_input_method: 'units',
  analysis_start_date: new Date().toISOString().split('T')[0],

  // Acquisition
  asking_price: '',

  // Path selection
  path_choice: ''
}

export const parseFormData = (data: NewProjectFormData) => newProjectSchema.parse(data)

export type ParsedProjectFormData = ReturnType<typeof parseFormData>
