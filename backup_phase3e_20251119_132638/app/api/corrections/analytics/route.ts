// API Route: GET /api/corrections/analytics
// Purpose: Get correction analytics for training dashboard

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get total corrections and extractions
    const summaryResults = await sql`
      SELECT
        COUNT(DISTINCT acl.id) as total_corrections,
        COUNT(DISTINCT acl.extraction_result_id) as total_extractions
      FROM landscape.ai_correction_log acl
      WHERE acl.created_at >= ${startDate.toISOString()}
    `;

    const totalCorrections = parseInt(summaryResults[0]?.total_corrections as string || '0');
    const totalExtractions = parseInt(summaryResults[0]?.total_extractions as string || '0');
    const correctionRate = totalExtractions > 0 ? totalCorrections / totalExtractions : 0;

    // Get accuracy trend (by day)
    const trendResults = await sql`
      SELECT
        DATE(acl.created_at) as date,
        COUNT(DISTINCT acl.extraction_result_id) as extractions,
        COUNT(acl.id) as corrections
      FROM landscape.ai_correction_log acl
      WHERE acl.created_at >= ${startDate.toISOString()}
      GROUP BY DATE(acl.created_at)
      ORDER BY date ASC
    `;

    const accuracyTrend = trendResults.map(row => {
      const corrections = parseInt(row.corrections as string);
      const extractions = parseInt(row.extractions as string);
      // Assume 20 fields per extraction on average
      const accuracy = extractions > 0 ? 1 - (corrections / (extractions * 20)) : 1.0;

      return {
        date: row.date,
        accuracy: Math.max(0, Math.min(1, accuracy)),
        extractions,
        corrections,
      };
    });

    // Get top corrected fields
    const topFieldsResults = await sql`
      SELECT
        field_path,
        COUNT(*) as correction_count,
        AVG(ai_confidence) as avg_ai_confidence,
        correction_type
      FROM landscape.ai_correction_log
      WHERE created_at >= ${startDate.toISOString()}
      GROUP BY field_path, correction_type
      ORDER BY correction_count DESC
      LIMIT 10
    `;

    const topCorrectedFields = topFieldsResults.map(row => {
      const correctionCount = parseInt(row.correction_count as string);
      const avgConfidence = parseFloat(row.avg_ai_confidence as string || '0');

      // Generate pattern and recommendation based on correction type
      let pattern = '';
      let recommendation = '';

      if (row.correction_type === 'ocr_error') {
        pattern = 'OCR misread numbers or special characters';
        recommendation = 'Improve OCR preprocessing or use higher quality scans';
      } else if (row.correction_type === 'field_missed') {
        pattern = 'AI failed to detect field in document';
        recommendation = 'Review table detection logic and add more training examples';
      } else if (row.correction_type === 'wrong_table') {
        pattern = 'AI extracted from wrong table/section';
        recommendation = 'Improve section detection and table classification';
      } else {
        pattern = 'Value extraction error';
        recommendation = 'Review extraction logic for this field type';
      }

      return {
        field: row.field_path as string,
        correction_count: correctionCount,
        avg_ai_confidence: avgConfidence,
        pattern,
        recommendation,
      };
    });

    // Get correction types breakdown
    const correctionTypesResults = await sql`
      SELECT
        correction_type as type,
        COUNT(*) as count
      FROM landscape.ai_correction_log
      WHERE created_at >= ${startDate.toISOString()}
      GROUP BY correction_type
      ORDER BY count DESC
    `;

    const correctionTypes = correctionTypesResults.map(row => ({
      type: row.type as string,
      count: parseInt(row.count as string),
      percentage: totalCorrections > 0
        ? (parseInt(row.count as string) / totalCorrections) * 100
        : 0,
    }));

    return NextResponse.json({
      period: `${days} days`,
      total_corrections: totalCorrections,
      total_extractions: totalExtractions,
      correction_rate: correctionRate,
      top_corrected_fields: topCorrectedFields,
      accuracy_trend: accuracyTrend,
      correction_types: correctionTypes,
    });

  } catch (error) {
    console.error('Error fetching correction analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch correction analytics' },
      { status: 500 }
    );
  }
}
