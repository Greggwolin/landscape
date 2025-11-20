/**
 * Unified DMS Document Extraction API
 *
 * This endpoint can be called from anywhere in the DMS to extract structured data
 * from uploaded documents using the GPT-5 unified extraction prompt.
 *
 * Usage:
 *   POST /api/dms/extract-unified
 *   Body: { file: File, schemaProfile?: SchemaProfile }
 *
 * Returns: UnifiedExtractionResult
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/lib/pdf/extractor';
import {
  generateUnifiedPrompt,
  parseUnifiedExtractionResult,
  convertToFieldMappings,
  DEFAULT_SCHEMA_PROFILE,
  type UnifiedExtractionResult,
  type SchemaProfile
} from '@/lib/ai/unified-extractor';

export const maxDuration = 300; // 5 minutes for large PDFs

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const schemaProfileJson = formData.get('schemaProfile') as string | null;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 });
    }

    console.log(`📄 Unified extraction for: ${file.name}`);

    // Parse custom schema profile if provided
    let schemaProfile: SchemaProfile = DEFAULT_SCHEMA_PROFILE;
    if (schemaProfileJson) {
      try {
        schemaProfile = JSON.parse(schemaProfileJson);
        console.log('✓ Using custom schema profile');
      } catch (e) {
        console.warn('Failed to parse custom schema profile, using default');
      }
    }

    // Extract text from PDF
    console.log('📝 Extracting text from PDF...');
    const extractedText = await extractTextFromPDF(file);

    if (!extractedText || extractedText.length < 100) {
      return NextResponse.json({
        success: false,
        error: 'Could not extract sufficient text from PDF'
      }, { status: 400 });
    }

    console.log(`✓ Extracted ${extractedText.length} characters`);

    // Since we don't have AI API access, we'll use a fallback parser
    // This is a placeholder - you can integrate with Claude via your account
    console.log('⚠️  AI API not available - using regex fallback parser');

    const result = await fallbackUnifiedExtraction(extractedText, file.name, schemaProfile);

    console.log(`✅ Extraction complete: ${result.mapped.tbl_parcel.length} parcels, ${result.warnings.length} warnings`);

    return NextResponse.json({
      success: true,
      filename: file.name,
      result,
      field_mappings: convertToFieldMappings(result)
    });

  } catch (error) {
    console.error('Unified extraction error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Fallback extraction using regex patterns
 * This is used when AI APIs are not available
 *
 * TODO: Replace with actual AI call when you have the integration set up
 */
async function fallbackUnifiedExtraction(
  text: string,
  filename: string,
  schemaProfile: SchemaProfile
): Promise<UnifiedExtractionResult> {
  const result: UnifiedExtractionResult = {
    mapped: {
      core_doc: {
        doc_name: filename,
        doc_type: detectDocumentType(text),
        doc_date: extractDate(text)
      },
      tbl_project: {
        project_name: extractProjectName(text),
        jurisdiction_city: extractCity(text, schemaProfile),
        jurisdiction_county: extractCounty(text),
        jurisdiction_state: extractState(text, schemaProfile),
        acres_gross: extractTotalAcres(text)
      },
      tbl_phase: [],
      tbl_parcel: extractParcels(text),
      tbl_zoning_control: extractZoning(text)
    },
    unmapped: [],
    parcel_product_mix: extractParcelProductMix(text),
    utilities: extractUtilities(text, schemaProfile),
    approvals: extractApprovals(text),
    doc_assertions: [],
    warnings: []
  };

  // Validation warnings
  const totalParcelUnits = result.mapped.tbl_parcel.reduce((sum, p) => sum + (p.units_total || 0), 0);
  const totalParcelAcres = result.mapped.tbl_parcel.reduce((sum, p) => sum + (p.acres_gross || 0), 0);

  if (result.mapped.tbl_project.acres_gross && totalParcelAcres > 0) {
    const diff = Math.abs(result.mapped.tbl_project.acres_gross - totalParcelAcres);
    if (diff > 0.1) {
      result.warnings.push(`Parcel acres sum (${totalParcelAcres.toFixed(2)}) differs from project total (${result.mapped.tbl_project.acres_gross.toFixed(2)}) by ${diff.toFixed(2)} ac`);
    }
  }

  // Check parcel×product confidence
  const lowConfidenceProducts = result.parcel_product_mix.filter(p => p.confidence < 0.5);
  if (lowConfidenceProducts.length > 0) {
    result.warnings.push(`${lowConfidenceProducts.length} parcel lot products have low confidence (<50%) - user verification required`);
  }

  return result;
}

// Helper extraction functions (reuse existing regex patterns)

function detectDocumentType(text: string): string {
  if (/preliminary\s+plat/i.test(text)) return 'Preliminary Plat Narrative';
  if (/staff\s+report/i.test(text)) return 'Staff Report';
  if (/site\s+plan/i.test(text)) return 'Site Plan';
  if (/scope\s+of\s+work/i.test(text)) return 'Consultant Proposal';
  return 'Unknown';
}

function extractDate(text: string): string | undefined {
  const datePattern = /(?:date|dated|submitted|approved)[\s:]+([A-Z][a-z]+ \d{1,2},? \d{4})/i;
  const match = text.match(datePattern);
  if (match) {
    try {
      const date = new Date(match[1]);
      return date.toISOString().split('T')[0];
    } catch (e) {
      return undefined;
    }
  }
  return undefined;
}

function extractProjectName(text: string): string | undefined {
  const patterns = [
    /([A-Z][A-Z\s]+(?:RANCH|ESTATES|VILLAGE|COMMUNITY|DEVELOPMENT))/,
    /Project Name[\s:]+([^\n]+)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return undefined;
}

function extractCity(text: string, schema: SchemaProfile): string | undefined {
  for (const city of schema.dvl.jurisdiction_city) {
    const pattern = new RegExp(`\\b${city}\\b`, 'i');
    if (pattern.test(text)) return city;
  }
  return undefined;
}

function extractCounty(text: string): string | undefined {
  const match = text.match(/([A-Z][a-z]+)\s+County/i);
  return match ? match[1] : undefined;
}

function extractState(text: string, schema: SchemaProfile): string | undefined {
  for (const state of schema.dvl.jurisdiction_state) {
    const pattern = new RegExp(`\\b${state}\\b`, 'i');
    if (pattern.test(text)) return state;
  }
  return undefined;
}

function extractTotalAcres(text: string): number | undefined {
  // Look for "X acres" or "X ac" in context
  const patterns = [
    /total.*?([0-9.]+)\s*(?:acres|ac)\b/i,
    /([0-9.]+)\s*(?:acres|ac).*?total/i,
    /comprises.*?([0-9.]+)\s*(?:acres|ac)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const acres = parseFloat(match[1]);
      if (acres > 10 && acres < 10000) return acres; // Sanity check
    }
  }
  return undefined;
}

function extractParcels(text: string): any[] {
  const parcels: any[] = [];

  // Pattern: "X lots Y ac Z du/ac W ac N%"
  const parcelPattern = /(\d+)\s+lots?\s+([0-9.]+)\s+ac\s+([0-9.]+)\s+du\/ac\s+([0-9.]+)\s+ac\s+(\d+)%/gi;
  const matches = text.matchAll(parcelPattern);

  let parcelIndex = 1;
  for (const match of matches) {
    const lots = parseInt(match[1]);
    if (lots >= 500) continue; // Skip totals row

    parcels.push({
      parcel_id: parcelIndex.toString(),
      units_total: lots,
      acres_gross: parseFloat(match[2]),
      plan_density_du_ac: parseFloat(match[3]),
      open_space_ac: parseFloat(match[4]),
      open_space_pct: parseInt(match[5])
    });

    parcelIndex++;
  }

  return parcels;
}

function extractParcelProductMix(text: string): any[] {
  const products: any[] = [];

  // Extract all lot sizes
  const lotSizePattern = /(\d+)['']?\s*[x×]\s*(\d+)['']?/gi;
  const lotSizes: Array<{width: number, depth: number}> = [];

  let match;
  while ((match = lotSizePattern.exec(text)) !== null) {
    lotSizes.push({
      width: parseInt(match[1]),
      depth: parseInt(match[2])
    });
  }

  // Get unique lot sizes
  const uniqueSizes = Array.from(
    new Set(lotSizes.map(ls => `${ls.width}x${ls.depth}`))
  ).map(s => {
    const [w, d] = s.split('x').map(Number);
    return { width: w, depth: d };
  });

  console.log(`Found ${uniqueSizes.length} unique lot sizes:`, uniqueSizes.map(s => `${s.width}x${s.depth}`).join(', '));

  // Extract parcels
  const parcels = extractParcels(text);

  // If we have multiple unique lot sizes and can't reliably associate them,
  // set low confidence and ask user
  if (uniqueSizes.length > 1) {
    console.warn(`Multiple lot sizes found - cannot reliably associate with parcels`);

    parcels.forEach((parcel, idx) => {
      // Add all possible lot sizes with low confidence
      uniqueSizes.forEach(size => {
        products.push({
          parcel: parcel.parcel_id || (idx + 1),
          width_ft: size.width,
          depth_ft: size.depth,
          count: 0, // Unknown
          confidence: 0.30 // Low - requires user verification
        });
      });
    });
  } else if (uniqueSizes.length === 1) {
    // Single lot size - high confidence
    parcels.forEach((parcel, idx) => {
      products.push({
        parcel: parcel.parcel_id || (idx + 1),
        width_ft: uniqueSizes[0].width,
        depth_ft: uniqueSizes[0].depth,
        count: parcel.units_total || 0,
        confidence: 0.90
      });
    });
  }

  return products;
}

function extractZoning(text: string): any[] {
  const zoning: any[] = [];

  const zoningPattern = /(?:zoning|zoned)[\s:]+([A-Z0-9-]+)/i;
  const match = text.match(zoningPattern);

  if (match) {
    zoning.push({
      zoning_code: match[1].trim()
    });
  }

  return zoning;
}

function extractUtilities(text: string, schema: SchemaProfile): any[] {
  const utilities: any[] = [];

  for (const utilityType of schema.dvl.utility_types) {
    const pattern = new RegExp(`${utilityType}[^\\n]{0,100}?([A-Z][\\w\\s&.]+(?:District|Department|Authority|Company|Resources))`, 'i');
    const match = text.match(pattern);

    if (match) {
      utilities.push({
        type: {
          raw: utilityType,
          canonical: utilityType
        },
        provider: {
          raw: match[1].trim(),
          canonical: match[1].trim(),
          match_score: 0.80
        }
      });
    }
  }

  return utilities;
}

function extractApprovals(text: string): any {
  const approval: any = {};

  const datePattern = /(?:approved|extension)[\s:]+([A-Z][a-z]+ \d{1,2},? \d{4})/i;
  const match = text.match(datePattern);

  if (match) {
    try {
      const date = new Date(match[1]);
      approval.date = date.toISOString().split('T')[0];
    } catch (e) {
      // Ignore
    }
  }

  return approval;
}
