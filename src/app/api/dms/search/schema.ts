/**
 * DMS Search Schema
 * Validation for POST /api/dms/search
 */

import { z } from 'zod';

/**
 * Search request schema
 */
export const SearchRequestZ = z.object({
  // Search query (optional - returns all if empty)
  query: z.string().max(500).optional(),

  // Filters
  filters: z.object({
    project_id: z.number().int().positive().optional(),
    workspace_id: z.number().int().positive().optional(),
    phase_id: z.number().int().positive().optional(),
    parcel_id: z.number().int().positive().optional(),
    doc_type: z.string().max(100).optional(),
    discipline: z.string().max(100).optional(),
    status: z.enum(['draft', 'processing', 'indexed', 'failed', 'archived']).optional(),
    priority: z.string().optional(),
    tags: z.array(z.string()).optional(),
    doc_date_from: z.string().optional(), // ISO date
    doc_date_to: z.string().optional(),   // ISO date
    contract_value_min: z.number().optional(),
    contract_value_max: z.number().optional(),
  }).optional(),

  // Facets to return
  facets: z.array(z.string()).optional().default([
    'doc_type',
    'discipline',
    'status',
    'priority',
    'tags',
    'project_name',
    'workspace_name',
  ]),

  // Sorting
  sort: z.array(z.string()).optional(),

  // Pagination
  limit: z.number().int().positive().max(100).optional().default(20),
  offset: z.number().int().nonnegative().optional().default(0),

  // Highlighting
  attributesToHighlight: z.array(z.string()).optional().default([
    'doc_name',
    'searchable_text',
  ]),

  // Use database fallback instead of Meilisearch
  useDatabaseFallback: z.boolean().optional().default(false),
});

export type SearchRequest = z.infer<typeof SearchRequestZ>;
