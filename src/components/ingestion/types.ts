/**
 * Types for the Document Ingestion flow with CopilotKit HITL
 */

export type DocumentStatus = 'uploading' | 'processing' | 'pending' | 'confirmed' | 'error';

export interface IngestionDocument {
  doc_id: number;
  doc_name: string;
  doc_type: string;
  status: DocumentStatus;
  storage_uri?: string;
  mime_type?: string;
  file_size_bytes?: number;
  created_at: string;
  // Extraction results
  extraction?: DocumentExtraction;
}

export interface DocumentExtraction {
  summary: string;
  fields: ExtractedField[];
  confidence: number;
  warnings?: string[];
  needs_review: boolean;
}

export interface ExtractedField {
  field_name: string;
  value: string | number | null;
  confidence: number;
  source?: string;
}

export interface PropertyMetric {
  label: string;
  value: string | number | null;
  source?: string;
  inferred?: boolean;
  pending?: boolean;
}

export interface UnitMixItem {
  type: string;
  count: number;
  avgRent: number;
  color: string;
  percentage: number;
}

export interface MilestoneItem {
  id: string;
  label: string;
  status: 'complete' | 'partial' | 'missing';
}

export interface PropertySummary {
  totalUnits: number | null;
  averageRent: number | null;
  occupancy: number | null;
  noi: number | null;
  capRate: number | null;
  pricePerUnit: number | null;
  unitMix: UnitMixItem[];
}

export interface StagingData {
  summary: {
    total_units: number;
    occupied_units: number;
    vacant_units: number;
    vacancy_rate: number;
    monthly_income: number;
  };
  unit_types: StagingItem[];
  units: StagingItem[];
  leases: StagingItem[];
  needs_review: StagingReviewItem[];
}

export interface StagingItem {
  assertion_id: number;
  confidence: number;
  data: Record<string, unknown>;
}

export interface StagingReviewItem {
  message: string;
  severity: 'low' | 'medium' | 'high';
  suggestion?: string;
}

export interface IngestionCorrection {
  assertion_id: number;
  field_path: string;
  corrected_value: unknown;
  correction_reason: string;
}
