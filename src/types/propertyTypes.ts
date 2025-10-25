// Property Type Templates for Landscape Platform
// Based on handoff document PL012 - Phase 5

export type PropertyType =
  | 'multifamily'
  | 'office'
  | 'retail'
  | 'industrial'
  | 'hotel'
  | 'mixed-use'
  | 'land';

export interface PropertyTypeTemplate {
  id: PropertyType;
  label: string;
  icon: string;
  description: string;
  defaultFields: PropertyField[];
  metrics: PropertyMetric[];
}

export interface PropertyField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  placeholder?: string;
  options?: string[];
  required?: boolean;
  unit?: string;
}

export interface PropertyMetric {
  id: string;
  label: string;
  formula?: string;
  format: 'currency' | 'percentage' | 'number' | 'ratio';
  category: 'financial' | 'physical' | 'operational';
}

// Multifamily Template
export const MULTIFAMILY_TEMPLATE: PropertyTypeTemplate = {
  id: 'multifamily',
  label: 'Multifamily',
  icon: '🏢',
  description: 'Residential apartment buildings and complexes',
  defaultFields: [
    { id: 'units', label: 'Number of Units', type: 'number', required: true },
    { id: 'avgUnitSize', label: 'Average Unit Size', type: 'number', unit: 'SF', required: true },
    { id: 'occupancy', label: 'Current Occupancy', type: 'number', unit: '%', placeholder: '95' },
    { id: 'avgRent', label: 'Average Rent', type: 'number', unit: '$', required: true },
    { id: 'yearBuilt', label: 'Year Built', type: 'number', placeholder: '2020' },
    { id: 'parking', label: 'Parking Spaces', type: 'number' },
    { id: 'amenities', label: 'Amenities', type: 'textarea', placeholder: 'Pool, gym, clubhouse...' }
  ],
  metrics: [
    { id: 'grossPotentialRent', label: 'Gross Potential Rent', format: 'currency', category: 'financial' },
    { id: 'effectiveGrossIncome', label: 'Effective Gross Income', format: 'currency', category: 'financial' },
    { id: 'noi', label: 'Net Operating Income', format: 'currency', category: 'financial' },
    { id: 'capRate', label: 'Cap Rate', format: 'percentage', category: 'financial' },
    { id: 'rentPerUnit', label: 'Rent per Unit', format: 'currency', category: 'financial' },
    { id: 'rentPerSF', label: 'Rent per SF', format: 'currency', category: 'financial' },
    { id: 'occupancyRate', label: 'Occupancy Rate', format: 'percentage', category: 'operational' }
  ]
};

// Office Template
export const OFFICE_TEMPLATE: PropertyTypeTemplate = {
  id: 'office',
  label: 'Office',
  icon: '🏢',
  description: 'Office buildings and business centers',
  defaultFields: [
    { id: 'totalSF', label: 'Total Rentable SF', type: 'number', required: true, unit: 'SF' },
    { id: 'floors', label: 'Number of Floors', type: 'number' },
    { id: 'class', label: 'Building Class', type: 'select', options: ['Class A', 'Class B', 'Class C'], required: true },
    { id: 'occupancy', label: 'Current Occupancy', type: 'number', unit: '%' },
    { id: 'avgLease', label: 'Average Lease Rate', type: 'number', unit: '$/SF/Year', required: true },
    { id: 'parking', label: 'Parking Ratio', type: 'number', unit: 'spaces/1000 SF' },
    { id: 'yearBuilt', label: 'Year Built', type: 'number' },
    { id: 'tenants', label: 'Major Tenants', type: 'textarea' }
  ],
  metrics: [
    { id: 'grossRent', label: 'Gross Rental Income', format: 'currency', category: 'financial' },
    { id: 'noi', label: 'Net Operating Income', format: 'currency', category: 'financial' },
    { id: 'capRate', label: 'Cap Rate', format: 'percentage', category: 'financial' },
    { id: 'rentPerSF', label: 'Rent per SF', format: 'currency', category: 'financial' },
    { id: 'vacancyRate', label: 'Vacancy Rate', format: 'percentage', category: 'operational' },
    { id: 'parkingRatio', label: 'Parking Ratio', format: 'ratio', category: 'physical' }
  ]
};

// Retail Template
export const RETAIL_TEMPLATE: PropertyTypeTemplate = {
  id: 'retail',
  label: 'Retail',
  icon: '🛒',
  description: 'Shopping centers, strip malls, and retail spaces',
  defaultFields: [
    { id: 'totalSF', label: 'Total Leasable SF', type: 'number', required: true, unit: 'SF' },
    { id: 'anchorTenants', label: 'Anchor Tenants', type: 'number' },
    { id: 'inlineTenants', label: 'Inline Tenants', type: 'number' },
    { id: 'occupancy', label: 'Current Occupancy', type: 'number', unit: '%' },
    { id: 'avgLease', label: 'Average Lease Rate', type: 'number', unit: '$/SF/Year', required: true },
    { id: 'parking', label: 'Parking Spaces', type: 'number' },
    { id: 'yearBuilt', label: 'Year Built', type: 'number' },
    { id: 'traffic', label: 'Daily Traffic Count', type: 'number' }
  ],
  metrics: [
    { id: 'grossRent', label: 'Gross Rental Income', format: 'currency', category: 'financial' },
    { id: 'noi', label: 'Net Operating Income', format: 'currency', category: 'financial' },
    { id: 'capRate', label: 'Cap Rate', format: 'percentage', category: 'financial' },
    { id: 'salesPerSF', label: 'Sales per SF', format: 'currency', category: 'operational' },
    { id: 'rentPerSF', label: 'Rent per SF', format: 'currency', category: 'financial' },
    { id: 'occupancyRate', label: 'Occupancy Rate', format: 'percentage', category: 'operational' }
  ]
};

// Industrial Template
export const INDUSTRIAL_TEMPLATE: PropertyTypeTemplate = {
  id: 'industrial',
  label: 'Industrial',
  icon: '🏭',
  description: 'Warehouses, distribution centers, and manufacturing facilities',
  defaultFields: [
    { id: 'totalSF', label: 'Total Building SF', type: 'number', required: true, unit: 'SF' },
    { id: 'warehouseSF', label: 'Warehouse SF', type: 'number', unit: 'SF' },
    { id: 'officeSF', label: 'Office SF', type: 'number', unit: 'SF' },
    { id: 'clearHeight', label: 'Clear Height', type: 'number', unit: 'feet' },
    { id: 'docks', label: 'Loading Docks', type: 'number' },
    { id: 'occupancy', label: 'Current Occupancy', type: 'number', unit: '%' },
    { id: 'avgLease', label: 'Average Lease Rate', type: 'number', unit: '$/SF/Year', required: true },
    { id: 'yearBuilt', label: 'Year Built', type: 'number' }
  ],
  metrics: [
    { id: 'grossRent', label: 'Gross Rental Income', format: 'currency', category: 'financial' },
    { id: 'noi', label: 'Net Operating Income', format: 'currency', category: 'financial' },
    { id: 'capRate', label: 'Cap Rate', format: 'percentage', category: 'financial' },
    { id: 'rentPerSF', label: 'Rent per SF', format: 'currency', category: 'financial' },
    { id: 'clearHeight', label: 'Average Clear Height', format: 'number', category: 'physical' },
    { id: 'occupancyRate', label: 'Occupancy Rate', format: 'percentage', category: 'operational' }
  ]
};

// Hotel Template
export const HOTEL_TEMPLATE: PropertyTypeTemplate = {
  id: 'hotel',
  label: 'Hotel',
  icon: '🏨',
  description: 'Hotels, motels, and hospitality properties',
  defaultFields: [
    { id: 'rooms', label: 'Number of Rooms', type: 'number', required: true },
    { id: 'adr', label: 'Average Daily Rate', type: 'number', unit: '$', required: true },
    { id: 'occupancy', label: 'Current Occupancy', type: 'number', unit: '%' },
    { id: 'class', label: 'Hotel Class', type: 'select', options: ['Luxury', 'Full-Service', 'Select-Service', 'Limited-Service', 'Extended Stay'] },
    { id: 'brand', label: 'Brand/Flag', type: 'text' },
    { id: 'yearBuilt', label: 'Year Built', type: 'number' },
    { id: 'amenities', label: 'Amenities', type: 'textarea', placeholder: 'Restaurant, pool, conference rooms...' }
  ],
  metrics: [
    { id: 'revpar', label: 'RevPAR', format: 'currency', category: 'operational' },
    { id: 'adr', label: 'Average Daily Rate', format: 'currency', category: 'operational' },
    { id: 'occupancy', label: 'Occupancy Rate', format: 'percentage', category: 'operational' },
    { id: 'grossRevenue', label: 'Gross Revenue', format: 'currency', category: 'financial' },
    { id: 'noi', label: 'Net Operating Income', format: 'currency', category: 'financial' },
    { id: 'capRate', label: 'Cap Rate', format: 'percentage', category: 'financial' }
  ]
};

// Mixed-Use Template
export const MIXED_USE_TEMPLATE: PropertyTypeTemplate = {
  id: 'mixed-use',
  label: 'Mixed-Use',
  icon: '🌆',
  description: 'Properties with multiple use types (residential, retail, office)',
  defaultFields: [
    { id: 'totalSF', label: 'Total Building SF', type: 'number', required: true, unit: 'SF' },
    { id: 'residentialUnits', label: 'Residential Units', type: 'number' },
    { id: 'retailSF', label: 'Retail SF', type: 'number', unit: 'SF' },
    { id: 'officeSF', label: 'Office SF', type: 'number', unit: 'SF' },
    { id: 'parking', label: 'Parking Spaces', type: 'number' },
    { id: 'yearBuilt', label: 'Year Built', type: 'number' },
    { id: 'components', label: 'Mix Components', type: 'textarea', placeholder: 'Describe the property mix...' }
  ],
  metrics: [
    { id: 'grossRent', label: 'Gross Rental Income', format: 'currency', category: 'financial' },
    { id: 'noi', label: 'Net Operating Income', format: 'currency', category: 'financial' },
    { id: 'capRate', label: 'Cap Rate', format: 'percentage', category: 'financial' },
    { id: 'residentialRevenue', label: 'Residential Revenue', format: 'currency', category: 'financial' },
    { id: 'commercialRevenue', label: 'Commercial Revenue', format: 'currency', category: 'financial' },
    { id: 'occupancyRate', label: 'Overall Occupancy', format: 'percentage', category: 'operational' }
  ]
};

// Land Template
export const LAND_TEMPLATE: PropertyTypeTemplate = {
  id: 'land',
  label: 'Land',
  icon: '🌳',
  description: 'Raw land and development sites',
  defaultFields: [
    { id: 'acres', label: 'Total Acres', type: 'number', required: true, unit: 'acres' },
    { id: 'zoning', label: 'Zoning', type: 'text', required: true },
    { id: 'entitlements', label: 'Entitlements', type: 'textarea' },
    { id: 'utilities', label: 'Utilities Available', type: 'textarea' },
    { id: 'topography', label: 'Topography', type: 'select', options: ['Flat', 'Gentle Slope', 'Steep', 'Rolling'] },
    { id: 'floodZone', label: 'Flood Zone', type: 'text' },
    { id: 'environmentalStatus', label: 'Environmental Status', type: 'textarea' }
  ],
  metrics: [
    { id: 'pricePerAcre', label: 'Price per Acre', format: 'currency', category: 'financial' },
    { id: 'totalAcres', label: 'Total Acres', format: 'number', category: 'physical' },
    { id: 'developableSF', label: 'Developable SF', format: 'number', category: 'physical' },
    { id: 'maxDensity', label: 'Maximum Density', format: 'number', category: 'physical' },
    { id: 'estimatedDevelopmentCost', label: 'Est. Development Cost', format: 'currency', category: 'financial' }
  ]
};

// Export all templates
export const PROPERTY_TYPE_TEMPLATES: PropertyTypeTemplate[] = [
  MULTIFAMILY_TEMPLATE,
  OFFICE_TEMPLATE,
  RETAIL_TEMPLATE,
  INDUSTRIAL_TEMPLATE,
  HOTEL_TEMPLATE,
  MIXED_USE_TEMPLATE,
  LAND_TEMPLATE
];

// Helper function to get template by property type
export function getPropertyTypeTemplate(type: PropertyType): PropertyTypeTemplate | undefined {
  return PROPERTY_TYPE_TEMPLATES.find(t => t.id === type);
}
