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
  totalRevenue: number;           // = gross_parcel_price (before deductions)
  improvementOffset: number;      // = subdivision costs (on-site improvements)
  grossSaleProceeds: number;      // = totalRevenue - improvementOffset
  commissions: number;
  closingCosts: number;
  netProceeds: number;            // = grossSaleProceeds - commissions - closingCosts
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

      // Check if we have sale assumption data (source of truth from tbl_parcel_sale_assumptions)
      const hasSaleAssumptions = parcels.some(p => p.sale_gross_parcel_price != null);

      let residentialRevenue: number;
      let commercialRevenue: number;
      let totalRevenue: number;
      let improvementOffset: number;
      let grossSaleProceeds: number;
      let commissions: number;
      let closingCosts: number;
      let netProceeds: number;

      if (hasSaleAssumptions) {
        // USE SALE ASSUMPTIONS (source of truth) - base values, no DCF escalation
        // This matches what's stored in the database
        residentialRevenue = residentialParcels.reduce((sum, p) => {
          return sum + (p.sale_gross_parcel_price || 0);
        }, 0);

        commercialRevenue = commercialParcels.reduce((sum, p) => {
          return sum + (p.sale_gross_parcel_price || 0);
        }, 0);

        totalRevenue = parcels.reduce((sum, p) => sum + (p.sale_gross_parcel_price || 0), 0);

        // Improvement offset (subdivision/on-site costs)
        improvementOffset = parcels.reduce((sum, p) => sum + (p.sale_improvement_offset || 0), 0);

        // Gross sale proceeds = gross price - improvement offset
        grossSaleProceeds = parcels.reduce((sum, p) => sum + (p.sale_gross_proceeds || 0), 0);

        // Use actual commission and closing cost amounts from sale assumptions
        commissions = parcels.reduce((sum, p) => sum + (p.sale_commission_amount || 0), 0);
        closingCosts = parcels.reduce((sum, p) => sum + (p.sale_closing_cost_amount || 0), 0);

        // Net proceeds from sale assumptions (gross_sale_proceeds - transaction_costs)
        netProceeds = parcels.reduce((sum, p) => sum + (p.net_proceeds || 0), 0);
      } else {
        // FALLBACK: Calculate from pricing (legacy behavior when no sale assumptions exist)
        residentialRevenue = residentialParcels.reduce((sum, p) => {
          if (p.gross_value) return sum + p.gross_value;
          if (p.current_value_per_unit && p.units) {
            return sum + (p.current_value_per_unit * p.units);
          }
          return sum;
        }, 0);

        commercialRevenue = commercialParcels.reduce((sum, p) => {
          if (p.gross_value) return sum + p.gross_value;
          if (p.current_value_per_unit && p.acres) {
            return sum + (p.current_value_per_unit * p.acres);
          }
          return sum;
        }, 0);

        totalRevenue = residentialRevenue + commercialRevenue;
        improvementOffset = 0; // Not available in legacy mode
        grossSaleProceeds = totalRevenue; // Same as total when no improvement offset

        // Calculate deductions with hardcoded rates (legacy)
        const commissionRate = 0.03; // 3%
        const closingCostRate = 0.02; // 2%

        commissions = totalRevenue * commissionRate;
        closingCosts = totalRevenue * closingCostRate;
        netProceeds = totalRevenue - commissions - closingCosts;
      }

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
        improvementOffset,
        grossSaleProceeds,
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
    return `Sale ${[...phases][0]}`;
  }

  if (areas.size === 1) {
    return `Sale Area ${[...areas][0]}`;
  }

  if (types.size === 1) {
    return `Sale ${[...types][0]}`;
  }

  return `Multi-Phase Sale (${phases.size} phases)`;
}
