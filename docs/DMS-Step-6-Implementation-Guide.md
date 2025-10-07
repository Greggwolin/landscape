# DMS Step 6 — AI Review & Commit Workflow Implementation Guide

**Status:** Schema Ready, APIs to be Implemented, UI Components Specified
**Date:** October 7, 2025

---

## 📋 Overview

Step 6 implements the reviewer workflow that allows users to inspect AI-extracted data, approve/adjust field mappings, and commit changes into normalized database tables with full audit trail. This is the critical bridge between AI extraction (document ingestion) and validated data entry.

---

## 🎯 Goal

Enable reviewers to:
1. **Inspect** AI extraction results (mapped fields, unmapped data, warnings)
2. **Validate** proposed changes against business rules and templates
3. **Edit** field values before committing
4. **Commit** approved changes atomically to normalized tables
5. **Reject** extractions that are too low quality
6. **Audit** all review actions with full history

---

## 🗄️ Database Schema (Existing)

### **`landscape.ai_review_history`**

```sql
CREATE TABLE landscape.ai_review_history (
  review_id     SERIAL PRIMARY KEY,
  project_id    INTEGER NOT NULL REFERENCES tbl_project(project_id),
  action_type   VARCHAR(50) NOT NULL,  -- 'commit' | 'reject' | 'draft'
  field_updates JSONB,                  -- Operations applied
  user_feedback TEXT,                   -- Reviewer notes
  ai_confidence NUMERIC(3,2),           -- 0.00 to 1.00
  created_at    TIMESTAMPTZ DEFAULT now(),
  created_by    VARCHAR(100)
);

CREATE INDEX idx_ai_review_history_project_id ON landscape.ai_review_history(project_id);
CREATE INDEX idx_ai_review_history_action_type ON landscape.ai_review_history(action_type);
CREATE INDEX idx_ai_review_history_created_at ON landscape.ai_review_history(created_at);
```

**Note:** Table already exists and needs a `doc_id` column added:

```sql
ALTER TABLE landscape.ai_review_history
ADD COLUMN doc_id BIGINT REFERENCES landscape.core_doc(doc_id);

CREATE INDEX idx_ai_review_history_doc_id ON landscape.ai_review_history(doc_id);
```

### **`landscape.ai_ingestion_history`** (Existing)

Contains AI extraction results:
- `project_id` - Project context
- `package_name` - Source of extraction (e.g., 'gis-setup')
- `documents` - JSONB with doc_ids extracted
- `ai_analysis` - **Full AI extraction JSON** (mapped/unmapped/warnings)
- `created_at`, `created_by`

---

## 📁 Files Created

### **1. Zod Schemas** ([schema.ts](../src/app/api/dms/review/schema.ts))

#### **Commit Operations**

```typescript
// Operation types
export const UpdateCoreDocOpZ = z.object({
  type: z.literal('update_core_doc'),
  patch: z.object({
    doc_type: z.string().optional(),
    discipline: z.string().optional(),
    status: z.enum(['draft', 'processing', 'indexed', 'failed', 'archived']).optional(),
    doc_date: z.string().optional(),
    contract_value: z.number().optional(),
    priority: z.string().optional(),
    profile_json_merge: z.record(z.any()).optional(),
  }),
});

export const UpsertProjectOpZ = z.object({
  type: z.literal('upsert_project'),
  project_id: z.number().int().positive().optional(),
  values: z.object({
    project_name: z.string().max(255).optional(),
    jurisdiction_city: z.string().max(100).optional(),
    jurisdiction_county: z.string().max(100).optional(),
    jurisdiction_state: z.string().max(2).optional(),
    acres_gross: z.number().positive().optional(),
  }),
});

export const UpsertPhaseRowsOpZ = z.object({
  type: z.literal('upsert_phase_rows'),
  project_id: z.number().int().positive(),
  values: z.array(z.object({
    phase_id: z.number().int().positive().optional(),
    phase_no: z.number().int().positive().optional(),
    phase_name: z.string().max(255).optional(),
    label: z.string().optional(),
    description: z.string().optional(),
  })),
});

export const UpsertParcelRowsOpZ = z.object({
  type: z.literal('upsert_parcel_rows'),
  project_id: z.number().int().positive(),
  values: z.array(z.object({
    parcel_id: z.number().int().positive().optional(),
    phase_id: z.number().int().positive().optional(),
    acres_gross: z.number().positive().optional(),
    units_total: z.number().int().nonnegative().optional(),
    plan_density_du_ac: z.number().positive().optional(),
    open_space_ac: z.number().nonnegative().optional(),
    open_space_pct: z.number().min(0).max(100).optional(),
  })),
});

export const UpsertZoningControlsOpZ = z.object({
  type: z.literal('upsert_zoning_controls'),
  project_id: z.number().int().positive(),
  values: z.array(z.object({
    zoning_control_id: z.number().int().positive().optional(),
    parcel_id: z.number().int().positive().optional(),
    zoning_code: z.string().max(50),
    landuse_code: z.string().max(50).optional(),
    site_coverage_pct: z.number().min(0).max(100).optional(),
    site_far: z.number().positive().optional(),
    max_stories: z.number().int().positive().optional(),
    max_height_ft: z.number().positive().optional(),
  })),
});

export const AssertOpZ = z.object({
  type: z.literal('assert'),
  key: z.string(),
  value_num: z.number().optional(),
  value_text: z.string().optional(),
  units: z.string().optional(),
});

export const CommitOperationZ = z.discriminatedUnion('type', [
  UpdateCoreDocOpZ,
  UpsertProjectOpZ,
  UpsertPhaseRowsOpZ,
  UpsertParcelRowsOpZ,
  UpsertZoningControlsOpZ,
  AssertOpZ,
]);
```

#### **Request Bodies**

```typescript
export const CommitRequestZ = z.object({
  operations: z.array(CommitOperationZ).min(1),
  user_feedback: z.string().optional(),
  ai_confidence: z.number().min(0).max(1).optional(),
});

export const RejectRequestZ = z.object({
  reason: z.string().min(1),
  user_feedback: z.string().optional(),
});
```

---

## 🔌 API Endpoints (To Be Implemented)

### **GET /api/dms/review/:docId**

Fetch document, AI analysis, and template context for review.

**Implementation:**

```typescript
// src/app/api/dms/review/[docId]/route.ts
import { sql } from '@/lib/dms/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  try {
    const { docId } = await params;
    const doc_id = Number(docId);

    // 1. Fetch document
    const docs = await sql`
      SELECT
        doc_id, doc_name, doc_type, discipline, status, version_no,
        project_id, storage_uri, profile_json, created_at, updated_at
      FROM landscape.core_doc
      WHERE doc_id = ${doc_id}
    `;

    if (!docs.length) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = docs[0];

    // 2. Fetch latest AI analysis
    const ingestions = await sql`
      SELECT ai_analysis, created_at
      FROM landscape.ai_ingestion_history
      WHERE documents @> jsonb_build_object('doc_ids', jsonb_build_array(${doc_id}))
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const ai_analysis = ingestions.length > 0 ? ingestions[0].ai_analysis : null;

    // 3. Fetch effective template
    let template = null;
    if (doc.project_id && doc.doc_type) {
      const templateResp = await fetch(
        `http://localhost:3007/api/dms/templates?project_id=${doc.project_id}&doc_type=${doc.doc_type}&effective=true`
      );
      if (templateResp.ok) {
        const templateData = await templateResp.json();
        template = templateData.template;
      }
    }

    // 4. Fetch project info
    const projects = await sql`
      SELECT project_id, project_name
      FROM landscape.tbl_project
      WHERE project_id = ${doc.project_id}
    `;

    const project = projects.length > 0 ? projects[0] : null;

    return NextResponse.json({
      success: true,
      doc,
      ai_analysis,
      template,
      project,
    });

  } catch (error: any) {
    console.error('❌ GET /api/dms/review/:docId error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review context', message: error.message },
      { status: 500 }
    );
  }
}
```

**Response:**

```json
{
  "success": true,
  "doc": {
    "doc_id": 123,
    "doc_name": "plat-map.pdf",
    "doc_type": "plat",
    "project_id": 1,
    "profile_json": {...}
  },
  "ai_analysis": {
    "mapped": {
      "tbl_project": [{"project_name": "Vista Ridge", "acres_gross": 45.2}],
      "tbl_phase": [{"phase_no": 1, "phase_name": "Phase 1", "description": "Initial development"}],
      "tbl_parcel": [...]
    },
    "unmapped": {
      "developer_notes": "Contact John for survey revisions"
    },
    "warnings": [
      "Phase 2 acres_gross (12.3) + Phase 3 acres_gross (15.1) != project acres_gross (45.2)"
    ],
    "confidence": 0.87
  },
  "template": {
    "attributes": [...]
  },
  "project": {
    "project_id": 1,
    "project_name": "Vista Ridge"
  }
}
```

---

### **POST /api/dms/review/:docId/commit**

Apply approved operations in a transaction.

**Implementation:**

```typescript
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  try {
    const { docId } = await params;
    const doc_id = Number(docId);
    const body = await req.json();
    const { operations, user_feedback, ai_confidence } = CommitRequestZ.parse(body);

    console.log(`📝 Committing ${operations.length} operations for doc ${doc_id}`);

    // Fetch document for project_id
    const docs = await sql`
      SELECT project_id FROM landscape.core_doc WHERE doc_id = ${doc_id}
    `;

    if (!docs.length) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const project_id = docs[0].project_id;

    // Start transaction (using sql.begin if supported, or manual BEGIN/COMMIT)
    await sql`BEGIN`;

    try {
      // Apply operations
      for (const op of operations) {
        await applyOperation(op, doc_id, project_id);
      }

      // Write audit record
      await sql`
        INSERT INTO landscape.ai_review_history (
          doc_id, project_id, action_type, field_updates,
          user_feedback, ai_confidence, created_by
        ) VALUES (
          ${doc_id},
          ${project_id},
          'commit',
          ${JSON.stringify(operations)}::jsonb,
          ${user_feedback || null},
          ${ai_confidence || null},
          'system'
        )
      `;

      // Commit transaction
      await sql`COMMIT`;

      console.log(`✅ Committed ${operations.length} operations for doc ${doc_id}`);

      // Trigger re-index (async)
      fetch(`http://localhost:3007/api/dms/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh_mv' }),
      }).catch(console.error);

      return NextResponse.json({
        success: true,
        operations_applied: operations.length,
        doc_id,
      });

    } catch (opError) {
      await sql`ROLLBACK`;
      throw opError;
    }

  } catch (error: any) {
    console.error('❌ POST /api/dms/review/:docId/commit error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Commit failed', message: error.message },
      { status: 500 }
    );
  }
}

// Helper: Apply individual operation
async function applyOperation(op: CommitOperation, doc_id: number, project_id: number) {
  switch (op.type) {
    case 'update_core_doc':
      await applyUpdateCoreDoc(op, doc_id);
      break;
    case 'upsert_project':
      await applyUpsertProject(op, project_id);
      break;
    case 'upsert_phase_rows':
      await applyUpsertPhaseRows(op);
      break;
    case 'upsert_parcel_rows':
      await applyUpsertParcelRows(op);
      break;
    case 'upsert_zoning_controls':
      await applyUpsertZoningControls(op);
      break;
    case 'assert':
      // Assertions are for validation only, not applied
      console.log('✓ Assertion:', op.key, op.value_num || op.value_text);
      break;
  }
}

async function applyUpdateCoreDoc(op: UpdateCoreDocOp, doc_id: number) {
  const { patch } = op;
  const updates: string[] = [];
  const values: any[] = [];

  if (patch.doc_type) {
    updates.push(`doc_type = $${updates.length + 1}`);
    values.push(patch.doc_type);
  }
  if (patch.discipline) {
    updates.push(`discipline = $${updates.length + 1}`);
    values.push(patch.discipline);
  }
  if (patch.status) {
    updates.push(`status = $${updates.length + 1}`);
    values.push(patch.status);
  }
  if (patch.doc_date) {
    updates.push(`doc_date = $${updates.length + 1}`);
    values.push(patch.doc_date);
  }
  if (patch.contract_value) {
    updates.push(`contract_value = $${updates.length + 1}`);
    values.push(patch.contract_value);
  }
  if (patch.priority) {
    updates.push(`priority = $${updates.length + 1}`);
    values.push(patch.priority);
  }

  // Profile JSON merge
  if (patch.profile_json_merge) {
    updates.push(`profile_json = profile_json || $${updates.length + 1}::jsonb`);
    values.push(JSON.stringify(patch.profile_json_merge));
  }

  if (updates.length === 0) return;

  updates.push(`updated_at = now()`);
  values.push(doc_id);

  const query = `
    UPDATE landscape.core_doc
    SET ${updates.join(', ')}
    WHERE doc_id = $${values.length}
  `;

  await sql.unsafe(query, values);
}

async function applyUpsertProject(op: UpsertProjectOp, project_id: number) {
  const { values } = op;
  const target_id = op.project_id || project_id;

  // Build UPDATE or INSERT
  const fields = Object.keys(values);
  const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
  const vals = Object.values(values);

  await sql.unsafe(`
    UPDATE landscape.tbl_project
    SET ${setClause}
    WHERE project_id = $${vals.length + 1}
  `, [...vals, target_id]);
}

async function applyUpsertPhaseRows(op: UpsertPhaseRowsOp) {
  for (const row of op.values) {
    if (row.phase_id) {
      // Update existing
      const fields = Object.entries(row).filter(([k]) => k !== 'phase_id');
      if (fields.length === 0) continue;

      const setClause = fields.map(([k], i) => `${k} = $${i + 1}`).join(', ');
      const vals = fields.map(([, v]) => v);

      await sql.unsafe(`
        UPDATE landscape.tbl_phase
        SET ${setClause}
        WHERE phase_id = $${vals.length + 1}
      `, [...vals, row.phase_id]);
    } else {
      // Insert new
      const fields = Object.keys(row);
      const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
      const vals = Object.values(row);

      await sql.unsafe(`
        INSERT INTO landscape.tbl_phase (${fields.join(', ')})
        VALUES (${placeholders})
      `, vals);
    }
  }
}

// Similar implementations for applyUpsertParcelRows and applyUpsertZoningControls
```

---

### **POST /api/dms/review/:docId/reject**

Reject AI extraction with reason.

**Implementation:**

```typescript
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  try {
    const { docId } = await params;
    const doc_id = Number(docId);
    const body = await req.json();
    const { reason, user_feedback } = RejectRequestZ.parse(body);

    console.log(`🚫 Rejecting doc ${doc_id}: ${reason}`);

    // Fetch document for project_id
    const docs = await sql`
      SELECT project_id FROM landscape.core_doc WHERE doc_id = ${doc_id}
    `;

    if (!docs.length) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const project_id = docs[0].project_id;

    // Write audit record (no data changes)
    await sql`
      INSERT INTO landscape.ai_review_history (
        doc_id, project_id, action_type, field_updates,
        user_feedback, created_by
      ) VALUES (
        ${doc_id},
        ${project_id},
        'reject',
        ${JSON.stringify({ reason })}::jsonb,
        ${user_feedback || null},
        'system'
      )
    `;

    // Optionally update doc status to 'failed'
    await sql`
      UPDATE landscape.core_doc
      SET status = 'failed', updated_at = now()
      WHERE doc_id = ${doc_id}
    `;

    console.log(`✅ Rejected doc ${doc_id}`);

    return NextResponse.json({
      success: true,
      action: 'reject',
      doc_id,
    });

  } catch (error: any) {
    console.error('❌ POST /api/dms/review/:docId/reject error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Reject failed', message: error.message },
      { status: 500 }
    );
  }
}
```

---

## 🎨 UI Components (To Be Implemented)

### **1. ReviewPanel Component**

**Location:** `src/components/dms/review/ReviewPanel.tsx`

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Header: doc_name | doc_type | AI Confidence: 87%    │
├──────────────────────┬──────────────────────────────┤
│ LEFT: AI JSON        │ RIGHT: Proposed Changes      │
│                      │                              │
│ {                    │ ☑ Update Core Doc            │
│   "mapped": {        │   doc_type: "plat"           │
│     "tbl_project": [ │   status: "indexed"          │
│       {              │                              │
│         "project_... │ ☑ Update Project             │
│       }              │   project_name: "Vista Ridge"│
│     ]                │   acres_gross: 45.2          │
│   },                 │                              │
│   "warnings": [      │ ⚠️ 2 Warnings                │
│     "Acres mis..."   │   - Acres mismatch           │
│   ]                  │   - Missing zoning code      │
│ }                    │                              │
└──────────────────────┴──────────────────────────────┘
│ [Commit Approved] [Reject] [Save Draft]             │
└─────────────────────────────────────────────────────┘
```

**Implementation:**

```typescript
export default function ReviewPanel({
  docId,
}: {
  docId: number;
}) {
  const [context, setContext] = useState<ReviewContext | null>(null);
  const [operations, setOperations] = useState<CommitOperation[]>([]);
  const [warnings, setWarnings] = useState<ValidationWarning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/dms/review/${docId}`)
      .then(r => r.json())
      .then(data => {
        setContext(data);
        // Auto-generate operations from AI analysis
        const ops = generateOperations(data.ai_analysis);
        setOperations(ops);
        // Extract warnings
        setWarnings(data.ai_analysis?.warnings?.map(w => ({
          field: 'general',
          message: w,
          severity: 'warning',
        })) || []);
        setLoading(false);
      });
  }, [docId]);

  const handleCommit = async () => {
    const confirmed = window.confirm(
      `Commit ${operations.length} operations?\n\n` +
      operations.map(op => `- ${op.type}`).join('\n')
    );

    if (!confirmed) return;

    const resp = await fetch(`/api/dms/review/${docId}/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operations,
        ai_confidence: context?.ai_analysis?.confidence,
      }),
    });

    if (resp.ok) {
      alert('✅ Changes committed successfully!');
      // Redirect or refresh
    } else {
      const error = await resp.json();
      alert(`❌ Commit failed: ${error.message}`);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;

    const resp = await fetch(`/api/dms/review/${docId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });

    if (resp.ok) {
      alert('✅ Extraction rejected');
      // Redirect
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Left: AI JSON */}
      <div className="bg-gray-50 p-4 rounded">
        <h3 className="font-semibold mb-2">AI Extraction</h3>
        <pre className="text-xs overflow-auto max-h-96">
          {JSON.stringify(context?.ai_analysis, null, 2)}
        </pre>
      </div>

      {/* Right: Proposed Changes */}
      <div>
        <h3 className="font-semibold mb-2">Proposed Changes</h3>
        <FieldMapper operations={operations} onChange={setOperations} />
        <WarnList warnings={warnings} />
      </div>

      {/* Actions */}
      <div className="col-span-2 flex gap-2">
        <button
          onClick={handleCommit}
          disabled={warnings.some(w => w.severity === 'error')}
          className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
        >
          Commit Approved
        </button>
        <button
          onClick={handleReject}
          className="px-4 py-2 bg-red-600 text-white rounded"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
```

---

### **2. FieldMapper Component**

**Location:** `src/components/dms/review/FieldMapper.tsx`

**Purpose:** Render operations as editable table rows with selection checkboxes.

```typescript
export default function FieldMapper({
  operations,
  onChange,
}: {
  operations: CommitOperation[];
  onChange: (ops: CommitOperation[]) => void;
}) {
  const [selectedOps, setSelectedOps] = useState<Set<number>>(
    new Set(operations.map((_, i) => i))
  );

  const toggleOp = (index: number) => {
    const newSelected = new Set(selectedOps);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedOps(newSelected);

    // Update operations list (remove unchecked)
    const filtered = operations.filter((_, i) => newSelected.has(i));
    onChange(filtered);
  };

  const updateOp = (index: number, updates: Partial<CommitOperation>) => {
    const updated = [...operations];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {operations.map((op, index) => (
        <div key={index} className="border rounded p-3">
          <label className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={selectedOps.has(index)}
              onChange={() => toggleOp(index)}
            />
            <span className="font-semibold">{op.type}</span>
          </label>

          {/* Render fields based on op type */}
          {op.type === 'update_core_doc' && (
            <div className="space-y-2 pl-6">
              <Input
                label="Doc Type"
                value={op.patch.doc_type || ''}
                onChange={e => updateOp(index, {
                  patch: { ...op.patch, doc_type: e.target.value }
                })}
              />
              <Input
                label="Discipline"
                value={op.patch.discipline || ''}
                onChange={e => updateOp(index, {
                  patch: { ...op.patch, discipline: e.target.value }
                })}
              />
            </div>
          )}

          {op.type === 'upsert_project' && (
            <div className="space-y-2 pl-6">
              <Input
                label="Project Name"
                value={op.values.project_name || ''}
                onChange={e => updateOp(index, {
                  values: { ...op.values, project_name: e.target.value }
                })}
              />
              <Input
                label="Acres"
                type="number"
                value={op.values.acres_gross || ''}
                onChange={e => updateOp(index, {
                  values: { ...op.values, acres_gross: parseFloat(e.target.value) }
                })}
              />
            </div>
          )}

          {/* Similar for other operation types */}
        </div>
      ))}
    </div>
  );
}
```

---

### **3. WarnList Component**

**Location:** `src/components/dms/review/WarnList.tsx`

**Purpose:** Display validation warnings with severity indicators.

```typescript
export default function WarnList({
  warnings,
}: {
  warnings: ValidationWarning[];
}) {
  if (warnings.length === 0) {
    return (
      <div className="p-4 bg-green-50 text-green-800 rounded">
        ✅ No validation warnings
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-4">
      <h4 className="font-semibold">Validation Warnings</h4>
      {warnings.map((warning, i) => (
        <div
          key={i}
          className={`p-3 rounded flex items-start gap-2 ${
            warning.severity === 'error'
              ? 'bg-red-50 text-red-800'
              : warning.severity === 'warning'
              ? 'bg-yellow-50 text-yellow-800'
              : 'bg-blue-50 text-blue-800'
          }`}
        >
          <span className="text-xl">
            {warning.severity === 'error' ? '❌' : warning.severity === 'warning' ? '⚠️' : 'ℹ️'}
          </span>
          <div>
            <div className="font-semibold">{warning.field}</div>
            <div className="text-sm">{warning.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 📄 Review Page

**Location:** `src/app/(dms)/documents/[id]/review/page.tsx`

```typescript
'use client';

import { use } from 'react';
import ReviewPanel from '@/components/dms/review/ReviewPanel';

export default function DocumentReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">AI Extraction Review</h1>
      <ReviewPanel docId={Number(id)} />
    </div>
  );
}
```

---

## ✅ Validation Rules

### **Numeric Validations**

```typescript
function validateNumeric(value: number, field: string): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!isFinite(value)) {
    warnings.push({
      field,
      message: 'Value must be a finite number',
      severity: 'error',
    });
  }

  return warnings;
}
```

### **Percent Validations**

```typescript
function validatePercent(value: number, field: string): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (value < 0 || value > 100) {
    warnings.push({
      field,
      message: 'Percent must be between 0 and 100',
      severity: 'error',
    });
  }

  return warnings;
}
```

### **Parcel Density Validation**

```typescript
function validateParcelDensity(parcel: {
  acres_gross?: number;
  units_total?: number;
  plan_density_du_ac?: number;
}): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (parcel.units_total && parcel.plan_density_du_ac && parcel.acres_gross) {
    const impliedUnits = parcel.plan_density_du_ac * parcel.acres_gross;
    const diff = Math.abs(impliedUnits - parcel.units_total);
    const pct = (diff / parcel.units_total) * 100;

    if (pct > 5) {
      warnings.push({
        field: 'units_total',
        message: `Units (${parcel.units_total}) differs from density calc (${impliedUnits.toFixed(1)}) by ${pct.toFixed(1)}%`,
        severity: 'warning',
      });
    }
  }

  return warnings;
}
```

---

## 🔐 Security & Authorization

### **Role-Based Access**

```typescript
// Middleware to check user role
async function requireRole(req: NextRequest, minRole: string) {
  const session = await getSession(req);

  if (!session || !session.user) {
    throw new Error('Unauthorized');
  }

  const userRole = session.user.role;
  const roleHierarchy = ['viewer', 'editor', 'project_manager', 'admin'];

  const userLevel = roleHierarchy.indexOf(userRole);
  const minLevel = roleHierarchy.indexOf(minRole);

  if (userLevel < minLevel) {
    throw new Error(`Requires ${minRole} role or higher`);
  }
}

// In commit endpoint
await requireRole(req, 'project_manager');
```

### **Confirmation Dialog**

```typescript
const handleCommit = async () => {
  const summary = operations.map(op => {
    switch (op.type) {
      case 'update_core_doc':
        return `Update document: ${Object.keys(op.patch).join(', ')}`;
      case 'upsert_project':
        return `Update project: ${Object.keys(op.values).join(', ')}`;
      // ...
    }
  }).join('\n');

  const confirmed = window.confirm(
    `⚠️ COMMIT CONFIRMATION\n\n` +
    `This will apply ${operations.length} operations:\n\n` +
    summary +
    `\n\nProceed?`
  );

  if (!confirmed) return;

  // ... proceed with commit
};
```

---

## 🧪 Testing

### **Manual Test Flow**

1. **Upload document** with AI extraction
2. **Navigate** to `/documents/[id]/review`
3. **Inspect** AI analysis JSON
4. **Edit** field values in FieldMapper
5. **Validate** no errors blocking commit
6. **Click "Commit Approved"** → Confirm dialog
7. **Verify** changes in database:

```sql
-- Check ai_review_history
SELECT * FROM landscape.ai_review_history
WHERE doc_id = 123 ORDER BY created_at DESC LIMIT 1;

-- Check updated project
SELECT * FROM landscape.tbl_project WHERE project_id = 1;

-- Check phases
SELECT * FROM landscape.tbl_phase WHERE project_id = 1;
```

8. **Test reject** flow → No data changes

---

## 📊 Database Queries

### **Get Review History**

```sql
SELECT
  review_id,
  doc_id,
  action_type,
  field_updates,
  user_feedback,
  ai_confidence,
  created_at,
  created_by
FROM landscape.ai_review_history
WHERE doc_id = $1
ORDER BY created_at DESC;
```

### **Get Latest AI Analysis**

```sql
SELECT
  ai_analysis,
  created_at
FROM landscape.ai_ingestion_history
WHERE documents @> jsonb_build_object('doc_ids', jsonb_build_array($1))
ORDER BY created_at DESC
LIMIT 1;
```

---

## ✅ Acceptance Criteria Checklist

- [ ] Reviewer can open document review page
- [ ] AI-extracted data displayed in left panel (mapped/unmapped/warnings)
- [ ] Proposed changes displayed in right panel (editable)
- [ ] Operations can be toggled on/off with checkboxes
- [ ] Field values can be edited before commit
- [ ] Warnings displayed with severity (error blocks commit)
- [ ] Commit applies all operations atomically (transaction)
- [ ] Commit writes to normalized tables (tbl_project, tbl_phase, etc.)
- [ ] Commit merges profile_json patches
- [ ] Commit writes ai_review_history audit record
- [ ] Commit triggers MV refresh and Meilisearch re-index
- [ ] Reject records reason with no data changes
- [ ] Reject updates doc status to 'failed'
- [ ] Confirmation dialog before commit
- [ ] Role enforcement (project_manager required)
- [ ] Idempotent operations (safe to re-run)

---

## 🚀 Implementation Status

### ✅ Completed

1. **Zod Schemas** - All operation types defined
2. **Database Schema** - ai_review_history exists (needs doc_id column)
3. **Implementation Guide** - Complete specification

### ⚠️ In Progress

1. **API Endpoints** - Specifications written, need implementation
2. **UI Components** - Designs documented, need implementation

### ❌ Not Started

1. **ReviewPanel Component** - Split view with JSON + changes
2. **FieldMapper Component** - Editable operation fields
3. **WarnList Component** - Validation warnings display
4. **Review Page** - Document review UI
5. **Validation Logic** - Business rule validation
6. **Authorization Middleware** - Role-based access
7. **Testing** - End-to-end flow

---

## 📈 Next Steps

### Phase 1: Database Schema (High Priority)

```sql
ALTER TABLE landscape.ai_review_history
ADD COLUMN doc_id BIGINT REFERENCES landscape.core_doc(doc_id);

CREATE INDEX idx_ai_review_history_doc_id
ON landscape.ai_review_history(doc_id);
```

### Phase 2: API Implementation (High Priority)

1. Implement GET /api/dms/review/[docId]
2. Implement POST /api/dms/review/[docId]/commit with transaction
3. Implement POST /api/dms/review/[docId]/reject
4. Add operation application helpers (applyUpdateCoreDoc, etc.)
5. Add validation helpers

### Phase 3: UI Components (Medium Priority)

1. Create ReviewPanel with split view
2. Create FieldMapper with editable rows
3. Create WarnList with severity indicators
4. Create review page route
5. Wire components together

### Phase 4: Validation & Security (High Priority)

1. Implement numeric/percent/density validations
2. Add role-based authorization
3. Add confirmation dialogs
4. Test transaction rollback on errors

### Phase 5: Testing (Medium Priority)

1. Manual test with sample document
2. Test all operation types
3. Test validation rules
4. Test reject flow
5. Verify audit trail

---

## 🎯 Estimated Effort

- **API Implementation:** 6-8 hours
- **UI Components:** 8-10 hours
- **Validation Logic:** 3-4 hours
- **Authorization:** 2-3 hours
- **Testing:** 3-4 hours
- **Total:** 22-29 hours

---

## 📚 Resources

### **JSONLogic for Conditions**
- https://jsonlogic.com/
- Use for template condition_expr evaluation

### **JSONB Deep Merge (PostgreSQL)**
```sql
-- Merge profile_json
UPDATE core_doc
SET profile_json = profile_json || $1::jsonb
WHERE doc_id = $2;
```

### **Transaction Pattern**
```typescript
await sql`BEGIN`;
try {
  // ... operations
  await sql`COMMIT`;
} catch (error) {
  await sql`ROLLBACK`;
  throw error;
}
```

---

## ✅ Summary

**Step 6 Status:** Schemas complete, APIs specified, UI documented

**What's Complete:**
- ✅ Zod schemas for all operation types
- ✅ Database schema verified (needs minor update)
- ✅ Complete implementation guide
- ✅ API specifications with code examples
- ✅ UI component designs
- ✅ Validation patterns
- ✅ Security requirements

**What's Needed:**
- ⚠️ Implement 3 API endpoints
- ⚠️ Implement 3 UI components
- ⚠️ Add validation logic
- ⚠️ Add authorization middleware
- ⚠️ Test end-to-end

**Priority:** High (Critical for AI workflow)

**Ready for implementation when Step 5 template enforcement is complete!**
