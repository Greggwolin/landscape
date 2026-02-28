'use server'

import Anthropic from '@anthropic-ai/sdk'

interface ExtractedField {
  value: any
  confidence: number
}

interface ExtractionResult {
  extracted_fields: Record<string, ExtractedField>
  document_type: string
  raw_text_preview?: string
  error?: string
}

const EXTRACTION_PROMPT = `You are a real estate document analyzer. Extract key property information from this document for creating a new project.

Extract the following fields if present (return null for fields not found):
- property_name: The name of the property or project
- street_address: Full street address (number and street name only, not city/state/zip)
- city: City name
- state: US state (2-letter abbreviation preferred)
- zip_code: 5-digit ZIP code (look in address lines, headers, property summary sections)
- county: County name (e.g., "Los Angeles" not "Los Angeles County"). Look for county mentions in headers, location sections, or market analysis. If city is in California (e.g., Torrance, Los Angeles), look up the correct county.
- total_units: Total number of units (for multifamily/residential)
- building_sf: Total building square footage
- site_area: Site/land area (in acres)
- property_subtype: Property type. MUST be one of: MULTIFAMILY, OFFICE, RETAIL, INDUSTRIAL, MIXED_USE, HOTEL, SELF_STORAGE, MPC, INFILL, LOT_DEVELOPMENT, ENTITLED_LAND
- property_class: Property class if mentioned (CLASS_A, CLASS_B, CLASS_C, or CLASS_D). Look for phrases like "Class A", "Class B property", "B-class", etc.
- year_built: Year the property was built
- asking_price: Asking or list price

IMPORTANT for property_subtype detection:
- If document mentions "apartment", "units", "multifamily", "residential rental" -> MULTIFAMILY
- Look for unit counts like "43-unit" or "120 units" which indicate MULTIFAMILY
- If document mentions "warehouse", "distribution", "logistics" -> INDUSTRIAL
- If document mentions "shopping", "strip mall", "retail center" -> RETAIL
- If document mentions "master planned", "master-planned community", "MPC" -> MPC

IMPORTANT for zip_code: Look carefully in:
1. Property address lines (often after city, state)
2. Cover page headers
3. Property summary sections
4. Location/market sections
Even if not on the same line as the street address, find the ZIP code associated with this property.

Also determine the document_type from these options:
- Offering Memorandum
- Rent Roll
- T-12 Operating Statement
- Appraisal
- Property Flyer
- Purchase Agreement
- Due Diligence Report
- Community Master Plan
- Unknown Document

Respond ONLY with valid JSON in this exact format:
{
  "document_type": "string",
  "extracted_fields": {
    "field_name": { "value": "extracted value or null", "confidence": 0.0-1.0 }
  }
}

For confidence scores:
- 0.95+: Exact match found in document
- 0.85-0.94: High confidence inference
- 0.70-0.84: Moderate confidence
- Below 0.70: Low confidence guess

Only include fields where you found actual data. Do not make up values.`

export async function extractDocumentForProject(
  filename: string,
  mimeType: string,
  base64Data: string
): Promise<ExtractionResult> {
  try {
    if (!base64Data || !mimeType) {
      return { extracted_fields: {}, document_type: 'Unknown', error: 'No file data provided' }
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png'
    ]

    if (!allowedTypes.includes(mimeType)) {
      return { extracted_fields: {}, document_type: 'Unknown', error: 'Unsupported file type. Please upload PDF, Word, Excel, or image files.' }
    }

    // base64Data is already base64 encoded from client
    const fileSizeMB = (base64Data.length * 3 / 4) / (1024 * 1024)
    console.log(`[Server Action] Processing file: ${filename}, size: ~${fileSizeMB.toFixed(2)}MB, type: ${mimeType}`)

    if (fileSizeMB > 25) {
      return { extracted_fields: {}, document_type: 'Unknown', error: `File too large (${fileSizeMB.toFixed(1)}MB). Please use a file under 25MB.` }
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicKey) {
      console.warn('ANTHROPIC_API_KEY not set, cannot extract document')
      return { extracted_fields: {}, document_type: 'Unknown', error: 'Document extraction service not configured. Check ANTHROPIC_API_KEY.' }
    }

    // Call Claude for extraction
    const anthropic = new Anthropic({ apiKey: anthropicKey })

    const isImage = mimeType.startsWith('image/')
    const isPdf = mimeType === 'application/pdf'

    if (!isImage && !isPdf) {
      return {
        extracted_fields: {},
        document_type: 'Unsupported Format',
        raw_text_preview: `File "${filename}" is a ${mimeType} file. For best results, please convert to PDF or use image format.`
      }
    }

    const content: Anthropic.MessageCreateParams['messages'][0]['content'] = []

    if (isPdf) {
      content.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: base64Data
        }
      })
    } else {
      const mediaType = mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: base64Data
        }
      })
    }

    content.push({
      type: 'text',
      text: `Filename: ${filename}\n\n${EXTRACTION_PROMPT}`
    })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content }]
    })

    const textContent = response.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return { extracted_fields: {}, document_type: 'Unknown', error: 'No text response from Claude' }
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('Claude response (no JSON found):', textContent.text)
      return { extracted_fields: {}, document_type: 'Unknown', error: 'Could not parse extraction response' }
    }

    const parsed = JSON.parse(jsonMatch[0])

    return {
      extracted_fields: parsed.extracted_fields || {},
      document_type: parsed.document_type || 'Unknown Document',
      raw_text_preview: `Extracted from ${filename} using AI analysis`
    }

  } catch (error) {
    console.error('Server Action extraction error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorDetail = error instanceof Error && 'status' in error
      ? ` (status: ${(error as { status?: number }).status})`
      : ''
    return { extracted_fields: {}, document_type: 'Unknown', error: `Failed to extract document: ${errorMessage}${errorDetail}` }
  }
}
