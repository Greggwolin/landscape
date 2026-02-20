/**
 * Client-side file classification for DMS staging tray.
 * Classifies files into routing outcomes based on filename, extension, and size.
 * No server calls — pure pattern matching.
 */

import type { CollisionCheckResult } from '@/lib/dms/uploadUtils';

// ============================================
// TYPES
// ============================================

export type StagingRoute = 'extract' | 'library' | 'reference';

export type StagingStatus =
  | 'analyzing'   // classification + collision check running
  | 'ready'       // analysis complete, waiting for user action
  | 'uploading'   // confirmed, upload in progress
  | 'complete'    // successfully uploaded
  | 'error';      // upload or analysis failed

export interface CollisionInfo {
  matchType: 'filename' | 'content' | 'both';
  existingDoc: {
    doc_id: number;
    filename: string;
    version_number: number;
    uploaded_at: string;
    doc_type?: string | null;
    file_size_bytes?: number | null;
    mime_type?: string | null;
    extraction_summary?: {
      facts_extracted: number;
      embeddings: number;
    };
  };
}

export interface StagedFile {
  id: string;
  file: File;
  hash: string | null;
  status: StagingStatus;

  // Classification
  classifiedDocType: string | null;
  confidence: number;
  route: StagingRoute;
  fieldTargets: string[];

  // User overrides
  userDocType: string | null;
  userRoute: StagingRoute | null;

  // Collision
  collision: CollisionInfo | null;

  // Error
  errorMessage: string | null;

  // Metadata
  addedAt: number;
}

// ============================================
// CLASSIFICATION RESULT
// ============================================

export interface ClassificationResult {
  docType: string;
  confidence: number;
  route: StagingRoute;
  fieldTargets: string[];
}

// ============================================
// FIELD TARGETS BY DOC TYPE
// ============================================

const FIELD_TARGETS: Record<string, string[]> = {
  'Rent Roll': ['Unit mix', 'Market rents', 'Vacancy rate'],
  'Operating Statement': ['Revenue', 'Expenses', 'NOI'],
  'Offering Memorandum': ['Property details', 'Financials', 'Comparables'],
  'Comparable Sales': ['Sale price', 'Cap rate', '$/SF'],
  'Appraisal Report': ['Value conclusion', 'Cap rate', 'Comparables'],
  'Lease': ['Tenant', 'Rent', 'Lease term'],
  'Pro Forma': ['Projected revenue', 'Expense growth', 'Reversion'],
};

// ============================================
// CLASSIFICATION RULES (first match wins)
// ============================================

interface ClassificationRule {
  pattern: RegExp;
  docType: string;
  confidence: number;
  route: StagingRoute;
}

const RULES: ClassificationRule[] = [
  // Route A: Extract to Project Fields
  { pattern: /rent.?roll/i, docType: 'Rent Roll', confidence: 0.95, route: 'extract' },
  { pattern: /delinquen/i, docType: 'Rent Roll', confidence: 0.85, route: 'extract' },
  { pattern: /unit.?mix/i, docType: 'Rent Roll', confidence: 0.80, route: 'extract' },
  { pattern: /t[- ]?12/i, docType: 'Operating Statement', confidence: 0.90, route: 'extract' },
  { pattern: /trailing.?12/i, docType: 'Operating Statement', confidence: 0.90, route: 'extract' },
  { pattern: /operat(ing|ions).?(statement|summary)/i, docType: 'Operating Statement', confidence: 0.90, route: 'extract' },
  { pattern: /income.?(expense|statement)/i, docType: 'Operating Statement', confidence: 0.85, route: 'extract' },
  { pattern: /profit.?loss|p\s*&\s*l/i, docType: 'Operating Statement', confidence: 0.80, route: 'extract' },
  { pattern: /offering.?memo(randum)?/i, docType: 'Offering Memorandum', confidence: 0.90, route: 'extract' },
  { pattern: /\bom\b/i, docType: 'Offering Memorandum', confidence: 0.60, route: 'extract' },
  { pattern: /appraisal/i, docType: 'Appraisal Report', confidence: 0.90, route: 'extract' },
  { pattern: /comp(arable)?s?\s*(sale|data)/i, docType: 'Comparable Sales', confidence: 0.85, route: 'extract' },
  { pattern: /rent.?comp/i, docType: 'Comparable Sales', confidence: 0.85, route: 'extract' },
  { pattern: /lease\b/i, docType: 'Lease', confidence: 0.75, route: 'extract' },
  { pattern: /pro.?forma/i, docType: 'Pro Forma', confidence: 0.85, route: 'extract' },

  // Route B: Cost Library
  { pattern: /cost.?(estimate|breakdown|schedule)/i, docType: 'Cost Data', confidence: 0.85, route: 'library' },
  { pattern: /contractor.?bid/i, docType: 'Cost Data', confidence: 0.85, route: 'library' },
  { pattern: /unit.?cost.?(schedule)?/i, docType: 'Cost Data', confidence: 0.80, route: 'library' },
  { pattern: /marshall.*swift|rs\s*means/i, docType: 'Cost Data', confidence: 0.90, route: 'library' },
  { pattern: /budget.?(breakdown|detail)/i, docType: 'Cost Data', confidence: 0.70, route: 'library' },

  // Route C: Reference
  { pattern: /survey/i, docType: 'Survey', confidence: 0.80, route: 'reference' },
  { pattern: /plat\b/i, docType: 'Survey', confidence: 0.80, route: 'reference' },
  { pattern: /site.?plan/i, docType: 'Site Plan', confidence: 0.85, route: 'reference' },
  { pattern: /title.?(report|commit|policy)/i, docType: 'Title Report', confidence: 0.85, route: 'reference' },
  { pattern: /deed\b/i, docType: 'Legal', confidence: 0.80, route: 'reference' },
  { pattern: /agreement|contract/i, docType: 'Legal', confidence: 0.75, route: 'reference' },
  { pattern: /purchase.?(agreement|contract)|psa\b/i, docType: 'Legal', confidence: 0.85, route: 'reference' },
  { pattern: /tax.?(return|assessment|bill)/i, docType: 'Tax Records', confidence: 0.85, route: 'reference' },
  { pattern: /insurance|policy/i, docType: 'Insurance', confidence: 0.75, route: 'reference' },
  { pattern: /phase.?[i1]|environmental|\besa\b/i, docType: 'Environmental', confidence: 0.85, route: 'reference' },
  { pattern: /zon(ing|e)\b/i, docType: 'Zoning', confidence: 0.80, route: 'reference' },
  { pattern: /photo|image|picture/i, docType: 'Photos', confidence: 0.70, route: 'reference' },
  { pattern: /correspondence|letter|memo\b/i, docType: 'Correspondence', confidence: 0.65, route: 'reference' },
  { pattern: /marketing|brochure|flyer/i, docType: 'Marketing', confidence: 0.70, route: 'reference' },
];

// ============================================
// EXTENSION-BASED FALLBACKS
// ============================================

const EXT_DEFAULTS: Record<string, { docType: string; route: StagingRoute; confidence: number }> = {
  '.xlsx': { docType: 'General', route: 'extract', confidence: 0.35 },
  '.xls':  { docType: 'General', route: 'extract', confidence: 0.35 },
  '.xlsm': { docType: 'General', route: 'extract', confidence: 0.35 },
  '.csv':  { docType: 'General', route: 'extract', confidence: 0.30 },
  '.pdf':  { docType: 'General', route: 'reference', confidence: 0.25 },
  '.doc':  { docType: 'General', route: 'reference', confidence: 0.25 },
  '.docx': { docType: 'General', route: 'reference', confidence: 0.25 },
  '.jpg':  { docType: 'Photos', route: 'reference', confidence: 0.80 },
  '.jpeg': { docType: 'Photos', route: 'reference', confidence: 0.80 },
  '.png':  { docType: 'Photos', route: 'reference', confidence: 0.80 },
  '.gif':  { docType: 'Photos', route: 'reference', confidence: 0.80 },
  '.heic': { docType: 'Photos', route: 'reference', confidence: 0.80 },
  '.txt':  { docType: 'General', route: 'reference', confidence: 0.20 },
};

// ============================================
// CLASSIFIER
// ============================================

export function classifyFile(file: File): ClassificationResult {
  const filename = file.name;

  // Try pattern rules first (filename-based)
  for (const rule of RULES) {
    if (rule.pattern.test(filename)) {
      return {
        docType: rule.docType,
        confidence: rule.confidence,
        route: rule.route,
        fieldTargets: FIELD_TARGETS[rule.docType] ?? [],
      };
    }
  }

  // Extension-based fallback
  const dotIdx = filename.lastIndexOf('.');
  const ext = dotIdx >= 0 ? filename.slice(dotIdx).toLowerCase() : '';
  const extDefault = EXT_DEFAULTS[ext];
  if (extDefault) {
    return {
      docType: extDefault.docType,
      confidence: extDefault.confidence,
      route: extDefault.route,
      fieldTargets: [],
    };
  }

  // Ultimate fallback
  return {
    docType: 'General',
    confidence: 0.10,
    route: 'reference',
    fieldTargets: [],
  };
}

// ============================================
// CONFIDENCE LABEL
// ============================================

export function confidenceLabel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 0.80) return 'high';
  if (confidence >= 0.50) return 'medium';
  return 'low';
}

// ============================================
// HELPER: Create initial StagedFile
// ============================================

export function createStagedFile(file: File, suggestedDocType?: string): StagedFile {
  const classification = classifyFile(file);

  return {
    id: `staged-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    file,
    hash: null,
    status: 'analyzing',
    classifiedDocType: suggestedDocType || classification.docType,
    confidence: suggestedDocType ? 1.0 : classification.confidence,
    route: suggestedDocType ? classification.route : classification.route,
    fieldTargets: suggestedDocType
      ? (FIELD_TARGETS[suggestedDocType] ?? classification.fieldTargets)
      : classification.fieldTargets,
    userDocType: suggestedDocType || null,
    userRoute: null,
    collision: null,
    errorMessage: null,
    addedAt: Date.now(),
  };
}
