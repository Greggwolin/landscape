# Claude Code: Land Use Taxonomy System Implementation

## Project Context
Update the Landscape land development application to implement the new four-field land use taxonomy system. The database schema has been updated and we need to modify the frontend React components and backend API endpoints to support the new structure.

## Database Schema Changes (Already Applied)
- Renamed `lu_subtype` → `lu_type` 
- Renamed all `subtype_id` → `type_id` columns
- Added `density_classification` table with VLDR, LDR, MDR, HDR standards
- Added four new fields to `tbl_parcel`: `family_name`, `density_code`, `type_code`, `product_code`
- Added AI integration fields to support jurisdictional mapping

## Core Implementation Requirements

### 1. Update API Layer
**File: `server/api/landuse.js` (or equivalent)**
- Update all queries to use `type_id` instead of `subtype_id`
- Create new endpoint: `GET /api/density-classifications`
- Update parcel endpoints to handle new four-field structure
- Add validation for the new taxonomy fields

**New API Endpoints Needed:**
```javascript
GET /api/density-classifications
GET /api/landuse/families
GET /api/landuse/types/:familyId  
GET /api/landuse/products/:typeId
POST /api/parcels/taxonomy (bulk update existing parcels)
```

### 2. Update React Components

**Priority Files to Update:**
- `client/src/components/parcels/ParcelForm.jsx`
- `client/src/components/parcels/ParcelTable.jsx` 
- `client/src/components/landuse/LandUseSelector.jsx`
- `client/src/hooks/useLandUse.js`

**New Components to Create:**
- `client/src/components/landuse/TaxonomySelector.jsx` (four-field dropdown system)
- `client/src/components/landuse/DensityClassificationSelector.jsx`
- `client/src/components/setup/ProjectTaxonomyWizard.jsx`

### 3. Four-Field Taxonomy Selector Component

Create a cascading dropdown system:

```jsx
// TaxonomySelector.jsx
const TaxonomySelector = ({ value, onChange, disabled }) => {
  const [family, setFamily] = useState(value?.family_name || '');
  const [density, setDensity] = useState(value?.density_code || '');
  const [type, setType] = useState(value?.type_code || '');
  const [product, setProduct] = useState(value?.product_code || '');

  // Family dropdown → filters density options
  // Density + Family → filters type options  
  // Type → filters product options
  // Cascade updates to parent component
};
```

### 4. Update Parcel Form Integration

**In ParcelForm.jsx:**
```jsx
// Replace single landuse_code field with four-field selector
<TaxonomySelector 
  value={{
    family_name: formData.family_name,
    density_code: formData.density_code, 
    type_code: formData.type_code,
    product_code: formData.product_code
  }}
  onChange={(taxonomy) => {
    setFormData(prev => ({...prev, ...taxonomy}));
  }}
/>
```

### 5. Project Setup Wizard Component

**File: `client/src/components/setup/ProjectTaxonomyWizard.jsx`**

Create wizard with steps:
1. **Choose Taxonomy**: Global standard vs custom
2. **Density Standards**: Show VLDR/LDR/MDR/HDR table, allow editing
3. **Jurisdiction Integration**: AI-powered mapping (future feature)
4. **Review & Apply**: Summary and confirmation

### 6. Data Migration Component

**File: `client/src/components/admin/TaxonomyMigration.jsx`**

Create admin tool to migrate existing parcels:
- Show current `landuse_code` values
- Suggest mappings to new four-field structure
- Bulk update functionality
- Validation and conflict resolution

### 7. Update Data Hooks

**File: `client/src/hooks/useLandUse.js`**
```javascript
// Add new hooks
export const useDensityClassifications = () => { /* ... */ };
export const useLandUseTypes = (familyId) => { /* ... */ };
export const useProductTypes = (typeId) => { /* ... */ };
export const useTaxonomyMapping = () => { /* ... */ };
```

### 8. Database Connection Updates

**File: `server/database/queries/landuse.sql`**
Update all existing queries to use new column names and add new queries for the taxonomy system.

### 9. Validation Layer

**File: `server/middleware/validateTaxonomy.js`**
```javascript
const validateTaxonomy = (req, res, next) => {
  // Validate four-field consistency
  // Check density_code exists in density_classification
  // Verify type_code belongs to family
  // Ensure product_code is valid for type
};
```

## Implementation Priority

1. **Phase 1 - Core API Updates**
   - Update column references (subtype_id → type_id)
   - Add new endpoints for taxonomy data
   - Test existing functionality still works

2. **Phase 2 - UI Components**  
   - Create TaxonomySelector component
   - Update ParcelForm to use new selector
   - Update ParcelTable to display new fields

3. **Phase 3 - Project Setup**
   - Build ProjectTaxonomyWizard component
   - Integrate with project creation flow
   - Add global taxonomy seed data management

4. **Phase 4 - Migration Tools**
   - Build admin migration component
   - Create data mapping utilities
   - Implement bulk update functionality

## Testing Requirements

- Unit tests for new components
- Integration tests for API endpoints  
- E2E tests for parcel creation with new taxonomy
- Database migration testing with sample data

## Key Business Rules

1. **Family → Density → Type → Product** hierarchy must be maintained
2. Density codes must reference valid `density_classification` entries
3. Type codes must belong to the selected family
4. Product codes must be valid for the selected type
5. Backward compatibility: existing `landuse_code` should still work during transition

## Files That May Need Updates

```
server/
├── api/landuse.js
├── api/parcels.js  
├── database/queries/
├── middleware/validateTaxonomy.js
└── models/

client/src/
├── components/parcels/ParcelForm.jsx
├── components/parcels/ParcelTable.jsx
├── components/landuse/TaxonomySelector.jsx (NEW)
├── components/setup/ProjectTaxonomyWizard.jsx (NEW)
├── hooks/useLandUse.js
└── utils/taxonomyHelpers.js (NEW)
```

## Environment Variables Needed

```
# If adding taxonomy API features
TAXONOMY_SEED_DATA_URL=
JURISDICTION_MAPPING_API_KEY=
```

Focus on creating a smooth user experience where the four-field taxonomy selector works intuitively and the migration from old to new system is seamless.
