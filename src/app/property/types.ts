/**
 * Property prototype types.
 *
 * Mirrors the shape of the mock fixture in
 * `src/app/api/property/mock-data.ts`. The module was previously missing,
 * leaving that import unresolved (TS2307). Defined here from the fixture
 * shape so the property prototype routes type-check.
 */

export interface UnitMixRow {
  bed: number;
  bath: number;
  den: string;
  count: number;
  sqft: number;
  avgRent: number;
  marketRent: number;
}

export interface PropertyContact {
  name: string;
  email: string;
  phone: string;
  role: string;
}

export interface PropertyData {
  property_id: number;
  name: string;
  propertyType: string;
  granularityLevel: string;

  unitMix: UnitMixRow[];

  address: string;
  city: string;
  state: string;
  zip: string;

  totalSF: number;
  stories: number;
  parkingSpaces: number;
  yearBuilt: number;

  acres: number;
  zoning: string;

  vacancyRate: number;
  operatingExpenses: number;
  capRate: number;

  contacts: PropertyContact[];
}
