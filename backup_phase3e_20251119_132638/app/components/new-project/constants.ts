import type { AnalysisType, PropertyTypeOption } from './types'
import {
  ANALYSIS_TYPES,
  LAND_DEVELOPMENT_SUBTYPES,
  INCOME_PROPERTY_SUBTYPE_GROUPS,
  PROPERTY_CLASSES,
  type PropertySubtype
} from '@/types/project-taxonomy'

// Analysis Type Options (replaces Development Type)
export const ANALYSIS_TYPE_OPTIONS: Array<{
  value: AnalysisType
  label: string
  description: string
}> = [
  {
    value: 'Land Development',
    label: 'Land Development',
    description: 'Development feasibility, lot absorption, phased infrastructure, residual value'
  },
  {
    value: 'Income Property',
    label: 'Income Property',
    description: 'NOI analysis, cap rates, leasing, stabilization, existing property valuation'
  }
]

// Property Subtype Options (cascades from Analysis Type)
export const PROPERTY_SUBTYPE_OPTIONS: Record<AnalysisType, Array<{ value: PropertySubtype; label: string }>> = {
  'Land Development': LAND_DEVELOPMENT_SUBTYPES.map(subtype => ({
    value: subtype,
    label: subtype
  })),
  'Income Property': INCOME_PROPERTY_SUBTYPE_GROUPS.flatMap(group =>
    group.subtypes.map(subtype => ({
      value: subtype,
      label: subtype,
      category: group.category
    }))
  )
}

// Property Class Options (Income Property only)
export const PROPERTY_CLASS_OPTIONS = PROPERTY_CLASSES.map(cls => ({
  value: cls,
  label: cls
}))

// Grouped Income Property Subtypes (for better UI organization)
export const INCOME_PROPERTY_GROUPED_OPTIONS = INCOME_PROPERTY_SUBTYPE_GROUPS.map(group => ({
  category: group.category,
  options: group.subtypes.map(subtype => ({
    value: subtype,
    label: subtype
  }))
}))

// DEPRECATED - Keeping for backwards compatibility during migration
export const DEVELOPMENT_TYPE_OPTIONS = ANALYSIS_TYPE_OPTIONS
export const PROPERTY_TYPE_OPTIONS: Record<AnalysisType, PropertyTypeOption[]> = {
  'Land Development': [
    { value: 'Master Planned Community', label: 'Master Planned Community' },
    { value: 'Subdivision', label: 'Subdivision' },
    { value: 'Multifamily Development', label: 'Multifamily Development' },
    { value: 'Commercial Development', label: 'Commercial Development' },
    { value: 'Industrial Development', label: 'Industrial Development' },
    { value: 'Mixed-Use Development', label: 'Mixed-Use Development' }
  ],
  'Income Property': [
    { value: 'Garden Multifamily', label: 'Garden Multifamily' },
    { value: 'Mid-Rise Multifamily', label: 'Mid-Rise Multifamily' },
    { value: 'High-Rise Multifamily', label: 'High-Rise Multifamily' },
    { value: 'Class A Office', label: 'Class A Office' },
    { value: 'Class B Office', label: 'Class B Office' },
    { value: 'Class C Office', label: 'Class C Office' },
    { value: 'Neighborhood Retail', label: 'Neighborhood Retail' },
    { value: 'Community Retail', label: 'Community Retail' },
    { value: 'Warehouse/Distribution', label: 'Warehouse/Distribution' },
    { value: 'Hotel', label: 'Hotel' }
  ]
}

export const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' }
]

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

export const LOCAL_STORAGE_KEY = 'landscape:new-project-wizard'
