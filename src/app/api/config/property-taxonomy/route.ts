/**
 * Property Taxonomy API Endpoint
 *
 * Provides the full property taxonomy structure for project classification.
 * Supports filtering by analysis_type query parameter for cascading dropdowns.
 *
 * GET /api/config/property-taxonomy
 * GET /api/config/property-taxonomy?analysis_type=Land Development
 * GET /api/config/property-taxonomy?analysis_type=Income Property
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  PROPERTY_TAXONOMY,
  getSubtypesForAnalysisType,
  isAnalysisType,
  type AnalysisType,
  type PropertyTaxonomy
} from '@/types/project-taxonomy';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const analysisType = searchParams.get('analysis_type');

    // If analysis_type is specified, return filtered subtypes
    if (analysisType) {
      // Validate analysis_type
      if (!isAnalysisType(analysisType)) {
        return NextResponse.json(
          {
            error: 'Invalid analysis_type',
            valid_values: PROPERTY_TAXONOMY.analysis_types
          },
          { status: 400 }
        );
      }

      // Return subtypes for the specified analysis type
      const subtypes = getSubtypesForAnalysisType(analysisType);

      return NextResponse.json({
        analysis_type: analysisType,
        subtypes,
        // Include grouped structure for Income Property
        groups: analysisType === 'Income Property'
          ? PROPERTY_TAXONOMY.income_property_groups
          : null
      });
    }

    // Return full taxonomy structure
    const response: PropertyTaxonomy = PROPERTY_TAXONOMY;

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching property taxonomy:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch property taxonomy',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Optional: Support OPTIONS for CORS if needed
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'GET, OPTIONS',
      'Content-Type': 'application/json'
    }
  });
}
