import type { DevelopmentType, PropertyTypeOption } from './types'

export const DEVELOPMENT_TYPE_OPTIONS: Array<{
  value: DevelopmentType
  label: string
  description: string
}> = [
  {
    value: 'Land Development',
    label: 'Land Development',
    description: 'Master planned communities, subdivisions, mixed-use, and industrial parks.'
  },
  {
    value: 'Income Property',
    label: 'Income Property',
    description: 'Multifamily, office, retail, industrial/warehouse, hospitality, and more.'
  }
]

export const PROPERTY_TYPE_OPTIONS: Record<DevelopmentType, PropertyTypeOption[]> = {
  'Land Development': [
    { value: 'MPC', label: 'Master Planned Community (MPC)' },
    { value: 'SUBDIVISION', label: 'Residential Subdivision' },
    { value: 'MIXED_USE_DEV', label: 'Mixed-Use Development' },
    { value: 'INDUSTRIAL_PARK', label: 'Industrial/Business Park' }
  ],
  'Income Property': [
    { value: 'MULTIFAMILY', label: 'Multifamily' },
    { value: 'OFFICE', label: 'Office' },
    { value: 'RETAIL', label: 'Retail' },
    { value: 'INDUSTRIAL', label: 'Industrial/Warehouse' },
    { value: 'SELF_STORAGE', label: 'Self-Storage' },
    { value: 'HOSPITALITY', label: 'Hospitality' },
    { value: 'OTHER', label: 'Other' }
  ]
}

export const PROPERTY_SUBTYPE_SAMPLES: Record<string, string[]> = {
  MULTIFAMILY: [
    'Garden Apartments',
    'Mid-Rise',
    'High-Rise',
    'Student Housing',
    'Senior Housing'
  ],
  OFFICE: [
    'Class A Office',
    'Class B Office',
    'Class C Office',
    'Medical Office Building',
    'Flex/R&D'
  ],
  RETAIL: [
    'Neighborhood Center',
    'Community Center',
    'Power Center',
    'Lifestyle Center',
    'Freestanding'
  ],
  INDUSTRIAL: [
    'Warehouse/Distribution',
    'Manufacturing',
    'Flex Space',
    'Cold Storage',
    'Last Mile Logistics'
  ],
  SUBDIVISION: [
    'Single-Family Detached',
    'Single-Family Attached',
    'Townhomes',
    'Custom Lots'
  ],
  MPC: [
    'Mixed Residential',
    'Residential + Commercial',
    'Industrial Focused'
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
