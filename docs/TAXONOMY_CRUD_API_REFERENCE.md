# Land Use Taxonomy CRUD API Reference

**Implementation Date:** November 1, 2025
**Status:** ✅ Complete - All endpoints functional

---

## Overview

Full CRUD API implementation for land use taxonomy management with three-tier hierarchy:
1. **Families** (e.g., Residential, Commercial, Industrial)
2. **Types** (e.g., SFD, MDR, Office, Retail)
3. **Products** (e.g., lot sizes with dimensions)

All endpoints support proper validation, error handling, and soft deletes.

---

## Database Schema

### Tables
- `landscape.lu_family` - Top-level families
- `landscape.lu_type` - Second-level types
- `landscape.res_lot_product` - Product definitions (residential lots)
- `landscape.type_lot_product` - Junction table (many-to-many)

### Key Features
- `family_id`, `type_id`, `product_id` are all `BIGSERIAL` (auto-generated)
- Soft deletes via `active` boolean column (families and types only)
- Hard deletes for products
- `lot_area_sf` is auto-calculated by database: `lot_w_ft * lot_d_ft`
- Foreign key cascades configured

---

## API Endpoints

### Families

#### GET /api/land-use/families
**Purpose:** List all active families with type counts

**Response:**
```json
[
  {
    "family_id": "1",
    "code": "RES",
    "name": "Residential",
    "active": true,
    "notes": null,
    "type_count": "5"
  }
]
```

#### POST /api/land-use/families
**Purpose:** Create new family

**Request Body:**
```json
{
  "code": "TEST",
  "name": "Test Family",
  "notes": "Optional notes"
}
```

**Validation:**
- `code`: Required, 2-10 characters, auto-uppercased
- `name`: Required, 1-100 characters
- `notes`: Optional

**Response:** 201 Created
```json
{
  "family_id": "11",
  "code": "TEST",
  "name": "Test Family",
  "active": true,
  "notes": "Optional notes"
}
```

**Errors:**
- 400: Missing required fields or validation failure
- 409: Duplicate code

#### PUT /api/land-use/families/[id]
**Purpose:** Update existing family

**Request Body:** Same as POST

**Response:** 200 OK (same format as POST)

**Errors:**
- 400: Validation failure
- 404: Family not found
- 409: Duplicate code

#### DELETE /api/land-use/families/[id]
**Purpose:** Soft delete family (sets `active = false`)

**Validation:** Cannot delete if active types reference this family

**Response:** 200 OK
```json
{
  "success": true,
  "family_id": 11
}
```

**Errors:**
- 404: Family not found
- 422: Cannot delete - has active types

---

### Types

#### GET /api/land-use/types
**Purpose:** List all active types with product counts

**Query Parameters:**
- `family_id` (optional) - Filter types by family

**Response:**
```json
[
  {
    "type_id": "1",
    "family_id": "1",
    "family_name": "Residential",
    "code": "SFD",
    "name": "Single Family - Detached",
    "ord": 1,
    "active": true,
    "notes": null,
    "product_count": "40"
  }
]
```

#### POST /api/land-use/types
**Purpose:** Create new type

**Request Body:**
```json
{
  "family_id": 1,
  "code": "CUST",
  "name": "Custom Estate",
  "ord": 10,
  "notes": "Optional notes"
}
```

**Validation:**
- `family_id`: Required, must exist in lu_family
- `code`: Required, 2-20 characters, auto-uppercased
- `name`: Required, 1-100 characters
- `ord`: Optional (sort order)
- `notes`: Optional

**Response:** 201 Created

**Errors:**
- 400: Missing/invalid fields, or family doesn't exist
- 409: Duplicate code

#### PUT /api/land-use/types/[id]
**Purpose:** Update existing type

**Request Body:** Same as POST

**Response:** 200 OK

**Errors:**
- 400: Validation failure or family doesn't exist
- 404: Type not found
- 409: Duplicate code

#### DELETE /api/land-use/types/[id]
**Purpose:** Soft delete type (sets `active = false`)

**Validation:** Cannot delete if products are linked via junction table

**Response:** 200 OK
```json
{
  "success": true,
  "type_id": 5
}
```

**Errors:**
- 404: Type not found
- 422: Cannot delete - has linked products

---

### Products

#### GET /api/landuse/products
**Purpose:** List all products with linked types

**Query Parameters:**
- `type_id` (optional) - Filter products by type

**Response:**
```json
[
  {
    "product_id": "70",
    "code": "100x145",
    "lot_w_ft": 100,
    "lot_d_ft": 145,
    "lot_area_sf": 14500,
    "linked_types": [
      {
        "type_id": 1,
        "type_name": "Single Family - Detached",
        "type_code": "SFD"
      }
    ]
  }
]
```

#### GET /api/landuse/products/[id]
**Purpose:** Get single product with linked types

**Response:** Same format as GET list (single object)

**Errors:**
- 404: Product not found

#### POST /api/landuse/products
**Purpose:** Create new product

**Request Body:**
```json
{
  "code": "70x130",
  "lot_w_ft": 70,
  "lot_d_ft": 130,
  "linked_type_ids": [1, 2]
}
```

**Validation:**
- `code`: Required, 3-50 characters
- `lot_w_ft`: Required, must be > 0
- `lot_d_ft`: Required, must be > 0
- `linked_type_ids`: Optional array of type IDs
- `lot_area_sf` is auto-calculated by database

**Response:** 201 Created
```json
{
  "product_id": "80",
  "code": "70x130",
  "lot_w_ft": 70,
  "lot_d_ft": 130,
  "lot_area_sf": 9100,
  "linked_type_ids": [1, 2]
}
```

**Errors:**
- 400: Missing/invalid fields
- 409: Duplicate code

#### PUT /api/landuse/products/[id]
**Purpose:** Update existing product and sync junction table

**Request Body:** Same as POST

**Response:** 200 OK

**Behavior:**
- Updates product dimensions
- Removes all old type associations
- Adds new type associations from `linked_type_ids`

**Errors:**
- 400: Validation failure
- 404: Product not found
- 409: Duplicate code

#### DELETE /api/landuse/products/[id]
**Purpose:** Hard delete product

**Validation:** Cannot delete if inventory items reference this product

**Response:** 200 OK
```json
{
  "success": true,
  "product_id": 80
}
```

**Errors:**
- 404: Product not found
- 422: Cannot delete - referenced by inventory items

---

### Junction Table Management

#### GET /api/land-use/types/[id]/products
**Purpose:** Get all products linked to a specific type

**Response:**
```json
[
  {
    "product_id": "70",
    "code": "100x145",
    "lot_w_ft": 100,
    "lot_d_ft": 145,
    "lot_area_sf": 14500
  }
]
```

#### POST /api/land-use/types/[id]/products
**Purpose:** Link a product to a type

**Request Body:**
```json
{
  "product_id": 80
}
```

**Response:** 201 Created
```json
{
  "success": true,
  "type_id": 1,
  "product_id": 80
}
```

**Errors:**
- 400: Missing product_id
- 404: Type or product not found

#### DELETE /api/land-use/types/[id]/products/[productId]
**Purpose:** Unlink a product from a type

**Response:** 200 OK
```json
{
  "success": true,
  "type_id": 1,
  "product_id": 80
}
```

**Errors:**
- 404: Link not found

---

## Testing

All endpoints have been tested and are functional. Example test commands:

```bash
# List families
curl http://localhost:3000/api/land-use/families | jq '.'

# Create family
curl -X POST http://localhost:3000/api/land-use/families \
  -H "Content-Type: application/json" \
  -d '{"code":"TEST","name":"Test Family"}' | jq '.'

# Update family
curl -X PUT http://localhost:3000/api/land-use/families/11 \
  -H "Content-Type: application/json" \
  -d '{"code":"TEST","name":"Updated Test"}' | jq '.'

# Delete family
curl -X DELETE http://localhost:3000/api/land-use/families/11 | jq '.'

# List types for family
curl "http://localhost:3000/api/land-use/types?family_id=1" | jq '.'

# List products
curl http://localhost:3000/api/landuse/products | jq '.'
```

---

## Implementation Files

### API Routes
- `/src/app/api/land-use/families/route.ts` - GET, POST
- `/src/app/api/land-use/families/[id]/route.ts` - PUT, DELETE
- `/src/app/api/land-use/types/route.ts` - GET, POST
- `/src/app/api/land-use/types/[id]/route.ts` - PUT, DELETE
- `/src/app/api/land-use/types/[id]/products/route.ts` - GET, POST (junction)
- `/src/app/api/land-use/types/[id]/products/[productId]/route.ts` - DELETE (junction)
- `/src/app/api/landuse/products/route.ts` - GET, POST
- `/src/app/api/landuse/products/[id]/route.ts` - GET, PUT, DELETE

### Frontend Components
- `/src/app/settings/taxonomy/page.tsx` - Main taxonomy manager page
- `/src/components/taxonomy/FamilyTree.tsx` - Family list component
- `/src/components/taxonomy/FamilyDetails.tsx` - Type list for selected family
- `/src/components/taxonomy/ProductsList.tsx` - Product list for selected type

**Status:** UI exists but needs wiring for mutations (currently read-only)

---

## Next Steps

1. ✅ API endpoints complete and tested
2. ⏳ Wire up frontend forms for create/edit operations
3. ⏳ Add delete confirmation dialogs
4. ⏳ Add success/error toast notifications
5. ⏳ Add optimistic UI updates (optional)

---

## Notes

- All `code` fields are automatically uppercased
- Soft deletes are used for families and types to preserve referential integrity
- Products use hard deletes but check for inventory references first
- Junction table uses composite primary key `(type_id, product_id)`
- The `lot_area_sf` column is generated/computed by the database automatically

**GZ-16**
