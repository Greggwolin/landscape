/**
 * GPT-4 Vision Document Extractor
 * Uses OpenAI's vision API to extract structured data from PDFs and images
 */

import OpenAI from 'openai';
import { fromPath } from 'pdf2pic';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ParcelData {
  parcel_number: number;
  lot_sizes: string[];
  total_lots: number;
  gross_area_acres: number;
  density: number;
  open_space_acres: number;
  open_space_pct: number;
}

interface DevelopmentStandards {
  min_lot_area_sf?: number;
  min_lot_width_ft?: number;
  setback_front_ft?: string;
  setback_side_ft?: string;
  setback_rear_ft?: string;
  max_height_ft?: number;
  lot_coverage_pct?: string;
}

interface VisionExtractionResult {
  success: boolean;
  method: 'vision';
  confidence: number;
  parcels: ParcelData[];
  development_standards: DevelopmentStandards;
  totals: {
    total_lots: number;
    total_acres: number;
    avg_density: number;
    total_open_space: number;
  };
  raw_response?: string;
  error?: string;
}

/**
 * Convert PDF to images for vision analysis
 */
async function pdfToImages(pdfPath: string): Promise<string[]> {
  const outputDir = path.join('/tmp', `pdf_images_${Date.now()}`);
  fs.mkdirSync(outputDir, { recursive: true });

  const options = {
    density: 200,
    saveFilename: 'page',
    savePath: outputDir,
    format: 'png',
    width: 2000,
    height: 2600,
  };

  const convert = fromPath(pdfPath, options);

  const imagePaths: string[] = [];
  const pageCount = 10; // Process first 10 pages max

  for (let page = 1; page <= pageCount; page++) {
    try {
      const result = await convert(page, { responseType: 'image' });
      if (result.path) {
        imagePaths.push(result.path);
        console.log(`✅ Converted page ${page} to image: ${result.path}`);
      }
    } catch (err) {
      // Stop when we hit the last page
      console.log(`Reached end of PDF at page ${page - 1}`);
      break;
    }
  }

  return imagePaths;
}

/**
 * Encode image to base64 for OpenAI API
 */
function encodeImageToBase64(imagePath: string): string {
  const imageBuffer = fs.readFileSync(imagePath);
  return imageBuffer.toString('base64');
}

/**
 * Extract tables using GPT-4 Vision
 */
export async function extractTablesWithVision(
  pdfPath: string
): Promise<VisionExtractionResult> {
  try {
    console.log('🔍 Starting GPT-4 Vision extraction...');

    // Convert PDF to images
    const imagePaths = await pdfToImages(pdfPath);
    console.log(`📸 Converted ${imagePaths.length} pages to images`);

    if (imagePaths.length === 0) {
      throw new Error('Failed to convert PDF to images');
    }

    // Encode images to base64
    const imageContents = imagePaths.slice(0, 5).map((imgPath) => ({
      type: 'image_url' as const,
      image_url: {
        url: `data:image/png;base64,${encodeImageToBase64(imgPath)}`,
        detail: 'high' as const,
      },
    }));

    // Build structured extraction prompt
    const prompt = `You are analyzing a preliminary plat document for a residential development project. Extract ALL tables and structured data.

**CRITICAL INSTRUCTIONS:**
1. Find the "Parcel Data" table with columns: Parcel, Lot Size, Yield, Gross Area, Density, Open Space
2. Find the "Development Standards" table with setbacks, lot dimensions, coverage
3. Extract EVERY parcel row (typically 5-8 parcels)
4. Pay attention to the TOTAL row which shows cumulative values
5. Return valid JSON only - no markdown, no explanation

**Expected JSON format:**
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

Return ONLY the JSON object. Be thorough - extract ALL parcels you see.`;

    console.log('📤 Sending to GPT-4 Vision...');

    // Call GPT-4 Vision API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // GPT-4 Omni with vision
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: prompt }, ...imageContents],
        },
      ],
      max_tokens: 4000,
      temperature: 0.1, // Low temperature for factual extraction
    });

    const rawResponse = response.choices[0]?.message?.content || '';
    console.log('📥 Received response from GPT-4 Vision');
    console.log('Raw response:', rawResponse);

    // Parse JSON response
    let extractedData;
    try {
      // Remove markdown code blocks if present
      const jsonStr = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      extractedData = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('Failed to parse JSON response:', parseErr);
      throw new Error(`Invalid JSON response: ${rawResponse.substring(0, 200)}`);
    }

    // Cleanup temp images
    imagePaths.forEach((imgPath) => {
      try {
        fs.unlinkSync(imgPath);
      } catch (err) {
        // Ignore cleanup errors
      }
    });

    // Calculate confidence based on data completeness
    let confidence = 0.7;
    if (extractedData.parcels && extractedData.parcels.length >= 5) confidence += 0.1;
    if (extractedData.totals && extractedData.totals.total_lots > 0) confidence += 0.1;
    if (extractedData.development_standards) confidence += 0.1;

    return {
      success: true,
      method: 'vision',
      confidence,
      parcels: extractedData.parcels || [],
      development_standards: extractedData.development_standards || {},
      totals: extractedData.totals || {
        total_lots: 0,
        total_acres: 0,
        avg_density: 0,
        total_open_space: 0,
      },
      raw_response: rawResponse,
    };
  } catch (error) {
    console.error('❌ Vision extraction failed:', error);
    return {
      success: false,
      method: 'vision',
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
