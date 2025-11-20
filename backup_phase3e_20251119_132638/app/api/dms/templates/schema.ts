/**
 * Zod Schemas for DMS Template Management
 */

import { z } from 'zod';

// Template binding (attribute assigned to template)
export const TemplateBindingZ = z.object({
  attr_id: z.number().int().positive().optional(), // Either attr_id or attr_key
  attr_key: z.string().optional(), // Either attr_id or attr_key
  is_required: z.boolean().optional().default(false),
  visibility_rule: z.string().optional(), // JSONLogic expression
  condition_expr: z.string().optional(), // JSONLogic expression for relevance
  default_value: z.any().optional(),
  display_order: z.number().int().optional().default(0),
}).refine(data => data.attr_id || data.attr_key, {
  message: 'Either attr_id or attr_key must be provided',
});

export type TemplateBinding = z.infer<typeof TemplateBindingZ>;

// Create/Update Template
export const CreateTemplateZ = z.object({
  template_name: z.string().min(1).max(255),
  workspace_id: z.number().int().positive().optional(),
  project_id: z.number().int().positive().optional(),
  doc_type: z.string().max(100).optional(), // Apply to specific doc_type
  is_default: z.boolean().optional().default(false),
  bindings: z.array(TemplateBindingZ),
});

export type CreateTemplate = z.infer<typeof CreateTemplateZ>;

// Update Template
export const UpdateTemplateZ = CreateTemplateZ.partial().extend({
  bindings: z.array(TemplateBindingZ).optional(),
});

export type UpdateTemplate = z.infer<typeof UpdateTemplateZ>;

// Query parameters for GET /api/dms/templates
export const GetTemplatesQueryZ = z.object({
  project_id: z.coerce.number().int().positive().optional(),
  workspace_id: z.coerce.number().int().positive().optional(),
  doc_type: z.string().optional(),
  is_default: z.coerce.boolean().optional(),
  effective: z.coerce.boolean().optional().default(false), // Merge GLOBAL → WORKSPACE → PROJECT
});

export type GetTemplatesQuery = z.infer<typeof GetTemplatesQueryZ>;

// Template response (with resolved bindings)
export const TemplateZ = z.object({
  template_id: z.number().int(),
  template_name: z.string(),
  workspace_id: z.number().int().nullable(),
  project_id: z.number().int().nullable(),
  doc_type: z.string().nullable(),
  is_default: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  bindings: z.array(
    TemplateBindingZ.extend({
      attr_id: z.number().int(),
      attr_key: z.string(),
      attr_name: z.string(),
      attr_type: z.string(),
      attr_description: z.string().nullable(),
      help_text: z.string().optional(),
    })
  ),
});

export type Template = z.infer<typeof TemplateZ>;

// Effective template (merged from multiple templates)
export const EffectiveTemplateZ = z.object({
  attributes: z.array(
    z.object({
      attr_id: z.number().int(),
      attr_key: z.string(),
      attr_name: z.string(),
      attr_type: z.string(),
      attr_description: z.string().nullable(),
      is_required: z.boolean(),
      is_searchable: z.boolean(),
      visibility_rule: z.string().nullable(),
      condition_expr: z.string().nullable(),
      default_value: z.any().nullable(),
      display_order: z.number().int(),
      validation_rules: z.record(z.any()),
      enum_options: z.array(z.any()).nullable(),
      help_text: z.string().nullable(),
    })
  ),
  source: z.enum(['GLOBAL', 'WORKSPACE', 'PROJECT']),
});

export type EffectiveTemplate = z.infer<typeof EffectiveTemplateZ>;
