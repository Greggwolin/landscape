/**
 * Global Benchmarks API - Main Route
 * GET: List all benchmarks (with optional filters)
 * POST: Create new benchmark
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { BenchmarksListResponse, BenchmarkCategoryKey } from '@/types/benchmarks';

// GET /api/benchmarks
export async function GET(request: NextRequest) {
  try {
    // For now, return empty array - table may not exist yet
    // This allows the page to load while you run the migration
    const benchmarks: any[] = [];

    try {
      // Try to fetch from database
      const result = await sql`
        SELECT
          r.benchmark_id,
          r.user_id,
          r.category,
          r.subcategory,
          r.benchmark_name,
          r.description,
          r.market_geography,
          r.property_type,
          r.source_type,
          r.confidence_level,
          r.usage_count,
          r.as_of_date,
          r.is_active,
          r.is_global,
          r.created_at,
          r.updated_at,
          CURRENT_DATE - r.as_of_date AS age_days,
          CASE WHEN CURRENT_DATE - r.as_of_date > 730 THEN true ELSE false END AS is_stale,
          COALESCE(uc.value, tc.value) AS value,
          COALESCE(uc.uom_code, tc.value_type) AS uom_code,
          tc.cost_type,
          tc.value_type,
          tc.basis
        FROM landscape.tbl_global_benchmark_registry r
        LEFT JOIN landscape.tbl_benchmark_unit_cost uc ON r.benchmark_id = uc.benchmark_id
        LEFT JOIN landscape.tbl_benchmark_transaction_cost tc ON r.benchmark_id = tc.benchmark_id
        WHERE r.user_id = '1'
          AND r.is_active = true
        ORDER BY r.created_at DESC
      `;
      benchmarks.push(...result);
    } catch (dbError) {
      console.error('Database query error (table may not exist yet):', dbError);
      // Return empty array - allows page to load before migration is run
    }

    // Group by category for summary
    const groupedByCategory: Record<string, number> = {};
    benchmarks.forEach((b: any) => {
      groupedByCategory[b.category] = (groupedByCategory[b.category] || 0) + 1;
    });

    const response: BenchmarksListResponse = {
      benchmarks: benchmarks as any[],
      grouped_by_category: groupedByCategory as any,
      total: benchmarks.length
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching benchmarks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch benchmarks', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/benchmarks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body.user_id || '1'; // TODO: Get from auth

    // Validate required fields
    if (!body.benchmark_name || !body.category) {
      return NextResponse.json(
        { error: 'benchmark_name and category are required' },
        { status: 400 }
      );
    }

    // Start transaction
    await sql`BEGIN`;

    try {
      // Insert into benchmark registry
      const registryResult = await sql`
        INSERT INTO landscape.tbl_global_benchmark_registry (
          user_id,
          category,
          subcategory,
          benchmark_name,
          description,
          market_geography,
          property_type,
          source_type,
          source_document_id,
          source_project_id,
          extraction_date,
          confidence_level,
          as_of_date,
          cpi_index_value,
          context_metadata,
          is_global,
          created_by
        ) VALUES (
          ${userId},
          ${body.category},
          ${body.subcategory || null},
          ${body.benchmark_name},
          ${body.description || null},
          ${body.market_geography || null},
          ${body.property_type || null},
          ${body.source_type || 'user_input'},
          ${body.source_document_id || null},
          ${body.source_project_id || null},
          ${body.extraction_date || null},
          ${body.confidence_level || 'medium'},
          ${body.as_of_date || new Date().toISOString().split('T')[0]},
          ${body.cpi_index_value || null},
          ${body.context_metadata ? JSON.stringify(body.context_metadata) : null},
          ${body.is_global || false},
          ${userId}
        )
        RETURNING benchmark_id
      `;

      const benchmarkId = registryResult[0].benchmark_id;

      // Insert category-specific details based on category
      if (body.category === 'unit_cost') {
        await sql`
          INSERT INTO landscape.tbl_benchmark_unit_cost (
            benchmark_id,
            value,
            uom_code,
            uom_alt_code,
            low_value,
            high_value,
            cost_phase,
            work_type
          ) VALUES (
            ${benchmarkId},
            ${body.value},
            ${body.uom_code},
            ${body.uom_alt_code || null},
            ${body.low_value || null},
            ${body.high_value || null},
            ${body.cost_phase || null},
            ${body.work_type || null}
          )
        `;
      } else if (body.category === 'transaction_cost') {
        await sql`
          INSERT INTO landscape.tbl_benchmark_transaction_cost (
            benchmark_id,
            cost_type,
            value,
            value_type,
            basis,
            deal_size_min,
            deal_size_max
          ) VALUES (
            ${benchmarkId},
            ${body.cost_type},
            ${body.value},
            ${body.value_type},
            ${body.basis || null},
            ${body.deal_size_min || null},
            ${body.deal_size_max || null}
          )
        `;
      }

      await sql`COMMIT`;

      return NextResponse.json({
        benchmark_id: benchmarkId,
        message: 'Benchmark created successfully'
      }, { status: 201 });

    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }

  } catch (error: any) {
    console.error('Error creating benchmark:', error);
    return NextResponse.json(
      { error: 'Failed to create benchmark', details: error.message },
      { status: 500 }
    );
  }
}
