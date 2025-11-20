import type { PropertyData } from '@/app/property/types';

let mockPropertyData: PropertyData = {
  property_id: 201,
  name: 'Sunset Ridge Apartments',
  propertyType: 'MULTIFAMILY',
  granularityLevel: 'mid',

  // Unit Mix
  unitMix: [
    {
      bed: 1,
      bath: 1,
      den: '',
      count: 16,
      sqft: 700,
      avgRent: 1100,
      marketRent: 1200
    },
    {
      bed: 2,
      bath: 1,
      den: 'Den',
      count: 10,
      sqft: 825,
      avgRent: 1550,
      marketRent: 1675
    }
  ],

  // Location
  address: '123 Main Street',
  city: 'Scottsdale',
  state: 'AZ',
  zip: '85251',

  // Building Specs
  totalSF: 19250,
  stories: 3,
  parkingSpaces: 40,
  yearBuilt: 2020,

  // Land Details
  acres: 2.5,
  zoning: 'R-4',

  // Financial Assumptions
  vacancyRate: 5,
  operatingExpenses: 4500,
  capRate: 5.5,

  // Contacts
  contacts: [
    {
      name: 'John Smith',
      email: 'jsmith@example.com',
      phone: '(480) 555-0100',
      role: 'Property Manager'
    },
    {
      name: 'Sarah Johnson',
      email: 'sjohnson@example.com',
      phone: '(480) 555-0101',
      role: 'Owner Contact'
    }
  ]
};

export const getPropertyData = (id: string): PropertyData => {
  // Return mock data for any ID (for prototype purposes)
  return mockPropertyData;
};

export const updatePropertySection = <K extends keyof PropertyData>(
  section: K,
  value: PropertyData[K] | Partial<PropertyData[K]>
) => {
  const current = mockPropertyData[section];
  if (Array.isArray(current) && Array.isArray(value)) {
    mockPropertyData = {
      ...mockPropertyData,
      [section]: value
    };
    return;
  }

  if (!Array.isArray(current) && value && typeof value === 'object' && !Array.isArray(value)) {
    mockPropertyData = {
      ...mockPropertyData,
      [section]: {
        ...current,
        ...value
      } as PropertyData[K]
    };
    return;
  }

  mockPropertyData = {
    ...mockPropertyData,
    [section]: value as PropertyData[K]
  };
};
