# Product Creation & Implementation Flow

**Document Purpose**: Comprehensive guide to how products are created in the Land Use Taxonomy Manager and integrated with the Projects/Planning page parcel detail table.

**Date Created**: 2025-01-15
**Status**: Current Implementation Analysis

---

## Table of Contents

1. [Product Creation Flow](#product-creation-flow)
2. [Data Model & Schema](#data-model--schema)
3. [Planning Page Integration](#planning-page-integration)
4. [Field Requirements by LU Family](#field-requirements-by-lu-family)
5. [Current Gaps & Issues](#current-gaps--issues)
6. [API Routes & Data Flow](#api-routes--data-flow)
7. [Code Reference Guide](#code-reference-guide)

---

## 1. Product Creation Flow

### 1.1 Admin/Preferences - Land Use Taxonomy Manager

**Access Path**:
```
Admin → Preferences → Land Use Taxonomy Manager → Select Family → Select Type → Products Panel → Add Product
```

**Modal Location**: [src/components/taxonomy/ProductsList.tsx](src/components/taxonomy/ProductsList.tsx)

**Current Modal Fields**:
```
┌─────────────────────────────────┐
│  Add New Product                │
├─────────────────────────────────┤
│  Code                           │
│  [e.g., 50x100]                 │
│                                 │
│  Width (ft)                     │
│  [e.g., 50]                     │
│                                 │
│  Depth (ft)                     │
│  [e.g., 100]                    │
│                                 │
│  Area: 5,000 SF (calculated)    │
│                                 │
│  [Cancel]  [Save]               │
└─────────────────────────────────┘
```

**Creation Process** (ProductsList.tsx:69-97):
```typescript
const handleSave = async () => {
  const url = editingProduct
    ? `/api/taxonomy/products/${editingProduct.product_id}`
    : `/api/taxonomy/products`;

  const response = await fetch(url, {
    method: editingProduct ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: formData.code,                    // "50x120"
      lot_w_ft: parseInt(formData.lot_w_ft),  // 50
      lot_d_ft: parseInt(formData.lot_d_ft),  // 120
      linked_type_ids: [type.type_id]         // Links to selected LU Type
    })
  });

  // Refreshes product list for current type
  await fetchProducts(type.type_id);
};
```

### 1.2 Alternative: Global Product Library

**Access Path**:
```
Benchmarks → Product Library → Add Product
```

**Component**: [src/components/benchmarks/products/ProductLibraryPanel.tsx](src/components/benchmarks/products/ProductLibraryPanel.tsx)

**Additional Features**:
- Filter by Active/Inactive status
- Search by product code
- Link product to multiple LU Types
- Set planning efficiency defaults
- Calculate density per acre automatically

**Density Calculation** (from helpers.ts):
```typescript
const density_per_acre = (43560 / lot_area_sf) * planning_efficiency;
// Example: (43560 / 6000) * 0.75 = 5.45 units/acre
```

---

## 2. Data Model & Schema

### 2.1 Database Table: `res_lot_product`

```sql
CREATE TABLE res_lot_product (
  product_id      SERIAL PRIMARY KEY,
  code            VARCHAR(100) UNIQUE NOT NULL,  -- "50x120"
  lot_w_ft        DECIMAL(10,2),                 -- 50.00
  lot_d_ft        DECIMAL(10,2),                 -- 120.00
  lot_area_sf     DECIMAL(12,2),                 -- 6000.00 (auto-calculated)
  type_id         INTEGER REFERENCES lu_type(type_id),
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

### 2.2 TypeScript Interfaces

**ProductChoice** (types/landuse.ts):
```typescript
interface ProductChoice {
  product_id: number;
  product_name: string;      // Alias for 'code'
  code: string;              // "50x120"
  lot_width?: number;        // Alias for 'lot_w_ft'
  lot_depth?: number;        // Alias for 'lot_d_ft'
  lot_area_sf?: number;
  type_id?: number;
}
```

**LotProduct** (types/landuse.ts):
```typescript
interface LotProduct {
  product_id: number;
  code: string;
  lot_w_ft?: number | null;
  lot_d_ft?: number | null;
  lot_area_sf?: number | null;
  type_id?: number | null;
  type_name?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  density_per_acre?: number | null;  // Calculated field
}
```

### 2.3 Relationships

```
res_lu_family (Residential, Commercial, etc.)
    ↓ (1:M)
lu_type (SFD, SFA, Retail, Office, etc.)
    ↓ (M:M via type_lot_product)
res_lot_product (50x120, 60x100, etc.)
    ↓ (1:M)
project_parcels (actual parcel instances)
```

**Junction Table**: `type_lot_product`
```sql
CREATE TABLE type_lot_product (
  type_id     INTEGER REFERENCES lu_type(type_id),
  product_id  INTEGER REFERENCES res_lot_product(product_id),
  PRIMARY KEY (type_id, product_id)
);
```

---

## 3. Planning Page Integration

### 3.1 Parcel Creation/Edit Flow

**Location**: [src/app/components/PlanningWizard/SimpleTaxonomySelector.tsx](src/app/components/PlanningWizard/SimpleTaxonomySelector.tsx)

**Cascading Selection**:
```
Step 1: Select Family
   ↓ (triggers API: /api/landuse/families)

Step 2: Select Type
   ↓ (triggers API: /api/landuse/types/${family_id})

Step 3: Select Product
   ↓ (triggers API: /api/landuse/lot-products/${type_id})

Step 4: Product Auto-Populates Parcel Fields
   ↓
   ParcelForm.lot_width = product.lot_w_ft
   ParcelForm.lot_depth = product.lot_d_ft
   ParcelForm.lot_area = product.lot_area_sf
   ParcelForm.product_code = product.code
```

### 3.2 Product Dropdown Display

**Code** (SimpleTaxonomySelector.tsx:241-246):
```typescript
<select onChange={(e) => onProductChange(e.target.value)}>
  <option value="">Select Product</option>
  {products.map(product => (
    <option key={product.product_id} value={product.code}>
      {product.product_name}
      {product.lot_width && product.lot_depth &&
        ` (${product.lot_width}'×${product.lot_depth}')`
      }
    </option>
  ))}
</select>
```

**Display Examples**:
- `50x120 (50'×120')`
- `60x100 (60'×100')`
- `Custom (no dimensions shown if width/depth null)`

### 3.3 Parcel Detail Table

**Component**: [src/app/components/PlanningWizard/ParcelTile.tsx](src/app/components/PlanningWizard/ParcelTile.tsx)

**Displayed Fields**:
```
┌─────────────────────────────────────────────┐
│ Parcel #1                                   │
├─────────────────────────────────────────────┤
│ Family:  Residential                        │
│ Type:    SFD                                │
│ Product: 50x120 (6,000 SF)                  │
│ Units:   15                                 │
│ Density: 5.45 units/acre                    │
└─────────────────────────────────────────────┘
```

### 3.4 Data Flow on Product Selection

```javascript
// User selects product "50x120" from dropdown
onProductChange('50x120')
  ↓
// Fetch full product details
const product = await fetch(`/api/landuse/lot-products/${type_id}`)
  .then(res => res.json())
  .then(products => products.find(p => p.code === '50x120'))
  ↓
// Auto-populate parcel form
setParcelData({
  ...parcelData,
  product_code: '50x120',
  lot_width: 50,
  lot_depth: 120,
  lot_area_sf: 6000,
  density_per_acre: (43560 / 6000) * 0.75  // 5.45
})
  ↓
// Save parcel to database
POST /api/projects/{projectId}/parcels
{
  parcel_name: "Parcel #1",
  family_id: 1,
  type_id: 10,
  product_code: "50x120",
  lot_width: 50,
  lot_depth: 120,
  lot_area_sf: 6000,
  units: 15
}
```

---

## 4. Field Requirements by LU Family

### 4.1 Current Implementation (All Families)

**Problem**: The product modal currently shows **Width/Depth** fields for all LU families, but these fields are only relevant for **Residential** products.

| Family | Current Modal Fields | Actually Used? |
|--------|---------------------|----------------|
| Residential | Code, Width, Depth | ✅ YES |
| Commercial | Code, Width, Depth | ❌ NO - uses building_sf, FAR |
| Industrial | Code, Width, Depth | ❌ NO - uses building_sf, site_coverage |
| Common Areas | Code, Width, Depth | ❌ NO - no products needed |
| Open Space | Code, Width, Depth | ❌ NO - no products needed |

### 4.2 Proposed Field Requirements by Family

#### **Residential** (SFD, SFA, Townhome, Condo)
```javascript
{
  code: "50x120",           // Required
  lot_w_ft: 50,            // Required
  lot_d_ft: 120,           // Required
  lot_area_sf: 6000,       // Auto-calculated
  units_per_product: 1     // Optional (usually 1 for SFD, >1 for MF)
}
```

#### **Commercial** (Retail, Office, Mixed Use)
```javascript
{
  code: "Retail-A",        // Required
  building_sf: 5000,       // Required
  FAR: 0.35,              // Floor Area Ratio
  site_coverage: 0.25,     // % of lot covered
  parking_ratio: 4.5,      // Spaces per 1000 SF
  // NO lot_w_ft or lot_d_ft
}
```

#### **Industrial** (Warehouse, Manufacturing, Flex)
```javascript
{
  code: "Warehouse-B",     // Required
  building_sf: 50000,      // Required
  site_coverage: 0.40,     // % of lot covered
  setbacks: {              // Structured setbacks
    front: 25,
    rear: 20,
    side: 15
  },
  dock_doors: 8            // Loading docks
  // NO lot_w_ft or lot_d_ft
}
```

#### **Common Areas / Open Space**
```javascript
{
  code: "Park-Central",    // Required
  area_acres: 2.5,         // Total area
  // Minimal fields - no dimensions needed
}
```

### 4.3 Database Schema Implications

**Current Schema**: All products use same `res_lot_product` table with nullable fields
- ✅ **Pro**: Simple, unified table
- ❌ **Con**: Unclear which fields are required for which family
- ❌ **Con**: Commercial/Industrial fields not stored (building_sf, FAR, etc.)

**Potential Solutions**:

**Option A: Add Family-Specific Columns**
```sql
ALTER TABLE res_lot_product ADD COLUMN building_sf DECIMAL(12,2);
ALTER TABLE res_lot_product ADD COLUMN far DECIMAL(5,2);
ALTER TABLE res_lot_product ADD COLUMN site_coverage DECIMAL(5,2);
ALTER TABLE res_lot_product ADD COLUMN parking_ratio DECIMAL(5,2);
-- ... etc
```
- ✅ Simple implementation
- ❌ Many nullable columns
- ❌ Cluttered schema

**Option B: JSON Column for Family-Specific Data**
```sql
ALTER TABLE res_lot_product ADD COLUMN family_data JSONB;

-- Example:
-- Residential: {"lot_w_ft": 50, "lot_d_ft": 120}
-- Commercial: {"building_sf": 5000, "far": 0.35, "parking_ratio": 4.5}
```
- ✅ Flexible for different families
- ✅ Clean schema
- ❌ Harder to query/validate

**Option C: Polymorphic Products (Separate Tables)**
```sql
CREATE TABLE residential_products (
  product_id INTEGER PRIMARY KEY REFERENCES res_lot_product(product_id),
  lot_w_ft DECIMAL(10,2) NOT NULL,
  lot_d_ft DECIMAL(10,2) NOT NULL
);

CREATE TABLE commercial_products (
  product_id INTEGER PRIMARY KEY REFERENCES res_lot_product(product_id),
  building_sf DECIMAL(12,2) NOT NULL,
  far DECIMAL(5,2),
  site_coverage DECIMAL(5,2)
);
```
- ✅ Type-safe, enforced constraints
- ✅ Clear schema
- ❌ More complex queries (JOIN required)

---

## 5. Current Gaps & Issues

### 5.1 ❌ No Dimension Auto-Parsing

**Issue**: Users must manually enter width and depth even if code is "50x120"

**Expected Behavior**:
```javascript
// User types "50x120" in Code field
onChange(code) {
  const match = code.match(/^(\d+)x(\d+)$/i);
  if (match) {
    setFormData({
      ...formData,
      code: code,
      lot_w_ft: match[1],  // Auto-fill: 50
      lot_d_ft: match[2]   // Auto-fill: 120
    });
  }
}
```

**Current Behavior**:
```javascript
// User types "50x120" in Code field
// Nothing happens - width and depth remain empty
// User must manually enter:
//   Width: 50
//   Depth: 120
```

**Impact**:
- ⚠️ Data entry errors (user enters code "50x120" but width/depth "60x100")
- ⚠️ Inconsistency between code and dimensions
- ⚠️ Extra work for users

### 5.2 ❌ Wrong Fields for Non-Residential Families

**Issue**: Commercial/Industrial products show Width/Depth fields but need Building SF, FAR, etc.

**Example Scenario**:
```
User selects:
  Family: Commercial
  Type: Retail
  Click "Add Product"

Modal shows:
  Code: [____]
  Width (ft): [____]   ← WRONG - Retail doesn't have lot width
  Depth (ft): [____]   ← WRONG - Retail doesn't have lot depth

Should show:
  Code: [____]
  Building SF: [____]
  FAR: [____]
  Site Coverage: [____]
  Parking Ratio: [____]
```

### 5.3 ❌ No Quick-Add from Planning Page

**Issue**: Users must navigate to Admin → Preferences to add products while creating parcels

**Current Workflow**:
```
1. User on Planning Page creating parcel
2. Selects Family → Type
3. Product dropdown doesn't have desired product
4. Navigate to Admin → Preferences
5. Expand Land Use Taxonomy Manager
6. Select Family → Type → Add Product
7. Fill form → Save
8. Navigate back to Planning Page
9. Refresh page to see new product
10. Continue creating parcel
```

**Desired Workflow**:
```
1. User on Planning Page creating parcel
2. Selects Family → Type
3. Product dropdown doesn't have desired product
4. Click "+ Create Product" in dropdown
5. Modal opens, fill form → Save
6. New product immediately appears in dropdown
7. Select new product, continue creating parcel
```

### 5.4 ❌ Field Naming Inconsistency

**Database**:
```sql
lot_w_ft, lot_d_ft
```

**TypeScript (some interfaces)**:
```typescript
lot_width, lot_depth
```

**TypeScript (other interfaces)**:
```typescript
lot_w_ft, lot_d_ft
```

**Impact**: Requires field mapping, causes confusion

### 5.5 ❌ No Code Uniqueness Validation

**Issue**: Database has `UNIQUE` constraint on `code`, but UI doesn't pre-validate

**Current Experience**:
```
1. User enters code "50x120"
2. Clicks Save
3. Server returns error: "Product code already exists"
4. User must choose different code and retry
```

**Better Experience**:
```
1. User enters code "50x120"
2. Real-time check: red border + "This code already exists"
3. User changes to "50x125" before clicking Save
4. Green border + "Code available"
5. Clicks Save → Success
```

### 5.6 ❌ No Product Templates/Presets

**Issue**: Users must manually create common residential products

**Common Products** (for SFD):
- 40×100 (4,000 SF)
- 50×100 (5,000 SF)
- 50×120 (6,000 SF)
- 60×100 (6,000 SF)
- 60×120 (7,200 SF)
- 70×120 (8,400 SF)
- 80×120 (9,600 SF)

**Potential Solution**:
- Seed database with common products
- "Import Template" button to add standard product sets
- Copy products from existing projects

---

## 6. API Routes & Data Flow

### 6.1 Product CRUD Endpoints

| Endpoint | Method | Purpose | Request Body | Response |
|----------|--------|---------|--------------|----------|
| `/api/taxonomy/products` | GET | List products for type | Query: `?type_id=10` | `LotProduct[]` |
| `/api/taxonomy/products` | POST | Create product | `{code, lot_w_ft, lot_d_ft, linked_type_ids}` | `{product_id}` |
| `/api/taxonomy/products/[id]` | PUT | Update product | `{code, lot_w_ft, lot_d_ft}` | `{success: true}` |
| `/api/taxonomy/products/[id]` | DELETE | Delete product | - | `{success: true}` |
| `/api/landuse/lot-products/[typeId]` | GET | Get products for type | - | `ProductChoice[]` |
| `/api/products` | GET | List all products | Query: `?is_active=true` | `LotProduct[]` |
| `/api/products` | POST | Create product | `{code, lot_w_ft, lot_d_ft, type_id, is_active}` | `{product_id}` |
| `/api/products/[id]` | PATCH | Update product | `{lot_w_ft?, lot_d_ft?, is_active?}` | `{success: true}` |
| `/api/products/[id]` | DELETE | Delete product | - | `{success: true}` |

**Note**: Multiple overlapping endpoints exist (legacy + new implementations). Consider consolidating.

### 6.2 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   PRODUCT CREATION                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌──────────────────────────────────────┐
        │  Admin/Preferences Modal             │
        │  OR Product Library Panel            │
        └──────────────────────────────────────┘
                              │
                              ▼
                  POST /api/taxonomy/products
                  {
                    code: "50x120",
                    lot_w_ft: 50,
                    lot_d_ft: 120,
                    linked_type_ids: [10]
                  }
                              │
                              ▼
        ┌──────────────────────────────────────┐
        │  Database: res_lot_product           │
        │  + type_lot_product junction         │
        └──────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   PRODUCT USAGE                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌──────────────────────────────────────┐
        │  Planning Page: Parcel Creation      │
        │  SimpleTaxonomySelector              │
        └──────────────────────────────────────┘
                              │
                              ▼
        GET /api/landuse/lot-products/{type_id}
                              │
                              ▼
        ┌──────────────────────────────────────┐
        │  Product Dropdown Populated          │
        │  "50x120 (50'×120')"                 │
        └──────────────────────────────────────┘
                              │
                              ▼
                    User selects product
                              │
                              ▼
        ┌──────────────────────────────────────┐
        │  Auto-populate Parcel Fields:        │
        │  - lot_width = 50                    │
        │  - lot_depth = 120                   │
        │  - lot_area_sf = 6000                │
        │  - product_code = "50x120"           │
        └──────────────────────────────────────┘
                              │
                              ▼
        POST /api/projects/{projectId}/parcels
                              │
                              ▼
        ┌──────────────────────────────────────┐
        │  Database: project_parcels           │
        │  (references product via code)       │
        └──────────────────────────────────────┘
```

### 6.3 Data Sync Strategy

**Single Source of Truth**: `res_lot_product` table

**No Duplication**:
- Products are **global** (not project-specific)
- Parcels reference products by `product_code` (foreign key)
- Changing a product affects all parcels using that product

**Cascade Behavior**:
```sql
-- If product "50x120" is updated to "50x125":
UPDATE res_lot_product
SET code = '50x125', lot_d_ft = 125
WHERE code = '50x120';

-- All parcels referencing "50x120" would need manual update
-- (or use foreign key CASCADE)
UPDATE project_parcels
SET product_code = '50x125'
WHERE product_code = '50x120';
```

**Recommendation**: Add foreign key constraint with `ON UPDATE CASCADE`

---

## 7. Code Reference Guide

### 7.1 Product Creation Components

| File | Lines | Description |
|------|-------|-------------|
| [src/components/taxonomy/ProductsList.tsx](src/components/taxonomy/ProductsList.tsx) | 1-200 | Admin modal for adding products |
| [src/components/taxonomy/ProductsList.tsx](src/components/taxonomy/ProductsList.tsx) | 69-97 | `handleSave()` - Product creation logic |
| [src/components/taxonomy/ProductsList.tsx](src/components/taxonomy/ProductsList.tsx) | 120-145 | Form inputs for Code, Width, Depth |
| [src/components/benchmarks/products/ProductLibraryPanel.tsx](src/components/benchmarks/products/ProductLibraryPanel.tsx) | 1-350 | Global product library interface |
| [src/components/benchmarks/products/ProductLibraryPanel.tsx](src/components/benchmarks/products/ProductLibraryPanel.tsx) | 180-220 | Density calculation with planning efficiency |

### 7.2 Planning Page Integration

| File | Lines | Description |
|------|-------|-------------|
| [src/app/components/LandUse/SimpleTaxonomySelector.tsx](src/app/components/LandUse/SimpleTaxonomySelector.tsx) | 1-300 | Cascading Family → Type → Product selector |
| [src/app/components/LandUse/SimpleTaxonomySelector.tsx](src/app/components/LandUse/SimpleTaxonomySelector.tsx) | 241-246 | Product dropdown rendering |
| [src/app/components/LandUse/SimpleTaxonomySelector.tsx](src/app/components/LandUse/SimpleTaxonomySelector.tsx) | 150-170 | `onProductChange()` handler |
| [src/app/components/PlanningWizard/ParcelTile.tsx](src/app/components/PlanningWizard/ParcelTile.tsx) | 1-250 | Parcel display component |
| [src/app/components/PlanningWizard/ParcelTile.tsx](src/app/components/PlanningWizard/ParcelTile.tsx) | 80-120 | Product info display in parcel card |

### 7.3 API Routes

| File | Lines | Description |
|------|-------|-------------|
| [src/app/api/taxonomy/products/route.ts](src/app/api/taxonomy/products/route.ts) | 1-100 | GET/POST products for taxonomy manager |
| [src/app/api/taxonomy/products/[id]/route.ts](src/app/api/taxonomy/products/[id]/route.ts) | 1-80 | PUT/DELETE product by ID |
| [src/app/api/landuse/lot-products/[typeId]/route.ts](src/app/api/landuse/lot-products/[typeId]/route.ts) | 1-60 | GET products for specific LU type |
| [src/app/api/products/route.ts](src/app/api/products/route.ts) | 1-150 | Global product library CRUD |
| [src/app/api/products/helpers.ts](src/app/api/products/helpers.ts) | 40-65 | Density calculation utility |

### 7.4 Type Definitions

| File | Lines | Description |
|------|-------|-------------|
| [src/types/landuse.ts](src/types/landuse.ts) | 120-135 | `ProductChoice` interface |
| [src/types/landuse.ts](src/types/landuse.ts) | 200-215 | `LotProduct` interface |
| [src/types/database.ts](src/types/database.ts) | 450-470 | `ResLotProduct` database type |

### 7.5 Backend Models

| File | Lines | Description |
|------|-------|-------------|
| [backend/apps/landuse/models.py](backend/apps/landuse/models.py) | 180-210 | Django `LotProduct` model |
| [backend/apps/landuse/serializers.py](backend/apps/landuse/serializers.py) | 90-110 | `LotProductSerializer` |
| [backend/apps/landuse/views.py](backend/apps/landuse/views.py) | 250-300 | `LotProductViewSet` API endpoints |

---

## 8. Next Steps: Proposed Improvements

### Priority 1: Add Dimension Auto-Parsing
- [ ] Create helper function `parseDimensions(code: string)`
- [ ] Update ProductsList modal with auto-fill on code change
- [ ] Add tests for parsing "50x120", "60x100", etc.

### Priority 2: Family-Specific Modal Fields
- [ ] Pass parent LU family to ProductsList component
- [ ] Conditionally render fields based on family:
  - Residential: Code + Width + Depth
  - Commercial: Code + Building SF + FAR + Site Coverage
  - Industrial: Code + Building SF + Site Coverage
- [ ] Update database schema (add columns or use JSONB)
- [ ] Update API routes to handle new fields

### Priority 3: Quick-Add from Planning Page
- [ ] Add "+ Create Product" button in SimpleTaxonomySelector dropdown
- [ ] Open modal inline (or slide-over panel)
- [ ] Auto-link new product to current LU Type
- [ ] Refresh dropdown immediately after creation

### Priority 4: Validation & UX Improvements
- [ ] Real-time code uniqueness validation
- [ ] Field-level error messages
- [ ] Confirm dialog before deleting products in use
- [ ] Show parcel count using each product

### Priority 5: Product Templates
- [ ] Seed common residential products (40×100, 50×120, etc.)
- [ ] "Import Template" feature for standard product sets
- [ ] Copy products from existing projects

---

## 9. Questions for Discussion

1. **Schema Design**: Should we use separate columns, JSONB, or polymorphic tables for family-specific fields?

2. **Auto-Parsing**: Should dimension parsing be:
   - Automatic (overwrites manual entries)?
   - Suggested (user can override)?
   - Optional (user opt-in)?

3. **Product Scope**: Should products be:
   - Global (shared across all projects)?
   - Project-specific (duplicated per project)?
   - Hybrid (global library + project overrides)?

4. **Non-Residential Products**: How should we handle:
   - Commercial building prototypes (SF, FAR, parking)?
   - Industrial warehouse configurations?
   - Mixed-use products with both residential and commercial?

5. **Migration**: If we change the schema, how do we migrate existing products?

---

**Document End**
