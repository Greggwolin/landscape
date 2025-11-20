/**
 * Zod Schemas for DMS Attribute Management
 */

import { z } from 'zod';

// Attribute types
export const AttributeTypeZ = z.enum([
  'text',
  'longtext',
  'number',
  'currency',
  'boolean',
  'date',
  'datetime',
  'enum',
  'lookup',
  'tags',
  'json',
]);

export type AttributeType = z.infer<typeof AttributeTypeZ>;

// Attribute scope
export const AttributeScopeZ = z.enum([
  'GLOBAL',
  'PROJECT',
  'WORKSPACE',
]);

export type AttributeScope = z.infer<typeof AttributeScopeZ>;

// Enum option
export const EnumOptionZ = z.object({
  option_code: z.string().min(1).max(100),
  label: z.string().min(1).max(255),
  sort_order: z.number().int().optional().default(0),
  is_active: z.boolean().optional().default(true),
});

export type EnumOption = z.infer<typeof EnumOptionZ>;

// Lookup configuration
export const LookupConfigZ = z.object({
  sql_source: z.string().min(1), // Must be parameterized SELECT
  cache_ttl: z.number().int().positive().optional().default(300), // 5 minutes
  display_fmt: z.string().optional(), // e.g., "{name} ({id})"
});

export type LookupConfig = z.infer<typeof LookupConfigZ>;

// Create/Update Attribute
export const CreateAttributeZ = z.object({
  attr_key: z.string()
    .min(1)
    .max(100)
    .regex(/^[a-z][a-z0-9_]*$/, 'Must start with lowercase letter, only lowercase, numbers, underscores'),
  attr_name: z.string().min(1).max(255),
  attr_type: AttributeTypeZ,
  scope: AttributeScopeZ.optional().default('GLOBAL'),
  attr_description: z.string().optional(),
  is_required: z.boolean().optional().default(false),
  is_searchable: z.boolean().optional().default(true),
  is_multi: z.boolean().optional().default(false), // For multi-value fields
  default_expr: z.string().optional(), // JSONLogic expression
  help_text: z.string().optional(),
  visibility_role: z.string().optional(), // Role required to view
  status: z.enum(['active', 'deprecated', 'hidden']).optional().default('active'),

  // Type-specific configs
  validation_rules: z.record(z.any()).optional(), // JSONSchema rules
  enum_values: z.array(EnumOptionZ).optional(), // For enum type
  lookup_table: z.string().max(100).optional(), // Deprecated, use lookup_config
  lookup_config: LookupConfigZ.optional(), // For lookup type

  display_order: z.number().int().optional().default(0),
});

export type CreateAttribute = z.infer<typeof CreateAttributeZ>;

// Update Attribute (attr_key immutable)
export const UpdateAttributeZ = CreateAttributeZ.omit({ attr_key: true }).partial();

export type UpdateAttribute = z.infer<typeof UpdateAttributeZ>;

// Query parameters for GET /api/dms/attributes
export const GetAttributesQueryZ = z.object({
  scope: AttributeScopeZ.optional(),
  project_id: z.coerce.number().int().positive().optional(),
  workspace_id: z.coerce.number().int().positive().optional(),
  attr_type: AttributeTypeZ.optional(),
  status: z.enum(['active', 'deprecated', 'hidden']).optional(),
  search: z.string().optional(), // Search in name/description
});

export type GetAttributesQuery = z.infer<typeof GetAttributesQueryZ>;

// Attribute response
export const AttributeZ = z.object({
  attr_id: z.number().int(),
  attr_key: z.string(),
  attr_name: z.string(),
  attr_type: AttributeTypeZ,
  attr_description: z.string().nullable(),
  is_required: z.boolean(),
  is_searchable: z.boolean(),
  validation_rules: z.record(z.any()),
  enum_values: z.any().nullable(),
  lookup_table: z.string().nullable(),
  display_order: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),

  // Joined data
  enum_options: z.array(EnumOptionZ).optional(),
  lookup_config: LookupConfigZ.nullable().optional(),
});

export type Attribute = z.infer<typeof AttributeZ>;
