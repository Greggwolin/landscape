import { z } from 'zod';

/**
 * Smart filter query structure (same as search API)
 */
export const FilterQueryZ = z.object({
  q: z.string().optional(), // Full-text search query
  doc_type: z.string().optional(),
  discipline: z.string().optional(),
  status: z.enum(['draft', 'processing', 'indexed', 'failed', 'archived']).optional(),
  project_id: z.number().int().positive().optional(),
  workspace_id: z.number().int().positive().optional(),
  folder_id: z.number().int().positive().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  // Profile fields (custom attributes)
  profile: z.record(z.any()).optional(),
});

export type FilterQuery = z.infer<typeof FilterQueryZ>;

/**
 * Smart filter
 */
export const SmartFilterZ = z.object({
  filter_id: z.number().int().positive(),
  name: z.string().min(1).max(255),
  query: FilterQueryZ,
  is_active: z.boolean().default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type SmartFilter = z.infer<typeof SmartFilterZ>;

/**
 * Create smart filter request
 */
export const CreateSmartFilterZ = z.object({
  name: z.string().min(1).max(255),
  query: FilterQueryZ,
});

export type CreateSmartFilterRequest = z.infer<typeof CreateSmartFilterZ>;

/**
 * Update smart filter request
 */
export const UpdateSmartFilterZ = z.object({
  filter_id: z.number().int().positive(),
  name: z.string().min(1).max(255).optional(),
  query: FilterQueryZ.optional(),
  is_active: z.boolean().optional(),
});

export type UpdateSmartFilterRequest = z.infer<typeof UpdateSmartFilterZ>;
