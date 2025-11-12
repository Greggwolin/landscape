/**
 * Knowledge Ingestion API
 *
 * POST /api/knowledge/ingest
 *
 * Ingest document extraction results into knowledge base
 */

import { NextRequest, NextResponse } from 'next/server';
import { KnowledgeIngestionService } from '@/lib/knowledge/ingestion-service';
import type { ExtractionResult } from '@/lib/knowledge/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { doc_id, project_id, extraction_result } = body;

    if (!doc_id || !project_id || !extraction_result) {
      return NextResponse.json(
        {
          error: 'doc_id, project_id, and extraction_result are required',
        },
        { status: 400 }
      );
    }

    // Validate extraction result structure
    if (
      !extraction_result.property_info ||
      !extraction_result.extraction_metadata ||
      !extraction_result.units ||
      !extraction_result.leases ||
      !extraction_result.unit_types
    ) {
      return NextResponse.json(
        {
          error: 'Invalid extraction_result structure',
          details: 'Missing required fields: property_info, extraction_metadata, units, leases, unit_types',
        },
        { status: 400 }
      );
    }

    // Ingest into knowledge base
    const service = new KnowledgeIngestionService();
    const result = await service.ingestRentRoll(
      doc_id,
      extraction_result as ExtractionResult,
      project_id
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          errors: result.errors,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      property_entity_id: result.property_entity_id,
      units_created: result.units_created,
      unit_types_created: result.unit_types_created,
      lease_facts_created: result.lease_facts_created,
      message: 'Knowledge ingestion completed successfully',
    });
  } catch (error) {
    console.error('Knowledge ingestion error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to ingest knowledge',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
