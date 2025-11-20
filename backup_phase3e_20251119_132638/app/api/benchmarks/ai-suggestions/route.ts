/**
 * AI Suggestions API - List Route
 * GET: Fetch pending AI suggestions for user review
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { AISuggestionsResponse, SuggestionStatus, BenchmarkCategoryKey } from '@/types/benchmarks';

// GET /api/benchmarks/ai-suggestions
export async function GET(request: NextRequest) {
  try {
    // For now, return empty array - table may not exist yet
    const suggestions: any[] = [];

    try {
      // Try to fetch from database
      const result = await sql`
        SELECT
          s.suggestion_id,
          s.user_id,
          s.document_id,
          s.project_id,
          s.extraction_date,
          s.category,
          s.subcategory,
          s.suggested_name,
          s.suggested_value,
          s.suggested_uom,
          s.market_geography,
          s.property_type,
          s.confidence_score,
          s.extraction_context,
          s.existing_benchmark_id,
          s.variance_percentage,
          s.inflation_adjusted_comparison,
          s.status,
          s.created_at,
          d.file_name AS document_name,
          p.project_name
        FROM landscape.tbl_benchmark_ai_suggestions s
        LEFT JOIN landscape.core_doc d ON s.document_id = d.doc_id
        LEFT JOIN landscape.tbl_project p ON s.project_id = p.project_id
        WHERE s.user_id = '1'
          AND s.status = 'pending'
        ORDER BY s.extraction_date DESC, s.confidence_score DESC NULLS LAST
      `;
      suggestions.push(...result);
    } catch (dbError) {
      console.error('Database query error (table may not exist yet):', dbError);
      // Return empty array - allows page to load before migration is run
    }

    // Calculate summary statistics
    const summary = {
      total_pending: 0,
      by_category: {} as Record<string, number>,
      high_confidence: 0,
      medium_confidence: 0,
      low_confidence: 0
    };

    suggestions.forEach((s: any) => {
      if (s.status === 'pending') {
        summary.total_pending++;
      }

      // Count by category
      summary.by_category[s.category] = (summary.by_category[s.category] || 0) + 1;

      // Count by confidence
      if (s.confidence_score >= 0.8) {
        summary.high_confidence++;
      } else if (s.confidence_score >= 0.5) {
        summary.medium_confidence++;
      } else {
        summary.low_confidence++;
      }
    });

    const response: AISuggestionsResponse = {
      suggestions: suggestions as any[],
      summary
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching AI suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI suggestions', details: error.message },
      { status: 500 }
    );
  }
}
