/**
 * SFD Product Lot Band Mapping and Comp Stats Calculator
 *
 * Maps SFD lot products (e.g., 45', 50', 55') to lot size bands
 * and calculates pricing statistics from Redfin comps.
 */

import { SfComp } from '@/hooks/analysis/useSfComps';

/**
 * Configuration for an SFD lot product
 */
export interface SfdProductConfig {
  product: string;           // Display name (e.g., "45'")
  lotWidthFt: number;        // Lot width in feet
  lotSfMin: number;          // Minimum lot SF for this band
  lotSfMax: number;          // Maximum lot SF for this band
  defaultDepth: number;      // Default lot depth for calculations
}

/**
 * Default SFD product configurations
 * These map lot widths to SF bands based on typical lot depths (~115-125')
 * Bands are non-overlapping with midpoint boundaries between products
 */
export const DEFAULT_SFD_PRODUCTS: SfdProductConfig[] = [
  { product: "40'", lotWidthFt: 40, lotSfMin: 3500, lotSfMax: 5175, defaultDepth: 115 },   // 40' x 115' = 4,600 SF center
  { product: "45'", lotWidthFt: 45, lotSfMin: 5175, lotSfMax: 5750, defaultDepth: 115 },   // 45' x 115' = 5,175 SF center
  { product: "50'", lotWidthFt: 50, lotSfMin: 5750, lotSfMax: 6325, defaultDepth: 115 },   // 50' x 115' = 5,750 SF center
  { product: "55'", lotWidthFt: 55, lotSfMin: 6325, lotSfMax: 6900, defaultDepth: 115 },   // 55' x 115' = 6,325 SF center
  { product: "60'", lotWidthFt: 60, lotSfMin: 6900, lotSfMax: 7500, defaultDepth: 115 },   // 60' x 115' = 6,900 SF center
  { product: "65'", lotWidthFt: 65, lotSfMin: 7500, lotSfMax: 8100, defaultDepth: 115 },   // 65' x 115' = 7,475 SF center
  { product: "70'", lotWidthFt: 70, lotSfMin: 8100, lotSfMax: 9200, defaultDepth: 115 },   // 70' x 115' = 8,050 SF center
  { product: "80'", lotWidthFt: 80, lotSfMin: 9200, lotSfMax: 15000, defaultDepth: 115 },  // 80' x 115' = 9,200 SF center
];

/**
 * Data quality indicator based on comp count
 */
export type DataQuality = 'high' | 'medium' | 'low' | 'insufficient';

/**
 * Stats calculated for a single SFD product from comps
 */
export interface SfdProductStats {
  product: string;
  lotSfBand: string;
  compCount: number;
  medianPrice: number | null;
  avgPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  p25Price: number | null;
  p75Price: number | null;
  avgSqft: number | null;
  avgYearBuilt: number | null;
  dataQuality: DataQuality;
  source: 'redfin' | 'benchmark' | 'user';
  comps: SfComp[];  // The actual comps in this band
}

/**
 * Full stats result including all products and metadata
 */
export interface SfdCompsAnalysis {
  products: SfdProductStats[];
  totalComps: number;
  compsWithLotSize: number;
  searchRadius: number;
  soldWithinDays: number;
  analysisDate: string;
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sortedValues: number[], p: number): number | null {
  if (sortedValues.length === 0) return null;
  const index = (p / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower];
  return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * (index - lower);
}

/**
 * Calculate median from array
 */
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return percentile(sorted, 50);
}

/**
 * Determine data quality based on comp count
 */
function getDataQuality(compCount: number): DataQuality {
  if (compCount >= 10) return 'high';
  if (compCount >= 5) return 'medium';
  if (compCount >= 2) return 'low';
  return 'insufficient';
}

/**
 * Format lot SF band as display string
 */
function formatLotBand(min: number, max: number): string {
  const formatNum = (n: number) => n.toLocaleString();
  return `${formatNum(min)}-${formatNum(max)}`;
}

/**
 * Filter comps by lot size band
 */
export function filterCompsByLotBand(
  comps: SfComp[],
  lotSfMin: number,
  lotSfMax: number
): SfComp[] {
  return comps.filter(comp => {
    const lotSqft = comp.lotSqft;
    if (lotSqft === null || lotSqft === undefined) return false;
    return lotSqft >= lotSfMin && lotSqft <= lotSfMax;
  });
}

/**
 * Calculate stats for a single product from filtered comps
 */
export function calculateProductStats(
  config: SfdProductConfig,
  comps: SfComp[]
): SfdProductStats {
  const filteredComps = filterCompsByLotBand(comps, config.lotSfMin, config.lotSfMax);
  const prices = filteredComps.map(c => c.salePrice).filter((p): p is number => p > 0);
  const sqfts = filteredComps.map(c => c.sqft).filter((s): s is number => s !== null && s > 0);
  const years = filteredComps.map(c => c.yearBuilt).filter((y): y is number => y !== null && y > 1900);

  const sortedPrices = [...prices].sort((a, b) => a - b);

  return {
    product: config.product,
    lotSfBand: formatLotBand(config.lotSfMin, config.lotSfMax),
    compCount: filteredComps.length,
    medianPrice: median(prices),
    avgPrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null,
    minPrice: prices.length > 0 ? Math.min(...prices) : null,
    maxPrice: prices.length > 0 ? Math.max(...prices) : null,
    p25Price: percentile(sortedPrices, 25),
    p75Price: percentile(sortedPrices, 75),
    avgSqft: sqfts.length > 0 ? Math.round(sqfts.reduce((a, b) => a + b, 0) / sqfts.length) : null,
    avgYearBuilt: years.length > 0 ? Math.round(years.reduce((a, b) => a + b, 0) / years.length) : null,
    dataQuality: getDataQuality(filteredComps.length),
    source: filteredComps.length > 0 ? 'redfin' : 'benchmark',
    comps: filteredComps,
  };
}

/**
 * Calculate FLV (Finished Lot Value) metrics for a product
 *
 * @param medianPrice - Median home sale price
 * @param flfPercent - Finished Lot Factor as percentage (e.g., 23 for 23%)
 * @param subImpPerFf - Subdivision improvements cost per front foot
 * @param lotWidthFt - Lot width in feet (frontage)
 */
export function calculateFlvMetrics(
  medianPrice: number | null,
  flfPercent: number,
  subImpPerFf: number,
  lotWidthFt: number
): {
  flvPerLot: number | null;
  flvPerFf: number | null;
  subImpPerLot: number;
  subImpPerFf: number;
  residualPerLot: number | null;
  residualPerFf: number | null;
} {
  if (medianPrice === null) {
    return {
      flvPerLot: null,
      flvPerFf: null,
      subImpPerLot: subImpPerFf * lotWidthFt,
      subImpPerFf: subImpPerFf,
      residualPerLot: null,
      residualPerFf: null,
    };
  }

  const flvPerLot = Math.round(medianPrice * (flfPercent / 100));
  const subImpPerLot = Math.round(subImpPerFf * lotWidthFt);
  const residualPerLot = flvPerLot - subImpPerLot;

  // Calculate per front foot values
  const flvPerFf = lotWidthFt > 0 ? Math.round(flvPerLot / lotWidthFt) : null;
  const residualPerFf = lotWidthFt > 0 ? Math.round(residualPerLot / lotWidthFt) : null;

  return {
    flvPerLot,
    flvPerFf,
    subImpPerLot,
    subImpPerFf,
    residualPerLot,
    residualPerFf,
  };
}

/**
 * Analyze all SFD products from comps
 */
export function analyzeSfdComps(
  comps: SfComp[],
  products: SfdProductConfig[] = DEFAULT_SFD_PRODUCTS,
  searchRadius: number,
  soldWithinDays: number
): SfdCompsAnalysis {
  const compsWithLotSize = comps.filter(c => c.lotSqft !== null && c.lotSqft > 0);

  const productStats = products.map(config => calculateProductStats(config, comps));

  return {
    products: productStats,
    totalComps: comps.length,
    compsWithLotSize: compsWithLotSize.length,
    searchRadius,
    soldWithinDays,
    analysisDate: new Date().toISOString(),
  };
}

/**
 * Get products that have sufficient data (at least 2 comps)
 */
export function getProductsWithData(analysis: SfdCompsAnalysis): SfdProductStats[] {
  return analysis.products.filter(p => p.compCount >= 2);
}

/**
 * Get products with insufficient data for fallback/benchmark lookup
 */
export function getProductsNeedingBenchmarks(analysis: SfdCompsAnalysis): SfdProductStats[] {
  return analysis.products.filter(p => p.compCount < 2);
}

/**
 * Get the product band name for a given lot square footage
 * Assigns to the first matching band in ascending order (bands overlap intentionally)
 *
 * @param lotSqft - Lot size in square feet
 * @param products - Product configurations (defaults to DEFAULT_SFD_PRODUCTS)
 * @returns Product band name (e.g., "50'") or null if outside all bands
 */
export function getProductBand(
  lotSqft: number | null,
  products: SfdProductConfig[] = DEFAULT_SFD_PRODUCTS
): string | null {
  if (!lotSqft || lotSqft <= 0) return null;

  // Sort by lotSfMin ascending to assign to first matching band
  const sortedProducts = [...products].sort((a, b) => a.lotSfMin - b.lotSfMin);

  for (const product of sortedProducts) {
    if (lotSqft >= product.lotSfMin && lotSqft <= product.lotSfMax) {
      return product.product;
    }
  }

  return null; // Outside all bands
}
