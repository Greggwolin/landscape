/**
 * Sales Aggregation Utilities
 *
 * Groups parcels by sale date and calculates aggregated financial metrics
 * for Phase 3: Sale Transaction Details accordion
 */

import type { ParcelWithSale } from '@/types/sales-absorption';

export interface SaleTransaction {
  saleDate: string;
  saleName: string | null;
  parcels: ParcelWithSale[];
  grossAcres: number;
  units: number | null;
  frontFeet: number | null;
  residentialRevenue: number;
  commercialRevenue: number;
  totalRevenue: number;
  commissions: number;
  closingCosts: number;
  netProceeds: number;
  // Parcel attribution for hover tooltips
  revenueAttribution: {
    residential: string[]; // Parcel codes
    commercial: string[];
  };
}

/**
 * Groups parcels by sale date and calculates aggregated metrics
 *
 * @param parcels - Array of parcels with sale data
 * @param saleNames - Map of sale dates to user-defined names
 * @returns Array of sale transactions sorted by date
 */
export function groupParcelsBySaleDate(
  parcels: ParcelWithSale[],
  saleNames?: Record<string, string>
): SaleTransaction[] {
  // Filter to only parcels with sale dates
  const parcelsWithDates = parcels.filter(p => p.sale_date);

  // Group by sale date
  const grouped = parcelsWithDates.reduce((acc, parcel) => {
    const date = parcel.sale_date!;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(parcel);
    return acc;
  }, {} as Record<string, ParcelWithSale[]>);

  // Convert to SaleTransaction objects
  return Object.entries(grouped)
    .map(([date, parcels]) => {
      // Physical metrics
      const grossAcres = parcels.reduce((sum, p) => sum + (p.acres || 0), 0);
      const units = parcels.reduce((sum, p) => sum + (p.units || 0), 0);

      // FrontFeet calculation (if uom_code is 'FF')
      const frontFeet = parcels
        .filter(p => p.uom_code === 'FF')
        .reduce((sum, p) => sum + (p.units || 0), 0);

      // Categorize parcels by use type
      const residentialTypes = ['VLDR', 'LDR', 'MDR', 'HDR', 'SFD', 'MFD', 'SFA', 'MFA'];
      const residentialParcels = parcels.filter(p =>
        residentialTypes.includes(p.type_code) || residentialTypes.includes(p.density_code)
      );
      const commercialParcels = parcels.filter(p =>
        !residentialTypes.includes(p.type_code) && !residentialTypes.includes(p.density_code)
      );

      // Calculate revenue by type
      // Residential: units * value_per_unit
      // Commercial: acres * value_per_unit (or gross_value if available)
      const residentialRevenue = residentialParcels.reduce((sum, p) => {
        if (p.gross_value) return sum + p.gross_value;
        if (p.current_value_per_unit && p.units) {
          return sum + (p.current_value_per_unit * p.units);
        }
        return sum;
      }, 0);

      const commercialRevenue = commercialParcels.reduce((sum, p) => {
        if (p.gross_value) return sum + p.gross_value;
        if (p.current_value_per_unit && p.acres) {
          return sum + (p.current_value_per_unit * p.acres);
        }
        return sum;
      }, 0);

      const totalRevenue = residentialRevenue + commercialRevenue;

      // Calculate deductions
      // TODO: Pull from project assumptions in future phase
      const commissionRate = 0.03; // 3% hardcoded for Phase 3
      const closingCostRate = 0.02; // 2% hardcoded for Phase 3

      const commissions = totalRevenue * commissionRate;
      const closingCosts = totalRevenue * closingCostRate;
      const netProceeds = totalRevenue - commissions - closingCosts;

      return {
        saleDate: date,
        saleName: saleNames?.[date] || null,
        parcels,
        grossAcres,
        units: units > 0 ? units : null,
        frontFeet: frontFeet > 0 ? frontFeet : null,
        residentialRevenue,
        commercialRevenue,
        totalRevenue,
        commissions,
        closingCosts,
        netProceeds,
        revenueAttribution: {
          residential: residentialParcels.map(p => p.parcel_code),
          commercial: commercialParcels.map(p => p.parcel_code),
        },
      };
    })
    .sort((a, b) => new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime());
}

/**
 * Generate auto label for sale transaction based on parcel characteristics
 *
 * Priority order:
 * 1. If all parcels in same phase -> "Phase X Sale"
 * 2. If all parcels in same area -> "Area X Sale"
 * 3. If all parcels same use type -> "Use Type Sale"
 * 4. Otherwise -> "Mixed Transaction (N phases)"
 */
export function generateAutoLabel(sale: SaleTransaction): string {
  const phases = new Set(sale.parcels.map(p => p.phase_name).filter(Boolean));
  const areas = new Set(sale.parcels.map(p => p.area_id).filter(Boolean));
  const types = new Set(sale.parcels.map(p => p.type_code));

  if (phases.size === 1 && [...phases][0]) {
    return `${[...phases][0]} Sale`;
  }

  if (areas.size === 1) {
    return `Area ${[...areas][0]} Sale`;
  }

  if (types.size === 1) {
    return `${[...types][0]} Sale`;
  }

  return `Mixed Transaction (${phases.size} phase${phases.size !== 1 ? 's' : ''})`;
}
