/**
 * Global Benchmarks API - Individual Benchmark Route
 * GET: Get benchmark details with full history
 * PUT: Update existing benchmark
 * DELETE: Soft delete benchmark
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { BenchmarkDetailResponse } from '@/types/benchmarks';

type Params = { params: Promise<{ benchmarkId: string }> };

// GET /api/benchmarks/[benchmarkId]
export async function GET(request: NextRequest, context: Params) {
  try {
    const { benchmarkId } = await context.params;

    // Fetch benchmark registry data
    const registryResult = await sql`
      SELECT
        benchmark_id,
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
        usage_count,
        as_of_date,
        cpi_index_value,
        context_metadata,
        is_active,
        is_global,
        created_at,
        updated_at,
        created_by,
        updated_by
      FROM landscape.tbl_global_benchmark_registry
      WHERE benchmark_id = ${benchmarkId}::bigint
    `;

    if (registryResult.length === 0) {
      return NextResponse.json(
        { error: 'Benchmark not found' },
        { status: 404 }
      );
    }

    const benchmark = registryResult[0];

    // Fetch category-specific details
    let detail = null;
    if (benchmark.category === 'unit_cost') {
      const detailResult = await sql`
        SELECT * FROM landscape.tbl_benchmark_unit_cost
        WHERE benchmark_id = ${benchmarkId}::bigint
      `;
      detail = detailResult[0] || null;
    } else if (benchmark.category === 'transaction_cost') {
      const detailResult = await sql`
        SELECT * FROM landscape.tbl_benchmark_transaction_cost
        WHERE benchmark_id = ${benchmarkId}::bigint
      `;
      detail = detailResult[0] || null;
    } else if (benchmark.category === 'contingency') {
      const detailResult = await sql`
        SELECT * FROM landscape.tbl_benchmark_contingency
        WHERE benchmark_id = ${benchmarkId}::bigint
      `;
      detail = detailResult[0] || null;
    }

    // Fetch source information
    const sources = await sql`
      SELECT DISTINCT
        r.source_type,
        d.file_name AS document_name,
        p.project_name,
        r.extraction_date,
        COALESCE(uc.value, tc.value) AS value,
        r.context_metadata AS context
      FROM landscape.tbl_global_benchmark_registry r
      LEFT JOIN landscape.core_doc d ON r.source_document_id = d.doc_id
      LEFT JOIN landscape.tbl_project p ON r.source_project_id = p.project_id
      LEFT JOIN landscape.tbl_benchmark_unit_cost uc ON r.benchmark_id = uc.benchmark_id
      LEFT JOIN landscape.tbl_benchmark_transaction_cost tc ON r.benchmark_id = tc.benchmark_id
      WHERE r.benchmark_id = ${benchmarkId}::bigint
        OR r.benchmark_name = ${benchmark.benchmark_name}
      ORDER BY r.extraction_date DESC NULLS LAST
    `;

    // Fetch inflation history
    // TODO: This would query historical CPI data when integrated
    const inflationHistory = [
      {
        date: benchmark.as_of_date,
        value: detail?.value || 0,
        cpi: benchmark.cpi_index_value || 0
      }
    ];

    const response: BenchmarkDetailResponse = {
      benchmark,
      detail,
      sources: sources as any[],
      inflation_history: inflationHistory
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching benchmark detail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch benchmark detail', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/benchmarks/[benchmarkId] - Partial update for inline editing
export async function PATCH(request: NextRequest, context: Params) {
  try {
    const { benchmarkId } = await context.params;
    const body = await request.json();

    // Get the benchmark category first
    const categoryResult = await sql`
      SELECT category FROM landscape.tbl_global_benchmark_registry
      WHERE benchmark_id = ${benchmarkId}::bigint
    `;

    if (categoryResult.length === 0) {
      return NextResponse.json(
        { error: 'Benchmark not found' },
        { status: 404 }
      );
    }

    const category = categoryResult[0].category;

    // Update registry (only fields provided)
    await sql`
      UPDATE landscape.tbl_global_benchmark_registry
      SET
        benchmark_name = COALESCE(${body.benchmark_name}, benchmark_name),
        description = COALESCE(${body.description}, description),
        updated_at = NOW()
      WHERE benchmark_id = ${benchmarkId}::bigint
    `;

    // Update category-specific tables
    if (category === 'transaction_cost' && body.value !== undefined) {
      await sql`
        UPDATE landscape.tbl_benchmark_transaction_cost
        SET
          cost_type = COALESCE(${body.cost_type}, cost_type),
          value = ${body.value},
          value_type = COALESCE(${body.value_type}, value_type),
          basis = COALESCE(${body.basis}, basis),
          updated_at = NOW()
        WHERE benchmark_id = ${benchmarkId}::bigint
      `;
    } else if (category === 'unit_cost' && body.value !== undefined) {
      await sql`
        UPDATE landscape.tbl_benchmark_unit_cost
        SET
          value = ${body.value},
          uom_code = COALESCE(${body.uom_code}, uom_code),
          cost_phase = COALESCE(${body.cost_phase}, cost_phase),
          work_type = COALESCE(${body.work_type}, work_type),
          updated_at = NOW()
        WHERE benchmark_id = ${benchmarkId}::bigint
      `;
    } else if (category === 'contingency' && body.percentage !== undefined) {
      await sql`
        UPDATE landscape.tbl_benchmark_contingency
        SET
          percentage = ${body.percentage},
          updated_at = NOW()
        WHERE benchmark_id = ${benchmarkId}::bigint
      `;
    }

    return NextResponse.json({
      success: true,
      message: 'Benchmark updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating benchmark:', error);
    return NextResponse.json(
      { error: 'Failed to update benchmark', details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/benchmarks/[benchmarkId] - Full replacement (legacy)
export async function PUT(request: NextRequest, context: Params) {
  try {
    const { benchmarkId } = await context.params;
    const body = await request.json();
    const userId = body.user_id || '1'; // TODO: Get from auth

    // Update registry
    await sql`
      UPDATE landscape.tbl_global_benchmark_registry
      SET
        benchmark_name = ${body.benchmark_name || sql`benchmark_name`},
        description = ${body.description !== undefined ? body.description : sql`description`},
        market_geography = ${body.market_geography !== undefined ? body.market_geography : sql`market_geography`},
        property_type = ${body.property_type !== undefined ? body.property_type : sql`property_type`},
        confidence_level = ${body.confidence_level || sql`confidence_level`},
        as_of_date = ${body.as_of_date || sql`as_of_date`},
        cpi_index_value = ${body.cpi_index_value !== undefined ? body.cpi_index_value : sql`cpi_index_value`},
        context_metadata = ${body.context_metadata ? JSON.stringify(body.context_metadata) : sql`context_metadata`},
        updated_at = NOW(),
        updated_by = ${userId}
      WHERE benchmark_id = ${benchmarkId}::bigint
    `;

    // Update category-specific details
    if (body.category === 'unit_cost' && body.value !== undefined) {
      await sql`
        UPDATE landscape.tbl_benchmark_unit_cost
        SET
          value = ${body.value},
          uom_code = ${body.uom_code || sql`uom_code`},
          uom_alt_code = ${body.uom_alt_code !== undefined ? body.uom_alt_code : sql`uom_alt_code`},
          low_value = ${body.low_value !== undefined ? body.low_value : sql`low_value`},
          high_value = ${body.high_value !== undefined ? body.high_value : sql`high_value`},
          cost_phase = ${body.cost_phase !== undefined ? body.cost_phase : sql`cost_phase`},
          work_type = ${body.work_type !== undefined ? body.work_type : sql`work_type`},
          updated_at = NOW()
        WHERE benchmark_id = ${benchmarkId}::bigint
      `;
    } else if (body.category === 'transaction_cost' && body.value !== undefined) {
      await sql`
        UPDATE landscape.tbl_benchmark_transaction_cost
        SET
          cost_type = ${body.cost_type || sql`cost_type`},
          value = ${body.value},
          value_type = ${body.value_type || sql`value_type`},
          basis = ${body.basis !== undefined ? body.basis : sql`basis`},
          deal_size_min = ${body.deal_size_min !== undefined ? body.deal_size_min : sql`deal_size_min`},
          deal_size_max = ${body.deal_size_max !== undefined ? body.deal_size_max : sql`deal_size_max`},
          updated_at = NOW()
        WHERE benchmark_id = ${benchmarkId}::bigint
      `;
    } else if (body.category === 'contingency' && body.percentage !== undefined) {
      await sql`
        UPDATE landscape.tbl_benchmark_contingency
        SET
          percentage = ${body.percentage},
          updated_at = NOW()
        WHERE benchmark_id = ${benchmarkId}::bigint
      `;
    }

    return NextResponse.json({
      success: true,
      message: 'Benchmark updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating benchmark:', error);
    return NextResponse.json(
      { error: 'Failed to update benchmark', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/benchmarks/[benchmarkId]
export async function DELETE(request: NextRequest, context: Params) {
  try {
    const { benchmarkId } = await context.params;

    // Check if benchmark is referenced anywhere
    const usageCheck = await sql`
      SELECT usage_count
      FROM landscape.tbl_global_benchmark_registry
      WHERE benchmark_id = ${benchmarkId}::bigint
    `;

    if (usageCheck.length === 0) {
      return NextResponse.json(
        { error: 'Benchmark not found' },
        { status: 404 }
      );
    }

    const usageCount = usageCheck[0].usage_count || 0;

    if (usageCount > 0) {
      // Soft delete - mark as inactive
      await sql`
        UPDATE landscape.tbl_global_benchmark_registry
        SET is_active = false, updated_at = NOW()
        WHERE benchmark_id = ${benchmarkId}::bigint
      `;

      return NextResponse.json({
        success: true,
        message: 'Benchmark archived (soft delete)',
        soft_delete: true,
        references_found: usageCount
      });
    } else {
      // Hard delete - no references
      await sql`
        DELETE FROM landscape.tbl_global_benchmark_registry
        WHERE benchmark_id = ${benchmarkId}::bigint
      `;

      return NextResponse.json({
        success: true,
        message: 'Benchmark deleted',
        soft_delete: false,
        references_found: 0
      });
    }

  } catch (error: any) {
    console.error('Error deleting benchmark:', error);
    return NextResponse.json(
      { error: 'Failed to delete benchmark', details: error.message },
      { status: 500 }
    );
  }
}
