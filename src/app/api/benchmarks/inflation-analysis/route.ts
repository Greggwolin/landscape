/**
 * Inflation Analysis API
 * GET: Analyze inflation trends across benchmarks
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { InflationAnalysisResponse, BenchmarkCategoryKey } from '@/types/benchmarks';

// GET /api/benchmarks/inflation-analysis
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const category = searchParams.get('category') as BenchmarkCategoryKey;
    const marketGeography = searchParams.get('market_geography');
    const lookbackMonths = parseInt(searchParams.get('lookback_months') || '12');

    if (!category) {
      return NextResponse.json(
        { error: 'category parameter is required' },
        { status: 400 }
      );
    }

    // Calculate lookback date
    const lookbackDate = new Date();
    lookbackDate.setMonth(lookbackDate.getMonth() - lookbackMonths);
    const lookbackDateStr = lookbackDate.toISOString().split('T')[0];

    // Fetch benchmarks within lookback period
    const benchmarks = await sql`
      SELECT
        r.benchmark_id,
        r.subcategory,
        r.as_of_date,
        r.cpi_index_value,
        COALESCE(uc.value, tc.value) AS value,
        r.created_at
      FROM landscape.tbl_global_benchmark_registry r
      LEFT JOIN landscape.tbl_benchmark_unit_cost uc ON r.benchmark_id = uc.benchmark_id
      LEFT JOIN landscape.tbl_benchmark_transaction_cost tc ON r.benchmark_id = tc.benchmark_id
      WHERE r.category = ${category}
        AND r.as_of_date >= ${lookbackDateStr}::date
        ${marketGeography ? sql`AND (r.market_geography = ${marketGeography} OR r.market_geography IS NULL)` : sql``}
        AND r.is_active = true
      ORDER BY r.subcategory, r.as_of_date
    `;

    // Stub CPI change (TODO: integrate with CPI auto-sync when available)
    const cpiChangePct = 2.41; // Placeholder

    // Group by subcategory and calculate trends
    const subcategoryGroups: { [key: string]: any[] } = {};
    benchmarks.forEach((b: any) => {
      const subcat = b.subcategory || 'general';
      if (!subcategoryGroups[subcat]) {
        subcategoryGroups[subcat] = [];
      }
      subcategoryGroups[subcat].push(b);
    });

    const trends = Object.entries(subcategoryGroups).map(([subcategory, items]) => {
      if (items.length < 2) {
        return {
          subcategory,
          avg_change_pct: 0,
          cpi_component_pct: cpiChangePct,
          real_change_pct: 0,
          message: 'Insufficient data for trend analysis',
          sample_size: items.length
        };
      }

      // Calculate average change
      const oldest = items[0];
      const newest = items[items.length - 1];
      const avgChangePct = ((newest.value - oldest.value) / oldest.value) * 100;
      const realChangePct = avgChangePct - cpiChangePct;

      let message = '';
      if (Math.abs(realChangePct) < 1) {
        message = `${subcategory} costs tracking inflation`;
      } else if (realChangePct > 0) {
        message = `${subcategory} costs rising faster than inflation`;
      } else {
        message = `${subcategory} costs below inflation trend`;
      }

      return {
        subcategory,
        avg_change_pct: parseFloat(avgChangePct.toFixed(2)),
        cpi_component_pct: cpiChangePct,
        real_change_pct: parseFloat(realChangePct.toFixed(2)),
        message,
        sample_size: items.length
      };
    });

    const response: InflationAnalysisResponse = {
      category,
      market_geography: marketGeography || undefined,
      period: `${lookbackDateStr} to ${new Date().toISOString().split('T')[0]}`,
      cpi_change_pct: cpiChangePct,
      benchmarks_analyzed: benchmarks.length,
      trends
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error performing inflation analysis:', error);
    return NextResponse.json(
      { error: 'Failed to perform inflation analysis', details: error.message },
      { status: 500 }
    );
  }
}
