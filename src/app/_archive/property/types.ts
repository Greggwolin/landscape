// Property Types and Interfaces

export type GranularityLevel = 'basic' | 'mid' | 'detailed';
export type PropertyType = 'MULTIFAMILY' | 'RETAIL' | 'OFFICE' | 'INDUSTRIAL' | 'HOTEL' | 'MIXED_USE';

export interface UnitType {
  bed: number;
  bath: number;
  den: string;
  count: number;
  sqft: number;
  avgRent: number;
  marketRent: number;
}

export interface ContactInfo {
  name: string;
  email: string;
  phone?: string;
  role: string;
}

export interface PropertyData {
  property_id: number;
  name: string;
  propertyType: PropertyType;
  granularityLevel: GranularityLevel;

  // Unit Mix
  unitMix: UnitType[];

  // Location
  address?: string;
  city?: string;
  state?: string;
  zip?: string;

  // Building Specs
  totalSF?: number;
  stories?: number;
  parkingSpaces?: number;
  yearBuilt?: number;

  // Land Details
  acres?: number;
  zoning?: string;

  // Timeline
  startDate?: string;
  stabilizationDate?: string;
  holdPeriod?: number;

  // Financial Assumptions
  vacancyRate?: number;
  operatingExpenses?: number;
  capRate?: number;

  // Contacts
  contacts?: ContactInfo[];
}

export interface Tab {
  id: string;
  label: string;
  icon: string;
}

export interface PropertyValidationErrors {
  [key: string]: string | undefined;
}
