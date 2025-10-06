/**
 * AI Text-Based Document Extractor
 * Uses Claude (Anthropic) to extract structured data from text
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface GPTExtractionResult {
  success: boolean;
  method: 'claude_text';
  confidence: number;
  parcels: Array<{
    parcel_number: number;
    lot_sizes: string[];
    total_lots: number;
    gross_area_acres: number;
    density: number;
    open_space_acres: number;
    open_space_pct: number;
  }>;
  development_standards: {
    min_lot_area_sf?: number;
    min_lot_width_ft?: number;
    setback_front_ft?: string;
    setback_side_ft?: string;
    setback_rear_ft?: string;
    max_height_ft?: number;
    lot_coverage_pct?: string;
  };
  totals: {
    total_lots: number;
    total_acres: number;
    avg_density: number;
    total_open_space: number;
  };
  error?: string;
}

/**
 * Extract structured data from text using Claude
 */
export async function extractTablesWithGPT4(text: string): Promise<GPTExtractionResult> {
  try {
    console.log('🔍 Starting Claude text extraction...');

    const prompt = `You are analyzing text extracted from a preliminary plat document. Extract ALL tables and return structured JSON data.

**EXTRACTED TEXT:**
${text.substring(0, 15000)}

**INSTRUCTIONS:**
1. Find the "Parcel Data" table - look for parcels with lot sizes, yield, acres, density, open space
2. Find the "Development Standards" table - look for setbacks, lot dimensions, coverage
3. Extract EVERY parcel row (typically 5-8 parcels)
4. The TOTAL row shows the CUMULATIVE values across ALL parcels
5. If you see "544 lots" or similar large numbers, that's the TOTAL - use it
6. Return ONLY valid JSON - no markdown, no explanation

**REQUIRED JSON FORMAT:**
{
  "parcels": [
    {
      "parcel_number": 1,
      "lot_sizes": ["42' x 120'", "55' x 120'"],
      "total_lots": 83,
      "gross_area_acres": 20.19,
      "density": 4.11,
      "open_space_acres": 4.68,
      "open_space_pct": 23
    }
  ],
  "totals": {
    "total_lots": 544,
    "total_acres": 164.34,
    "avg_density": 3.31,
    "total_open_space": 55.42
  },
  "development_standards": {
    "min_lot_area_sf": 5000,
    "min_lot_width_ft": 42,
    "setback_front_ft": "18'/10'",
    "setback_side_ft": "5' & 5'",
    "setback_rear_ft": "15'",
    "max_height_ft": 30,
    "lot_coverage_pct": "55% 1S/50% 2S"
  }
}

CRITICAL: Extract ALL parcels. Return ONLY the JSON object.`;

    console.log('📤 Sending to Claude...');

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const rawResponse = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('📥 Received response from Claude');

    // Parse JSON response
    let extractedData;
    try {
      const jsonStr = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      extractedData = JSON.parse(jsonStr);
      console.log('✅ Successfully parsed JSON response');
    } catch (parseErr) {
      console.error('Failed to parse JSON:', parseErr);
      console.log('Raw response:', rawResponse.substring(0, 500));
      throw new Error(`Invalid JSON response from Claude`);
    }

    // Calculate confidence
    let confidence = 0.90; // Base confidence for Claude
    if (extractedData.parcels && extractedData.parcels.length >= 5) confidence += 0.03;
    if (extractedData.totals && extractedData.totals.total_lots > 400) confidence += 0.03;
    if (extractedData.development_standards && extractedData.development_standards.setback_front_ft) confidence += 0.04;

    console.log(`✅ Claude extraction complete: ${extractedData.parcels?.length || 0} parcels, ${extractedData.totals?.total_lots || 0} total lots`);

    return {
      success: true,
      method: 'claude_text',
      confidence,
      parcels: extractedData.parcels || [],
      development_standards: extractedData.development_standards || {},
      totals: extractedData.totals || {
        total_lots: 0,
        total_acres: 0,
        avg_density: 0,
        total_open_space: 0,
      },
    };
  } catch (error) {
    console.error('❌ Claude extraction failed:', error);
    return {
      success: false,
      method: 'claude_text',
      confidence: 0,
      parcels: [],
      development_standards: {},
      totals: {
        total_lots: 0,
        total_acres: 0,
        avg_density: 0,
        total_open_space: 0,
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
