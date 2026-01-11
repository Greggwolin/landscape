import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = { params: Promise<{ projectId: string }> };

// Standard lot width bands (center values)
const LOT_WIDTH_BANDS = [40, 45, 50, 55, 60, 65, 70, 80];
const BAND_TOLERANCE = 2.5; // ±2.5 feet for matching

type ProductPricingRow = {
  competitive_project_id: number;
  comp_name: string;
  master_plan_name: string | null;
  builder_name: string | null;
  lot_width_ft: number;
  price_min: number | null;
  price_max: number | null;
  price_avg: number | null;
  price_per_sf_avg: number | null;
  units_planned: number | null;
  units_remaining: number | null;
  sales_rate_monthly: number | null;
};

interface LotWidthPricing {
  lot_width: number;
  avg_price: number | null;
  min_price: number | null;
  max_price: number | null;
  avg_price_per_sf: number | null;
  total_units: number;
  total_remaining: number;
  avg_absorption: number | null;
  project_count: number;
  projects: Array<{
    comp_name: string;
    builder_name: string | null;
    price_min: number | null;
    price_max: number | null;
    price_avg: number | null;
  }>;
}

/**
 * GET /api/projects/[projectId]/market/competitors/pricing-by-lot-width
 *
 * Returns Zonda competitor pricing aggregated by lot width bands
 * Used for comparing against Redfin resale comps
 *
 * Query params:
 *   - tolerance: number (default: 2.5) - ±feet tolerance for band matching
 */
export async function GET(req: NextRequest, context: Params) {
  try {
    const { projectId } = await context.params;
    if (!projectId) {
      return NextResponse.json({ error: 'project id required' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const tolerance = parseFloat(searchParams.get('tolerance') || String(BAND_TOLERANCE));

    // Get all product-level pricing from competitors for this project
    const products = await sql<ProductPricingRow>`
      SELECT
        p.competitive_project_id,
        c.comp_name,
        c.master_plan_name,
        c.builder_name,
        p.lot_width_ft,
        p.price_min,
        p.price_max,
        p.price_avg,
        p.price_per_sf_avg,
        p.units_planned,
        p.units_remaining,
        p.sales_rate_monthly
      FROM landscape.market_competitive_project_products p
      JOIN landscape.market_competitive_projects c ON c.id = p.competitive_project_id
      WHERE c.project_id = ${projectId}::integer
        AND p.lot_width_ft IS NOT NULL
      ORDER BY p.lot_width_ft
    `;

    // Group products into lot width bands
    const bandPricing: Map<number, LotWidthPricing> = new Map();

    // Initialize all bands
    for (const band of LOT_WIDTH_BANDS) {
      bandPricing.set(band, {
        lot_width: band,
        avg_price: null,
        min_price: null,
        max_price: null,
        avg_price_per_sf: null,
        total_units: 0,
        total_remaining: 0,
        avg_absorption: null,
        project_count: 0,
        projects: [],
      });
    }

    // Assign each product to the nearest band within tolerance
    for (const prod of products) {
      const lotWidth = prod.lot_width_ft;

      // Find the closest band
      let closestBand: number | null = null;
      let closestDistance = Infinity;

      for (const band of LOT_WIDTH_BANDS) {
        const distance = Math.abs(lotWidth - band);
        if (distance <= tolerance && distance < closestDistance) {
          closestBand = band;
          closestDistance = distance;
        }
      }

      if (closestBand === null) {
        // No matching band within tolerance - skip or create new band
        // For now, skip products that don't fit standard bands
        continue;
      }

      const bandData = bandPricing.get(closestBand)!;

      // Add project info
      bandData.projects.push({
        comp_name: prod.comp_name,
        builder_name: prod.builder_name,
        price_min: prod.price_min,
        price_max: prod.price_max,
        price_avg: prod.price_avg,
      });

      // Aggregate metrics
      if (prod.units_planned) {
        bandData.total_units += prod.units_planned;
      }
      if (prod.units_remaining) {
        bandData.total_remaining += prod.units_remaining;
      }

      // Track min/max prices
      if (prod.price_min !== null) {
        bandData.min_price = bandData.min_price === null
          ? prod.price_min
          : Math.min(bandData.min_price, prod.price_min);
      }
      if (prod.price_max !== null) {
        bandData.max_price = bandData.max_price === null
          ? prod.price_max
          : Math.max(bandData.max_price, prod.price_max);
      }

      bandData.project_count++;
    }

    // Calculate averages for each band
    for (const band of LOT_WIDTH_BANDS) {
      const bandData = bandPricing.get(band)!;

      if (bandData.projects.length > 0) {
        // Average price - use midpoint of min/max for each project
        const prices = bandData.projects
          .map(p => {
            // Convert string to number if needed
            const minPrice = typeof p.price_min === 'string' ? parseFloat(p.price_min) : p.price_min;
            const maxPrice = typeof p.price_max === 'string' ? parseFloat(p.price_max) : p.price_max;
            const avgPrice = typeof p.price_avg === 'string' ? parseFloat(p.price_avg) : p.price_avg;

            if (avgPrice) return avgPrice;
            if (minPrice && maxPrice) return (minPrice + maxPrice) / 2;
            return minPrice || maxPrice || null;
          })
          .filter((p): p is number => p !== null);

        if (prices.length > 0) {
          bandData.avg_price = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
        }
      }
    }

    // Also calculate from raw product data for price_per_sf and absorption
    for (const prod of products) {
      const lotWidth = prod.lot_width_ft;
      let closestBand: number | null = null;
      let closestDistance = Infinity;

      for (const band of LOT_WIDTH_BANDS) {
        const distance = Math.abs(lotWidth - band);
        if (distance <= tolerance && distance < closestDistance) {
          closestBand = band;
          closestDistance = distance;
        }
      }

      if (closestBand === null) continue;

      const bandData = bandPricing.get(closestBand)!;

      // We need to accumulate for averaging
      // This is a bit redundant but ensures accuracy
    }

    // Calculate price_per_sf averages
    for (const band of LOT_WIDTH_BANDS) {
      const bandData = bandPricing.get(band)!;

      // Get all products in this band
      const bandProducts = products.filter(p => {
        const distance = Math.abs(p.lot_width_ft - band);
        return distance <= tolerance;
      });

      const psfValues = bandProducts
        .map(p => p.price_per_sf_avg)
        .filter((v): v is number => v !== null);

      if (psfValues.length > 0) {
        bandData.avg_price_per_sf = Math.round(psfValues.reduce((a, b) => a + b, 0) / psfValues.length);
      }

      const absorptionValues = bandProducts
        .map(p => p.sales_rate_monthly)
        .filter((v): v is number => v !== null);

      if (absorptionValues.length > 0) {
        bandData.avg_absorption = Math.round(absorptionValues.reduce((a, b) => a + b, 0) / absorptionValues.length * 10) / 10;
      }
    }

    // Build response - only include bands with data
    const result: Record<string, LotWidthPricing> = {};

    for (const [band, data] of bandPricing.entries()) {
      if (data.project_count > 0) {
        result[String(band)] = data;
      }
    }

    // Also include summary stats
    const summary = {
      total_products: products.length,
      bands_with_data: Object.keys(result).length,
      tolerance_feet: tolerance,
    };

    return NextResponse.json({
      summary,
      pricing: result,
    });
  } catch (error) {
    console.error('market/competitors/pricing-by-lot-width GET error', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing by lot width' },
      { status: 500 }
    );
  }
}
