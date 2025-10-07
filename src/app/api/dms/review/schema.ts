/**
 * Zod Schemas for DMS AI Review & Commit Workflow
 */

import { z } from 'zod';

// Operation types for commit
export const UpdateCoreDocOpZ = z.object({
  type: z.literal('update_core_doc'),
  patch: z.object({
    doc_type: z.string().optional(),
    discipline: z.string().optional(),
    status: z.enum(['draft', 'processing', 'indexed', 'failed', 'archived']).optional(),
    doc_date: z.string().optional(), // ISO date
    contract_value: z.number().optional(),
    priority: z.string().optional(),
    profile_json_merge: z.record(z.any()).optional(), // Deep merge into existing
  }),
});

export const UpsertProjectOpZ = z.object({
  type: z.literal('upsert_project'),
  project_id: z.number().int().positive().optional(), // If updating existing
  values: z.object({
    project_name: z.string().max(255).optional(),
    jurisdiction_city: z.string().max(100).optional(),
    jurisdiction_county: z.string().max(100).optional(),
    jurisdiction_state: z.string().max(2).optional(),
    acres_gross: z.number().positive().optional(),
    project_address: z.string().optional(),
    legal_owner: z.string().optional(),
  }),
});

export const UpsertPhaseRowsOpZ = z.object({
  type: z.literal('upsert_phase_rows'),
  project_id: z.number().int().positive(),
  values: z.array(
    z.object({
      phase_id: z.number().int().positive().optional(), // If updating existing
      phase_no: z.number().int().positive().optional(),
      phase_name: z.string().max(255).optional(),
      label: z.string().optional(),
      description: z.string().optional(),
      area_id: z.number().int().positive().optional(), // Required if creating
    })
  ),
});

export const UpsertParcelRowsOpZ = z.object({
  type: z.literal('upsert_parcel_rows'),
  project_id: z.number().int().positive(),
  values: z.array(
    z.object({
      parcel_id: z.number().int().positive().optional(), // If updating existing
      phase_id: z.number().int().positive().optional(),
      acres_gross: z.number().positive().optional(),
      units_total: z.number().int().nonnegative().optional(),
      plan_density_du_ac: z.number().positive().optional(),
      open_space_ac: z.number().nonnegative().optional(),
      open_space_pct: z.number().min(0).max(100).optional(),
      parcel_name: z.string().optional(),
    })
  ),
});

export const UpsertZoningControlsOpZ = z.object({
  type: z.literal('upsert_zoning_controls'),
  project_id: z.number().int().positive(),
  values: z.array(
    z.object({
      zoning_control_id: z.number().int().positive().optional(), // If updating existing
      parcel_id: z.number().int().positive().optional(),
      zoning_code: z.string().max(50),
      landuse_code: z.string().max(50).optional(),
      site_coverage_pct: z.number().min(0).max(100).optional(),
      site_far: z.number().positive().optional(),
      max_stories: z.number().int().positive().optional(),
      max_height_ft: z.number().positive().optional(),
      parking_ratio_per1000sf: z.number().nonnegative().optional(),
      setback_notes: z.string().optional(),
    })
  ),
});

export const AssertOpZ = z.object({
  type: z.literal('assert'),
  key: z.string(),
  value_num: z.number().optional(),
  value_text: z.string().optional(),
  units: z.string().optional(),
});

// Union of all operation types
export const CommitOperationZ = z.discriminatedUnion('type', [
  UpdateCoreDocOpZ,
  UpsertProjectOpZ,
  UpsertPhaseRowsOpZ,
  UpsertParcelRowsOpZ,
  UpsertZoningControlsOpZ,
  AssertOpZ,
]);

export type CommitOperation = z.infer<typeof CommitOperationZ>;

// Commit request
export const CommitRequestZ = z.object({
  operations: z.array(CommitOperationZ).min(1),
  user_feedback: z.string().optional(),
  ai_confidence: z.number().min(0).max(1).optional(),
});

export type CommitRequest = z.infer<typeof CommitRequestZ>;

// Reject request
export const RejectRequestZ = z.object({
  reason: z.string().min(1),
  user_feedback: z.string().optional(),
});

export type RejectRequest = z.infer<typeof RejectRequestZ>;

// Review context response
export const ReviewContextZ = z.object({
  doc: z.object({
    doc_id: z.number().int(),
    doc_name: z.string(),
    doc_type: z.string(),
    discipline: z.string().nullable(),
    status: z.string(),
    version_no: z.number().int(),
    project_id: z.number().int(),
    storage_uri: z.string(),
    profile_json: z.record(z.any()),
    created_at: z.string(),
    updated_at: z.string(),
  }),
  ai_analysis: z.object({
    mapped: z.record(z.any()).optional(),
    unmapped: z.record(z.any()).optional(),
    warnings: z.array(z.string()).optional(),
    assertions: z.array(z.any()).optional(),
    confidence: z.number().min(0).max(1).optional(),
  }).nullable(),
  template: z.object({
    attributes: z.array(z.any()),
  }).nullable(),
  project: z.object({
    project_id: z.number().int(),
    project_name: z.string(),
  }).nullable(),
});

export type ReviewContext = z.infer<typeof ReviewContextZ>;

// Validation warning
export const ValidationWarningZ = z.object({
  field: z.string(),
  message: z.string(),
  severity: z.enum(['error', 'warning', 'info']),
});

export type ValidationWarning = z.infer<typeof ValidationWarningZ>;
