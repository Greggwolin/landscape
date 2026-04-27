/**
 * DMS Document Creation Schema
 * Validation for POST /api/dms/docs
 */

import { z } from 'zod';

/**
 * System fields (required metadata)
 *
 * Either `project_id` OR `thread_id` is required (enforced by superRefine
 * on CreateDocZ below). thread_id is used for unassigned-chat uploads —
 * the doc lives against a chat thread until the thread is promoted to a
 * project (see /api/landscaper/threads/{id}/promote/).
 */
export const SystemZ = z.object({
  project_id: z.number().int().positive().optional(),
  thread_id: z.string().uuid().optional(),
  workspace_id: z.number().int().positive().optional(), // Map to area_id in spec
  area_id: z.number().int().positive().optional(),
  phase_id: z.number().int().positive().optional(),
  parcel_id: z.number().int().positive().optional(),

  doc_name: z.string().min(1).max(500),
  doc_type: z.string().min(1).max(100).default('general'),
  discipline: z.string().max(100).optional(),

  status: z
    .enum(['draft', 'processing', 'indexed', 'failed', 'archived'])
    .default('draft'),

  storage_uri: z.string().url(),
  sha256: z.string().length(64),

  file_size_bytes: z.number().int().positive().optional(),
  mime_type: z.string().max(100).optional(),

  version_no: z.number().int().positive().default(1),
  parent_doc_id: z.number().int().positive().optional(),

  uploaded_by: z.number().int().positive().optional(),

  /** Post-upload routing intent. Controls which extraction pipeline runs. */
  intent: z.enum(['structured_ingestion', 'global_intelligence', 'dms_only', 'project_knowledge', 'platform_knowledge']).optional(),
});

/**
 * Profile fields (custom attributes - JSONB)
 */
export const ProfileZ = z.record(z.any()).optional();

/**
 * AI ingestion metadata (optional)
 */
export const AIMetaZ = z.object({
  source: z.string().optional(),
  raw: z.any().optional(),
}).optional();

/**
 * Complete document creation payload
 */
export const CreateDocZ = z.object({
  system: SystemZ,
  profile: ProfileZ,
  ai: AIMetaZ,
}).superRefine((data, ctx) => {
  if (!data.system.project_id && !data.system.thread_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Either system.project_id or system.thread_id is required',
      path: ['system'],
    });
  }
});

export type CreateDocInput = z.infer<typeof CreateDocZ>;
export type SystemInput = z.infer<typeof SystemZ>;
