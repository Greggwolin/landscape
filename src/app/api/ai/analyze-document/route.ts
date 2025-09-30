import { NextRequest, NextResponse } from 'next/server';

export interface DocumentAnalysisResult {
  success: boolean;
  filename: string;
  document_type: 'site_plan' | 'pricing_sheet' | 'regulation_summary' | 'legal_document' | 'survey' | 'unknown';
  readability: {
    can_read: boolean;
    confidence: number;
    format_supported: boolean;
    text_quality: 'excellent' | 'good' | 'fair' | 'poor';
  };
  extracted_data: {
    location: {
      addresses: string[];
      coordinates?: { latitude: number; longitude: number };
      legal_descriptions: string[];
      confidence: number;
    };
    parcels: {
      parcel_numbers: string[];
      assessor_ids: string[];
      confidence: number;
    };
    land_area: {
      total_acres?: number;
      individual_parcels: Array<{
        parcel_id: string;
        acres: number;
        land_use?: string;
      }>;
      confidence: number;
    };
    development_data?: {
      units_planned?: number;
      land_uses: string[];
      phases: string[];
      confidence: number;
    };
  };
  field_mappings: Array<{
    source_text: string;
    suggested_field: string;
    suggested_value: string;
    confidence: number;
    user_confirmable: boolean;
  }>;
  processing_notes: string[];
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;
    const userChoice = formData.get('userChoice') as string;

    if (!file) {
      return NextResponse.json({
        error: 'No file provided'
      }, { status: 400 });
    }

    // Validate file type and size
    const supportedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/tiff',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    const maxSize = 50 * 1024 * 1024; // 50MB limit

    if (!supportedTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: `Unsupported file type: ${file.type}`,
        filename: file.name,
        readability: {
          can_read: false,
          confidence: 0,
          format_supported: false,
          text_quality: 'poor' as const
        }
      }, { status: 400 });
    }

    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: `File too large: ${Math.round(file.size / 1024 / 1024)}MB (max 50MB)`,
        filename: file.name
      }, { status: 400 });
    }

    // Determine document type from filename and content
    const documentType = determineDocumentType(file.name, file.type);

    // Simulate AI document analysis
    const analysisResult = await simulateDocumentAnalysis(file, documentType, projectId);

    return NextResponse.json(analysisResult);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Document analysis error:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to analyze document',
      details: message
    }, { status: 500 });
  }
}

function determineDocumentType(filename: string, mimeType: string): DocumentAnalysisResult['document_type'] {
  const lower = filename.toLowerCase();

  if (lower.includes('site') && (lower.includes('plan') || lower.includes('plat'))) {
    return 'site_plan';
  }
  if (lower.includes('pricing') || lower.includes('price') || lower.includes('cost')) {
    return 'pricing_sheet';
  }
  if (lower.includes('regulation') || lower.includes('code') || lower.includes('zoning')) {
    return 'regulation_summary';
  }
  if (lower.includes('legal') || lower.includes('deed') || lower.includes('title')) {
    return 'legal_document';
  }
  if (lower.includes('survey') || lower.includes('boundary')) {
    return 'survey';
  }

  return 'unknown';
}

async function simulateDocumentAnalysis(
  file: File,
  documentType: DocumentAnalysisResult['document_type'],
  projectId: string
): Promise<DocumentAnalysisResult> {
  // Simulate realistic processing time for comprehensive analysis
  await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 4000));

  // Enhanced mock analysis with comprehensive information extraction
  const baseResult: DocumentAnalysisResult = {
    success: true,
    filename: file.name,
    document_type: documentType,
    readability: {
      can_read: true,
      confidence: 0.85 + Math.random() * 0.15,
      format_supported: true,
      text_quality: 'good'
    },
    extracted_data: {
      location: {
        addresses: [],
        legal_descriptions: [],
        confidence: 0.9
      },
      parcels: {
        parcel_numbers: [],
        assessor_ids: [],
        confidence: 0.85
      },
      land_area: {
        individual_parcels: [],
        confidence: 0.8
      }
    },
    field_mappings: [],
    processing_notes: []
  };

  // Customize based on document type
  switch (documentType) {
    case 'site_plan':
      return {
        ...baseResult,
        extracted_data: {
          ...baseResult.extracted_data,
          location: {
            addresses: [
              '8425 W Farrell Road, Maricopa, AZ 85139',
              'SW Corner of Farrell Road and Anderson Road',
              'Section 15, T4S, R8E'
            ],
            coordinates: { latitude: 33.0581, longitude: -111.8983 },
            legal_descriptions: [
              'A portion of Section 15, Township 4 South, Range 8 East, Gila and Salt River Meridian, Pinal County, Arizona',
              'The North Half of the Southwest Quarter of Section 15'
            ],
            confidence: 0.94
          },
          parcels: {
            parcel_numbers: ['507-12-015A', '507-12-015B', '507-12-016C'],
            assessor_ids: ['50712015A', '50712015B', '50712016C'],
            confidence: 0.89
          },
          land_area: {
            total_acres: 142.7,
            individual_parcels: [
              { parcel_id: 'Parcel A', acres: 28.4, land_use: 'Single Family Residential' },
              { parcel_id: 'Parcel B', acres: 35.2, land_use: 'Single Family Residential' },
              { parcel_id: 'Parcel C', acres: 18.7, land_use: 'Multi Family Residential' },
              { parcel_id: 'Parcel D', acres: 22.1, land_use: 'Commercial' },
              { parcel_id: 'Parcel E', acres: 15.3, land_use: 'Open Space/Recreation' },
              { parcel_id: 'Parcel F', acres: 12.8, land_use: 'Civic/Institutional' },
              { parcel_id: 'Parcel G', acres: 10.2, land_use: 'Mixed Use' }
            ],
            confidence: 0.96
          },
          development_data: {
            units_planned: 348,
            land_uses: [
              'Single Family Residential',
              'Multi Family Residential',
              'Commercial',
              'Mixed Use',
              'Open Space/Recreation',
              'Civic/Institutional'
            ],
            phases: ['Phase I', 'Phase II', 'Phase III'],
            confidence: 0.91
          }
        },
        field_mappings: [
          {
            source_text: 'Farrell Ranch Master Planned Community',
            suggested_field: 'project_name',
            suggested_value: 'Farrell Ranch MPC',
            confidence: 0.97,
            user_confirmable: true
          },
          {
            source_text: 'Total Project Area: 142.7 Gross Acres',
            suggested_field: 'acres_gross',
            suggested_value: '142.7',
            confidence: 0.98,
            user_confirmable: true
          },
          {
            source_text: 'Pinal County, Arizona',
            suggested_field: 'jurisdiction_county',
            suggested_value: 'Pinal',
            confidence: 0.99,
            user_confirmable: true
          },
          {
            source_text: 'City of Maricopa Development Area',
            suggested_field: 'jurisdiction_city',
            suggested_value: 'Maricopa',
            confidence: 0.95,
            user_confirmable: true
          },
          {
            source_text: 'Developer: ABC Development Partners, LLC',
            suggested_field: 'legal_owner',
            suggested_value: 'ABC Development Partners, LLC',
            confidence: 0.93,
            user_confirmable: true
          },
          {
            source_text: 'Total Planned Units: 348 Dwelling Units',
            suggested_field: 'units_planned',
            suggested_value: '348',
            confidence: 0.96,
            user_confirmable: true
          },
          {
            source_text: 'Project Manager: Sarah Mitchell, PE',
            suggested_field: 'project_manager',
            suggested_value: 'Sarah Mitchell, PE',
            confidence: 0.89,
            user_confirmable: true
          }
        ],
        processing_notes: [
          'Successfully extracted comprehensive site plan data',
          'Identified 7 distinct land use parcels with specific acreages',
          'Found detailed development program: 348 units across 3 phases',
          'Extracted legal descriptions and precise location coordinates',
          'Identified key project stakeholders and contact information',
          'Found regulatory context: Pinal County with City of Maricopa jurisdiction'
        ]
      };

    case 'pricing_sheet':
      return {
        ...baseResult,
        extracted_data: {
          ...baseResult.extracted_data,
          land_area: {
            individual_parcels: [
              { parcel_id: '1.101', acres: 0.25, land_use: 'SFR' },
              { parcel_id: '1.102', acres: 0.30, land_use: 'SFR' }
            ],
            confidence: 0.9
          },
          development_data: {
            units_planned: 85,
            land_uses: ['Single Family Residential'],
            phases: ['Phase 1'],
            confidence: 0.85
          }
        },
        field_mappings: [
          {
            source_text: 'Base Price: $450,000',
            suggested_field: 'base_price',
            suggested_value: '450000',
            confidence: 0.95,
            user_confirmable: true
          },
          {
            source_text: 'Lot Premium: $25,000',
            suggested_field: 'lot_premium',
            suggested_value: '25000',
            confidence: 0.92,
            user_confirmable: true
          }
        ],
        processing_notes: [
          'Extracted pricing data for 85 units',
          'Found lot premiums by parcel type'
        ]
      };

    case 'legal_document':
      return {
        ...baseResult,
        extracted_data: {
          ...baseResult.extracted_data,
          location: {
            addresses: ['Parcel 507-12-015, Maricopa County, AZ'],
            legal_descriptions: [
              'The North Half of Section 15, Township 4 South, Range 8 East, Gila and Salt River Meridian'
            ],
            confidence: 0.95
          },
          parcels: {
            parcel_numbers: ['507-12-015'],
            assessor_ids: ['50712015'],
            confidence: 0.98
          },
          land_area: {
            total_acres: 25.4,
            individual_parcels: [],
            confidence: 0.92
          }
        },
        field_mappings: [
          {
            source_text: 'Legal Owner: ABC Development LLC',
            suggested_field: 'legal_owner',
            suggested_value: 'ABC Development LLC',
            confidence: 0.99,
            user_confirmable: true
          }
        ],
        processing_notes: [
          'Extracted legal description and ownership information',
          'Found assessor parcel number for boundary reference'
        ]
      };

    default:
      return {
        ...baseResult,
        readability: {
          can_read: true,
          confidence: 0.7,
          format_supported: true,
          text_quality: 'fair'
        },
        processing_notes: [
          'Document type not specifically recognized',
          'Performed general text extraction'
        ]
      };
  }
}