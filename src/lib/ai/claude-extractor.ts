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
    maxTokens = 8000,
    schemaProfile = DEFAULT_SCHEMA_PROFILE
  } = options;

  console.log('🤖 Calling Claude with PDF document (beta API)...');
  console.log(`   File: ${fileName}`);
  console.log(`   Size: ${pdfBuffer.length} bytes`);

  // Convert PDF to base64
  const pdfBase64 = pdfBuffer.toString('base64');

  // Create prompt with schema profile
  const schemaProfileText = JSON.stringify(schemaProfile, null, 2);
  const instructionText = `# Claude Prompt — Landscape DMS Extractor (Unified v2.0)

## SCHEMA_PROFILE

${schemaProfileText}

---

## ROLE & GOAL

You are an extraction agent. Your job is to read the provided PDF document and emit **one strict JSON object** for a Landscape DMS intake queue. Do **not** summarize. Do **not** invent data. If something is missing or ambiguous, omit that field and add a short warning.

Your JSON is staged in \`dms_extract_queue.extracted_data\` and later mapped to normalized Neon tables by a reviewer. Include **page numbers** when available.

---

## EXTRACTION ALGORITHM (PDF-based)

1. **Identify document type**: Preliminary Plat Narrative, Staff Report, Site Plan, Consultant Proposal, etc.
2. **Extract tables**: Look for table structures with headers containing \`Parcel\`, \`Lots\`/\`Units\`, \`Acres\`, \`DU/AC\`, \`Open Space\`
3. **Key-value anchors**: Extract *Project Name, City, County, State, APN, Zoning, General Plan, Utilities, Proposed Density, Total Lots, Open Space*
4. **Parcel×Product association**: Parse lot sizes in format like "42' x 120'" or "42x120" and associate with parcels
5. **Normalization (heuristic, no DB)**:
   - **Zoning & GP**: lowercase/trim/collapse spaces
   - **Utilities**: canonicalize common providers
   - **Lot size**: coerce to integers in feet; accept \`×/x/X\` and \`'\` or \`′\` symbols

---

## AMBIGUITY & ERROR HANDLING

* If a field or cell is unreadable, omit it and add a short \`warnings\` entry
* If parcel counts don't sum to a stated total, keep both and add a warning
* Do not guess values or invent rows
* For parcel×product association: if you cannot reliably determine which lot size belongs to which parcel, set lower confidence (<0.5) and add a warning

---

## OUTPUT FORMAT

Return **exactly one** JSON object with this structure:

\`\`\`json
{
  "mapped": {
    "core_doc": {"doc_name":"","doc_type":"","doc_date":"YYYY-MM-DD"},
    "tbl_project": {"project_name":"","jurisdiction_city":"","jurisdiction_county":"","jurisdiction_state":"","acres_gross":0.0},
    "tbl_phase": [],
    "tbl_parcel": [
      {
        "parcel_id": null,
        "acres_gross": 0.0,
        "units_total": 0,
        "plan_density_du_ac": 0.0,
        "open_space_ac": 0.0,
        "open_space_pct": 0.0,
        "lot_product": "",
        "page": 0
      }
    ],
    "tbl_zoning_control": []
  },
  "unmapped": [],
  "parcel_product_mix": [
    {
      "parcel": 0,
      "width_ft": 0,
      "depth_ft": 0,
      "count": 0,
      "confidence": 0.0,
      "page": 0
    }
  ],
  "utilities": [],
  "approvals": {},
  "doc_assertions": [],
  "warnings": []
}
\`\`\`

---

## DELIVERABLES

Return **only** the single JSON object described above. No prose, no markdown, no commentary before or after the JSON.`;

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
