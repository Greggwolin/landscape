// DMS Document Management System Types

export interface DMSDocument {
  doc_id: string;
  project_id: string | null;
  workspace_id: string | null;
  phase_id: string | null;
  parcel_id: string | null;
  parcel_id_int?: string | null;
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

  // Storage fields
  storage_uri?: string | null;
  sha256_hash?: string | null;
  mime_type?: string | null;
  file_size_bytes?: number | null;

  // Derived/joined fields
  project_name?: string | null;
  workspace_name?: string | null;
  phase_name?: string | null;
  parcel_name?: string | null;

  // Text content fields
  extracted_text?: string;
  word_count?: number;
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

export interface PlatformKnowledgeDocument {
  id: number;
  document_key: string;
  title: string;
  subtitle?: string | null;
  edition?: string | null;
  publisher?: string | null;
  publication_year?: number | null;
  page_count?: number | null;
  knowledge_domain?: string | null;
  property_types?: string[] | null;
  description?: string | null;
  ingestion_status?: string | null;
  chunk_count?: number | null;
  file_path?: string | null;
  file_hash?: string | null;
  file_size_bytes?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
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
