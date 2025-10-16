# DMS Step 5 — Attribute Admin Implementation Guide

**Status:** Schema Complete, APIs Partially Implemented, UI Ready for Enhancement
**Date:** October 7, 2025

---

## 📋 Overview

Step 5 implements the attribute management system that allows admins to define custom document attributes and bind them to projects/workspaces via templates. This enables flexible, type-safe document profiling with validation and conditional logic.

---

## 🗄️ Database Schema (Existing)

### **Tables:**

1. **`landscape.dms_attributes`** - Attribute definitions
2. **`landscape.core_doc_attr_enum`** - Enum options
3. **`landscape.core_doc_attr_lookup`** - Lookup configurations
4. **`landscape.dms_templates`** - Template definitions
5. **`landscape.dms_template_attributes`** - Template-attribute bindings

### **Schema Details:**

#### `dms_attributes`
```sql
CREATE TABLE landscape.dms_attributes (
  attr_id          BIGSERIAL PRIMARY KEY,
  attr_key         VARCHAR(100) NOT NULL UNIQUE,  -- Immutable code
  attr_name        VARCHAR(255) NOT NULL,
  attr_type        VARCHAR(50) NOT NULL CHECK (attr_type IN (
    'text', 'longtext', 'number', 'currency', 'boolean',
    'date', 'datetime', 'enum', 'lookup', 'tags', 'json'
  )),
  attr_description TEXT,
  is_required      BOOLEAN DEFAULT false,
  is_searchable    BOOLEAN DEFAULT true,
  validation_rules JSONB DEFAULT '{}'::jsonb,
  enum_values      JSONB,                         -- Deprecated, use core_doc_attr_enum
  lookup_table     VARCHAR(100),                  -- Deprecated, use core_doc_attr_lookup
  display_order    INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);
```

#### `core_doc_attr_enum`
```sql
CREATE TABLE landscape.core_doc_attr_enum (
  attr_id     BIGINT NOT NULL REFERENCES dms_attributes(attr_id) ON DELETE CASCADE,
  option_code TEXT NOT NULL,
  label       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (attr_id, option_code)
);
```

#### `core_doc_attr_lookup`
```sql
CREATE TABLE landscape.core_doc_attr_lookup (
  attr_id      BIGINT PRIMARY KEY REFERENCES dms_attributes(attr_id) ON DELETE CASCADE,
  sql_source   TEXT NOT NULL,      -- Parameterized SELECT statement
  cache_ttl    INTEGER DEFAULT 300, -- Seconds
  display_fmt  TEXT                 -- e.g., "{name} ({id})"
);
```

#### `dms_templates`
```sql
CREATE TABLE landscape.dms_templates (
  template_id   BIGSERIAL PRIMARY KEY,
  template_name VARCHAR(255) NOT NULL,
  workspace_id  BIGINT REFERENCES dms_workspaces(workspace_id),
  project_id    BIGINT REFERENCES tbl_project(project_id),
  doc_type      VARCHAR(100),       -- Apply to specific doc_type
  is_default    BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

#### `dms_template_attributes`
```sql
CREATE TABLE landscape.dms_template_attributes (
  template_id   BIGINT NOT NULL REFERENCES dms_templates(template_id) ON DELETE CASCADE,
  attr_id       BIGINT NOT NULL REFERENCES dms_attributes(attr_id) ON DELETE CASCADE,
  is_required   BOOLEAN DEFAULT false,
  default_value JSONB,
  display_order INTEGER DEFAULT 0,
  PRIMARY KEY (template_id, attr_id)
);
```

---

## 📁 Files Created

### **1. Zod Schemas**

#### `/src/app/api/dms/attributes/schema.ts`
```typescript
import { z } from 'zod';

export const AttributeTypeZ = z.enum([
  'text', 'longtext', 'number', 'currency', 'boolean',
  'date', 'datetime', 'enum', 'lookup', 'tags', 'json',
]);

export const CreateAttributeZ = z.object({
  attr_key: z.string()
    .regex(/^[a-z][a-z0-9_]*$/, 'Must start with lowercase letter'),
  attr_name: z.string().min(1).max(255),
  attr_type: AttributeTypeZ,
  attr_description: z.string().optional(),
  is_required: z.boolean().default(false),
  is_searchable: z.boolean().default(true),
  validation_rules: z.record(z.any()).optional(),
  enum_values: z.array(z.object({
    option_code: z.string(),
    label: z.string(),
    sort_order: z.number().default(0),
    is_active: z.boolean().default(true),
  })).optional(),
  lookup_config: z.object({
    sql_source: z.string(),
    cache_ttl: z.number().default(300),
    display_fmt: z.string().optional(),
  }).optional(),
  display_order: z.number().default(0),
});
```

#### `/src/app/api/dms/templates/schema.ts`
```typescript
export const TemplateBindingZ = z.object({
  attr_id: z.number().int().positive().optional(),
  attr_key: z.string().optional(),
  is_required: z.boolean().default(false),
  visibility_rule: z.string().optional(),  // JSONLogic
  condition_expr: z.string().optional(),   // JSONLogic
  default_value: z.any().optional(),
  display_order: z.number().default(0),
});

export const CreateTemplateZ = z.object({
  template_name: z.string().min(1).max(255),
  workspace_id: z.number().int().positive().optional(),
  project_id: z.number().int().positive().optional(),
  doc_type: z.string().max(100).optional(),
  is_default: z.boolean().default(false),
  bindings: z.array(TemplateBindingZ),
});
```

---

## 🔌 API Endpoints

### **POST /api/dms/attributes**

Create a new attribute definition.

**Request Body:**
```json
{
  "attr_key": "contract_status",
  "attr_name": "Contract Status",
  "attr_type": "enum",
  "attr_description": "Current status of the contract",
  "is_required": false,
  "is_searchable": true,
  "enum_values": [
    { "option_code": "draft", "label": "Draft", "sort_order": 0 },
    { "option_code": "review", "label": "Under Review", "sort_order": 1 },
    { "option_code": "approved", "label": "Approved", "sort_order": 2 },
    { "option_code": "executed", "label": "Executed", "sort_order": 3 }
  ],
  "display_order": 10
}
```

**Response (201):**
```json
{
  "success": true,
  "attribute": {
    "attr_id": 42,
    "attr_key": "contract_status",
    "attr_name": "Contract Status",
    "attr_type": "enum",
    "created_at": "2025-10-07T14:00:00Z"
  }
}
```

**Error (409 Conflict):**
```json
{
  "error": "Attribute key already exists",
  "message": "An attribute with key 'contract_status' already exists"
}
```

---

### **GET /api/dms/attributes**

List and filter attributes.

**Query Parameters:**
- `scope` - Filter by GLOBAL/PROJECT/WORKSPACE
- `project_id` - Filter by project
- `workspace_id` - Filter by workspace
- `attr_type` - Filter by type
- `search` - Search in name/description

**Example:**
```
GET /api/dms/attributes?attr_type=enum&search=contract
```

**Response (200):**
```json
{
  "success": true,
  "attributes": [
    {
      "attr_id": 42,
      "attr_key": "contract_status",
      "attr_name": "Contract Status",
      "attr_type": "enum",
      "attr_description": "Current status of the contract",
      "is_required": false,
      "is_searchable": true,
      "display_order": 10,
      "enum_options": [
        { "option_code": "draft", "label": "Draft", "sort_order": 0, "is_active": true },
        { "option_code": "review", "label": "Under Review", "sort_order": 1, "is_active": true }
      ],
      "created_at": "2025-10-07T14:00:00Z",
      "updated_at": "2025-10-07T14:00:00Z"
    }
  ],
  "count": 1
}
```

---

### **POST /api/dms/templates**

Create a template with attribute bindings.

**Request Body:**
```json
{
  "template_name": "Legal Contract Template",
  "project_id": 1,
  "doc_type": "contract",
  "is_default": true,
  "bindings": [
    {
      "attr_key": "contract_status",
      "is_required": true,
      "display_order": 1
    },
    {
      "attr_key": "contract_value",
      "is_required": true,
      "display_order": 2
    },
    {
      "attr_key": "counterparty",
      "is_required": false,
      "condition_expr": "{\"==\":[{\"var\":\"doc_type\"},\"contract\"]}",
      "display_order": 3
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "template": {
    "template_id": 5,
    "template_name": "Legal Contract Template",
    "project_id": 1,
    "doc_type": "contract",
    "is_default": true,
    "created_at": "2025-10-07T14:30:00Z"
  }
}
```

---

### **GET /api/dms/templates**

Fetch templates with optional effective merge.

**Query Parameters:**
- `project_id` - Filter by project
- `workspace_id` - Filter by workspace
- `doc_type` - Filter by document type
- `effective=true` - Merge GLOBAL → WORKSPACE → PROJECT

**Example:**
```
GET /api/dms/templates?project_id=1&doc_type=contract&effective=true
```

**Response (200):**
```json
{
  "success": true,
  "template": {
    "attributes": [
      {
        "attr_id": 42,
        "attr_key": "contract_status",
        "attr_name": "Contract Status",
        "attr_type": "enum",
        "is_required": true,
        "visibility_rule": null,
        "condition_expr": null,
        "default_value": null,
        "display_order": 1,
        "enum_options": [...]
      }
    ],
    "source": "PROJECT"
  }
}
```

---

## 🎨 UI Components (Existing - Need Enhancement)

### **1. AttrBuilder Component**

**Location:** [src/components/dms/admin/AttrBuilder.tsx](../src/components/dms/admin/AttrBuilder.tsx)

**Current State:** Basic structure exists, needs full implementation

**Required Features:**
- ✅ Form with attr_key, attr_name, attr_type fields
- ⚠️ Dynamic controls based on attr_type:
  - `enum` → Enum option editor (add/remove/reorder)
  - `lookup` → SQL source editor with validation
  - `number`/`currency` → Min/max validation rules
  - `date`/`datetime` → Range validation
- ⚠️ Inline validation for attr_key uniqueness
- ⚠️ Help text and validation rules editor
- ⚠️ Preview of how the field will render

**Implementation Needed:**
```typescript
export default function AttrBuilder({
  attribute,
  onSave,
  onCancel,
}: {
  attribute?: Attribute;
  onSave: (attr: CreateAttribute) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<CreateAttribute>({...});
  const [enumOptions, setEnumOptions] = useState<EnumOption[]>([]);

  const handleTypeChange = (type: AttributeType) => {
    // Reset type-specific fields
    setFormData({ ...formData, attr_type: type });
  };

  const renderTypeSpecificControls = () => {
    switch (formData.attr_type) {
      case 'enum':
        return <EnumOptionsEditor options={enumOptions} onChange={setEnumOptions} />;
      case 'lookup':
        return <LookupConfigEditor config={formData.lookup_config} onChange={...} />;
      // ...
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Basic fields */}
      <Input label="Attribute Key" value={formData.attr_key} {...} />
      <Input label="Display Name" value={formData.attr_name} {...} />
      <Select label="Type" value={formData.attr_type} onChange={handleTypeChange} />

      {/* Type-specific controls */}
      {renderTypeSpecificControls()}

      {/* Validation rules */}
      <JsonEditor label="Validation Rules" value={formData.validation_rules} {...} />

      <Button type="submit">Save Attribute</Button>
    </form>
  );
}
```

---

### **2. TemplateDesigner Component**

**Location:** [src/components/dms/admin/TemplateDesigner.tsx](../src/components/dms/admin/TemplateDesigner.tsx)

**Current State:** Basic structure exists, needs full implementation

**Required Features:**
- ⚠️ 3-column layout:
  - **Left:** Available attributes (searchable, filterable by type/scope)
  - **Center:** Required / Optional drop zones (drag-and-drop)
  - **Right:** Rules panel (visibility_rule, condition_expr editors)
- ⚠️ Drag-and-drop assignment (react-dnd)
- ⚠️ Toggle is_required per binding
- ⚠️ JSONLogic editor with syntax highlighting
- ⚠️ Preview modal showing generated form

**Implementation Needed:**
```typescript
export default function TemplateDesigner({
  projectId,
  workspaceId,
  docType,
}: {
  projectId?: number;
  workspaceId?: number;
  docType?: string;
}) {
  const [availableAttrs, setAvailableAttrs] = useState<Attribute[]>([]);
  const [requiredAttrs, setRequiredAttrs] = useState<TemplateBinding[]>([]);
  const [optionalAttrs, setOptionalAttrs] = useState<TemplateBinding[]>([]);
  const [selectedBinding, setSelectedBinding] = useState<TemplateBinding | null>(null);

  // Fetch available attributes
  useEffect(() => {
    fetch('/api/dms/attributes')
      .then(r => r.json())
      .then(data => setAvailableAttrs(data.attributes));
  }, []);

  const handleDrop = (attr: Attribute, zone: 'required' | 'optional') => {
    const binding: TemplateBinding = {
      attr_id: attr.attr_id,
      attr_key: attr.attr_key,
      is_required: zone === 'required',
      display_order: zone === 'required' ? requiredAttrs.length : optionalAttrs.length,
    };

    if (zone === 'required') {
      setRequiredAttrs([...requiredAttrs, binding]);
    } else {
      setOptionalAttrs([...optionalAttrs, binding]);
    }
  };

  const handleSave = async () => {
    const bindings = [...requiredAttrs, ...optionalAttrs];
    await fetch('/api/dms/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_name: `Template for ${docType}`,
        project_id: projectId,
        workspace_id: workspaceId,
        doc_type: docType,
        bindings,
      }),
    });
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="grid grid-cols-12 gap-4">
        {/* Left: Available Attributes */}
        <aside className="col-span-3">
          <SearchBox onSearch={...} />
          <AttributeList attributes={availableAttrs} onDragStart={...} />
        </aside>

        {/* Center: Drop Zones */}
        <main className="col-span-6">
          <DropZone label="Required Attributes" bindings={requiredAttrs} onDrop={...} />
          <DropZone label="Optional Attributes" bindings={optionalAttrs} onDrop={...} />
        </main>

        {/* Right: Rules Panel */}
        <aside className="col-span-3">
          {selectedBinding && (
            <RulesEditor binding={selectedBinding} onChange={...} />
          )}
        </aside>
      </div>

      <Button onClick={handleSave}>Save Template</Button>
      <Button onClick={() => setShowPreview(true)}>Preview Form</Button>
    </DndProvider>
  );
}
```

---

## 🔐 Enforcement in ProfileForm

**Location:** [src/components/dms/profile/ProfileForm.tsx](../src/components/dms/profile/ProfileForm.tsx)

**Required Changes:**

1. **Fetch Effective Template:**
```typescript
useEffect(() => {
  if (projectId && docType) {
    fetch(`/api/dms/templates?project_id=${projectId}&doc_type=${docType}&effective=true`)
      .then(r => r.json())
      .then(data => setTemplate(data.template));
  }
}, [projectId, docType]);
```

2. **Render Fields from Template:**
```typescript
{template.attributes.map(attr => {
  // Evaluate condition_expr
  if (attr.condition_expr) {
    const result = jsonLogic.apply(JSON.parse(attr.condition_expr), formData);
    if (!result) return null; // Hide field
  }

  // Check visibility_rule
  if (attr.visibility_rule) {
    const canView = evaluateVisibilityRule(attr.visibility_rule, currentUser);
    if (!canView) return null; // Hide field
  }

  // Render field based on attr_type
  return (
    <FieldRenderer
      key={attr.attr_key}
      attribute={attr}
      value={formData[attr.attr_key]}
      onChange={(value) => setFormData({ ...formData, [attr.attr_key]: value })}
      error={errors[attr.attr_key]}
    />
  );
})}
```

3. **Validation:**
```typescript
const validate = () => {
  const newErrors: Record<string, string> = {};

  template.attributes.forEach(attr => {
    if (attr.is_required && !formData[attr.attr_key]) {
      newErrors[attr.attr_key] = `${attr.attr_name} is required`;
    }

    // Apply validation_rules
    if (attr.validation_rules) {
      const isValid = validateWithJSONSchema(formData[attr.attr_key], attr.validation_rules);
      if (!isValid) {
        newErrors[attr.attr_key] = 'Invalid value';
      }
    }
  });

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

---

## 🧪 Seed Script

**Location:** `/scripts/seed-dms-attributes.mjs`

```javascript
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function seedAttributes() {
  console.log('🌱 Seeding DMS attributes...');

  // 1. Contract Status (enum)
  const contractStatus = await sql`
    INSERT INTO landscape.dms_attributes (
      attr_key, attr_name, attr_type, attr_description,
      is_required, is_searchable, display_order
    ) VALUES (
      'contract_status',
      'Contract Status',
      'enum',
      'Current status of the contract lifecycle',
      false,
      true,
      10
    )
    RETURNING attr_id
  `;

  const statusAttrId = contractStatus[0].attr_id;

  // Add enum options
  const statusOptions = [
    ['draft', 'Draft', 0],
    ['review', 'Under Review', 1],
    ['approved', 'Approved', 2],
    ['executed', 'Executed', 3],
    ['terminated', 'Terminated', 4],
  ];

  for (const [code, label, order] of statusOptions) {
    await sql`
      INSERT INTO landscape.core_doc_attr_enum (
        attr_id, option_code, label, sort_order, is_active
      ) VALUES (${statusAttrId}, ${code}, ${label}, ${order}, true)
    `;
  }

  console.log(`✅ Created contract_status attribute (id=${statusAttrId})`);

  // 2. Counterparty (lookup)
  const counterparty = await sql`
    INSERT INTO landscape.dms_attributes (
      attr_key, attr_name, attr_type, attr_description,
      is_required, is_searchable, display_order
    ) VALUES (
      'counterparty',
      'Counterparty',
      'lookup',
      'Select the counterparty organization',
      false,
      true,
      20
    )
    RETURNING attr_id
  `;

  const counterpartyAttrId = counterparty[0].attr_id;

  // Add lookup config
  await sql`
    INSERT INTO landscape.core_doc_attr_lookup (
      attr_id, sql_source, cache_ttl, display_fmt
    ) VALUES (
      ${counterpartyAttrId},
      'SELECT contact_id as id, contact_name as name FROM landscape.tbl_contacts WHERE contact_type = ''vendor'' ORDER BY contact_name',
      600,
      '{name}'
    )
  `;

  console.log(`✅ Created counterparty attribute (id=${counterpartyAttrId})`);

  // 3. Create a template for contracts
  const template = await sql`
    INSERT INTO landscape.dms_templates (
      template_name, project_id, doc_type, is_default
    ) VALUES (
      'Default Contract Template',
      1,
      'contract',
      true
    )
    RETURNING template_id
  `;

  const templateId = template[0].template_id;

  // Add bindings
  await sql`
    INSERT INTO landscape.dms_template_attributes (
      template_id, attr_id, is_required, display_order
    ) VALUES
      (${templateId}, ${statusAttrId}, true, 1),
      (${templateId}, ${counterpartyAttrId}, false, 2)
  `;

  console.log(`✅ Created template (id=${templateId}) with 2 attributes`);
  console.log('🎉 Seeding complete!');
}

seedAttributes().catch(console.error);
```

**Run:**
```bash
node scripts/seed-dms-attributes.mjs
```

---

## ✅ Acceptance Criteria Checklist

### Admin Can Create Attributes

- [ ] Create enum attribute with options
- [ ] Create lookup attribute with SQL source
- [ ] Attributes appear in GET /api/dms/attributes list
- [ ] Enum options stored in core_doc_attr_enum
- [ ] Lookup config stored in core_doc_attr_lookup

### Template Designer

- [ ] Assign attributes to project template
- [ ] Mark attributes as Required/Optional
- [ ] Reorder attributes by drag-and-drop
- [ ] Save template with bindings

### ProfileForm Enforcement

- [ ] Fetch effective template for project + doc_type
- [ ] Render only template-defined fields
- [ ] Required fields block save (validation error)
- [ ] Hidden fields don't render (visibility_rule)
- [ ] Conditional fields show/hide based on condition_expr

### Rules & Logic

- [ ] JSONLogic condition_expr evaluates correctly
- [ ] Fields hidden when condition is false
- [ ] visibility_role hides fields for unauthorized users
- [ ] default_value pre-fills fields

### Audit Trail

- [ ] Attribute creation logged (created_at, updated_at)
- [ ] Template changes logged (updated_at)
- [ ] Server logs show attribute/template operations

---

## 🚧 Implementation Status

### ✅ Completed

1. **Database Schema** - All tables exist with proper relationships
2. **Zod Schemas** - Created for attributes and templates
3. **Basic API Routes** - Partial implementation exists

### ⚠️ In Progress

1. **API Endpoints** - Need to implement:
   - Complete POST /api/dms/attributes with enum/lookup support
   - Complete GET /api/dms/attributes with filtering
   - Create POST /api/dms/templates
   - Create GET /api/dms/templates with effective merge

2. **AttrBuilder Component** - Enhance with:
   - Dynamic controls per attr_type
   - Enum option editor
   - Lookup SQL editor with validation
   - Preview mode

3. **TemplateDesigner Component** - Enhance with:
   - 3-column drag-and-drop layout
   - Rules editor (JSONLogic)
   - Preview modal

### ❌ Not Started

1. **ProfileForm Enforcement** - Template-driven field rendering
2. **Validation** - JSONSchema + JSONLogic evaluation
3. **Admin Pages** - Full UI for attribute/template management
4. **Seed Script** - Sample data creation

---

## 🎯 Next Steps

### Phase 1: Complete API Layer (High Priority)

1. Finish implementing POST /api/dms/attributes
   - Handle enum options insertion
   - Handle lookup config insertion
   - Return complete attribute with joins

2. Implement POST /api/dms/templates
   - Insert template record
   - Insert bindings with validation
   - Verify all attr_ids exist and are active

3. Implement GET /api/dms/templates?effective=true
   - Query all templates (GLOBAL → WORKSPACE → PROJECT)
   - Merge bindings (last-writer-wins)
   - Return effective attribute list with overrides

### Phase 2: Enhance UI Components (Medium Priority)

1. Update AttrBuilder
   - Add EnumOptionsEditor subcomponent
   - Add LookupConfigEditor subcomponent
   - Add validation rules editor
   - Add field preview

2. Update TemplateDesigner
   - Implement react-dnd for drag-and-drop
   - Add DropZone components
   - Add RulesEditor panel
   - Add preview modal

### Phase 3: Enforce in ProfileForm (High Priority)

1. Fetch effective template on mount
2. Dynamically render fields from template
3. Evaluate condition_expr with jsonlogic
4. Validate required fields
5. Apply validation_rules (JSONSchema)

### Phase 4: Testing & Documentation (Medium Priority)

1. Create seed script with 5-10 sample attributes
2. Test attribute creation (enum, lookup, text, number)
3. Test template creation and binding
4. Test ProfileForm enforcement
5. Document JSONLogic examples
6. Document SQL lookup patterns

---

## 📚 Reference Documentation

### JSONLogic Examples

**Condition Expression (show field only for contracts):**
```json
{
  "==": [
    { "var": "doc_type" },
    "contract"
  ]
}
```

**Visibility Rule (show only to admins):**
```json
{
  "in": [
    "admin",
    { "var": "user.roles" }
  ]
}
```

**Complex Condition (show if contract AND value > 100k):**
```json
{
  "and": [
    { "==": [{ "var": "doc_type" }, "contract"] },
    { ">": [{ "var": "contract_value" }, 100000] }
  ]
}
```

### SQL Lookup Patterns

**Simple Lookup:**
```sql
SELECT contact_id as id, contact_name as name
FROM landscape.tbl_contacts
WHERE contact_type = 'vendor'
ORDER BY contact_name
```

**Parameterized Lookup (with project_id):**
```sql
SELECT phase_id as id, phase_name as name
FROM landscape.tbl_phase
WHERE project_id = $1
ORDER BY phase_no
```

**Formatted Display:**
```sql
SELECT
  parcel_id as id,
  CONCAT(parcel_name, ' (', parcel_id, ')') as name
FROM landscape.tbl_parcel
WHERE project_id = $1
ORDER BY parcel_name
```

---

## 🔒 Security & Guardrails

### Attribute Code Immutability

- `attr_key` is UNIQUE and cannot be changed after creation
- To rename: deprecate old attribute, create new one
- UI should warn when deprecating (show usage count)

### Enum Option Management

- **Append-only:** Add new options, don't delete
- **Soft Delete:** Use `is_active = false` to hide options
- Preserves historical data integrity

### SQL Lookup Security

- **Read-only:** Only SELECT statements allowed
- **Parameterized:** Use $1, $2 for dynamic values (project_id, etc.)
- **Validation:** Server-side regex to block INSERT/UPDATE/DELETE
- **Timeout:** 5-second query timeout
- **Row Limit:** Max 1000 rows returned

### Template Validation

- Server validates all `attr_id` references exist
- Server validates all `attr_id` references are active
- Server prevents circular dependencies in condition_expr

---

## 📊 Database Queries

### Get All Attributes with Enum Options

```sql
SELECT
  a.attr_id,
  a.attr_key,
  a.attr_name,
  a.attr_type,
  a.attr_description,
  a.is_required,
  a.is_searchable,
  a.display_order,
  json_agg(
    json_build_object(
      'option_code', e.option_code,
      'label', e.label,
      'sort_order', e.sort_order,
      'is_active', e.is_active
    ) ORDER BY e.sort_order, e.label
  ) FILTER (WHERE e.option_code IS NOT NULL) as enum_options
FROM landscape.dms_attributes a
LEFT JOIN landscape.core_doc_attr_enum e ON a.attr_id = e.attr_id
GROUP BY a.attr_id
ORDER BY a.display_order, a.attr_name;
```

### Get Effective Template for Project + Doc Type

```sql
SELECT
  ta.attr_id,
  a.attr_key,
  a.attr_name,
  a.attr_type,
  a.attr_description,
  ta.is_required,
  ta.default_value,
  ta.display_order,
  a.validation_rules
FROM landscape.dms_templates t
JOIN landscape.dms_template_attributes ta ON t.template_id = ta.template_id
JOIN landscape.dms_attributes a ON ta.attr_id = a.attr_id
WHERE t.project_id = $1
  AND (t.doc_type = $2 OR t.doc_type IS NULL)
  AND t.is_default = true
ORDER BY ta.display_order, a.attr_name;
```

---

## ✅ Summary

**Step 5 Status:** Schema complete, APIs partially implemented, UI components ready for enhancement

**What's Complete:**
- ✅ Database schema with all tables and relationships
- ✅ Zod validation schemas
- ✅ Seed script template
- ✅ Documentation and implementation guide

**What's Needed:**
- ⚠️ Complete API implementation (attributes CRUD, templates CRUD, effective merge)
- ⚠️ Enhance AttrBuilder with dynamic controls
- ⚠️ Enhance TemplateDesigner with drag-and-drop
- ⚠️ Update ProfileForm with template enforcement
- ⚠️ Create admin pages

**Estimated Effort:**
- API completion: 4-6 hours
- UI component enhancement: 6-8 hours
- ProfileForm enforcement: 2-3 hours
- Testing & documentation: 2-3 hours
- **Total: 14-20 hours**

**Priority Actions:**
1. Complete POST /api/dms/templates endpoint
2. Implement effective template merge logic
3. Update ProfileForm to use templates
4. Test with seed data

---

**Ready for Step 6 when Step 5 APIs are complete!**
