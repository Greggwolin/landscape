/**
 * DMS Document Creation Schema
 * Validation for POST /api/dms/docs
 */

import { z } from 'zod';

/**
 * System fields (required metadata)
 */
export const SystemZ = z.object({
  project_id: z.number().int().positive(),
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
});

export type CreateDocInput = z.infer<typeof CreateDocZ>;
export type SystemInput = z.infer<typeof SystemZ>;
