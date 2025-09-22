// DMS Document Management System Types

export interface DMSDocument {
  doc_id: string;
  project_id: string | null;
  workspace_id: string | null;
  phase_id: string | null;
  parcel_id: string | null;
  doc_name: string;
  doc_type: string | null;
  discipline: string | null;
  status: string | null;
  version_no: number | null;
  doc_date: string | null;
  contract_value: number | null;
  priority: number | null;
  tags: string[] | null;
  profile_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;

  // Derived/joined fields
  project_name?: string | null;
  workspace_name?: string | null;
  phase_name?: string | null;
  parcel_name?: string | null;
}

export interface SearchableDocument {
  doc_id: string;
  project_id: string | null;
  workspace_id: string | null;
  phase_id: string | null;
  parcel_id: string | null;
  doc_name: string;
  doc_type: string | null;
  discipline: string | null;
  status: string | null;
  version_no: number | null;
  doc_date: string | null;
  contract_value: number | null;
  priority: number | null;
  tags: string[];
  profile_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;

  // Derived fields for search
  project_name?: string | null;
  workspace_name?: string | null;
  phase_name?: string | null;
  parcel_name?: string | null;
}

// Navigation event types
export interface NavigationEvent {
  view?: string;
}

// Declare global navigation event
declare global {
  interface WindowEventMap {
    navigateToView: CustomEvent<NavigationEvent>;
  }
}