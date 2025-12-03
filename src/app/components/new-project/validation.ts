import { z } from 'zod'
import type { NewProjectFormData } from './types'

const analysisTypeEnum = z.enum(['Land Development', 'Income Property'])
const developmentTypeEnum = analysisTypeEnum // backwards compatibility
const locationModeEnum = z.enum(['address', 'cross_streets', 'coordinates', 'map_pin'])
const siteAreaUnitEnum = z.enum(['AC', 'SF', 'SM'])
const scaleMethodEnum = z.enum(['units', 'density', 'later'])

const optionalString = (message?: string) =>
  z.string({ required_error: message }).max(255).optional().or(z.literal(''))

export const newProjectSchema = z.object({
  // New fields
  analysis_type: analysisTypeEnum,
  property_subtype: optionalString(),
  property_class: optionalString(),

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

  // Path selection
  path_choice: z.enum(['immediate', 'extended_wizard', 'ai_extraction']).optional().or(z.literal(''))
})
  .superRefine((data, ctx) => {
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

    // Use analysis_type (new) or fall back to development_type (deprecated)
    const analysisType = data.analysis_type || data.development_type

    if (analysisType === 'Income Property') {
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

    if (analysisType === 'Land Development') {
      const siteArea = Number(data.site_area)
      if (Number.isNaN(siteArea) || siteArea <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Site area is required for land development',
          path: ['site_area']
        })
      }

      if (data.scale_input_method === 'units') {
        const value = Number(data.total_lots_units)
        if (Number.isNaN(value) || value <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Enter total lots/units or choose another method',
            path: ['total_lots_units']
          })
        }
      }

      if (data.scale_input_method === 'density') {
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
  // New fields
  analysis_type: '',
  property_subtype: '',
  property_class: '',

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

  // Path selection
  path_choice: ''
}

export const parseFormData = (data: NewProjectFormData) => newProjectSchema.parse(data)

export type ParsedProjectFormData = ReturnType<typeof parseFormData>
