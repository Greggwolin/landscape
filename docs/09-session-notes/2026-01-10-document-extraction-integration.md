# Document Extraction Integration for New Project Modal

**Date**: January 10, 2026
**Duration**: ~2 hours
**Focus**: Integrating document extraction into the Create Project modal workflow

---

## Summary

Added document extraction capabilities to the New Project modal, allowing users to drop/paste documents (OMs, rent rolls, T-12s) to auto-populate form fields. Also added form clearing functionality.

## Major Accomplishments

### 1. NewProjectDropZone Integration into Create Project Modal

- Integrated existing `NewProjectDropZone` component into `LandscaperPanel`
- Added document extraction API endpoint (`/api/landscaper/extract-for-project`)
- Wired up field population from extraction results to form fields
- Added visual indicators (blue ring + "Auto-filled" badge) for auto-populated fields

### 2. Real Document Extraction with Claude API

- Created Next.js API route that uses Anthropic Claude for PDF/image extraction
- Supports PDF documents and images (JPEG, PNG)
- Extracts: property name, address, city, state, ZIP, units, square footage, property type
- Returns confidence scores for each extracted field

### 3. Form Enhancements

- Added "Clear form" button to modal footer
- Clears form data, extracted field indicators, and pending document
- Better error messaging showing actual API errors in chat

### 4. Clipboard Paste Support

- Added paste event handler to `NewProjectDropZone`
- Users can paste copied files directly into the dropzone

## Files Modified

### New Files Created:
- `src/app/api/landscaper/extract-for-project/route.ts` - Claude-based extraction API

### Files Modified:
- `src/app/components/new-project/LandscaperPanel.tsx` - Added dropzone, extraction handling
- `src/app/components/NewProjectModal.tsx` - Field population, clear form button
- `src/app/components/new-project/LocationSection.tsx` - Extraction indicators
- `src/app/components/new-project/PropertyDataSection.tsx` - Extraction indicators
- `src/components/projects/onboarding/NewProjectDropZone.tsx` - Clipboard paste support

## Technical Details

### Extraction API Flow
1. User drops/pastes document in LandscaperPanel
2. File sent to `/api/landscaper/extract-for-project`
3. Claude analyzes PDF/image and extracts structured data
4. Response includes fields with confidence scores
5. Parent modal populates form fields and shows visual indicators

### Field Mapping
```typescript
const fieldMapping = {
  property_name: 'project_name',
  street_address: 'street_address',
  city: 'city',
  state: 'state_province',
  zip_code: 'zip_code',
  total_units: 'total_units',
  building_sf: 'building_sf',
  site_area: 'site_area',
  property_subtype: 'property_subtype'
}
```

## Known Issues

1. **Rent Roll Extraction on Property Page** - The existing Landscaper extraction pipeline shows partial failures for financials and deal_market batches when document doesn't contain that data (expected behavior, not a bug)

2. **Word/Excel Not Supported** - Claude API doesn't directly read these formats; users should convert to PDF

## Next Steps

- Expand extraction fields for OMs (asking price, year built, cap rate)
- Add extraction progress indicator
- Consider DMS auto-ingestion after project creation

---

## Git Activity

### Uncommitted Changes:
- Many files modified across backend and frontend
- New API route for document extraction
- Modal enhancements for form clearing
