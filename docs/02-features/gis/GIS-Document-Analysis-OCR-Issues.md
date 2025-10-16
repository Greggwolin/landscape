# GIS Document Analysis - OCR and Table Parsing Issues

## Overview

The GIS Setup Workflow includes an AI-powered document analysis feature that extracts structured data from PDF documents (preliminary plats, site plans, etc.) to auto-populate project fields. This feature uses `pdftotext` for text extraction and regex-based parsing to extract parcel data, lot products, and other project metrics.

## Current Implementation

### Technology Stack

- **PDF Text Extraction**: `pdf-poppler` / `pdftotext` command-line tool
- **Parsing Method**: Regex pattern matching on extracted text
- **AI Fallback**: OpenAI GPT-4o and Anthropic Claude 3.5 Sonnet (both currently out of quota)
- **Database Validation**: DVL (Domain Value List) matching against `landscape.res_lot_product` and `landscape.lu_subtype`

### File Locations

- **Main Analysis Endpoint**: `/src/app/api/ai/analyze-document/route.ts`
- **UI Component**: `/src/app/components/GIS/ProjectDocumentUploads.tsx`
- **DVL Validation Endpoint**: `/src/app/api/ai/validate-field/route.ts`

## Problem: Scrambled PDF Table Extraction

### Issue Description

When extracting text from PDF documents containing tables (e.g., Parcel Data tables), the `pdftotext` tool produces **scrambled text** where table structure is not preserved. Column data appears out of order, making it impossible to reliably associate values with their corresponding rows/parcels.

### Example: Red Valley Ranch Preliminary Plat

**Expected Table Structure:**
```
Parcel | Lot Size    | Yield | Lots | Gross Area | Density  | Open Space
2      | 42' x 120'  | 89    | 89   | 18.81 ac   | 4.73 du/ac | 3.66 ac (19%)
3      | 55' x 125'  | 52    | 52   | 18.66 ac   | 2.79 du/ac | 6.23 ac (33%)
5      | 50' x 120'  | 76    | 76   | 26.59 ac   | 2.86 du/ac | 12.18 ac (46%)
```

**Actual Extracted Text:**
```
Area Density Open Space 83 lots 20.19 ac 4.11 du/ac 4.68 ac 23% 42' x 120' 82 55' x 120' 1 2 42' x 120' 89 89 lots 18.81 ac 4.73 du/ac 3.66 ac 19% 3 55' x 125' 52 52 lots 18.66 ac 2.79 du/ac 6.23 ac 33% 50'
```

### Impact

1. **Cannot reliably extract parcel-specific lot sizes**: All lot sizes found in the document are extracted (42x120, 55x120, 55x125, 50x120), but we cannot determine which lot size belongs to which parcel
2. **Parcel metrics ARE extractable**: We can successfully extract lots, acres, density, open space for each parcel by matching patterns like "89 lots 18.81 ac 4.73 du/ac"
3. **Total values ARE accurate**: The system correctly extracts totals (544 total lots, 164.34 acres) by finding the largest lot count in the document

## Current Workaround

### When Multiple Lot Sizes Detected

When the system finds multiple lot sizes in a document and cannot associate them with specific parcels:

1. **Set empty value** with **30% confidence** (very low - triggers "Ask AI" button)
2. **Display message**: "Unable to determine specific lot product from document. Found these lot sizes in the project: 42x120, 55x120, 55x125, 50x120. Please select the correct lot product for this parcel from the DVL options."
3. **Prompt user** to manually select the correct lot product for each parcel

### DVL Validation

Once the user enters a lot product (e.g., "55x120"), the system validates it against the database:

- **Query**: `SELECT code FROM landscape.res_lot_product WHERE LOWER(code) = ${normalizedValue}`
- **Format normalization**: "42' x 120'" → "42x120" (remove spaces and apostrophes)
- **Match indicator**: Green "DVL Match" badge when value exists in database
- **Suggestions**: When no match found, shows similar products (e.g., "Did you mean: 50x120, 55x120, 42x125?")

## Code Examples

### Lot Size Extraction (Scrambled Table)

```typescript
// Extract all lot sizes from scrambled table text
const lotSizePattern = /(\d+)['']?\s*x\s*(\d+)['']?/gi;
const allLotSizes: string[] = [];
let lotMatch;
while ((lotMatch = lotSizePattern.exec(tableContent)) !== null) {
  const normalized = `${lotMatch[1]}x${lotMatch[2]}`;
  allLotSizes.push(normalized);
}

// Results: ["42x120", "55x120", "55x125", "50x120"]
// But we don't know which parcel each belongs to!
```

### Parcel Metrics Extraction (Works Reliably)

```typescript
// Pattern for parcel stats: "X lots Y ac Z du/ac W ac N%"
const parcelPattern = /(\d+)\s+lots?\s+([0-9.]+)\s+ac\s+([0-9.]+)\s+du\/ac\s+([0-9.]+)\s+ac\s+(\d+)%/gi;

// Successfully extracts:
// Parcel 2: 89 lots, 18.81 ac, 4.73 du/ac, 3.66 ac, 19%
// Parcel 3: 52 lots, 18.66 ac, 2.79 du/ac, 6.23 ac, 33%
```

### Total Lots Extraction (Max Lot Count)

```typescript
// Find ALL lot count patterns in the document
const allLotMatches = text.matchAll(/(\d+)\s+lots?\s+([0-9.]+)\s+ac\s+([0-9.]+)\s+du\/ac/gi);
const matches = Array.from(allLotMatches);

// Find the one with the LARGEST lot count (that's the total)
let maxLots = 0;
for (const match of matches) {
  const lotCount = parseInt(match[1]);
  if (lotCount > maxLots) {
    maxLots = lotCount;
    totalsMatch = match;
  }
}

// Result: 544 lots (correctly identifies total, not individual parcel counts like 89, 52, 76)
```

## Attempted Solutions

### 1. AI Vision APIs (Failed - No Credits)

Attempted to use:
- **OpenAI GPT-4 Vision**: `429 You exceeded your current quota`
- **Anthropic Claude 3.5 Sonnet**: `400 Your credit balance is too low`

Vision APIs could analyze the PDF as images and properly understand table structure, but both are currently unavailable due to quota limits.

### 2. Proximity-Based Association (Failed)

Tried to associate lot sizes with parcels by proximity (distance between parcel ID and lot size in text), but the scrambled text makes this unreliable - lot sizes appear before, after, or interleaved with unrelated data.

### 3. Narrative Text Fallback (Partial Success)

The document narrative mentions: "lot mix of 42'x 120', 50'x 120' and 55' x 125'"

This provides the project-level lot sizes, but doesn't indicate which parcel uses which lot size.

## Suggested Solutions for ChatGPT-5

We need help with the following approaches:

### Option A: Better OCR/Table Extraction

1. **Alternative PDF parsing libraries** that preserve table structure
   - Is there a Node.js library better than `pdf-poppler` for table extraction?
   - Should we use `pdf2json`, `tabula-js`, or another tool?
   - How can we detect table boundaries and column alignment from raw text?

2. **PDF-to-Image + OCR**
   - Convert PDF pages to images using `pdf-poppler` (already working)
   - Use Tesseract.js or another OCR library with table detection
   - Parse the structured table data

### Option B: Smarter Pattern Matching

1. **Multi-line regex patterns** that account for scrambled text
   - Can we build patterns that match "parcel ID + lot size" within a certain character range?
   - How do we handle cases where data wraps across lines?

2. **Statistical association**
   - Use the known parcel metrics (89 lots, 18.81 ac) to correlate with nearby lot sizes
   - Build confidence scores based on proximity and text patterns

### Option C: Hybrid Approach

1. **Use LLM for table understanding** when available
   - Structure the prompt to return JSON with parcel-to-lot-size mappings
   - Fallback to regex when LLM is unavailable

2. **User-in-the-loop validation**
   - Extract all lot sizes and parcel metrics reliably
   - Present user with a mapping interface: "Parcel 2 (89 lots) → Select lot size: [42x120] [55x120] [55x125] [50x120]"
   - Save user selections for future similar documents (learning)

## Database Schema

### Lot Products DVL

```sql
-- landscape.res_lot_product
code          | lot_w_ft | lot_d_ft | lot_area_sf
--------------+----------+----------+-------------
42x120        | 42       | 120      | 5040
50x120        | 50       | 120      | 6000
55x120        | 55       | 120      | 6600
55x125        | 55       | 125      | 6875
```

### Land Use Types DVL

```sql
-- landscape.lu_subtype
code | name                  | family_id | active
-----+-----------------------+-----------+--------
SFD  | Single Family Detached| 1         | true
SFA  | Single Family Attached| 1         | true
MF   | Multi-Family          | 2         | true
```

## Questions for ChatGPT-5

1. **What is the most reliable Node.js library for extracting tables from PDFs?**
   - We need something that preserves row/column structure
   - Should work with both native PDFs and scanned documents

2. **How can we improve our regex patterns to handle scrambled text?**
   - Current approach: Extract all values separately, try to associate by proximity
   - Is there a better algorithmic approach?

3. **Should we use a different text extraction method entirely?**
   - Currently using `pdftotext` which outputs plain text
   - Should we use PDF.js, Apache Tika, or something else?

4. **How can we implement table detection/extraction without AI APIs?**
   - We need an offline/low-cost solution
   - Willing to use open-source models if they can run locally

5. **Best practices for "human-in-the-loop" data extraction?**
   - How should we design the UI for users to correct/validate extracted data?
   - What's the minimum viable interface for mapping lot sizes to parcels?

## Current Status

- ✅ Total lots extraction: **Working** (uses max lot count logic)
- ✅ Parcel metrics (lots, acres, density, open space): **Working** (regex patterns match reliably)
- ✅ DVL validation: **Working** (validates user input against database)
- ⚠️ Lot product extraction: **Partially working** (extracts all lot sizes but cannot associate with parcels)
- ❌ Table structure preservation: **Not working** (pdftotext scrambles tables)
- ❌ AI Vision fallback: **Not working** (both OpenAI and Anthropic out of credits)

## Next Steps

1. Get recommendations from ChatGPT-5 on better PDF parsing approaches
2. Implement improved table extraction if viable solution exists
3. If no better extraction method available, enhance the user validation UI to make manual mapping fast and intuitive
4. Consider implementing local LLM (llama.cpp, ollama) for offline table understanding

---

**Last Updated**: October 1, 2025
**Document Type**: Technical Issue Documentation
**Related Files**:
- `/src/app/api/ai/analyze-document/route.ts` (main parsing logic)
- `/src/app/components/GIS/ProjectDocumentUploads.tsx` (UI)
- `/src/app/api/ai/validate-field/route.ts` (DVL validation)
