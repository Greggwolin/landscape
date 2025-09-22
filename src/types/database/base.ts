// Base utility types for database operations

export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Common timestamp fields
export interface TimestampFields {
  createdAt: string;
  updatedAt: string;
}

// Common ID fields
export interface BaseEntity {
  id: string;
}

export interface ProjectScoped {
  projectId: string | null;
}

export interface WorkspaceScoped {
  workspaceId: string | null;
}