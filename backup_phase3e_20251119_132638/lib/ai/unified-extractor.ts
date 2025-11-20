/**
 * Unified DMS Document Extractor (v2.0)
 *
 * Schema-aware extraction using the GPT-5 unified prompt.
 * This module is designed to be used anywhere in the DMS for document ingestion.
 *
 * Based on: project-docs/Claude-Unified-Extraction-Prompt-v2.0.md
 */

export interface SchemaProfile {
  tables: {
    core_doc: string[];
    tbl_project: string[];
    tbl_phase: string[];
    tbl_parcel: string[];
    tbl_landuse: string[];
    tbl_zoning_control: string[];
  };
  dvl: {
    jurisdiction_city: string[];
    jurisdiction_state: string[];
    utility_types: string[];
    lot_products_pattern: string;
  };
}

export const DEFAULT_SCHEMA_PROFILE: SchemaProfile = {
  tables: {
    core_doc: ['doc_name', 'doc_type', 'mime_type', 'doc_date'],
    tbl_project: ['project_name', 'jurisdiction_city', 'jurisdiction_county', 'jurisdiction_state', 'acres_gross'],
    tbl_phase: ['phase_id', 'project_id', 'phase_no', 'phase_name', 'label', 'description'],
    tbl_parcel: [
      'parcel_id', 'project_id', 'phase_id', 'acres_gross', 'units_total',
      'plan_density_du_ac', 'open_space_ac', 'open_space_pct', 'lot_width',
      'lot_depth', 'lot_product', 'landuse_code', 'landuse_type'
    ],
    tbl_landuse: ['landuse_code', 'landuse_type', 'name', 'description'],
    tbl_zoning_control: [
      'zoning_code', 'landuse_code', 'site_coverage_pct', 'site_far',
      'max_stories', 'max_height_ft', 'parking_ratio_per1000sf', 'setback_notes'
    ]
  },
  dvl: {
    jurisdiction_city: ['Maricopa', 'Phoenix', 'Mesa', 'Chandler', 'Gilbert', 'Scottsdale', 'Tempe', 'Peoria', 'Surprise', 'Glendale'],
    jurisdiction_state: ['AZ', 'CA', 'NV', 'TX', 'CO'],
    utility_types: ['Water', 'Wastewater', 'Electric', 'Gas'],
    lot_products_pattern: 'NNxNNN (e.g., 42x120; also accepts ×)'
  }
};

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Parcel {
  parcel_id?: string | null;
  phase_id?: string | null;
  acres_gross?: number;
  units_total?: number;
  plan_density_du_ac?: number;
  open_space_ac?: number;
  open_space_pct?: number;
  lot_width?: number;
  lot_depth?: number;
  lot_product?: string;
  landuse_code?: string;
  landuse_type?: string;
  page?: number;
  bbox?: number[];
}

export interface ParcelProductMix {
  parcel: number | string;
  width_ft: number;
  depth_ft: number;
  count: number;
  confidence: number;
  page?: number;
  bbox?: number[];
}

export interface Utility {
  type: {
    raw: string;
    canonical: string;
  };
  provider: {
    raw: string;
    canonical: string;
    match_score: number;
  };
  page?: number;
  bbox?: number[];
}

export interface Approval {
  date?: string;
  body?: string;
  action?: string;
  term_months?: number;
  conditions?: string[];
  page?: number;
}

export interface DocAssertion {
  subject_type: 'project' | 'phase' | 'parcel' | 'product';
  subject_ref?: string;
  metric_key: string;
  value_num?: number;
  value_text?: string | null;
  units?: string;
  context?: 'proposed' | 'approved' | 'as-built' | 'other';
  doc_date?: string;
  page?: number;
  bbox?: number[];
  confidence: number;
  source: 'table' | 'narrative' | 'figure';
}

export interface UnifiedExtractionResult {
  mapped: {
    core_doc: {
      doc_name?: string;
      doc_type?: string;
      mime_type?: string;
      doc_date?: string;
    };
    tbl_project: {
      project_name?: string;
      jurisdiction_city?: string;
      jurisdiction_county?: string;
      jurisdiction_state?: string;
      acres_gross?: number;
    };
    tbl_phase: Array<{
      phase_no?: number | null;
      phase_name?: string | null;
      label?: string | null;
      description?: string | null;
      page?: number;
      bbox?: number[];
    }>;
    tbl_parcel: Parcel[];
    tbl_zoning_control: Array<{
      zoning_code?: string;
      landuse_code?: string | null;
      site_coverage_pct?: number | null;
      site_far?: number | null;
      max_stories?: number | null;
      max_height_ft?: number | null;
      parking_ratio_per1000sf?: number | null;
      setback_notes?: string | null;
      page?: number;
    }>;
  };
  unmapped: Array<{
    key: string;
    value: any;
    target_table_candidates: string[];
    page?: number;
    bbox?: number[];
  }>;
  parcel_product_mix: ParcelProductMix[];
  utilities: Utility[];
  approvals: Approval;
  doc_assertions: DocAssertion[];
  warnings: string[];
}

/**
 * Generate the unified extraction prompt
 */
export function generateUnifiedPrompt(
  extractedText: string,
  schemaProfile: SchemaProfile = DEFAULT_SCHEMA_PROFILE
): string {
  return `# Claude Prompt — Landscape DMS Extractor (Unified v2.0)

## SCHEMA_PROFILE

${JSON.stringify(schemaProfile, null, 2)}

---

## ROLE & GOAL

You are an extraction agent. Your job is to read the provided document text and emit **one strict JSON object** for a Landscape DMS intake queue. Do **not** summarize. Do **not** invent data. If something is missing or ambiguous, omit that field and add a short warning.

Your JSON is staged in \`dms_extract_queue.extracted_data\` and later mapped to normalized Neon tables by a reviewer. Include **page numbers** when available.

---

## EXTRACTION ALGORITHM (text-based)

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

## DOCUMENT TEXT TO ANALYZE

${extractedText}

---

## DELIVERABLES

Return **only** the single JSON object described above. No prose, no markdown, no commentary before or after the JSON.`;
}

/**
 * Parse the unified extraction result from Claude's response
 */
export function parseUnifiedExtractionResult(response: string): UnifiedExtractionResult {
  try {
    // Remove markdown code blocks if present
    let cleanedResponse = response.trim();

    // Remove markdown JSON code blocks
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '').replace(/\s*```\s*$/i, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/i, '').replace(/\s*```\s*$/i, '');
    }

    const result = JSON.parse(cleanedResponse);

    // Validate structure
    if (!result.mapped || !result.unmapped || !result.parcel_product_mix) {
      throw new Error('Invalid extraction result structure');
    }

    return result as UnifiedExtractionResult;
  } catch (error) {
    console.error('Failed to parse unified extraction result:', error);
    console.error('Raw response:', response.substring(0, 500));
    throw new Error(`Failed to parse extraction result: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert unified extraction result to field mappings for the UI
 */
export function convertToFieldMappings(result: UnifiedExtractionResult): Array<{
  source_text: string;
  suggested_field: string;
  suggested_value: string;
  confidence: number;
  user_confirmable: boolean;
}> {
  const mappings: Array<{
    source_text: string;
    suggested_field: string;
    suggested_value: string;
    confidence: number;
    user_confirmable: boolean;
  }> = [];

  // Project fields
  if (result.mapped.tbl_project.project_name) {
    mappings.push({
      source_text: `Project Name: ${result.mapped.tbl_project.project_name}`,
      suggested_field: 'project_name',
      suggested_value: result.mapped.tbl_project.project_name,
      confidence: 0.95,
      user_confirmable: true
    });
  }

  if (result.mapped.tbl_project.acres_gross) {
    mappings.push({
      source_text: `Total Acres: ${result.mapped.tbl_project.acres_gross} ac`,
      suggested_field: 'total_acres',
      suggested_value: result.mapped.tbl_project.acres_gross.toString(),
      confidence: 0.98,
      user_confirmable: true
    });
  }

  if (result.mapped.tbl_project.jurisdiction_city) {
    mappings.push({
      source_text: `City: ${result.mapped.tbl_project.jurisdiction_city}`,
      suggested_field: 'city',
      suggested_value: result.mapped.tbl_project.jurisdiction_city,
      confidence: 0.95,
      user_confirmable: true
    });
  }

  if (result.mapped.tbl_project.jurisdiction_county) {
    mappings.push({
      source_text: `County: ${result.mapped.tbl_project.jurisdiction_county}`,
      suggested_field: 'county',
      suggested_value: result.mapped.tbl_project.jurisdiction_county,
      confidence: 0.95,
      user_confirmable: true
    });
  }

  // Parcel fields
  result.mapped.tbl_parcel.forEach((parcel, index) => {
    const parcelId = parcel.parcel_id || (index + 1).toString();

    if (parcel.units_total !== undefined) {
      mappings.push({
        source_text: `Parcel ${parcelId}: ${parcel.units_total} lots`,
        suggested_field: `parcel_${parcelId}_lots`,
        suggested_value: parcel.units_total.toString(),
        confidence: 0.95,
        user_confirmable: true
      });
    }

    if (parcel.acres_gross !== undefined) {
      mappings.push({
        source_text: `Parcel ${parcelId}: ${parcel.acres_gross} acres`,
        suggested_field: `parcel_${parcelId}_acres`,
        suggested_value: parcel.acres_gross.toString(),
        confidence: 0.95,
        user_confirmable: true
      });
    }

    if (parcel.plan_density_du_ac !== undefined) {
      mappings.push({
        source_text: `Parcel ${parcelId}: ${parcel.plan_density_du_ac} du/ac`,
        suggested_field: `parcel_${parcelId}_density`,
        suggested_value: parcel.plan_density_du_ac.toString(),
        confidence: 0.94,
        user_confirmable: true
      });
    }

    if (parcel.open_space_ac !== undefined) {
      mappings.push({
        source_text: `Parcel ${parcelId}: ${parcel.open_space_ac} ac open space`,
        suggested_field: `parcel_${parcelId}_open_space`,
        suggested_value: parcel.open_space_ac.toString(),
        confidence: 0.93,
        user_confirmable: true
      });
    }
  });

  // Parcel×Product mix
  result.parcel_product_mix.forEach((product) => {
    const parcelId = product.parcel.toString();
    const lotSize = `${product.width_ft}x${product.depth_ft}`;

    // If confidence is low (<0.5), set empty value and ask user
    if (product.confidence < 0.5) {
      mappings.push({
        source_text: `Parcel ${parcelId}: Unable to determine lot product with confidence. Found lot size ${lotSize} in document. Please verify.`,
        suggested_field: `parcel_${parcelId}_lot_product`,
        suggested_value: '',
        confidence: 0.30,
        user_confirmable: true
      });
    } else {
      mappings.push({
        source_text: `Parcel ${parcelId}: Lot size ${lotSize} (${product.count} units, confidence: ${Math.round(product.confidence * 100)}%)`,
        suggested_field: `parcel_${parcelId}_lot_product`,
        suggested_value: lotSize,
        confidence: product.confidence,
        user_confirmable: true
      });
    }
  });

  return mappings;
}
