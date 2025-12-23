/**
 * Claude Unified Extractor Service
 *
 * Calls Claude AI with the v2.0 unified extraction prompt
 * and returns structured extraction results.
 */

import Anthropic from '@anthropic-ai/sdk';
import { generateUnifiedPrompt, parseUnifiedExtractionResult, DEFAULT_SCHEMA_PROFILE } from './unified-extractor';
import type { UnifiedExtractionResult, SchemaProfile } from './unified-extractor';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface ClaudeExtractionOptions {
  temperature?: number;
  maxTokens?: number;
  schemaProfile?: SchemaProfile;
}

/**
 * Extract structured data from document text using Claude
 */
export async function extractWithClaude(
  documentText: string,
  options: ClaudeExtractionOptions = {}
): Promise<UnifiedExtractionResult> {
  const {
    temperature = 0,
    maxTokens = 8000,
    schemaProfile = DEFAULT_SCHEMA_PROFILE
  } = options;

  console.log('🤖 Calling Claude with unified extraction prompt...');
  console.log(`   Document text length: ${documentText.length} chars`);
  console.log(`   Temperature: ${temperature}`);
  console.log(`   Max tokens: ${maxTokens}`);

  // Generate the unified prompt
  const prompt = generateUnifiedPrompt(documentText, schemaProfile);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: maxTokens,
      temperature,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract text from response
    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('\n');

    console.log('✅ Claude response received');
    console.log(`   Response length: ${responseText.length} chars`);
    console.log(`   Stop reason: ${message.stop_reason}`);

    // Parse the JSON response
    const result = parseUnifiedExtractionResult(responseText);

    console.log('✅ JSON parsed successfully');
    console.log(`   Parcels extracted: ${result.mapped.tbl_parcel.length}`);
    console.log(`   Unmapped fields: ${result.unmapped.length}`);
    console.log(`   Assertions: ${result.doc_assertions.length}`);
    console.log(`   Warnings: ${result.warnings.length}`);

    return result;
  } catch (error) {
    console.error('❌ Claude extraction error:', error);

    if (error instanceof Anthropic.APIError) {
      throw new Error(`Claude API error (${error.status}): ${error.message}`);
    }

    throw error;
  }
}

/**
 * Extract from PDF file buffer using Claude with PDF beta
 */
export async function extractFromPDFWithClaude(
  pdfBuffer: Buffer,
  fileName: string,
  options: ClaudeExtractionOptions = {}
): Promise<UnifiedExtractionResult> {
  const {
    temperature = 0,
    maxTokens = 16000, // Increased for comprehensive multi-page extraction
    schemaProfile = DEFAULT_SCHEMA_PROFILE
  } = options;

  console.log('🤖 Calling Claude with PDF document (beta API)...');
  console.log(`   File: ${fileName}`);
  console.log(`   Size: ${pdfBuffer.length} bytes`);

  // Convert PDF to base64
  const pdfBase64 = pdfBuffer.toString('base64');

  // Create comprehensive extraction prompt for all document types
  const instructionText = `# Claude Prompt — Landscape DMS Universal Extractor v3.0

## ROLE & GOAL

You are an extraction agent for real estate documents. Your job is to read the ENTIRE PDF document (all pages) and emit **one strict JSON object** with ALL extractable data. Do **not** summarize. Do **not** invent data. Extract every field you can find with high confidence.

---

## DOCUMENT TYPES SUPPORTED

1. **Offering Memorandums (OMs)** - Investment sale packages for multifamily, office, retail, industrial
2. **Preliminary Plat Narratives** - Land development documents
3. **Staff Reports** - Municipal review documents
4. **Rent Rolls** - Tenant and rent data
5. **Operating Statements** - Income/expense reports
6. **Appraisals** - Valuation reports

---

## EXTRACTION ALGORITHM (PDF-based)

### For ALL Documents:
1. Read EVERY page of the document (not just the first few pages)
2. Look for the **Executive Summary** or **Property Summary** pages first - these contain key data
3. Extract property name, address, city, state, zip
4. Extract total units/SF, year built, lot size

### For Multifamily OMs:
- **Property Info**: name, address, city, state, zip, county, year_built, total_units, rentable_sf, lot_size_acres
- **Unit Mix**: For each unit type: beds, baths, unit_sf, count, market_rent, in_place_rent
- **Financials**: asking_price, price_per_unit, price_per_sf, cap_rate, noi, goi, effective_gross_income
- **Operating Expenses**: by category (insurance, taxes, utilities, repairs, management, etc.)
- **Occupancy**: physical_occupancy, economic_occupancy, vacancy_rate

### For Land Development:
- **Project Info**: project_name, city, county, state, total_acres, net_acres
- **Parcels**: For each parcel: acres, units, density, lot_sizes
- **Zoning**: zoning_code, allowed_uses, density_limits

---

## AMBIGUITY & ERROR HANDLING

* If a field is unreadable, omit it and add a warning
* If numbers don't reconcile, keep both and add a warning
* Do NOT guess or invent values
* Set confidence < 0.5 for uncertain extractions

---

## OUTPUT FORMAT

Return **exactly one** JSON object:

\`\`\`json
{
  "mapped": {
    "core_doc": {
      "doc_name": "",
      "doc_type": "Offering Memorandum | Rent Roll | Staff Report | etc",
      "doc_date": "YYYY-MM-DD"
    },
    "tbl_project": {
      "project_name": "",
      "property_name": "",
      "address": "",
      "city": "",
      "state": "",
      "zip": "",
      "county": "",
      "year_built": 0,
      "total_units": 0,
      "rentable_sf": 0,
      "lot_size_acres": 0,
      "asking_price": 0,
      "price_per_unit": 0,
      "price_per_sf": 0,
      "cap_rate": 0.0,
      "noi": 0,
      "goi": 0,
      "effective_gross_income": 0,
      "physical_occupancy": 0.0,
      "economic_occupancy": 0.0,
      "vacancy_rate": 0.0,
      "acres_gross": 0.0,
      "jurisdiction_city": "",
      "jurisdiction_county": "",
      "jurisdiction_state": ""
    },
    "tbl_phase": [],
    "tbl_parcel": [],
    "tbl_zoning_control": [],
    "unit_mix": [
      {
        "unit_type": "1BR/1BA",
        "beds": 1,
        "baths": 1,
        "unit_sf": 0,
        "count": 0,
        "market_rent": 0,
        "in_place_rent": 0,
        "page": 0
      }
    ],
    "operating_expenses": [
      {
        "category": "Insurance | Taxes | Utilities | Repairs | Management | etc",
        "annual_amount": 0,
        "per_unit": 0,
        "page": 0
      }
    ]
  },
  "unmapped": [
    {
      "key": "field_name",
      "value": "extracted_value",
      "target_table_candidates": ["tbl_project"],
      "page": 0
    }
  ],
  "parcel_product_mix": [],
  "utilities": [],
  "approvals": {},
  "doc_assertions": [
    {
      "subject_type": "project",
      "metric_key": "total_units",
      "value_num": 0,
      "confidence": 0.95,
      "source": "table",
      "page": 0
    }
  ],
  "warnings": []
}
\`\`\`

---

## CRITICAL INSTRUCTIONS

1. **READ ALL PAGES** - Do not stop at page 1-2. OMs typically have 30-50 pages.
2. **Find the Property Summary** - Usually pages 3-10 contain the key data
3. **Extract Unit Mix tables** - Look for tables with Beds, Baths, SF, Units, Rent columns
4. **Extract Operating Expenses** - Look for T-12 or pro forma operating statements
5. **Include page numbers** for each extraction to help verification

---

## DELIVERABLES

Return **only** the JSON object. No prose, no markdown code blocks, no commentary.`;


  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: maxTokens,
      temperature,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64
              }
            },
            {
              type: 'text',
              text: instructionText
            }
          ]
        }
      ]
    });

    // Extract text from response
    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('\n');

    console.log('✅ Claude PDF response received');
    console.log(`   Response length: ${responseText.length} chars`);
    console.log(`   Stop reason: ${message.stop_reason}`);

    // Parse the JSON response
    const result = parseUnifiedExtractionResult(responseText);

    console.log('✅ JSON parsed successfully');
    console.log(`   Parcels extracted: ${result.mapped.tbl_parcel.length}`);
    console.log(`   Unmapped fields: ${result.unmapped.length}`);
    console.log(`   Assertions: ${result.doc_assertions.length}`);
    console.log(`   Warnings: ${result.warnings.length}`);

    return result;
  } catch (error) {
    console.error('❌ Claude PDF extraction error:', error);

    if (error instanceof Anthropic.APIError) {
      throw new Error(`Claude API error (${error.status}): ${error.message}`);
    }

    throw error;
  }
}

/**
 * Validate extraction result quality
 */
export function validateExtractionResult(result: UnifiedExtractionResult): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for required project fields
  if (!result.mapped.tbl_project.project_name) {
    warnings.push('Missing project_name');
  }
  if (!result.mapped.tbl_project.acres_gross) {
    warnings.push('Missing acres_gross');
  }

  // Check parcel data consistency
  if (result.mapped.tbl_parcel.length > 0) {
    const totalUnits = result.mapped.tbl_parcel.reduce(
      (sum, p) => sum + (p.units_total || 0),
      0
    );
    const totalAcres = result.mapped.tbl_parcel.reduce(
      (sum, p) => sum + (p.acres_gross || 0),
      0
    );

    if (totalUnits === 0) {
      warnings.push('No units found in parcel data');
    }
    if (totalAcres === 0) {
      warnings.push('No acreage found in parcel data');
    }

    // Check if totals match project-level data
    if (
      result.mapped.tbl_project.acres_gross &&
      Math.abs(totalAcres - result.mapped.tbl_project.acres_gross) > 1
    ) {
      warnings.push(
        `Parcel acres (${totalAcres}) don't match project acres (${result.mapped.tbl_project.acres_gross})`
      );
    }
  } else {
    warnings.push('No parcel data extracted');
  }

  // Check for low-confidence parcel products
  result.parcel_product_mix.forEach((product) => {
    if (product.confidence < 0.5) {
      warnings.push(
        `Low confidence (${product.confidence}) for parcel ${product.parcel} lot product ${product.width_ft}x${product.depth_ft}`
      );
    }
  });

  // Include extraction warnings
  warnings.push(...result.warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
