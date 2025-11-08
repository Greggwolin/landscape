/**
 * AI Suggestions API - Review Route
 * POST: User reviews and approves/rejects AI suggestion
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { ReviewSuggestionRequest, ReviewSuggestionResponse } from '@/types/benchmarks';

type Params = { params: Promise<{ suggestionId: string }> };

// POST /api/benchmarks/ai-suggestions/[suggestionId]/review
export async function POST(request: NextRequest, context: Params) {
  try {
    const { suggestionId } = await context.params;
    const body: ReviewSuggestionRequest = await request.json();
    const userId = '1'; // TODO: Get from auth

    // Validate action
    if (!['approved', 'variant', 'rejected'].includes(body.action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be approved, variant, or rejected' },
        { status: 400 }
      );
    }

    // Fetch the suggestion
    const suggestionResult = await sql`
      SELECT * FROM landscape.tbl_benchmark_ai_suggestions
      WHERE suggestion_id = ${suggestionId}::bigint
    `;

    if (suggestionResult.length === 0) {
      return NextResponse.json(
        { error: 'Suggestion not found' },
        { status: 404 }
      );
    }

    const suggestion = suggestionResult[0];

    await sql`BEGIN`;

    try {
      let benchmarkId: number | null = null;
      let message = '';

      if (body.action === 'approved' || body.action === 'variant') {
        // Create benchmark from suggestion
        const benchmarkName = body.action === 'variant' && body.variant_name
          ? body.variant_name
          : suggestion.suggested_name;

        // Insert into registry
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
            context_metadata,
            is_global,
            created_by
          ) VALUES (
            ${suggestion.user_id},
            ${suggestion.category},
            ${suggestion.subcategory},
            ${benchmarkName},
            ${body.notes || null},
            ${suggestion.market_geography},
            ${suggestion.property_type},
            'document_extraction',
            ${suggestion.document_id},
            ${suggestion.project_id},
            ${suggestion.extraction_date},
            ${suggestion.confidence_score >= 0.8 ? 'high' : suggestion.confidence_score >= 0.5 ? 'medium' : 'low'},
            CURRENT_DATE,
            ${suggestion.extraction_context ? JSON.stringify(suggestion.extraction_context) : null},
            true,
            ${userId}
          )
          RETURNING benchmark_id
        `;

        benchmarkId = registryResult[0].benchmark_id;

        // Insert category-specific details
        if (suggestion.category === 'unit_cost') {
          await sql`
            INSERT INTO landscape.tbl_benchmark_unit_cost (
              benchmark_id,
              value,
              uom_code,
              cost_phase,
              work_type
            ) VALUES (
              ${benchmarkId},
              ${suggestion.suggested_value},
              ${suggestion.suggested_uom},
              ${suggestion.extraction_context?.cost_phase || null},
              ${suggestion.extraction_context?.work_type || null}
            )
          `;
        } else if (suggestion.category === 'transaction_cost') {
          await sql`
            INSERT INTO landscape.tbl_benchmark_transaction_cost (
              benchmark_id,
              cost_type,
              value,
              value_type,
              basis
            ) VALUES (
              ${benchmarkId},
              ${suggestion.subcategory || 'general'},
              ${suggestion.suggested_value},
              'percentage',
              ${suggestion.extraction_context?.basis || null}
            )
          `;
        }

        // Update existing benchmark usage count if exists
        if (suggestion.existing_benchmark_id) {
          await sql`
            UPDATE landscape.tbl_global_benchmark_registry
            SET usage_count = usage_count + 1
            WHERE benchmark_id = ${suggestion.existing_benchmark_id}
          `;
        }

        message = body.action === 'variant'
          ? 'Benchmark variant created from AI suggestion'
          : 'Benchmark created from AI suggestion';
      } else {
        message = 'Suggestion rejected';
      }

      // Update suggestion status
      await sql`
        UPDATE landscape.tbl_benchmark_ai_suggestions
        SET
          status = ${body.action === 'rejected' ? 'rejected' : 'approved'},
          user_response = ${JSON.stringify({
            action: body.action,
            notes: body.notes,
            variant_name: body.variant_name,
            reason: body.reason
          })},
          reviewed_at = NOW(),
          reviewed_by = ${userId},
          created_benchmark_id = ${benchmarkId}
        WHERE suggestion_id = ${suggestionId}::bigint
      `;

      await sql`COMMIT`;

      const response: ReviewSuggestionResponse = {
        success: true,
        benchmark_id: benchmarkId || undefined,
        message
      };

      return NextResponse.json(response);

    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }

  } catch (error: any) {
    console.error('Error reviewing suggestion:', error);
    return NextResponse.json(
      { error: 'Failed to review suggestion', details: error.message },
      { status: 500 }
    );
  }
}
