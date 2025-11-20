import { z } from 'zod';

/**
 * Folder schema
 */
export const FolderZ = z.object({
  folder_id: z.number().int().positive(),
  parent_id: z.number().int().positive().nullable(),
  name: z.string().min(1).max(255),
  path: z.string(),
  sort_order: z.number().int().default(0),
  default_profile: z.record(z.any()).default({}),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Folder = z.infer<typeof FolderZ>;

/**
 * Folder tree node (recursive)
 */
export const FolderTreeNodeZ: z.ZodType<{
  folder_id: number;
  parent_id: number | null;
  name: string;
  path: string;
  sort_order: number;
  default_profile: Record<string, any>;
  is_active: boolean;
  children: any[];
  doc_count?: number;
}> = z.lazy(() =>
  z.object({
    folder_id: z.number().int().positive(),
    parent_id: z.number().int().positive().nullable(),
    name: z.string(),
    path: z.string(),
    sort_order: z.number().int(),
    default_profile: z.record(z.any()),
    is_active: z.boolean(),
    children: z.array(FolderTreeNodeZ),
    doc_count: z.number().int().optional(),
  })
);

export type FolderTreeNode = z.infer<typeof FolderTreeNodeZ>;

/**
 * Create folder request
 */
export const CreateFolderZ = z.object({
  name: z.string().min(1).max(255),
  parent_id: z.number().int().positive().nullable().optional(),
  sort_order: z.number().int().default(0),
  default_profile: z.record(z.any()).default({}),
});

export type CreateFolderRequest = z.infer<typeof CreateFolderZ>;

/**
 * Update folder request
 */
export const UpdateFolderZ = z.object({
  folder_id: z.number().int().positive(),
  name: z.string().min(1).max(255).optional(),
  parent_id: z.number().int().positive().nullable().optional(),
  sort_order: z.number().int().optional(),
  default_profile: z.record(z.any()).optional(),
  is_active: z.boolean().optional(),
});

export type UpdateFolderRequest = z.infer<typeof UpdateFolderZ>;

/**
 * Move document to folder request
 */
export const MoveDocumentZ = z.object({
  folder_id: z.number().int().positive().nullable(), // null = move to root/no folder
  apply_inheritance: z.boolean().default(true), // Whether to apply folder default_profile
});

export type MoveDocumentRequest = z.infer<typeof MoveDocumentZ>;

/**
 * Folder link
 */
export const FolderLinkZ = z.object({
  doc_id: z.number().int().positive(),
  folder_id: z.number().int().positive(),
  linked_at: z.string().datetime(),
  inherited: z.boolean(),
});

export type FolderLink = z.infer<typeof FolderLinkZ>;
