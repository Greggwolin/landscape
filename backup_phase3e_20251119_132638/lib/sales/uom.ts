/**
 * UOM (Unit of Measure) utilities for Sales & Absorption
 *
 * Provides functions for:
 * - Fetching available UOMs for a parcel
 * - Calculating gross values using UOM formulas
 * - Client-side validation of UOM applicability
 */

import { Decimal } from 'decimal.js';

export type UOMCode = 'FF' | 'EA' | 'SF' | 'AC' | 'UN' | '$$$';

export interface UOMFormula {
  uom_code: UOMCode;
  formula_name: string;
  description: string;
  required_fields: string[];
}

export interface AvailableUOM {
  uom_code: UOMCode;
  formula_name: string;
  description: string;
}

export interface ParcelData {
  parcel_id: number;
  lot_width?: number | null;
  lot_depth?: number | null;
  units?: number | null;
  acres?: number | null;
}

/**
 * Get all UOM formulas from the registry
 */
export async function getAllUOMs(): Promise<UOMFormula[]> {
  const response = await fetch('/api/uoms/');

  if (!response.ok) {
    throw new Error(`Failed to fetch UOMs: ${response.statusText}`);
  }

  const data = await response.json();
  return data.uoms;
}

/**
 * Get available UOMs for a specific parcel
 * Only returns UOMs where the parcel has all required fields
 */
export async function getAvailableUOMsForParcel(
  projectId: number,
  parcelId: number
): Promise<AvailableUOM[]> {
  const response = await fetch(
    `/api/projects/${projectId}/parcels/${parcelId}/available-uoms/`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch available UOMs: ${response.statusText}`);
  }

  const data = await response.json();
  return data.available_uoms;
}

/**
 * Client-side calculation of gross value using UOM formula
 *
 * NOTE: This duplicates the backend formula logic for immediate UI feedback.
 * The backend remains the source of truth for saved calculations.
 */
export function calculateGrossValue(
  uomCode: UOMCode,
  parcelData: ParcelData,
  inflatedPrice: number
): number {
  const price = new Decimal(inflatedPrice);

  switch (uomCode) {
    case 'FF': {
      // Front Foot: lot_width × units × price
      const width = new Decimal(parcelData.lot_width || 0);
      const units = new Decimal(parcelData.units || 0);
      return width.times(units).times(price).toNumber();
    }

    case 'EA': {
      // Each/Per Unit: units × price
      const units = new Decimal(parcelData.units || 0);
      return units.times(price).toNumber();
    }

    case 'SF': {
      // Square Foot: acres × 43,560 × price
      const acres = new Decimal(parcelData.acres || 0);
      return acres.times(43560).times(price).toNumber();
    }

    case 'AC': {
      // Acre: acres × price
      const acres = new Decimal(parcelData.acres || 0);
      return acres.times(price).toNumber();
    }

    case 'UN': {
      // Unit (Multifamily): units × price
      const units = new Decimal(parcelData.units || 0);
      return units.times(price).toNumber();
    }

    case '$$$': {
      // Lump Sum: price only
      return price.toNumber();
    }

    default:
      throw new Error(`Unknown UOM code: ${uomCode}`);
  }
}

/**
 * Check if a UOM can be used with the given parcel data
 * Returns true if all required fields are present and non-zero
 */
export function canUseUOM(uomCode: UOMCode, parcelData: ParcelData): boolean {
  switch (uomCode) {
    case 'FF':
      return Boolean(parcelData.lot_width && parcelData.units);

    case 'EA':
    case 'UN':
      return Boolean(parcelData.units);

    case 'SF':
    case 'AC':
      return Boolean(parcelData.acres);

    case '$$$':
      return true; // Always available

    default:
      return false;
  }
}

/**
 * Get a human-readable label for a UOM code
 */
export function getUOMLabel(uomCode: UOMCode): string {
  const labels: Record<UOMCode, string> = {
    'FF': 'Front Foot',
    'EA': 'Per Unit/Lot',
    'SF': 'Square Foot',
    'AC': 'Acre',
    'UN': 'Unit (Multifamily)',
    '$$$': 'Lump Sum',
  };

  return labels[uomCode] || uomCode;
}

/**
 * Get required fields for a UOM code
 */
export function getRequiredFields(uomCode: UOMCode): string[] {
  const requirements: Record<UOMCode, string[]> = {
    'FF': ['lot_width', 'units'],
    'EA': ['units'],
    'SF': ['acres'],
    'AC': ['acres'],
    'UN': ['units'],
    '$$$': [],
  };

  return requirements[uomCode] || [];
}

/**
 * Format UOM code for display
 * Example: 'FF' -> '$/FF', 'EA' -> '$/EA'
 */
export function formatUOMCode(uomCode: UOMCode): string {
  if (uomCode === '$$$') {
    return 'Lump Sum';
  }
  return `$/${uomCode}`;
}
