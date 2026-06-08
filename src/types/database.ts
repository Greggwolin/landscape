// Auto-generated database types
// Generated on: 2026-06-08T23:47:31.274Z
// DO NOT EDIT MANUALLY - Run 'npm run generate:types' to regenerate

// Utility types
export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// land_v2.glossary_zoning
// Primary Key: glossary_id
export interface GlossaryZoning {
  /** Default: gen_random_uuid() */
  glossaryId: string;
  jurisdictionCity: string;
  jurisdictionCounty: string | null;
  jurisdictionState: string;
  jurisdictionDisplay: string;
  districtCode: string | null;
  districtName: string | null;
  familyName: string;
  localCodeRaw: string;
  localCodeCanonical: string | null;
  codeTokenKind: string /* code_token_kind enum */;
  codeTokenConfidence: number;
  mappedUse: string;
  allowance: string;
  purposeText: string | null;
  intentText: string | null;
  conditionsText: string | null;
  developmentStandards: any | null;
  useStandardRefs: any | null;
  definitionsRefs: any | null;
  narrativeSectionRef: string | null;
  narrativeSrcUrl: string | null;
  sourceDocUrl: string | null;
  effectiveDate: string | null;
  amendingOrdList: any | null;
  /** Default: true */
  isActive: boolean;
  /** Default: now() */
  createdAt: string;
  /** Default: now() */
  updatedAt: string;
}

// Insert type for land_v2.glossary_zoning (excludes auto-generated fields)
export type GlossaryZoningInsert = {
  glossaryId?: string;
  jurisdictionCity: string;
  jurisdictionCounty?: string | null;
  jurisdictionState: string;
  jurisdictionDisplay: string;
  districtCode?: string | null;
  districtName?: string | null;
  familyName: string;
  localCodeRaw: string;
  localCodeCanonical?: string | null;
  codeTokenKind: string /* code_token_kind enum */;
  codeTokenConfidence: number;
  mappedUse: string;
  allowance: string;
  purposeText?: string | null;
  intentText?: string | null;
  conditionsText?: string | null;
  developmentStandards?: any | null;
  useStandardRefs?: any | null;
  definitionsRefs?: any | null;
  narrativeSectionRef?: string | null;
  narrativeSrcUrl?: string | null;
  sourceDocUrl?: string | null;
  effectiveDate?: string | null;
  amendingOrdList?: any | null;
  isActive?: boolean;
};

// land_v2.vw_zoning_glossary_export
export interface ZoningGlossaryExport {
  glossaryId: string | null;
  jurisdictionDisplay: string | null;
  jurisdictionCity: string | null;
  jurisdictionCounty: string | null;
  jurisdictionState: string | null;
  familyName: string | null;
  districtCode: string | null;
  districtName: string | null;
  localCodeRaw: string | null;
  localCodeCanonical: string | null;
  codeTokenKind: string /* code_token_kind enum */ | null;
  codeTokenConfidence: number | null;
  mappedUse: string | null;
  allowance: string | null;
  purposeText: string | null;
  intentText: string | null;
  conditionsText: string | null;
  developmentStandards: any | null;
  useStandardRefs: any | null;
  definitionsRefs: any | null;
  narrativeSectionRef: string | null;
  narrativeSrcUrl: string | null;
  sourceDocUrl: string | null;
  effectiveDate: string | null;
  isActive: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// landscape._migrations
// Primary Key: migration_id
export interface Migrations {
  /** Default: nextval('_migrations_migration_id_seq'::regclass) */
  migrationId: number;
  migrationFile: string;
  /** Default: now() */
  appliedAt: string | null;
  checksum: string | null;
}

// Insert type for landscape._migrations (excludes auto-generated fields)
export type MigrationsInsert = {
  migrationFile: string;
  checksum?: string | null;
};

// landscape.ai_correction_log
// Primary Key: id
// Foreign Keys: queue_id -> landscape.dms_extract_queue.queue_id
export interface AiCorrectionLog {
  /** Default: nextval('ai_correction_log_id_seq'::regclass) */
  id: number;
  queueId: number;
  fieldPath: string;
  aiValue: string | null;
  userValue: string | null;
  aiConfidence: number | null;
  /** Default: 'value_wrong'::character varying */
  correctionType: string | null;
  pageNumber: number | null;
  sourceQuote: string | null;
  userNotes: string | null;
  /** Default: now() */
  createdAt: string | null;
}

// Insert type for landscape.ai_correction_log (excludes auto-generated fields)
export type AiCorrectionLogInsert = {
  queueId: number;
  fieldPath: string;
  aiValue?: string | null;
  userValue?: string | null;
  aiConfidence?: number | null;
  correctionType?: string | null;
  pageNumber?: number | null;
  sourceQuote?: string | null;
  userNotes?: string | null;
};

// landscape.ai_debug_log
// Primary Key: id
export interface AiDebugLog {
  /** Default: nextval('ai_debug_log_id_seq'::regclass) */
  id: number;
  logType: string | null;
  payload: any | null;
  /** Default: now() */
  createdAt: string | null;
}

// Insert type for landscape.ai_debug_log (excludes auto-generated fields)
export type AiDebugLogInsert = {
  logType?: string | null;
  payload?: any | null;
};

// landscape.ai_document_subtypes
// Primary Key: subtype_id
export interface AiDocumentSubtypes {
  /** Default: nextval('ai_document_subtypes_subtype_id_seq'::regclass) */
  subtypeId: number;
  subtypeCode: string;
  subtypeName: string;
  /** Default: 'multifamily'::character varying */
  propertyType: string;
  description: string | null;
  /** Default: '[]'::jsonb */
  detectionPatterns: any;
  /** Default: '[]'::jsonb */
  priorityFields: any;
  /** Default: '[]'::jsonb */
  skipFields: any;
  specialInstructions: string | null;
  /** Default: true */
  isActive: boolean;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.ai_document_subtypes (excludes auto-generated fields)
export type AiDocumentSubtypesInsert = {
  subtypeCode: string;
  subtypeName: string;
  propertyType?: string;
  description?: string | null;
  detectionPatterns?: any;
  priorityFields?: any;
  skipFields?: any;
  specialInstructions?: string | null;
  isActive?: boolean;
};

// landscape.ai_extraction_staging
// Primary Key: extraction_id
// Foreign Keys: doc_id -> landscape.core_doc.doc_id, project_id -> landscape.tbl_project.project_id
export interface AiExtractionStaging {
  /** Default: nextval('ai_extraction_staging_extraction_id_seq'::regclass) */
  extractionId: number;
  projectId: number;
  docId: number | null;
  targetTable: string;
  targetField: string | null;
  extractedValue: any;
  extractionType: string;
  sourceText: string | null;
  confidenceScore: number | null;
  /** Default: 'pending'::character varying */
  status: string | null;
  validatedValue: any | null;
  validatedBy: string | null;
  validatedAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: 'landscaper'::text */
  createdBy: string | null;
  fieldKey: string | null;
  propertyType: string | null;
  dbWriteType: string | null;
  selectorJson: any | null;
  scope: string | null;
  scopeId: number | null;
  sourcePage: number | null;
  sourceSnippet: string | null;
  conflictWithExtractionId: number | null;
  rejectionReason: string | null;
  scopeLabel: string | null;
  arrayIndex: number | null;
  sourceCell: string | null;
}

// Insert type for landscape.ai_extraction_staging (excludes auto-generated fields)
export type AiExtractionStagingInsert = {
  projectId: number;
  docId?: number | null;
  targetTable: string;
  targetField?: string | null;
  extractedValue: any;
  extractionType: string;
  sourceText?: string | null;
  confidenceScore?: number | null;
  status?: string | null;
  validatedValue?: any | null;
  validatedBy?: string | null;
  validatedAt?: string | null;
  createdBy?: string | null;
  fieldKey?: string | null;
  propertyType?: string | null;
  dbWriteType?: string | null;
  selectorJson?: any | null;
  scope?: string | null;
  scopeId?: number | null;
  sourcePage?: number | null;
  sourceSnippet?: string | null;
  conflictWithExtractionId?: number | null;
  rejectionReason?: string | null;
  scopeLabel?: string | null;
  arrayIndex?: number | null;
  sourceCell?: string | null;
};

// landscape.ai_extraction_warnings
// Primary Key: id
// Foreign Keys: queue_id -> landscape.dms_extract_queue.queue_id
export interface AiExtractionWarnings {
  /** Default: nextval('ai_extraction_warnings_id_seq'::regclass) */
  id: number;
  queueId: number;
  fieldPath: string;
  warningType: string;
  /** Default: 'warning'::character varying */
  severity: string | null;
  message: string;
  suggestedValue: string | null;
  userAction: string | null;
  /** Default: now() */
  createdAt: string | null;
}

// Insert type for landscape.ai_extraction_warnings (excludes auto-generated fields)
export type AiExtractionWarningsInsert = {
  queueId: number;
  fieldPath: string;
  warningType: string;
  severity?: string | null;
  message: string;
  suggestedValue?: string | null;
  userAction?: string | null;
};

// landscape.ai_ingestion_history
// Primary Key: ingestion_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface AiIngestionHistory {
  /** Default: nextval('ai_ingestion_history_ingestion_id_seq'::regclass) */
  ingestionId: number;
  projectId: number | null;
  packageName: string;
  documents: any | null;
  aiAnalysis: any | null;
  /** Default: now() */
  createdAt: string | null;
  createdBy: string | null;
}

// Insert type for landscape.ai_ingestion_history (excludes auto-generated fields)
export type AiIngestionHistoryInsert = {
  projectId?: number | null;
  packageName: string;
  documents?: any | null;
  aiAnalysis?: any | null;
  createdBy?: string | null;
};

// landscape.ai_review_history
// Primary Key: review_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface AiReviewHistory {
  /** Default: nextval('ai_review_history_review_id_seq'::regclass) */
  reviewId: number;
  projectId: number;
  actionType: string;
  fieldUpdates: any | null;
  userFeedback: string | null;
  aiConfidence: number | null;
  /** Default: now() */
  createdAt: string | null;
  createdBy: string | null;
}

// Insert type for landscape.ai_review_history (excludes auto-generated fields)
export type AiReviewHistoryInsert = {
  projectId: number;
  actionType: string;
  fieldUpdates?: any | null;
  userFeedback?: string | null;
  aiConfidence?: number | null;
  createdBy?: string | null;
};

// landscape.auth_group
// Primary Key: id
export interface AuthGroup {
  id: number;
  name: string;
}

// landscape.auth_group_permissions
// Primary Key: id
// Foreign Keys: group_id -> landscape.auth_group.id, permission_id -> landscape.auth_permission.id
export interface AuthGroupPermissions {
  id: number;
  groupId: number;
  permissionId: number;
}

// landscape.auth_permission
// Primary Key: id
// Foreign Keys: content_type_id -> landscape.django_content_type.id
export interface AuthPermission {
  id: number;
  name: string;
  contentTypeId: number;
  codename: string;
}

// landscape.auth_user
// Primary Key: id
export interface AuthUser {
  id: number;
  password: string;
  lastLogin: string | null;
  isSuperuser: boolean;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  isStaff: boolean;
  isActive: boolean;
  dateJoined: string;
  phone: string | null;
  company: string | null;
  /** Default: 'user'::character varying */
  role: string | null;
  /** Default: false */
  isVerified: boolean | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  lastLoginIp: any | null;
  demoProjectsProvisioned: boolean;
  plainPassword: string | null;
}

// Insert type for landscape.auth_user (excludes auto-generated fields)
export type AuthUserInsert = {
  id: number;
  password: string;
  lastLogin?: string | null;
  isSuperuser: boolean;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  isStaff: boolean;
  isActive: boolean;
  dateJoined: string;
  phone?: string | null;
  company?: string | null;
  role?: string | null;
  isVerified?: boolean | null;
  lastLoginIp?: any | null;
  demoProjectsProvisioned: boolean;
  plainPassword?: string | null;
};

// landscape.auth_user_groups
// Primary Key: id
// Foreign Keys: group_id -> landscape.auth_group.id, user_id -> landscape.auth_user.id
export interface AuthUserGroups {
  id: number;
  userId: number;
  groupId: number;
}

// landscape.auth_user_user_permissions
// Primary Key: id
// Foreign Keys: permission_id -> landscape.auth_permission.id, user_id -> landscape.auth_user.id
export interface AuthUserUserPermissions {
  id: number;
  userId: number;
  permissionId: number;
}

// landscape.bmk_absorption_velocity
// Primary Key: absorption_velocity_id
// Foreign Keys: benchmark_id -> landscape.tbl_global_benchmark_registry.benchmark_id
export interface BmkAbsorptionVelocity {
  /** Default: nextval('bmk_absorption_velocity_absorption_velocity_id_seq'::regclass) */
  absorptionVelocityId: number;
  benchmarkId: number | null;
  velocityAnnual: number;
  marketGeography: string | null;
  projectScale: string | null;
  notes: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.bmk_absorption_velocity (excludes auto-generated fields)
export type BmkAbsorptionVelocityInsert = {
  benchmarkId?: number | null;
  velocityAnnual: number;
  marketGeography?: string | null;
  projectScale?: string | null;
  notes?: string | null;
};

// landscape.bmk_builder_communities
// Primary Key: id
export interface BmkBuilderCommunities {
  /** Default: nextval('bmk_builder_communities_id_seq'::regclass) */
  id: number;
  source: string;
  sourceId: string;
  builderName: string;
  communityName: string;
  marketLabel: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  lat: number | null;
  lng: number | null;
  priceMin: number | null;
  priceMax: number | null;
  sqftMin: number | null;
  sqftMax: number | null;
  bedsMin: number | null;
  bedsMax: number | null;
  bathsMin: number | null;
  bathsMax: number | null;
  hoaMonthly: number | null;
  productTypes: string | null;
  planCount: number | null;
  inventoryCount: number | null;
  sourceUrl: string | null;
  /** Default: now() */
  firstSeenAt: string;
  /** Default: now() */
  lastSeenAt: string;
  /** Default: now() */
  ingestedAt: string;
}

// Insert type for landscape.bmk_builder_communities (excludes auto-generated fields)
export type BmkBuilderCommunitiesInsert = {
  source: string;
  sourceId: string;
  builderName: string;
  communityName: string;
  marketLabel?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  lat?: number | null;
  lng?: number | null;
  priceMin?: number | null;
  priceMax?: number | null;
  sqftMin?: number | null;
  sqftMax?: number | null;
  bedsMin?: number | null;
  bedsMax?: number | null;
  bathsMin?: number | null;
  bathsMax?: number | null;
  hoaMonthly?: number | null;
  productTypes?: string | null;
  planCount?: number | null;
  inventoryCount?: number | null;
  sourceUrl?: string | null;
};

// landscape.bmk_builder_inventory
// Primary Key: id
export interface BmkBuilderInventory {
  /** Default: nextval('bmk_builder_inventory_id_seq'::regclass) */
  id: number;
  source: string;
  sourceId: string;
  communitySourceId: string | null;
  planSourceId: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  lat: number | null;
  lng: number | null;
  status: string | null;
  priceCurrent: number | null;
  priceOriginal: number | null;
  sqftActual: number | null;
  bedsActual: number | null;
  bathsActual: number | null;
  lotSqft: number | null;
  moveInDate: string | null;
  sourceUrl: string | null;
  /** Default: now() */
  firstSeenAt: string;
  /** Default: now() */
  lastSeenAt: string;
  /** Default: now() */
  ingestedAt: string;
}

// Insert type for landscape.bmk_builder_inventory (excludes auto-generated fields)
export type BmkBuilderInventoryInsert = {
  source: string;
  sourceId: string;
  communitySourceId?: string | null;
  planSourceId?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  lat?: number | null;
  lng?: number | null;
  status?: string | null;
  priceCurrent?: number | null;
  priceOriginal?: number | null;
  sqftActual?: number | null;
  bedsActual?: number | null;
  bathsActual?: number | null;
  lotSqft?: number | null;
  moveInDate?: string | null;
  sourceUrl?: string | null;
};

// landscape.bmk_builder_plans
// Primary Key: id
export interface BmkBuilderPlans {
  /** Default: nextval('bmk_builder_plans_id_seq'::regclass) */
  id: number;
  source: string;
  sourceId: string;
  communitySourceId: string;
  planName: string;
  seriesName: string | null;
  productType: string | null;
  basePrice: number | null;
  sqftMin: number | null;
  sqftMax: number | null;
  bedsMin: number | null;
  bedsMax: number | null;
  bathsMin: number | null;
  bathsMax: number | null;
  garageSpaces: number | null;
  stories: number | null;
  sourceUrl: string | null;
  /** Default: now() */
  firstSeenAt: string;
  /** Default: now() */
  lastSeenAt: string;
  /** Default: now() */
  ingestedAt: string;
}

// Insert type for landscape.bmk_builder_plans (excludes auto-generated fields)
export type BmkBuilderPlansInsert = {
  source: string;
  sourceId: string;
  communitySourceId: string;
  planName: string;
  seriesName?: string | null;
  productType?: string | null;
  basePrice?: number | null;
  sqftMin?: number | null;
  sqftMax?: number | null;
  bedsMin?: number | null;
  bedsMax?: number | null;
  bathsMin?: number | null;
  bathsMax?: number | null;
  garageSpaces?: number | null;
  stories?: number | null;
  sourceUrl?: string | null;
};

// landscape.bmk_resale_closings
// Primary Key: id
export interface BmkResaleClosings {
  /** Default: nextval('bmk_resale_closings_id_seq'::regclass) */
  id: number;
  source: string;
  sourceId: string;
  salePrice: number;
  saleDate: string;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  lat: number | null;
  lng: number | null;
  propertyType: string | null;
  listPrice: number | null;
  listDate: string | null;
  daysOnMarket: number | null;
  sqft: number | null;
  lotSqft: number | null;
  pricePerSqft: number | null;
  yearBuilt: number | null;
  beds: number | null;
  baths: number | null;
  builderName: string | null;
  subdivisionName: string | null;
  sourceUrl: string | null;
  /** Default: now() */
  firstSeenAt: string;
  /** Default: now() */
  lastSeenAt: string;
  /** Default: now() */
  ingestedAt: string;
}

// Insert type for landscape.bmk_resale_closings (excludes auto-generated fields)
export type BmkResaleClosingsInsert = {
  source: string;
  sourceId: string;
  salePrice: number;
  saleDate: string;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  lat?: number | null;
  lng?: number | null;
  propertyType?: string | null;
  listPrice?: number | null;
  listDate?: string | null;
  daysOnMarket?: number | null;
  sqft?: number | null;
  lotSqft?: number | null;
  pricePerSqft?: number | null;
  yearBuilt?: number | null;
  beds?: number | null;
  baths?: number | null;
  builderName?: string | null;
  subdivisionName?: string | null;
  sourceUrl?: string | null;
};

// landscape.core_category_lifecycle_stages
// Primary Key: activity, category_id
// Foreign Keys: category_id -> landscape.core_unit_cost_category.category_id
export interface CategoryLifecycleStages {
  categoryId: number;
  activity: string;
  /** Default: 0 */
  sortOrder: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.core_category_lifecycle_stages (excludes auto-generated fields)
export type CategoryLifecycleStagesInsert = {
  categoryId: number;
  activity: string;
  sortOrder?: number | null;
};

// landscape.core_category_tag_library
// Primary Key: tag_id
export interface CategoryTagLibrary {
  /** Default: nextval('core_category_tag_library_tag_id_seq'::regclass) */
  tagId: number;
  tagName: string;
  tagContext: string;
  /** Default: true */
  isSystemDefault: boolean | null;
  description: string | null;
  /** Default: 999 */
  displayOrder: number | null;
  /** Default: true */
  isActive: boolean | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.core_category_tag_library (excludes auto-generated fields)
export type CategoryTagLibraryInsert = {
  tagName: string;
  tagContext: string;
  isSystemDefault?: boolean | null;
  description?: string | null;
  displayOrder?: number | null;
  isActive?: boolean | null;
};

// landscape.core_doc
// Primary Key: doc_id
// Foreign Keys: cabinet_id -> landscape.tbl_cabinet.cabinet_id, parcel_id -> landscape.tbl_parcel.parcel_id, parent_doc_id -> landscape.core_doc.doc_id, phase_id -> landscape.tbl_phase.phase_id, project_id -> landscape.tbl_project.project_id, thread_id -> landscape.landscaper_chat_thread.id, workspace_id -> landscape.dms_workspaces.workspace_id
export interface Doc {
  /** Default: nextval('core_doc_doc_id_seq'::regclass) */
  docId: number;
  projectId: number | null;
  workspaceId: number | null;
  phaseId: number | null;
  parcelId: number | null;
  docName: string;
  /** Default: 'general'::character varying */
  docType: string;
  /** Default: NULL::character varying */
  discipline: string | null;
  mimeType: string;
  fileSizeBytes: number;
  sha256Hash: string;
  storageUri: string;
  /** Default: 1 */
  versionNo: number | null;
  parentDocId: number | null;
  /** Default: 'draft'::character varying */
  status: string | null;
  /** Default: '{}'::jsonb */
  profileJson: any | null;
  docDate: string | null;
  /** Default: NULL::numeric */
  contractValue: number | null;
  /** Default: NULL::character varying */
  priority: string | null;
  createdBy: number | null;
  updatedBy: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  /** Default: 'pending'::character varying */
  processingStatus: string | null;
  processingStartedAt: string | null;
  processingCompletedAt: string | null;
  processingError: string | null;
  /** Default: 0 */
  chunksCount: number | null;
  /** Default: 0 */
  embeddingsCount: number | null;
  deletedAt: string | null;
  deletedBy: string | null;
  cabinetId: number | null;
  /** Default: 'unscanned'::character varying */
  mediaScanStatus: string | null;
  mediaScanJson: any | null;
  /** Default: 0 */
  tableCount: number | null;
  /** Default: NULL::character varying */
  propertyType: string | null;
  threadId: string | null;
}

// Insert type for landscape.core_doc (excludes auto-generated fields)
export type DocInsert = {
  projectId?: number | null;
  workspaceId?: number | null;
  phaseId?: number | null;
  parcelId?: number | null;
  docName: string;
  docType?: string;
  discipline?: string | null;
  mimeType: string;
  fileSizeBytes: number;
  sha256Hash: string;
  storageUri: string;
  versionNo?: number | null;
  parentDocId?: number | null;
  status?: string | null;
  profileJson?: any | null;
  docDate?: string | null;
  contractValue?: number | null;
  priority?: string | null;
  createdBy?: number | null;
  updatedBy?: number | null;
  processingStatus?: string | null;
  processingStartedAt?: string | null;
  processingCompletedAt?: string | null;
  processingError?: string | null;
  chunksCount?: number | null;
  embeddingsCount?: number | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
  cabinetId?: number | null;
  mediaScanStatus?: string | null;
  mediaScanJson?: any | null;
  tableCount?: number | null;
  propertyType?: string | null;
  threadId?: string | null;
};

// landscape.core_doc_attr_enum
// Primary Key: option_code, attr_id
// Foreign Keys: attr_id -> landscape.dms_attributes.attr_id
export interface DocAttrEnum {
  attrId: number;
  optionCode: string;
  label: string;
  /** Default: 0 */
  sortOrder: number;
  /** Default: true */
  isActive: boolean;
}

// landscape.core_doc_attr_lookup
// Primary Key: attr_id
// Foreign Keys: attr_id -> landscape.dms_attributes.attr_id
export interface DocAttrLookup {
  attrId: number;
  sqlSource: string;
  /** Default: 600 */
  cacheTtl: number;
  displayFmt: string | null;
}

// landscape.core_doc_folder
// Primary Key: folder_id
// Foreign Keys: parent_id -> landscape.core_doc_folder.folder_id
export interface DocFolder {
  /** Default: nextval('core_doc_folder_folder_id_seq'::regclass) */
  folderId: number;
  parentId: number | null;
  name: string;
  path: string;
  /** Default: 0 */
  sortOrder: number | null;
  /** Default: '{}'::jsonb */
  defaultProfile: any | null;
  /** Default: true */
  isActive: boolean | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.core_doc_folder (excludes auto-generated fields)
export type DocFolderInsert = {
  parentId?: number | null;
  name: string;
  path: string;
  sortOrder?: number | null;
  defaultProfile?: any | null;
  isActive?: boolean | null;
};

// landscape.core_doc_folder_link
// Primary Key: doc_id
// Foreign Keys: doc_id -> landscape.core_doc.doc_id, folder_id -> landscape.core_doc_folder.folder_id
export interface DocFolderLink {
  docId: number;
  folderId: number;
  /** Default: now() */
  linkedAt: string | null;
  /** Default: true */
  inherited: boolean | null;
}

// Insert type for landscape.core_doc_folder_link (excludes auto-generated fields)
export type DocFolderLinkInsert = {
  docId: number;
  folderId: number;
  inherited?: boolean | null;
};

// landscape.core_doc_media
// Primary Key: media_id
// Foreign Keys: classification_id -> landscape.lu_media_classification.classification_id, doc_id -> landscape.core_doc.doc_id, project_id -> landscape.tbl_project.project_id, workspace_id -> landscape.dms_workspaces.workspace_id
export interface DocMedia {
  /** Default: nextval('core_doc_media_media_id_seq'::regclass) */
  mediaId: number;
  docId: number;
  projectId: number | null;
  workspaceId: number | null;
  classificationId: number | null;
  aiClassification: string | null;
  aiConfidence: number | null;
  /** Default: false */
  userOverride: boolean;
  sourcePage: number | null;
  sourceRegion: any | null;
  /** Default: 'embedded'::character varying */
  extractionMethod: string;
  assetName: string | null;
  storageUri: string;
  thumbnailUri: string | null;
  /** Default: 'image/png'::character varying */
  mimeType: string;
  fileSizeBytes: number | null;
  widthPx: number | null;
  heightPx: number | null;
  dpi: number | null;
  caption: string | null;
  altText: string | null;
  tags: any[] | null;
  aiDescription: string | null;
  /** Default: 'extracted'::character varying */
  status: string;
  /** Default: now() */
  createdAt: string;
  /** Default: now() */
  updatedAt: string;
  createdBy: number | null;
  deletedAt: string | null;
  suggestedAction: string | null;
  userAction: string | null;
  discardReasonCode: string | null;
  discardReasonText: string | null;
  discardedAt: string | null;
  imageHash: string | null;
}

// Insert type for landscape.core_doc_media (excludes auto-generated fields)
export type DocMediaInsert = {
  docId: number;
  projectId?: number | null;
  workspaceId?: number | null;
  classificationId?: number | null;
  aiClassification?: string | null;
  aiConfidence?: number | null;
  userOverride?: boolean;
  sourcePage?: number | null;
  sourceRegion?: any | null;
  extractionMethod?: string;
  assetName?: string | null;
  storageUri: string;
  thumbnailUri?: string | null;
  mimeType?: string;
  fileSizeBytes?: number | null;
  widthPx?: number | null;
  heightPx?: number | null;
  dpi?: number | null;
  caption?: string | null;
  altText?: string | null;
  tags?: any[] | null;
  aiDescription?: string | null;
  status?: string;
  createdBy?: number | null;
  deletedAt?: string | null;
  suggestedAction?: string | null;
  userAction?: string | null;
  discardReasonCode?: string | null;
  discardReasonText?: string | null;
  discardedAt?: string | null;
  imageHash?: string | null;
};

// landscape.core_doc_media_link
// Primary Key: link_id
// Foreign Keys: media_id -> landscape.core_doc_media.media_id
export interface DocMediaLink {
  /** Default: nextval('core_doc_media_link_link_id_seq'::regclass) */
  linkId: number;
  mediaId: number;
  entityType: string;
  entityId: number;
  linkPurpose: string | null;
  /** Default: 0 */
  displayOrder: number;
  notes: string | null;
  /** Default: now() */
  createdAt: string;
  createdBy: number | null;
}

// Insert type for landscape.core_doc_media_link (excludes auto-generated fields)
export type DocMediaLinkInsert = {
  mediaId: number;
  entityType: string;
  entityId: number;
  linkPurpose?: string | null;
  displayOrder?: number;
  notes?: string | null;
  createdBy?: number | null;
};

// landscape.core_doc_smartfilter
// Primary Key: filter_id
export interface DocSmartfilter {
  /** Default: nextval('core_doc_smartfilter_filter_id_seq'::regclass) */
  filterId: number;
  name: string;
  query: any;
  /** Default: true */
  isActive: boolean | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.core_doc_smartfilter (excludes auto-generated fields)
export type DocSmartfilterInsert = {
  name: string;
  query: any;
  isActive?: boolean | null;
};

// landscape.core_doc_text
// Primary Key: doc_id
// Foreign Keys: doc_id -> landscape.core_doc.doc_id
export interface DocText {
  docId: number;
  extractedText: string | null;
  wordCount: number | null;
  extractionMethod: string | null;
  /** Default: now() */
  extractedAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.core_doc_text (excludes auto-generated fields)
export type DocTextInsert = {
  docId: number;
  extractedText?: string | null;
  wordCount?: number | null;
  extractionMethod?: string | null;
};

// landscape.core_fin_budget_version
// Primary Key: budget_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface FinBudgetVersion {
  /** Default: nextval('core_fin_budget_version_budget_id_seq'::regclass) */
  budgetId: number;
  name: string;
  asOf: string;
  /** Default: 'draft'::text */
  status: string;
  /** Default: now() */
  createdAt: string;
  projectId: number | null;
}

// Insert type for landscape.core_fin_budget_version (excludes auto-generated fields)
export type FinBudgetVersionInsert = {
  name: string;
  asOf: string;
  status?: string;
  projectId?: number | null;
};

// landscape.core_fin_category_uom
// Primary Key: uom_code, category_id
// Foreign Keys: uom_code -> landscape.core_fin_uom.uom_code
export interface FinCategoryUom {
  categoryId: number;
  uomCode: string;
}

// landscape.core_fin_confidence_policy
// Primary Key: confidence_code
export interface FinConfidencePolicy {
  confidenceCode: string;
  name: string;
  /** Default: 0 */
  defaultContingencyPct: number;
  description: string | null;
  /** Default: true */
  isActive: boolean;
  /** Default: now() */
  createdAt: string;
}

// Insert type for landscape.core_fin_confidence_policy (excludes auto-generated fields)
export type FinConfidencePolicyInsert = {
  confidenceCode: string;
  name: string;
  defaultContingencyPct?: number;
  description?: string | null;
  isActive?: boolean;
};

// landscape.core_fin_crosswalk_ad
// Primary Key: ad_code, category_id
export interface FinCrosswalkAd {
  adCode: string;
  adGroup: string | null;
  categoryId: number;
}

// landscape.core_fin_crosswalk_ae
// Primary Key: ae_coa, category_id
export interface FinCrosswalkAe {
  aeCoa: string;
  aeGroup: string | null;
  categoryId: number;
}

// landscape.core_fin_curve
// Primary Key: curve_id
export interface FinCurve {
  /** Default: nextval('core_fin_curve_curve_id_seq'::regclass) */
  curveId: number;
  name: string;
  pointsJson: any;
  /** Default: now() */
  createdAt: string;
}

// Insert type for landscape.core_fin_curve (excludes auto-generated fields)
export type FinCurveInsert = {
  name: string;
  pointsJson: any;
};

// landscape.core_fin_division_applicability
// Primary Key: tier, category_id
export interface FinDivisionApplicability {
  categoryId: number;
  tier: number;
}

// landscape.core_fin_fact_actual
// Primary Key: fact_id
// Foreign Keys: division_id -> landscape.tbl_division.division_id, project_id -> landscape.tbl_project.project_id, scenario_id -> landscape.tbl_scenario.scenario_id, uom_code -> landscape.core_fin_uom.uom_code
export interface FinFactActual {
  /** Default: nextval('core_fin_fact_actual_fact_id_seq'::regclass) */
  factId: number;
  categoryId: number;
  uomCode: string;
  /** Default: 1 */
  qty: number | null;
  rate: number | null;
  amount: number | null;
  txnDate: string;
  sourceDoc: string | null;
  /** Default: now() */
  createdAt: string;
  divisionId: number | null;
  projectId: number | null;
  scenarioId: number | null;
}

// Insert type for landscape.core_fin_fact_actual (excludes auto-generated fields)
export type FinFactActualInsert = {
  categoryId: number;
  uomCode: string;
  qty?: number | null;
  rate?: number | null;
  amount?: number | null;
  txnDate: string;
  sourceDoc?: string | null;
  divisionId?: number | null;
  projectId?: number | null;
  scenarioId?: number | null;
};

// landscape.core_fin_fact_budget
// Primary Key: fact_id
// Foreign Keys: budget_id -> landscape.core_fin_budget_version.budget_id, category_id -> landscape.core_unit_cost_category.category_id, curve_id -> landscape.core_fin_curve.curve_id, division_id -> landscape.tbl_division.division_id, finance_structure_id -> landscape.tbl_finance_structure.finance_structure_id, funding_id -> landscape.core_fin_funding_source.funding_id, growth_rate_set_id -> landscape.core_fin_growth_rate_sets.set_id, project_id -> landscape.tbl_project.project_id, scenario_id -> landscape.tbl_scenario.scenario_id, uom_code -> landscape.core_fin_uom.uom_code
export interface FinFactBudget {
  /** Default: nextval('core_fin_fact_budget_fact_id_seq'::regclass) */
  factId: number;
  budgetId: number;
  categoryId: number | null;
  fundingId: number | null;
  uomCode: string;
  /** Default: 1 */
  qty: number | null;
  rate: number | null;
  amount: number | null;
  startDate: string | null;
  endDate: string | null;
  curveId: number | null;
  notes: string | null;
  /** Default: now() */
  createdAt: string;
  divisionId: number | null;
  confidenceLevel: string | null;
  vendorContactId: number | null;
  escalationRate: number | null;
  contingencyPct: number | null;
  timingMethod: string | null;
  contractNumber: string | null;
  purchaseOrder: string | null;
  /** Default: false */
  isCommitted: boolean | null;
  growthRateSetId: number | null;
  projectId: number | null;
  contingencyMode: string | null;
  confidenceCode: string | null;
  financeStructureId: number | null;
  scenarioId: number | null;
  categoryL1Id: number | null;
  categoryL2Id: number | null;
  categoryL3Id: number | null;
  categoryL4Id: number | null;
  startPeriod: number | null;
  periodsToComplete: number | null;
  endPeriod: number | null;
  escalationMethod: string | null;
  curveProfile: string | null;
  curveSteepness: number | null;
  scopeOverride: string | null;
  costType: string | null;
  taxTreatment: string | null;
  internalMemo: string | null;
  vendorName: string | null;
  baselineStartDate: string | null;
  baselineEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  percentComplete: number | null;
  status: string | null;
  /** Default: false */
  isCritical: boolean | null;
  floatDays: number | null;
  earlyStartDate: string | null;
  lateFinishDate: string | null;
  milestoneId: number | null;
  budgetVersion: string | null;
  versionAsOfDate: string | null;
  fundingDrawPct: number | null;
  drawSchedule: string | null;
  retentionPct: number | null;
  paymentTerms: string | null;
  invoiceFrequency: string | null;
  costAllocation: string | null;
  /** Default: false */
  isReimbursable: boolean | null;
  allocationMethod: string | null;
  /** Default: false */
  cfStartFlag: boolean | null;
  cfDistribution: string | null;
  allocatedTotal: number | null;
  allocationVariance: number | null;
  bidDate: string | null;
  bidAmount: number | null;
  bidVariance: number | null;
  /** Default: 0 */
  changeOrderCount: number | null;
  /** Default: 0 */
  changeOrderTotal: number | null;
  approvalStatus: string | null;
  approvedBy: number | null;
  approvalDate: string | null;
  /** Default: 0 */
  documentCount: number | null;
  lastModifiedBy: number | null;
  lastModifiedDate: string | null;
  activity: string | null;
  newCategoryId: number | null;
  valueSource: string | null;
}

// Insert type for landscape.core_fin_fact_budget (excludes auto-generated fields)
export type FinFactBudgetInsert = {
  budgetId: number;
  categoryId?: number | null;
  fundingId?: number | null;
  uomCode: string;
  qty?: number | null;
  rate?: number | null;
  amount?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  curveId?: number | null;
  notes?: string | null;
  divisionId?: number | null;
  confidenceLevel?: string | null;
  vendorContactId?: number | null;
  escalationRate?: number | null;
  contingencyPct?: number | null;
  timingMethod?: string | null;
  contractNumber?: string | null;
  purchaseOrder?: string | null;
  isCommitted?: boolean | null;
  growthRateSetId?: number | null;
  projectId?: number | null;
  contingencyMode?: string | null;
  confidenceCode?: string | null;
  financeStructureId?: number | null;
  scenarioId?: number | null;
  categoryL1Id?: number | null;
  categoryL2Id?: number | null;
  categoryL3Id?: number | null;
  categoryL4Id?: number | null;
  startPeriod?: number | null;
  periodsToComplete?: number | null;
  endPeriod?: number | null;
  escalationMethod?: string | null;
  curveProfile?: string | null;
  curveSteepness?: number | null;
  scopeOverride?: string | null;
  costType?: string | null;
  taxTreatment?: string | null;
  internalMemo?: string | null;
  vendorName?: string | null;
  baselineStartDate?: string | null;
  baselineEndDate?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  percentComplete?: number | null;
  status?: string | null;
  isCritical?: boolean | null;
  floatDays?: number | null;
  earlyStartDate?: string | null;
  lateFinishDate?: string | null;
  milestoneId?: number | null;
  budgetVersion?: string | null;
  versionAsOfDate?: string | null;
  fundingDrawPct?: number | null;
  drawSchedule?: string | null;
  retentionPct?: number | null;
  paymentTerms?: string | null;
  invoiceFrequency?: string | null;
  costAllocation?: string | null;
  isReimbursable?: boolean | null;
  allocationMethod?: string | null;
  cfStartFlag?: boolean | null;
  cfDistribution?: string | null;
  allocatedTotal?: number | null;
  allocationVariance?: number | null;
  bidDate?: string | null;
  bidAmount?: number | null;
  bidVariance?: number | null;
  changeOrderCount?: number | null;
  changeOrderTotal?: number | null;
  approvalStatus?: string | null;
  approvedBy?: number | null;
  approvalDate?: string | null;
  documentCount?: number | null;
  lastModifiedBy?: number | null;
  lastModifiedDate?: string | null;
  activity?: string | null;
  newCategoryId?: number | null;
  valueSource?: string | null;
};

// landscape.core_fin_fact_tags
// Primary Key: tag_id
export interface FinFactTags {
  tagId: number;
  factId: number;
  factType: string;
  tagName: string;
  tagColor: string | null;
  tagCategory: string | null;
  /** Default: false */
  isCompact: boolean | null;
  createdBy: number | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string;
}

// Insert type for landscape.core_fin_fact_tags (excludes auto-generated fields)
export type FinFactTagsInsert = {
  tagId: number;
  factId: number;
  factType: string;
  tagName: string;
  tagColor?: string | null;
  tagCategory?: string | null;
  isCompact?: boolean | null;
  createdBy?: number | null;
};

// landscape.core_fin_funding_source
// Primary Key: funding_id
export interface FinFundingSource {
  /** Default: nextval('core_fin_funding_source_funding_id_seq'::regclass) */
  fundingId: number;
  type: string;
  subclass: string | null;
  rank: number | null;
  lenderParty: string | null;
  /** Default: true */
  isActive: boolean;
  /** Default: now() */
  createdAt: string;
}

// Insert type for landscape.core_fin_funding_source (excludes auto-generated fields)
export type FinFundingSourceInsert = {
  type: string;
  subclass?: string | null;
  rank?: number | null;
  lenderParty?: string | null;
  isActive?: boolean;
};

// landscape.core_fin_growth_rate_sets
// Primary Key: set_id
// Foreign Keys: benchmark_id -> landscape.tbl_global_benchmark_registry.benchmark_id
export interface FinGrowthRateSets {
  /** Default: nextval('core_fin_growth_rate_sets_set_id_seq'::regclass) */
  setId: number;
  projectId: number;
  cardType: string;
  /** Default: 'Custom 1'::character varying */
  setName: string;
  /** Default: false */
  isDefault: boolean | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  benchmarkId: number | null;
  marketGeography: string | null;
  /** Default: false */
  isGlobal: boolean | null;
}

// Insert type for landscape.core_fin_growth_rate_sets (excludes auto-generated fields)
export type FinGrowthRateSetsInsert = {
  projectId: number;
  cardType: string;
  setName?: string;
  isDefault?: boolean | null;
  benchmarkId?: number | null;
  marketGeography?: string | null;
  isGlobal?: boolean | null;
};

// landscape.core_fin_growth_rate_steps
// Primary Key: step_id
// Foreign Keys: set_id -> landscape.core_fin_growth_rate_sets.set_id
export interface FinGrowthRateSteps {
  /** Default: nextval('core_fin_growth_rate_steps_step_id_seq'::regclass) */
  stepId: number;
  setId: number;
  stepNumber: number;
  fromPeriod: number;
  periods: number | null;
  rate: number;
  thruPeriod: number | null;
  /** Default: now() */
  createdAt: string | null;
}

// Insert type for landscape.core_fin_growth_rate_steps (excludes auto-generated fields)
export type FinGrowthRateStepsInsert = {
  setId: number;
  stepNumber: number;
  fromPeriod: number;
  periods?: number | null;
  rate: number;
  thruPeriod?: number | null;
};

// landscape.core_fin_uom
// Primary Key: uom_code
export interface FinUom {
  uomCode: string;
  name: string;
  uomType: string;
  /** Default: true */
  isActive: boolean;
  /** Default: now() */
  createdAt: string;
}

// Insert type for landscape.core_fin_uom (excludes auto-generated fields)
export type FinUomInsert = {
  uomCode: string;
  name: string;
  uomType: string;
  isActive?: boolean;
};

// landscape.core_item_benchmark_link
// Primary Key: link_id
// Foreign Keys: benchmark_id -> landscape.tbl_global_benchmark_registry.benchmark_id, item_id -> landscape.core_unit_cost_item.item_id
export interface ItemBenchmarkLink {
  /** Default: nextval('core_template_benchmark_link_link_id_seq'::regclass) */
  linkId: number;
  itemId: number | null;
  benchmarkId: number | null;
  /** Default: false */
  isPrimary: boolean | null;
  /** Default: now() */
  createdAt: string | null;
}

// Insert type for landscape.core_item_benchmark_link (excludes auto-generated fields)
export type ItemBenchmarkLinkInsert = {
  itemId?: number | null;
  benchmarkId?: number | null;
  isPrimary?: boolean | null;
};

// landscape.core_lookup_item
// Primary Key: item_id
// Foreign Keys: list_key -> landscape.core_lookup_list.list_key
export interface LookupItem {
  /** Default: nextval('core_lookup_item_item_id_seq'::regclass) */
  itemId: number;
  listKey: string;
  /** Default: 0 */
  sortOrder: number;
  code: string;
  label: string;
  /** Default: true */
  isActive: boolean;
  /** Default: now() */
  createdAt: string;
}

// Insert type for landscape.core_lookup_item (excludes auto-generated fields)
export type LookupItemInsert = {
  listKey: string;
  sortOrder?: number;
  code: string;
  label: string;
  isActive?: boolean;
};

// landscape.core_lookup_list
// Primary Key: list_key
export interface LookupList {
  listKey: string;
  name: string;
  description: string | null;
  /** Default: true */
  isActive: boolean;
  /** Default: now() */
  createdAt: string;
}

// Insert type for landscape.core_lookup_list (excludes auto-generated fields)
export type LookupListInsert = {
  listKey: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
};

// landscape.core_lookup_vw
export interface LookupVw {
  listKey: string | null;
  listName: string | null;
  itemId: number | null;
  sortOrder: number | null;
  code: string | null;
  label: string | null;
  isActive: boolean | null;
}

// landscape.core_planning_standards
// Primary Key: standard_id
export interface PlanningStandards {
  /** Default: nextval('core_planning_standards_standard_id_seq'::regclass) */
  standardId: number;
  standardName: string;
  /** Default: 0.7500 */
  defaultPlanningEfficiency: number | null;
  defaultStreetRowPct: number | null;
  defaultParkDedicationPct: number | null;
  /** Default: true */
  isActive: boolean | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.core_planning_standards (excludes auto-generated fields)
export type PlanningStandardsInsert = {
  standardName: string;
  defaultPlanningEfficiency?: number | null;
  defaultStreetRowPct?: number | null;
  defaultParkDedicationPct?: number | null;
  isActive?: boolean | null;
};

// landscape.core_unit_cost_category
// Primary Key: category_id
// Foreign Keys: parent_id -> landscape.core_unit_cost_category.category_id
export interface UnitCostCategory {
  /** Default: nextval('core_unit_cost_category_category_id_seq'::regclass) */
  categoryId: number;
  parentId: number | null;
  categoryName: string;
  /** Default: 0 */
  sortOrder: number | null;
  /** Default: true */
  isActive: boolean | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  /** Default: '[]'::jsonb */
  tags: any | null;
  accountNumber: string | null;
  /** Default: 1 */
  accountLevel: number | null;
  /** Default: false */
  isCalculated: boolean | null;
  /** Default: ARRAY['MF'::text, 'OFF'::text, 'RET'::text, 'IND'::text, 'HTL'::text, 'MXU'::text, 'LAND'::text] */
  propertyTypes: any[] | null;
}

// Insert type for landscape.core_unit_cost_category (excludes auto-generated fields)
export type UnitCostCategoryInsert = {
  parentId?: number | null;
  categoryName: string;
  sortOrder?: number | null;
  isActive?: boolean | null;
  tags?: any | null;
  accountNumber?: string | null;
  accountLevel?: number | null;
  isCalculated?: boolean | null;
  propertyTypes?: any[] | null;
};

// landscape.core_unit_cost_item
// Primary Key: item_id
// Foreign Keys: category_id -> landscape.core_unit_cost_category.category_id, created_from_project_id -> landscape.tbl_project.project_id, default_uom_code -> landscape.tbl_measures.measure_code
export interface UnitCostItem {
  /** Default: nextval('core_unit_cost_item_item_id_seq'::regclass) */
  itemId: number;
  categoryId: number | null;
  itemName: string;
  defaultUomCode: string | null;
  typicalLowValue: number | null;
  typicalMidValue: number | null;
  typicalHighValue: number | null;
  marketGeography: string | null;
  /** Default: 'LAND'::character varying */
  projectTypeCode: string | null;
  lastUsedDate: string | null;
  /** Default: 0 */
  usageCount: number | null;
  /** Default: true */
  isActive: boolean | null;
  createdFromProjectId: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  /** Default: false */
  createdFromAi: boolean | null;
  quantity: number | null;
  source: string | null;
  asOfDate: string | null;
}

// Insert type for landscape.core_unit_cost_item (excludes auto-generated fields)
export type UnitCostItemInsert = {
  categoryId?: number | null;
  itemName: string;
  defaultUomCode?: string | null;
  typicalLowValue?: number | null;
  typicalMidValue?: number | null;
  typicalHighValue?: number | null;
  marketGeography?: string | null;
  projectTypeCode?: string | null;
  lastUsedDate?: string | null;
  usageCount?: number | null;
  isActive?: boolean | null;
  createdFromProjectId?: number | null;
  createdFromAi?: boolean | null;
  quantity?: number | null;
  source?: string | null;
  asOfDate?: string | null;
};

// landscape.core_workspace_member
// Primary Key: workspace_id, user_id
// Foreign Keys: workspace_id -> landscape.dms_workspaces.workspace_id
export interface WorkspaceMember {
  workspaceId: number;
  userId: number;
  role: string;
  /** Default: now() */
  createdAt: string;
}

// Insert type for landscape.core_workspace_member (excludes auto-generated fields)
export type WorkspaceMemberInsert = {
  workspaceId: number;
  userId: number;
  role: string;
};

// landscape.density_classification
// Primary Key: density_id
export interface DensityClassification {
  densityId: number;
  code: string;
  name: string;
  familyCategory: string;
  intensityMin: number | null;
  intensityMax: number | null;
  intensityMetric: string | null;
  description: string | null;
  jurisdictionNotes: string | null;
  /** Default: true */
  active: boolean | null;
  sortOrder: number | null;
  /** Default: now() */
  createdAt: string | null;
}

// Insert type for landscape.density_classification (excludes auto-generated fields)
export type DensityClassificationInsert = {
  densityId: number;
  code: string;
  name: string;
  familyCategory: string;
  intensityMin?: number | null;
  intensityMax?: number | null;
  intensityMetric?: string | null;
  description?: string | null;
  jurisdictionNotes?: string | null;
  active?: boolean | null;
  sortOrder?: number | null;
};

// landscape.developer_fees
// Primary Key: id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface DeveloperFees {
  /** Default: nextval('developer_fees_id_seq'::regclass) */
  id: number;
  projectId: number;
  feeType: string;
  feeDescription: string | null;
  basisType: string;
  basisValue: number | null;
  calculatedAmount: number | null;
  paymentTiming: string | null;
  /** Default: 'pending'::character varying */
  status: string | null;
  notes: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
  /** Default: 1 */
  timingStartPeriod: number | null;
  /** Default: 1 */
  timingDurationPeriods: number | null;
}

// Insert type for landscape.developer_fees (excludes auto-generated fields)
export type DeveloperFeesInsert = {
  projectId: number;
  feeType: string;
  feeDescription?: string | null;
  basisType: string;
  basisValue?: number | null;
  calculatedAmount?: number | null;
  paymentTiming?: string | null;
  status?: string | null;
  notes?: string | null;
  timingStartPeriod?: number | null;
  timingDurationPeriods?: number | null;
};

// landscape.django_admin_log
// Primary Key: id
// Foreign Keys: content_type_id -> landscape.django_content_type.id, user_id -> landscape.auth_user.id
export interface DjangoAdminLog {
  id: number;
  actionTime: string;
  objectId: string | null;
  objectRepr: string;
  actionFlag: number;
  changeMessage: string;
  contentTypeId: number | null;
  userId: number;
}

// landscape.django_content_type
// Primary Key: id
export interface DjangoContentType {
  id: number;
  appLabel: string;
  model: string;
}

// landscape.django_migrations
// Primary Key: id
export interface DjangoMigrations {
  id: number;
  app: string;
  name: string;
  applied: string;
}

// landscape.django_session
// Primary Key: session_key
export interface DjangoSession {
  sessionKey: string;
  sessionData: string;
  expireDate: string;
}

// landscape.dms_assertion
// Primary Key: assertion_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface DmsAssertion {
  /** Default: nextval('dms_assertion_assertion_id_seq'::regclass) */
  assertionId: number;
  projectId: number;
  docId: string;
  subjectType: string;
  subjectRef: string | null;
  metricKey: string;
  valueNum: number | null;
  valueText: string | null;
  units: string | null;
  context: string | null;
  page: number | null;
  bbox: any[] | null;
  /** Default: 0.95 */
  confidence: number;
  source: string | null;
  asOfDate: string | null;
  /** Default: now() */
  createdAt: string | null;
}

// Insert type for landscape.dms_assertion (excludes auto-generated fields)
export type DmsAssertionInsert = {
  projectId: number;
  docId: string;
  subjectType: string;
  subjectRef?: string | null;
  metricKey: string;
  valueNum?: number | null;
  valueText?: string | null;
  units?: string | null;
  context?: string | null;
  page?: number | null;
  bbox?: any[] | null;
  confidence?: number;
  source?: string | null;
  asOfDate?: string | null;
};

// landscape.dms_attributes
// Primary Key: attr_id
export interface DmsAttributes {
  /** Default: nextval('dms_attributes_attr_id_seq'::regclass) */
  attrId: number;
  attrKey: string;
  attrName: string;
  attrType: string;
  attrDescription: string | null;
  /** Default: false */
  isRequired: boolean | null;
  /** Default: true */
  isSearchable: boolean | null;
  /** Default: '{}'::jsonb */
  validationRules: any | null;
  enumValues: any | null;
  /** Default: NULL::character varying */
  lookupTable: string | null;
  /** Default: 0 */
  displayOrder: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.dms_attributes (excludes auto-generated fields)
export type DmsAttributesInsert = {
  attrKey: string;
  attrName: string;
  attrType: string;
  attrDescription?: string | null;
  isRequired?: boolean | null;
  isSearchable?: boolean | null;
  validationRules?: any | null;
  enumValues?: any | null;
  lookupTable?: string | null;
  displayOrder?: number | null;
};

// landscape.dms_doc_tag_assignments
// Primary Key: doc_id, tag_id
// Foreign Keys: tag_id -> landscape.dms_doc_tags.tag_id
export interface DmsDocTagAssignments {
  docId: number;
  tagId: number;
  assignedBy: number | null;
  /** Default: now() */
  assignedAt: string | null;
}

// Insert type for landscape.dms_doc_tag_assignments (excludes auto-generated fields)
export type DmsDocTagAssignmentsInsert = {
  docId: number;
  tagId: number;
  assignedBy?: number | null;
};

// landscape.dms_doc_tags
// Primary Key: tag_id
export interface DmsDocTags {
  /** Default: nextval('dms_doc_tags_tag_id_seq'::regclass) */
  tagId: number;
  tagName: string;
  workspaceId: number | null;
  /** Default: 0 */
  usageCount: number | null;
  createdBy: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  /** Default: NULL::character varying */
  subtypeCode: string | null;
}

// Insert type for landscape.dms_doc_tags (excludes auto-generated fields)
export type DmsDocTagsInsert = {
  tagName: string;
  workspaceId?: number | null;
  usageCount?: number | null;
  createdBy?: number | null;
  subtypeCode?: string | null;
};

// landscape.dms_extract_queue
// Primary Key: queue_id
// Foreign Keys: doc_id -> landscape.core_doc.doc_id
export interface DmsExtractQueue {
  /** Default: nextval('dms_extract_queue_queue_id_seq'::regclass) */
  queueId: number;
  docId: number | null;
  /** Default: 'ocr'::character varying */
  extractType: string;
  /** Default: 0 */
  priority: number | null;
  /** Default: 'pending'::character varying */
  status: string | null;
  /** Default: 0 */
  attempts: number | null;
  /** Default: 3 */
  maxAttempts: number | null;
  errorMessage: string | null;
  /** Default: '{}'::jsonb */
  extractedData: any | null;
  /** Default: now() */
  createdAt: string | null;
  processedAt: string | null;
  /** Default: 'pending'::character varying */
  reviewStatus: string | null;
  /** Default: 0.0 */
  overallConfidence: number | null;
  committedAt: string | null;
  commitNotes: string | null;
  extractedText: string | null;
}

// Insert type for landscape.dms_extract_queue (excludes auto-generated fields)
export type DmsExtractQueueInsert = {
  docId?: number | null;
  extractType?: string;
  priority?: number | null;
  status?: string | null;
  attempts?: number | null;
  maxAttempts?: number | null;
  errorMessage?: string | null;
  extractedData?: any | null;
  processedAt?: string | null;
  reviewStatus?: string | null;
  overallConfidence?: number | null;
  committedAt?: string | null;
  commitNotes?: string | null;
  extractedText?: string | null;
};

// landscape.dms_profile_audit
// Primary Key: audit_id
// Foreign Keys: doc_id -> landscape.core_doc.doc_id
export interface DmsProfileAudit {
  /** Default: nextval('dms_profile_audit_audit_id_seq'::regclass) */
  auditId: number;
  docId: number | null;
  changedBy: number | null;
  /** Default: 'profile_update'::character varying */
  changeType: string;
  /** Default: '{}'::jsonb */
  oldProfileJson: any | null;
  /** Default: '{}'::jsonb */
  newProfileJson: any | null;
  /** Default: '{}'::text[] */
  changedFields: any[] | null;
  changeReason: string | null;
  /** Default: now() */
  createdAt: string | null;
}

// Insert type for landscape.dms_profile_audit (excludes auto-generated fields)
export type DmsProfileAuditInsert = {
  docId?: number | null;
  changedBy?: number | null;
  changeType?: string;
  oldProfileJson?: any | null;
  newProfileJson?: any | null;
  changedFields?: any[] | null;
  changeReason?: string | null;
};

// landscape.dms_project_doc_types
// Primary Key: id
export interface DmsProjectDocTypes {
  /** Default: nextval('dms_project_doc_types_id_seq'::regclass) */
  id: number;
  projectId: number;
  docTypeName: string;
  /** Default: 0 */
  displayOrder: number | null;
  /** Default: false */
  isFromTemplate: boolean | null;
  /** Default: now() */
  createdAt: string | null;
}

// Insert type for landscape.dms_project_doc_types (excludes auto-generated fields)
export type DmsProjectDocTypesInsert = {
  projectId: number;
  docTypeName: string;
  displayOrder?: number | null;
  isFromTemplate?: boolean | null;
};

// landscape.dms_template_attributes
// Primary Key: template_id, attr_id
// Foreign Keys: attr_id -> landscape.dms_attributes.attr_id, template_id -> landscape.dms_templates.template_id
export interface DmsTemplateAttributes {
  templateId: number;
  attrId: number;
  /** Default: false */
  isRequired: boolean | null;
  defaultValue: any | null;
  /** Default: 0 */
  displayOrder: number | null;
}

// landscape.dms_templates
// Primary Key: template_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id, workspace_id -> landscape.dms_workspaces.workspace_id
export interface DmsTemplates {
  /** Default: nextval('dms_templates_template_id_seq'::regclass) */
  templateId: number;
  templateName: string;
  workspaceId: number | null;
  projectId: number | null;
  docType: string | null;
  /** Default: false */
  isDefault: boolean | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  docTypeOptions: any[] | null;
  description: string | null;
}

// Insert type for landscape.dms_templates (excludes auto-generated fields)
export type DmsTemplatesInsert = {
  templateName: string;
  workspaceId?: number | null;
  projectId?: number | null;
  docType?: string | null;
  isDefault?: boolean | null;
  docTypeOptions?: any[] | null;
  description?: string | null;
};

// landscape.dms_unmapped
// Primary Key: unmapped_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface DmsUnmapped {
  /** Default: nextval('dms_unmapped_unmapped_id_seq'::regclass) */
  unmappedId: number;
  docId: string;
  projectId: number | null;
  sourceKey: string;
  rawValue: string | null;
  candidateTargets: any[] | null;
  page: number | null;
  bbox: any[] | null;
  /** Default: 'new'::character varying */
  status: string;
  mappedToTable: string | null;
  mappedToColumn: string | null;
  notes: string | null;
  /** Default: now() */
  createdAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

// Insert type for landscape.dms_unmapped (excludes auto-generated fields)
export type DmsUnmappedInsert = {
  docId: string;
  projectId?: number | null;
  sourceKey: string;
  rawValue?: string | null;
  candidateTargets?: any[] | null;
  page?: number | null;
  bbox?: any[] | null;
  status?: string;
  mappedToTable?: string | null;
  mappedToColumn?: string | null;
  notes?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
};

// landscape.dms_workspaces
// Primary Key: workspace_id
export interface DmsWorkspaces {
  /** Default: nextval('dms_workspaces_workspace_id_seq'::regclass) */
  workspaceId: number;
  workspaceCode: string;
  workspaceName: string;
  description: string | null;
  /** Default: false */
  isDefault: boolean | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.dms_workspaces (excludes auto-generated fields)
export type DmsWorkspacesInsert = {
  workspaceCode: string;
  workspaceName: string;
  description?: string | null;
  isDefault?: boolean | null;
};

// landscape.doc_extracted_facts
// Primary Key: fact_id
// Foreign Keys: doc_id -> landscape.core_doc.doc_id
export interface DocExtractedFacts {
  /** Default: gen_random_uuid() */
  factId: string;
  docId: number;
  /** Default: 1 */
  sourceVersion: number;
  fieldName: string;
  fieldValue: string | null;
  confidence: number | null;
  extractionMethod: string | null;
  supersededAt: string | null;
  supersededByVersion: number | null;
  /** Default: now() */
  createdAt: string | null;
}

// Insert type for landscape.doc_extracted_facts (excludes auto-generated fields)
export type DocExtractedFactsInsert = {
  factId?: string;
  docId: number;
  sourceVersion?: number;
  fieldName: string;
  fieldValue?: string | null;
  confidence?: number | null;
  extractionMethod?: string | null;
  supersededAt?: string | null;
  supersededByVersion?: number | null;
};

// landscape.doc_geo_tag
// Primary Key: doc_geo_tag_id
// Foreign Keys: doc_id -> landscape.core_doc.doc_id
export interface DocGeoTag {
  /** Default: nextval('doc_geo_tag_doc_geo_tag_id_seq'::regclass) */
  docGeoTagId: number;
  docId: number;
  geoLevel: string;
  geoValue: string;
  /** Default: 'inferred'::character varying */
  geoSource: string | null;
  /** Default: now() */
  createdAt: string | null;
}

// Insert type for landscape.doc_geo_tag (excludes auto-generated fields)
export type DocGeoTagInsert = {
  docId: number;
  geoLevel: string;
  geoValue: string;
  geoSource?: string | null;
};

// landscape.doc_processing_queue
// Primary Key: queue_id
// Foreign Keys: doc_id -> landscape.core_doc.doc_id
export interface DocProcessingQueue {
  /** Default: nextval('doc_processing_queue_queue_id_seq'::regclass) */
  queueId: number;
  docId: number;
  projectId: number | null;
  /** Default: 'queued'::character varying */
  status: string | null;
  /** Default: 0 */
  priority: number | null;
  /** Default: 0 */
  attempts: number | null;
  /** Default: 3 */
  maxAttempts: number | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  /** Default: now() */
  createdAt: string | null;
}

// Insert type for landscape.doc_processing_queue (excludes auto-generated fields)
export type DocProcessingQueueInsert = {
  docId: number;
  projectId?: number | null;
  status?: string | null;
  priority?: number | null;
  attempts?: number | null;
  maxAttempts?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
  errorMessage?: string | null;
};

// landscape.document_tables
// Primary Key: table_id
// Foreign Keys: doc_id -> landscape.core_doc.doc_id
export interface DocumentTables {
  /** Default: nextval('document_tables_table_id_seq'::regclass) */
  tableId: number;
  docId: number | null;
  /** Default: 0 */
  tableOrder: number | null;
  pageNumber: number | null;
  tableTitle: string | null;
  headers: any | null;
  rows: any | null;
  /** Default: 0 */
  rowCount: number | null;
  /** Default: 'pdfplumber'::character varying */
  extractionSource: string | null;
  accuracy: number | null;
  rawData: any | null;
  /** Default: now() */
  createdAt: string | null;
}

// Insert type for landscape.document_tables (excludes auto-generated fields)
export type DocumentTablesInsert = {
  docId?: number | null;
  tableOrder?: number | null;
  pageNumber?: number | null;
  tableTitle?: string | null;
  headers?: any | null;
  rows?: any | null;
  rowCount?: number | null;
  extractionSource?: string | null;
  accuracy?: number | null;
  rawData?: any | null;
};

// landscape.extraction_commit_snapshot
// Primary Key: snapshot_id
// Foreign Keys: committed_by -> landscape.auth_user.id, doc_id -> landscape.core_doc.doc_id, project_id -> landscape.tbl_project.project_id
export interface ExtractionCommitSnapshot {
  snapshotId: number;
  scope: string;
  committedAt: string;
  snapshotData: any;
  changesApplied: any;
  isActive: boolean;
  rolledBackAt: string | null;
  committedBy: number | null;
  docId: number | null;
  projectId: number;
}

// landscape.geography_columns
export interface GeographyColumns {
  fTableCatalog: any | null;
  fTableSchema: any | null;
  fTableName: any | null;
  fGeographyColumn: any | null;
  coordDimension: number | null;
  srid: number | null;
  type: string | null;
}

// landscape.geometry_columns
export interface GeometryColumns {
  fTableCatalog: string | null;
  fTableSchema: any | null;
  fTableName: any | null;
  fGeometryColumn: any | null;
  coordDimension: number | null;
  srid: number | null;
  type: string | null;
}

// landscape.gis_boundary_history
// Primary Key: boundary_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface GisBoundaryHistory {
  /** Default: nextval('gis_boundary_history_boundary_id_seq'::regclass) */
  boundaryId: number;
  projectId: number;
  /** Default: 'tax_parcel_boundary'::character varying */
  boundaryType: string;
  parcelsSelected: any;
  totalAcres: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: 'boundary_confirmed'::character varying */
  actionType: string;
}

// Insert type for landscape.gis_boundary_history (excludes auto-generated fields)
export type GisBoundaryHistoryInsert = {
  projectId: number;
  boundaryType?: string;
  parcelsSelected: any;
  totalAcres?: number | null;
  actionType?: string;
};

// landscape.gis_document_ingestion
// Primary Key: id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface GisDocumentIngestion {
  /** Default: gen_random_uuid() */
  id: string;
  projectId: number;
  packageName: string;
  documentType: string;
  filename: string;
  aiAnalysis: any | null;
  /** Default: 0 */
  parcelsCreated: number | null;
  /** Default: 0 */
  geometryAdded: number | null;
  /** Default: 'processing'::text */
  status: string | null;
  errorDetails: string | null;
  /** Default: now() */
  processedAt: string | null;
  /** Default: now() */
  createdAt: string;
}

// Insert type for landscape.gis_document_ingestion (excludes auto-generated fields)
export type GisDocumentIngestionInsert = {
  id?: string;
  projectId: number;
  packageName: string;
  documentType: string;
  filename: string;
  aiAnalysis?: any | null;
  parcelsCreated?: number | null;
  geometryAdded?: number | null;
  status?: string | null;
  errorDetails?: string | null;
};

// landscape.gis_mapping_history
// Primary Key: mapping_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface GisMappingHistory {
  /** Default: nextval('gis_mapping_history_mapping_id_seq'::regclass) */
  mappingId: number;
  projectId: number;
  /** Default: 'assessor_field_mapping'::character varying */
  mappingType: string;
  fieldsMapped: any;
  sourceData: any | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: 'mapping_applied'::character varying */
  actionType: string;
}

// Insert type for landscape.gis_mapping_history (excludes auto-generated fields)
export type GisMappingHistoryInsert = {
  projectId: number;
  mappingType?: string;
  fieldsMapped: any;
  sourceData?: any | null;
  actionType?: string;
};

// landscape.gis_plan_parcel
// Primary Key: id
// Foreign Keys: parcel_id -> landscape.tbl_parcel.parcel_id, project_id -> landscape.tbl_project.project_id
export interface GisPlanParcel {
  /** Default: gen_random_uuid() */
  id: string;
  projectId: number;
  parcelId: number;
  geom: string /* geometry enum */;
  sourceDoc: string;
  /** Default: 1 */
  version: number;
  /** Default: 0.95 */
  confidence: number | null;
  /** Default: now() */
  validFrom: string;
  validTo: string | null;
  /** Default: true */
  isActive: boolean;
  /** Default: now() */
  createdAt: string;
}

// Insert type for landscape.gis_plan_parcel (excludes auto-generated fields)
export type GisPlanParcelInsert = {
  id?: string;
  projectId: number;
  parcelId: number;
  geom: string /* geometry enum */;
  sourceDoc: string;
  version?: number;
  confidence?: number | null;
  validTo?: string | null;
  isActive?: boolean;
};

// landscape.gis_project_boundary
// Primary Key: id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface GisProjectBoundary {
  /** Default: gen_random_uuid() */
  id: string;
  projectId: number;
  geom: string /* geometry enum */;
  /** Default: 'user_selection'::text */
  source: string;
  /** Default: now() */
  createdAt: string;
}

// Insert type for landscape.gis_project_boundary (excludes auto-generated fields)
export type GisProjectBoundaryInsert = {
  id?: string;
  projectId: number;
  geom: string /* geometry enum */;
  source?: string;
};

// landscape.gis_tax_parcel_ref
// Primary Key: tax_parcel_id
export interface GisTaxParcelRef {
  taxParcelId: string;
  geom: string /* geometry enum */;
  assessorAttrs: any | null;
  sourceUpdatedAt: string | null;
  /** Default: now() */
  createdAt: string;
  source: string | null;
  updatedAt: string | null;
}

// Insert type for landscape.gis_tax_parcel_ref (excludes auto-generated fields)
export type GisTaxParcelRefInsert = {
  taxParcelId: string;
  geom: string /* geometry enum */;
  assessorAttrs?: any | null;
  sourceUpdatedAt?: string | null;
  source?: string | null;
  updatedAt?: string | null;
};

// landscape.glossary_zoning
// Primary Key: glossary_id
export interface GlossaryZoning {
  /** Default: gen_random_uuid() */
  glossaryId: string;
  jurisdictionCity: string;
  jurisdictionCounty: string | null;
  jurisdictionState: string;
  jurisdictionDisplay: string;
  districtCode: string | null;
  districtName: string | null;
  familyName: string;
  localCodeRaw: string;
  localCodeCanonical: string | null;
  codeTokenKind: string /* code_token_kind enum */;
  codeTokenConfidence: number;
  mappedUse: string;
  allowance: string;
  purposeText: string | null;
  intentText: string | null;
  conditionsText: string | null;
  developmentStandards: any | null;
  useStandardRefs: any | null;
  definitionsRefs: any | null;
  narrativeSectionRef: string | null;
  narrativeSrcUrl: string | null;
  sourceDocUrl: string | null;
  effectiveDate: string | null;
  amendingOrdList: any | null;
  /** Default: true */
  isActive: boolean;
  /** Default: now() */
  createdAt: string;
  /** Default: now() */
  updatedAt: string;
  suggestedFamily: string | null;
  suggestedDensityCode: string | null;
  suggestedTypeCode: string | null;
  aiConfidence: number | null;
  mappingStatus: string | null;
}

// Insert type for landscape.glossary_zoning (excludes auto-generated fields)
export type GlossaryZoningInsert = {
  glossaryId?: string;
  jurisdictionCity: string;
  jurisdictionCounty?: string | null;
  jurisdictionState: string;
  jurisdictionDisplay: string;
  districtCode?: string | null;
  districtName?: string | null;
  familyName: string;
  localCodeRaw: string;
  localCodeCanonical?: string | null;
  codeTokenKind: string /* code_token_kind enum */;
  codeTokenConfidence: number;
  mappedUse: string;
  allowance: string;
  purposeText?: string | null;
  intentText?: string | null;
  conditionsText?: string | null;
  developmentStandards?: any | null;
  useStandardRefs?: any | null;
  definitionsRefs?: any | null;
  narrativeSectionRef?: string | null;
  narrativeSrcUrl?: string | null;
  sourceDocUrl?: string | null;
  effectiveDate?: string | null;
  amendingOrdList?: any | null;
  isActive?: boolean;
  suggestedFamily?: string | null;
  suggestedDensityCode?: string | null;
  suggestedTypeCode?: string | null;
  aiConfidence?: number | null;
  mappingStatus?: string | null;
};

// landscape.knowledge_embeddings
// Primary Key: embedding_id
export interface KnowledgeEmbeddings {
  embeddingId: number;
  sourceType: string;
  sourceId: number;
  contentText: string;
  embedding: string /* vector enum */ | null;
  entityIds: any[];
  tags: any[];
  createdAt: string;
  /** Default: 1 */
  sourceVersion: number | null;
  supersededByVersion: number | null;
}

// landscape.knowledge_entities
// Primary Key: entity_id
// Foreign Keys: created_by_id -> landscape.auth_user.id
export interface KnowledgeEntities {
  entityId: number;
  entityType: string;
  entitySubtype: string | null;
  canonicalName: string;
  metadata: any;
  createdAt: string;
  createdById: number | null;
}

// landscape.knowledge_facts
// Primary Key: fact_id
// Foreign Keys: created_by_id -> landscape.auth_user.id, object_entity_id -> landscape.knowledge_entities.entity_id, subject_entity_id -> landscape.knowledge_entities.entity_id, superseded_by_id -> landscape.knowledge_facts.fact_id
export interface KnowledgeFacts {
  factId: number;
  predicate: string;
  objectValue: string | null;
  validFrom: string | null;
  validTo: string | null;
  sourceType: string;
  sourceId: number | null;
  confidenceScore: number;
  isCurrent: boolean;
  createdAt: string;
  createdById: number | null;
  objectEntityId: number | null;
  subjectEntityId: number;
  supersededById: number | null;
}

// landscape.knowledge_insights
// Primary Key: insight_id
// Foreign Keys: acknowledged_by_id -> landscape.auth_user.id, subject_entity_id -> landscape.knowledge_entities.entity_id
export interface KnowledgeInsights {
  insightId: number;
  insightType: string;
  relatedEntities: any[];
  insightTitle: string;
  insightDescription: string;
  severity: string;
  supportingFacts: any[];
  metadata: any;
  acknowledged: boolean;
  acknowledgedAt: string | null;
  userAction: string | null;
  createdAt: string;
  acknowledgedById: number | null;
  subjectEntityId: number;
}

// landscape.knowledge_interactions
// Primary Key: interaction_id
// Foreign Keys: session_id -> landscape.knowledge_sessions.session_id
export interface KnowledgeInteractions {
  interactionId: number;
  userQuery: string;
  queryType: string;
  queryIntent: string | null;
  contextEntities: any[];
  contextFacts: any[];
  aiResponse: string;
  responseType: string;
  confidenceScore: number | null;
  inputTokens: number;
  outputTokens: number;
  userFeedback: string | null;
  userCorrection: string | null;
  createdAt: string;
  sessionId: string;
}

// landscape.knowledge_sessions
// Primary Key: session_id
// Foreign Keys: user_id -> landscape.auth_user.id
export interface KnowledgeSessions {
  sessionId: string;
  workspaceId: number | null;
  projectId: number | null;
  sessionStart: string;
  sessionEnd: string | null;
  loadedEntities: any[];
  loadedFactsCount: number;
  contextTokenCount: number;
  contextSummary: string | null;
  metadata: any;
  userId: number;
}

// landscape.land_use_pricing
// Primary Key: id
// Foreign Keys: benchmark_id -> landscape.tbl_global_benchmark_registry.benchmark_id, growth_rate_set_id -> landscape.core_fin_growth_rate_sets.set_id
export interface LandUsePricing {
  /** Default: nextval('land_use_pricing_id_seq'::regclass) */
  id: number;
  projectId: number;
  luTypeCode: string;
  pricePerUnit: number | null;
  unitOfMeasure: string | null;
  inflationType: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  benchmarkId: number | null;
  marketGeography: string | null;
  productCode: string | null;
  growthRate: number | null;
  growthRateSetId: number | null;
}

// Insert type for landscape.land_use_pricing (excludes auto-generated fields)
export type LandUsePricingInsert = {
  projectId: number;
  luTypeCode: string;
  pricePerUnit?: number | null;
  unitOfMeasure?: string | null;
  inflationType?: string | null;
  benchmarkId?: number | null;
  marketGeography?: string | null;
  productCode?: string | null;
  growthRate?: number | null;
  growthRateSetId?: number | null;
};

// landscape.landscaper_absorption_detail
// Primary Key: detail_id
// Foreign Keys: benchmark_id -> landscape.tbl_global_benchmark_registry.benchmark_id
export interface LandscaperAbsorptionDetail {
  /** Default: nextval('landscaper_absorption_detail_detail_id_seq'::regclass) */
  detailId: number;
  benchmarkId: number | null;
  dataSourceType: string;
  sourceDocumentId: number | null;
  /** Default: now() */
  extractionDate: string | null;
  asOfPeriod: string | null;
  subdivisionName: string | null;
  mpcName: string | null;
  city: string | null;
  state: string | null;
  marketGeography: string | null;
  annualSales: number | null;
  monthlyRate: number | null;
  yoyChangePct: number | null;
  lotSizeSf: number | null;
  pricePointLow: number | null;
  pricePointHigh: number | null;
  builderName: string | null;
  activeSubdivisionsCount: number | null;
  productMixJson: any | null;
  marketTier: string | null;
  competitiveSupply: string | null;
  notes: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.landscaper_absorption_detail (excludes auto-generated fields)
export type LandscaperAbsorptionDetailInsert = {
  benchmarkId?: number | null;
  dataSourceType: string;
  sourceDocumentId?: number | null;
  asOfPeriod?: string | null;
  subdivisionName?: string | null;
  mpcName?: string | null;
  city?: string | null;
  state?: string | null;
  marketGeography?: string | null;
  annualSales?: number | null;
  monthlyRate?: number | null;
  yoyChangePct?: number | null;
  lotSizeSf?: number | null;
  pricePointLow?: number | null;
  pricePointHigh?: number | null;
  builderName?: string | null;
  activeSubdivisionsCount?: number | null;
  productMixJson?: any | null;
  marketTier?: string | null;
  competitiveSupply?: string | null;
  notes?: string | null;
};

// landscape.landscaper_activity
// Primary Key: activity_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface LandscaperActivity {
  /** Default: nextval('landscaper_activity_activity_id_seq'::regclass) */
  activityId: number;
  projectId: number;
  activityType: string;
  title: string;
  summary: string;
  /** Default: 'pending'::character varying */
  status: string;
  confidence: string | null;
  link: string | null;
  blockedBy: string | null;
  details: any | null;
  highlightFields: any | null;
  /** Default: false */
  isRead: boolean;
  sourceType: string | null;
  sourceId: string | null;
  /** Default: now() */
  createdAt: string;
  /** Default: now() */
  updatedAt: string;
}

// Insert type for landscape.landscaper_activity (excludes auto-generated fields)
export type LandscaperActivityInsert = {
  projectId: number;
  activityType: string;
  title: string;
  summary: string;
  status?: string;
  confidence?: string | null;
  link?: string | null;
  blockedBy?: string | null;
  details?: any | null;
  highlightFields?: any | null;
  isRead?: boolean;
  sourceType?: string | null;
  sourceId?: string | null;
};

// landscape.landscaper_advice
// Primary Key: advice_id
// Foreign Keys: message_id -> landscape.landscaper_chat_message.message_id, project_id -> landscape.tbl_project.project_id
export interface LandscaperAdvice {
  adviceId: number;
  assumptionKey: string;
  lifecycleStage: string;
  suggestedValue: number;
  confidenceLevel: string;
  createdAt: string;
  notes: string | null;
  messageId: string | null;
  projectId: number;
}

// landscape.landscaper_chat_embedding
// Primary Key: id
// Foreign Keys: message_id -> landscape.landscaper_thread_message.id, thread_id -> landscape.landscaper_chat_thread.id
export interface LandscaperChatEmbedding {
  /** Default: gen_random_uuid() */
  id: string;
  messageId: string;
  threadId: string;
  projectId: number;
  embedding: string /* vector enum */ | null;
  /** Default: now() */
  createdAt: string | null;
}

// Insert type for landscape.landscaper_chat_embedding (excludes auto-generated fields)
export type LandscaperChatEmbeddingInsert = {
  id?: string;
  messageId: string;
  threadId: string;
  projectId: number;
  embedding?: string /* vector enum */ | null;
};

// landscape.landscaper_chat_message
// Primary Key: message_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id, user_id -> landscape.auth_user.id
export interface LandscaperChatMessage {
  messageId: string;
  role: string;
  content: string;
  timestamp: string;
  metadata: any | null;
  projectId: number;
  userId: number | null;
  /** Default: 'home'::character varying */
  activeTab: string | null;
}

// landscape.landscaper_chat_thread
// Primary Key: id
// Foreign Keys: created_by -> landscape.auth_user.id, project_id -> landscape.tbl_project.project_id
export interface LandscaperChatThread {
  /** Default: gen_random_uuid() */
  id: string;
  projectId: number | null;
  pageContext: string | null;
  subtabContext: string | null;
  title: string | null;
  summary: string | null;
  /** Default: true */
  isActive: boolean | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  closedAt: string | null;
  /** Default: false */
  isArchived: boolean;
  archivedAt: string | null;
  archivedByUserId: string | null;
  docId: number | null;
  createdBy: number | null;
}

// Insert type for landscape.landscaper_chat_thread (excludes auto-generated fields)
export type LandscaperChatThreadInsert = {
  id?: string;
  projectId?: number | null;
  pageContext?: string | null;
  subtabContext?: string | null;
  title?: string | null;
  summary?: string | null;
  isActive?: boolean | null;
  closedAt?: string | null;
  isArchived?: boolean;
  archivedAt?: string | null;
  archivedByUserId?: string | null;
  docId?: number | null;
  createdBy?: number | null;
};

// landscape.landscaper_thread_message
// Primary Key: id
// Foreign Keys: thread_id -> landscape.landscaper_chat_thread.id
export interface LandscaperThreadMessage {
  /** Default: gen_random_uuid() */
  id: string;
  threadId: string;
  role: string;
  content: string;
  metadata: any | null;
  /** Default: now() */
  createdAt: string | null;
}

// Insert type for landscape.landscaper_thread_message (excludes auto-generated fields)
export type LandscaperThreadMessageInsert = {
  id?: string;
  threadId: string;
  role: string;
  content: string;
  metadata?: any | null;
};

// landscape.lkp_building_class
// Primary Key: code
export interface LkpBuildingClass {
  code: string;
  displayName: string;
  description: string | null;
}

// landscape.lkp_buyer_seller_type
// Primary Key: code
export interface LkpBuyerSellerType {
  code: string;
  displayName: string;
  sortOrder: number | null;
}

// landscape.lkp_price_status
// Primary Key: code
export interface LkpPriceStatus {
  code: string;
  displayName: string;
  description: string | null;
  reliabilityScore: number | null;
}

// landscape.lkp_sale_type
// Primary Key: code
export interface LkpSaleType {
  code: string;
  displayName: string;
  description: string | null;
  sortOrder: number | null;
}

// landscape.lu_acreage_allocation_type
// Primary Key: allocation_type_id
export interface AcreageAllocationType {
  /** Default: nextval('lu_acreage_allocation_type_allocation_type_id_seq'::regclass) */
  allocationTypeId: number;
  allocationTypeCode: string;
  allocationTypeName: string;
  description: string | null;
  /** Default: false */
  isDevelopable: boolean | null;
  /** Default: 0 */
  sortOrder: number | null;
  /** Default: true */
  isActive: boolean | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
}

// Insert type for landscape.lu_acreage_allocation_type (excludes auto-generated fields)
export type AcreageAllocationTypeInsert = {
  allocationTypeCode: string;
  allocationTypeName: string;
  description?: string | null;
  isDevelopable?: boolean | null;
  sortOrder?: number | null;
  isActive?: boolean | null;
};

// landscape.lu_com_spec
// Primary Key: com_spec_id
// Foreign Keys: doc_id -> landscape.planning_doc.doc_id, type_id -> landscape.lu_type.type_id
export interface ComSpec {
  comSpecId: number;
  typeId: number;
  farMin: number | null;
  farMax: number | null;
  covMaxPct: number | null;
  pkPerKsf: number | null;
  hgtMaxFt: number | null;
  sbFrontFt: number | null;
  sbSideFt: number | null;
  sbCornerFt: number | null;
  sbRearFt: number | null;
  osMinPct: number | null;
  notes: string | null;
  effDate: string | null;
  docId: number | null;
}

// landscape.lu_family
// Primary Key: family_id
export interface Family {
  familyId: number;
  code: string;
  name: string;
  /** Default: true */
  active: boolean;
  notes: string | null;
}

// landscape.lu_lease_status
// Primary Key: status_code
export interface LeaseStatus {
  statusCode: string;
  statusName: string;
  description: string | null;
  /** Default: true */
  affectsOccupancy: boolean | null;
  displayOrder: number | null;
}

// landscape.lu_lease_type
// Primary Key: type_code
export interface LeaseType {
  typeCode: string;
  typeName: string;
  description: string | null;
  displayOrder: number | null;
}

// landscape.lu_market
// Primary Key: market_id
export interface Market {
  /** Default: nextval('lu_market_market_id_seq'::regclass) */
  marketId: number;
  marketCode: string;
  marketName: string;
  state: string | null;
  /** Default: true */
  isActive: boolean | null;
}

// Insert type for landscape.lu_market (excludes auto-generated fields)
export type MarketInsert = {
  marketCode: string;
  marketName: string;
  state?: string | null;
  isActive?: boolean | null;
};

// landscape.lu_media_classification
// Primary Key: classification_id
export interface MediaClassification {
  /** Default: nextval('lu_media_classification_classification_id_seq'::regclass) */
  classificationId: number;
  classificationCode: string;
  classificationName: string;
  description: string | null;
  badgeColor: string;
  badgeIcon: string | null;
  /** Default: 0 */
  sortOrder: number;
  /** Default: true */
  isActive: boolean;
  /** Default: now() */
  createdAt: string;
  contentIntent: string | null;
  defaultAction: string | null;
}

// Insert type for landscape.lu_media_classification (excludes auto-generated fields)
export type MediaClassificationInsert = {
  classificationCode: string;
  classificationName: string;
  description?: string | null;
  badgeColor: string;
  badgeIcon?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  contentIntent?: string | null;
  defaultAction?: string | null;
};

// landscape.lu_picklist_display_config
// Primary Key: config_id
export interface PicklistDisplayConfig {
  /** Default: nextval('lu_picklist_display_config_config_id_seq'::regclass) */
  configId: number;
  listCode: string;
  context: string;
  displayFormat: string;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.lu_picklist_display_config (excludes auto-generated fields)
export type PicklistDisplayConfigInsert = {
  listCode: string;
  context: string;
  displayFormat: string;
};

// landscape.lu_property_subtype
// Primary Key: subtype_id
export interface PropertySubtype {
  /** Default: nextval('lu_property_subtype_subtype_id_seq'::regclass) */
  subtypeId: number;
  propertyTypeCode: string;
  subtypeCode: string;
  subtypeName: string;
  /** Default: 0 */
  sortOrder: number | null;
  /** Default: true */
  isActive: boolean | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
}

// Insert type for landscape.lu_property_subtype (excludes auto-generated fields)
export type PropertySubtypeInsert = {
  propertyTypeCode: string;
  subtypeCode: string;
  subtypeName: string;
  sortOrder?: number | null;
  isActive?: boolean | null;
};

// landscape.lu_recovery_structure
// Primary Key: structure_code
export interface RecoveryStructure {
  structureCode: string;
  structureName: string;
  description: string | null;
  displayOrder: number | null;
}

// landscape.lu_res_spec
// Primary Key: res_spec_id
// Foreign Keys: doc_id -> landscape.planning_doc.doc_id, type_id -> landscape.lu_type.type_id
export interface ResSpec {
  resSpecId: number;
  typeId: number;
  duaMin: number | null;
  duaMax: number | null;
  lotWMinFt: number | null;
  lotDMinFt: number | null;
  lotAreaMinSf: number | null;
  sbFrontFt: number | null;
  sbSideFt: number | null;
  sbCornerFt: number | null;
  sbRearFt: number | null;
  hgtMaxFt: number | null;
  covMaxPct: number | null;
  osMinPct: number | null;
  pkPerUnit: number | null;
  notes: string | null;
  effDate: string | null;
  docId: number | null;
}

// landscape.lu_subtype
// Primary Key: subtype_id
// Foreign Keys: family_id -> landscape.lu_family.family_id
export interface Subtype {
  /** Default: nextval('lu_subtype_subtype_id_seq1'::regclass) */
  subtypeId: number;
  familyId: number | null;
  code: string;
  name: string;
  /** Default: 0 */
  ord: number | null;
  /** Default: true */
  active: boolean | null;
  notes: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.lu_subtype (excludes auto-generated fields)
export type SubtypeInsert = {
  familyId?: number | null;
  code: string;
  name: string;
  ord?: number | null;
  active?: boolean | null;
  notes?: string | null;
};

// landscape.lu_type
// Primary Key: type_id
// Foreign Keys: family_id -> landscape.lu_family.family_id
export interface Type {
  typeId: number;
  familyId: number;
  code: string;
  name: string;
  ord: number | null;
  /** Default: true */
  active: boolean;
  notes: string | null;
}

// landscape.management_overhead
// Primary Key: id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface ManagementOverhead {
  /** Default: nextval('management_overhead_id_seq'::regclass) */
  id: number;
  projectId: number;
  itemName: string;
  amount: number;
  /** Default: 'monthly'::character varying */
  frequency: string | null;
  /** Default: 1 */
  startPeriod: number | null;
  /** Default: 1 */
  durationPeriods: number | null;
  containerLevel: string | null;
  containerId: number | null;
  notes: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.management_overhead (excludes auto-generated fields)
export type ManagementOverheadInsert = {
  projectId: number;
  itemName: string;
  amount: number;
  frequency?: string | null;
  startPeriod?: number | null;
  durationPeriods?: number | null;
  containerLevel?: string | null;
  containerId?: number | null;
  notes?: string | null;
};

// landscape.market_activity
// Primary Key: id
export interface MarketActivity {
  /** Default: nextval('market_activity_id_seq'::regclass) */
  id: number;
  msaCode: string;
  source: string;
  metricType: string;
  geographyType: string;
  geographyName: string;
  periodType: string;
  periodEndDate: string;
  value: number;
  notes: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.market_activity (excludes auto-generated fields)
export type MarketActivityInsert = {
  msaCode: string;
  source: string;
  metricType: string;
  geographyType: string;
  geographyName: string;
  periodType: string;
  periodEndDate: string;
  value: number;
  notes?: string | null;
};

// landscape.market_assumptions
// Primary Key: project_id
export interface MarketAssumptions {
  projectId: number;
  commissionBasis: string | null;
  demandUnit: string | null;
  uom: string | null;
  /** Default: now() */
  updatedAt: string;
  luTypeCode: string | null;
  pricePerUnit: number | null;
  unitOfMeasure: string | null;
  inflationType: string | null;
  dvlPerYear: number | null;
  dvlPerQuarter: number | null;
  dvlPerMonth: number | null;
}

// Insert type for landscape.market_assumptions (excludes auto-generated fields)
export type MarketAssumptionsInsert = {
  projectId: number;
  commissionBasis?: string | null;
  demandUnit?: string | null;
  uom?: string | null;
  luTypeCode?: string | null;
  pricePerUnit?: number | null;
  unitOfMeasure?: string | null;
  inflationType?: string | null;
  dvlPerYear?: number | null;
  dvlPerQuarter?: number | null;
  dvlPerMonth?: number | null;
};

// landscape.market_competitive_project_exclusions
// Primary Key: id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface MarketCompetitiveProjectExclusions {
  /** Default: nextval('market_competitive_project_exclusions_id_seq'::regclass) */
  id: number;
  projectId: number;
  sourceProjectId: string;
  /** Default: CURRENT_TIMESTAMP */
  excludedAt: string | null;
  excludedReason: string | null;
}

// Insert type for landscape.market_competitive_project_exclusions (excludes auto-generated fields)
export type MarketCompetitiveProjectExclusionsInsert = {
  projectId: number;
  sourceProjectId: string;
  excludedReason?: string | null;
};

// landscape.market_competitive_project_products
// Primary Key: id
// Foreign Keys: competitive_project_id -> landscape.market_competitive_projects.id, product_id -> landscape.res_lot_product.product_id
export interface MarketCompetitiveProjectProducts {
  /** Default: nextval('market_competitive_project_products_id_seq'::regclass) */
  id: number;
  competitiveProjectId: number;
  productId: number | null;
  lotWidthFt: number | null;
  lotDimensions: string | null;
  unitSizeMinSf: number | null;
  unitSizeMaxSf: number | null;
  unitSizeAvgSf: number | null;
  priceMin: number | null;
  priceMax: number | null;
  priceAvg: number | null;
  pricePerSfAvg: number | null;
  unitsPlanned: number | null;
  unitsSold: number | null;
  unitsRemaining: number | null;
  qmiCount: number | null;
  salesRateMonthly: number | null;
  salesRate_3mAvg: number | null;
  salesRate_6mAvg: number | null;
  mosVdl: number | null;
  mosInventory: number | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.market_competitive_project_products (excludes auto-generated fields)
export type MarketCompetitiveProjectProductsInsert = {
  competitiveProjectId: number;
  productId?: number | null;
  lotWidthFt?: number | null;
  lotDimensions?: string | null;
  unitSizeMinSf?: number | null;
  unitSizeMaxSf?: number | null;
  unitSizeAvgSf?: number | null;
  priceMin?: number | null;
  priceMax?: number | null;
  priceAvg?: number | null;
  pricePerSfAvg?: number | null;
  unitsPlanned?: number | null;
  unitsSold?: number | null;
  unitsRemaining?: number | null;
  qmiCount?: number | null;
  salesRateMonthly?: number | null;
  salesRate_3mAvg?: number | null;
  salesRate_6mAvg?: number | null;
  mosVdl?: number | null;
  mosInventory?: number | null;
};

// landscape.market_competitive_projects
// Primary Key: id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface MarketCompetitiveProjects {
  /** Default: nextval('market_competitive_projects_id_seq'::regclass) */
  id: number;
  projectId: number;
  masterPlanName: string | null;
  compName: string;
  builderName: string | null;
  compAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  zipCode: string | null;
  totalUnits: number | null;
  priceMin: number | null;
  priceMax: number | null;
  absorptionRateMonthly: number | null;
  /** Default: 'selling'::character varying */
  status: string | null;
  /** Default: 'manual'::character varying */
  dataSource: string | null;
  sourceUrl: string | null;
  notes: string | null;
  sourceProjectId: string | null;
  effectiveDate: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.market_competitive_projects (excludes auto-generated fields)
export type MarketCompetitiveProjectsInsert = {
  projectId: number;
  masterPlanName?: string | null;
  compName: string;
  builderName?: string | null;
  compAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  zipCode?: string | null;
  totalUnits?: number | null;
  priceMin?: number | null;
  priceMax?: number | null;
  absorptionRateMonthly?: number | null;
  status?: string | null;
  dataSource?: string | null;
  sourceUrl?: string | null;
  notes?: string | null;
  sourceProjectId?: string | null;
  effectiveDate?: string | null;
};

// landscape.mkt_data_source_registry
// Primary Key: source_id
export interface MktDataSourceRegistry {
  sourceId: number;
  sourceCode: string;
  sourceName: string;
  sourceType: string;
  collectionMethod: string | null;
  updateFrequency: string | null;
  typicalLagDays: number | null;
  coverageGeography: string | null;
  coverageDescription: string | null;
  fieldDefinitions: any;
  knownLimitations: string | null;
  caveats: string | null;
  isAuthoritativeFor: any;
  websiteUrl: string | null;
  documentationUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// landscape.mkt_new_home_project
// Primary Key: record_id
// Foreign Keys: source_id -> landscape.mkt_data_source_registry.source_id
export interface MktNewHomeProject {
  recordId: number;
  sourceProjectId: string | null;
  sourceSubdivisionId: string | null;
  effectiveDate: string;
  sourceFile: string | null;
  surveyPeriod: string | null;
  projectName: string;
  masterPlanName: string | null;
  masterPlanId: string | null;
  masterPlanDeveloper: string | null;
  builderName: string | null;
  parentBuilder: string | null;
  status: string | null;
  productType: string | null;
  productStyle: string | null;
  isActiveAdult: boolean;
  characteristics: string | null;
  lotSizeSf: number | null;
  lotWidthFt: number | null;
  lotDepthFt: number | null;
  lotDimensions: string | null;
  unitSizeMinSf: number | null;
  unitSizeMaxSf: number | null;
  unitSizeAvgSf: number | null;
  priceMin: number | null;
  priceMax: number | null;
  priceAvg: number | null;
  pricePerSfAvg: number | null;
  priceChangeDate: string | null;
  unitsPlanned: number | null;
  unitsSold: number | null;
  unitsRemaining: number | null;
  qmiCount: number | null;
  openDate: string | null;
  soldOutDate: string | null;
  salesRateMonthly: number | null;
  salesRate_3mAvg: number | null;
  salesRate_6mAvg: number | null;
  salesRate_12mAvg: number | null;
  salesChangeDate: string | null;
  annualStarts: number | null;
  annualClosings: number | null;
  quarterlyStarts: number | null;
  quarterlyClosings: number | null;
  pipelineExcavation: number | null;
  pipelineSurveyStakes: number | null;
  pipelineStreetPaving: number | null;
  pipelineStreetsIn: number | null;
  pipelineVdl: number | null;
  pipelineVacantLand: number | null;
  pipelineUnderConstruction: number | null;
  pipelineFinishedVacant: number | null;
  modelsCount: number | null;
  occupiedCount: number | null;
  futureInventoryCount: number | null;
  mosVdl: number | null;
  mosInventory: number | null;
  mosFinishedVacant: number | null;
  incentiveQmiPct: number | null;
  incentiveQmiAmt: number | null;
  incentiveQmiType: string | null;
  incentiveTbbPct: number | null;
  incentiveTbbAmt: number | null;
  incentiveTbbType: string | null;
  incentiveBrokerPct: number | null;
  incentiveBrokerAmt: number | null;
  incentiveBrokerType: string | null;
  hoaFeeMonthly: number | null;
  hoaFee_2Monthly: number | null;
  hoaFeePerSqft: number | null;
  assessmentRate: number | null;
  assessmentDescription: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  city: string | null;
  zipCode: string | null;
  county: string | null;
  countyFips: number | null;
  cbsaName: string | null;
  cbsaCode: number | null;
  state: string | null;
  boundaryNames: string | null;
  schoolDistrict: string | null;
  schoolElementary: string | null;
  schoolRatingElementary: string | null;
  schoolMiddle: string | null;
  schoolRatingMiddle: string | null;
  schoolHigh: string | null;
  schoolRatingHigh: string | null;
  websiteUrl: string | null;
  officePhone: string | null;
  luFamilyId: number | null;
  luDensityId: number | null;
  luTypeId: number | null;
  luProductId: number | null;
  luLinkageMethod: string | null;
  luLinkageConfidence: number | null;
  ingestionTimestamp: string;
  updatedAt: string;
  sourceId: number;
}

// landscape.mkt_permit_history
// Primary Key: record_id
// Foreign Keys: source_id -> landscape.mkt_data_source_registry.source_id
export interface MktPermitHistory {
  recordId: number;
  sourceFile: string | null;
  permitMonth: string;
  jurisdictionName: string;
  jurisdictionType: string | null;
  county: string | null;
  state: string;
  cbsaCode: number | null;
  permitsSf: number | null;
  permitsMf: number | null;
  permitsTotal: number | null;
  permitsDetached: number | null;
  permitsAttached: number | null;
  permitsCustom: number | null;
  ingestionTimestamp: string;
  sourceId: number;
}

// landscape.mutation_audit_log
// Primary Key: audit_id
export interface MutationAuditLog {
  /** Default: nextval('mutation_audit_log_audit_id_seq'::regclass) */
  auditId: number;
  mutationId: string | null;
  projectId: number | null;
  mutationType: string;
  tableName: string;
  fieldName: string | null;
  recordId: string | null;
  oldValue: any | null;
  newValue: any | null;
  action: string;
  errorMessage: string | null;
  reason: string | null;
  sourceMessageId: string | null;
  sourceDocuments: any | null;
  /** Default: 'landscaper_ai'::character varying */
  initiatedBy: string | null;
  confirmedBy: string | null;
  /** Default: now() */
  createdAt: string;
  sourceType: string | null;
}

// Insert type for landscape.mutation_audit_log (excludes auto-generated fields)
export type MutationAuditLogInsert = {
  mutationId?: string | null;
  projectId?: number | null;
  mutationType: string;
  tableName: string;
  fieldName?: string | null;
  recordId?: string | null;
  oldValue?: any | null;
  newValue?: any | null;
  action: string;
  errorMessage?: string | null;
  reason?: string | null;
  sourceMessageId?: string | null;
  sourceDocuments?: any | null;
  initiatedBy?: string | null;
  confirmedBy?: string | null;
  sourceType?: string | null;
};

// landscape.mv_doc_search
export interface MvDocSearch {
  docId: number | null;
  projectId: number | null;
  workspaceId: number | null;
  docName: string | null;
  docType: string | null;
  discipline: string | null;
  status: string | null;
  versionNo: number | null;
  storageUri: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  docDate: string | null;
  contractValue: number | null;
  priority: string | null;
  profileJson: any | null;
  createdAt: string | null;
  updatedAt: string | null;
  projectName: string | null;
  phaseName: string | null;
  parcelName: string | null;
  folderId: number | null;
  folderPath: string | null;
  folderName: string | null;
  extractedText: string | null;
  wordCount: number | null;
  mediaScanStatus: string | null;
  mediaScanJson: any | null;
  searchableText: string | null;
}

// landscape.opex_benchmark
// Primary Key: id
export interface OpexBenchmark {
  /** Default: nextval('opex_benchmark_id_seq'::regclass) */
  id: number;
  source: string;
  sourceYear: number;
  reportName: string | null;
  propertyType: string;
  propertySubtype: string | null;
  geographicScope: string;
  geographyName: string | null;
  expenseCategory: string;
  expenseSubcategory: string | null;
  perUnitAmount: number | null;
  perSfAmount: number | null;
  pctOfEgi: number | null;
  pctOfGpi: number | null;
  sampleSize: number | null;
  sampleUnits: number | null;
  notes: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.opex_benchmark (excludes auto-generated fields)
export type OpexBenchmarkInsert = {
  source: string;
  sourceYear: number;
  reportName?: string | null;
  propertyType: string;
  propertySubtype?: string | null;
  geographicScope: string;
  geographyName?: string | null;
  expenseCategory: string;
  expenseSubcategory?: string | null;
  perUnitAmount?: number | null;
  perSfAmount?: number | null;
  pctOfEgi?: number | null;
  pctOfGpi?: number | null;
  sampleSize?: number | null;
  sampleUnits?: number | null;
  notes?: string | null;
};

// landscape.opex_label_mapping
// Primary Key: mapping_id
export interface OpexLabelMapping {
  /** Default: nextval('opex_label_mapping_mapping_id_seq'::regclass) */
  mappingId: number;
  sourceLabel: string;
  normalizedLabel: string | null;
  parentCategory: string;
  targetField: string | null;
  /** Default: now() */
  createdAt: string | null;
  createdBy: number | null;
  /** Default: 1 */
  timesUsed: number | null;
}

// Insert type for landscape.opex_label_mapping (excludes auto-generated fields)
export type OpexLabelMappingInsert = {
  sourceLabel: string;
  normalizedLabel?: string | null;
  parentCategory: string;
  targetField?: string | null;
  createdBy?: number | null;
  timesUsed?: number | null;
};

// landscape.pending_mutations
// Primary Key: mutation_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id, unit_id -> landscape.tbl_multifamily_unit.unit_id
export interface PendingMutations {
  /** Default: gen_random_uuid() */
  mutationId: string;
  projectId: number | null;
  mutationType: string;
  tableName: string;
  fieldName: string | null;
  recordId: string | null;
  currentValue: any | null;
  proposedValue: any;
  reason: string;
  sourceMessageId: string | null;
  /** Default: '[]'::jsonb */
  sourceDocuments: any | null;
  /** Default: false */
  isHighRisk: boolean;
  /** Default: 'pending'::character varying */
  status: string;
  /** Default: now() */
  createdAt: string;
  /** Default: (now() + '01:00:00'::interval) */
  expiresAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  batchId: string | null;
  /** Default: 0 */
  sequenceInBatch: number | null;
  sourceType: string | null;
  divisionId: number | null;
  unitId: number | null;
}

// Insert type for landscape.pending_mutations (excludes auto-generated fields)
export type PendingMutationsInsert = {
  mutationId?: string;
  projectId?: number | null;
  mutationType: string;
  tableName: string;
  fieldName?: string | null;
  recordId?: string | null;
  currentValue?: any | null;
  proposedValue: any;
  reason: string;
  sourceMessageId?: string | null;
  sourceDocuments?: any | null;
  isHighRisk?: boolean;
  status?: string;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  batchId?: string | null;
  sequenceInBatch?: number | null;
  sourceType?: string | null;
  divisionId?: number | null;
  unitId?: number | null;
};

// landscape.planning_doc
// Primary Key: doc_id
export interface PlanningDoc {
  docId: number;
  projectId: number | null;
  jurisdictionId: number | null;
  docType: string;
  title: string;
  docUrl: string | null;
  effDate: string | null;
  sectionRef: string | null;
  notes: string | null;
}

// landscape.project_boundaries
// Primary Key: boundary_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface ProjectBoundaries {
  /** Default: nextval('project_boundaries_boundary_id_seq'::regclass) */
  boundaryId: number;
  projectId: number;
  parcelCount: number;
  totalAcres: number;
  dissolvedGeometry: string /* geometry enum */ | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.project_boundaries (excludes auto-generated fields)
export type ProjectBoundariesInsert = {
  projectId: number;
  parcelCount: number;
  totalAcres: number;
  dissolvedGeometry?: string /* geometry enum */ | null;
};

// landscape.project_jurisdiction_mapping
// Primary Key: mapping_id
// Foreign Keys: density_code -> landscape.density_classification.code, glossary_id -> landscape.glossary_zoning.glossary_id, project_id -> landscape.tbl_project.project_id
export interface ProjectJurisdictionMapping {
  mappingId: number;
  projectId: number;
  glossaryId: string | null;
  familyName: string | null;
  densityCode: string | null;
  typeCode: string | null;
  /** Default: false */
  userApproved: boolean | null;
  notes: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.project_jurisdiction_mapping (excludes auto-generated fields)
export type ProjectJurisdictionMappingInsert = {
  mappingId: number;
  projectId: number;
  glossaryId?: string | null;
  familyName?: string | null;
  densityCode?: string | null;
  typeCode?: string | null;
  userApproved?: boolean | null;
  notes?: string | null;
};

// landscape.project_land_use
// Primary Key: project_land_use_id
// Foreign Keys: family_id -> landscape.lu_family.family_id, project_id -> landscape.tbl_project.project_id, type_id -> landscape.lu_type.type_id
export interface ProjectLandUse {
  /** Default: nextval('project_land_use_project_land_use_id_seq'::regclass) */
  projectLandUseId: number;
  projectId: number;
  familyId: number;
  typeId: number;
  /** Default: true */
  isActive: boolean;
  notes: string | null;
  /** Default: now() */
  createdAt: string;
  /** Default: now() */
  updatedAt: string;
}

// Insert type for landscape.project_land_use (excludes auto-generated fields)
export type ProjectLandUseInsert = {
  projectId: number;
  familyId: number;
  typeId: number;
  isActive?: boolean;
  notes?: string | null;
};

// landscape.project_land_use_product
// Primary Key: project_land_use_product_id
// Foreign Keys: product_id -> landscape.res_lot_product.product_id, project_land_use_id -> landscape.project_land_use.project_land_use_id
export interface ProjectLandUseProduct {
  /** Default: nextval('project_land_use_product_project_land_use_product_id_seq'::regclass) */
  projectLandUseProductId: number;
  projectLandUseId: number;
  productId: number;
  /** Default: true */
  isActive: boolean;
  /** Default: now() */
  createdAt: string;
}

// Insert type for landscape.project_land_use_product (excludes auto-generated fields)
export type ProjectLandUseProductInsert = {
  projectLandUseId: number;
  productId: number;
  isActive?: boolean;
};

// landscape.project_parcel_boundaries
// Primary Key: parcel_boundary_id
// Foreign Keys: boundary_id -> landscape.project_boundaries.boundary_id, project_id -> landscape.tbl_project.project_id
export interface ProjectParcelBoundaries {
  /** Default: nextval('project_parcel_boundaries_parcel_boundary_id_seq'::regclass) */
  parcelBoundaryId: number;
  boundaryId: number;
  projectId: number;
  parcelId: string;
  geometry: string /* geometry enum */;
  grossAcres: number | null;
  ownerName: string | null;
  siteAddress: string | null;
  /** Default: now() */
  createdAt: string | null;
}

// Insert type for landscape.project_parcel_boundaries (excludes auto-generated fields)
export type ProjectParcelBoundariesInsert = {
  boundaryId: number;
  projectId: number;
  parcelId: string;
  geometry: string /* geometry enum */;
  grossAcres?: number | null;
  ownerName?: string | null;
  siteAddress?: string | null;
};

// landscape.report_templates
// Primary Key: id
// Foreign Keys: report_definition_id -> landscape.tbl_report_definition.id
export interface ReportTemplates {
  id: number;
  templateName: string;
  description: string | null;
  outputFormat: string;
  assignedTabs: any;
  sections: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  reportDefinitionId: number | null;
  /** Default: '{}'::character varying[] */
  propertyTypes: any[] | null;
  /** Default: ''::character varying */
  reportCategory: string;
}

// landscape.res_lot_product
// Primary Key: product_id
// Foreign Keys: type_id -> landscape.lu_type.type_id
export interface ResLotProduct {
  productId: number;
  code: string;
  lotWFt: number;
  lotDFt: number;
  lotAreaSf: number | null;
  typeId: number | null;
  /** Default: true */
  isActive: boolean | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.res_lot_product (excludes auto-generated fields)
export type ResLotProductInsert = {
  productId: number;
  code: string;
  lotWFt: number;
  lotDFt: number;
  lotAreaSf?: number | null;
  typeId?: number | null;
  isActive?: boolean | null;
};

// landscape.sale_names
// Primary Key: id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface SaleNames {
  /** Default: nextval('sale_names_id_seq'::regclass) */
  id: number;
  projectId: number;
  saleDate: string;
  saleName: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.sale_names (excludes auto-generated fields)
export type SaleNamesInsert = {
  projectId: number;
  saleDate: string;
  saleName?: string | null;
};

// landscape.spatial_ref_sys
// Primary Key: srid
export interface SpatialRefSys {
  srid: number;
  authName: string | null;
  authSrid: number | null;
  srtext: string | null;
  proj4text: string | null;
}

// landscape.tbl_absorption_schedule
// Primary Key: absorption_id
// Foreign Keys: area_id -> landscape.tbl_area.area_id, parcel_id -> landscape.tbl_parcel.parcel_id, phase_id -> landscape.tbl_phase.phase_id, project_id -> landscape.tbl_project.project_id, scenario_id -> landscape.tbl_scenario.scenario_id
export interface AbsorptionSchedule {
  /** Default: nextval('tbl_absorption_schedule_absorption_id_seq'::regclass) */
  absorptionId: number;
  projectId: number;
  areaId: number | null;
  phaseId: number | null;
  parcelId: number | null;
  revenueStreamName: string;
  revenueCategory: string | null;
  luFamilyName: string | null;
  luTypeCode: string | null;
  productCode: string | null;
  startPeriod: number | null;
  periodsToComplete: number | null;
  /** Default: 'ABSOLUTE'::character varying */
  timingMethod: string | null;
  unitsPerPeriod: number | null;
  totalUnits: number | null;
  basePricePerUnit: number | null;
  /** Default: 0 */
  priceEscalationPct: number | null;
  /** Default: 'Base Case'::character varying */
  scenarioName: string | null;
  /** Default: 1.0 */
  probabilityWeight: number | null;
  notes: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  scenarioId: number | null;
  /** Default: NULL::character varying */
  confidence: string | null;
  dataSource: string | null;
}

// Insert type for landscape.tbl_absorption_schedule (excludes auto-generated fields)
export type AbsorptionScheduleInsert = {
  projectId: number;
  areaId?: number | null;
  phaseId?: number | null;
  parcelId?: number | null;
  revenueStreamName: string;
  revenueCategory?: string | null;
  luFamilyName?: string | null;
  luTypeCode?: string | null;
  productCode?: string | null;
  startPeriod?: number | null;
  periodsToComplete?: number | null;
  timingMethod?: string | null;
  unitsPerPeriod?: number | null;
  totalUnits?: number | null;
  basePricePerUnit?: number | null;
  priceEscalationPct?: number | null;
  scenarioName?: string | null;
  probabilityWeight?: number | null;
  notes?: string | null;
  scenarioId?: number | null;
  confidence?: string | null;
  dataSource?: string | null;
};

// landscape.tbl_acquisition
// Primary Key: acquisition_id
// Foreign Keys: category_id -> landscape.core_unit_cost_category.category_id, measure_id -> landscape.tbl_measures.measure_id, project_id -> landscape.tbl_project.project_id, subcategory_id -> landscape.core_unit_cost_category.category_id
export interface Acquisition {
  /** Default: nextval('tbl_acquisition_acquisition_id_seq'::regclass) */
  acquisitionId: number;
  projectId: number;
  contactId: number | null;
  eventDate: string | null;
  eventType: string | null;
  description: string | null;
  amount: number | null;
  /** Default: true */
  isAppliedToPurchase: boolean | null;
  unitsConveyed: number | null;
  measureId: number | null;
  notes: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
  goesHardDate: string | null;
  /** Default: false */
  isConditional: boolean | null;
  categoryId: number | null;
  subcategoryId: number | null;
}

// Insert type for landscape.tbl_acquisition (excludes auto-generated fields)
export type AcquisitionInsert = {
  projectId: number;
  contactId?: number | null;
  eventDate?: string | null;
  eventType?: string | null;
  description?: string | null;
  amount?: number | null;
  isAppliedToPurchase?: boolean | null;
  unitsConveyed?: number | null;
  measureId?: number | null;
  notes?: string | null;
  goesHardDate?: string | null;
  isConditional?: boolean | null;
  categoryId?: number | null;
  subcategoryId?: number | null;
};

// landscape.tbl_acreage_allocation
// Primary Key: allocation_id
// Foreign Keys: allocation_type_id -> landscape.lu_acreage_allocation_type.allocation_type_id, parcel_id -> landscape.tbl_parcel.parcel_id, phase_id -> landscape.tbl_phase.phase_id, project_id -> landscape.tbl_project.project_id, source_doc_id -> landscape.core_doc.doc_id
export interface AcreageAllocation {
  /** Default: nextval('tbl_acreage_allocation_allocation_id_seq'::regclass) */
  allocationId: number;
  projectId: number;
  phaseId: number | null;
  parcelId: number | null;
  allocationTypeId: number | null;
  allocationTypeCode: string | null;
  acres: number;
  sourceDocId: number | null;
  sourcePage: number | null;
  sourceSnippet: string | null;
  confidenceScore: number | null;
  notes: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
  createdBy: string | null;
  valueSource: string | null;
}

// Insert type for landscape.tbl_acreage_allocation (excludes auto-generated fields)
export type AcreageAllocationInsert = {
  projectId: number;
  phaseId?: number | null;
  parcelId?: number | null;
  allocationTypeId?: number | null;
  allocationTypeCode?: string | null;
  acres: number;
  sourceDocId?: number | null;
  sourcePage?: number | null;
  sourceSnippet?: string | null;
  confidenceScore?: number | null;
  notes?: string | null;
  createdBy?: string | null;
  valueSource?: string | null;
};

// landscape.tbl_additional_income
// Primary Key: additional_income_id
// Foreign Keys: lease_id -> landscape.tbl_lease.lease_id
export interface AdditionalIncome {
  additionalIncomeId: number;
  leaseId: number;
  /** Default: 0 */
  parkingSpaces: number | null;
  parkingRateMonthly: number | null;
  parkingAnnual: number | null;
  /** Default: '[]'::jsonb */
  otherIncome: any | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_additional_income (excludes auto-generated fields)
export type AdditionalIncomeInsert = {
  additionalIncomeId: number;
  leaseId: number;
  parkingSpaces?: number | null;
  parkingRateMonthly?: number | null;
  parkingAnnual?: number | null;
  otherIncome?: any | null;
};

// landscape.tbl_ai_adjustment_suggestions
// Primary Key: ai_suggestion_id
// Foreign Keys: comparable_id -> landscape.tbl_sales_comparables.comparable_id
export interface AiAdjustmentSuggestions {
  /** Default: nextval('tbl_ai_adjustment_suggestions_ai_suggestion_id_seq'::regclass) */
  aiSuggestionId: number;
  comparableId: number;
  adjustmentType: string;
  suggestedPct: number | null;
  confidenceLevel: string | null;
  justification: string | null;
  modelVersion: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_ai_adjustment_suggestions (excludes auto-generated fields)
export type AiAdjustmentSuggestionsInsert = {
  comparableId: number;
  adjustmentType: string;
  suggestedPct?: number | null;
  confidenceLevel?: string | null;
  justification?: string | null;
  modelVersion?: string | null;
};

// landscape.tbl_alpha_feedback
// Primary Key: id
export interface AlphaFeedback {
  /** Default: nextval('tbl_alpha_feedback_id_seq'::regclass) */
  id: number;
  pageContext: string | null;
  projectId: number | null;
  userId: number | null;
  feedback: string;
  /** Default: 'new'::character varying */
  status: string | null;
  notes: string | null;
  /** Default: now() */
  submittedAt: string | null;
  /** Default: now() */
  createdAt: string | null;
}

// Insert type for landscape.tbl_alpha_feedback (excludes auto-generated fields)
export type AlphaFeedbackInsert = {
  pageContext?: string | null;
  projectId?: number | null;
  userId?: number | null;
  feedback: string;
  status?: string | null;
  notes?: string | null;
};

// landscape.tbl_analysis_draft
// Primary Key: draft_id
export interface AnalysisDraft {
  /** Default: nextval('tbl_analysis_draft_draft_id_seq'::regclass) */
  draftId: number;
  userId: number;
  draftName: string | null;
  propertyType: string | null;
  perspective: string | null;
  purpose: string | null;
  /** Default: false */
  valueAddEnabled: boolean | null;
  /** Default: '{}'::jsonb */
  inputs: any;
  /** Default: '{}'::jsonb */
  calcSnapshot: any | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  latitude: number | null;
  longitude: number | null;
  chatThreadId: number | null;
  convertedProjectId: number | null;
  /** Default: 'active'::character varying */
  status: string;
  /** Default: now() */
  createdAt: string;
  /** Default: now() */
  updatedAt: string;
}

// Insert type for landscape.tbl_analysis_draft (excludes auto-generated fields)
export type AnalysisDraftInsert = {
  userId: number;
  draftName?: string | null;
  propertyType?: string | null;
  perspective?: string | null;
  purpose?: string | null;
  valueAddEnabled?: boolean | null;
  inputs?: any;
  calcSnapshot?: any | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  chatThreadId?: number | null;
  convertedProjectId?: number | null;
  status?: string;
};

// landscape.tbl_analysis_type_config
// Primary Key: config_id
export interface AnalysisTypeConfig {
  /** Default: nextval('tbl_analysis_type_config_config_id_seq'::regclass) */
  configId: number;
  analysisType: string;
  /** Default: false */
  tileValuation: boolean | null;
  /** Default: false */
  tileCapitalization: boolean | null;
  /** Default: false */
  tileReturns: boolean | null;
  /** Default: false */
  tileDevelopmentBudget: boolean | null;
  /** Default: false */
  requiresCapitalStack: boolean | null;
  /** Default: false */
  requiresComparableSales: boolean | null;
  /** Default: false */
  requiresIncomeApproach: boolean | null;
  /** Default: false */
  requiresCostApproach: boolean | null;
  /** Default: '[]'::jsonb */
  availableReports: any | null;
  landscaperContext: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
  analysisPerspective: string | null;
  analysisPurpose: string | null;
}

// Insert type for landscape.tbl_analysis_type_config (excludes auto-generated fields)
export type AnalysisTypeConfigInsert = {
  analysisType: string;
  tileValuation?: boolean | null;
  tileCapitalization?: boolean | null;
  tileReturns?: boolean | null;
  tileDevelopmentBudget?: boolean | null;
  requiresCapitalStack?: boolean | null;
  requiresComparableSales?: boolean | null;
  requiresIncomeApproach?: boolean | null;
  requiresCostApproach?: boolean | null;
  availableReports?: any | null;
  landscaperContext?: string | null;
  analysisPerspective?: string | null;
  analysisPurpose?: string | null;
};

// landscape.tbl_approval
// Primary Key: approval_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface Approval {
  approvalId: number;
  projectId: number | null;
  approvalType: string | null;
  approvalDate: string | null;
  notes: string | null;
}

// landscape.tbl_area
// Primary Key: area_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface Area {
  areaId: number;
  projectId: number;
  areaAlias: string;
  areaNo: number | null;
}

// landscape.tbl_artifact
// Primary Key: artifact_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface Artifact {
  /** Default: nextval('tbl_artifact_artifact_id_seq'::regclass) */
  artifactId: number;
  projectId: number | null;
  threadId: string | null;
  toolName: string;
  paramsJson: any;
  currentStateJson: any;
  /** Default: '{}'::jsonb */
  sourcePointersJson: any;
  editTargetJson: any | null;
  title: string;
  pinnedLabel: string | null;
  /** Default: now() */
  createdAt: string;
  /** Default: now() */
  lastEditedAt: string;
  createdByUserId: string;
  /** Default: false */
  isArchived: boolean;
  dedupKey: string | null;
}

// Insert type for landscape.tbl_artifact (excludes auto-generated fields)
export type ArtifactInsert = {
  projectId?: number | null;
  threadId?: string | null;
  toolName: string;
  paramsJson: any;
  currentStateJson: any;
  sourcePointersJson?: any;
  editTargetJson?: any | null;
  title: string;
  pinnedLabel?: string | null;
  createdByUserId: string;
  isArchived?: boolean;
  dedupKey?: string | null;
};

// landscape.tbl_artifact_version
// Primary Key: version_id
// Foreign Keys: artifact_id -> landscape.tbl_artifact.artifact_id
export interface ArtifactVersion {
  /** Default: nextval('tbl_artifact_version_version_id_seq'::regclass) */
  versionId: number;
  artifactId: number;
  versionSeq: number;
  /** Default: now() */
  editedAt: string;
  editedByUserId: string;
  editSource: string;
  stateDiffJson: any;
}

// Insert type for landscape.tbl_artifact_version (excludes auto-generated fields)
export type ArtifactVersionInsert = {
  artifactId: number;
  versionSeq: number;
  editedByUserId: string;
  editSource: string;
  stateDiffJson: any;
};

// landscape.tbl_assumption_snapshot
// Primary Key: snapshot_id
// Foreign Keys: scenario_log_id -> landscape.tbl_scenario_log.scenario_log_id
export interface AssumptionSnapshot {
  /** Default: nextval('tbl_assumption_snapshot_snapshot_id_seq'::regclass) */
  snapshotId: number;
  scenarioLogId: number;
  field: string;
  tableName: string;
  recordId: string | null;
  originalValue: any | null;
  overrideValue: any | null;
  label: string | null;
  unit: string | null;
  /** Default: now() */
  appliedAt: string;
}

// Insert type for landscape.tbl_assumption_snapshot (excludes auto-generated fields)
export type AssumptionSnapshotInsert = {
  scenarioLogId: number;
  field: string;
  tableName: string;
  recordId?: string | null;
  originalValue?: any | null;
  overrideValue?: any | null;
  label?: string | null;
  unit?: string | null;
};

// landscape.tbl_assumptionrule
// Primary Key: rule_id
export interface Assumptionrule {
  ruleId: number;
  ruleCategory: string | null;
  ruleKey: string | null;
  ruleValue: string | null;
}

// landscape.tbl_base_rent
// Primary Key: base_rent_id
// Foreign Keys: lease_id -> landscape.tbl_lease.lease_id
export interface BaseRent {
  baseRentId: number;
  leaseId: number;
  periodNumber: number;
  periodStartDate: string;
  periodEndDate: string;
  /** Default: 'Fixed'::character varying */
  rentType: string | null;
  baseRentPsfAnnual: number | null;
  baseRentAnnual: number | null;
  baseRentMonthly: number | null;
  percentageRentRate: number | null;
  percentageRentBreakpoint: number | null;
  percentageRentAnnual: number | null;
  /** Default: 0 */
  freeRentMonths: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_base_rent (excludes auto-generated fields)
export type BaseRentInsert = {
  baseRentId: number;
  leaseId: number;
  periodNumber: number;
  periodStartDate: string;
  periodEndDate: string;
  rentType?: string | null;
  baseRentPsfAnnual?: number | null;
  baseRentAnnual?: number | null;
  baseRentMonthly?: number | null;
  percentageRentRate?: number | null;
  percentageRentBreakpoint?: number | null;
  percentageRentAnnual?: number | null;
  freeRentMonths?: number | null;
};

// landscape.tbl_benchmark_ai_suggestions
// Primary Key: suggestion_id
// Foreign Keys: created_benchmark_id -> landscape.tbl_global_benchmark_registry.benchmark_id, document_id -> landscape.core_doc.doc_id, existing_benchmark_id -> landscape.tbl_global_benchmark_registry.benchmark_id, project_id -> landscape.tbl_project.project_id
export interface BenchmarkAiSuggestions {
  /** Default: nextval('tbl_benchmark_ai_suggestions_suggestion_id_seq'::regclass) */
  suggestionId: number;
  userId: string;
  documentId: number;
  projectId: number | null;
  /** Default: now() */
  extractionDate: string | null;
  category: string;
  subcategory: string | null;
  suggestedName: string;
  suggestedValue: number;
  suggestedUom: string | null;
  marketGeography: string | null;
  propertyType: string | null;
  confidenceScore: number | null;
  extractionContext: any | null;
  existingBenchmarkId: number | null;
  variancePercentage: number | null;
  inflationAdjustedComparison: any | null;
  /** Default: 'pending'::character varying */
  status: string | null;
  userResponse: any | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdBenchmarkId: number | null;
  /** Default: now() */
  createdAt: string | null;
}

// Insert type for landscape.tbl_benchmark_ai_suggestions (excludes auto-generated fields)
export type BenchmarkAiSuggestionsInsert = {
  userId: string;
  documentId: number;
  projectId?: number | null;
  category: string;
  subcategory?: string | null;
  suggestedName: string;
  suggestedValue: number;
  suggestedUom?: string | null;
  marketGeography?: string | null;
  propertyType?: string | null;
  confidenceScore?: number | null;
  extractionContext?: any | null;
  existingBenchmarkId?: number | null;
  variancePercentage?: number | null;
  inflationAdjustedComparison?: any | null;
  status?: string | null;
  userResponse?: any | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  createdBenchmarkId?: number | null;
};

// landscape.tbl_benchmark_contingency
// Primary Key: benchmark_id
// Foreign Keys: benchmark_id -> landscape.tbl_global_benchmark_registry.benchmark_id
export interface BenchmarkContingency {
  benchmarkId: number;
  percentage: number;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_benchmark_contingency (excludes auto-generated fields)
export type BenchmarkContingencyInsert = {
  benchmarkId: number;
  percentage: number;
};

// landscape.tbl_benchmark_transaction_cost
// Primary Key: transaction_cost_id
// Foreign Keys: benchmark_id -> landscape.tbl_global_benchmark_registry.benchmark_id
export interface BenchmarkTransactionCost {
  /** Default: nextval('tbl_benchmark_transaction_cost_transaction_cost_id_seq'::regclass) */
  transactionCostId: number;
  benchmarkId: number;
  costType: string;
  value: number | null;
  valueType: string;
  basis: string | null;
  dealSizeMin: number | null;
  dealSizeMax: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_benchmark_transaction_cost (excludes auto-generated fields)
export type BenchmarkTransactionCostInsert = {
  benchmarkId: number;
  costType: string;
  value?: number | null;
  valueType: string;
  basis?: string | null;
  dealSizeMin?: number | null;
  dealSizeMax?: number | null;
};

// landscape.tbl_benchmark_unit_cost
// Primary Key: unit_cost_id
// Foreign Keys: benchmark_id -> landscape.tbl_global_benchmark_registry.benchmark_id
export interface BenchmarkUnitCost {
  /** Default: nextval('tbl_benchmark_unit_cost_unit_cost_id_seq'::regclass) */
  unitCostId: number;
  benchmarkId: number;
  value: number;
  uomCode: string;
  uomAltCode: string | null;
  lowValue: number | null;
  highValue: number | null;
  costPhase: string | null;
  workType: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_benchmark_unit_cost (excludes auto-generated fields)
export type BenchmarkUnitCostInsert = {
  benchmarkId: number;
  value: number;
  uomCode: string;
  uomAltCode?: string | null;
  lowValue?: number | null;
  highValue?: number | null;
  costPhase?: string | null;
  workType?: string | null;
};

// landscape.tbl_budget
// Primary Key: budget_id
// Foreign Keys: devphase_id -> landscape.tbl_phase.phase_id, measure_id -> landscape.tbl_measures.measure_id
export interface Budget {
  budgetId: number;
  devphaseId: number | null;
  budgetCategory: string;
  budgetSubcategory: string | null;
  amount: number | null;
  sourceTable: string | null;
  sourceId: number | null;
  measureId: number | null;
  costPerUnit: number | null;
  quantity: number | null;
  /** Default: 'Capital'::character varying */
  expenseType: string | null;
  /** Default: 'Lump Sum'::character varying */
  budgetTimingMethod: string | null;
}

// landscape.tbl_budget_fact
// Primary Key: budget_fact_id
// Foreign Keys: category_id -> landscape.core_unit_cost_category.category_id, phase_id -> landscape.tbl_phase.phase_id, project_id -> landscape.tbl_project.project_id, source_doc_id -> landscape.core_doc.doc_id
export interface BudgetFact {
  /** Default: nextval('tbl_budget_fact_budget_fact_id_seq'::regclass) */
  budgetFactId: number;
  projectId: number;
  phaseId: number | null;
  categoryId: number | null;
  categoryName: string | null;
  lineItemName: string | null;
  totalCost: number | null;
  costPerUnit: number | null;
  costPerSf: number | null;
  quantity: number | null;
  unitOfMeasure: string | null;
  sourceDocId: number | null;
  confidenceScore: number | null;
  notes: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
  createdBy: string | null;
}

// Insert type for landscape.tbl_budget_fact (excludes auto-generated fields)
export type BudgetFactInsert = {
  projectId: number;
  phaseId?: number | null;
  categoryId?: number | null;
  categoryName?: string | null;
  lineItemName?: string | null;
  totalCost?: number | null;
  costPerUnit?: number | null;
  costPerSf?: number | null;
  quantity?: number | null;
  unitOfMeasure?: string | null;
  sourceDocId?: number | null;
  confidenceScore?: number | null;
  notes?: string | null;
  createdBy?: string | null;
};

// landscape.tbl_budget_items
// Primary Key: budget_item_id
// Foreign Keys: actual_period_id -> landscape.tbl_calculation_period.period_id, project_id -> landscape.tbl_project.project_id, structure_id -> landscape.tbl_budget_structure.structure_id
export interface BudgetItems {
  /** Default: nextval('tbl_budget_items_budget_item_id_seq'::regclass) */
  budgetItemId: number;
  projectId: number;
  structureId: number;
  amount: number | null;
  quantity: number | null;
  costPerUnit: number | null;
  notes: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
  migratedAt: string | null;
  /** Default: 'ABSOLUTE'::character varying */
  timingMethod: string | null;
  /** Default: false */
  timingLocked: boolean | null;
  /** Default: 'LINEAR'::character varying */
  sCurveProfile: string | null;
  /** Default: 0 */
  actualAmount: number | null;
  /** Default: 0 */
  actualQuantity: number | null;
  actualPeriodId: number | null;
  varianceAmount: number | null;
  variancePct: number | null;
  startPeriod: number | null;
  periodsToComplete: number | null;
}

// Insert type for landscape.tbl_budget_items (excludes auto-generated fields)
export type BudgetItemsInsert = {
  projectId: number;
  structureId: number;
  amount?: number | null;
  quantity?: number | null;
  costPerUnit?: number | null;
  notes?: string | null;
  migratedAt?: string | null;
  timingMethod?: string | null;
  timingLocked?: boolean | null;
  sCurveProfile?: string | null;
  actualAmount?: number | null;
  actualQuantity?: number | null;
  actualPeriodId?: number | null;
  varianceAmount?: number | null;
  variancePct?: number | null;
  startPeriod?: number | null;
  periodsToComplete?: number | null;
};

// landscape.tbl_budget_structure
// Primary Key: structure_id
// Foreign Keys: measure_id -> landscape.tbl_measures.measure_id
export interface BudgetStructure {
  /** Default: nextval('tbl_budget_structure_structure_id_seq'::regclass) */
  structureId: number;
  scope: string;
  category: string;
  detail: string;
  /** Default: '$$'::character varying */
  costMethod: string | null;
  measureId: number | null;
  /** Default: true */
  isSystem: boolean | null;
  createdBy: number | null;
  /** Default: 0 */
  sortOrder: number | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
  startPeriod: number | null;
  periodsToComplete: number | null;
  migratedAt: string | null;
}

// Insert type for landscape.tbl_budget_structure (excludes auto-generated fields)
export type BudgetStructureInsert = {
  scope: string;
  category: string;
  detail: string;
  costMethod?: string | null;
  measureId?: number | null;
  isSystem?: boolean | null;
  createdBy?: number | null;
  sortOrder?: number | null;
  startPeriod?: number | null;
  periodsToComplete?: number | null;
  migratedAt?: string | null;
};

// landscape.tbl_budget_timing
// Primary Key: timing_id
// Foreign Keys: fact_id -> landscape.core_fin_fact_budget.fact_id, period_id -> landscape.tbl_calculation_period.period_id
export interface BudgetTiming {
  timingId: number;
  factId: number;
  periodId: number;
  amount: number;
  /** Default: 'distributed'::character varying */
  timingMethod: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string;
}

// Insert type for landscape.tbl_budget_timing (excludes auto-generated fields)
export type BudgetTimingInsert = {
  timingId: number;
  factId: number;
  periodId: number;
  amount: number;
  timingMethod?: string | null;
};

// landscape.tbl_cabinet
// Primary Key: cabinet_id
export interface Cabinet {
  /** Default: nextval('tbl_cabinet_cabinet_id_seq'::regclass) */
  cabinetId: number;
  cabinetName: string;
  ownerUserId: string;
  /** Default: 'standard'::character varying */
  cabinetType: string | null;
  /** Default: '{}'::jsonb */
  settings: any | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
  /** Default: true */
  isActive: boolean | null;
}

// Insert type for landscape.tbl_cabinet (excludes auto-generated fields)
export type CabinetInsert = {
  cabinetName: string;
  ownerUserId: string;
  cabinetType?: string | null;
  settings?: any | null;
  isActive?: boolean | null;
};

// landscape.tbl_calculation_period
// Primary Key: period_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface CalculationPeriod {
  periodId: number;
  projectId: number;
  periodStartDate: string;
  periodEndDate: string;
  periodType: string;
  periodSequence: number;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string;
  fiscalYear: number | null;
  fiscalQuarter: number | null;
  /** Default: 'OPEN'::character varying */
  periodStatus: string | null;
  closedDate: string | null;
  closedByUserId: number | null;
}

// Insert type for landscape.tbl_calculation_period (excludes auto-generated fields)
export type CalculationPeriodInsert = {
  periodId: number;
  projectId: number;
  periodStartDate: string;
  periodEndDate: string;
  periodType: string;
  periodSequence: number;
  fiscalYear?: number | null;
  fiscalQuarter?: number | null;
  periodStatus?: string | null;
  closedDate?: string | null;
  closedByUserId?: number | null;
};

// landscape.tbl_cap_rate_comps
// Primary Key: cap_rate_comp_id
// Foreign Keys: income_approach_id -> landscape.tbl_income_approach.income_approach_id
export interface CapRateComps {
  /** Default: nextval('tbl_cap_rate_comps_cap_rate_comp_id_seq'::regclass) */
  capRateCompId: number;
  incomeApproachId: number | null;
  propertyAddress: string | null;
  salePrice: number | null;
  noi: number | null;
  impliedCapRate: number | null;
  saleDate: string | null;
  notes: string | null;
  /** Default: now() */
  createdAt: string | null;
}

// Insert type for landscape.tbl_cap_rate_comps (excludes auto-generated fields)
export type CapRateCompsInsert = {
  incomeApproachId?: number | null;
  propertyAddress?: string | null;
  salePrice?: number | null;
  noi?: number | null;
  impliedCapRate?: number | null;
  saleDate?: string | null;
  notes?: string | null;
};

// landscape.tbl_capex_reserve
// Primary Key: capex_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface CapexReserve {
  /** Default: nextval('tbl_capex_reserve_capex_id_seq'::regclass) */
  capexId: number;
  projectId: number;
  /** Default: 300 */
  capexPerUnitAnnual: number;
  /** Default: 0 */
  immediateCapex: number | null;
  /** Default: 50 */
  roofReservePerUnit: number | null;
  /** Default: 75 */
  hvacReservePerUnit: number | null;
  /** Default: 100 */
  applianceReservePerUnit: number | null;
  /** Default: 75 */
  otherReservePerUnit: number | null;
  roofReplacementYear: number | null;
  roofReplacementCost: number | null;
  /** Default: 15 */
  hvacReplacementCycleYears: number | null;
  hvacReplacementCostPerUnit: number | null;
  parkingLotResealYear: number | null;
  parkingLotResealCost: number | null;
  /** Default: 7 */
  exteriorPaintCycleYears: number | null;
  exteriorPaintCost: number | null;
  elevatorModernizationCost: number | null;
  unitRenovationPerTurn: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_capex_reserve (excludes auto-generated fields)
export type CapexReserveInsert = {
  projectId: number;
  capexPerUnitAnnual?: number;
  immediateCapex?: number | null;
  roofReservePerUnit?: number | null;
  hvacReservePerUnit?: number | null;
  applianceReservePerUnit?: number | null;
  otherReservePerUnit?: number | null;
  roofReplacementYear?: number | null;
  roofReplacementCost?: number | null;
  hvacReplacementCycleYears?: number | null;
  hvacReplacementCostPerUnit?: number | null;
  parkingLotResealYear?: number | null;
  parkingLotResealCost?: number | null;
  exteriorPaintCycleYears?: number | null;
  exteriorPaintCost?: number | null;
  elevatorModernizationCost?: number | null;
  unitRenovationPerTurn?: number | null;
};

// landscape.tbl_capital_call
// Primary Key: capital_call_id
// Foreign Keys: period_id -> landscape.tbl_calculation_period.period_id, project_id -> landscape.tbl_project.project_id
export interface CapitalCall {
  /** Default: nextval('tbl_capital_call_capital_call_id_seq'::regclass) */
  capitalCallId: number;
  projectId: number;
  periodId: number | null;
  callAmount: number;
  callDate: string | null;
  callPurpose: string | null;
  lpAmount: number | null;
  gpAmount: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_capital_call (excludes auto-generated fields)
export type CapitalCallInsert = {
  projectId: number;
  periodId?: number | null;
  callAmount: number;
  callDate?: string | null;
  callPurpose?: string | null;
  lpAmount?: number | null;
  gpAmount?: number | null;
};

// landscape.tbl_capital_reserves
// Primary Key: reserve_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id, trigger_lease_id -> landscape.tbl_rent_roll.rent_roll_id
export interface CapitalReserves {
  /** Default: nextval('tbl_capital_reserves_reserve_id_seq'::regclass) */
  reserveId: number;
  projectId: number;
  reserveType: string;
  reserveName: string;
  triggerType: string;
  triggerLeaseId: number | null;
  triggerPeriod: number | null;
  amount: number;
  amountPerSf: number | null;
  recurrenceFrequencyMonths: number | null;
  recurrenceEndPeriod: number | null;
  notes: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_capital_reserves (excludes auto-generated fields)
export type CapitalReservesInsert = {
  projectId: number;
  reserveType: string;
  reserveName: string;
  triggerType: string;
  triggerLeaseId?: number | null;
  triggerPeriod?: number | null;
  amount: number;
  amountPerSf?: number | null;
  recurrenceFrequencyMonths?: number | null;
  recurrenceEndPeriod?: number | null;
  notes?: string | null;
};

// landscape.tbl_capitalization
// Primary Key: capitalization_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface Capitalization {
  capitalizationId: number;
  projectId: number | null;
  capitalSource: string;
  amount: number | null;
  notes: string | null;
}

// landscape.tbl_cashflow
// Primary Key: cashflow_id
// Foreign Keys: lease_id -> landscape.tbl_lease.lease_id, lot_id -> landscape.tbl_lot.lot_id, parcel_id -> landscape.tbl_parcel.parcel_id, phase_id -> landscape.tbl_phase.phase_id, project_id -> landscape.tbl_project.project_id
export interface Cashflow {
  cashflowId: number;
  projectId: number;
  periodId: number;
  parcelId: number | null;
  phaseId: number | null;
  lotId: number | null;
  leaseId: number | null;
  cashflowCategory: string;
  cashflowSubcategory: string | null;
  amount: number;
  cumulativeAmount: number | null;
  calculationMethod: string | null;
  sourceTable: string | null;
  sourceId: number | null;
  /** Default: now() */
  calculatedAt: string | null;
}

// Insert type for landscape.tbl_cashflow (excludes auto-generated fields)
export type CashflowInsert = {
  cashflowId: number;
  projectId: number;
  periodId: number;
  parcelId?: number | null;
  phaseId?: number | null;
  lotId?: number | null;
  leaseId?: number | null;
  cashflowCategory: string;
  cashflowSubcategory?: string | null;
  amount: number;
  cumulativeAmount?: number | null;
  calculationMethod?: string | null;
  sourceTable?: string | null;
  sourceId?: number | null;
};

// landscape.tbl_cashflow_summary
// Primary Key: summary_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface CashflowSummary {
  summaryId: number;
  projectId: number;
  periodId: number;
  /** Default: 0 */
  grossRevenue: number | null;
  /** Default: 0 */
  vacancyLoss: number | null;
  /** Default: 0 */
  creditLoss: number | null;
  /** Default: 0 */
  effectiveGrossIncome: number | null;
  /** Default: 0 */
  operatingExpenses: number | null;
  /** Default: 0 */
  netOperatingIncome: number | null;
  /** Default: 0 */
  capitalExpenditures: number | null;
  /** Default: 0 */
  tenantImprovements: number | null;
  /** Default: 0 */
  leasingCommissions: number | null;
  /** Default: 0 */
  debtService: number | null;
  /** Default: 0 */
  interestExpense: number | null;
  /** Default: 0 */
  principalPayment: number | null;
  /** Default: 0 */
  cashFlowBeforeTax: number | null;
  /** Default: 0 */
  equityContributions: number | null;
  /** Default: 0 */
  equityDistributions: number | null;
  /** Default: 0 */
  netCashFlow: number | null;
  /** Default: 0 */
  cumulativeNetCashFlow: number | null;
  /** Default: now() */
  calculatedAt: string | null;
}

// Insert type for landscape.tbl_cashflow_summary (excludes auto-generated fields)
export type CashflowSummaryInsert = {
  summaryId: number;
  projectId: number;
  periodId: number;
  grossRevenue?: number | null;
  vacancyLoss?: number | null;
  creditLoss?: number | null;
  effectiveGrossIncome?: number | null;
  operatingExpenses?: number | null;
  netOperatingIncome?: number | null;
  capitalExpenditures?: number | null;
  tenantImprovements?: number | null;
  leasingCommissions?: number | null;
  debtService?: number | null;
  interestExpense?: number | null;
  principalPayment?: number | null;
  cashFlowBeforeTax?: number | null;
  equityContributions?: number | null;
  equityDistributions?: number | null;
  netCashFlow?: number | null;
  cumulativeNetCashFlow?: number | null;
};

// landscape.tbl_changelog
// Primary Key: changelog_id
export interface Changelog {
  changelogId: number;
  version: string;
  deployedAt: string;
  autoGeneratedNotes: string | null;
  publishedNotes: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

// landscape.tbl_closing_event
// Primary Key: closing_id
// Foreign Keys: sale_event_id -> landscape.tbl_parcel_sale_event.sale_event_id
export interface ClosingEvent {
  /** Default: nextval('tbl_closing_event_closing_id_seq'::regclass) */
  closingId: number;
  saleEventId: number;
  closingSequence: number;
  closingDate: string;
  lotsClosed: number;
  basePricePerUnit: number | null;
  inflatedPricePerUnit: number | null;
  uomCode: string | null;
  grossProceeds: number | null;
  grossValue: number | null;
  onsiteCosts: number | null;
  lessCommissionsAmount: number | null;
  commissionAmount: number | null;
  lessClosingCosts: number | null;
  closingCosts: number | null;
  lessImprovementsCredit: number | null;
  netProceeds: number | null;
  cumulativeLotsClosed: number | null;
  lotsRemaining: number | null;
  escrowReleaseAmount: number | null;
  escrowReleaseDate: string | null;
  notes: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_closing_event (excludes auto-generated fields)
export type ClosingEventInsert = {
  saleEventId: number;
  closingSequence: number;
  closingDate: string;
  lotsClosed: number;
  basePricePerUnit?: number | null;
  inflatedPricePerUnit?: number | null;
  uomCode?: string | null;
  grossProceeds?: number | null;
  grossValue?: number | null;
  onsiteCosts?: number | null;
  lessCommissionsAmount?: number | null;
  commissionAmount?: number | null;
  lessClosingCosts?: number | null;
  closingCosts?: number | null;
  lessImprovementsCredit?: number | null;
  netProceeds?: number | null;
  cumulativeLotsClosed?: number | null;
  lotsRemaining?: number | null;
  escrowReleaseAmount?: number | null;
  escrowReleaseDate?: string | null;
  notes?: string | null;
};

// landscape.tbl_commercial_lease_archive_20260506
export interface CommercialLeaseArchive20260506 {
  leaseId: number | null;
  incomePropertyId: number | null;
  spaceId: number | null;
  tenantId: number | null;
  leaseNumber: string | null;
  leaseType: string | null;
  leaseStatus: string | null;
  leaseExecutionDate: string | null;
  leaseCommencementDate: string | null;
  rentCommencementDate: string | null;
  leaseExpirationDate: string | null;
  leaseTermMonths: number | null;
  leasedSf: number | null;
  numberOfOptions: number | null;
  optionTermMonths: number | null;
  optionNoticeMonths: number | null;
  earlyTerminationAllowed: boolean | null;
  terminationNoticeMonths: number | null;
  terminationPenaltyAmount: number | null;
  securityDepositAmount: number | null;
  securityDepositMonths: number | null;
  expansionRights: boolean | null;
  rightOfFirstRefusal: boolean | null;
  exclusiveUseClause: string | null;
  coTenancyClause: string | null;
  radiusRestriction: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  leaseTypeCode: string | null;
}

// landscape.tbl_concept
// Primary Key: concept_id
// Foreign Keys: category_id -> landscape.tbl_concept_category.category_id
export interface Concept {
  /** Default: nextval('tbl_concept_concept_id_seq'::regclass) */
  conceptId: number;
  conceptCode: string;
  conceptName: string;
  categoryId: number;
  naicsCode: string | null;
  alternativeNaicsCodes: string | null;
  aliases: any[] | null;
  ebitdarMarginLow: number | null;
  ebitdarMarginMid: number | null;
  ebitdarMarginHigh: number | null;
  coverageThresholdMin: number | null;
  typicalGoingInCapRateLow: number | null;
  typicalGoingInCapRateHigh: number | null;
  typicalBuildingSfMin: number | null;
  typicalBuildingSfMax: number | null;
  hasDriveThru: boolean | null;
  hasFuelCanopy: boolean | null;
  darkValueCharacteristic: string | null;
  replacementCostCharacteristic: string | null;
  highwayCorridorPreference: boolean | null;
  seedSource: string | null;
  seededFromReits: any[] | null;
  seededAt: string | null;
  lastRefreshedAt: string | null;
  /** Default: true */
  isActive: boolean | null;
  /** Default: false */
  isCurated: boolean | null;
  notes: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
}

// Insert type for landscape.tbl_concept (excludes auto-generated fields)
export type ConceptInsert = {
  conceptCode: string;
  conceptName: string;
  categoryId: number;
  naicsCode?: string | null;
  alternativeNaicsCodes?: string | null;
  aliases?: any[] | null;
  ebitdarMarginLow?: number | null;
  ebitdarMarginMid?: number | null;
  ebitdarMarginHigh?: number | null;
  coverageThresholdMin?: number | null;
  typicalGoingInCapRateLow?: number | null;
  typicalGoingInCapRateHigh?: number | null;
  typicalBuildingSfMin?: number | null;
  typicalBuildingSfMax?: number | null;
  hasDriveThru?: boolean | null;
  hasFuelCanopy?: boolean | null;
  darkValueCharacteristic?: string | null;
  replacementCostCharacteristic?: string | null;
  highwayCorridorPreference?: boolean | null;
  seedSource?: string | null;
  seededFromReits?: any[] | null;
  seededAt?: string | null;
  lastRefreshedAt?: string | null;
  isActive?: boolean | null;
  isCurated?: boolean | null;
  notes?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

// landscape.tbl_concept_category
// Primary Key: category_id
export interface ConceptCategory {
  /** Default: nextval('tbl_concept_category_category_id_seq'::regclass) */
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  /** Default: 0 */
  sortOrder: number | null;
  description: string | null;
  /** Default: true */
  isActive: boolean | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_concept_category (excludes auto-generated fields)
export type ConceptCategoryInsert = {
  categoryCode: string;
  categoryName: string;
  sortOrder?: number | null;
  description?: string | null;
  isActive?: boolean | null;
};

// landscape.tbl_concept_field
// Primary Key: concept_field_id
// Foreign Keys: concept_id -> landscape.tbl_concept.concept_id
export interface ConceptField {
  /** Default: nextval('tbl_concept_field_concept_field_id_seq'::regclass) */
  conceptFieldId: number;
  conceptId: number;
  fieldName: string;
  displayName: string;
  description: string | null;
  dataType: string;
  unitOfMeasure: string | null;
  validValues: any | null;
  /** Default: false */
  isRequired: boolean | null;
  /** Default: 0 */
  sortOrder: number | null;
  fieldGroup: string | null;
  /** Default: true */
  isActive: boolean | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_concept_field (excludes auto-generated fields)
export type ConceptFieldInsert = {
  conceptId: number;
  fieldName: string;
  displayName: string;
  description?: string | null;
  dataType: string;
  unitOfMeasure?: string | null;
  validValues?: any | null;
  isRequired?: boolean | null;
  sortOrder?: number | null;
  fieldGroup?: string | null;
  isActive?: boolean | null;
};

// landscape.tbl_contact
// Primary Key: contact_id
// Foreign Keys: cabinet_id -> landscape.tbl_cabinet.cabinet_id
export interface Contact {
  /** Default: nextval('tbl_contact_contact_id_seq'::regclass) */
  contactId: number;
  cabinetId: number;
  contactType: string;
  name: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  companyName: string | null;
  entityType: string | null;
  email: string | null;
  phone: string | null;
  phoneMobile: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  /** Default: 'United States'::character varying */
  country: string | null;
  notes: string | null;
  /** Default: '[]'::jsonb */
  tags: any | null;
  /** Default: '{}'::jsonb */
  customFields: any | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
  createdBy: string | null;
  /** Default: true */
  isActive: boolean | null;
}

// Insert type for landscape.tbl_contact (excludes auto-generated fields)
export type ContactInsert = {
  cabinetId: number;
  contactType: string;
  name: string;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  title?: string | null;
  companyName?: string | null;
  entityType?: string | null;
  email?: string | null;
  phone?: string | null;
  phoneMobile?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  notes?: string | null;
  tags?: any | null;
  customFields?: any | null;
  createdBy?: string | null;
  isActive?: boolean | null;
};

// landscape.tbl_contact_relationship
// Primary Key: relationship_id
// Foreign Keys: cabinet_id -> landscape.tbl_cabinet.cabinet_id, contact_id -> landscape.tbl_contact.contact_id, related_to_id -> landscape.tbl_contact.contact_id
export interface ContactRelationship {
  /** Default: nextval('tbl_contact_relationship_relationship_id_seq'::regclass) */
  relationshipId: number;
  cabinetId: number;
  contactId: number;
  relatedToId: number;
  relationshipType: string;
  roleTitle: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_contact_relationship (excludes auto-generated fields)
export type ContactRelationshipInsert = {
  cabinetId: number;
  contactId: number;
  relatedToId: number;
  relationshipType: string;
  roleTitle?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
};

// landscape.tbl_contact_role
// Primary Key: role_id
// Foreign Keys: cabinet_id -> landscape.tbl_cabinet.cabinet_id
export interface ContactRole {
  /** Default: nextval('tbl_contact_role_role_id_seq'::regclass) */
  roleId: number;
  cabinetId: number | null;
  roleCode: string;
  roleLabel: string;
  roleCategory: string;
  /** Default: '["Company", "Entity", "Person"]'::jsonb */
  typicalContactTypes: any | null;
  description: string | null;
  /** Default: 100 */
  displayOrder: number | null;
  /** Default: false */
  isSystem: boolean | null;
  /** Default: true */
  isActive: boolean | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_contact_role (excludes auto-generated fields)
export type ContactRoleInsert = {
  cabinetId?: number | null;
  roleCode: string;
  roleLabel: string;
  roleCategory: string;
  typicalContactTypes?: any | null;
  description?: string | null;
  displayOrder?: number | null;
  isSystem?: boolean | null;
  isActive?: boolean | null;
};

// landscape.tbl_cost_allocation
// Primary Key: allocation_id
// Foreign Keys: container_id -> landscape.tbl_division.division_id, finance_structure_id -> landscape.tbl_finance_structure.finance_structure_id, scenario_id -> landscape.tbl_scenario.scenario_id
export interface CostAllocation {
  /** Default: nextval('tbl_cost_allocation_allocation_id_seq'::regclass) */
  allocationId: number;
  financeStructureId: number;
  containerId: number;
  allocationPercentage: number;
  allocationBasis: string | null;
  allocatedBudgetAmount: number | null;
  /** Default: 0 */
  spentToDate: number | null;
  costToComplete: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  scenarioId: number | null;
}

// Insert type for landscape.tbl_cost_allocation (excludes auto-generated fields)
export type CostAllocationInsert = {
  financeStructureId: number;
  containerId: number;
  allocationPercentage: number;
  allocationBasis?: string | null;
  allocatedBudgetAmount?: number | null;
  spentToDate?: number | null;
  costToComplete?: number | null;
  scenarioId?: number | null;
};

// landscape.tbl_cost_approach
// Primary Key: cost_approach_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface CostApproach {
  /** Default: nextval('tbl_cost_approach_cost_approach_id_seq'::regclass) */
  costApproachId: number;
  projectId: number;
  landValuationMethod: string | null;
  landAreaSf: number | null;
  landValuePerSf: number | null;
  totalLandValue: number | null;
  costMethod: string | null;
  buildingAreaSf: number | null;
  costPerSf: number | null;
  baseReplacementCost: number | null;
  entrepreneurialIncentivePct: number | null;
  totalReplacementCost: number | null;
  physicalCurable: number | null;
  physicalIncurableShort: number | null;
  physicalIncurableLong: number | null;
  functionalCurable: number | null;
  functionalIncurable: number | null;
  externalObsolescence: number | null;
  totalDepreciation: number | null;
  depreciatedImprovements: number | null;
  siteImprovementsCost: number | null;
  siteImprovementsDescription: string | null;
  indicatedValue: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_cost_approach (excludes auto-generated fields)
export type CostApproachInsert = {
  projectId: number;
  landValuationMethod?: string | null;
  landAreaSf?: number | null;
  landValuePerSf?: number | null;
  totalLandValue?: number | null;
  costMethod?: string | null;
  buildingAreaSf?: number | null;
  costPerSf?: number | null;
  baseReplacementCost?: number | null;
  entrepreneurialIncentivePct?: number | null;
  totalReplacementCost?: number | null;
  physicalCurable?: number | null;
  physicalIncurableShort?: number | null;
  physicalIncurableLong?: number | null;
  functionalCurable?: number | null;
  functionalIncurable?: number | null;
  externalObsolescence?: number | null;
  totalDepreciation?: number | null;
  depreciatedImprovements?: number | null;
  siteImprovementsCost?: number | null;
  siteImprovementsDescription?: string | null;
  indicatedValue?: number | null;
};

// landscape.tbl_cost_approach_depreciation
// Primary Key: depreciation_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface CostApproachDepreciation {
  depreciationId: number;
  physicalCurable: number;
  physicalIncurableShort: number;
  physicalIncurableLong: number;
  functionalCurable: number;
  functionalIncurable: number;
  externalObsolescence: number;
  effectiveAgeYears: number | null;
  remainingLifeYears: number | null;
  depreciationMethod: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  projectId: number;
}

// landscape.tbl_dcf_analysis
// Primary Key: dcf_analysis_id
// Foreign Keys: cost_inflation_set_id -> landscape.core_fin_growth_rate_sets.set_id, expense_growth_set_id -> landscape.core_fin_growth_rate_sets.set_id, income_growth_set_id -> landscape.core_fin_growth_rate_sets.set_id, price_growth_set_id -> landscape.core_fin_growth_rate_sets.set_id, project_id -> landscape.tbl_project.project_id
export interface DcfAnalysis {
  /** Default: nextval('tbl_dcf_analysis_dcf_analysis_id_seq'::regclass) */
  dcfAnalysisId: number;
  projectId: number;
  propertyType: string;
  holdPeriodYears: number | null;
  discountRate: number | null;
  exitCapRate: number | null;
  sellingCostsPct: number | null;
  goingInCapRate: number | null;
  capRateMethod: string | null;
  sensitivityInterval: number | null;
  vacancyRate: number | null;
  stabilizedVacancy: number | null;
  creditLoss: number | null;
  managementFeePct: number | null;
  reservesPerUnit: number | null;
  incomeGrowthSetId: number | null;
  expenseGrowthSetId: number | null;
  priceGrowthSetId: number | null;
  costInflationSetId: number | null;
  /** Default: false */
  bulkSaleEnabled: boolean | null;
  bulkSalePeriod: number | null;
  bulkSaleDiscountPct: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_dcf_analysis (excludes auto-generated fields)
export type DcfAnalysisInsert = {
  projectId: number;
  propertyType: string;
  holdPeriodYears?: number | null;
  discountRate?: number | null;
  exitCapRate?: number | null;
  sellingCostsPct?: number | null;
  goingInCapRate?: number | null;
  capRateMethod?: string | null;
  sensitivityInterval?: number | null;
  vacancyRate?: number | null;
  stabilizedVacancy?: number | null;
  creditLoss?: number | null;
  managementFeePct?: number | null;
  reservesPerUnit?: number | null;
  incomeGrowthSetId?: number | null;
  expenseGrowthSetId?: number | null;
  priceGrowthSetId?: number | null;
  costInflationSetId?: number | null;
  bulkSaleEnabled?: boolean | null;
  bulkSalePeriod?: number | null;
  bulkSaleDiscountPct?: number | null;
};

// landscape.tbl_debt_draw_schedule
// Primary Key: draw_id
// Foreign Keys: loan_id -> landscape.tbl_loan.loan_id, period_id -> landscape.tbl_calculation_period.period_id
export interface DebtDrawSchedule {
  drawId: number;
  loanId: number;
  periodId: number;
  drawNumber: number | null;
  drawAmount: number | null;
  cumulativeDrawn: number | null;
  availableRemaining: number | null;
  beginningBalance: number | null;
  endingBalance: number | null;
  drawDate: string | null;
  drawPurpose: string | null;
  /** Default: 'PROJECTED'::character varying */
  drawStatus: string | null;
  interestRatePct: number | null;
  interestAmount: number | null;
  interestExpense: number | null;
  interestPaid: number | null;
  /** Default: 0 */
  deferredInterest: number | null;
  cumulativeInterest: number | null;
  principalPayment: number | null;
  outstandingBalance: number | null;
  /** Default: 0 */
  unusedFeeCharge: number | null;
  /** Default: 0 */
  commitmentFeeCharge: number | null;
  /** Default: 0 */
  otherFees: number | null;
  requestDate: string | null;
  approvalDate: string | null;
  fundingDate: string | null;
  inspectorApproval: boolean | null;
  lenderApproval: boolean | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_debt_draw_schedule (excludes auto-generated fields)
export type DebtDrawScheduleInsert = {
  drawId: number;
  loanId: number;
  periodId: number;
  drawNumber?: number | null;
  drawAmount?: number | null;
  cumulativeDrawn?: number | null;
  availableRemaining?: number | null;
  beginningBalance?: number | null;
  endingBalance?: number | null;
  drawDate?: string | null;
  drawPurpose?: string | null;
  drawStatus?: string | null;
  interestRatePct?: number | null;
  interestAmount?: number | null;
  interestExpense?: number | null;
  interestPaid?: number | null;
  deferredInterest?: number | null;
  cumulativeInterest?: number | null;
  principalPayment?: number | null;
  outstandingBalance?: number | null;
  unusedFeeCharge?: number | null;
  commitmentFeeCharge?: number | null;
  otherFees?: number | null;
  requestDate?: string | null;
  approvalDate?: string | null;
  fundingDate?: string | null;
  inspectorApproval?: boolean | null;
  lenderApproval?: boolean | null;
};

// landscape.tbl_division
// Primary Key: division_id
// Foreign Keys: parent_division_id -> landscape.tbl_division.division_id, project_id -> landscape.tbl_project.project_id
export interface Division {
  divisionId: number;
  projectId: number;
  parentDivisionId: number | null;
  tier: number;
  divisionCode: string;
  displayName: string;
  /** Default: 0 */
  sortOrder: number | null;
  attributes: any | null;
  /** Default: true */
  isActive: boolean | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string;
  salePhaseCode: string | null;
  customSaleDate: string | null;
  /** Default: false */
  hasSaleOverrides: boolean | null;
  optionDepositPct: number | null;
  optionDepositCapPct: number | null;
  retailLotPrice: number | null;
  premiumPct: number | null;
}

// Insert type for landscape.tbl_division (excludes auto-generated fields)
export type DivisionInsert = {
  divisionId: number;
  projectId: number;
  parentDivisionId?: number | null;
  tier: number;
  divisionCode: string;
  displayName: string;
  sortOrder?: number | null;
  attributes?: any | null;
  isActive?: boolean | null;
  salePhaseCode?: string | null;
  customSaleDate?: string | null;
  hasSaleOverrides?: boolean | null;
  optionDepositPct?: number | null;
  optionDepositCapPct?: number | null;
  retailLotPrice?: number | null;
  premiumPct?: number | null;
};

// landscape.tbl_document_project
// Primary Key: document_project_id
// Foreign Keys: document_id -> landscape.core_doc.doc_id, project_id -> landscape.tbl_project.project_id
export interface DocumentProject {
  /** Default: nextval('tbl_document_project_document_project_id_seq'::regclass) */
  documentProjectId: number;
  documentId: number;
  projectId: number;
  /** Default: 'attached'::character varying */
  relationshipType: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  createdBy: string | null;
}

// Insert type for landscape.tbl_document_project (excludes auto-generated fields)
export type DocumentProjectInsert = {
  documentId: number;
  projectId: number;
  relationshipType?: string | null;
  createdBy?: string | null;
};

// landscape.tbl_dynamic_column_definition
// Primary Key: id
// Foreign Keys: created_by_id -> landscape.auth_user.id, created_from_doc_id -> landscape.core_doc.doc_id, project_id -> landscape.tbl_project.project_id, proposed_from_document_id -> landscape.core_doc.doc_id
export interface DynamicColumnDefinition {
  id: number;
  tableName: string;
  columnKey: string;
  displayLabel: string;
  dataType: string;
  formatPattern: string | null;
  source: string;
  createdAt: string;
  isActive: boolean;
  isProposed: boolean;
  displayOrder: number;
  createdById: number | null;
  projectId: number;
  proposedFromDocumentId: number | null;
  scope: string | null;
  /** Default: false */
  isCalculable: boolean;
  createdFromDocId: number | null;
}

// landscape.tbl_dynamic_column_value
// Primary Key: id
// Foreign Keys: column_definition_id -> landscape.tbl_dynamic_column_definition.id, extracted_from_id -> landscape.core_doc.doc_id
export interface DynamicColumnValue {
  id: number;
  rowId: number;
  valueText: string | null;
  valueNumber: number | null;
  valueBoolean: boolean | null;
  valueDate: string | null;
  confidence: number | null;
  createdAt: string;
  updatedAt: string;
  columnDefinitionId: number;
  extractedFromId: number | null;
}

// landscape.tbl_equity
// Primary Key: equity_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface Equity {
  equityId: number;
  projectId: number;
  equityName: string;
  equityClass: string;
  /** Default: 1 */
  equityTier: number | null;
  commitmentAmount: number;
  /** Default: 0 */
  fundedAmount: number | null;
  preferredReturnPct: number | null;
  /** Default: false */
  preferredReturnCompounds: boolean | null;
  promotePct: number | null;
  promoteTier_2Threshold: number | null;
  promoteTier_2Pct: number | null;
  notes: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  partnerType: string | null;
  partnerName: string | null;
  /** Default: 0 */
  ownershipPct: number | null;
  /** Default: 0 */
  capitalContributed: number | null;
  /** Default: 0 */
  unreturnedCapital: number | null;
  /** Default: 0 */
  cumulativeDistributions: number | null;
  /** Default: 0 */
  accruedPreferredReturn: number | null;
  /** Default: 0 */
  preferredReturnPaidToDate: number | null;
  catchUpPct: number | null;
  /** Default: 'irr'::character varying */
  promoteTriggerType: string | null;
  promoteTier_1Threshold: number | null;
  promoteTier_3Threshold: number | null;
  promoteTier_3Pct: number | null;
  irrTargetPct: number | null;
  equityMultipleTarget: number | null;
  cashOnCashTargetPct: number | null;
  /** Default: 'Quarterly'::character varying */
  distributionFrequency: string | null;
  distributionPriority: number | null;
  /** Default: false */
  canDeferDistributions: boolean | null;
  managementFeePct: number | null;
  /** Default: 'equity'::character varying */
  managementFeeBase: string | null;
  acquisitionFeePct: number | null;
  dispositionFeePct: number | null;
  promoteFeePct: number | null;
  /** Default: false */
  hasClawback: boolean | null;
  clawbackThresholdPct: number | null;
  /** Default: true */
  hasLookback: boolean | null;
  /** Default: true */
  lookbackAtSale: boolean | null;
}

// Insert type for landscape.tbl_equity (excludes auto-generated fields)
export type EquityInsert = {
  equityId: number;
  projectId: number;
  equityName: string;
  equityClass: string;
  equityTier?: number | null;
  commitmentAmount: number;
  fundedAmount?: number | null;
  preferredReturnPct?: number | null;
  preferredReturnCompounds?: boolean | null;
  promotePct?: number | null;
  promoteTier_2Threshold?: number | null;
  promoteTier_2Pct?: number | null;
  notes?: string | null;
  partnerType?: string | null;
  partnerName?: string | null;
  ownershipPct?: number | null;
  capitalContributed?: number | null;
  unreturnedCapital?: number | null;
  cumulativeDistributions?: number | null;
  accruedPreferredReturn?: number | null;
  preferredReturnPaidToDate?: number | null;
  catchUpPct?: number | null;
  promoteTriggerType?: string | null;
  promoteTier_1Threshold?: number | null;
  promoteTier_3Threshold?: number | null;
  promoteTier_3Pct?: number | null;
  irrTargetPct?: number | null;
  equityMultipleTarget?: number | null;
  cashOnCashTargetPct?: number | null;
  distributionFrequency?: string | null;
  distributionPriority?: number | null;
  canDeferDistributions?: boolean | null;
  managementFeePct?: number | null;
  managementFeeBase?: string | null;
  acquisitionFeePct?: number | null;
  dispositionFeePct?: number | null;
  promoteFeePct?: number | null;
  hasClawback?: boolean | null;
  clawbackThresholdPct?: number | null;
  hasLookback?: boolean | null;
  lookbackAtSale?: boolean | null;
};

// landscape.tbl_equity_distribution
// Primary Key: distribution_id
// Foreign Keys: partner_id -> landscape.tbl_equity_partner.partner_id, period_id -> landscape.tbl_calculation_period.period_id
export interface EquityDistribution {
  /** Default: nextval('tbl_equity_distribution_distribution_id_seq'::regclass) */
  distributionId: number;
  partnerId: number;
  periodId: number | null;
  distributionType: string;
  amount: number;
  cumulativeAmount: number | null;
  /** Default: 0 */
  unpaidPreferredReturn: number | null;
  distributionDate: string | null;
  /** Default: 'PROJECTED'::character varying */
  distributionStatus: string | null;
  notes: string | null;
  /** Default: now() */
  createdAt: string | null;
}

// Insert type for landscape.tbl_equity_distribution (excludes auto-generated fields)
export type EquityDistributionInsert = {
  partnerId: number;
  periodId?: number | null;
  distributionType: string;
  amount: number;
  cumulativeAmount?: number | null;
  unpaidPreferredReturn?: number | null;
  distributionDate?: string | null;
  distributionStatus?: string | null;
  notes?: string | null;
};

// landscape.tbl_equity_partner
// Primary Key: partner_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface EquityPartner {
  /** Default: nextval('tbl_equity_partner_partner_id_seq'::regclass) */
  partnerId: number;
  projectId: number;
  partnerName: string;
  partnerClass: string;
  ownershipPct: number | null;
  committedCapital: number | null;
  preferredReturnPct: number | null;
  promotePct: number | null;
  hurdleIrrPct: number | null;
  notes: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_equity_partner (excludes auto-generated fields)
export type EquityPartnerInsert = {
  projectId: number;
  partnerName: string;
  partnerClass: string;
  ownershipPct?: number | null;
  committedCapital?: number | null;
  preferredReturnPct?: number | null;
  promotePct?: number | null;
  hurdleIrrPct?: number | null;
  notes?: string | null;
};

// landscape.tbl_equity_structure
// Primary Key: equity_structure_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface EquityStructure {
  /** Default: nextval('tbl_equity_structure_equity_structure_id_seq'::regclass) */
  equityStructureId: number;
  projectId: number;
  lpOwnershipPct: number;
  gpOwnershipPct: number;
  /** Default: 0.08 */
  preferredReturnPct: number;
  /** Default: 0.20 */
  gpPromoteAfterPref: number | null;
  catchUpPct: number | null;
  equityMultipleTarget: number | null;
  irrTargetPct: number | null;
  /** Default: 'Quarterly'::character varying */
  distributionFrequency: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  lastWaterfallResult: any | null;
  lastWaterfallRunAt: string | null;
}

// Insert type for landscape.tbl_equity_structure (excludes auto-generated fields)
export type EquityStructureInsert = {
  projectId: number;
  lpOwnershipPct: number;
  gpOwnershipPct: number;
  preferredReturnPct?: number;
  gpPromoteAfterPref?: number | null;
  catchUpPct?: number | null;
  equityMultipleTarget?: number | null;
  irrTargetPct?: number | null;
  distributionFrequency?: string | null;
  lastWaterfallResult?: any | null;
  lastWaterfallRunAt?: string | null;
};

// landscape.tbl_escalation
// Primary Key: escalation_id
// Foreign Keys: lease_id -> landscape.tbl_lease.lease_id
export interface Escalation {
  escalationId: number;
  leaseId: number;
  escalationType: string;
  escalationPct: number | null;
  /** Default: 'Annual'::character varying */
  escalationFrequency: string | null;
  /** Default: true */
  compoundEscalation: boolean | null;
  cpiIndex: string | null;
  cpiFloorPct: number | null;
  cpiCapPct: number | null;
  /** Default: 100.00 */
  tenantCpiSharePct: number | null;
  annualIncreaseAmount: number | null;
  stepSchedule: any | null;
  firstEscalationDate: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_escalation (excludes auto-generated fields)
export type EscalationInsert = {
  escalationId: number;
  leaseId: number;
  escalationType: string;
  escalationPct?: number | null;
  escalationFrequency?: string | null;
  compoundEscalation?: boolean | null;
  cpiIndex?: string | null;
  cpiFloorPct?: number | null;
  cpiCapPct?: number | null;
  tenantCpiSharePct?: number | null;
  annualIncreaseAmount?: number | null;
  stepSchedule?: any | null;
  firstEscalationDate?: string | null;
};

// landscape.tbl_excel_audit
// Primary Key: audit_id
export interface ExcelAudit {
  /** Default: nextval('tbl_excel_audit_audit_id_seq'::regclass) */
  auditId: number;
  docId: number;
  projectId: number | null;
  tier: string | null;
  waterfallClass: any | null;
  replication: any | null;
  sourcesUses: any | null;
  trustScore: number | null;
  reportHtmlPath: string | null;
  /** Default: now() */
  createdAt: string;
  /** Default: now() */
  updatedAt: string;
}

// Insert type for landscape.tbl_excel_audit (excludes auto-generated fields)
export type ExcelAuditInsert = {
  docId: number;
  projectId?: number | null;
  tier?: string | null;
  waterfallClass?: any | null;
  replication?: any | null;
  sourcesUses?: any | null;
  trustScore?: number | null;
  reportHtmlPath?: string | null;
};

// landscape.tbl_excel_audit_finding
// Primary Key: finding_id
// Foreign Keys: audit_id -> landscape.tbl_excel_audit.audit_id
export interface ExcelAuditFinding {
  /** Default: nextval('tbl_excel_audit_finding_finding_id_seq'::regclass) */
  findingId: number;
  auditId: number;
  phase: string;
  /** Default: 'low'::text */
  severity: string;
  /** Default: 'general'::text */
  category: string;
  sheetCell: string | null;
  message: string;
  /** Default: false */
  feedsOutputs: boolean;
  /** Default: now() */
  createdAt: string;
}

// Insert type for landscape.tbl_excel_audit_finding (excludes auto-generated fields)
export type ExcelAuditFindingInsert = {
  auditId: number;
  phase: string;
  severity?: string;
  category?: string;
  sheetCell?: string | null;
  message: string;
  feedsOutputs?: boolean;
};

// landscape.tbl_executive
// Primary Key: executive_id
// Foreign Keys: operator_id -> landscape.tbl_operator.operator_id
export interface Executive {
  /** Default: nextval('tbl_executive_executive_id_seq'::regclass) */
  executiveId: number;
  operatorId: number;
  fullName: string;
  role: string | null;
  title: string | null;
  startDate: string | null;
  endDate: string | null;
  /** Default: false */
  isNamedExecutiveOfficer: boolean | null;
  /** Default: false */
  isBoardMember: boolean | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
}

// Insert type for landscape.tbl_executive (excludes auto-generated fields)
export type ExecutiveInsert = {
  operatorId: number;
  fullName: string;
  role?: string | null;
  title?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isNamedExecutiveOfficer?: boolean | null;
  isBoardMember?: boolean | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

// landscape.tbl_executive_compensation_period
// Primary Key: compensation_id
// Foreign Keys: executive_id -> landscape.tbl_executive.executive_id
export interface ExecutiveCompensationPeriod {
  /** Default: nextval('tbl_executive_compensation_period_compensation_id_seq'::regclass) */
  compensationId: number;
  executiveId: number;
  fiscalYear: number;
  sourceFilingType: string | null;
  baseSalary: number | null;
  targetAnnualBonus: number | null;
  actualAnnualBonus: number | null;
  equityAwardsGrantDateFairValue: number | null;
  equityAwardsTargetValue: number | null;
  restrictedStockValue: number | null;
  performanceShareValue: number | null;
  optionValue: number | null;
  allOtherCompensation: number | null;
  totalReportedCompensation: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_executive_compensation_period (excludes auto-generated fields)
export type ExecutiveCompensationPeriodInsert = {
  executiveId: number;
  fiscalYear: number;
  sourceFilingType?: string | null;
  baseSalary?: number | null;
  targetAnnualBonus?: number | null;
  actualAnnualBonus?: number | null;
  equityAwardsGrantDateFairValue?: number | null;
  equityAwardsTargetValue?: number | null;
  restrictedStockValue?: number | null;
  performanceShareValue?: number | null;
  optionValue?: number | null;
  allOtherCompensation?: number | null;
  totalReportedCompensation?: number | null;
};

// landscape.tbl_executive_employment_agreement
// Primary Key: agreement_id
// Foreign Keys: executive_id -> landscape.tbl_executive.executive_id
export interface ExecutiveEmploymentAgreement {
  /** Default: nextval('tbl_executive_employment_agreement_agreement_id_seq'::regclass) */
  agreementId: number;
  executiveId: number;
  effectiveDate: string | null;
  expirationDate: string | null;
  severanceTerms: string | null;
  changeOfControlTerms: string | null;
  equityAccelerationOnTermination: boolean | null;
  nonCompeteDurationMonths: number | null;
  nonSolicitDurationMonths: number | null;
  sourceFilingType: string | null;
  fullText: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_executive_employment_agreement (excludes auto-generated fields)
export type ExecutiveEmploymentAgreementInsert = {
  executiveId: number;
  effectiveDate?: string | null;
  expirationDate?: string | null;
  severanceTerms?: string | null;
  changeOfControlTerms?: string | null;
  equityAccelerationOnTermination?: boolean | null;
  nonCompeteDurationMonths?: number | null;
  nonSolicitDurationMonths?: number | null;
  sourceFilingType?: string | null;
  fullText?: string | null;
};

// landscape.tbl_executive_incentive_target
// Primary Key: target_id
// Foreign Keys: executive_id -> landscape.tbl_executive.executive_id
export interface ExecutiveIncentiveTarget {
  /** Default: nextval('tbl_executive_incentive_target_target_id_seq'::regclass) */
  targetId: number;
  executiveId: number;
  fiscalYear: number;
  metricName: string;
  metricDescription: string | null;
  targetThreshold: number | null;
  targetUnit: string | null;
  weightPct: number | null;
  thresholdPayoutPct: number | null;
  targetPayoutPct: number | null;
  maxPayoutPct: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_executive_incentive_target (excludes auto-generated fields)
export type ExecutiveIncentiveTargetInsert = {
  executiveId: number;
  fiscalYear: number;
  metricName: string;
  metricDescription?: string | null;
  targetThreshold?: number | null;
  targetUnit?: string | null;
  weightPct?: number | null;
  thresholdPayoutPct?: number | null;
  targetPayoutPct?: number | null;
  maxPayoutPct?: number | null;
};

// landscape.tbl_expansion_option
// Primary Key: expansion_option_id
// Foreign Keys: exercised_space_id -> landscape.tbl_space.space_id, lease_id -> landscape.tbl_lease.lease_id, target_space_id -> landscape.tbl_space.space_id
export interface ExpansionOption {
  /** Default: nextval('tbl_expansion_option_expansion_option_id_seq'::regclass) */
  expansionOptionId: number;
  leaseId: number;
  optionType: string | null;
  targetSpaceId: number | null;
  targetSpaceDescription: string | null;
  expansionSfMin: number | null;
  expansionSfMax: number | null;
  optionStartDate: string | null;
  optionEndDate: string | null;
  mustTakeDate: string | null;
  noticePeriodDays: number | null;
  /** Default: false */
  landlordNoticeRequired: boolean | null;
  responsePeriodDays: number | null;
  expansionRentMethod: string | null;
  expansionRentPsf: number | null;
  expansionRentSpreadPsf: number | null;
  /** Default: false */
  optionExercised: boolean | null;
  exerciseDate: string | null;
  exercisedSpaceId: number | null;
  exercisedSf: number | null;
  notes: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_expansion_option (excludes auto-generated fields)
export type ExpansionOptionInsert = {
  leaseId: number;
  optionType?: string | null;
  targetSpaceId?: number | null;
  targetSpaceDescription?: string | null;
  expansionSfMin?: number | null;
  expansionSfMax?: number | null;
  optionStartDate?: string | null;
  optionEndDate?: string | null;
  mustTakeDate?: string | null;
  noticePeriodDays?: number | null;
  landlordNoticeRequired?: boolean | null;
  responsePeriodDays?: number | null;
  expansionRentMethod?: string | null;
  expansionRentPsf?: number | null;
  expansionRentSpreadPsf?: number | null;
  optionExercised?: boolean | null;
  exerciseDate?: string | null;
  exercisedSpaceId?: number | null;
  exercisedSf?: number | null;
  notes?: string | null;
};

// landscape.tbl_expense_comparable
// Primary Key: comparable_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface ExpenseComparable {
  /** Default: nextval('tbl_expense_comparable_comparable_id_seq'::regclass) */
  comparableId: number;
  projectId: number;
  propertyName: string;
  address: string | null;
  distanceMiles: number | null;
  yearBuilt: number | null;
  totalUnits: number | null;
  totalSqft: number | null;
  /** Default: '{}'::jsonb */
  expenses: any;
  totalOpex: number | null;
  dataSource: string | null;
  asOfDate: string | null;
  notes: string | null;
  /** Default: true */
  isActive: boolean;
  latitude: number | null;
  longitude: number | null;
  /** Default: now() */
  createdAt: string;
  /** Default: now() */
  updatedAt: string;
}

// Insert type for landscape.tbl_expense_comparable (excludes auto-generated fields)
export type ExpenseComparableInsert = {
  projectId: number;
  propertyName: string;
  address?: string | null;
  distanceMiles?: number | null;
  yearBuilt?: number | null;
  totalUnits?: number | null;
  totalSqft?: number | null;
  expenses?: any;
  totalOpex?: number | null;
  dataSource?: string | null;
  asOfDate?: string | null;
  notes?: string | null;
  isActive?: boolean;
  latitude?: number | null;
  longitude?: number | null;
};

// landscape.tbl_expense_detail
// Primary Key: expense_detail_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface ExpenseDetail {
  /** Default: nextval('tbl_expense_detail_expense_detail_id_seq'::regclass) */
  expenseDetailId: number;
  projectId: number;
  expenseId: number | null;
  expenseCategory: string;
  expenseSubcategory: string | null;
  amountAnnual: number;
  perUnitMonthly: number | null;
  perSfAnnual: number | null;
  /** Default: 0.03 */
  escalationPct: number | null;
  /** Default: 1 */
  escalationStartYear: number | null;
  notes: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_expense_detail (excludes auto-generated fields)
export type ExpenseDetailInsert = {
  projectId: number;
  expenseId?: number | null;
  expenseCategory: string;
  expenseSubcategory?: string | null;
  amountAnnual: number;
  perUnitMonthly?: number | null;
  perSfAnnual?: number | null;
  escalationPct?: number | null;
  escalationStartYear?: number | null;
  notes?: string | null;
};

// landscape.tbl_expense_recovery_archive_20260506
export interface ExpenseRecoveryArchive20260506 {
  expenseRecoveryId: number | null;
  leaseId: number | null;
  recoveryStructure: string | null;
  recoveryMethod: string | null;
  propertyTaxRecoveryPct: number | null;
  insuranceRecoveryPct: number | null;
  camRecoveryPct: number | null;
  utilitiesRecoveryPct: number | null;
  expenseCapPsf: number | null;
  expenseCapEscalationPct: number | null;
  createdAt: string | null;
}

// landscape.tbl_extraction_job
// Primary Key: job_id
// Foreign Keys: created_by_id -> landscape.auth_user.id
export interface ExtractionJob {
  jobId: number;
  projectId: number;
  documentId: number;
  scope: string;
  status: string;
  totalItems: number | null;
  processedItems: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  resultSummary: any | null;
  createdById: number | null;
}

// landscape.tbl_extraction_log
// Primary Key: log_id
// Foreign Keys: mapping_id -> landscape.tbl_extraction_mapping.mapping_id
export interface ExtractionLog {
  /** Default: nextval('tbl_extraction_log_log_id_seq'::regclass) */
  logId: number;
  mappingId: number | null;
  projectId: number | null;
  docId: number | null;
  sourcePatternMatched: string | null;
  extractedValue: string | null;
  transformedValue: string | null;
  previousValue: string | null;
  confidenceScore: number | null;
  extractionContext: string | null;
  /** Default: false */
  wasWritten: boolean;
  wasAccepted: boolean | null;
  rejectionReason: string | null;
  /** Default: now() */
  extractedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: number | null;
}

// Insert type for landscape.tbl_extraction_log (excludes auto-generated fields)
export type ExtractionLogInsert = {
  mappingId?: number | null;
  projectId?: number | null;
  docId?: number | null;
  sourcePatternMatched?: string | null;
  extractedValue?: string | null;
  transformedValue?: string | null;
  previousValue?: string | null;
  confidenceScore?: number | null;
  extractionContext?: string | null;
  wasWritten?: boolean;
  wasAccepted?: boolean | null;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: number | null;
};

// landscape.tbl_extraction_mapping
// Primary Key: mapping_id
export interface ExtractionMapping {
  /** Default: nextval('tbl_extraction_mapping_mapping_id_seq'::regclass) */
  mappingId: number;
  documentType: string;
  sourcePattern: string;
  sourceAliases: any | null;
  targetTable: string;
  targetField: string;
  /** Default: 'text'::character varying */
  dataType: string;
  transformRule: string | null;
  /** Default: 'Medium'::character varying */
  confidence: string;
  /** Default: true */
  autoWrite: boolean;
  /** Default: false */
  overwriteExisting: boolean;
  /** Default: true */
  isActive: boolean;
  /** Default: true */
  isSystem: boolean;
  notes: string | null;
  createdBy: number | null;
  /** Default: now() */
  createdAt: string | null;
  updatedBy: number | null;
  /** Default: now() */
  updatedAt: string | null;
  /** Default: '[]'::jsonb */
  applicableTags: any | null;
}

// Insert type for landscape.tbl_extraction_mapping (excludes auto-generated fields)
export type ExtractionMappingInsert = {
  documentType: string;
  sourcePattern: string;
  sourceAliases?: any | null;
  targetTable: string;
  targetField: string;
  dataType?: string;
  transformRule?: string | null;
  confidence?: string;
  autoWrite?: boolean;
  overwriteExisting?: boolean;
  isActive?: boolean;
  isSystem?: boolean;
  notes?: string | null;
  createdBy?: number | null;
  updatedBy?: number | null;
  applicableTags?: any | null;
};

// landscape.tbl_feedback
// Primary Key: id
// Foreign Keys: duplicate_of_id -> landscape.tbl_feedback.id
export interface Feedback {
  /** Default: nextval('tbl_feedback_id_seq'::regclass) */
  id: number;
  /** Default: now() */
  createdAt: string;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  pageContext: string | null;
  projectId: number | null;
  projectName: string | null;
  messageText: string;
  /** Default: 'open'::text */
  status: string;
  addressedAt: string | null;
  closedAt: string | null;
  resolvedByCommitSha: string | null;
  resolvedByCommitUrl: string | null;
  resolutionNotes: string | null;
  duplicateOfId: number | null;
  discordMessageId: string | null;
  discordPostedAt: string | null;
  /** Default: 'backfill'::text */
  source: string;
  inProgressBranch: string | null;
  inProgressSessionSlug: string | null;
  startedAt: string | null;
  sourceHelpMessageId: number | null;
  workingSummary: string | null;
  activeChatSlug: string | null;
}

// Insert type for landscape.tbl_feedback (excludes auto-generated fields)
export type FeedbackInsert = {
  userId?: number | null;
  userName?: string | null;
  userEmail?: string | null;
  pageContext?: string | null;
  projectId?: number | null;
  projectName?: string | null;
  messageText: string;
  status?: string;
  addressedAt?: string | null;
  closedAt?: string | null;
  resolvedByCommitSha?: string | null;
  resolvedByCommitUrl?: string | null;
  resolutionNotes?: string | null;
  duplicateOfId?: number | null;
  discordMessageId?: string | null;
  discordPostedAt?: string | null;
  source?: string;
  inProgressBranch?: string | null;
  inProgressSessionSlug?: string | null;
  startedAt?: string | null;
  sourceHelpMessageId?: number | null;
  workingSummary?: string | null;
  activeChatSlug?: string | null;
};

// landscape.tbl_field_catalog
// Primary Key: field_id
export interface FieldCatalog {
  /** Default: nextval('tbl_field_catalog_field_id_seq'::regclass) */
  fieldId: number;
  tableName: string;
  fieldName: string;
  displayName: string | null;
  description: string | null;
  dataType: string;
  /** Default: true */
  isEditable: boolean | null;
  /** Default: false */
  isRequired: boolean | null;
  /** Default: false */
  isCalculated: boolean | null;
  calculationSource: string | null;
  validValues: any | null;
  defaultValue: string | null;
  unitOfMeasure: string | null;
  minValue: number | null;
  maxValue: number | null;
  fieldGroup: string | null;
  /** Default: 0 */
  displayOrder: number | null;
  appliesToTypes: any[] | null;
  /** Default: true */
  isActive: boolean | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_field_catalog (excludes auto-generated fields)
export type FieldCatalogInsert = {
  tableName: string;
  fieldName: string;
  displayName?: string | null;
  description?: string | null;
  dataType: string;
  isEditable?: boolean | null;
  isRequired?: boolean | null;
  isCalculated?: boolean | null;
  calculationSource?: string | null;
  validValues?: any | null;
  defaultValue?: string | null;
  unitOfMeasure?: string | null;
  minValue?: number | null;
  maxValue?: number | null;
  fieldGroup?: string | null;
  displayOrder?: number | null;
  appliesToTypes?: any[] | null;
  isActive?: boolean | null;
};

// landscape.tbl_field_catalog_backup_20260324
export interface FieldCatalogBackup20260324 {
  fieldId: number | null;
  tableName: string | null;
  fieldName: string | null;
  displayName: string | null;
  description: string | null;
  dataType: string | null;
  isEditable: boolean | null;
  isRequired: boolean | null;
  isCalculated: boolean | null;
  calculationSource: string | null;
  validValues: any | null;
  defaultValue: string | null;
  unitOfMeasure: string | null;
  minValue: number | null;
  maxValue: number | null;
  fieldGroup: string | null;
  displayOrder: number | null;
  appliesToTypes: any[] | null;
  isActive: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// landscape.tbl_finance_structure
// Primary Key: finance_structure_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id, scenario_id -> landscape.tbl_scenario.scenario_id
export interface FinanceStructure {
  /** Default: nextval('tbl_finance_structure_finance_structure_id_seq'::regclass) */
  financeStructureId: number;
  projectId: number;
  structureCode: string;
  structureName: string;
  description: string | null;
  structureType: string;
  totalBudgetAmount: number | null;
  budgetCategory: string | null;
  /** Default: false */
  isRecurring: boolean | null;
  recurrenceFrequency: string | null;
  annualAmount: number | null;
  allocationMethod: string;
  /** Default: true */
  isActive: boolean | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  scenarioId: number | null;
}

// Insert type for landscape.tbl_finance_structure (excludes auto-generated fields)
export type FinanceStructureInsert = {
  projectId: number;
  structureCode: string;
  structureName: string;
  description?: string | null;
  structureType: string;
  totalBudgetAmount?: number | null;
  budgetCategory?: string | null;
  isRecurring?: boolean | null;
  recurrenceFrequency?: string | null;
  annualAmount?: number | null;
  allocationMethod: string;
  isActive?: boolean | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  scenarioId?: number | null;
};

// landscape.tbl_global_benchmark_registry
// Primary Key: benchmark_id
// Foreign Keys: source_document_id -> landscape.core_doc.doc_id, source_project_id -> landscape.tbl_project.project_id
export interface GlobalBenchmarkRegistry {
  /** Default: nextval('tbl_global_benchmark_registry_benchmark_id_seq'::regclass) */
  benchmarkId: number;
  userId: string;
  category: string;
  subcategory: string | null;
  benchmarkName: string;
  description: string | null;
  marketGeography: string | null;
  propertyType: string | null;
  sourceType: string;
  sourceDocumentId: number | null;
  sourceProjectId: number | null;
  extractionDate: string | null;
  /** Default: 'medium'::character varying */
  confidenceLevel: string | null;
  /** Default: 0 */
  usageCount: number | null;
  /** Default: CURRENT_DATE */
  asOfDate: string;
  cpiIndexValue: number | null;
  contextMetadata: any | null;
  /** Default: true */
  isActive: boolean | null;
  /** Default: false */
  isGlobal: boolean | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
}

// Insert type for landscape.tbl_global_benchmark_registry (excludes auto-generated fields)
export type GlobalBenchmarkRegistryInsert = {
  userId: string;
  category: string;
  subcategory?: string | null;
  benchmarkName: string;
  description?: string | null;
  marketGeography?: string | null;
  propertyType?: string | null;
  sourceType: string;
  sourceDocumentId?: number | null;
  sourceProjectId?: number | null;
  extractionDate?: string | null;
  confidenceLevel?: string | null;
  usageCount?: number | null;
  asOfDate?: string;
  cpiIndexValue?: number | null;
  contextMetadata?: any | null;
  isActive?: boolean | null;
  isGlobal?: boolean | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

// landscape.tbl_guarantor_financial_period
// Primary Key: period_id
// Foreign Keys: guarantor_tenant_id -> landscape.tbl_tenant.tenant_id
export interface GuarantorFinancialPeriod {
  /** Default: nextval('tbl_guarantor_financial_period_period_id_seq'::regclass) */
  periodId: number;
  guarantorTenantId: number;
  periodType: string;
  periodEndDate: string;
  periodLabel: string | null;
  /** Default: false */
  isPreSlb: boolean | null;
  /** Default: false */
  isPostSlb: boolean | null;
  /** Default: 'USD'::character varying */
  currency: string | null;
  cash: number | null;
  accountsReceivable: number | null;
  inventories: number | null;
  prepaidOtherCurrent: number | null;
  currentAssets: number | null;
  ppeNet: number | null;
  goodwill: number | null;
  otherAssets: number | null;
  totalAssets: number | null;
  accountsPayable: number | null;
  deferredRevenue: number | null;
  otherCurrentLiab: number | null;
  currentPortionLongTermDebt: number | null;
  lineOfCredit: number | null;
  currentLiabilities: number | null;
  longTermDebt: number | null;
  fundedDebt: number | null;
  totalLiabilities: number | null;
  equity: number | null;
  revenue: number | null;
  cogs: number | null;
  grossProfit: number | null;
  grossProfitMargin: number | null;
  operatingExpense: number | null;
  otherIncomeExpense: number | null;
  ebitdar: number | null;
  ebitdarMargin: number | null;
  rent: number | null;
  ebitda: number | null;
  ebitdaMargin: number | null;
  depreciationAmortization: number | null;
  interestExpense: number | null;
  netIncome: number | null;
  ebitdarCoverage: number | null;
  fixedChargeCoverage: number | null;
  leaseAdjustedLeverage: number | null;
  fundedDebtToEbitda: number | null;
  ratingPeriodDate: string | null;
  oneYearEdf: number | null;
  moodysEquivalent: string | null;
  spEquivalent: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
}

// Insert type for landscape.tbl_guarantor_financial_period (excludes auto-generated fields)
export type GuarantorFinancialPeriodInsert = {
  guarantorTenantId: number;
  periodType: string;
  periodEndDate: string;
  periodLabel?: string | null;
  isPreSlb?: boolean | null;
  isPostSlb?: boolean | null;
  currency?: string | null;
  cash?: number | null;
  accountsReceivable?: number | null;
  inventories?: number | null;
  prepaidOtherCurrent?: number | null;
  currentAssets?: number | null;
  ppeNet?: number | null;
  goodwill?: number | null;
  otherAssets?: number | null;
  totalAssets?: number | null;
  accountsPayable?: number | null;
  deferredRevenue?: number | null;
  otherCurrentLiab?: number | null;
  currentPortionLongTermDebt?: number | null;
  lineOfCredit?: number | null;
  currentLiabilities?: number | null;
  longTermDebt?: number | null;
  fundedDebt?: number | null;
  totalLiabilities?: number | null;
  equity?: number | null;
  revenue?: number | null;
  cogs?: number | null;
  grossProfit?: number | null;
  grossProfitMargin?: number | null;
  operatingExpense?: number | null;
  otherIncomeExpense?: number | null;
  ebitdar?: number | null;
  ebitdarMargin?: number | null;
  rent?: number | null;
  ebitda?: number | null;
  ebitdaMargin?: number | null;
  depreciationAmortization?: number | null;
  interestExpense?: number | null;
  netIncome?: number | null;
  ebitdarCoverage?: number | null;
  fixedChargeCoverage?: number | null;
  leaseAdjustedLeverage?: number | null;
  fundedDebtToEbitda?: number | null;
  ratingPeriodDate?: string | null;
  oneYearEdf?: number | null;
  moodysEquivalent?: string | null;
  spEquivalent?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

// landscape.tbl_hbu_analysis
// Primary Key: hbu_id
// Foreign Keys: legal_zoning_source_doc_id -> landscape.core_doc.doc_id, project_id -> landscape.tbl_project.project_id
export interface HbuAnalysis {
  /** Default: nextval('tbl_hbu_analysis_hbu_id_seq'::regclass) */
  hbuId: number;
  projectId: number;
  scenarioName: string;
  scenarioType: string;
  legalPermissible: boolean | null;
  legalZoningCode: string | null;
  legalZoningSourceDocId: number | null;
  legalPermittedUses: any | null;
  /** Default: false */
  legalRequiresVariance: boolean | null;
  legalVarianceType: string | null;
  legalNarrative: string | null;
  physicalPossible: boolean | null;
  physicalSiteAdequate: boolean | null;
  physicalTopographySuitable: boolean | null;
  physicalUtilitiesAvailable: boolean | null;
  physicalAccessAdequate: boolean | null;
  physicalConstraints: any | null;
  physicalNarrative: string | null;
  economicFeasible: boolean | null;
  economicDevelopmentCost: number | null;
  economicStabilizedValue: number | null;
  economicResidualLandValue: number | null;
  economicProfitMarginPct: number | null;
  economicIrrPct: number | null;
  economicFeasibilityThreshold: string | null;
  economicNarrative: string | null;
  /** Default: false */
  isMaximallyProductive: boolean | null;
  productivityRank: number | null;
  productivityMetric: string | null;
  productivityNarrative: string | null;
  conclusionUseType: string | null;
  conclusionDensity: string | null;
  conclusionSummary: string | null;
  conclusionFullNarrative: string | null;
  /** Default: 'draft'::character varying */
  status: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
}

// Insert type for landscape.tbl_hbu_analysis (excludes auto-generated fields)
export type HbuAnalysisInsert = {
  projectId: number;
  scenarioName: string;
  scenarioType: string;
  legalPermissible?: boolean | null;
  legalZoningCode?: string | null;
  legalZoningSourceDocId?: number | null;
  legalPermittedUses?: any | null;
  legalRequiresVariance?: boolean | null;
  legalVarianceType?: string | null;
  legalNarrative?: string | null;
  physicalPossible?: boolean | null;
  physicalSiteAdequate?: boolean | null;
  physicalTopographySuitable?: boolean | null;
  physicalUtilitiesAvailable?: boolean | null;
  physicalAccessAdequate?: boolean | null;
  physicalConstraints?: any | null;
  physicalNarrative?: string | null;
  economicFeasible?: boolean | null;
  economicDevelopmentCost?: number | null;
  economicStabilizedValue?: number | null;
  economicResidualLandValue?: number | null;
  economicProfitMarginPct?: number | null;
  economicIrrPct?: number | null;
  economicFeasibilityThreshold?: string | null;
  economicNarrative?: string | null;
  isMaximallyProductive?: boolean | null;
  productivityRank?: number | null;
  productivityMetric?: string | null;
  productivityNarrative?: string | null;
  conclusionUseType?: string | null;
  conclusionDensity?: string | null;
  conclusionSummary?: string | null;
  conclusionFullNarrative?: string | null;
  status?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

// landscape.tbl_hbu_comparable_use
// Primary Key: comparable_use_id
// Foreign Keys: hbu_id -> landscape.tbl_hbu_analysis.hbu_id
export interface HbuComparableUse {
  /** Default: nextval('tbl_hbu_comparable_use_comparable_use_id_seq'::regclass) */
  comparableUseId: number;
  hbuId: number;
  useName: string;
  useCategory: string | null;
  isLegallyPermissible: boolean | null;
  isPhysicallyPossible: boolean | null;
  isEconomicallyFeasible: boolean | null;
  proposedDensity: string | null;
  developmentCost: number | null;
  stabilizedValue: number | null;
  residualLandValue: number | null;
  irrPct: number | null;
  feasibilityRank: number | null;
  notes: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
}

// Insert type for landscape.tbl_hbu_comparable_use (excludes auto-generated fields)
export type HbuComparableUseInsert = {
  hbuId: number;
  useName: string;
  useCategory?: string | null;
  isLegallyPermissible?: boolean | null;
  isPhysicallyPossible?: boolean | null;
  isEconomicallyFeasible?: boolean | null;
  proposedDensity?: string | null;
  developmentCost?: number | null;
  stabilizedValue?: number | null;
  residualLandValue?: number | null;
  irrPct?: number | null;
  feasibilityRank?: number | null;
  notes?: string | null;
};

// landscape.tbl_hbu_zoning_document
// Primary Key: zoning_doc_id
// Foreign Keys: document_id -> landscape.core_doc.doc_id, hbu_id -> landscape.tbl_hbu_analysis.hbu_id
export interface HbuZoningDocument {
  /** Default: nextval('tbl_hbu_zoning_document_zoning_doc_id_seq'::regclass) */
  zoningDocId: number;
  hbuId: number;
  documentId: number;
  jurisdictionName: string | null;
  zoningDesignation: string | null;
  permittedUsesExtracted: any | null;
  conditionalUsesExtracted: any | null;
  prohibitedUsesExtracted: any | null;
  developmentStandardsExtracted: any | null;
  extractionConfidence: number | null;
  extractionDate: string | null;
  /** Default: false */
  userVerified: boolean | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
}

// Insert type for landscape.tbl_hbu_zoning_document (excludes auto-generated fields)
export type HbuZoningDocumentInsert = {
  hbuId: number;
  documentId: number;
  jurisdictionName?: string | null;
  zoningDesignation?: string | null;
  permittedUsesExtracted?: any | null;
  conditionalUsesExtracted?: any | null;
  prohibitedUsesExtracted?: any | null;
  developmentStandardsExtracted?: any | null;
  extractionConfidence?: number | null;
  extractionDate?: string | null;
  userVerified?: boolean | null;
};

// landscape.tbl_help_conversation
// Primary Key: id
// Foreign Keys: user_id -> landscape.auth_user.id
export interface HelpConversation {
  /** Default: nextval('tbl_help_conversation_id_seq'::regclass) */
  id: number;
  userId: number | null;
  /** Default: gen_random_uuid() */
  conversationId: string;
  /** Default: now() */
  createdAt: string;
  /** Default: now() */
  updatedAt: string;
}

// Insert type for landscape.tbl_help_conversation (excludes auto-generated fields)
export type HelpConversationInsert = {
  userId?: number | null;
  conversationId?: string;
};

// landscape.tbl_help_message
// Primary Key: id
// Foreign Keys: conversation_id -> landscape.tbl_help_conversation.id
export interface HelpMessage {
  /** Default: nextval('tbl_help_message_id_seq'::regclass) */
  id: number;
  conversationId: number;
  role: string;
  content: string;
  currentPage: string | null;
  /** Default: now() */
  createdAt: string;
}

// Insert type for landscape.tbl_help_message (excludes auto-generated fields)
export type HelpMessageInsert = {
  conversationId: number;
  role: string;
  content: string;
  currentPage?: string | null;
};

// landscape.tbl_ic_challenge
// Primary Key: ic_challenge_id
// Foreign Keys: ic_session_id -> landscape.tbl_ic_session.ic_session_id, whatif_scenario_log_id -> landscape.tbl_scenario_log.scenario_log_id
export interface IcChallenge {
  /** Default: nextval('tbl_ic_challenge_ic_challenge_id_seq'::regclass) */
  icChallengeId: number;
  icSessionId: number;
  challengeIndex: number;
  assumptionKey: string;
  label: string | null;
  currentValue: number | null;
  suggestedValue: number | null;
  unit: string | null;
  benchmarkMean: number | null;
  benchmarkStd: number | null;
  deviationScore: number | null;
  percentileDesc: string | null;
  challengeText: string | null;
  /** Default: 'pending'::character varying */
  status: string;
  userResponse: string | null;
  userValue: number | null;
  whatifScenarioLogId: number | null;
  /** Default: '{}'::jsonb */
  impactDeltas: any | null;
  presentedAt: string | null;
  respondedAt: string | null;
  /** Default: now() */
  createdAt: string;
}

// Insert type for landscape.tbl_ic_challenge (excludes auto-generated fields)
export type IcChallengeInsert = {
  icSessionId: number;
  challengeIndex: number;
  assumptionKey: string;
  label?: string | null;
  currentValue?: number | null;
  suggestedValue?: number | null;
  unit?: string | null;
  benchmarkMean?: number | null;
  benchmarkStd?: number | null;
  deviationScore?: number | null;
  percentileDesc?: string | null;
  challengeText?: string | null;
  status?: string;
  userResponse?: string | null;
  userValue?: number | null;
  whatifScenarioLogId?: number | null;
  impactDeltas?: any | null;
  presentedAt?: string | null;
  respondedAt?: string | null;
};

// landscape.tbl_ic_session
// Primary Key: ic_session_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id, scenario_log_id -> landscape.tbl_scenario_log.scenario_log_id, thread_id -> landscape.landscaper_chat_thread.id
export interface IcSession {
  /** Default: nextval('tbl_ic_session_ic_session_id_seq'::regclass) */
  icSessionId: number;
  projectId: number;
  scenarioLogId: number | null;
  threadId: string | null;
  /** Default: 5 */
  aggressiveness: number;
  /** Default: 'active'::character varying */
  status: string;
  /** Default: 0 */
  totalAssumptionsScanned: number | null;
  /** Default: 0 */
  totalChallenges: number | null;
  /** Default: 0 */
  challengesPresented: number | null;
  /** Default: '{}'::jsonb */
  baselineSnapshot: any | null;
  /** Default: '{}'::jsonb */
  summary: any | null;
  /** Default: now() */
  createdAt: string;
  /** Default: now() */
  updatedAt: string;
  completedAt: string | null;
}

// Insert type for landscape.tbl_ic_session (excludes auto-generated fields)
export type IcSessionInsert = {
  projectId: number;
  scenarioLogId?: number | null;
  threadId?: string | null;
  aggressiveness?: number;
  status?: string;
  totalAssumptionsScanned?: number | null;
  totalChallenges?: number | null;
  challengesPresented?: number | null;
  baselineSnapshot?: any | null;
  summary?: any | null;
  completedAt?: string | null;
};

// landscape.tbl_income_approach
// Primary Key: income_approach_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface IncomeApproach {
  /** Default: nextval('tbl_income_approach_income_approach_id_seq'::regclass) */
  incomeApproachId: number;
  projectId: number;
  marketCapRateMethod: string | null;
  selectedCapRate: number | null;
  capRateJustification: string | null;
  directCapValue: number | null;
  forecastPeriodYears: number | null;
  terminalCapRate: number | null;
  discountRate: number | null;
  dcfValue: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  /** Default: 'forward_12'::character varying */
  noiCapitalizationBasis: string | null;
  /** Default: 0.05 */
  stabilizedVacancyRate: number | null;
  /** Default: 0.0050 */
  capRateInterval: number | null;
  /** Default: 0.0050 */
  discountRateInterval: number | null;
  /** Default: NULL::numeric */
  bandMortgageLtv: number | null;
  /** Default: NULL::numeric */
  bandMortgageRate: number | null;
  bandAmortizationYears: number | null;
  /** Default: NULL::numeric */
  bandEquityDividendRate: number | null;
}

// Insert type for landscape.tbl_income_approach (excludes auto-generated fields)
export type IncomeApproachInsert = {
  projectId: number;
  marketCapRateMethod?: string | null;
  selectedCapRate?: number | null;
  capRateJustification?: string | null;
  directCapValue?: number | null;
  forecastPeriodYears?: number | null;
  terminalCapRate?: number | null;
  discountRate?: number | null;
  dcfValue?: number | null;
  noiCapitalizationBasis?: string | null;
  stabilizedVacancyRate?: number | null;
  capRateInterval?: number | null;
  discountRateInterval?: number | null;
  bandMortgageLtv?: number | null;
  bandMortgageRate?: number | null;
  bandAmortizationYears?: number | null;
  bandEquityDividendRate?: number | null;
};

// landscape.tbl_income_property
// Primary Key: income_property_id
// Foreign Keys: parcel_id -> landscape.tbl_parcel.parcel_id, project_id -> landscape.tbl_project.project_id
export interface IncomeProperty {
  /** Default: nextval('tbl_income_property_income_property_id_seq'::regclass) */
  incomePropertyId: number;
  projectId: number | null;
  parcelId: number | null;
  propertyName: string | null;
  propertyType: string | null;
  propertySubtype: string | null;
  totalBuildingSf: number | null;
  rentableSf: number | null;
  usableSf: number | null;
  commonAreaSf: number | null;
  loadFactor: number | null;
  yearBuilt: number | null;
  yearRenovated: number | null;
  numberOfFloors: number | null;
  numberOfUnits: number | null;
  parkingSpaces: number | null;
  parkingRatio: number | null;
  propertyStatus: string | null;
  stabilizationDate: string | null;
  stabilizedOccupancyPct: number | null;
  acquisitionDate: string | null;
  acquisitionPrice: number | null;
  currentAssessedValue: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  /** Default: 'CRE'::character varying */
  propertyTypeCode: string | null;
}

// Insert type for landscape.tbl_income_property (excludes auto-generated fields)
export type IncomePropertyInsert = {
  projectId?: number | null;
  parcelId?: number | null;
  propertyName?: string | null;
  propertyType?: string | null;
  propertySubtype?: string | null;
  totalBuildingSf?: number | null;
  rentableSf?: number | null;
  usableSf?: number | null;
  commonAreaSf?: number | null;
  loadFactor?: number | null;
  yearBuilt?: number | null;
  yearRenovated?: number | null;
  numberOfFloors?: number | null;
  numberOfUnits?: number | null;
  parkingSpaces?: number | null;
  parkingRatio?: number | null;
  propertyStatus?: string | null;
  stabilizationDate?: string | null;
  stabilizedOccupancyPct?: number | null;
  acquisitionDate?: string | null;
  acquisitionPrice?: number | null;
  currentAssessedValue?: number | null;
  propertyTypeCode?: string | null;
};

// landscape.tbl_income_property_ind_ext
// Primary Key: income_property_id
// Foreign Keys: income_property_id -> landscape.tbl_income_property.income_property_id
export interface IncomePropertyIndExt {
  incomePropertyId: number;
  industrialType: string | null;
  buildingClass: string | null;
  clearHeightFt: number | null;
  minClearHeightFt: number | null;
  columnSpacing: string | null;
  floorThicknessInches: number | null;
  floorLoadPsf: number | null;
  /** Default: 0 */
  dockHighDoors: number | null;
  /** Default: 0 */
  gradeLevelDoors: number | null;
  /** Default: 0 */
  driveInDoors: number | null;
  dockDoorRatio: number | null;
  /** Default: 0 */
  dockLevelers: number | null;
  /** Default: 0 */
  dockSeals: number | null;
  truckCourtDepthFt: number | null;
  /** Default: 0 */
  trailerParkingSpaces: number | null;
  /** Default: 0 */
  autoParkingSpaces: number | null;
  /** Default: false */
  securedTruckYard: boolean | null;
  electricalService: string | null;
  electricalAmps: number | null;
  electricalVolts: number | null;
  /** Default: false */
  backupGenerator: boolean | null;
  generatorKw: number | null;
  sprinklerSystem: string | null;
  sprinklerDensity: string | null;
  /** Default: false */
  firePump: boolean | null;
  firePumpGpm: number | null;
  hvacType: string | null;
  officeHvacTons: number | null;
  warehouseHvacTons: number | null;
  /** Default: false */
  railServed: boolean | null;
  railCarCapacity: number | null;
  railSidingFt: number | null;
  phase_1Date: string | null;
  /** Default: false */
  phase_2Required: boolean | null;
  environmentalIssues: string | null;
  /** Default: false */
  foodGrade: boolean | null;
  /** Default: false */
  pharmaGrade: boolean | null;
  /** Default: false */
  temperatureControlled: boolean | null;
  temperatureZones: number | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_income_property_ind_ext (excludes auto-generated fields)
export type IncomePropertyIndExtInsert = {
  incomePropertyId: number;
  industrialType?: string | null;
  buildingClass?: string | null;
  clearHeightFt?: number | null;
  minClearHeightFt?: number | null;
  columnSpacing?: string | null;
  floorThicknessInches?: number | null;
  floorLoadPsf?: number | null;
  dockHighDoors?: number | null;
  gradeLevelDoors?: number | null;
  driveInDoors?: number | null;
  dockDoorRatio?: number | null;
  dockLevelers?: number | null;
  dockSeals?: number | null;
  truckCourtDepthFt?: number | null;
  trailerParkingSpaces?: number | null;
  autoParkingSpaces?: number | null;
  securedTruckYard?: boolean | null;
  electricalService?: string | null;
  electricalAmps?: number | null;
  electricalVolts?: number | null;
  backupGenerator?: boolean | null;
  generatorKw?: number | null;
  sprinklerSystem?: string | null;
  sprinklerDensity?: string | null;
  firePump?: boolean | null;
  firePumpGpm?: number | null;
  hvacType?: string | null;
  officeHvacTons?: number | null;
  warehouseHvacTons?: number | null;
  railServed?: boolean | null;
  railCarCapacity?: number | null;
  railSidingFt?: number | null;
  phase_1Date?: string | null;
  phase_2Required?: boolean | null;
  environmentalIssues?: string | null;
  foodGrade?: boolean | null;
  pharmaGrade?: boolean | null;
  temperatureControlled?: boolean | null;
  temperatureZones?: number | null;
};

// landscape.tbl_income_property_mf_ext
// Primary Key: income_property_id
// Foreign Keys: income_property_id -> landscape.tbl_income_property.income_property_id
export interface IncomePropertyMfExt {
  incomePropertyId: number;
  totalUnits: number | null;
  totalBedrooms: number | null;
  avgUnitSf: number | null;
  /** Default: 0 */
  studioCount: number | null;
  /** Default: 0 */
  oneBedCount: number | null;
  /** Default: 0 */
  twoBedCount: number | null;
  /** Default: 0 */
  threeBedCount: number | null;
  /** Default: 0 */
  fourPlusBedCount: number | null;
  /** Default: false */
  hasPool: boolean | null;
  /** Default: false */
  hasFitnessCenter: boolean | null;
  /** Default: false */
  hasClubhouse: boolean | null;
  /** Default: false */
  hasBusinessCenter: boolean | null;
  /** Default: false */
  hasPetPark: boolean | null;
  /** Default: false */
  hasEvCharging: boolean | null;
  /** Default: false */
  hasPackageLockers: boolean | null;
  /** Default: false */
  hasControlledAccess: boolean | null;
  /** Default: 0 */
  surfaceParkingSpaces: number | null;
  /** Default: 0 */
  coveredParkingSpaces: number | null;
  /** Default: 0 */
  garageParkingSpaces: number | null;
  parkingRevenueMonthly: number | null;
  utilityBillingType: string | null;
  waterMetering: string | null;
  electricMetering: string | null;
  gasMetering: string | null;
  classRating: string | null;
  /** Default: false */
  repositioningPotential: boolean | null;
  valueAddScore: number | null;
  /** Default: false */
  isRentControlled: boolean | null;
  rentControlJurisdiction: string | null;
  allowableAnnualIncreasePct: number | null;
  /** Default: false */
  hasAffordableUnits: boolean | null;
  /** Default: 0 */
  affordableUnitCount: number | null;
  lihtcExpirationDate: string | null;
  section_8ContractDate: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_income_property_mf_ext (excludes auto-generated fields)
export type IncomePropertyMfExtInsert = {
  incomePropertyId: number;
  totalUnits?: number | null;
  totalBedrooms?: number | null;
  avgUnitSf?: number | null;
  studioCount?: number | null;
  oneBedCount?: number | null;
  twoBedCount?: number | null;
  threeBedCount?: number | null;
  fourPlusBedCount?: number | null;
  hasPool?: boolean | null;
  hasFitnessCenter?: boolean | null;
  hasClubhouse?: boolean | null;
  hasBusinessCenter?: boolean | null;
  hasPetPark?: boolean | null;
  hasEvCharging?: boolean | null;
  hasPackageLockers?: boolean | null;
  hasControlledAccess?: boolean | null;
  surfaceParkingSpaces?: number | null;
  coveredParkingSpaces?: number | null;
  garageParkingSpaces?: number | null;
  parkingRevenueMonthly?: number | null;
  utilityBillingType?: string | null;
  waterMetering?: string | null;
  electricMetering?: string | null;
  gasMetering?: string | null;
  classRating?: string | null;
  repositioningPotential?: boolean | null;
  valueAddScore?: number | null;
  isRentControlled?: boolean | null;
  rentControlJurisdiction?: string | null;
  allowableAnnualIncreasePct?: number | null;
  hasAffordableUnits?: boolean | null;
  affordableUnitCount?: number | null;
  lihtcExpirationDate?: string | null;
  section_8ContractDate?: string | null;
};

// landscape.tbl_income_property_ret_ext
// Primary Key: income_property_id
// Foreign Keys: income_property_id -> landscape.tbl_income_property.income_property_id
export interface IncomePropertyRetExt {
  incomePropertyId: number;
  retailType: string | null;
  /** Default: 0 */
  anchorCount: number | null;
  /** Default: 0 */
  juniorAnchorCount: number | null;
  inlineShopCount: number | null;
  /** Default: 0 */
  padSiteCount: number | null;
  /** Default: 0 */
  outparcelCount: number | null;
  dailyTrafficCount: number | null;
  trafficCountDate: string | null;
  /** Default: false */
  signalizedIntersection: boolean | null;
  /** Default: false */
  highwayVisibility: boolean | null;
  /** Default: false */
  pylonSign: boolean | null;
  /** Default: false */
  monumentSign: boolean | null;
  population_1Mile: number | null;
  population_3Mile: number | null;
  population_5Mile: number | null;
  medianHhIncome_3Mile: number | null;
  daytimePopulation_3Mile: number | null;
  parkingRatio: number | null;
  surfaceParkingSpaces: number | null;
  structuredParkingSpaces: number | null;
  parkingFieldCondition: string | null;
  nationalTenantPct: number | null;
  regionalTenantPct: number | null;
  localTenantPct: number | null;
  foodTenantPct: number | null;
  serviceTenantPct: number | null;
  salesPsfInline: number | null;
  salesPsfAnchor: number | null;
  occupancyCostRatio: number | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_income_property_ret_ext (excludes auto-generated fields)
export type IncomePropertyRetExtInsert = {
  incomePropertyId: number;
  retailType?: string | null;
  anchorCount?: number | null;
  juniorAnchorCount?: number | null;
  inlineShopCount?: number | null;
  padSiteCount?: number | null;
  outparcelCount?: number | null;
  dailyTrafficCount?: number | null;
  trafficCountDate?: string | null;
  signalizedIntersection?: boolean | null;
  highwayVisibility?: boolean | null;
  pylonSign?: boolean | null;
  monumentSign?: boolean | null;
  population_1Mile?: number | null;
  population_3Mile?: number | null;
  population_5Mile?: number | null;
  medianHhIncome_3Mile?: number | null;
  daytimePopulation_3Mile?: number | null;
  parkingRatio?: number | null;
  surfaceParkingSpaces?: number | null;
  structuredParkingSpaces?: number | null;
  parkingFieldCondition?: string | null;
  nationalTenantPct?: number | null;
  regionalTenantPct?: number | null;
  localTenantPct?: number | null;
  foodTenantPct?: number | null;
  serviceTenantPct?: number | null;
  salesPsfInline?: number | null;
  salesPsfAnchor?: number | null;
  occupancyCostRatio?: number | null;
};

// landscape.tbl_intake_session
// Primary Key: intake_id
// Foreign Keys: created_by -> landscape.auth_user.id, doc_id -> landscape.core_doc.doc_id, project_id -> landscape.tbl_project.project_id
export interface IntakeSession {
  intakeId: number;
  /** Default: gen_random_uuid() */
  intakeUuid: string;
  projectId: number;
  docId: number | null;
  documentType: string | null;
  /** Default: 'draft'::character varying */
  status: string;
  createdBy: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_intake_session (excludes auto-generated fields)
export type IntakeSessionInsert = {
  intakeId: number;
  intakeUuid?: string;
  projectId: number;
  docId?: number | null;
  documentType?: string | null;
  status?: string;
  createdBy?: number | null;
};

// landscape.tbl_inventory_item
// Primary Key: item_id
// Foreign Keys: container_id -> landscape.tbl_division.division_id, family_id -> landscape.lu_family.family_id, product_id -> landscape.res_lot_product.product_id, project_id -> landscape.tbl_project.project_id, type_id -> landscape.lu_type.type_id
export interface InventoryItem {
  /** Default: nextval('tbl_inventory_item_item_id_seq'::regclass) */
  itemId: number;
  projectId: number;
  propertyType: string;
  itemCode: string;
  /** Default: '{}'::jsonb */
  hierarchyValues: any | null;
  containerId: number | null;
  /** Default: '{}'::jsonb */
  dataValues: any | null;
  availableDate: string | null;
  absorptionMonth: number | null;
  leaseStartDate: string | null;
  leaseEndDate: string | null;
  status: string | null;
  /** Default: false */
  isSpeculative: boolean | null;
  /** Default: true */
  isActive: boolean | null;
  /** Default: 0 */
  sortOrder: number | null;
  notes: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
  familyId: number | null;
  typeId: number | null;
  productId: number | null;
  densityCode: string | null;
}

// Insert type for landscape.tbl_inventory_item (excludes auto-generated fields)
export type InventoryItemInsert = {
  projectId: number;
  propertyType: string;
  itemCode: string;
  hierarchyValues?: any | null;
  containerId?: number | null;
  dataValues?: any | null;
  availableDate?: string | null;
  absorptionMonth?: number | null;
  leaseStartDate?: string | null;
  leaseEndDate?: string | null;
  status?: string | null;
  isSpeculative?: boolean | null;
  isActive?: boolean | null;
  sortOrder?: number | null;
  notes?: string | null;
  familyId?: number | null;
  typeId?: number | null;
  productId?: number | null;
  densityCode?: string | null;
};

// landscape.tbl_item_dependency
// Primary Key: dependency_id
export interface ItemDependency {
  /** Default: nextval('tbl_item_dependency_dependency_id_seq'::regclass) */
  dependencyId: number;
  dependentItemType: string;
  dependentItemTable: string;
  dependentItemId: number;
  triggerItemType: string | null;
  triggerItemTable: string | null;
  triggerItemId: number | null;
  /** Default: 'ABSOLUTE'::character varying */
  triggerEvent: string;
  triggerValue: number | null;
  /** Default: 0 */
  offsetPeriods: number | null;
  /** Default: false */
  isHardDependency: boolean | null;
  notes: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_item_dependency (excludes auto-generated fields)
export type ItemDependencyInsert = {
  dependentItemType: string;
  dependentItemTable: string;
  dependentItemId: number;
  triggerItemType?: string | null;
  triggerItemTable?: string | null;
  triggerItemId?: number | null;
  triggerEvent?: string;
  triggerValue?: number | null;
  offsetPeriods?: number | null;
  isHardDependency?: boolean | null;
  notes?: string | null;
};

// landscape.tbl_knowledge_source
// Primary Key: id
export interface KnowledgeSource {
  id: number;
  sourceName: string;
  sourceType: string;
  aliases: any;
  website: string | null;
  description: string | null;
  documentCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  createdBy: string;
  isActive: boolean;
}

// landscape.tbl_land_comp_adjustments
// Primary Key: adjustment_id
// Foreign Keys: land_comparable_id -> landscape.tbl_land_comparables.land_comparable_id
export interface LandCompAdjustments {
  adjustmentId: number;
  adjustmentType: string;
  adjustmentPct: number | null;
  adjustmentAmount: number | null;
  justification: string | null;
  createdAt: string;
  landComparableId: number;
}

// landscape.tbl_land_comparables
// Primary Key: land_comparable_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface LandComparables {
  landComparableId: number;
  compNumber: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  saleDate: string | null;
  salePrice: number | null;
  landAreaSf: number | null;
  landAreaAcres: number | null;
  pricePerSf: number | null;
  pricePerAcre: number | null;
  zoning: string | null;
  source: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  projectId: number;
}

// landscape.tbl_landscaper_instructions
// Primary Key: id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface LandscaperInstructions {
  /** Default: nextval('tbl_landscaper_instructions_id_seq'::regclass) */
  id: number;
  /** Default: 1 */
  userId: number;
  projectId: number | null;
  /** Default: 'custom'::character varying */
  instructionType: string;
  instructionText: string;
  /** Default: true */
  isActive: boolean;
  /** Default: now() */
  createdAt: string;
  /** Default: now() */
  updatedAt: string;
}

// Insert type for landscape.tbl_landscaper_instructions (excludes auto-generated fields)
export type LandscaperInstructionsInsert = {
  userId?: number;
  projectId?: number | null;
  instructionType?: string;
  instructionText: string;
  isActive?: boolean;
};

// landscape.tbl_landscaper_kpi_definition
// Primary Key: id
export interface LandscaperKpiDefinition {
  /** Default: nextval('tbl_landscaper_kpi_definition_id_seq'::regclass) */
  id: number;
  /** Default: 1 */
  userId: number;
  /** Default: 'LAND'::character varying */
  projectTypeCode: string;
  kpiKey: string;
  displayLabel: string;
  /** Default: 0 */
  displayOrder: number;
  /** Default: true */
  isActive: boolean;
  /** Default: now() */
  createdAt: string;
  /** Default: now() */
  updatedAt: string;
}

// Insert type for landscape.tbl_landscaper_kpi_definition (excludes auto-generated fields)
export type LandscaperKpiDefinitionInsert = {
  userId?: number;
  projectTypeCode?: string;
  kpiKey: string;
  displayLabel: string;
  displayOrder?: number;
  isActive?: boolean;
};

// landscape.tbl_landuse
// Primary Key: landuse_id
// Foreign Keys: type_id -> landscape.lu_type.type_id
export interface Landuse {
  landuseId: number;
  landuseCode: string;
  landuseType: string | null;
  typeId: number | null;
  name: string | null;
  description: string | null;
  /** Default: true */
  active: boolean | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
  subtypeId: number | null;
}

// Insert type for landscape.tbl_landuse (excludes auto-generated fields)
export type LanduseInsert = {
  landuseId: number;
  landuseCode: string;
  landuseType?: string | null;
  typeId?: number | null;
  name?: string | null;
  description?: string | null;
  active?: boolean | null;
  subtypeId?: number | null;
};

// landscape.tbl_landuse_program
// Primary Key: landuse_code
export interface LanduseProgram {
  landuseCode: string;
  rsfToGfaEff: number | null;
  employeeDensity: number | null;
  floorPlateEfficiency: number | null;
  clearHeightFt: number | null;
  loadingDockRatio: number | null;
  truckCourtDepthFt: number | null;
  trailerParkingRatio: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_landuse_program (excludes auto-generated fields)
export type LanduseProgramInsert = {
  landuseCode: string;
  rsfToGfaEff?: number | null;
  employeeDensity?: number | null;
  floorPlateEfficiency?: number | null;
  clearHeightFt?: number | null;
  loadingDockRatio?: number | null;
  truckCourtDepthFt?: number | null;
  trailerParkingRatio?: number | null;
};

// landscape.tbl_lease
// Primary Key: lease_id
// Foreign Keys: lot_id -> landscape.tbl_lot.lot_id, parcel_id -> landscape.tbl_parcel.parcel_id, project_id -> landscape.tbl_project.project_id, tenant_id -> landscape.tbl_tenant.tenant_id, terminated_by_master_lease_id -> landscape.tbl_master_lease.master_lease_id
export interface Lease {
  leaseId: number;
  projectId: number;
  parcelId: number | null;
  lotId: number | null;
  tenantName: string;
  tenantContact: string | null;
  tenantEmail: string | null;
  tenantPhone: string | null;
  tenantClassification: string | null;
  /** Default: 'Speculative'::character varying */
  leaseStatus: string | null;
  leaseType: string | null;
  suiteNumber: string | null;
  floorNumber: number | null;
  leaseExecutionDate: string | null;
  leaseCommencementDate: string;
  rentStartDate: string | null;
  leaseExpirationDate: string;
  leaseTermMonths: number;
  leasedSf: number;
  usableSf: number | null;
  /** Default: 0 */
  numberOfRenewalOptions: number | null;
  renewalOptionTermMonths: number | null;
  renewalNoticeMonths: number | null;
  /** Default: 50.00 */
  renewalProbabilityPct: number | null;
  /** Default: false */
  earlyTerminationAllowed: boolean | null;
  terminationNoticeMonths: number | null;
  terminationPenaltyAmount: number | null;
  securityDepositAmount: number | null;
  securityDepositMonths: number | null;
  /** Default: true */
  affectsOccupancy: boolean | null;
  /** Default: false */
  expansionRights: boolean | null;
  /** Default: false */
  rightOfFirstRefusal: boolean | null;
  exclusiveUseClause: string | null;
  coTenancyClause: string | null;
  radiusRestriction: string | null;
  notes: string | null;
  /** Default: '{}'::jsonb */
  leaseMetadata: any | null;
  /** Default: now() */
  createdAt: string | null;
  createdBy: string | null;
  /** Default: now() */
  updatedAt: string | null;
  updatedBy: string | null;
  /** Default: 'CRE'::character varying */
  leaseTypeCode: string | null;
  tenantId: number | null;
  terminatedByMasterLeaseId: number | null;
  terminatedAt: string | null;
  terminationReason: string | null;
}

// Insert type for landscape.tbl_lease (excludes auto-generated fields)
export type LeaseInsert = {
  leaseId: number;
  projectId: number;
  parcelId?: number | null;
  lotId?: number | null;
  tenantName: string;
  tenantContact?: string | null;
  tenantEmail?: string | null;
  tenantPhone?: string | null;
  tenantClassification?: string | null;
  leaseStatus?: string | null;
  leaseType?: string | null;
  suiteNumber?: string | null;
  floorNumber?: number | null;
  leaseExecutionDate?: string | null;
  leaseCommencementDate: string;
  rentStartDate?: string | null;
  leaseExpirationDate: string;
  leaseTermMonths: number;
  leasedSf: number;
  usableSf?: number | null;
  numberOfRenewalOptions?: number | null;
  renewalOptionTermMonths?: number | null;
  renewalNoticeMonths?: number | null;
  renewalProbabilityPct?: number | null;
  earlyTerminationAllowed?: boolean | null;
  terminationNoticeMonths?: number | null;
  terminationPenaltyAmount?: number | null;
  securityDepositAmount?: number | null;
  securityDepositMonths?: number | null;
  affectsOccupancy?: boolean | null;
  expansionRights?: boolean | null;
  rightOfFirstRefusal?: boolean | null;
  exclusiveUseClause?: string | null;
  coTenancyClause?: string | null;
  radiusRestriction?: string | null;
  notes?: string | null;
  leaseMetadata?: any | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  leaseTypeCode?: string | null;
  tenantId?: number | null;
  terminatedByMasterLeaseId?: number | null;
  terminatedAt?: string | null;
  terminationReason?: string | null;
};

// landscape.tbl_lease_archive_20260506
export interface LeaseArchive20260506 {
  leaseId: number | null;
  projectId: number | null;
  parcelId: number | null;
  lotId: number | null;
  tenantName: string | null;
  tenantContact: string | null;
  tenantEmail: string | null;
  tenantPhone: string | null;
  tenantClassification: string | null;
  leaseStatus: string | null;
  leaseType: string | null;
  suiteNumber: string | null;
  floorNumber: number | null;
  leaseExecutionDate: string | null;
  leaseCommencementDate: string | null;
  rentStartDate: string | null;
  leaseExpirationDate: string | null;
  leaseTermMonths: number | null;
  leasedSf: number | null;
  usableSf: number | null;
  numberOfRenewalOptions: number | null;
  renewalOptionTermMonths: number | null;
  renewalNoticeMonths: number | null;
  renewalProbabilityPct: number | null;
  earlyTerminationAllowed: boolean | null;
  terminationNoticeMonths: number | null;
  terminationPenaltyAmount: number | null;
  securityDepositAmount: number | null;
  securityDepositMonths: number | null;
  affectsOccupancy: boolean | null;
  expansionRights: boolean | null;
  rightOfFirstRefusal: boolean | null;
  exclusiveUseClause: string | null;
  coTenancyClause: string | null;
  radiusRestriction: string | null;
  notes: string | null;
  leaseMetadata: any | null;
  createdAt: string | null;
  createdBy: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
  leaseTypeCode: string | null;
}

// landscape.tbl_lease_assumptions
// Primary Key: assumption_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface LeaseAssumptions {
  /** Default: nextval('tbl_lease_assumptions_assumption_id_seq'::regclass) */
  assumptionId: number;
  projectId: number;
  spaceType: string;
  marketRentPsfAnnual: number;
  /** Default: 0.025 */
  marketRentGrowthRate: number | null;
  /** Default: 0.70 */
  renewalProbability: number | null;
  /** Default: 6 */
  downtimeMonths: number | null;
  /** Default: 0 */
  tiPsfRenewal: number | null;
  /** Default: 0 */
  tiPsfNewTenant: number | null;
  /** Default: 0 */
  lcPsfRenewal: number | null;
  /** Default: 0 */
  lcPsfNewTenant: number | null;
  /** Default: 0 */
  freeRentMonthsRenewal: number | null;
  /** Default: 3 */
  freeRentMonthsNewTenant: number | null;
  /** Default: CURRENT_DATE */
  effectiveDate: string | null;
  notes: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_lease_assumptions (excludes auto-generated fields)
export type LeaseAssumptionsInsert = {
  projectId: number;
  spaceType: string;
  marketRentPsfAnnual: number;
  marketRentGrowthRate?: number | null;
  renewalProbability?: number | null;
  downtimeMonths?: number | null;
  tiPsfRenewal?: number | null;
  tiPsfNewTenant?: number | null;
  lcPsfRenewal?: number | null;
  lcPsfNewTenant?: number | null;
  freeRentMonthsRenewal?: number | null;
  freeRentMonthsNewTenant?: number | null;
  effectiveDate?: string | null;
  notes?: string | null;
};

// landscape.tbl_lease_ind_ext
// Primary Key: lease_id
// Foreign Keys: lease_id -> landscape.tbl_lease.lease_id
export interface LeaseIndExt {
  leaseId: number;
  rentStructure: string | null;
  /** Default: true */
  camIncludesRoof: boolean | null;
  /** Default: true */
  camIncludesStructure: boolean | null;
  /** Default: true */
  camIncludesParking: boolean | null;
  managementFeePct: number | null;
  landlordTiAllowance: number | null;
  landlordTiPsf: number | null;
  tenantTiInvestment: number | null;
  clearHeightRequirementFt: number | null;
  dockRequirement: number | null;
  powerRequirementAmps: number | null;
  operatingHours: string | null;
  /** Default: false */
  hazmatUse: boolean | null;
  hazmatDescription: string | null;
  expansionOptionSf: number | null;
  expansionOptionRentPsf: number | null;
  /** Default: false */
  contractionOption: boolean | null;
  contractionDate: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_lease_ind_ext (excludes auto-generated fields)
export type LeaseIndExtInsert = {
  leaseId: number;
  rentStructure?: string | null;
  camIncludesRoof?: boolean | null;
  camIncludesStructure?: boolean | null;
  camIncludesParking?: boolean | null;
  managementFeePct?: number | null;
  landlordTiAllowance?: number | null;
  landlordTiPsf?: number | null;
  tenantTiInvestment?: number | null;
  clearHeightRequirementFt?: number | null;
  dockRequirement?: number | null;
  powerRequirementAmps?: number | null;
  operatingHours?: string | null;
  hazmatUse?: boolean | null;
  hazmatDescription?: string | null;
  expansionOptionSf?: number | null;
  expansionOptionRentPsf?: number | null;
  contractionOption?: boolean | null;
  contractionDate?: string | null;
};

// landscape.tbl_lease_mf_ext
// Primary Key: lease_id
// Foreign Keys: lease_id -> landscape.tbl_lease.lease_id
export interface LeaseMfExt {
  leaseId: number;
  baseRentMonthly: number | null;
  petRentMonthly: number | null;
  parkingRentMonthly: number | null;
  storageRentMonthly: number | null;
  otherRentMonthly: number | null;
  moveInConcession: number | null;
  recurringConcession: number | null;
  concessionMonths: number | null;
  netEffectiveRent: number | null;
  householdSize: number | null;
  householdIncome: number | null;
  incomeToRentRatio: number | null;
  mtmRatePremiumPct: number | null;
  renewalProbabilityPct: number | null;
  /** Default: false */
  isAffordableUnit: boolean | null;
  amiPercentage: number | null;
  voucherType: string | null;
  voucherAmount: number | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_lease_mf_ext (excludes auto-generated fields)
export type LeaseMfExtInsert = {
  leaseId: number;
  baseRentMonthly?: number | null;
  petRentMonthly?: number | null;
  parkingRentMonthly?: number | null;
  storageRentMonthly?: number | null;
  otherRentMonthly?: number | null;
  moveInConcession?: number | null;
  recurringConcession?: number | null;
  concessionMonths?: number | null;
  netEffectiveRent?: number | null;
  householdSize?: number | null;
  householdIncome?: number | null;
  incomeToRentRatio?: number | null;
  mtmRatePremiumPct?: number | null;
  renewalProbabilityPct?: number | null;
  isAffordableUnit?: boolean | null;
  amiPercentage?: number | null;
  voucherType?: string | null;
  voucherAmount?: number | null;
};

// landscape.tbl_lease_nl_ext
// Primary Key: lease_id
// Foreign Keys: concept_id -> landscape.tbl_concept.concept_id, lease_id -> landscape.tbl_lease.lease_id, master_lease_id -> landscape.tbl_master_lease.master_lease_id
export interface LeaseNlExt {
  leaseId: number;
  saleLeasebackSubtype: string | null;
  /** Default: false */
  isBuildToSuit: boolean | null;
  investmentType: string | null;
  isConformingInvestment: boolean | null;
  isAllOrNonePurchase: boolean | null;
  /** Default: false */
  hasRofo: boolean | null;
  /** Default: false */
  hasRofr: boolean | null;
  /** Default: false */
  hasPurchaseOption: boolean | null;
  /** Default: false */
  hasEarlyTermination: boolean | null;
  depositAmount: number | null;
  subleasingAllowed: string | null;
  lessorAssignmentProvisions: string | null;
  lesseeAssignmentNetWorthTest: string | null;
  goingDarkClause: string | null;
  permittedUseRestrictions: string | null;
  percentageRentThreshold: number | null;
  percentageRentRate: number | null;
  financialCovenants: string | null;
  /** Default: false */
  financialCovenantsRemovedInRestructuring: boolean | null;
  managementFeeLimitation: number | null;
  rentRecoveryPctPostRestructuring: number | null;
  corpReportingFrequency: string | null;
  corpReportingStatements: string | null;
  unitReportingFrequency: string | null;
  unitReportingStatements: string | null;
  masterLeaseId: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  conceptId: number | null;
}

// Insert type for landscape.tbl_lease_nl_ext (excludes auto-generated fields)
export type LeaseNlExtInsert = {
  leaseId: number;
  saleLeasebackSubtype?: string | null;
  isBuildToSuit?: boolean | null;
  investmentType?: string | null;
  isConformingInvestment?: boolean | null;
  isAllOrNonePurchase?: boolean | null;
  hasRofo?: boolean | null;
  hasRofr?: boolean | null;
  hasPurchaseOption?: boolean | null;
  hasEarlyTermination?: boolean | null;
  depositAmount?: number | null;
  subleasingAllowed?: string | null;
  lessorAssignmentProvisions?: string | null;
  lesseeAssignmentNetWorthTest?: string | null;
  goingDarkClause?: string | null;
  permittedUseRestrictions?: string | null;
  percentageRentThreshold?: number | null;
  percentageRentRate?: number | null;
  financialCovenants?: string | null;
  financialCovenantsRemovedInRestructuring?: boolean | null;
  managementFeeLimitation?: number | null;
  rentRecoveryPctPostRestructuring?: number | null;
  corpReportingFrequency?: string | null;
  corpReportingStatements?: string | null;
  unitReportingFrequency?: string | null;
  unitReportingStatements?: string | null;
  masterLeaseId?: number | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  conceptId?: number | null;
};

// landscape.tbl_lease_ret_ext
// Primary Key: lease_id
// Foreign Keys: lease_id -> landscape.tbl_lease.lease_id
export interface LeaseRetExt {
  leaseId: number;
  rentStructure: string | null;
  camBaseYear: number | null;
  camBaseAmount: number | null;
  camCapAmount: number | null;
  camCapEscalationPct: number | null;
  /** Default: false */
  camControllableCap: boolean | null;
  adminFeePct: number | null;
  taxBaseYear: number | null;
  taxBaseAmount: number | null;
  taxCapAmount: number | null;
  insuranceBaseYear: number | null;
  insuranceBaseAmount: number | null;
  /** Default: false */
  naturalBreakpoint: boolean | null;
  /** Default: false */
  artificialBreakpoint: boolean | null;
  breakpointAmount: number | null;
  percentageRate: number | null;
  percentageRentExclusions: string | null;
  openingCoTenancy: string | null;
  operatingCoTenancy: string | null;
  coTenancyRemedy: string | null;
  rentReductionPct: number | null;
  exclusiveUseClause: string | null;
  exclusiveRadiusMiles: number | null;
  kickOutDate: string | null;
  kickOutSalesThreshold: number | null;
  assignmentFee: number | null;
  /** Default: false */
  sublettingAllowed: boolean | null;
  profitSharingPct: number | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_lease_ret_ext (excludes auto-generated fields)
export type LeaseRetExtInsert = {
  leaseId: number;
  rentStructure?: string | null;
  camBaseYear?: number | null;
  camBaseAmount?: number | null;
  camCapAmount?: number | null;
  camCapEscalationPct?: number | null;
  camControllableCap?: boolean | null;
  adminFeePct?: number | null;
  taxBaseYear?: number | null;
  taxBaseAmount?: number | null;
  taxCapAmount?: number | null;
  insuranceBaseYear?: number | null;
  insuranceBaseAmount?: number | null;
  naturalBreakpoint?: boolean | null;
  artificialBreakpoint?: boolean | null;
  breakpointAmount?: number | null;
  percentageRate?: number | null;
  percentageRentExclusions?: string | null;
  openingCoTenancy?: string | null;
  operatingCoTenancy?: string | null;
  coTenancyRemedy?: string | null;
  rentReductionPct?: number | null;
  exclusiveUseClause?: string | null;
  exclusiveRadiusMiles?: number | null;
  kickOutDate?: string | null;
  kickOutSalesThreshold?: number | null;
  assignmentFee?: number | null;
  sublettingAllowed?: boolean | null;
  profitSharingPct?: number | null;
};

// landscape.tbl_lease_revenue_timing
// Primary Key: timing_id
// Foreign Keys: lease_id -> landscape.tbl_rent_roll.rent_roll_id, project_id -> landscape.tbl_project.project_id
export interface LeaseRevenueTiming {
  /** Default: nextval('tbl_lease_revenue_timing_timing_id_seq'::regclass) */
  timingId: number;
  projectId: number;
  leaseId: number;
  periodId: number;
  /** Default: 0 */
  baseRent: number | null;
  /** Default: 0 */
  escalatedRent: number | null;
  /** Default: 0 */
  percentageRent: number | null;
  /** Default: 0 */
  camRecovery: number | null;
  /** Default: 0 */
  taxRecovery: number | null;
  /** Default: 0 */
  insuranceRecovery: number | null;
  /** Default: 0 */
  vacancyLoss: number | null;
  /** Default: 0 */
  freeRentAdjustment: number | null;
  /** Default: 0 */
  effectiveGrossRent: number | null;
  /** Default: now() */
  calculationDate: string | null;
}

// Insert type for landscape.tbl_lease_revenue_timing (excludes auto-generated fields)
export type LeaseRevenueTimingInsert = {
  projectId: number;
  leaseId: number;
  periodId: number;
  baseRent?: number | null;
  escalatedRent?: number | null;
  percentageRent?: number | null;
  camRecovery?: number | null;
  taxRecovery?: number | null;
  insuranceRecovery?: number | null;
  vacancyLoss?: number | null;
  freeRentAdjustment?: number | null;
  effectiveGrossRent?: number | null;
};

// landscape.tbl_leasing_commission
// Primary Key: commission_id
// Foreign Keys: lease_id -> landscape.tbl_lease.lease_id
export interface LeasingCommission {
  commissionId: number;
  leaseId: number;
  baseCommissionPct: number | null;
  renewalCommissionPct: number | null;
  /** Default: '[]'::jsonb */
  tiers: any | null;
  commissionAmount: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_leasing_commission (excludes auto-generated fields)
export type LeasingCommissionInsert = {
  commissionId: number;
  leaseId: number;
  baseCommissionPct?: number | null;
  renewalCommissionPct?: number | null;
  tiers?: any | null;
  commissionAmount?: number | null;
};

// landscape.tbl_loan
// Primary Key: loan_id
// Foreign Keys: maturity_period_id -> landscape.tbl_calculation_period.period_id, project_id -> landscape.tbl_project.project_id, takes_out_loan_id -> landscape.tbl_loan.loan_id
export interface Loan {
  loanId: number;
  projectId: number;
  loanName: string;
  loanType: string;
  /** Default: 'TERM'::character varying */
  structureType: string;
  lenderName: string | null;
  /** Default: 1 */
  seniority: number;
  /** Default: 'active'::character varying */
  status: string | null;
  /** Default: 0 */
  commitmentAmount: number | null;
  loanAmount: number | null;
  loanToCostPct: number | null;
  loanToValuePct: number | null;
  interestRatePct: number | null;
  interestRateDecimal: number | null;
  /** Default: 'Fixed'::character varying */
  interestType: string | null;
  interestIndex: string | null;
  interestSpreadBps: number | null;
  rateFloorPct: number | null;
  rateCapPct: number | null;
  rateResetFrequency: string | null;
  /** Default: 'SIMPLE'::character varying */
  interestCalculation: string | null;
  /** Default: 'paid_current'::character varying */
  interestPaymentMethod: string | null;
  loanStartDate: string | null;
  loanMaturityDate: string | null;
  maturityPeriodId: number | null;
  loanTermMonths: number | null;
  loanTermYears: number | null;
  amortizationMonths: number | null;
  amortizationYears: number | null;
  /** Default: 0 */
  interestOnlyMonths: number | null;
  /** Default: 'MONTHLY'::character varying */
  paymentFrequency: string | null;
  commitmentDate: string | null;
  originationFeePct: number | null;
  exitFeePct: number | null;
  unusedFeePct: number | null;
  commitmentFeePct: number | null;
  extensionFeeBps: number | null;
  extensionFeeAmount: number | null;
  prepaymentPenaltyYears: number | null;
  interestReserveAmount: number | null;
  /** Default: false */
  interestReserveFundedUpfront: boolean | null;
  /** Default: '{}'::jsonb */
  reserveRequirements: any | null;
  replacementReservePerUnit: number | null;
  taxInsuranceEscrowMonths: number | null;
  initialReserveMonths: number | null;
  /** Default: '{}'::jsonb */
  covenants: any | null;
  loanCovenantDscrMin: number | null;
  loanCovenantLtvMax: number | null;
  loanCovenantOccupancyMin: number | null;
  /** Default: 'Quarterly'::character varying */
  covenantTestFrequency: string | null;
  guaranteeType: string | null;
  guarantorName: string | null;
  recourseCarveoutProvisions: string | null;
  /** Default: 0 */
  extensionOptions: number | null;
  extensionOptionYears: number | null;
  /** Default: 'COST_INCURRED'::character varying */
  drawTriggerType: string | null;
  commitmentBalance: number | null;
  /** Default: 0 */
  drawnToDate: number | null;
  /** Default: false */
  isConstructionLoan: boolean | null;
  releasePricePct: number | null;
  minimumReleaseAmount: number | null;
  takesOutLoanId: number | null;
  /** Default: false */
  canParticipateInProfits: boolean | null;
  profitParticipationTier: number | null;
  profitParticipationPct: number | null;
  monthlyPayment: number | null;
  annualDebtService: number | null;
  notes: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  /** Default: 1.0 */
  interestReserveInflator: number | null;
  /** Default: 1.0 */
  repaymentAcceleration: number | null;
  closingCostsAppraisal: number | null;
  closingCostsLegal: number | null;
  closingCostsOther: number | null;
  /** Default: 'FULL'::character varying */
  recourseType: string | null;
  /** Default: 'PROJECT_COST'::character varying */
  collateralBasisType: string | null;
  /** Default: 'MANUAL'::character varying */
  commitmentSizingMethod: string | null;
  ltvBasisAmount: number | null;
  ltcBasisAmount: number | null;
  calculatedCommitmentAmount: number | null;
  governingConstraint: string | null;
  netLoanProceeds: number | null;
  indexRatePct: number | null;
}

// Insert type for landscape.tbl_loan (excludes auto-generated fields)
export type LoanInsert = {
  loanId: number;
  projectId: number;
  loanName: string;
  loanType: string;
  structureType?: string;
  lenderName?: string | null;
  seniority?: number;
  status?: string | null;
  commitmentAmount?: number | null;
  loanAmount?: number | null;
  loanToCostPct?: number | null;
  loanToValuePct?: number | null;
  interestRatePct?: number | null;
  interestRateDecimal?: number | null;
  interestType?: string | null;
  interestIndex?: string | null;
  interestSpreadBps?: number | null;
  rateFloorPct?: number | null;
  rateCapPct?: number | null;
  rateResetFrequency?: string | null;
  interestCalculation?: string | null;
  interestPaymentMethod?: string | null;
  loanStartDate?: string | null;
  loanMaturityDate?: string | null;
  maturityPeriodId?: number | null;
  loanTermMonths?: number | null;
  loanTermYears?: number | null;
  amortizationMonths?: number | null;
  amortizationYears?: number | null;
  interestOnlyMonths?: number | null;
  paymentFrequency?: string | null;
  commitmentDate?: string | null;
  originationFeePct?: number | null;
  exitFeePct?: number | null;
  unusedFeePct?: number | null;
  commitmentFeePct?: number | null;
  extensionFeeBps?: number | null;
  extensionFeeAmount?: number | null;
  prepaymentPenaltyYears?: number | null;
  interestReserveAmount?: number | null;
  interestReserveFundedUpfront?: boolean | null;
  reserveRequirements?: any | null;
  replacementReservePerUnit?: number | null;
  taxInsuranceEscrowMonths?: number | null;
  initialReserveMonths?: number | null;
  covenants?: any | null;
  loanCovenantDscrMin?: number | null;
  loanCovenantLtvMax?: number | null;
  loanCovenantOccupancyMin?: number | null;
  covenantTestFrequency?: string | null;
  guaranteeType?: string | null;
  guarantorName?: string | null;
  recourseCarveoutProvisions?: string | null;
  extensionOptions?: number | null;
  extensionOptionYears?: number | null;
  drawTriggerType?: string | null;
  commitmentBalance?: number | null;
  drawnToDate?: number | null;
  isConstructionLoan?: boolean | null;
  releasePricePct?: number | null;
  minimumReleaseAmount?: number | null;
  takesOutLoanId?: number | null;
  canParticipateInProfits?: boolean | null;
  profitParticipationTier?: number | null;
  profitParticipationPct?: number | null;
  monthlyPayment?: number | null;
  annualDebtService?: number | null;
  notes?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  interestReserveInflator?: number | null;
  repaymentAcceleration?: number | null;
  closingCostsAppraisal?: number | null;
  closingCostsLegal?: number | null;
  closingCostsOther?: number | null;
  recourseType?: string | null;
  collateralBasisType?: string | null;
  commitmentSizingMethod?: string | null;
  ltvBasisAmount?: number | null;
  ltcBasisAmount?: number | null;
  calculatedCommitmentAmount?: number | null;
  governingConstraint?: string | null;
  netLoanProceeds?: number | null;
  indexRatePct?: number | null;
};

// landscape.tbl_loan_container
// Primary Key: loan_container_id
// Foreign Keys: division_id -> landscape.tbl_division.division_id, loan_id -> landscape.tbl_loan.loan_id
export interface LoanContainer {
  loanContainerId: number;
  loanId: number;
  divisionId: number;
  allocationPct: number | null;
  collateralType: string | null;
  /** Default: now() */
  createdAt: string | null;
}

// Insert type for landscape.tbl_loan_container (excludes auto-generated fields)
export type LoanContainerInsert = {
  loanContainerId: number;
  loanId: number;
  divisionId: number;
  allocationPct?: number | null;
  collateralType?: string | null;
};

// landscape.tbl_loan_finance_structure
// Primary Key: loan_fs_id
// Foreign Keys: finance_structure_id -> landscape.tbl_finance_structure.finance_structure_id, loan_id -> landscape.tbl_loan.loan_id
export interface LoanFinanceStructure {
  loanFsId: number;
  loanId: number;
  financeStructureId: number;
  contributionPct: number | null;
  /** Default: now() */
  createdAt: string | null;
}

// Insert type for landscape.tbl_loan_finance_structure (excludes auto-generated fields)
export type LoanFinanceStructureInsert = {
  loanFsId: number;
  loanId: number;
  financeStructureId: number;
  contributionPct?: number | null;
};

// landscape.tbl_location_brief
// Primary Key: brief_id
export interface LocationBrief {
  /** Default: nextval('tbl_location_brief_brief_id_seq'::regclass) */
  briefId: number;
  userId: string | null;
  locationKey: string;
  locationDisplay: string;
  propertyType: string;
  /** Default: 'standard'::character varying */
  depth: string;
  centerLat: number | null;
  centerLon: number | null;
  /** Default: '{}'::jsonb */
  geoHierarchy: any;
  /** Default: '{}'::jsonb */
  indicators: any;
  /** Default: '[]'::jsonb */
  sections: any;
  summary: string | null;
  dataAsOf: string | null;
  nextRefreshAt: string | null;
  /** Default: now() */
  cachedAt: string;
  /** Default: now() */
  accessedAt: string;
  /** Default: 1 */
  accessCount: number;
}

// Insert type for landscape.tbl_location_brief (excludes auto-generated fields)
export type LocationBriefInsert = {
  userId?: string | null;
  locationKey: string;
  locationDisplay: string;
  propertyType: string;
  depth?: string;
  centerLat?: number | null;
  centerLon?: number | null;
  geoHierarchy?: any;
  indicators?: any;
  sections?: any;
  summary?: string | null;
  dataAsOf?: string | null;
  nextRefreshAt?: string | null;
  accessCount?: number;
};

// landscape.tbl_lot
// Primary Key: lot_id
// Foreign Keys: parcel_id -> landscape.tbl_parcel.parcel_id, phase_id -> landscape.tbl_phase.phase_id, project_id -> landscape.tbl_project.project_id
export interface Lot {
  lotId: number;
  parcelId: number;
  phaseId: number | null;
  projectId: number;
  lotNumber: string | null;
  unitNumber: string | null;
  suiteNumber: string | null;
  unitType: string | null;
  lotSf: number | null;
  unitSf: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floorNumber: number | null;
  basePrice: number | null;
  pricePsf: number | null;
  optionsPrice: number | null;
  totalPrice: number | null;
  /** Default: 'Available'::character varying */
  lotStatus: string | null;
  saleDate: string | null;
  closeDate: string | null;
  leaseId: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_lot (excludes auto-generated fields)
export type LotInsert = {
  lotId: number;
  parcelId: number;
  phaseId?: number | null;
  projectId: number;
  lotNumber?: string | null;
  unitNumber?: string | null;
  suiteNumber?: string | null;
  unitType?: string | null;
  lotSf?: number | null;
  unitSf?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  floorNumber?: number | null;
  basePrice?: number | null;
  pricePsf?: number | null;
  optionsPrice?: number | null;
  totalPrice?: number | null;
  lotStatus?: string | null;
  saleDate?: string | null;
  closeDate?: string | null;
  leaseId?: number | null;
};

// landscape.tbl_lot_type
// Primary Key: producttype_id
export interface LotType {
  producttypeId: number;
  producttypeName: string;
  typicalLotWidth: number | null;
  typicalLotDepth: number | null;
}

// landscape.tbl_market_rate_analysis
// Primary Key: analysis_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface MarketRateAnalysis {
  /** Default: nextval('tbl_market_rate_analysis_analysis_id_seq'::regclass) */
  analysisId: number;
  projectId: number;
  unitType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  subjectSqft: number | null;
  compCount: number | null;
  minRent: number | null;
  maxRent: number | null;
  avgRent: number | null;
  medianRent: number | null;
  avgRentPerSf: number | null;
  /** Default: 0 */
  locationAdjustment: number | null;
  /** Default: 0 */
  conditionAdjustment: number | null;
  /** Default: 0 */
  amenityAdjustment: number | null;
  /** Default: 0 */
  sizeAdjustmentPerSf: number | null;
  recommendedMarketRent: number | null;
  recommendedRentPerSf: number | null;
  /** Default: 'MEDIUM'::character varying */
  confidenceLevel: string | null;
  analysisNotes: string | null;
  analyzedBy: string | null;
  /** Default: CURRENT_DATE */
  analysisDate: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
  population_1mi: number | null;
  population_3mi: number | null;
  population_5mi: number | null;
  medianHhIncome_1mi: number | null;
  medianHhIncome_3mi: number | null;
  avgHhIncome_5mi: number | null;
  employment_5mi: number | null;
  submarketVacancy: number | null;
  submarketRentGrowth: number | null;
  submarketAvgRent: number | null;
  submarketOccupancy: number | null;
  newSupplyPipeline: number | null;
}

// Insert type for landscape.tbl_market_rate_analysis (excludes auto-generated fields)
export type MarketRateAnalysisInsert = {
  projectId: number;
  unitType?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  subjectSqft?: number | null;
  compCount?: number | null;
  minRent?: number | null;
  maxRent?: number | null;
  avgRent?: number | null;
  medianRent?: number | null;
  avgRentPerSf?: number | null;
  locationAdjustment?: number | null;
  conditionAdjustment?: number | null;
  amenityAdjustment?: number | null;
  sizeAdjustmentPerSf?: number | null;
  recommendedMarketRent?: number | null;
  recommendedRentPerSf?: number | null;
  confidenceLevel?: string | null;
  analysisNotes?: string | null;
  analyzedBy?: string | null;
  analysisDate?: string | null;
  population_1mi?: number | null;
  population_3mi?: number | null;
  population_5mi?: number | null;
  medianHhIncome_1mi?: number | null;
  medianHhIncome_3mi?: number | null;
  avgHhIncome_5mi?: number | null;
  employment_5mi?: number | null;
  submarketVacancy?: number | null;
  submarketRentGrowth?: number | null;
  submarketAvgRent?: number | null;
  submarketOccupancy?: number | null;
  newSupplyPipeline?: number | null;
};

// landscape.tbl_master_lease
// Primary Key: master_lease_id
// Foreign Keys: current_lessee_tenant_id -> landscape.tbl_tenant.tenant_id, lease_id -> landscape.tbl_lease.lease_id, project_id -> landscape.tbl_project.project_id, replaces_master_lease_id -> landscape.tbl_master_lease.master_lease_id
export interface MasterLease {
  /** Default: nextval('tbl_master_lease_master_lease_id_seq'::regclass) */
  masterLeaseId: number;
  masterLeaseName: string;
  projectId: number | null;
  leaseId: number | null;
  currentLesseeTenantId: number | null;
  originalCommencementDate: string | null;
  currentExpirationDate: string | null;
  currentTermMonths: number | null;
  /** Default: false */
  crossDefaultFlag: boolean | null;
  /** Default: false */
  crossCollateralizedFlag: boolean | null;
  recoveryStructure: string | null;
  /** Default: 'active'::character varying */
  status: string | null;
  /** Default: 0 */
  amendmentCount: number | null;
  lastAmendedAt: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  /** Default: 'original_creation'::character varying */
  lineageType: string | null;
  replacesMasterLeaseId: number | null;
  /** Default: '[]'::jsonb */
  createdFromDocIds: any | null;
}

// Insert type for landscape.tbl_master_lease (excludes auto-generated fields)
export type MasterLeaseInsert = {
  masterLeaseName: string;
  projectId?: number | null;
  leaseId?: number | null;
  currentLesseeTenantId?: number | null;
  originalCommencementDate?: string | null;
  currentExpirationDate?: string | null;
  currentTermMonths?: number | null;
  crossDefaultFlag?: boolean | null;
  crossCollateralizedFlag?: boolean | null;
  recoveryStructure?: string | null;
  status?: string | null;
  amendmentCount?: number | null;
  lastAmendedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  lineageType?: string | null;
  replacesMasterLeaseId?: number | null;
  createdFromDocIds?: any | null;
};

// landscape.tbl_master_lease_amendment
// Primary Key: amendment_id
// Foreign Keys: master_lease_id -> landscape.tbl_master_lease.master_lease_id, new_lessee_tenant_id -> landscape.tbl_tenant.tenant_id
export interface MasterLeaseAmendment {
  /** Default: nextval('tbl_master_lease_amendment_amendment_id_seq'::regclass) */
  amendmentId: number;
  masterLeaseId: number;
  amendmentNumber: number;
  amendmentDate: string;
  amendmentType: string;
  description: string | null;
  termChangeMonths: number | null;
  newExpirationDate: string | null;
  newEscalationText: string | null;
  newLesseeTenantId: number | null;
  recoveryPct: number | null;
  amendedBy: string | null;
  /** Default: now() */
  createdAt: string | null;
}

// Insert type for landscape.tbl_master_lease_amendment (excludes auto-generated fields)
export type MasterLeaseAmendmentInsert = {
  masterLeaseId: number;
  amendmentNumber: number;
  amendmentDate: string;
  amendmentType: string;
  description?: string | null;
  termChangeMonths?: number | null;
  newExpirationDate?: string | null;
  newEscalationText?: string | null;
  newLesseeTenantId?: number | null;
  recoveryPct?: number | null;
  amendedBy?: string | null;
};

// landscape.tbl_master_lease_property
// Primary Key: master_lease_property_id
// Foreign Keys: joined_via_amendment_id -> landscape.tbl_master_lease_amendment.amendment_id, master_lease_id -> landscape.tbl_master_lease.master_lease_id, parcel_id -> landscape.tbl_parcel.parcel_id, removed_via_amendment_id -> landscape.tbl_master_lease_amendment.amendment_id
export interface MasterLeaseProperty {
  /** Default: nextval('tbl_master_lease_property_master_lease_property_id_seq'::regclass) */
  masterLeasePropertyId: number;
  masterLeaseId: number;
  parcelId: number | null;
  allocatedRent: number | null;
  allocatedPurchasePrice: number | null;
  allocatedCapRate: number | null;
  joinedAt: string | null;
  joinedViaAmendmentId: number | null;
  removedAt: string | null;
  removalReason: string | null;
  removedViaAmendmentId: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  originalAcquisitionDate: string | null;
  originalAcquisitionPrice: number | null;
  originalGoingInCapRate: number | null;
  /** Default: false */
  snapshotOnly: boolean | null;
}

// Insert type for landscape.tbl_master_lease_property (excludes auto-generated fields)
export type MasterLeasePropertyInsert = {
  masterLeaseId: number;
  parcelId?: number | null;
  allocatedRent?: number | null;
  allocatedPurchasePrice?: number | null;
  allocatedCapRate?: number | null;
  joinedAt?: string | null;
  joinedViaAmendmentId?: number | null;
  removedAt?: string | null;
  removalReason?: string | null;
  removedViaAmendmentId?: number | null;
  originalAcquisitionDate?: string | null;
  originalAcquisitionPrice?: number | null;
  originalGoingInCapRate?: number | null;
  snapshotOnly?: boolean | null;
};

// landscape.tbl_measures
// Primary Key: measure_id
export interface Measures {
  /** Default: nextval('tbl_measures_measure_id_seq'::regclass) */
  measureId: number;
  measureCode: string;
  measureName: string;
  measureCategory: string;
  /** Default: true */
  isSystem: boolean | null;
  createdBy: number | null;
  propertyTypes: any | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
  /** Default: 0 */
  sortOrder: number | null;
}

// Insert type for landscape.tbl_measures (excludes auto-generated fields)
export type MeasuresInsert = {
  measureCode: string;
  measureName: string;
  measureCategory: string;
  isSystem?: boolean | null;
  createdBy?: number | null;
  propertyTypes?: any | null;
  sortOrder?: number | null;
};

// landscape.tbl_milestone
// Primary Key: milestone_id
// Foreign Keys: phase_id -> landscape.tbl_phase.phase_id, predecessor_milestone_id -> landscape.tbl_milestone.milestone_id, project_id -> landscape.tbl_project.project_id, source_doc_id -> landscape.core_doc.doc_id
export interface Milestone {
  /** Default: nextval('tbl_milestone_milestone_id_seq'::regclass) */
  milestoneId: number;
  projectId: number;
  phaseId: number | null;
  milestoneName: string;
  milestoneType: string | null;
  targetDate: string | null;
  actualDate: string | null;
  /** Default: 'pending'::character varying */
  status: string | null;
  predecessorMilestoneId: number | null;
  notes: string | null;
  sourceDocId: number | null;
  confidenceScore: number | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
  createdBy: string | null;
}

// Insert type for landscape.tbl_milestone (excludes auto-generated fields)
export type MilestoneInsert = {
  projectId: number;
  phaseId?: number | null;
  milestoneName: string;
  milestoneType?: string | null;
  targetDate?: string | null;
  actualDate?: string | null;
  status?: string | null;
  predecessorMilestoneId?: number | null;
  notes?: string | null;
  sourceDocId?: number | null;
  confidenceScore?: number | null;
  createdBy?: string | null;
};

// landscape.tbl_model_override
// Primary Key: override_id
// Foreign Keys: division_id -> landscape.tbl_division.division_id, project_id -> landscape.tbl_project.project_id, toggled_by -> landscape.auth_user.id, unit_id -> landscape.tbl_multifamily_unit.unit_id
export interface ModelOverride {
  overrideId: number;
  projectId: number;
  divisionId: number | null;
  unitId: number | null;
  fieldKey: string;
  calculatedValue: string | null;
  overrideValue: string;
  /** Default: true */
  isActive: boolean;
  toggledBy: number | null;
  /** Default: now() */
  toggledAt: string | null;
}

// Insert type for landscape.tbl_model_override (excludes auto-generated fields)
export type ModelOverrideInsert = {
  overrideId: number;
  projectId: number;
  divisionId?: number | null;
  unitId?: number | null;
  fieldKey: string;
  calculatedValue?: string | null;
  overrideValue: string;
  isActive?: boolean;
  toggledBy?: number | null;
};

// landscape.tbl_msa
// Primary Key: msa_id
export interface Msa {
  /** Default: nextval('tbl_msa_msa_id_seq'::regclass) */
  msaId: number;
  msaName: string;
  msaCode: string | null;
  stateAbbreviation: string;
  primaryCity: string | null;
  /** Default: true */
  isActive: boolean | null;
  displayOrder: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_msa (excludes auto-generated fields)
export type MsaInsert = {
  msaName: string;
  msaCode?: string | null;
  stateAbbreviation: string;
  primaryCity?: string | null;
  isActive?: boolean | null;
  displayOrder?: number | null;
};

// landscape.tbl_multifamily_lease
// Primary Key: lease_id
// Foreign Keys: unit_id -> landscape.tbl_multifamily_unit.unit_id
export interface MultifamilyLease {
  /** Default: nextval('tbl_multifamily_lease_lease_id_seq'::regclass) */
  leaseId: number;
  unitId: number;
  residentName: string | null;
  leaseStartDate: string | null;
  leaseEndDate: string | null;
  leaseTermMonths: number | null;
  baseRentMonthly: number;
  effectiveRentMonthly: number | null;
  /** Default: 0 */
  monthsFreeRent: number | null;
  /** Default: 0 */
  concessionAmount: number | null;
  /** Default: 0 */
  securityDeposit: number | null;
  /** Default: 0 */
  petRentMonthly: number | null;
  /** Default: 0 */
  parkingRentMonthly: number | null;
  /** Default: 'ACTIVE'::character varying */
  leaseStatus: string | null;
  noticeDate: string | null;
  noticeToVacateDays: number | null;
  /** Default: false */
  isRenewal: boolean | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_multifamily_lease (excludes auto-generated fields)
export type MultifamilyLeaseInsert = {
  unitId: number;
  residentName?: string | null;
  leaseStartDate?: string | null;
  leaseEndDate?: string | null;
  leaseTermMonths?: number | null;
  baseRentMonthly: number;
  effectiveRentMonthly?: number | null;
  monthsFreeRent?: number | null;
  concessionAmount?: number | null;
  securityDeposit?: number | null;
  petRentMonthly?: number | null;
  parkingRentMonthly?: number | null;
  leaseStatus?: string | null;
  noticeDate?: string | null;
  noticeToVacateDays?: number | null;
  isRenewal?: boolean | null;
};

// landscape.tbl_multifamily_property
// Primary Key: multifamily_property_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface MultifamilyProperty {
  /** Default: nextval('tbl_multifamily_property_multifamily_property_id_seq'::regclass) */
  multifamilyPropertyId: number;
  projectId: number | null;
  parcelId: number | null;
  propertyName: string | null;
  propertyClass: string | null;
  propertySubtype: string | null;
  yearBuilt: number | null;
  yearRenovated: number | null;
  numberOfBuildings: number | null;
  numberOfFloors: number | null;
  totalUnits: number | null;
  rentableUnits: number | null;
  totalBuildingSf: number | null;
  avgUnitSf: number | null;
  parkingSpacesTotal: number | null;
  parkingRatio: number | null;
  parkingType: string | null;
  garageSpaces: number | null;
  coveredSpaces: number | null;
  tandemSpaces: number | null;
  surfaceSpaces: number | null;
  /** Default: false */
  hasManagerUnit: boolean | null;
  /** Default: 0 */
  managerUnitCount: number | null;
  managerRentCreditMonthly: number | null;
  /** Default: 0 */
  leasingOfficeCount: number | null;
  leasingOfficeSf: number | null;
  /** Default: false */
  hasCommercialSpace: boolean | null;
  commercialSf: number | null;
  /** Default: 0 */
  commercialUnitCount: number | null;
  commercialType: string | null;
  assessedValue: number | null;
  assessmentYear: number | null;
  propertyTaxRate: number | null;
  directAssessmentsAnnual: number | null;
  taxJurisdiction: string | null;
  utilityRecoveryMethod: string | null;
  rubsRecoveryPct: number | null;
  /** Default: false */
  gasMeteredIndividually: boolean | null;
  /** Default: false */
  electricMeteredIndividually: boolean | null;
  /** Default: false */
  waterMeteredIndividually: boolean | null;
  /** Default: false */
  hasSolarPanels: boolean | null;
  solarCapacityKw: number | null;
  /** Default: false */
  hasTanklessWaterHeaters: boolean | null;
  /** Default: false */
  hasEvCharging: boolean | null;
  evChargingSpaces: number | null;
  /** Default: false */
  energyStarCertified: boolean | null;
  /** Default: true */
  rentControlExempt: boolean | null;
  rentControlOrdinance: string | null;
  exemptionReason: string | null;
  /** Default: false */
  hasSection8Units: boolean | null;
  /** Default: 0 */
  section8UnitCount: number | null;
  affordableHousingProgram: string | null;
  propertyStatus: string | null;
  stabilizationDate: string | null;
  stabilizedOccupancyPct: number | null;
  acquisitionDate: string | null;
  acquisitionPrice: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_multifamily_property (excludes auto-generated fields)
export type MultifamilyPropertyInsert = {
  projectId?: number | null;
  parcelId?: number | null;
  propertyName?: string | null;
  propertyClass?: string | null;
  propertySubtype?: string | null;
  yearBuilt?: number | null;
  yearRenovated?: number | null;
  numberOfBuildings?: number | null;
  numberOfFloors?: number | null;
  totalUnits?: number | null;
  rentableUnits?: number | null;
  totalBuildingSf?: number | null;
  avgUnitSf?: number | null;
  parkingSpacesTotal?: number | null;
  parkingRatio?: number | null;
  parkingType?: string | null;
  garageSpaces?: number | null;
  coveredSpaces?: number | null;
  tandemSpaces?: number | null;
  surfaceSpaces?: number | null;
  hasManagerUnit?: boolean | null;
  managerUnitCount?: number | null;
  managerRentCreditMonthly?: number | null;
  leasingOfficeCount?: number | null;
  leasingOfficeSf?: number | null;
  hasCommercialSpace?: boolean | null;
  commercialSf?: number | null;
  commercialUnitCount?: number | null;
  commercialType?: string | null;
  assessedValue?: number | null;
  assessmentYear?: number | null;
  propertyTaxRate?: number | null;
  directAssessmentsAnnual?: number | null;
  taxJurisdiction?: string | null;
  utilityRecoveryMethod?: string | null;
  rubsRecoveryPct?: number | null;
  gasMeteredIndividually?: boolean | null;
  electricMeteredIndividually?: boolean | null;
  waterMeteredIndividually?: boolean | null;
  hasSolarPanels?: boolean | null;
  solarCapacityKw?: number | null;
  hasTanklessWaterHeaters?: boolean | null;
  hasEvCharging?: boolean | null;
  evChargingSpaces?: number | null;
  energyStarCertified?: boolean | null;
  rentControlExempt?: boolean | null;
  rentControlOrdinance?: string | null;
  exemptionReason?: string | null;
  hasSection8Units?: boolean | null;
  section8UnitCount?: number | null;
  affordableHousingProgram?: string | null;
  propertyStatus?: string | null;
  stabilizationDate?: string | null;
  stabilizedOccupancyPct?: number | null;
  acquisitionDate?: string | null;
  acquisitionPrice?: number | null;
};

// landscape.tbl_multifamily_turn
// Primary Key: turn_id
// Foreign Keys: unit_id -> landscape.tbl_multifamily_unit.unit_id
export interface MultifamilyTurn {
  /** Default: nextval('tbl_multifamily_turn_turn_id_seq'::regclass) */
  turnId: number;
  unitId: number;
  moveOutDate: string;
  makeReadyCompleteDate: string | null;
  nextMoveInDate: string | null;
  totalVacantDays: number | null;
  /** Default: 0 */
  cleaningCost: number | null;
  /** Default: 0 */
  paintingCost: number | null;
  /** Default: 0 */
  carpetFlooringCost: number | null;
  /** Default: 0 */
  applianceCost: number | null;
  /** Default: 0 */
  otherCost: number | null;
  totalMakeReadyCost: number | null;
  /** Default: 'VACANT'::character varying */
  turnStatus: string | null;
  notes: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_multifamily_turn (excludes auto-generated fields)
export type MultifamilyTurnInsert = {
  unitId: number;
  moveOutDate: string;
  makeReadyCompleteDate?: string | null;
  nextMoveInDate?: string | null;
  totalVacantDays?: number | null;
  cleaningCost?: number | null;
  paintingCost?: number | null;
  carpetFlooringCost?: number | null;
  applianceCost?: number | null;
  otherCost?: number | null;
  totalMakeReadyCost?: number | null;
  turnStatus?: string | null;
  notes?: string | null;
};

// landscape.tbl_multifamily_unit
// Primary Key: unit_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface MultifamilyUnit {
  /** Default: nextval('tbl_multifamily_unit_unit_id_seq'::regclass) */
  unitId: number;
  projectId: number;
  unitNumber: string;
  buildingName: string | null;
  unitType: string;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number;
  marketRent: number | null;
  /** Default: 'ORIGINAL'::character varying */
  renovationStatus: string | null;
  renovationDate: string | null;
  renovationCost: number | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
  otherFeatures: string | null;
  /** Default: false */
  isSection8: boolean | null;
  section8ContractDate: string | null;
  section8ContractRent: number | null;
  /** Default: false */
  hasBalcony: boolean | null;
  /** Default: false */
  hasPatio: boolean | null;
  balconySf: number | null;
  ceilingHeightFt: number | null;
  viewType: string | null;
  /** Default: false */
  isManager: boolean | null;
  currentRent: number | null;
  currentRentPsf: number | null;
  marketRentPsf: number | null;
  leaseStartDate: string | null;
  leaseEndDate: string | null;
  occupancyStatus: string | null;
  floorNumber: number | null;
  extraData: any | null;
  unitCategory: string | null;
  unitDesignation: string | null;
  valueSource: string | null;
  tenantName: string | null;
  parkingRent: number | null;
  petRent: number | null;
  pastDueAmount: number | null;
  depositAmount: number | null;
}

// Insert type for landscape.tbl_multifamily_unit (excludes auto-generated fields)
export type MultifamilyUnitInsert = {
  projectId: number;
  unitNumber: string;
  buildingName?: string | null;
  unitType: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareFeet: number;
  marketRent?: number | null;
  renovationStatus?: string | null;
  renovationDate?: string | null;
  renovationCost?: number | null;
  otherFeatures?: string | null;
  isSection8?: boolean | null;
  section8ContractDate?: string | null;
  section8ContractRent?: number | null;
  hasBalcony?: boolean | null;
  hasPatio?: boolean | null;
  balconySf?: number | null;
  ceilingHeightFt?: number | null;
  viewType?: string | null;
  isManager?: boolean | null;
  currentRent?: number | null;
  currentRentPsf?: number | null;
  marketRentPsf?: number | null;
  leaseStartDate?: string | null;
  leaseEndDate?: string | null;
  occupancyStatus?: string | null;
  floorNumber?: number | null;
  extraData?: any | null;
  unitCategory?: string | null;
  unitDesignation?: string | null;
  valueSource?: string | null;
  tenantName?: string | null;
  parkingRent?: number | null;
  petRent?: number | null;
  pastDueAmount?: number | null;
  depositAmount?: number | null;
};

// landscape.tbl_multifamily_unit_type
// Primary Key: unit_type_id
// Foreign Keys: container_id -> landscape.tbl_division.division_id, project_id -> landscape.tbl_project.project_id
export interface MultifamilyUnitType {
  /** Default: nextval('tbl_multifamily_unit_type_unit_type_id_seq'::regclass) */
  unitTypeId: number;
  projectId: number;
  unitTypeCode: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  avgSquareFeet: number | null;
  currentMarketRent: number | null;
  totalUnits: number | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
  notes: string | null;
  otherFeatures: string | null;
  floorplanDocId: number | null;
  containerId: number | null;
  unitTypeName: string | null;
  unitCount: number | null;
  marketRent: number | null;
  currentRentAvg: number | null;
  concessionsAvg: number | null;
  valueSource: string | null;
}

// Insert type for landscape.tbl_multifamily_unit_type (excludes auto-generated fields)
export type MultifamilyUnitTypeInsert = {
  projectId: number;
  unitTypeCode?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  avgSquareFeet?: number | null;
  currentMarketRent?: number | null;
  totalUnits?: number | null;
  notes?: string | null;
  otherFeatures?: string | null;
  floorplanDocId?: number | null;
  containerId?: number | null;
  unitTypeName?: string | null;
  unitCount?: number | null;
  marketRent?: number | null;
  currentRentAvg?: number | null;
  concessionsAvg?: number | null;
  valueSource?: string | null;
};

// landscape.tbl_narrative_change
// Primary Key: id
// Foreign Keys: version_id -> landscape.tbl_narrative_version.id
export interface NarrativeChange {
  id: number;
  changeType: string;
  originalText: string | null;
  newText: string | null;
  positionStart: number;
  positionEnd: number;
  isAccepted: boolean;
  acceptedAt: string | null;
  createdAt: string;
  versionId: number;
}

// landscape.tbl_narrative_comment
// Primary Key: id
// Foreign Keys: version_id -> landscape.tbl_narrative_version.id
export interface NarrativeComment {
  id: number;
  commentText: string;
  positionStart: number;
  positionEnd: number;
  isQuestion: boolean;
  isResolved: boolean;
  resolvedBy: number | null;
  resolvedAt: string | null;
  landscaperResponse: string | null;
  createdBy: number | null;
  createdAt: string;
  versionId: number;
}

// landscape.tbl_narrative_version
// Primary Key: id
export interface NarrativeVersion {
  id: number;
  projectId: number;
  approachType: string;
  versionNumber: number;
  content: any;
  contentHtml: string | null;
  contentPlain: string | null;
  status: string;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  dataSnapshot: any | null;
}

// landscape.tbl_operating_expenses
// Primary Key: opex_id
// Foreign Keys: category_id -> landscape.core_unit_cost_category.category_id, project_id -> landscape.tbl_project.project_id
export interface OperatingExpenses {
  /** Default: nextval('tbl_operating_expenses_opex_id_seq'::regclass) */
  opexId: number;
  projectId: number;
  expenseCategory: string;
  expenseType: string;
  annualAmount: number;
  amountPerSf: number | null;
  /** Default: true */
  isRecoverable: boolean | null;
  /** Default: 1.0 */
  recoveryRate: number | null;
  /** Default: 'FIXED_PERCENT'::character varying */
  escalationType: string | null;
  /** Default: 0.03 */
  escalationRate: number | null;
  startPeriod: number;
  /** Default: 'MONTHLY'::character varying */
  paymentFrequency: string | null;
  notes: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  accountId: number | null;
  /** Default: 'FIXED_AMOUNT'::character varying */
  calculationBasis: string | null;
  unitAmount: number | null;
  /** Default: false */
  isAutoCalculated: boolean | null;
  categoryId: number | null;
  /** Default: 'default'::character varying */
  statementDiscriminator: string | null;
  /** Default: 'unclassified'::character varying */
  parentCategory: string | null;
  /** Default: 'user'::character varying */
  source: string | null;
  valueSource: string | null;
}

// Insert type for landscape.tbl_operating_expenses (excludes auto-generated fields)
export type OperatingExpensesInsert = {
  projectId: number;
  expenseCategory: string;
  expenseType: string;
  annualAmount: number;
  amountPerSf?: number | null;
  isRecoverable?: boolean | null;
  recoveryRate?: number | null;
  escalationType?: string | null;
  escalationRate?: number | null;
  startPeriod: number;
  paymentFrequency?: string | null;
  notes?: string | null;
  accountId?: number | null;
  calculationBasis?: string | null;
  unitAmount?: number | null;
  isAutoCalculated?: boolean | null;
  categoryId?: number | null;
  statementDiscriminator?: string | null;
  parentCategory?: string | null;
  source?: string | null;
  valueSource?: string | null;
};

// landscape.tbl_operations_user_inputs
// Primary Key: input_id
// Foreign Keys: category_id -> landscape.core_unit_cost_category.category_id, project_id -> landscape.tbl_project.project_id
export interface OperationsUserInputs {
  /** Default: nextval('tbl_operations_user_inputs_input_id_seq'::regclass) */
  inputId: number;
  projectId: number;
  section: string;
  lineItemKey: string;
  categoryId: number | null;
  label: string | null;
  parentKey: string | null;
  /** Default: 0 */
  sortOrder: number | null;
  asIsValue: number | null;
  asIsCount: number | null;
  asIsRate: number | null;
  asIsPerSf: number | null;
  asIsGrowthRate: number | null;
  /** Default: 'global'::character varying */
  asIsGrowthType: string | null;
  postRenoValue: number | null;
  postRenoCount: number | null;
  postRenoRate: number | null;
  postRenoPerSf: number | null;
  postRenoGrowthRate: number | null;
  /** Default: false */
  isPercentage: boolean | null;
  /** Default: false */
  isCalculated: boolean | null;
  calculationBase: string | null;
  notes: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_operations_user_inputs (excludes auto-generated fields)
export type OperationsUserInputsInsert = {
  projectId: number;
  section: string;
  lineItemKey: string;
  categoryId?: number | null;
  label?: string | null;
  parentKey?: string | null;
  sortOrder?: number | null;
  asIsValue?: number | null;
  asIsCount?: number | null;
  asIsRate?: number | null;
  asIsPerSf?: number | null;
  asIsGrowthRate?: number | null;
  asIsGrowthType?: string | null;
  postRenoValue?: number | null;
  postRenoCount?: number | null;
  postRenoRate?: number | null;
  postRenoPerSf?: number | null;
  postRenoGrowthRate?: number | null;
  isPercentage?: boolean | null;
  isCalculated?: boolean | null;
  calculationBase?: string | null;
  notes?: string | null;
};

// landscape.tbl_operator
// Primary Key: operator_id
// Foreign Keys: parent_operator_id -> landscape.tbl_operator.operator_id
export interface Operator {
  /** Default: nextval('tbl_operator_operator_id_seq'::regclass) */
  operatorId: number;
  legalName: string;
  dbaName: string | null;
  naicsCode: string | null;
  industrySegment: string | null;
  tenantIndustry: string | null;
  parentOperatorId: number | null;
  jurisdictionOfFormation: string | null;
  /** Default: false */
  isPublic: boolean | null;
  ticker: string | null;
  /** Default: 'pending'::character varying */
  identityResolutionStatus: string | null;
  /** Default: now() */
  firstSeenAt: string | null;
  /** Default: now() */
  lastSeenAt: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
}

// Insert type for landscape.tbl_operator (excludes auto-generated fields)
export type OperatorInsert = {
  legalName: string;
  dbaName?: string | null;
  naicsCode?: string | null;
  industrySegment?: string | null;
  tenantIndustry?: string | null;
  parentOperatorId?: number | null;
  jurisdictionOfFormation?: string | null;
  isPublic?: boolean | null;
  ticker?: string | null;
  identityResolutionStatus?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

// landscape.tbl_operator_alias
// Primary Key: alias_id
// Foreign Keys: operator_id -> landscape.tbl_operator.operator_id
export interface OperatorAlias {
  /** Default: nextval('tbl_operator_alias_alias_id_seq'::regclass) */
  aliasId: number;
  operatorId: number;
  aliasName: string;
  aliasType: string | null;
  confirmedBy: string | null;
  /** Default: now() */
  confirmedAt: string | null;
  /** Default: now() */
  createdAt: string | null;
}

// Insert type for landscape.tbl_operator_alias (excludes auto-generated fields)
export type OperatorAliasInsert = {
  operatorId: number;
  aliasName: string;
  aliasType?: string | null;
  confirmedBy?: string | null;
};

// landscape.tbl_operator_concept
// Primary Key: operator_concept_id
// Foreign Keys: concept_id -> landscape.tbl_concept.concept_id, operator_id -> landscape.tbl_operator.operator_id
export interface OperatorConcept {
  /** Default: nextval('tbl_operator_concept_operator_concept_id_seq'::regclass) */
  operatorConceptId: number;
  operatorId: number;
  conceptId: number;
  /** Default: false */
  isPrimary: boolean | null;
  firstObservedAt: string | null;
  lastObservedAt: string | null;
  /** Default: now() */
  createdAt: string | null;
}

// Insert type for landscape.tbl_operator_concept (excludes auto-generated fields)
export type OperatorConceptInsert = {
  operatorId: number;
  conceptId: number;
  isPrimary?: boolean | null;
  firstObservedAt?: string | null;
  lastObservedAt?: string | null;
};

// landscape.tbl_operator_principal
// Primary Key: principal_id
// Foreign Keys: operator_id -> landscape.tbl_operator.operator_id
export interface OperatorPrincipal {
  /** Default: nextval('tbl_operator_principal_principal_id_seq'::regclass) */
  principalId: number;
  operatorId: number;
  fullName: string;
  role: string | null;
  ownershipPct: number | null;
  professionalBackground: string | null;
  otherBusinessInterests: string | null;
  /** Default: true */
  isActive: boolean | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
}

// Insert type for landscape.tbl_operator_principal (excludes auto-generated fields)
export type OperatorPrincipalInsert = {
  operatorId: number;
  fullName: string;
  role?: string | null;
  ownershipPct?: number | null;
  professionalBackground?: string | null;
  otherBusinessInterests?: string | null;
  isActive?: boolean | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

// landscape.tbl_operator_principal_distribution
// Primary Key: distribution_id
// Foreign Keys: principal_id -> landscape.tbl_operator_principal.principal_id
export interface OperatorPrincipalDistribution {
  /** Default: nextval('tbl_operator_principal_distribution_distribution_id_seq'::regclass) */
  distributionId: number;
  principalId: number;
  fiscalYear: number;
  distributionAmount: number | null;
  distributionType: string | null;
  notes: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_operator_principal_distribution (excludes auto-generated fields)
export type OperatorPrincipalDistributionInsert = {
  principalId: number;
  fiscalYear: number;
  distributionAmount?: number | null;
  distributionType?: string | null;
  notes?: string | null;
};

// landscape.tbl_opex_timing
// Primary Key: timing_id
// Foreign Keys: opex_id -> landscape.tbl_operating_expenses.opex_id, project_id -> landscape.tbl_project.project_id
export interface OpexTiming {
  /** Default: nextval('tbl_opex_timing_timing_id_seq'::regclass) */
  timingId: number;
  projectId: number;
  opexId: number;
  periodId: number;
  /** Default: 0 */
  expenseAmount: number | null;
  /** Default: 0 */
  recoverableAmount: number | null;
  /** Default: 0 */
  recoveryCollected: number | null;
  /** Default: 0 */
  netExpense: number | null;
  /** Default: now() */
  calculationDate: string | null;
}

// Insert type for landscape.tbl_opex_timing (excludes auto-generated fields)
export type OpexTimingInsert = {
  projectId: number;
  opexId: number;
  periodId: number;
  expenseAmount?: number | null;
  recoverableAmount?: number | null;
  recoveryCollected?: number | null;
  netExpense?: number | null;
};

// landscape.tbl_parcel
// Primary Key: parcel_id
// Foreign Keys: area_id -> landscape.tbl_area.area_id, density_code -> landscape.density_classification.code, landuse_code -> landscape.tbl_landuse.landuse_code, lot_type_id -> landscape.tbl_lot_type.producttype_id, phase_id -> landscape.tbl_phase.phase_id
export interface Parcel {
  parcelId: number;
  areaId: number | null;
  phaseId: number | null;
  landuseCode: string | null;
  landuseType: string | null;
  acresGross: number | null;
  lotWidth: number | null;
  lotDepth: number | null;
  lotProduct: string | null;
  lotArea: number | null;
  unitsTotal: number | null;
  lotsFrontfeet: number | null;
  planningLoss: number | null;
  planEfficiency: number | null;
  saledate: string | null;
  saleprice: number | null;
  lotTypeId: number | null;
  projectId: number | null;
  familyName: string | null;
  densityCode: string | null;
  typeCode: string | null;
  productCode: string | null;
  siteCoveragePct: number | null;
  setbackFrontFt: number | null;
  setbackSideFt: number | null;
  setbackRearFt: number | null;
  subtypeId: number | null;
  parcelCode: string | null;
  parcelName: string | null;
  buildingName: string | null;
  buildingClass: string | null;
  yearBuilt: number | null;
  yearRenovated: number | null;
  rentableSf: number | null;
  commonAreaSf: number | null;
  loadFactorPct: number | null;
  parkingSpaces: number | null;
  parkingRatio: number | null;
  /** Default: false */
  isIncomeProperty: boolean | null;
  /** Default: '{}'::jsonb */
  propertyMetadata: any | null;
  description: string | null;
  salePhaseCode: string | null;
  customSaleDate: string | null;
  /** Default: false */
  hasSaleOverrides: boolean | null;
  salePeriod: number | null;
}

// landscape.tbl_parcel_acquisition_history
// Primary Key: acquisition_id
// Foreign Keys: acquired_by_operator_id -> landscape.tbl_operator.operator_id, acquired_via_lease_id -> landscape.tbl_lease.lease_id, acquired_via_master_lease_id -> landscape.tbl_master_lease.master_lease_id, parcel_id -> landscape.tbl_parcel.parcel_id
export interface ParcelAcquisitionHistory {
  /** Default: nextval('tbl_parcel_acquisition_history_acquisition_id_seq'::regclass) */
  acquisitionId: number;
  parcelId: number;
  acquisitionDate: string | null;
  acquiredByOperatorId: number | null;
  acquiredByName: string | null;
  purchasePrice: number | null;
  goingInCapRate: number | null;
  effectiveCapRate: number | null;
  sellerName: string | null;
  sourceDocId: number | null;
  /** Default: true */
  isCurrentOwner: boolean | null;
  acquiredViaMasterLeaseId: number | null;
  acquiredViaLeaseId: number | null;
  /** Default: false */
  snapshotOnly: boolean | null;
  notes: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
}

// Insert type for landscape.tbl_parcel_acquisition_history (excludes auto-generated fields)
export type ParcelAcquisitionHistoryInsert = {
  parcelId: number;
  acquisitionDate?: string | null;
  acquiredByOperatorId?: number | null;
  acquiredByName?: string | null;
  purchasePrice?: number | null;
  goingInCapRate?: number | null;
  effectiveCapRate?: number | null;
  sellerName?: string | null;
  sourceDocId?: number | null;
  isCurrentOwner?: boolean | null;
  acquiredViaMasterLeaseId?: number | null;
  acquiredViaLeaseId?: number | null;
  snapshotOnly?: boolean | null;
  notes?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

// landscape.tbl_parcel_sale_assumptions
// Primary Key: assumption_id
// Foreign Keys: parcel_id -> landscape.tbl_parcel.parcel_id
export interface ParcelSaleAssumptions {
  /** Default: nextval('tbl_parcel_sale_assumptions_assumption_id_seq'::regclass) */
  assumptionId: number;
  parcelId: number;
  saleDate: string;
  basePricePerUnit: number | null;
  priceUom: string | null;
  inflationRate: number | null;
  inflatedPricePerUnit: number | null;
  grossParcelPrice: number | null;
  improvementOffsetPerUom: number | null;
  improvementOffsetTotal: number | null;
  improvementOffsetSource: string | null;
  /** Default: false */
  improvementOffsetOverride: boolean | null;
  grossSaleProceeds: number | null;
  legalPct: number | null;
  legalAmount: number | null;
  /** Default: false */
  legalOverride: boolean | null;
  commissionPct: number | null;
  commissionAmount: number | null;
  /** Default: false */
  commissionOverride: boolean | null;
  closingCostPct: number | null;
  closingCostAmount: number | null;
  /** Default: false */
  closingCostOverride: boolean | null;
  titleInsurancePct: number | null;
  titleInsuranceAmount: number | null;
  /** Default: false */
  titleInsuranceOverride: boolean | null;
  /** Default: '[]'::jsonb */
  customTransactionCosts: any | null;
  totalTransactionCosts: number | null;
  netSaleProceeds: number | null;
  netProceedsPerUom: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_parcel_sale_assumptions (excludes auto-generated fields)
export type ParcelSaleAssumptionsInsert = {
  parcelId: number;
  saleDate: string;
  basePricePerUnit?: number | null;
  priceUom?: string | null;
  inflationRate?: number | null;
  inflatedPricePerUnit?: number | null;
  grossParcelPrice?: number | null;
  improvementOffsetPerUom?: number | null;
  improvementOffsetTotal?: number | null;
  improvementOffsetSource?: string | null;
  improvementOffsetOverride?: boolean | null;
  grossSaleProceeds?: number | null;
  legalPct?: number | null;
  legalAmount?: number | null;
  legalOverride?: boolean | null;
  commissionPct?: number | null;
  commissionAmount?: number | null;
  commissionOverride?: boolean | null;
  closingCostPct?: number | null;
  closingCostAmount?: number | null;
  closingCostOverride?: boolean | null;
  titleInsurancePct?: number | null;
  titleInsuranceAmount?: number | null;
  titleInsuranceOverride?: boolean | null;
  customTransactionCosts?: any | null;
  totalTransactionCosts?: number | null;
  netSaleProceeds?: number | null;
  netProceedsPerUom?: number | null;
};

// landscape.tbl_parcel_sale_event
// Primary Key: sale_event_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface ParcelSaleEvent {
  /** Default: nextval('tbl_parcel_sale_event_sale_event_id_seq'::regclass) */
  saleEventId: number;
  projectId: number;
  parcelId: number;
  phaseId: number | null;
  saleType: string;
  buyerEntity: string | null;
  buyerContactId: number | null;
  contractDate: string | null;
  totalLotsContracted: number;
  basePricePerLot: number | null;
  priceEscalationFormula: string | null;
  depositAmount: number | null;
  depositDate: string | null;
  depositTerms: string | null;
  /** Default: true */
  depositAppliedToPurchase: boolean | null;
  /** Default: false */
  hasEscrowHoldback: boolean | null;
  escrowHoldbackAmount: number | null;
  escrowReleaseTerms: string | null;
  commissionPct: number | null;
  closingCostPerUnit: number | null;
  onsiteCostPct: number | null;
  /** Default: false */
  hasCustomOverrides: boolean | null;
  /** Default: 'pending'::character varying */
  saleStatus: string | null;
  notes: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_parcel_sale_event (excludes auto-generated fields)
export type ParcelSaleEventInsert = {
  projectId: number;
  parcelId: number;
  phaseId?: number | null;
  saleType: string;
  buyerEntity?: string | null;
  buyerContactId?: number | null;
  contractDate?: string | null;
  totalLotsContracted: number;
  basePricePerLot?: number | null;
  priceEscalationFormula?: string | null;
  depositAmount?: number | null;
  depositDate?: string | null;
  depositTerms?: string | null;
  depositAppliedToPurchase?: boolean | null;
  hasEscrowHoldback?: boolean | null;
  escrowHoldbackAmount?: number | null;
  escrowReleaseTerms?: string | null;
  commissionPct?: number | null;
  closingCostPerUnit?: number | null;
  onsiteCostPct?: number | null;
  hasCustomOverrides?: boolean | null;
  saleStatus?: string | null;
  notes?: string | null;
};

// landscape.tbl_participation_payment
// Primary Key: payment_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id, settlement_id -> landscape.tbl_sale_settlement.settlement_id
export interface ParticipationPayment {
  /** Default: nextval('tbl_participation_payment_payment_id_seq'::regclass) */
  paymentId: number;
  settlementId: number;
  projectId: number;
  paymentDate: string;
  paymentPeriod: number | null;
  homesClosedCount: number | null;
  grossHomeSales: number | null;
  participationBase: number | null;
  participationAmount: number;
  /** Default: 0 */
  lessBaseAllocation: number | null;
  netParticipationPayment: number;
  cumulativeHomesClosed: number | null;
  cumulativeParticipationPaid: number | null;
  /** Default: 'calculated'::character varying */
  paymentStatus: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_participation_payment (excludes auto-generated fields)
export type ParticipationPaymentInsert = {
  settlementId: number;
  projectId: number;
  paymentDate: string;
  paymentPeriod?: number | null;
  homesClosedCount?: number | null;
  grossHomeSales?: number | null;
  participationBase?: number | null;
  participationAmount: number;
  lessBaseAllocation?: number | null;
  netParticipationPayment: number;
  cumulativeHomesClosed?: number | null;
  cumulativeParticipationPaid?: number | null;
  paymentStatus?: string | null;
};

// landscape.tbl_percentage_rent_archive_20260506
export interface PercentageRentArchive20260506 {
  percentageRentId: number | null;
  leaseId: number | null;
  breakpointAmount: number | null;
  percentageRate: number | null;
  reportingFrequency: string | null;
  reportingDeadlineDays: number | null;
  priorYearSales: number | null;
  currentYearSalesProjection: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// landscape.tbl_phase
// Primary Key: phase_id
// Foreign Keys: area_id -> landscape.tbl_area.area_id
export interface Phase {
  phaseId: number;
  areaId: number;
  phaseName: string;
  phaseNo: number | null;
  projectId: number | null;
  label: string | null;
  description: string | null;
  /** Default: 'Planning'::character varying */
  phaseStatus: string | null;
  phaseStartDate: string | null;
  phaseCompletionDate: string | null;
  absorptionStartDate: string | null;
}

// landscape.tbl_platform_knowledge
// Primary Key: id
// Foreign Keys: source_id -> landscape.tbl_knowledge_source.id
export interface PlatformKnowledge {
  /** Default: nextval('tbl_platform_knowledge_id_seq'::regclass) */
  id: number;
  documentKey: string;
  title: string;
  subtitle: string | null;
  edition: string | null;
  publisher: string | null;
  publicationYear: number | null;
  isbn: string | null;
  knowledgeDomain: string;
  /** Default: '[]'::jsonb */
  propertyTypes: any | null;
  description: string | null;
  totalChapters: number | null;
  totalPages: number | null;
  filePath: string | null;
  fileHash: string | null;
  fileSizeBytes: number | null;
  /** Default: 'pending'::character varying */
  ingestionStatus: string | null;
  /** Default: 0 */
  chunkCount: number | null;
  lastIndexedAt: string | null;
  /** Default: true */
  isActive: boolean | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  /** Default: 'system'::character varying */
  createdBy: string | null;
  pageCount: number | null;
  metadata: any;
  sourceId: number | null;
}

// Insert type for landscape.tbl_platform_knowledge (excludes auto-generated fields)
export type PlatformKnowledgeInsert = {
  documentKey: string;
  title: string;
  subtitle?: string | null;
  edition?: string | null;
  publisher?: string | null;
  publicationYear?: number | null;
  isbn?: string | null;
  knowledgeDomain: string;
  propertyTypes?: any | null;
  description?: string | null;
  totalChapters?: number | null;
  totalPages?: number | null;
  filePath?: string | null;
  fileHash?: string | null;
  fileSizeBytes?: number | null;
  ingestionStatus?: string | null;
  chunkCount?: number | null;
  lastIndexedAt?: string | null;
  isActive?: boolean | null;
  createdBy?: string | null;
  pageCount?: number | null;
  metadata: any;
  sourceId?: number | null;
};

// landscape.tbl_platform_knowledge_chapters
// Primary Key: id
// Foreign Keys: document_id -> landscape.tbl_platform_knowledge.id
export interface PlatformKnowledgeChapters {
  /** Default: nextval('tbl_platform_knowledge_chapters_id_seq'::regclass) */
  id: number;
  documentId: number;
  chapterNumber: number | null;
  chapterTitle: string;
  pageStart: number | null;
  pageEnd: number | null;
  /** Default: '[]'::jsonb */
  topics: any | null;
  /** Default: '[]'::jsonb */
  propertyTypes: any | null;
  /** Default: '[]'::jsonb */
  appliesTo: any | null;
  summary: string | null;
  /** Default: '{}'::jsonb */
  keyConcepts: any | null;
  /** Default: '[]'::jsonb */
  chunkIds: any | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_platform_knowledge_chapters (excludes auto-generated fields)
export type PlatformKnowledgeChaptersInsert = {
  documentId: number;
  chapterNumber?: number | null;
  chapterTitle: string;
  pageStart?: number | null;
  pageEnd?: number | null;
  topics?: any | null;
  propertyTypes?: any | null;
  appliesTo?: any | null;
  summary?: string | null;
  keyConcepts?: any | null;
  chunkIds?: any | null;
};

// landscape.tbl_platform_knowledge_chunks
// Primary Key: id
// Foreign Keys: chapter_id -> landscape.tbl_platform_knowledge_chapters.id, document_id -> landscape.tbl_platform_knowledge.id
export interface PlatformKnowledgeChunks {
  /** Default: nextval('tbl_platform_knowledge_chunks_id_seq'::regclass) */
  id: number;
  documentId: number;
  chapterId: number | null;
  chunkIndex: number;
  content: string;
  /** Default: 'text'::character varying */
  contentType: string | null;
  pageNumber: number | null;
  sectionPath: string | null;
  embedding: string /* vector enum */ | null;
  /** Default: 'text-embedding-3-small'::character varying */
  embeddingModel: string | null;
  tokenCount: number | null;
  /** Default: now() */
  createdAt: string | null;
  category: string;
  metadata: any;
}

// Insert type for landscape.tbl_platform_knowledge_chunks (excludes auto-generated fields)
export type PlatformKnowledgeChunksInsert = {
  documentId: number;
  chapterId?: number | null;
  chunkIndex: number;
  content: string;
  contentType?: string | null;
  pageNumber?: number | null;
  sectionPath?: string | null;
  embedding?: string /* vector enum */ | null;
  embeddingModel?: string | null;
  tokenCount?: number | null;
  category: string;
  metadata: any;
};

// landscape.tbl_principal_financial_statement
// Primary Key: pfs_id
// Foreign Keys: principal_id -> landscape.tbl_operator_principal.principal_id
export interface PrincipalFinancialStatement {
  /** Default: nextval('tbl_principal_financial_statement_pfs_id_seq'::regclass) */
  pfsId: number;
  principalId: number;
  asOfDate: string;
  /** Default: 'unaudited'::character varying */
  statementType: string | null;
  realEstateValue: number | null;
  realEstateStatus: string | null;
  businessInterestsValue: number | null;
  businessInterestsStatus: string | null;
  cashAndEquivalentsValue: number | null;
  cashAndEquivalentsStatus: string | null;
  marketableSecuritiesValue: number | null;
  marketableSecuritiesStatus: string | null;
  retirementAccountsValue: number | null;
  retirementAccountsStatus: string | null;
  artAndCollectiblesValue: number | null;
  artAndCollectiblesStatus: string | null;
  otherAssetsValue: number | null;
  otherAssetsStatus: string | null;
  mortgageDebt: number | null;
  businessDebt: number | null;
  otherDebt: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  netWorth: number | null;
  notes: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_principal_financial_statement (excludes auto-generated fields)
export type PrincipalFinancialStatementInsert = {
  principalId: number;
  asOfDate: string;
  statementType?: string | null;
  realEstateValue?: number | null;
  realEstateStatus?: string | null;
  businessInterestsValue?: number | null;
  businessInterestsStatus?: string | null;
  cashAndEquivalentsValue?: number | null;
  cashAndEquivalentsStatus?: string | null;
  marketableSecuritiesValue?: number | null;
  marketableSecuritiesStatus?: string | null;
  retirementAccountsValue?: number | null;
  retirementAccountsStatus?: string | null;
  artAndCollectiblesValue?: number | null;
  artAndCollectiblesStatus?: string | null;
  otherAssetsValue?: number | null;
  otherAssetsStatus?: string | null;
  mortgageDebt?: number | null;
  businessDebt?: number | null;
  otherDebt?: number | null;
  totalAssets?: number | null;
  totalLiabilities?: number | null;
  netWorth?: number | null;
  notes?: string | null;
};

// landscape.tbl_project
// Primary Key: project_id
// Foreign Keys: cabinet_id -> landscape.tbl_cabinet.cabinet_id, created_by_id -> landscape.auth_user.id, dms_template_id -> landscape.dms_templates.template_id, msa_id -> landscape.tbl_msa.msa_id, template_id -> landscape.tbl_property_use_template.template_id
export interface Project {
  projectId: number;
  projectName: string;
  acresGross: number | null;
  locationLat: number | null;
  locationLon: number | null;
  startDate: string | null;
  jurisdictionCity: string | null;
  jurisdictionCounty: string | null;
  jurisdictionState: string | null;
  /** Default: true */
  usesGlobalTaxonomy: boolean | null;
  /** Default: false */
  taxonomyCustomized: boolean | null;
  /** Default: false */
  jurisdictionIntegrated: boolean | null;
  /** Default: '{}'::jsonb */
  gisMetadata: any | null;
  locationDescription: string | null;
  targetUnits: number | null;
  priceRangeLow: number | null;
  priceRangeHigh: number | null;
  aiLastReviewed: string | null;
  projectAddress: string | null;
  legalOwner: string | null;
  county: string | null;
  existingLandUse: string | null;
  assessedValue: number | null;
  /** Default: 'Land Development'::character varying */
  projectType: string | null;
  /** Default: 'Development'::character varying */
  financialModelType: string | null;
  analysisStartDate: string | null;
  analysisEndDate: string | null;
  /** Default: 'Monthly'::character varying */
  calculationFrequency: string | null;
  /** Default: 10.00 */
  discountRatePct: number | null;
  costOfCapitalPct: number | null;
  /** Default: 1 */
  schemaVersion: number | null;
  lastCalculatedAt: string | null;
  description: string | null;
  developerOwner: string | null;
  /** Default: true */
  isActive: boolean | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  templateId: number | null;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  /** Default: 'United States'::character varying */
  country: string | null;
  market: string | null;
  submarket: string | null;
  apnPrimary: string | null;
  apnSecondary: string | null;
  ownershipType: string | null;
  propertySubtype: string | null;
  propertyClass: string | null;
  lotSizeSf: number | null;
  lotSizeAcres: number | null;
  grossSf: number | null;
  totalUnits: number | null;
  yearBuilt: number | null;
  stories: number | null;
  askingPrice: number | null;
  pricePerUnit: number | null;
  pricePerSf: number | null;
  capRateCurrent: number | null;
  capRateProforma: number | null;
  currentGpr: number | null;
  currentOtherIncome: number | null;
  currentGpi: number | null;
  currentVacancyRate: number | null;
  currentEgi: number | null;
  currentOpex: number | null;
  currentNoi: number | null;
  proformaGpr: number | null;
  proformaOtherIncome: number | null;
  proformaGpi: number | null;
  proformaVacancyRate: number | null;
  proformaEgi: number | null;
  proformaOpex: number | null;
  proformaNoi: number | null;
  listingBrokerage: string | null;
  jobNumber: string | null;
  versionReference: string | null;
  analysisType: string | null;
  /** Default: 'LAND'::character varying */
  projectTypeCode: string | null;
  msaId: number | null;
  planningEfficiency: number | null;
  marketVelocityAnnual: number | null;
  velocityOverrideReason: string | null;
  /** Default: 'napkin'::character varying */
  analysisMode: string | null;
  dmsTemplateId: number | null;
  topography: string | null;
  floodZone: string | null;
  /** Default: '[]'::jsonb */
  overlayZones: any | null;
  /** Default: false */
  hasTakedownAgreement: boolean | null;
  currentZoning: string | null;
  proposedZoning: string | null;
  generalPlan: string | null;
  acquisitionPrice: number | null;
  acquisitionDate: string | null;
  walkScore: number | null;
  bikeScore: number | null;
  transitScore: number | null;
  /** Default: 'default'::character varying */
  activeOpexDiscriminator: string | null;
  /** Default: false */
  valueAddEnabled: boolean;
  primaryCount: number | null;
  primaryCountType: string | null;
  primaryArea: number | null;
  primaryAreaType: string | null;
  cabinetId: number | null;
  projectFocus: string | null;
  siteShape: string | null;
  siteUtilityRating: number | null;
  locationRating: number | null;
  accessRating: number | null;
  visibilityRating: number | null;
  buildingCount: number | null;
  netRentableArea: number | null;
  landToBuildingRatio: number | null;
  constructionClass: string | null;
  constructionType: string | null;
  conditionRating: number | null;
  qualityRating: number | null;
  parkingSpaces: number | null;
  parkingRatio: number | null;
  parkingType: string | null;
  effectiveAge: number | null;
  totalEconomicLife: number | null;
  remainingEconomicLife: number | null;
  /** Default: '{}'::jsonb */
  siteAttributes: any | null;
  /** Default: '{}'::jsonb */
  improvementAttributes: any | null;
  createdById: number;
  /** Default: 'STRICT'::character varying */
  collateralEnforcement: string | null;
  lotbankManagementFeePct: number | null;
  lotbankDefaultProvisionPct: number | null;
  lotbankUnderwritingFee: number | null;
  analysisPerspective: string | null;
  analysisPurpose: string | null;
  valueSource: string | null;
  createdBy: string | null;
  /** Default: 'auto'::character varying */
  artifactCascadeMode: string;
  /** Default: 'real_estate'::character varying */
  projectKind: string;
}

// Insert type for landscape.tbl_project (excludes auto-generated fields)
export type ProjectInsert = {
  projectId: number;
  projectName: string;
  acresGross?: number | null;
  locationLat?: number | null;
  locationLon?: number | null;
  startDate?: string | null;
  jurisdictionCity?: string | null;
  jurisdictionCounty?: string | null;
  jurisdictionState?: string | null;
  usesGlobalTaxonomy?: boolean | null;
  taxonomyCustomized?: boolean | null;
  jurisdictionIntegrated?: boolean | null;
  gisMetadata?: any | null;
  locationDescription?: string | null;
  targetUnits?: number | null;
  priceRangeLow?: number | null;
  priceRangeHigh?: number | null;
  aiLastReviewed?: string | null;
  projectAddress?: string | null;
  legalOwner?: string | null;
  county?: string | null;
  existingLandUse?: string | null;
  assessedValue?: number | null;
  projectType?: string | null;
  financialModelType?: string | null;
  analysisStartDate?: string | null;
  analysisEndDate?: string | null;
  calculationFrequency?: string | null;
  discountRatePct?: number | null;
  costOfCapitalPct?: number | null;
  schemaVersion?: number | null;
  lastCalculatedAt?: string | null;
  description?: string | null;
  developerOwner?: string | null;
  isActive?: boolean | null;
  templateId?: number | null;
  streetAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
  market?: string | null;
  submarket?: string | null;
  apnPrimary?: string | null;
  apnSecondary?: string | null;
  ownershipType?: string | null;
  propertySubtype?: string | null;
  propertyClass?: string | null;
  lotSizeSf?: number | null;
  lotSizeAcres?: number | null;
  grossSf?: number | null;
  totalUnits?: number | null;
  yearBuilt?: number | null;
  stories?: number | null;
  askingPrice?: number | null;
  pricePerUnit?: number | null;
  pricePerSf?: number | null;
  capRateCurrent?: number | null;
  capRateProforma?: number | null;
  currentGpr?: number | null;
  currentOtherIncome?: number | null;
  currentGpi?: number | null;
  currentVacancyRate?: number | null;
  currentEgi?: number | null;
  currentOpex?: number | null;
  currentNoi?: number | null;
  proformaGpr?: number | null;
  proformaOtherIncome?: number | null;
  proformaGpi?: number | null;
  proformaVacancyRate?: number | null;
  proformaEgi?: number | null;
  proformaOpex?: number | null;
  proformaNoi?: number | null;
  listingBrokerage?: string | null;
  jobNumber?: string | null;
  versionReference?: string | null;
  analysisType?: string | null;
  projectTypeCode?: string | null;
  msaId?: number | null;
  planningEfficiency?: number | null;
  marketVelocityAnnual?: number | null;
  velocityOverrideReason?: string | null;
  analysisMode?: string | null;
  dmsTemplateId?: number | null;
  topography?: string | null;
  floodZone?: string | null;
  overlayZones?: any | null;
  hasTakedownAgreement?: boolean | null;
  currentZoning?: string | null;
  proposedZoning?: string | null;
  generalPlan?: string | null;
  acquisitionPrice?: number | null;
  acquisitionDate?: string | null;
  walkScore?: number | null;
  bikeScore?: number | null;
  transitScore?: number | null;
  activeOpexDiscriminator?: string | null;
  valueAddEnabled?: boolean;
  primaryCount?: number | null;
  primaryCountType?: string | null;
  primaryArea?: number | null;
  primaryAreaType?: string | null;
  cabinetId?: number | null;
  projectFocus?: string | null;
  siteShape?: string | null;
  siteUtilityRating?: number | null;
  locationRating?: number | null;
  accessRating?: number | null;
  visibilityRating?: number | null;
  buildingCount?: number | null;
  netRentableArea?: number | null;
  landToBuildingRatio?: number | null;
  constructionClass?: string | null;
  constructionType?: string | null;
  conditionRating?: number | null;
  qualityRating?: number | null;
  parkingSpaces?: number | null;
  parkingRatio?: number | null;
  parkingType?: string | null;
  effectiveAge?: number | null;
  totalEconomicLife?: number | null;
  remainingEconomicLife?: number | null;
  siteAttributes?: any | null;
  improvementAttributes?: any | null;
  createdById: number;
  collateralEnforcement?: string | null;
  lotbankManagementFeePct?: number | null;
  lotbankDefaultProvisionPct?: number | null;
  lotbankUnderwritingFee?: number | null;
  analysisPerspective?: string | null;
  analysisPurpose?: string | null;
  valueSource?: string | null;
  createdBy?: string | null;
  artifactCascadeMode?: string;
  projectKind?: string;
};

// landscape.tbl_project_assumption
// Primary Key: assumption_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id, source_doc_id -> landscape.core_doc.doc_id
export interface ProjectAssumption {
  /** Default: nextval('tbl_project_assumption_assumption_id_seq'::regclass) */
  assumptionId: number;
  projectId: number;
  assumptionKey: string;
  assumptionValue: string | null;
  /** Default: 'user'::character varying */
  assumptionType: string | null;
  /** Default: 'project'::character varying */
  scope: string | null;
  scopeId: number | null;
  notes: string | null;
  sourceDocId: number | null;
  confidenceScore: number | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
  createdBy: string | null;
  valueSource: string | null;
}

// Insert type for landscape.tbl_project_assumption (excludes auto-generated fields)
export type ProjectAssumptionInsert = {
  projectId: number;
  assumptionKey: string;
  assumptionValue?: string | null;
  assumptionType?: string | null;
  scope?: string | null;
  scopeId?: number | null;
  notes?: string | null;
  sourceDocId?: number | null;
  confidenceScore?: number | null;
  createdBy?: string | null;
  valueSource?: string | null;
};

// landscape.tbl_project_config
// Primary Key: project_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface ProjectConfig {
  projectId: number;
  assetType: string;
  /** Default: 'Area'::character varying */
  tier_1Label: string;
  /** Default: 'Phase'::character varying */
  tier_2Label: string;
  /** Default: 'Parcel'::character varying */
  tier_3Label: string;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string;
  /** Default: 'Family'::character varying */
  landUseLevel1Label: string | null;
  /** Default: 'Families'::character varying */
  landUseLevel1LabelPlural: string | null;
  /** Default: 'Type'::character varying */
  landUseLevel2Label: string | null;
  /** Default: 'Types'::character varying */
  landUseLevel2LabelPlural: string | null;
  /** Default: 'Product'::character varying */
  landUseLevel3Label: string | null;
  /** Default: 'Products'::character varying */
  landUseLevel3LabelPlural: string | null;
  analysisType: string | null;
  /** Default: true */
  level1Enabled: boolean | null;
  /** Default: true */
  level2Enabled: boolean | null;
  /** Default: true */
  level3Enabled: boolean | null;
  /** Default: false */
  autoNumber: boolean | null;
  /** Default: 'Project'::character varying */
  tier_0Label: string | null;
}

// Insert type for landscape.tbl_project_config (excludes auto-generated fields)
export type ProjectConfigInsert = {
  projectId: number;
  assetType: string;
  tier_1Label?: string;
  tier_2Label?: string;
  tier_3Label?: string;
  landUseLevel1Label?: string | null;
  landUseLevel1LabelPlural?: string | null;
  landUseLevel2Label?: string | null;
  landUseLevel2LabelPlural?: string | null;
  landUseLevel3Label?: string | null;
  landUseLevel3LabelPlural?: string | null;
  analysisType?: string | null;
  level1Enabled?: boolean | null;
  level2Enabled?: boolean | null;
  level3Enabled?: boolean | null;
  autoNumber?: boolean | null;
  tier_0Label?: string | null;
};

// landscape.tbl_project_contact
// Primary Key: project_contact_id
// Foreign Keys: contact_id -> landscape.tbl_contact.contact_id, project_id -> landscape.tbl_project.project_id, role_id -> landscape.tbl_contact_role.role_id
export interface ProjectContact {
  /** Default: nextval('tbl_project_contact_project_contact_id_seq'::regclass) */
  projectContactId: number;
  projectId: number;
  contactId: number;
  roleId: number;
  /** Default: false */
  isPrimary: boolean | null;
  /** Default: false */
  isBillingContact: boolean | null;
  notes: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_project_contact (excludes auto-generated fields)
export type ProjectContactInsert = {
  projectId: number;
  contactId: number;
  roleId: number;
  isPrimary?: boolean | null;
  isBillingContact?: boolean | null;
  notes?: string | null;
};

// landscape.tbl_project_inventory_columns
// Primary Key: column_config_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface ProjectInventoryColumns {
  /** Default: nextval('tbl_project_inventory_columns_column_config_id_seq'::regclass) */
  columnConfigId: number;
  projectId: number;
  columnName: string;
  columnLabel: string;
  columnType: string;
  containerLevel: number | null;
  dataType: string | null;
  enumOptions: any | null;
  /** Default: false */
  isRequired: boolean | null;
  /** Default: true */
  isVisible: boolean | null;
  displayOrder: number;
  defaultValue: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
  dataSourceTable: string | null;
  dataSourceValueCol: string | null;
  dataSourceLabelCol: string | null;
  parentColumnName: string | null;
  junctionTable: string | null;
}

// Insert type for landscape.tbl_project_inventory_columns (excludes auto-generated fields)
export type ProjectInventoryColumnsInsert = {
  projectId: number;
  columnName: string;
  columnLabel: string;
  columnType: string;
  containerLevel?: number | null;
  dataType?: string | null;
  enumOptions?: any | null;
  isRequired?: boolean | null;
  isVisible?: boolean | null;
  displayOrder: number;
  defaultValue?: string | null;
  dataSourceTable?: string | null;
  dataSourceValueCol?: string | null;
  dataSourceLabelCol?: string | null;
  parentColumnName?: string | null;
  junctionTable?: string | null;
};

// landscape.tbl_project_metrics
// Primary Key: metrics_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface ProjectMetrics {
  metricsId: number;
  projectId: number;
  totalEquityInvested: number | null;
  totalDebtProceeds: number | null;
  totalProjectCost: number | null;
  projectIrrPct: number | null;
  equityIrrPct: number | null;
  leveredIrrPct: number | null;
  unleveredIrrPct: number | null;
  equityMultiple: number | null;
  stabilizedNoi: number | null;
  exitCapRatePct: number | null;
  exitValue: number | null;
  residualLandValuePerAcre: number | null;
  residualLandValuePerUnit: number | null;
  peakDebt: number | null;
  avgDscr: number | null;
  minDscr: number | null;
  developmentDurationMonths: number | null;
  absorptionDurationMonths: number | null;
  /** Default: now() */
  calculatedAt: string | null;
  /** Default: 1 */
  calculationVersion: number | null;
}

// Insert type for landscape.tbl_project_metrics (excludes auto-generated fields)
export type ProjectMetricsInsert = {
  metricsId: number;
  projectId: number;
  totalEquityInvested?: number | null;
  totalDebtProceeds?: number | null;
  totalProjectCost?: number | null;
  projectIrrPct?: number | null;
  equityIrrPct?: number | null;
  leveredIrrPct?: number | null;
  unleveredIrrPct?: number | null;
  equityMultiple?: number | null;
  stabilizedNoi?: number | null;
  exitCapRatePct?: number | null;
  exitValue?: number | null;
  residualLandValuePerAcre?: number | null;
  residualLandValuePerUnit?: number | null;
  peakDebt?: number | null;
  avgDscr?: number | null;
  minDscr?: number | null;
  developmentDurationMonths?: number | null;
  absorptionDurationMonths?: number | null;
  calculationVersion?: number | null;
};

// landscape.tbl_project_settings
// Primary Key: project_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface ProjectSettings {
  projectId: number;
  /** Default: 'USD'::character varying */
  defaultCurrency: string | null;
  /** Default: 'monthly'::character varying */
  defaultPeriodType: string | null;
  /** Default: 0.03 */
  globalInflationRate: number | null;
  analysisStartDate: string | null;
  analysisEndDate: string | null;
  /** Default: 0.10 */
  discountRate: number | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string;
  costInflationSetId: number | null;
  priceInflationSetId: number | null;
}

// Insert type for landscape.tbl_project_settings (excludes auto-generated fields)
export type ProjectSettingsInsert = {
  projectId: number;
  defaultCurrency?: string | null;
  defaultPeriodType?: string | null;
  globalInflationRate?: number | null;
  analysisStartDate?: string | null;
  analysisEndDate?: string | null;
  discountRate?: number | null;
  costInflationSetId?: number | null;
  priceInflationSetId?: number | null;
};

// landscape.tbl_property_acquisition
// Primary Key: acquisition_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface PropertyAcquisition {
  /** Default: nextval('tbl_property_acquisition_acquisition_id_seq'::regclass) */
  acquisitionId: number;
  projectId: number;
  purchasePrice: number | null;
  acquisitionDate: string | null;
  holdPeriodYears: number | null;
  exitCapRate: number | null;
  saleDate: string | null;
  /** Default: 0.015 */
  closingCostsPct: number | null;
  /** Default: 30 */
  dueDiligenceDays: number | null;
  earnestMoney: number | null;
  /** Default: 0.015 */
  saleCostsPct: number | null;
  /** Default: 0.025 */
  brokerCommissionPct: number | null;
  pricePerUnit: number | null;
  pricePerSf: number | null;
  legalFees: number | null;
  financingFees: number | null;
  thirdPartyReports: number | null;
  depreciationBasis: number | null;
  /** Default: 20.0 */
  landPct: number | null;
  /** Default: 80.0 */
  improvementPct: number | null;
  /** Default: false */
  is_1031Exchange: boolean | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  grm: number | null;
  /** Default: NULL::numeric */
  acquisitionFeePct: number | null;
}

// Insert type for landscape.tbl_property_acquisition (excludes auto-generated fields)
export type PropertyAcquisitionInsert = {
  projectId: number;
  purchasePrice?: number | null;
  acquisitionDate?: string | null;
  holdPeriodYears?: number | null;
  exitCapRate?: number | null;
  saleDate?: string | null;
  closingCostsPct?: number | null;
  dueDiligenceDays?: number | null;
  earnestMoney?: number | null;
  saleCostsPct?: number | null;
  brokerCommissionPct?: number | null;
  pricePerUnit?: number | null;
  pricePerSf?: number | null;
  legalFees?: number | null;
  financingFees?: number | null;
  thirdPartyReports?: number | null;
  depreciationBasis?: number | null;
  landPct?: number | null;
  improvementPct?: number | null;
  is_1031Exchange?: boolean | null;
  grm?: number | null;
  acquisitionFeePct?: number | null;
};

// landscape.tbl_property_apn
// Primary Key: property_apn_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface PropertyApn {
  /** Default: nextval('tbl_property_apn_property_apn_id_seq'::regclass) */
  propertyApnId: number;
  projectId: number;
  apn: string;
  /** Default: false */
  isPrimary: boolean | null;
  county: string | null;
  notes: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_property_apn (excludes auto-generated fields)
export type PropertyApnInsert = {
  projectId: number;
  apn: string;
  isPrimary?: boolean | null;
  county?: string | null;
  notes?: string | null;
};

// landscape.tbl_property_attribute_def
// Primary Key: attribute_id
export interface PropertyAttributeDef {
  /** Default: nextval('tbl_property_attribute_def_attribute_id_seq'::regclass) */
  attributeId: number;
  category: string;
  subcategory: string | null;
  attributeCode: string;
  attributeLabel: string;
  description: string | null;
  dataType: string;
  options: any | null;
  defaultValue: string | null;
  /** Default: false */
  isRequired: boolean | null;
  /** Default: 0 */
  sortOrder: number | null;
  /** Default: 'full'::character varying */
  displayWidth: string | null;
  helpText: string | null;
  propertyTypes: any | null;
  /** Default: false */
  isSystem: boolean | null;
  /** Default: true */
  isActive: boolean | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_property_attribute_def (excludes auto-generated fields)
export type PropertyAttributeDefInsert = {
  category: string;
  subcategory?: string | null;
  attributeCode: string;
  attributeLabel: string;
  description?: string | null;
  dataType: string;
  options?: any | null;
  defaultValue?: string | null;
  isRequired?: boolean | null;
  sortOrder?: number | null;
  displayWidth?: string | null;
  helpText?: string | null;
  propertyTypes?: any | null;
  isSystem?: boolean | null;
  isActive?: boolean | null;
};

// landscape.tbl_property_type_config
// Primary Key: config_id
export interface PropertyTypeConfig {
  /** Default: nextval('tbl_property_type_config_config_id_seq'::regclass) */
  configId: number;
  propertyType: string;
  tabLabel: string;
  description: string | null;
  defaultColumns: any;
  importSuggestions: any | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_property_type_config (excludes auto-generated fields)
export type PropertyTypeConfigInsert = {
  propertyType: string;
  tabLabel: string;
  description?: string | null;
  defaultColumns: any;
  importSuggestions?: any | null;
};

// landscape.tbl_property_use_template
// Primary Key: template_id
export interface PropertyUseTemplate {
  /** Default: nextval('tbl_property_use_template_template_id_seq'::regclass) */
  templateId: number;
  templateName: string;
  propertyType: string;
  templateCategory: string | null;
  description: string | null;
  /** Default: true */
  isActive: boolean | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_property_use_template (excludes auto-generated fields)
export type PropertyUseTemplateInsert = {
  templateName: string;
  propertyType: string;
  templateCategory?: string | null;
  description?: string | null;
  isActive?: boolean | null;
};

// landscape.tbl_recovery
// Primary Key: recovery_id
// Foreign Keys: lease_id -> landscape.tbl_lease.lease_id
export interface Recovery {
  recoveryId: number;
  leaseId: number;
  /** Default: 'Triple Net'::character varying */
  recoveryStructure: string | null;
  expenseCapPct: number | null;
  /** Default: '[]'::jsonb */
  categories: any;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_recovery (excludes auto-generated fields)
export type RecoveryInsert = {
  recoveryId: number;
  leaseId: number;
  recoveryStructure?: string | null;
  expenseCapPct?: number | null;
  categories?: any;
};

// landscape.tbl_renewal_option
// Primary Key: renewal_option_id
// Foreign Keys: lease_id -> landscape.tbl_lease.lease_id
export interface RenewalOption {
  /** Default: nextval('tbl_renewal_option_renewal_option_id_seq'::regclass) */
  renewalOptionId: number;
  leaseId: number;
  optionNumber: number;
  optionTermMonths: number;
  optionTermYears: number | null;
  noticePeriodMonths: number | null;
  earliestNoticeDate: string | null;
  latestNoticeDate: string | null;
  /** Default: false */
  noticeReceived: boolean | null;
  noticeReceivedDate: string | null;
  rentDeterminationMethod: string | null;
  fixedRentPsf: number | null;
  fixedRentAnnual: number | null;
  marketRentFloorPsf: number | null;
  marketRentCeilingPsf: number | null;
  cpiAdjustmentPct: number | null;
  formulaDescription: string | null;
  optionEscalationType: string | null;
  optionEscalationPct: number | null;
  optionEscalationFrequency: string | null;
  fmvDeterminationPeriodDays: number | null;
  /** Default: false */
  fmvArbitrationRequired: boolean | null;
  fmvAppraiserSelection: string | null;
  /** Default: false */
  optionExercised: boolean | null;
  exerciseDate: string | null;
  exercisedRentPsf: number | null;
  exercisedRentAnnual: number | null;
  exerciseConditions: string | null;
  /** Default: true */
  noDefaultRequired: boolean | null;
  notes: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_renewal_option (excludes auto-generated fields)
export type RenewalOptionInsert = {
  leaseId: number;
  optionNumber: number;
  optionTermMonths: number;
  optionTermYears?: number | null;
  noticePeriodMonths?: number | null;
  earliestNoticeDate?: string | null;
  latestNoticeDate?: string | null;
  noticeReceived?: boolean | null;
  noticeReceivedDate?: string | null;
  rentDeterminationMethod?: string | null;
  fixedRentPsf?: number | null;
  fixedRentAnnual?: number | null;
  marketRentFloorPsf?: number | null;
  marketRentCeilingPsf?: number | null;
  cpiAdjustmentPct?: number | null;
  formulaDescription?: string | null;
  optionEscalationType?: string | null;
  optionEscalationPct?: number | null;
  optionEscalationFrequency?: string | null;
  fmvDeterminationPeriodDays?: number | null;
  fmvArbitrationRequired?: boolean | null;
  fmvAppraiserSelection?: string | null;
  optionExercised?: boolean | null;
  exerciseDate?: string | null;
  exercisedRentPsf?: number | null;
  exercisedRentAnnual?: number | null;
  exerciseConditions?: string | null;
  noDefaultRequired?: boolean | null;
  notes?: string | null;
};

// landscape.tbl_rent_concession
// Primary Key: concession_id
// Foreign Keys: lease_id -> landscape.tbl_lease.lease_id
export interface RentConcession {
  /** Default: nextval('tbl_rent_concession_concession_id_seq'::regclass) */
  concessionId: number;
  leaseId: number;
  concessionType: string | null;
  concessionStartDate: string | null;
  concessionEndDate: string | null;
  concessionMonths: number | null;
  concessionAmountMonthly: number | null;
  concessionAmountTotal: number | null;
  concessionPsf: number | null;
  concessionPctOfRent: number | null;
  concessionTiming: string | null;
  /** Default: true */
  appliesToBaseRent: boolean | null;
  /** Default: false */
  appliesToCam: boolean | null;
  /** Default: false */
  appliesToTaxes: boolean | null;
  /** Default: false */
  burnOffUponDefault: boolean | null;
  /** Default: false */
  burnOffUponAssignment: boolean | null;
  remainingConcessionValue: number | null;
  amortizedOverMonths: number | null;
  amortizationStartDate: string | null;
  notes: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_rent_concession (excludes auto-generated fields)
export type RentConcessionInsert = {
  leaseId: number;
  concessionType?: string | null;
  concessionStartDate?: string | null;
  concessionEndDate?: string | null;
  concessionMonths?: number | null;
  concessionAmountMonthly?: number | null;
  concessionAmountTotal?: number | null;
  concessionPsf?: number | null;
  concessionPctOfRent?: number | null;
  concessionTiming?: string | null;
  appliesToBaseRent?: boolean | null;
  appliesToCam?: boolean | null;
  appliesToTaxes?: boolean | null;
  burnOffUponDefault?: boolean | null;
  burnOffUponAssignment?: boolean | null;
  remainingConcessionValue?: number | null;
  amortizedOverMonths?: number | null;
  amortizationStartDate?: string | null;
  notes?: string | null;
};

// landscape.tbl_rent_escalation_archive_20260506
export interface RentEscalationArchive20260506 {
  escalationId: number | null;
  leaseId: number | null;
  escalationType: string | null;
  escalationPct: number | null;
  escalationFrequency: string | null;
  compoundEscalation: boolean | null;
  cpiIndex: string | null;
  cpiFloorPct: number | null;
  cpiCapPct: number | null;
  annualIncreaseAmount: number | null;
  stepSchedule: string | null;
  firstEscalationDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// landscape.tbl_rent_roll
// Primary Key: rent_roll_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface RentRoll {
  /** Default: nextval('tbl_rent_roll_rent_roll_id_seq'::regclass) */
  rentRollId: number;
  projectId: number;
  tenantName: string;
  spaceType: string | null;
  leaseStartDate: string;
  leaseEndDate: string;
  leaseTermMonths: number;
  leasedSf: number;
  baseRentPsfAnnual: number;
  /** Default: 'NONE'::character varying */
  escalationType: string | null;
  escalationValue: number | null;
  /** Default: 12 */
  escalationFrequencyMonths: number | null;
  /** Default: 'GROSS'::character varying */
  recoveryStructure: string | null;
  /** Default: 1.0 */
  camRecoveryRate: number | null;
  /** Default: 1.0 */
  taxRecoveryRate: number | null;
  /** Default: 1.0 */
  insuranceRecoveryRate: number | null;
  /** Default: 0 */
  freeRentMonths: number | null;
  /** Default: 1 */
  freeRentStartMonth: number | null;
  /** Default: 0 */
  rentAbatementAmount: number | null;
  /** Default: false */
  hasPercentageRent: boolean | null;
  percentageRentRate: number | null;
  percentageRentBreakpoint: number | null;
  /** Default: 0 */
  tiAllowancePsf: number | null;
  /** Default: 0 */
  lcAllowancePsf: number | null;
  /** Default: 'ACTIVE'::character varying */
  leaseStatus: string | null;
  /** Default: false */
  isVacancy: boolean | null;
  notes: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_rent_roll (excludes auto-generated fields)
export type RentRollInsert = {
  projectId: number;
  tenantName: string;
  spaceType?: string | null;
  leaseStartDate: string;
  leaseEndDate: string;
  leaseTermMonths: number;
  leasedSf: number;
  baseRentPsfAnnual: number;
  escalationType?: string | null;
  escalationValue?: number | null;
  escalationFrequencyMonths?: number | null;
  recoveryStructure?: string | null;
  camRecoveryRate?: number | null;
  taxRecoveryRate?: number | null;
  insuranceRecoveryRate?: number | null;
  freeRentMonths?: number | null;
  freeRentStartMonth?: number | null;
  rentAbatementAmount?: number | null;
  hasPercentageRent?: boolean | null;
  percentageRentRate?: number | null;
  percentageRentBreakpoint?: number | null;
  tiAllowancePsf?: number | null;
  lcAllowancePsf?: number | null;
  leaseStatus?: string | null;
  isVacancy?: boolean | null;
  notes?: string | null;
};

// landscape.tbl_rent_roll_unit
// Primary Key: rent_roll_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface RentRollUnit {
  /** Default: nextval('tbl_rent_roll_unit_rent_roll_id_seq'::regclass) */
  rentRollId: number;
  projectId: number;
  unitId: number | null;
  unitNumber: string;
  unitType: string | null;
  squareFeet: number | null;
  currentRent: number | null;
  marketRent: number | null;
  leaseStartDate: string | null;
  leaseEndDate: string | null;
  tenantName: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_rent_roll_unit (excludes auto-generated fields)
export type RentRollUnitInsert = {
  projectId: number;
  unitId?: number | null;
  unitNumber: string;
  unitType?: string | null;
  squareFeet?: number | null;
  currentRent?: number | null;
  marketRent?: number | null;
  leaseStartDate?: string | null;
  leaseEndDate?: string | null;
  tenantName?: string | null;
};

// landscape.tbl_rent_schedule_archive_20260506
export interface RentScheduleArchive20260506 {
  baseRentId: number | null;
  leaseId: number | null;
  periodStartDate: string | null;
  periodEndDate: string | null;
  periodNumber: number | null;
  baseRentAnnual: number | null;
  baseRentMonthly: number | null;
  baseRentPsfAnnual: number | null;
  rentType: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// landscape.tbl_rent_step
// Primary Key: rent_step_id
// Foreign Keys: lease_id -> landscape.tbl_lease.lease_id
export interface RentStep {
  /** Default: nextval('tbl_rent_step_rent_step_id_seq'::regclass) */
  rentStepId: number;
  leaseId: number;
  stepNumber: number;
  stepEffectiveDate: string;
  stepEndDate: string | null;
  baseRentPsf: number | null;
  baseRentMonthly: number | null;
  baseRentAnnual: number | null;
  stepType: string | null;
  stepIncreasePct: number | null;
  stepIncreaseAmount: number | null;
  cumulativeIncreasePct: number | null;
  cpiIndex: string | null;
  cpiBaseValue: number | null;
  cpiCurrentValue: number | null;
  cpiFloorPct: number | null;
  cpiCapPct: number | null;
  rentPsfChange: number | null;
  rentAnnualChange: number | null;
  notes: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_rent_step (excludes auto-generated fields)
export type RentStepInsert = {
  leaseId: number;
  stepNumber: number;
  stepEffectiveDate: string;
  stepEndDate?: string | null;
  baseRentPsf?: number | null;
  baseRentMonthly?: number | null;
  baseRentAnnual?: number | null;
  stepType?: string | null;
  stepIncreasePct?: number | null;
  stepIncreaseAmount?: number | null;
  cumulativeIncreasePct?: number | null;
  cpiIndex?: string | null;
  cpiBaseValue?: number | null;
  cpiCurrentValue?: number | null;
  cpiFloorPct?: number | null;
  cpiCapPct?: number | null;
  rentPsfChange?: number | null;
  rentAnnualChange?: number | null;
  notes?: string | null;
};

// landscape.tbl_rental_comparable
// Primary Key: comparable_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface RentalComparable {
  /** Default: nextval('tbl_rental_comparable_comparable_id_seq'::regclass) */
  comparableId: number;
  projectId: number;
  propertyName: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceMiles: number | null;
  yearBuilt: number | null;
  totalUnits: number | null;
  unitType: string;
  bedrooms: number;
  bathrooms: number;
  avgSqft: number;
  askingRent: number;
  effectiveRent: number | null;
  concessions: string | null;
  amenities: string | null;
  notes: string | null;
  dataSource: string | null;
  asOfDate: string;
  /** Default: true */
  isActive: boolean | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_rental_comparable (excludes auto-generated fields)
export type RentalComparableInsert = {
  projectId: number;
  propertyName: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distanceMiles?: number | null;
  yearBuilt?: number | null;
  totalUnits?: number | null;
  unitType: string;
  bedrooms: number;
  bathrooms: number;
  avgSqft: number;
  askingRent: number;
  effectiveRent?: number | null;
  concessions?: string | null;
  amenities?: string | null;
  notes?: string | null;
  dataSource?: string | null;
  asOfDate: string;
  isActive?: boolean | null;
};

// landscape.tbl_report_definition
// Primary Key: id
export interface ReportDefinition {
  id: number;
  reportCode: string;
  reportName: string;
  reportCategory: string;
  description: string;
  sortOrder: number;
  isImplemented: boolean;
  isActive: boolean;
  outputFormats: any;
  defaultSections: any;
  createdAt: string;
  updatedAt: string;
  /** Default: 'essential'::character varying */
  reportTier: string;
  /** Default: ''::character varying */
  argusEquivalent: string;
  /** Default: ''::character varying */
  specFile: string;
  /** Default: 'not_ready'::character varying */
  dataReadiness: string;
  /** Default: ''::character varying */
  generatorClass: string;
  /** Default: '{}'::character varying[] */
  propertyTypes: any[] | null;
}

// landscape.tbl_report_history
// Primary Key: id
// Foreign Keys: report_definition_id -> landscape.tbl_report_definition.id
export interface ReportHistory {
  id: number;
  projectId: number;
  generatedAt: string;
  generatedBy: string;
  outputFormat: string;
  status: string;
  errorMessage: string;
  metadata: any;
  reportDefinitionId: number;
  /** Default: '{}'::jsonb */
  parameters: any;
  /** Default: ''::text */
  filePath: string;
  generationTimeMs: number | null;
}

// landscape.tbl_research_financial_data
// Primary Key: id
// Foreign Keys: publication_id -> landscape.tbl_research_publication.id
export interface ResearchFinancialData {
  /** Default: gen_random_uuid() */
  id: string;
  publicationId: string;
  dataCategory: string;
  metricName: string;
  metricValue: number | null;
  metricUnit: string | null;
  metricText: string | null;
  /** Default: 'all'::text */
  propertyType: string | null;
  /** Default: 'national'::text */
  geography: string | null;
  referenceDate: string | null;
  /** Default: 'unknown'::text */
  referencePeriod: string | null;
  context: string | null;
  confidenceScore: number | null;
  extractionMethod: string | null;
  pageNumber: number | null;
  /** Default: '{}'::jsonb */
  metadata: any | null;
  /** Default: now() */
  createdAt: string | null;
}

// Insert type for landscape.tbl_research_financial_data (excludes auto-generated fields)
export type ResearchFinancialDataInsert = {
  id?: string;
  publicationId: string;
  dataCategory: string;
  metricName: string;
  metricValue?: number | null;
  metricUnit?: string | null;
  metricText?: string | null;
  propertyType?: string | null;
  geography?: string | null;
  referenceDate?: string | null;
  referencePeriod?: string | null;
  context?: string | null;
  confidenceScore?: number | null;
  extractionMethod?: string | null;
  pageNumber?: number | null;
  metadata?: any | null;
};

// landscape.tbl_research_harvest_log
// Primary Key: id
export interface ResearchHarvestLog {
  /** Default: gen_random_uuid() */
  id: string;
  source: string;
  agentName: string;
  /** Default: now() */
  runStartedAt: string | null;
  runCompletedAt: string | null;
  /** Default: 'running'::text */
  status: string | null;
  /** Default: 0 */
  publicationsDiscovered: number | null;
  /** Default: 0 */
  publicationsNew: number | null;
  /** Default: 0 */
  publicationsUpdated: number | null;
  /** Default: 0 */
  pdfsDownloaded: number | null;
  /** Default: 0 */
  extractionsCompleted: number | null;
  errors: string | null;
  /** Default: now() */
  createdAt: string | null;
}

// Insert type for landscape.tbl_research_harvest_log (excludes auto-generated fields)
export type ResearchHarvestLogInsert = {
  id?: string;
  source: string;
  agentName: string;
  runCompletedAt?: string | null;
  status?: string | null;
  publicationsDiscovered?: number | null;
  publicationsNew?: number | null;
  publicationsUpdated?: number | null;
  pdfsDownloaded?: number | null;
  extractionsCompleted?: number | null;
  errors?: string | null;
};

// landscape.tbl_research_publication
// Primary Key: id
export interface ResearchPublication {
  /** Default: gen_random_uuid() */
  id: string;
  source: string;
  sourceId: string;
  publicationType: string | null;
  title: string;
  subtitle: string | null;
  authors: any[] | null;
  publisher: string | null;
  publishedDate: string | null;
  categories: any[] | null;
  tags: any[] | null;
  documentType: string | null;
  summary: string | null;
  sourceUrl: string | null;
  pdfUrl: string | null;
  localPdfPath: string | null;
  contentHash: string | null;
  /** Default: false */
  isGated: boolean | null;
  /** Default: 'pending'::text */
  extractionStatus: string | null;
  extractionError: string | null;
  /** Default: '{}'::jsonb */
  metadata: any | null;
  /** Default: now() */
  harvestedAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_research_publication (excludes auto-generated fields)
export type ResearchPublicationInsert = {
  id?: string;
  source: string;
  sourceId: string;
  publicationType?: string | null;
  title: string;
  subtitle?: string | null;
  authors?: any[] | null;
  publisher?: string | null;
  publishedDate?: string | null;
  categories?: any[] | null;
  tags?: any[] | null;
  documentType?: string | null;
  summary?: string | null;
  sourceUrl?: string | null;
  pdfUrl?: string | null;
  localPdfPath?: string | null;
  contentHash?: string | null;
  isGated?: boolean | null;
  extractionStatus?: string | null;
  extractionError?: string | null;
  metadata?: any | null;
};

// landscape.tbl_revenue_other
// Primary Key: other_income_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface RevenueOther {
  /** Default: nextval('tbl_revenue_other_other_income_id_seq'::regclass) */
  otherIncomeId: number;
  projectId: number;
  /** Default: 0 */
  otherIncomePerUnitMonthly: number | null;
  /** Default: 50 */
  parkingIncomePerSpace: number | null;
  parkingSpaces: number | null;
  /** Default: 35 */
  petFeePerPet: number | null;
  /** Default: 0.30 */
  petPenetrationPct: number | null;
  /** Default: 15 */
  laundryIncomePerUnit: number | null;
  /** Default: 10 */
  storageIncomePerUnit: number | null;
  /** Default: 0 */
  applicationFeesAnnual: number | null;
  lateFeesAnnual: number | null;
  utilityReimbursementsAnnual: number | null;
  furnishedUnitPremiumPct: number | null;
  shortTermRentalIncome: number | null;
  ancillaryServicesIncome: number | null;
  vendingIncome: number | null;
  packageLockerFees: number | null;
  reservedParkingPremium: number | null;
  evChargingFees: number | null;
  otherMiscellaneous: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  incomeCategory: string | null;
}

// Insert type for landscape.tbl_revenue_other (excludes auto-generated fields)
export type RevenueOtherInsert = {
  projectId: number;
  otherIncomePerUnitMonthly?: number | null;
  parkingIncomePerSpace?: number | null;
  parkingSpaces?: number | null;
  petFeePerPet?: number | null;
  petPenetrationPct?: number | null;
  laundryIncomePerUnit?: number | null;
  storageIncomePerUnit?: number | null;
  applicationFeesAnnual?: number | null;
  lateFeesAnnual?: number | null;
  utilityReimbursementsAnnual?: number | null;
  furnishedUnitPremiumPct?: number | null;
  shortTermRentalIncome?: number | null;
  ancillaryServicesIncome?: number | null;
  vendingIncome?: number | null;
  packageLockerFees?: number | null;
  reservedParkingPremium?: number | null;
  evChargingFees?: number | null;
  otherMiscellaneous?: number | null;
  incomeCategory?: string | null;
};

// landscape.tbl_revenue_rent
// Primary Key: rent_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface RevenueRent {
  /** Default: nextval('tbl_revenue_rent_rent_id_seq'::regclass) */
  rentId: number;
  projectId: number;
  currentRentPsf: number;
  /** Default: 0.95 */
  occupancyPct: number;
  /** Default: 0.03 */
  annualRentGrowthPct: number;
  inPlaceRentPsf: number | null;
  marketRentPsf: number | null;
  rentLossToLeasePct: number | null;
  /** Default: 12 */
  leaseUpMonths: number | null;
  /** Default: 0.96 */
  stabilizedOccupancyPct: number | null;
  /** Default: 0.04 */
  rentGrowthYears_1_3Pct: number | null;
  /** Default: 0.025 */
  rentGrowthStabilizedPct: number | null;
  /** Default: 0 */
  freeRentMonths: number | null;
  /** Default: 0 */
  tiAllowancePerUnit: number | null;
  /** Default: 0.60 */
  renewalProbabilityPct: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_revenue_rent (excludes auto-generated fields)
export type RevenueRentInsert = {
  projectId: number;
  currentRentPsf: number;
  occupancyPct?: number;
  annualRentGrowthPct?: number;
  inPlaceRentPsf?: number | null;
  marketRentPsf?: number | null;
  rentLossToLeasePct?: number | null;
  leaseUpMonths?: number | null;
  stabilizedOccupancyPct?: number | null;
  rentGrowthYears_1_3Pct?: number | null;
  rentGrowthStabilizedPct?: number | null;
  freeRentMonths?: number | null;
  tiAllowancePerUnit?: number | null;
  renewalProbabilityPct?: number | null;
};

// landscape.tbl_revenue_timing
// Primary Key: revenue_timing_id
// Foreign Keys: absorption_id -> landscape.tbl_absorption_schedule.absorption_id, period_id -> landscape.tbl_calculation_period.period_id
export interface RevenueTiming {
  /** Default: nextval('tbl_revenue_timing_revenue_timing_id_seq'::regclass) */
  revenueTimingId: number;
  absorptionId: number;
  periodId: number;
  /** Default: 0 */
  unitsSoldThisPeriod: number | null;
  /** Default: 0 */
  cumulativeUnitsSold: number | null;
  unitsRemaining: number | null;
  averagePriceThisPeriod: number | null;
  grossRevenue: number | null;
  /** Default: 0 */
  salesCommission: number | null;
  /** Default: 0 */
  closingCosts: number | null;
  netRevenue: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_revenue_timing (excludes auto-generated fields)
export type RevenueTimingInsert = {
  absorptionId: number;
  periodId: number;
  unitsSoldThisPeriod?: number | null;
  cumulativeUnitsSold?: number | null;
  unitsRemaining?: number | null;
  averagePriceThisPeriod?: number | null;
  grossRevenue?: number | null;
  salesCommission?: number | null;
  closingCosts?: number | null;
  netRevenue?: number | null;
};

// landscape.tbl_sale_benchmarks
// Primary Key: benchmark_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface SaleBenchmarks {
  /** Default: nextval('tbl_sale_benchmarks_benchmark_id_seq'::regclass) */
  benchmarkId: number;
  scopeLevel: string;
  projectId: number | null;
  luTypeCode: string | null;
  productCode: string | null;
  benchmarkType: string;
  benchmarkName: string | null;
  ratePct: number | null;
  amountPerUom: number | null;
  fixedAmount: number | null;
  uomCode: string | null;
  description: string | null;
  /** Default: true */
  isActive: boolean | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  basis: string | null;
}

// Insert type for landscape.tbl_sale_benchmarks (excludes auto-generated fields)
export type SaleBenchmarksInsert = {
  scopeLevel: string;
  projectId?: number | null;
  luTypeCode?: string | null;
  productCode?: string | null;
  benchmarkType: string;
  benchmarkName?: string | null;
  ratePct?: number | null;
  amountPerUom?: number | null;
  fixedAmount?: number | null;
  uomCode?: string | null;
  description?: string | null;
  isActive?: boolean | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  basis?: string | null;
};

// landscape.tbl_sale_phases
// Primary Key: phase_code
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface SalePhases {
  phaseCode: string;
  projectId: number;
  phaseName: string | null;
  defaultSaleDate: string;
  /** Default: 3.0 */
  defaultCommissionPct: number | null;
  /** Default: 750.00 */
  defaultClosingCostPerUnit: number | null;
  /** Default: 6.5 */
  defaultOnsiteCostPct: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_sale_phases (excludes auto-generated fields)
export type SalePhasesInsert = {
  phaseCode: string;
  projectId: number;
  phaseName?: string | null;
  defaultSaleDate: string;
  defaultCommissionPct?: number | null;
  defaultClosingCostPerUnit?: number | null;
  defaultOnsiteCostPct?: number | null;
};

// landscape.tbl_sale_settlement
// Primary Key: settlement_id
// Foreign Keys: container_id -> landscape.tbl_division.division_id, project_id -> landscape.tbl_project.project_id
export interface SaleSettlement {
  /** Default: nextval('tbl_sale_settlement_settlement_id_seq'::regclass) */
  settlementId: number;
  projectId: number;
  containerId: number | null;
  saleDate: string;
  buyerName: string | null;
  buyerEntity: string | null;
  listPrice: number | null;
  /** Default: 0 */
  allocatedCostToComplete: number | null;
  /** Default: 0 */
  otherAdjustments: number | null;
  netProceeds: number | null;
  settlementType: string | null;
  settlementNotes: string | null;
  costAllocationDetail: any | null;
  /** Default: false */
  hasParticipation: boolean | null;
  participationRate: number | null;
  participationBasis: string | null;
  participationMinimum: number | null;
  participationTargetPrice: number | null;
  /** Default: 'pending'::character varying */
  settlementStatus: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  parcelId: number | null;
  salePhaseCode: string | null;
  commissionPct: number | null;
  closingCostPerUnit: number | null;
  onsiteCostPct: number | null;
  grossValue: number | null;
}

// Insert type for landscape.tbl_sale_settlement (excludes auto-generated fields)
export type SaleSettlementInsert = {
  projectId: number;
  containerId?: number | null;
  saleDate: string;
  buyerName?: string | null;
  buyerEntity?: string | null;
  listPrice?: number | null;
  allocatedCostToComplete?: number | null;
  otherAdjustments?: number | null;
  netProceeds?: number | null;
  settlementType?: string | null;
  settlementNotes?: string | null;
  costAllocationDetail?: any | null;
  hasParticipation?: boolean | null;
  participationRate?: number | null;
  participationBasis?: string | null;
  participationMinimum?: number | null;
  participationTargetPrice?: number | null;
  settlementStatus?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  parcelId?: number | null;
  salePhaseCode?: string | null;
  commissionPct?: number | null;
  closingCostPerUnit?: number | null;
  onsiteCostPct?: number | null;
  grossValue?: number | null;
};

// landscape.tbl_sales_comp_adjustments
// Primary Key: adjustment_id
// Foreign Keys: comparable_id -> landscape.tbl_sales_comparables.comparable_id
export interface SalesCompAdjustments {
  /** Default: nextval('tbl_sales_comp_adjustments_adjustment_id_seq'::regclass) */
  adjustmentId: number;
  comparableId: number;
  adjustmentType: string;
  adjustmentPct: number | null;
  adjustmentAmount: number | null;
  justification: string | null;
  /** Default: now() */
  createdAt: string | null;
  userAdjustmentPct: number | null;
  /** Default: false */
  aiAccepted: boolean | null;
  userNotes: string | null;
  lastModifiedBy: string | null;
  landscaperAnalysis: string | null;
  userOverrideAnalysis: string | null;
  analysisInputs: any | null;
  confidenceScore: number | null;
  createdBy: string | null;
  approvedBy: number | null;
  approvedAt: string | null;
  subjectValue: string | null;
  compValue: string | null;
}

// Insert type for landscape.tbl_sales_comp_adjustments (excludes auto-generated fields)
export type SalesCompAdjustmentsInsert = {
  comparableId: number;
  adjustmentType: string;
  adjustmentPct?: number | null;
  adjustmentAmount?: number | null;
  justification?: string | null;
  userAdjustmentPct?: number | null;
  aiAccepted?: boolean | null;
  userNotes?: string | null;
  lastModifiedBy?: string | null;
  landscaperAnalysis?: string | null;
  userOverrideAnalysis?: string | null;
  analysisInputs?: any | null;
  confidenceScore?: number | null;
  createdBy?: string | null;
  approvedBy?: number | null;
  approvedAt?: string | null;
  subjectValue?: string | null;
  compValue?: string | null;
};

// landscape.tbl_sales_comp_contacts
// Primary Key: contact_id
// Foreign Keys: comparable_id -> landscape.tbl_sales_comparables.comparable_id
export interface SalesCompContacts {
  /** Default: nextval('tbl_sales_comp_contacts_contact_id_seq'::regclass) */
  contactId: number;
  comparableId: number;
  role: string;
  name: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  /** Default: false */
  isVerificationSource: boolean;
  verificationDate: string | null;
  /** Default: 0 */
  sortOrder: number;
  /** Default: now() */
  createdAt: string;
  /** Default: now() */
  updatedAt: string;
}

// Insert type for landscape.tbl_sales_comp_contacts (excludes auto-generated fields)
export type SalesCompContactsInsert = {
  comparableId: number;
  role: string;
  name?: string | null;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  isVerificationSource?: boolean;
  verificationDate?: string | null;
  sortOrder?: number;
};

// landscape.tbl_sales_comp_history
// Primary Key: history_id
// Foreign Keys: comparable_id -> landscape.tbl_sales_comparables.comparable_id
export interface SalesCompHistory {
  /** Default: nextval('tbl_sales_comp_history_history_id_seq'::regclass) */
  historyId: number;
  comparableId: number;
  saleDate: string;
  salePrice: number | null;
  pricePerSf: number | null;
  pricePerUnit: number | null;
  buyerName: string | null;
  sellerName: string | null;
  saleType: string | null;
  documentNumber: string | null;
  /** Default: true */
  isArmsLength: boolean | null;
  notes: string | null;
  /** Default: now() */
  createdAt: string | null;
}

// Insert type for landscape.tbl_sales_comp_history (excludes auto-generated fields)
export type SalesCompHistoryInsert = {
  comparableId: number;
  saleDate: string;
  salePrice?: number | null;
  pricePerSf?: number | null;
  pricePerUnit?: number | null;
  buyerName?: string | null;
  sellerName?: string | null;
  saleType?: string | null;
  documentNumber?: string | null;
  isArmsLength?: boolean | null;
  notes?: string | null;
};

// landscape.tbl_sales_comp_hospitality
// Primary Key: hospitality_id
// Foreign Keys: comparable_id -> landscape.tbl_sales_comparables.comparable_id
export interface SalesCompHospitality {
  /** Default: nextval('tbl_sales_comp_hospitality_hospitality_id_seq'::regclass) */
  hospitalityId: number;
  comparableId: number;
  totalRooms: number | null;
  availableRooms: number | null;
  suitesCount: number | null;
  occupancyRate: number | null;
  adr: number | null;
  revpar: number | null;
  totalRevenue: number | null;
  roomsRevenue: number | null;
  fbRevenue: number | null;
  otherRevenue: number | null;
  flagBrand: string | null;
  franchiseCompany: string | null;
  managementCompany: string | null;
  chainScale: string | null;
  meetingSpaceSf: number | null;
  restaurantCount: number | null;
  pool: boolean | null;
  fitnessCenter: boolean | null;
  spa: boolean | null;
  lastRenovationYear: number | null;
  lastPiaYear: number | null;
  franchiseExpiration: string | null;
  managementExpiration: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_sales_comp_hospitality (excludes auto-generated fields)
export type SalesCompHospitalityInsert = {
  comparableId: number;
  totalRooms?: number | null;
  availableRooms?: number | null;
  suitesCount?: number | null;
  occupancyRate?: number | null;
  adr?: number | null;
  revpar?: number | null;
  totalRevenue?: number | null;
  roomsRevenue?: number | null;
  fbRevenue?: number | null;
  otherRevenue?: number | null;
  flagBrand?: string | null;
  franchiseCompany?: string | null;
  managementCompany?: string | null;
  chainScale?: string | null;
  meetingSpaceSf?: number | null;
  restaurantCount?: number | null;
  pool?: boolean | null;
  fitnessCenter?: boolean | null;
  spa?: boolean | null;
  lastRenovationYear?: number | null;
  lastPiaYear?: number | null;
  franchiseExpiration?: string | null;
  managementExpiration?: string | null;
};

// landscape.tbl_sales_comp_industrial
// Primary Key: industrial_id
// Foreign Keys: comparable_id -> landscape.tbl_sales_comparables.comparable_id
export interface SalesCompIndustrial {
  /** Default: nextval('tbl_sales_comp_industrial_industrial_id_seq'::regclass) */
  industrialId: number;
  comparableId: number;
  clearHeightMin: number | null;
  clearHeightMax: number | null;
  columnSpacing: string | null;
  dockDoorsExterior: number | null;
  dockDoorsInterior: number | null;
  driveInDoors: number | null;
  railDoors: number | null;
  trailerParkingSpaces: number | null;
  autoParkingSpaces: number | null;
  yardAreaSf: number | null;
  fencedYard: boolean | null;
  /** Default: false */
  railAccess: boolean | null;
  /** Default: false */
  railServed: boolean | null;
  craneCapacityTons: number | null;
  craneCount: number | null;
  powerVoltage: number | null;
  powerAmps: number | null;
  powerPhase: number | null;
  officeSf: number | null;
  officePct: number | null;
  environmentalPhase1: boolean | null;
  environmentalPhase2: boolean | null;
  environmentalIssues: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_sales_comp_industrial (excludes auto-generated fields)
export type SalesCompIndustrialInsert = {
  comparableId: number;
  clearHeightMin?: number | null;
  clearHeightMax?: number | null;
  columnSpacing?: string | null;
  dockDoorsExterior?: number | null;
  dockDoorsInterior?: number | null;
  driveInDoors?: number | null;
  railDoors?: number | null;
  trailerParkingSpaces?: number | null;
  autoParkingSpaces?: number | null;
  yardAreaSf?: number | null;
  fencedYard?: boolean | null;
  railAccess?: boolean | null;
  railServed?: boolean | null;
  craneCapacityTons?: number | null;
  craneCount?: number | null;
  powerVoltage?: number | null;
  powerAmps?: number | null;
  powerPhase?: number | null;
  officeSf?: number | null;
  officePct?: number | null;
  environmentalPhase1?: boolean | null;
  environmentalPhase2?: boolean | null;
  environmentalIssues?: string | null;
};

// landscape.tbl_sales_comp_land
// Primary Key: land_id
// Foreign Keys: comparable_id -> landscape.tbl_sales_comparables.comparable_id
export interface SalesCompLand {
  /** Default: nextval('tbl_sales_comp_land_land_id_seq'::regclass) */
  landId: number;
  comparableId: number;
  currentZoning: string | null;
  proposedZoning: string | null;
  zoningDescription: string | null;
  /** Default: false */
  entitled: boolean | null;
  entitlementStatus: string | null;
  approvedUses: string | null;
  approvedDensity: number | null;
  approvedUnits: number | null;
  approvedSf: number | null;
  maxFar: number | null;
  maxHeightFt: number | null;
  topography: string | null;
  shape: string | null;
  frontageFt: number | null;
  depthFt: number | null;
  /** Default: false */
  cornerLot: boolean | null;
  floodZone: string | null;
  wetlandsPct: number | null;
  waterAvailable: boolean | null;
  sewerAvailable: boolean | null;
  gasAvailable: boolean | null;
  electricAvailable: boolean | null;
  utilityNotes: string | null;
  existingImprovements: string | null;
  /** Default: false */
  demolitionRequired: boolean | null;
  demolitionCostEstimate: number | null;
  phase1Complete: boolean | null;
  phase2Complete: boolean | null;
  /** Default: false */
  remediationRequired: boolean | null;
  remediationCostEstimate: number | null;
  impactFeesEstimate: number | null;
  offsiteCostsEstimate: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_sales_comp_land (excludes auto-generated fields)
export type SalesCompLandInsert = {
  comparableId: number;
  currentZoning?: string | null;
  proposedZoning?: string | null;
  zoningDescription?: string | null;
  entitled?: boolean | null;
  entitlementStatus?: string | null;
  approvedUses?: string | null;
  approvedDensity?: number | null;
  approvedUnits?: number | null;
  approvedSf?: number | null;
  maxFar?: number | null;
  maxHeightFt?: number | null;
  topography?: string | null;
  shape?: string | null;
  frontageFt?: number | null;
  depthFt?: number | null;
  cornerLot?: boolean | null;
  floodZone?: string | null;
  wetlandsPct?: number | null;
  waterAvailable?: boolean | null;
  sewerAvailable?: boolean | null;
  gasAvailable?: boolean | null;
  electricAvailable?: boolean | null;
  utilityNotes?: string | null;
  existingImprovements?: string | null;
  demolitionRequired?: boolean | null;
  demolitionCostEstimate?: number | null;
  phase1Complete?: boolean | null;
  phase2Complete?: boolean | null;
  remediationRequired?: boolean | null;
  remediationCostEstimate?: number | null;
  impactFeesEstimate?: number | null;
  offsiteCostsEstimate?: number | null;
};

// landscape.tbl_sales_comp_manufactured
// Primary Key: manufactured_id
// Foreign Keys: comparable_id -> landscape.tbl_sales_comparables.comparable_id
export interface SalesCompManufactured {
  /** Default: nextval('tbl_sales_comp_manufactured_manufactured_id_seq'::regclass) */
  manufacturedId: number;
  comparableId: number;
  totalPads: number | null;
  occupiedPads: number | null;
  vacantPads: number | null;
  occupancyRate: number | null;
  parkOwnedHomes: number | null;
  residentOwnedHomes: number | null;
  avgPadRent: number | null;
  totalPadIncome: number | null;
  homeRentalIncome: number | null;
  utilityIncome: number | null;
  otherIncome: number | null;
  waterSewerType: string | null;
  utilitiesIncluded: string | null;
  submetered: boolean | null;
  clubhouse: boolean | null;
  pool: boolean | null;
  laundryFacility: boolean | null;
  playground: boolean | null;
  /** Default: true */
  allAges: boolean | null;
  /** Default: false */
  seniorCommunity: boolean | null;
  minAge: number | null;
  rvSpaces: number | null;
  rvAvgRent: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_sales_comp_manufactured (excludes auto-generated fields)
export type SalesCompManufacturedInsert = {
  comparableId: number;
  totalPads?: number | null;
  occupiedPads?: number | null;
  vacantPads?: number | null;
  occupancyRate?: number | null;
  parkOwnedHomes?: number | null;
  residentOwnedHomes?: number | null;
  avgPadRent?: number | null;
  totalPadIncome?: number | null;
  homeRentalIncome?: number | null;
  utilityIncome?: number | null;
  otherIncome?: number | null;
  waterSewerType?: string | null;
  utilitiesIncluded?: string | null;
  submetered?: boolean | null;
  clubhouse?: boolean | null;
  pool?: boolean | null;
  laundryFacility?: boolean | null;
  playground?: boolean | null;
  allAges?: boolean | null;
  seniorCommunity?: boolean | null;
  minAge?: number | null;
  rvSpaces?: number | null;
  rvAvgRent?: number | null;
};

// landscape.tbl_sales_comp_market_conditions
// Primary Key: market_id
// Foreign Keys: comparable_id -> landscape.tbl_sales_comparables.comparable_id
export interface SalesCompMarketConditions {
  /** Default: nextval('tbl_sales_comp_market_conditions_market_id_seq'::regclass) */
  marketId: number;
  comparableId: number;
  asOfDate: string | null;
  submarketVacancyRate: number | null;
  submarketAskingRent: number | null;
  submarketEffectiveRent: number | null;
  submarketAbsorptionSf: number | null;
  submarketInventorySf: number | null;
  metroVacancyRate: number | null;
  metroAskingRent: number | null;
  metroCapRateAvg: number | null;
  yoyRentGrowth: number | null;
  yoyVacancyChange: number | null;
  underConstructionSf: number | null;
  plannedSf: number | null;
  unemploymentRate: number | null;
  jobGrowthPct: number | null;
  populationGrowthPct: number | null;
  source: string | null;
  /** Default: now() */
  createdAt: string | null;
}

// Insert type for landscape.tbl_sales_comp_market_conditions (excludes auto-generated fields)
export type SalesCompMarketConditionsInsert = {
  comparableId: number;
  asOfDate?: string | null;
  submarketVacancyRate?: number | null;
  submarketAskingRent?: number | null;
  submarketEffectiveRent?: number | null;
  submarketAbsorptionSf?: number | null;
  submarketInventorySf?: number | null;
  metroVacancyRate?: number | null;
  metroAskingRent?: number | null;
  metroCapRateAvg?: number | null;
  yoyRentGrowth?: number | null;
  yoyVacancyChange?: number | null;
  underConstructionSf?: number | null;
  plannedSf?: number | null;
  unemploymentRate?: number | null;
  jobGrowthPct?: number | null;
  populationGrowthPct?: number | null;
  source?: string | null;
};

// landscape.tbl_sales_comp_office
// Primary Key: office_id
// Foreign Keys: comparable_id -> landscape.tbl_sales_comparables.comparable_id
export interface SalesCompOffice {
  /** Default: nextval('tbl_sales_comp_office_office_id_seq'::regclass) */
  officeId: number;
  comparableId: number;
  rentableSf: number | null;
  usableSf: number | null;
  lossFactor: number | null;
  floorPlateSf: number | null;
  avgBaseRentPsf: number | null;
  expenseStop: number | null;
  expenseStructure: string | null;
  avgTiPsf: number | null;
  avgFreeRentMonths: number | null;
  directVacancyPct: number | null;
  subleaseVacancyPct: number | null;
  totalVacancyPct: number | null;
  waltYears: number | null;
  hvacType: string | null;
  lifeSafetySystem: string | null;
  backupPower: boolean | null;
  fiberProviders: string | null;
  parkingRatioPer_1000: number | null;
  reservedSpaces: number | null;
  unreservedSpaces: number | null;
  monthlyParkingRate: number | null;
  leedCertified: boolean | null;
  leedLevel: string | null;
  energyStarScore: number | null;
  wiredScore: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_sales_comp_office (excludes auto-generated fields)
export type SalesCompOfficeInsert = {
  comparableId: number;
  rentableSf?: number | null;
  usableSf?: number | null;
  lossFactor?: number | null;
  floorPlateSf?: number | null;
  avgBaseRentPsf?: number | null;
  expenseStop?: number | null;
  expenseStructure?: string | null;
  avgTiPsf?: number | null;
  avgFreeRentMonths?: number | null;
  directVacancyPct?: number | null;
  subleaseVacancyPct?: number | null;
  totalVacancyPct?: number | null;
  waltYears?: number | null;
  hvacType?: string | null;
  lifeSafetySystem?: string | null;
  backupPower?: boolean | null;
  fiberProviders?: string | null;
  parkingRatioPer_1000?: number | null;
  reservedSpaces?: number | null;
  unreservedSpaces?: number | null;
  monthlyParkingRate?: number | null;
  leedCertified?: boolean | null;
  leedLevel?: string | null;
  energyStarScore?: number | null;
  wiredScore?: string | null;
};

// landscape.tbl_sales_comp_retail
// Primary Key: retail_id
// Foreign Keys: comparable_id -> landscape.tbl_sales_comparables.comparable_id
export interface SalesCompRetail {
  /** Default: nextval('tbl_sales_comp_retail_retail_id_seq'::regclass) */
  retailId: number;
  comparableId: number;
  centerType: string | null;
  anchorTenant: string | null;
  shadowAnchor: string | null;
  anchorSf: number | null;
  juniorAnchorSf: number | null;
  inlineSf: number | null;
  outparcelCount: number | null;
  outparcelSf: number | null;
  anchorSalesPsf: number | null;
  inlineSalesPsf: number | null;
  totalSalesPsf: number | null;
  avgBaseRentPsf: number | null;
  avgCamPsf: number | null;
  avgAllInRentPsf: number | null;
  expenseStructure: string | null;
  trafficCount: number | null;
  trafficCountSource: string | null;
  signageType: string | null;
  pylonSign: boolean | null;
  monumentSign: boolean | null;
  freewayVisible: boolean | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_sales_comp_retail (excludes auto-generated fields)
export type SalesCompRetailInsert = {
  comparableId: number;
  centerType?: string | null;
  anchorTenant?: string | null;
  shadowAnchor?: string | null;
  anchorSf?: number | null;
  juniorAnchorSf?: number | null;
  inlineSf?: number | null;
  outparcelCount?: number | null;
  outparcelSf?: number | null;
  anchorSalesPsf?: number | null;
  inlineSalesPsf?: number | null;
  totalSalesPsf?: number | null;
  avgBaseRentPsf?: number | null;
  avgCamPsf?: number | null;
  avgAllInRentPsf?: number | null;
  expenseStructure?: string | null;
  trafficCount?: number | null;
  trafficCountSource?: string | null;
  signageType?: string | null;
  pylonSign?: boolean | null;
  monumentSign?: boolean | null;
  freewayVisible?: boolean | null;
};

// landscape.tbl_sales_comp_self_storage
// Primary Key: storage_id
// Foreign Keys: comparable_id -> landscape.tbl_sales_comparables.comparable_id
export interface SalesCompSelfStorage {
  /** Default: nextval('tbl_sales_comp_self_storage_storage_id_seq'::regclass) */
  storageId: number;
  comparableId: number;
  totalUnits: number | null;
  climateControlledUnits: number | null;
  nonClimateUnits: number | null;
  climateControlledPct: number | null;
  totalNetRentableSf: number | null;
  climateControlledSf: number | null;
  avgUnitSizeSf: number | null;
  physicalOccupancy: number | null;
  economicOccupancy: number | null;
  avgRentPsf: number | null;
  grossPotentialRent: number | null;
  driveUpAccessPct: number | null;
  elevatorServedPct: number | null;
  rvBoatParkingSpaces: number | null;
  vehicleStorageSpaces: number | null;
  managementType: string | null;
  brandFlag: string | null;
  thirdPartyManaged: boolean | null;
  expansionPotential: boolean | null;
  expansionUnits: number | null;
  expansionSf: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_sales_comp_self_storage (excludes auto-generated fields)
export type SalesCompSelfStorageInsert = {
  comparableId: number;
  totalUnits?: number | null;
  climateControlledUnits?: number | null;
  nonClimateUnits?: number | null;
  climateControlledPct?: number | null;
  totalNetRentableSf?: number | null;
  climateControlledSf?: number | null;
  avgUnitSizeSf?: number | null;
  physicalOccupancy?: number | null;
  economicOccupancy?: number | null;
  avgRentPsf?: number | null;
  grossPotentialRent?: number | null;
  driveUpAccessPct?: number | null;
  elevatorServedPct?: number | null;
  rvBoatParkingSpaces?: number | null;
  vehicleStorageSpaces?: number | null;
  managementType?: string | null;
  brandFlag?: string | null;
  thirdPartyManaged?: boolean | null;
  expansionPotential?: boolean | null;
  expansionUnits?: number | null;
  expansionSf?: number | null;
};

// landscape.tbl_sales_comp_specialty_housing
// Primary Key: specialty_id
// Foreign Keys: comparable_id -> landscape.tbl_sales_comparables.comparable_id
export interface SalesCompSpecialtyHousing {
  /** Default: nextval('tbl_sales_comp_specialty_housing_specialty_id_seq'::regclass) */
  specialtyId: number;
  comparableId: number;
  housingType: string;
  totalBeds: number | null;
  totalUnits: number | null;
  avgBedsPerUnit: number | null;
  independentLivingUnits: number | null;
  assistedLivingUnits: number | null;
  memoryCareUnits: number | null;
  skilledNursingBeds: number | null;
  licenseType: string | null;
  affiliatedUniversity: string | null;
  distanceToCampusMiles: number | null;
  byTheBedLeasing: boolean | null;
  furnished: boolean | null;
  occupancyRate: number | null;
  avgMonthlyRent: number | null;
  avgDailyRate: number | null;
  revenuePerBed: number | null;
  operatorName: string | null;
  thirdPartyManaged: boolean | null;
  medicaidCertified: boolean | null;
  medicareCertified: boolean | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_sales_comp_specialty_housing (excludes auto-generated fields)
export type SalesCompSpecialtyHousingInsert = {
  comparableId: number;
  housingType: string;
  totalBeds?: number | null;
  totalUnits?: number | null;
  avgBedsPerUnit?: number | null;
  independentLivingUnits?: number | null;
  assistedLivingUnits?: number | null;
  memoryCareUnits?: number | null;
  skilledNursingBeds?: number | null;
  licenseType?: string | null;
  affiliatedUniversity?: string | null;
  distanceToCampusMiles?: number | null;
  byTheBedLeasing?: boolean | null;
  furnished?: boolean | null;
  occupancyRate?: number | null;
  avgMonthlyRent?: number | null;
  avgDailyRate?: number | null;
  revenuePerBed?: number | null;
  operatorName?: string | null;
  thirdPartyManaged?: boolean | null;
  medicaidCertified?: boolean | null;
  medicareCertified?: boolean | null;
};

// landscape.tbl_sales_comp_storage_unit_mix
// Primary Key: unit_mix_id
// Foreign Keys: storage_comp_id -> landscape.tbl_sales_comp_self_storage.storage_id
export interface SalesCompStorageUnitMix {
  /** Default: nextval('tbl_sales_comp_storage_unit_mix_unit_mix_id_seq'::regclass) */
  unitMixId: number;
  storageCompId: number;
  unitSizeCategory: string | null;
  unitWidthFt: number | null;
  unitDepthFt: number | null;
  unitSf: number | null;
  unitCount: number | null;
  /** Default: false */
  climateControlled: boolean | null;
  /** Default: false */
  driveUpAccess: boolean | null;
  askingRent: number | null;
  effectiveRent: number | null;
  occupancyPct: number | null;
  /** Default: now() */
  createdAt: string | null;
}

// Insert type for landscape.tbl_sales_comp_storage_unit_mix (excludes auto-generated fields)
export type SalesCompStorageUnitMixInsert = {
  storageCompId: number;
  unitSizeCategory?: string | null;
  unitWidthFt?: number | null;
  unitDepthFt?: number | null;
  unitSf?: number | null;
  unitCount?: number | null;
  climateControlled?: boolean | null;
  driveUpAccess?: boolean | null;
  askingRent?: number | null;
  effectiveRent?: number | null;
  occupancyPct?: number | null;
};

// landscape.tbl_sales_comp_tenants
// Primary Key: tenant_id
// Foreign Keys: comparable_id -> landscape.tbl_sales_comparables.comparable_id
export interface SalesCompTenants {
  /** Default: nextval('tbl_sales_comp_tenants_tenant_id_seq'::regclass) */
  tenantId: number;
  comparableId: number;
  tenantName: string;
  tenantType: string | null;
  /** Default: false */
  isAnchor: boolean | null;
  creditRating: string | null;
  leasedSf: number | null;
  floorNumber: string | null;
  suiteNumber: string | null;
  pctOfBuilding: number | null;
  leaseStartDate: string | null;
  leaseExpirationDate: string | null;
  leaseTermMonths: number | null;
  leaseType: string | null;
  baseRentPsf: number | null;
  baseRentAnnual: number | null;
  expenseStop: number | null;
  tiAllowancePsf: number | null;
  freeRentMonths: number | null;
  renewalOptions: string | null;
  expansionOptions: string | null;
  terminationOptions: string | null;
  salesPsf: number | null;
  pctRentBreakpoint: number | null;
  pctRentRate: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_sales_comp_tenants (excludes auto-generated fields)
export type SalesCompTenantsInsert = {
  comparableId: number;
  tenantName: string;
  tenantType?: string | null;
  isAnchor?: boolean | null;
  creditRating?: string | null;
  leasedSf?: number | null;
  floorNumber?: string | null;
  suiteNumber?: string | null;
  pctOfBuilding?: number | null;
  leaseStartDate?: string | null;
  leaseExpirationDate?: string | null;
  leaseTermMonths?: number | null;
  leaseType?: string | null;
  baseRentPsf?: number | null;
  baseRentAnnual?: number | null;
  expenseStop?: number | null;
  tiAllowancePsf?: number | null;
  freeRentMonths?: number | null;
  renewalOptions?: string | null;
  expansionOptions?: string | null;
  terminationOptions?: string | null;
  salesPsf?: number | null;
  pctRentBreakpoint?: number | null;
  pctRentRate?: number | null;
};

// landscape.tbl_sales_comp_unit_mix
// Primary Key: unit_mix_id
// Foreign Keys: comparable_id -> landscape.tbl_sales_comparables.comparable_id
export interface SalesCompUnitMix {
  /** Default: nextval('tbl_sales_comp_unit_mix_unit_mix_id_seq'::regclass) */
  unitMixId: number;
  comparableId: number;
  bedCount: number | null;
  bathCount: number | null;
  unitType: string | null;
  unitCount: number;
  unitPct: number | null;
  avgUnitSf: number | null;
  totalSf: number | null;
  askingRentMin: number | null;
  askingRentMax: number | null;
  askingRentPerSfMin: number | null;
  askingRentPerSfMax: number | null;
  effectiveRentMin: number | null;
  effectiveRentMax: number | null;
  effectiveRentPerSfMin: number | null;
  effectiveRentPerSfMax: number | null;
  /** Default: 0 */
  vacantUnits: number | null;
  concessionPct: number | null;
  monthlyDiscount: number | null;
  oneTimeConcession: number | null;
  /** Default: false */
  isRentRegulated: boolean | null;
  rentType: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_sales_comp_unit_mix (excludes auto-generated fields)
export type SalesCompUnitMixInsert = {
  comparableId: number;
  bedCount?: number | null;
  bathCount?: number | null;
  unitType?: string | null;
  unitCount: number;
  unitPct?: number | null;
  avgUnitSf?: number | null;
  totalSf?: number | null;
  askingRentMin?: number | null;
  askingRentMax?: number | null;
  askingRentPerSfMin?: number | null;
  askingRentPerSfMax?: number | null;
  effectiveRentMin?: number | null;
  effectiveRentMax?: number | null;
  effectiveRentPerSfMin?: number | null;
  effectiveRentPerSfMax?: number | null;
  vacantUnits?: number | null;
  concessionPct?: number | null;
  monthlyDiscount?: number | null;
  oneTimeConcession?: number | null;
  isRentRegulated?: boolean | null;
  rentType?: string | null;
};

// landscape.tbl_sales_comparables
// Primary Key: comparable_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface SalesComparables {
  /** Default: nextval('tbl_sales_comparables_comparable_id_seq'::regclass) */
  comparableId: number;
  projectId: number;
  compNumber: number | null;
  propertyName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  saleDate: string | null;
  salePrice: number | null;
  pricePerUnit: number | null;
  pricePerSf: number | null;
  yearBuilt: number | null;
  units: number | null;
  buildingSf: string | null;
  capRate: string | null;
  grm: number | null;
  distanceFromSubject: string | null;
  unitMix: any | null;
  notes: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  latitude: number | null;
  longitude: number | null;
  unitCount: number | null;
  costarCompId: string | null;
  priceStatus: string | null;
  compStatus: string | null;
  saleType: string | null;
  saleConditions: string | null;
  holdPeriodMonths: number | null;
  daysOnMarket: number | null;
  askingPrice: number | null;
  transferTax: number | null;
  documentNumber: string | null;
  escrowLengthDays: number | null;
  percentLeasedAtSale: number | null;
  actualCapRate: number | null;
  proFormaCapRate: number | null;
  gim: number | null;
  noiAtSale: number | null;
  grossIncomeAtSale: number | null;
  financingType: string | null;
  financingLender: string | null;
  financingAmount: number | null;
  financingRate: number | null;
  financingTermMonths: number | null;
  loanToValue: number | null;
  /** Default: false */
  assumedFinancing: boolean | null;
  recordedBuyer: string | null;
  trueBuyer: string | null;
  buyerContact: string | null;
  buyerType: string | null;
  recordedSeller: string | null;
  trueSeller: string | null;
  sellerContact: string | null;
  sellerType: string | null;
  buyerBrokerCompany: string | null;
  buyerBrokerName: string | null;
  buyerBrokerPhone: string | null;
  listingBrokerCompany: string | null;
  listingBrokerName: string | null;
  listingBrokerPhone: string | null;
  /** Default: false */
  noBrokerDeal: boolean | null;
  propertyType: string | null;
  propertySubtype: string | null;
  buildingClass: string | null;
  costarStarRating: number | null;
  locationType: string | null;
  numBuildings: number | null;
  numFloors: number | null;
  typicalFloorSf: number | null;
  tenancyType: string | null;
  ownerOccupied: boolean | null;
  avgUnitSizeSf: number | null;
  unitsPerAcre: number | null;
  parkingSpaces: number | null;
  parkingRatio: number | null;
  parkingType: string | null;
  elevators: number | null;
  zoning: string | null;
  constructionType: string | null;
  roofType: string | null;
  hvacType: string | null;
  sprinklered: boolean | null;
  landAreaSf: number | null;
  landAreaAcres: number | null;
  farAllowed: number | null;
  farActual: number | null;
  numParcels: number | null;
  topography: string | null;
  utilitiesAvailable: string | null;
  entitlements: string | null;
  environmentalIssues: string | null;
  totalAssessedValue: number | null;
  landAssessedValue: number | null;
  improvedAssessedValue: number | null;
  assessmentYear: number | null;
  taxAmount: number | null;
  taxPerUnit: number | null;
  percentImproved: number | null;
  metroMarket: string | null;
  submarket: string | null;
  county: string | null;
  cbsa: string | null;
  csa: string | null;
  dma: string | null;
  walkScore: number | null;
  transitScore: number | null;
  bikeScore: number | null;
  dataSource: string | null;
  verificationStatus: string | null;
  verificationSource: string | null;
  verificationDate: string | null;
  transactionNotes: string | null;
  internalNotes: string | null;
  /** Default: false */
  isPortfolioSale: boolean | null;
  portfolioName: string | null;
  portfolioPropertyCount: number | null;
  priceAllocationMethod: string | null;
  allocatedPrice: number | null;
  siteAmenities: any | null;
  extraData: any | null;
  rawImportData: any | null;
  propertyRights: string | null;
}

// Insert type for landscape.tbl_sales_comparables (excludes auto-generated fields)
export type SalesComparablesInsert = {
  projectId: number;
  compNumber?: number | null;
  propertyName?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  saleDate?: string | null;
  salePrice?: number | null;
  pricePerUnit?: number | null;
  pricePerSf?: number | null;
  yearBuilt?: number | null;
  units?: number | null;
  buildingSf?: string | null;
  capRate?: string | null;
  grm?: number | null;
  distanceFromSubject?: string | null;
  unitMix?: any | null;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  unitCount?: number | null;
  costarCompId?: string | null;
  priceStatus?: string | null;
  compStatus?: string | null;
  saleType?: string | null;
  saleConditions?: string | null;
  holdPeriodMonths?: number | null;
  daysOnMarket?: number | null;
  askingPrice?: number | null;
  transferTax?: number | null;
  documentNumber?: string | null;
  escrowLengthDays?: number | null;
  percentLeasedAtSale?: number | null;
  actualCapRate?: number | null;
  proFormaCapRate?: number | null;
  gim?: number | null;
  noiAtSale?: number | null;
  grossIncomeAtSale?: number | null;
  financingType?: string | null;
  financingLender?: string | null;
  financingAmount?: number | null;
  financingRate?: number | null;
  financingTermMonths?: number | null;
  loanToValue?: number | null;
  assumedFinancing?: boolean | null;
  recordedBuyer?: string | null;
  trueBuyer?: string | null;
  buyerContact?: string | null;
  buyerType?: string | null;
  recordedSeller?: string | null;
  trueSeller?: string | null;
  sellerContact?: string | null;
  sellerType?: string | null;
  buyerBrokerCompany?: string | null;
  buyerBrokerName?: string | null;
  buyerBrokerPhone?: string | null;
  listingBrokerCompany?: string | null;
  listingBrokerName?: string | null;
  listingBrokerPhone?: string | null;
  noBrokerDeal?: boolean | null;
  propertyType?: string | null;
  propertySubtype?: string | null;
  buildingClass?: string | null;
  costarStarRating?: number | null;
  locationType?: string | null;
  numBuildings?: number | null;
  numFloors?: number | null;
  typicalFloorSf?: number | null;
  tenancyType?: string | null;
  ownerOccupied?: boolean | null;
  avgUnitSizeSf?: number | null;
  unitsPerAcre?: number | null;
  parkingSpaces?: number | null;
  parkingRatio?: number | null;
  parkingType?: string | null;
  elevators?: number | null;
  zoning?: string | null;
  constructionType?: string | null;
  roofType?: string | null;
  hvacType?: string | null;
  sprinklered?: boolean | null;
  landAreaSf?: number | null;
  landAreaAcres?: number | null;
  farAllowed?: number | null;
  farActual?: number | null;
  numParcels?: number | null;
  topography?: string | null;
  utilitiesAvailable?: string | null;
  entitlements?: string | null;
  environmentalIssues?: string | null;
  totalAssessedValue?: number | null;
  landAssessedValue?: number | null;
  improvedAssessedValue?: number | null;
  assessmentYear?: number | null;
  taxAmount?: number | null;
  taxPerUnit?: number | null;
  percentImproved?: number | null;
  metroMarket?: string | null;
  submarket?: string | null;
  county?: string | null;
  cbsa?: string | null;
  csa?: string | null;
  dma?: string | null;
  walkScore?: number | null;
  transitScore?: number | null;
  bikeScore?: number | null;
  dataSource?: string | null;
  verificationStatus?: string | null;
  verificationSource?: string | null;
  verificationDate?: string | null;
  transactionNotes?: string | null;
  internalNotes?: string | null;
  isPortfolioSale?: boolean | null;
  portfolioName?: string | null;
  portfolioPropertyCount?: number | null;
  priceAllocationMethod?: string | null;
  allocatedPrice?: number | null;
  siteAmenities?: any | null;
  extraData?: any | null;
  rawImportData?: any | null;
  propertyRights?: string | null;
};

// landscape.tbl_scenario
// Primary Key: scenario_id
// Foreign Keys: cloned_from_scenario_id -> landscape.tbl_scenario.scenario_id, created_by -> landscape.auth_user.id, project_id -> landscape.tbl_project.project_id
export interface Scenario {
  /** Default: nextval('tbl_scenario_scenario_id_seq'::regclass) */
  scenarioId: number;
  projectId: number;
  scenarioName: string;
  /** Default: 'custom'::character varying */
  scenarioType: string;
  scenarioCode: string | null;
  /** Default: false */
  isActive: boolean | null;
  /** Default: false */
  isLocked: boolean | null;
  /** Default: 0 */
  displayOrder: number | null;
  description: string | null;
  /** Default: '#6B7280'::character varying */
  colorHex: string | null;
  varianceMethod: string | null;
  revenueVariancePct: number | null;
  costVariancePct: number | null;
  absorptionVariancePct: number | null;
  /** Default: 0 */
  startDateOffsetMonths: number | null;
  createdBy: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  clonedFromScenarioId: number | null;
}

// Insert type for landscape.tbl_scenario (excludes auto-generated fields)
export type ScenarioInsert = {
  projectId: number;
  scenarioName: string;
  scenarioType?: string;
  scenarioCode?: string | null;
  isActive?: boolean | null;
  isLocked?: boolean | null;
  displayOrder?: number | null;
  description?: string | null;
  colorHex?: string | null;
  varianceMethod?: string | null;
  revenueVariancePct?: number | null;
  costVariancePct?: number | null;
  absorptionVariancePct?: number | null;
  startDateOffsetMonths?: number | null;
  createdBy?: number | null;
  clonedFromScenarioId?: number | null;
};

// landscape.tbl_scenario_comparison
// Primary Key: comparison_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface ScenarioComparison {
  /** Default: nextval('tbl_scenario_comparison_comparison_id_seq'::regclass) */
  comparisonId: number;
  projectId: number;
  comparisonName: string;
  scenarioIds: any[];
  /** Default: 'side_by_side'::character varying */
  comparisonType: string | null;
  scenarioProbabilities: any[] | null;
  comparisonResults: any | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_scenario_comparison (excludes auto-generated fields)
export type ScenarioComparisonInsert = {
  projectId: number;
  comparisonName: string;
  scenarioIds: any[];
  comparisonType?: string | null;
  scenarioProbabilities?: any[] | null;
  comparisonResults?: any | null;
};

// landscape.tbl_scenario_log
// Primary Key: scenario_log_id
// Foreign Keys: parent_scenario_id -> landscape.tbl_scenario_log.scenario_log_id, project_id -> landscape.tbl_project.project_id, thread_id -> landscape.landscaper_chat_thread.id
export interface ScenarioLog {
  /** Default: nextval('tbl_scenario_log_scenario_log_id_seq'::regclass) */
  scenarioLogId: number;
  projectId: number;
  threadId: string | null;
  userId: number | null;
  scenarioName: string | null;
  description: string | null;
  /** Default: 'active_shadow'::character varying */
  status: string;
  /** Default: '{}'::jsonb */
  scenarioData: any;
  parentScenarioId: number | null;
  /** Default: 'landscaper_chat'::character varying */
  source: string | null;
  tags: any[] | null;
  notes: string | null;
  /** Default: now() */
  createdAt: string;
  /** Default: now() */
  updatedAt: string;
  committedAt: string | null;
  committedBy: number | null;
}

// Insert type for landscape.tbl_scenario_log (excludes auto-generated fields)
export type ScenarioLogInsert = {
  projectId: number;
  threadId?: string | null;
  userId?: number | null;
  scenarioName?: string | null;
  description?: string | null;
  status?: string;
  scenarioData?: any;
  parentScenarioId?: number | null;
  source?: string | null;
  tags?: any[] | null;
  notes?: string | null;
  committedAt?: string | null;
  committedBy?: number | null;
};

// landscape.tbl_security_deposit
// Primary Key: deposit_id
// Foreign Keys: lease_id -> landscape.tbl_lease.lease_id
export interface SecurityDeposit {
  /** Default: nextval('tbl_security_deposit_deposit_id_seq'::regclass) */
  depositId: number;
  leaseId: number;
  depositType: string | null;
  depositAmount: number | null;
  depositMonths: number | null;
  locIssuingBank: string | null;
  locExpirationDate: string | null;
  /** Default: false */
  locAutoRenew: boolean | null;
  locRenewalNoticeDays: number | null;
  locBeneficiary: string | null;
  guarantorName: string | null;
  guarantorRelationship: string | null;
  guaranteeType: string | null;
  guaranteeCap: number | null;
  /** Default: false */
  guaranteeBurnDown: boolean | null;
  burnDownSchedule: string | null;
  /** Default: false */
  depositReductionAllowed: boolean | null;
  reductionTrigger: string | null;
  reductionSchedule: string | null;
  /** Default: false */
  interestBearing: boolean | null;
  interestRatePct: number | null;
  interestPaymentFrequency: string | null;
  /** Default: false */
  depositReceived: boolean | null;
  depositReceivedDate: string | null;
  depositAccountNumber: string | null;
  currentDepositBalance: number | null;
  notes: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_security_deposit (excludes auto-generated fields)
export type SecurityDepositInsert = {
  leaseId: number;
  depositType?: string | null;
  depositAmount?: number | null;
  depositMonths?: number | null;
  locIssuingBank?: string | null;
  locExpirationDate?: string | null;
  locAutoRenew?: boolean | null;
  locRenewalNoticeDays?: number | null;
  locBeneficiary?: string | null;
  guarantorName?: string | null;
  guarantorRelationship?: string | null;
  guaranteeType?: string | null;
  guaranteeCap?: number | null;
  guaranteeBurnDown?: boolean | null;
  burnDownSchedule?: string | null;
  depositReductionAllowed?: boolean | null;
  reductionTrigger?: string | null;
  reductionSchedule?: string | null;
  interestBearing?: boolean | null;
  interestRatePct?: number | null;
  interestPaymentFrequency?: string | null;
  depositReceived?: boolean | null;
  depositReceivedDate?: string | null;
  depositAccountNumber?: string | null;
  currentDepositBalance?: number | null;
  notes?: string | null;
};

// landscape.tbl_space
// Primary Key: space_id
// Foreign Keys: income_property_id -> landscape.tbl_income_property.income_property_id
export interface Space {
  /** Default: nextval('tbl_space_space_id_seq'::regclass) */
  spaceId: number;
  incomePropertyId: number | null;
  spaceNumber: string | null;
  floorNumber: number | null;
  usableSf: number | null;
  rentableSf: number | null;
  spaceType: string | null;
  frontageFt: number | null;
  ceilingHeightFt: number | null;
  numberOfOffices: number | null;
  numberOfConferenceRooms: number | null;
  /** Default: false */
  hasKitchenette: boolean | null;
  /** Default: false */
  hasPrivateRestroom: boolean | null;
  spaceStatus: string | null;
  availableDate: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  /** Default: 'CRE'::character varying */
  spaceTypeCode: string | null;
}

// Insert type for landscape.tbl_space (excludes auto-generated fields)
export type SpaceInsert = {
  incomePropertyId?: number | null;
  spaceNumber?: string | null;
  floorNumber?: number | null;
  usableSf?: number | null;
  rentableSf?: number | null;
  spaceType?: string | null;
  frontageFt?: number | null;
  ceilingHeightFt?: number | null;
  numberOfOffices?: number | null;
  numberOfConferenceRooms?: number | null;
  hasKitchenette?: boolean | null;
  hasPrivateRestroom?: boolean | null;
  spaceStatus?: string | null;
  availableDate?: string | null;
  spaceTypeCode?: string | null;
};

// landscape.tbl_space_ind_ext
// Primary Key: space_id
// Foreign Keys: space_id -> landscape.tbl_space.space_id
export interface SpaceIndExt {
  spaceId: number;
  warehouseSf: number | null;
  officeSf: number | null;
  mezzanineSf: number | null;
  outdoorStorageSf: number | null;
  officeFinishLevel: string | null;
  officeRatioPct: number | null;
  /** Default: 0 */
  dedicatedDocks: number | null;
  /** Default: false */
  sharedDockAccess: boolean | null;
  /** Default: false */
  dedicatedElectrical: boolean | null;
  electricalAmps: number | null;
  /** Default: false */
  rackSystem: boolean | null;
  rackValue: number | null;
  /** Default: false */
  craneSystem: boolean | null;
  craneCapacityTons: number | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_space_ind_ext (excludes auto-generated fields)
export type SpaceIndExtInsert = {
  spaceId: number;
  warehouseSf?: number | null;
  officeSf?: number | null;
  mezzanineSf?: number | null;
  outdoorStorageSf?: number | null;
  officeFinishLevel?: string | null;
  officeRatioPct?: number | null;
  dedicatedDocks?: number | null;
  sharedDockAccess?: boolean | null;
  dedicatedElectrical?: boolean | null;
  electricalAmps?: number | null;
  rackSystem?: boolean | null;
  rackValue?: number | null;
  craneSystem?: boolean | null;
  craneCapacityTons?: number | null;
};

// landscape.tbl_space_mf_ext
// Primary Key: space_id
// Foreign Keys: space_id -> landscape.tbl_space.space_id
export interface SpaceMfExt {
  spaceId: number;
  unitType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  /** Default: 0 */
  halfBaths: number | null;
  /** Default: false */
  hasWasherDryer: boolean | null;
  washerDryerType: string | null;
  /** Default: false */
  hasDishwasher: boolean | null;
  /** Default: false */
  hasFireplace: boolean | null;
  /** Default: false */
  hasBalcony: boolean | null;
  /** Default: false */
  hasPatio: boolean | null;
  balconySf: number | null;
  floorType: string | null;
  countertopType: string | null;
  cabinetType: string | null;
  appliancePackage: string | null;
  viewType: string | null;
  floorPremiumPct: number | null;
  /** Default: false */
  cornerUnit: boolean | null;
  marketRent: number | null;
  effectiveRent: number | null;
  lossToLease: number | null;
  concessionValue: number | null;
  renovationStatus: string | null;
  lastRenovationDate: string | null;
  renovationCost: number | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_space_mf_ext (excludes auto-generated fields)
export type SpaceMfExtInsert = {
  spaceId: number;
  unitType?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  halfBaths?: number | null;
  hasWasherDryer?: boolean | null;
  washerDryerType?: string | null;
  hasDishwasher?: boolean | null;
  hasFireplace?: boolean | null;
  hasBalcony?: boolean | null;
  hasPatio?: boolean | null;
  balconySf?: number | null;
  floorType?: string | null;
  countertopType?: string | null;
  cabinetType?: string | null;
  appliancePackage?: string | null;
  viewType?: string | null;
  floorPremiumPct?: number | null;
  cornerUnit?: boolean | null;
  marketRent?: number | null;
  effectiveRent?: number | null;
  lossToLease?: number | null;
  concessionValue?: number | null;
  renovationStatus?: string | null;
  lastRenovationDate?: string | null;
  renovationCost?: number | null;
};

// landscape.tbl_space_ret_ext
// Primary Key: space_id
// Foreign Keys: space_id -> landscape.tbl_space.space_id
export interface SpaceRetExt {
  spaceId: number;
  retailSpaceType: string | null;
  tenantCategory: string | null;
  frontageFt: number | null;
  depthFt: number | null;
  storefrontFt: number | null;
  /** Default: false */
  cornerLocation: boolean | null;
  /** Default: false */
  endCap: boolean | null;
  /** Default: false */
  greaseTrap: boolean | null;
  /** Default: false */
  hoodSystem: boolean | null;
  /** Default: false */
  walkInCooler: boolean | null;
  /** Default: false */
  driveThru: boolean | null;
  patioSf: number | null;
  visibilityScore: number | null;
  /** Default: false */
  highwayFrontage: boolean | null;
  /** Default: false */
  mainEntranceProximity: boolean | null;
  reportedSales: number | null;
  salesReportingDate: string | null;
  salesPsf: number | null;
  /** Default: false */
  breakpointAchieved: boolean | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_space_ret_ext (excludes auto-generated fields)
export type SpaceRetExtInsert = {
  spaceId: number;
  retailSpaceType?: string | null;
  tenantCategory?: string | null;
  frontageFt?: number | null;
  depthFt?: number | null;
  storefrontFt?: number | null;
  cornerLocation?: boolean | null;
  endCap?: boolean | null;
  greaseTrap?: boolean | null;
  hoodSystem?: boolean | null;
  walkInCooler?: boolean | null;
  driveThru?: boolean | null;
  patioSf?: number | null;
  visibilityScore?: number | null;
  highwayFrontage?: boolean | null;
  mainEntranceProximity?: boolean | null;
  reportedSales?: number | null;
  salesReportingDate?: string | null;
  salesPsf?: number | null;
  breakpointAchieved?: boolean | null;
};

// landscape.tbl_system_picklist
// Primary Key: picklist_id
// Foreign Keys: parent_id -> landscape.tbl_system_picklist.picklist_id
export interface SystemPicklist {
  /** Default: nextval('tbl_system_picklist_picklist_id_seq'::regclass) */
  picklistId: number;
  picklistType: string;
  code: string;
  name: string;
  description: string | null;
  parentId: number | null;
  /** Default: 0 */
  sortOrder: number | null;
  /** Default: true */
  isActive: boolean | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_system_picklist (excludes auto-generated fields)
export type SystemPicklistInsert = {
  picklistType: string;
  code: string;
  name: string;
  description?: string | null;
  parentId?: number | null;
  sortOrder?: number | null;
  isActive?: boolean | null;
};

// landscape.tbl_template_column_config
// Primary Key: template_column_id
// Foreign Keys: template_id -> landscape.tbl_property_use_template.template_id
export interface TemplateColumnConfig {
  /** Default: nextval('tbl_template_column_config_template_column_id_seq'::regclass) */
  templateColumnId: number;
  templateId: number;
  columnName: string;
  columnLabel: string;
  columnType: string;
  dataType: string | null;
  containerLevel: number | null;
  /** Default: 0 */
  displayOrder: number;
  /** Default: false */
  isRequired: boolean | null;
  dataSourceTable: string | null;
  dataSourceValueCol: string | null;
  dataSourceLabelCol: string | null;
  parentColumnName: string | null;
  junctionTable: string | null;
  /** Default: now() */
  createdAt: string | null;
}

// Insert type for landscape.tbl_template_column_config (excludes auto-generated fields)
export type TemplateColumnConfigInsert = {
  templateId: number;
  columnName: string;
  columnLabel: string;
  columnType: string;
  dataType?: string | null;
  containerLevel?: number | null;
  displayOrder?: number;
  isRequired?: boolean | null;
  dataSourceTable?: string | null;
  dataSourceValueCol?: string | null;
  dataSourceLabelCol?: string | null;
  parentColumnName?: string | null;
  junctionTable?: string | null;
};

// landscape.tbl_tenant
// Primary Key: tenant_id
// Foreign Keys: operator_id -> landscape.tbl_operator.operator_id
export interface Tenant {
  /** Default: nextval('tbl_tenant_tenant_id_seq'::regclass) */
  tenantId: number;
  tenantName: string;
  tenantLegalName: string | null;
  dbaName: string | null;
  industry: string | null;
  naicsCode: string | null;
  businessType: string | null;
  creditRating: string | null;
  creditworthiness: string | null;
  dunBradstreetNumber: string | null;
  annualRevenue: number | null;
  yearsInBusiness: number | null;
  contactName: string | null;
  contactTitle: string | null;
  email: string | null;
  phone: string | null;
  guarantorName: string | null;
  guarantorType: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  operatorId: number | null;
}

// Insert type for landscape.tbl_tenant (excludes auto-generated fields)
export type TenantInsert = {
  tenantName: string;
  tenantLegalName?: string | null;
  dbaName?: string | null;
  industry?: string | null;
  naicsCode?: string | null;
  businessType?: string | null;
  creditRating?: string | null;
  creditworthiness?: string | null;
  dunBradstreetNumber?: string | null;
  annualRevenue?: number | null;
  yearsInBusiness?: number | null;
  contactName?: string | null;
  contactTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  guarantorName?: string | null;
  guarantorType?: string | null;
  operatorId?: number | null;
};

// landscape.tbl_tenant_improvement
// Primary Key: tenant_improvement_id
// Foreign Keys: lease_id -> landscape.tbl_lease.lease_id
export interface TenantImprovement {
  tenantImprovementId: number;
  leaseId: number;
  allowancePsf: number | null;
  allowanceTotal: number | null;
  actualCost: number | null;
  landlordContribution: number | null;
  /** Default: 'Upfront'::character varying */
  reimbursementStructure: string | null;
  amortizationMonths: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_tenant_improvement (excludes auto-generated fields)
export type TenantImprovementInsert = {
  tenantImprovementId: number;
  leaseId: number;
  allowancePsf?: number | null;
  allowanceTotal?: number | null;
  actualCost?: number | null;
  landlordContribution?: number | null;
  reimbursementStructure?: string | null;
  amortizationMonths?: number | null;
};

// landscape.tbl_termination_option
// Primary Key: termination_option_id
// Foreign Keys: lease_id -> landscape.tbl_lease.lease_id
export interface TerminationOption {
  /** Default: nextval('tbl_termination_option_termination_option_id_seq'::regclass) */
  terminationOptionId: number;
  leaseId: number;
  terminationType: string | null;
  earliestTerminationDate: string | null;
  terminationWindowStart: string | null;
  terminationWindowEnd: string | null;
  noticePeriodMonths: number | null;
  noticeDeadline: string | null;
  terminationFeeType: string | null;
  terminationFeeFlat: number | null;
  terminationFeeMonthsRent: number | null;
  /** Default: false */
  unamortizedTiIncluded: boolean | null;
  /** Default: false */
  unamortizedLcIncluded: boolean | null;
  terminationFeeFormula: string | null;
  estimatedTerminationFee: number | null;
  terminationConditions: string | null;
  /** Default: false */
  financialCovenantTrigger: boolean | null;
  salesThresholdTrigger: number | null;
  /** Default: false */
  terminationExercised: boolean | null;
  terminationNoticeDate: string | null;
  actualTerminationDate: string | null;
  terminationFeePaid: number | null;
  notes: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_termination_option (excludes auto-generated fields)
export type TerminationOptionInsert = {
  leaseId: number;
  terminationType?: string | null;
  earliestTerminationDate?: string | null;
  terminationWindowStart?: string | null;
  terminationWindowEnd?: string | null;
  noticePeriodMonths?: number | null;
  noticeDeadline?: string | null;
  terminationFeeType?: string | null;
  terminationFeeFlat?: number | null;
  terminationFeeMonthsRent?: number | null;
  unamortizedTiIncluded?: boolean | null;
  unamortizedLcIncluded?: boolean | null;
  terminationFeeFormula?: string | null;
  estimatedTerminationFee?: number | null;
  terminationConditions?: string | null;
  financialCovenantTrigger?: boolean | null;
  salesThresholdTrigger?: number | null;
  terminationExercised?: boolean | null;
  terminationNoticeDate?: string | null;
  actualTerminationDate?: string | null;
  terminationFeePaid?: number | null;
  notes?: string | null;
};

// landscape.tbl_unit_operations
// Primary Key: unit_operations_id
// Foreign Keys: concept_id -> landscape.tbl_concept.concept_id, parcel_id -> landscape.tbl_parcel.parcel_id
export interface UnitOperations {
  /** Default: nextval('tbl_unit_operations_unit_operations_id_seq'::regclass) */
  unitOperationsId: number;
  parcelId: number | null;
  conceptId: number | null;
  periodType: string;
  periodEndDate: string;
  periodLabel: string | null;
  revenue: number | null;
  cogs: number | null;
  grossProfit: number | null;
  grossProfitMargin: number | null;
  operatingExpenses: number | null;
  ebitdar: number | null;
  ebitdarMargin: number | null;
  rent: number | null;
  rentCoverage: number | null;
  fixedChargeCoverage: number | null;
  ebitda: number | null;
  ebitdaMargin: number | null;
  auv: number | null;
  sameStoreRevenueYoy: number | null;
  sameStoreRevenueCagr: number | null;
  sameStoreEbitdarYoy: number | null;
  sameStoreEbitdarCagr: number | null;
  conceptSpecific: any | null;
  dataSource: string | null;
  sourceDocId: number | null;
  /** Default: false */
  isProForma: boolean | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
}

// Insert type for landscape.tbl_unit_operations (excludes auto-generated fields)
export type UnitOperationsInsert = {
  parcelId?: number | null;
  conceptId?: number | null;
  periodType: string;
  periodEndDate: string;
  periodLabel?: string | null;
  revenue?: number | null;
  cogs?: number | null;
  grossProfit?: number | null;
  grossProfitMargin?: number | null;
  operatingExpenses?: number | null;
  ebitdar?: number | null;
  ebitdarMargin?: number | null;
  rent?: number | null;
  rentCoverage?: number | null;
  fixedChargeCoverage?: number | null;
  ebitda?: number | null;
  ebitdaMargin?: number | null;
  auv?: number | null;
  sameStoreRevenueYoy?: number | null;
  sameStoreRevenueCagr?: number | null;
  sameStoreEbitdarYoy?: number | null;
  sameStoreEbitdarCagr?: number | null;
  conceptSpecific?: any | null;
  dataSource?: string | null;
  sourceDocId?: number | null;
  isProForma?: boolean | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

// landscape.tbl_uom_calculation_formulas
// Primary Key: formula_id
export interface UomCalculationFormulas {
  /** Default: nextval('tbl_uom_calculation_formulas_formula_id_seq'::regclass) */
  formulaId: number;
  uomCode: string;
  formulaName: string;
  formulaExpression: string;
  requiredFields: any[];
  description: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_uom_calculation_formulas (excludes auto-generated fields)
export type UomCalculationFormulasInsert = {
  uomCode: string;
  formulaName: string;
  formulaExpression: string;
  requiredFields: any[];
  description?: string | null;
};

// landscape.tbl_user_grid_preference
// Primary Key: id
// Foreign Keys: user_id -> landscape.auth_user.id
export interface UserGridPreference {
  id: number;
  projectId: number;
  gridId: string;
  columnOrder: any;
  columnVisibility: any;
  createdAt: string;
  updatedAt: string;
  userId: number;
}

// landscape.tbl_user_landscaper_profile
// Primary Key: profile_id
// Foreign Keys: user_id -> landscape.auth_user.id
export interface UserLandscaperProfile {
  profileId: number;
  surveyCompletedAt: string | null;
  rolePrimary: string | null;
  rolePropertyType: string | null;
  aiProficiency: string | null;
  communicationTone: string | null;
  primaryTool: string | null;
  marketsText: string | null;
  compiledInstructions: string | null;
  onboardingChatHistory: any;
  interactionInsights: any;
  documentInsights: any;
  tosAcceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
  userId: number;
  customInstructions: string | null;
}

// landscape.tbl_user_preference
// Primary Key: id
// Foreign Keys: user_id -> landscape.auth_user.id
export interface UserPreference {
  id: number;
  preferenceKey: string;
  preferenceValue: any;
  scopeType: string;
  scopeId: number | null;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
  userId: number;
}

// landscape.tbl_user_report_personal_default
// Primary Key: id
// Foreign Keys: report_code -> landscape.tbl_report_definition.report_code, user_id -> landscape.auth_user.id
export interface UserReportPersonalDefault {
  id: number;
  scopeType: string;
  scopeId: number | null;
  modificationSpec: any;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
  userId: number;
  reportCode: string;
}

// landscape.tbl_user_saved_report
// Primary Key: id
// Foreign Keys: base_report_code -> landscape.tbl_report_definition.report_code, user_id -> landscape.auth_user.id
export interface UserSavedReport {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  scopeType: string;
  scopeId: number | null;
  modificationSpec: any;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
  userId: number;
  baseReportCode: string;
}

// landscape.tbl_user_scenario_vocab
// Primary Key: vocab_id
export interface UserScenarioVocab {
  /** Default: nextval('tbl_user_scenario_vocab_vocab_id_seq'::regclass) */
  vocabId: number;
  userId: number;
  resolutionDomain: string;
  sourcePhrase: string;
  normalizedPhrase: string;
  resolvedValue: string;
  /** Default: 1 */
  timesUsed: number;
  /** Default: now() */
  lastConfirmedAt: string;
  contextNote: string | null;
  /** Default: now() */
  createdAt: string;
  /** Default: now() */
  updatedAt: string;
}

// Insert type for landscape.tbl_user_scenario_vocab (excludes auto-generated fields)
export type UserScenarioVocabInsert = {
  userId: number;
  resolutionDomain: string;
  sourcePhrase: string;
  normalizedPhrase: string;
  resolvedValue: string;
  timesUsed?: number;
  contextNote?: string | null;
};

// landscape.tbl_vacancy_assumption
// Primary Key: vacancy_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface VacancyAssumption {
  /** Default: nextval('tbl_vacancy_assumption_vacancy_id_seq'::regclass) */
  vacancyId: number;
  projectId: number;
  /** Default: 0.05 */
  vacancyLossPct: number;
  /** Default: 0.02 */
  collectionLossPct: number;
  /** Default: 0.03 */
  physicalVacancyPct: number | null;
  /** Default: 0.02 */
  economicVacancyPct: number | null;
  /** Default: 0.01 */
  badDebtPct: number | null;
  /** Default: 0.01 */
  concessionCostPct: number | null;
  /** Default: 14 */
  turnoverVacancyDays: number | null;
  seasonalVacancyAdjustment: any | null;
  leaseUpAbsorptionCurve: any | null;
  marketVacancyRatePct: number | null;
  submarketVacancyRatePct: number | null;
  competitiveSetVacancyPct: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_vacancy_assumption (excludes auto-generated fields)
export type VacancyAssumptionInsert = {
  projectId: number;
  vacancyLossPct?: number;
  collectionLossPct?: number;
  physicalVacancyPct?: number | null;
  economicVacancyPct?: number | null;
  badDebtPct?: number | null;
  concessionCostPct?: number | null;
  turnoverVacancyDays?: number | null;
  seasonalVacancyAdjustment?: any | null;
  leaseUpAbsorptionCurve?: any | null;
  marketVacancyRatePct?: number | null;
  submarketVacancyRatePct?: number | null;
  competitiveSetVacancyPct?: number | null;
};

// landscape.tbl_valuation_reconciliation
// Primary Key: reconciliation_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface ValuationReconciliation {
  /** Default: nextval('tbl_valuation_reconciliation_reconciliation_id_seq'::regclass) */
  reconciliationId: number;
  projectId: number;
  salesComparisonValue: number | null;
  salesComparisonWeight: number | null;
  costApproachValue: number | null;
  costApproachWeight: number | null;
  incomeApproachValue: number | null;
  incomeApproachWeight: number | null;
  finalReconciledValue: number | null;
  reconciliationNarrative: string | null;
  valuationDate: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_valuation_reconciliation (excludes auto-generated fields)
export type ValuationReconciliationInsert = {
  projectId: number;
  salesComparisonValue?: number | null;
  salesComparisonWeight?: number | null;
  costApproachValue?: number | null;
  costApproachWeight?: number | null;
  incomeApproachValue?: number | null;
  incomeApproachWeight?: number | null;
  finalReconciledValue?: number | null;
  reconciliationNarrative?: string | null;
  valuationDate?: string | null;
};

// landscape.tbl_value_add_assumptions
// Primary Key: value_add_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface ValueAddAssumptions {
  /** Default: nextval('tbl_value_add_assumptions_value_add_id_seq'::regclass) */
  valueAddId: number;
  projectId: number;
  /** Default: false */
  isEnabled: boolean | null;
  renoCostPerSf: number | null;
  relocationIncentive: number | null;
  /** Default: true */
  renovateAll: boolean | null;
  unitsToRenovate: number | null;
  renoStartsPerMonth: number | null;
  renoStartMonth: number | null;
  rentPremiumPct: number | null;
  reletLagMonths: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  /** Default: 'sf'::character varying */
  renoCostBasis: string | null;
  monthsToComplete: number | null;
}

// Insert type for landscape.tbl_value_add_assumptions (excludes auto-generated fields)
export type ValueAddAssumptionsInsert = {
  projectId: number;
  isEnabled?: boolean | null;
  renoCostPerSf?: number | null;
  relocationIncentive?: number | null;
  renovateAll?: boolean | null;
  unitsToRenovate?: number | null;
  renoStartsPerMonth?: number | null;
  renoStartMonth?: number | null;
  rentPremiumPct?: number | null;
  reletLagMonths?: number | null;
  renoCostBasis?: string | null;
  monthsToComplete?: number | null;
};

// landscape.tbl_waterfall
// Primary Key: waterfall_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface Waterfall {
  waterfallId: number;
  projectId: number;
  waterfallName: string;
  tiers: any;
  /** Default: true */
  isActive: boolean | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_waterfall (excludes auto-generated fields)
export type WaterfallInsert = {
  waterfallId: number;
  projectId: number;
  waterfallName: string;
  tiers: any;
  isActive?: boolean | null;
};

// landscape.tbl_waterfall_tier
// Primary Key: tier_id
// Foreign Keys: equity_structure_id -> landscape.tbl_equity_structure.equity_structure_id
export interface WaterfallTier {
  /** Default: nextval('tbl_waterfall_tier_tier_id_seq'::regclass) */
  tierId: number;
  equityStructureId: number;
  tierNumber: number;
  tierDescription: string | null;
  hurdleType: string | null;
  hurdleRate: number | null;
  lpSplitPct: number | null;
  gpSplitPct: number | null;
  /** Default: false */
  hasCatchUp: boolean | null;
  catchUpPct: number | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
  projectId: number | null;
  tierName: string | null;
  irrThresholdPct: number | null;
  equityMultipleThreshold: number | null;
  /** Default: false */
  isPariPassu: boolean | null;
  /** Default: false */
  isLookbackTier: boolean | null;
  catchUpToPct: number | null;
  /** Default: true */
  isActive: boolean | null;
  displayOrder: number | null;
}

// Insert type for landscape.tbl_waterfall_tier (excludes auto-generated fields)
export type WaterfallTierInsert = {
  equityStructureId: number;
  tierNumber: number;
  tierDescription?: string | null;
  hurdleType?: string | null;
  hurdleRate?: number | null;
  lpSplitPct?: number | null;
  gpSplitPct?: number | null;
  hasCatchUp?: boolean | null;
  catchUpPct?: number | null;
  projectId?: number | null;
  tierName?: string | null;
  irrThresholdPct?: number | null;
  equityMultipleThreshold?: number | null;
  isPariPassu?: boolean | null;
  isLookbackTier?: boolean | null;
  catchUpToPct?: number | null;
  isActive?: boolean | null;
  displayOrder?: number | null;
};

// landscape.tbl_zoning_control
// Primary Key: zoning_control_id
export interface ZoningControl {
  /** Default: nextval('tbl_zoning_control_zoning_control_id_seq'::regclass) */
  zoningControlId: number;
  jurisdictionId: number | null;
  zoningCode: string;
  landuseCode: string;
  siteCoveragePct: number | null;
  siteFar: number | null;
  maxStories: number | null;
  maxHeightFt: number | null;
  parkingRatioPer1000sf: number | null;
  parkingStallSf: number | null;
  siteCommonAreaPct: number | null;
  parkingSharingFlag: boolean | null;
  parkingStructuredFlag: boolean | null;
  setbackNotes: string | null;
  scenarioId: string | null;
  /** Default: CURRENT_DATE */
  validFrom: string | null;
  validTo: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_zoning_control (excludes auto-generated fields)
export type ZoningControlInsert = {
  jurisdictionId?: number | null;
  zoningCode: string;
  landuseCode: string;
  siteCoveragePct?: number | null;
  siteFar?: number | null;
  maxStories?: number | null;
  maxHeightFt?: number | null;
  parkingRatioPer1000sf?: number | null;
  parkingStallSf?: number | null;
  siteCommonAreaPct?: number | null;
  parkingSharingFlag?: boolean | null;
  parkingStructuredFlag?: boolean | null;
  setbackNotes?: string | null;
  scenarioId?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
};

// landscape.tester_feedback
// Primary Key: id
// Foreign Keys: duplicate_of_id -> landscape.tester_feedback.id, user_id -> landscape.auth_user.id
export interface TesterFeedback {
  id: number;
  pageUrl: string;
  pagePath: string;
  projectId: number | null;
  projectName: string | null;
  feedbackType: string;
  message: string;
  adminNotes: string;
  createdAt: string;
  updatedAt: string;
  userId: number;
  status: string;
  internalId: string;
  category: string | null;
  affectedModule: string | null;
  landscaperSummary: string | null;
  landscaperRawChat: any;
  browserContext: any;
  duplicateOfId: number | null;
  reportCount: number;
  adminResponse: string | null;
  adminRespondedAt: string | null;
}

// landscape.type_lot_product
// Primary Key: product_id, type_id
// Foreign Keys: product_id -> landscape.res_lot_product.product_id, type_id -> landscape.lu_type.type_id
export interface TypeLotProduct {
  typeId: number;
  productId: number;
}

// landscape.user_profile
// Primary Key: id
// Foreign Keys: user_id -> landscape.auth_user.id
export interface UserProfile {
  /** Default: nextval('user_profile_id_seq'::regclass) */
  id: number;
  userId: number;
  bio: string | null;
  avatarUrl: string | null;
  /** Default: 'UTC'::character varying */
  timezone: string | null;
  /** Default: '{}'::jsonb */
  preferences: any | null;
}

// Insert type for landscape.user_profile (excludes auto-generated fields)
export type UserProfileInsert = {
  userId: number;
  bio?: string | null;
  avatarUrl?: string | null;
  timezone?: string | null;
  preferences?: any | null;
};

// landscape.user_settings
// Primary Key: user_id
export interface UserSettings {
  userId: number;
  tierLevel: string;
  createdAt: string;
  updatedAt: string;
}

// landscape.v_ai_review_summary
export interface VAiReviewSummary {
  projectId: number | null;
  projectName: string | null;
  totalReviews: number | null;
  lastReviewDate: string | null;
  fieldUpdatesCount: number | null;
  aiLastReviewed: string | null;
}

// landscape.v_contact_projects
export interface VContactProjects {
  contactId: number | null;
  contactName: string | null;
  contactType: string | null;
  companyName: string | null;
  projectId: number | null;
  projectName: string | null;
  projectTypeCode: string | null;
  projectIsActive: boolean | null;
  roleLabel: string | null;
  roleCategory: string | null;
  isPrimary: boolean | null;
  assignedAt: string | null;
}

// landscape.v_contact_relationships
export interface VContactRelationships {
  relationshipId: number | null;
  cabinetId: number | null;
  contactId: number | null;
  relatedToId: number | null;
  relationshipType: string | null;
  roleTitle: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean | null;
  contactName: string | null;
  contactType: string | null;
  relatedToName: string | null;
  relatedToType: string | null;
}

// landscape.v_lease_summary
export interface VLeaseSummary {
  projectId: number | null;
  projectName: string | null;
  totalLeases: number | null;
  contractLeases: number | null;
  speculativeLeases: number | null;
  totalLeasedSf: number | null;
  occupiedSf: number | null;
  occupancyPct: number | null;
}

// landscape.v_project_contacts
export interface VProjectContacts {
  contactId: number | null;
  projectId: number | null;
  contactRole: string | null;
  roleDisplayName: string | null;
  roleDisplayOrder: number | null;
  contactName: string | null;
  title: string | null;
  company: string | null;
  email: string | null;
  phoneDirect: string | null;
  phoneMobile: string | null;
  notes: string | null;
  sortOrder: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// landscape.v_project_contacts_detail
export interface VProjectContactsDetail {
  projectContactId: number | null;
  projectId: number | null;
  contactId: number | null;
  roleId: number | null;
  isPrimary: boolean | null;
  isBillingContact: boolean | null;
  assignmentNotes: string | null;
  assignedAt: string | null;
  contactName: string | null;
  displayName: string | null;
  contactType: string | null;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  phoneMobile: string | null;
  roleCode: string | null;
  roleLabel: string | null;
  roleCategory: string | null;
  roleDisplayOrder: number | null;
  projectName: string | null;
}

// landscape.v_rent_roll
export interface VRentRoll {
  leaseId: number | null;
  projectId: number | null;
  tenantName: string | null;
  suiteNumber: string | null;
  leaseStatus: string | null;
  leaseType: string | null;
  leasedSf: number | null;
  leaseCommencementDate: string | null;
  leaseExpirationDate: string | null;
  leaseTermMonths: number | null;
  baseRentPsfAnnual: number | null;
  baseRentAnnual: number | null;
  baseRentMonthly: number | null;
  renewalProbabilityPct: number | null;
  monthsToExpiration: number | null;
}

// landscape.v_sales_comparables_full
export interface VSalesComparablesFull {
  comparableId: number | null;
  projectId: number | null;
  compNumber: number | null;
  propertyName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  saleDate: string | null;
  salePrice: number | null;
  pricePerUnit: number | null;
  pricePerSf: number | null;
  yearBuilt: number | null;
  units: number | null;
  buildingSf: string | null;
  capRate: string | null;
  grm: number | null;
  distanceFromSubject: string | null;
  unitMix: any | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  latitude: number | null;
  longitude: number | null;
  unitCount: number | null;
  costarCompId: string | null;
  priceStatus: string | null;
  compStatus: string | null;
  saleType: string | null;
  saleConditions: string | null;
  holdPeriodMonths: number | null;
  daysOnMarket: number | null;
  askingPrice: number | null;
  transferTax: number | null;
  documentNumber: string | null;
  escrowLengthDays: number | null;
  percentLeasedAtSale: number | null;
  actualCapRate: number | null;
  proFormaCapRate: number | null;
  gim: number | null;
  noiAtSale: number | null;
  grossIncomeAtSale: number | null;
  financingType: string | null;
  financingLender: string | null;
  financingAmount: number | null;
  financingRate: number | null;
  financingTermMonths: number | null;
  loanToValue: number | null;
  assumedFinancing: boolean | null;
  recordedBuyer: string | null;
  trueBuyer: string | null;
  buyerContact: string | null;
  buyerType: string | null;
  recordedSeller: string | null;
  trueSeller: string | null;
  sellerContact: string | null;
  sellerType: string | null;
  buyerBrokerCompany: string | null;
  buyerBrokerName: string | null;
  buyerBrokerPhone: string | null;
  listingBrokerCompany: string | null;
  listingBrokerName: string | null;
  listingBrokerPhone: string | null;
  noBrokerDeal: boolean | null;
  propertyType: string | null;
  propertySubtype: string | null;
  buildingClass: string | null;
  costarStarRating: number | null;
  locationType: string | null;
  numBuildings: number | null;
  numFloors: number | null;
  typicalFloorSf: number | null;
  tenancyType: string | null;
  ownerOccupied: boolean | null;
  avgUnitSizeSf: number | null;
  unitsPerAcre: number | null;
  parkingSpaces: number | null;
  parkingRatio: number | null;
  parkingType: string | null;
  elevators: number | null;
  zoning: string | null;
  constructionType: string | null;
  roofType: string | null;
  hvacType: string | null;
  sprinklered: boolean | null;
  landAreaSf: number | null;
  landAreaAcres: number | null;
  farAllowed: number | null;
  farActual: number | null;
  numParcels: number | null;
  topography: string | null;
  utilitiesAvailable: string | null;
  entitlements: string | null;
  environmentalIssues: string | null;
  totalAssessedValue: number | null;
  landAssessedValue: number | null;
  improvedAssessedValue: number | null;
  assessmentYear: number | null;
  taxAmount: number | null;
  taxPerUnit: number | null;
  percentImproved: number | null;
  metroMarket: string | null;
  submarket: string | null;
  county: string | null;
  cbsa: string | null;
  csa: string | null;
  dma: string | null;
  walkScore: number | null;
  transitScore: number | null;
  bikeScore: number | null;
  dataSource: string | null;
  verificationStatus: string | null;
  verificationSource: string | null;
  verificationDate: string | null;
  transactionNotes: string | null;
  internalNotes: string | null;
  isPortfolioSale: boolean | null;
  portfolioName: string | null;
  portfolioPropertyCount: number | null;
  priceAllocationMethod: string | null;
  allocatedPrice: number | null;
  siteAmenities: any | null;
  extraData: any | null;
  rawImportData: any | null;
  unitMixCount: number | null;
  totalUnitsFromMix: number | null;
  tenantCount: number | null;
  totalLeasedSf: number | null;
  priorSalesCount: number | null;
  hasIndustrialData: boolean | null;
  hasHospitalityData: boolean | null;
  hasLandData: boolean | null;
  hasSelfStorageData: boolean | null;
  hasRetailData: boolean | null;
  hasOfficeData: boolean | null;
  hasSpecialtyData: boolean | null;
  hasManufacturedData: boolean | null;
}

// landscape.vw_absorption_with_dependencies
export interface AbsorptionWithDependencies {
  absorptionId: number | null;
  projectId: number | null;
  areaId: number | null;
  phaseId: number | null;
  parcelId: number | null;
  revenueStreamName: string | null;
  revenueCategory: string | null;
  startPeriod: number | null;
  periodsToComplete: number | null;
  timingMethod: string | null;
  unitsPerPeriod: number | null;
  totalUnits: number | null;
  basePricePerUnit: number | null;
  priceEscalationPct: number | null;
  dependencyId: number | null;
  triggerEvent: string | null;
  triggerValue: number | null;
  offsetPeriods: number | null;
  isHardDependency: boolean | null;
  hasDependency: boolean | null;
  dependencySummary: string | null;
}

// landscape.vw_acreage_allocation
export interface AcreageAllocation {
  allocationId: number | null;
  projectId: number | null;
  projectName: string | null;
  phaseId: number | null;
  parcelId: number | null;
  allocationTypeId: number | null;
  allocationTypeCode: string | null;
  allocationTypeName: string | null;
  isDevelopable: boolean | null;
  acres: number | null;
  sourceDocId: number | null;
  sourceDocument: string | null;
  sourcePage: number | null;
  confidenceScore: number | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// landscape.vw_budget_grid_items
export interface BudgetGridItems {
  factId: number | null;
  budgetId: number | null;
  budgetVersion: string | null;
  projectId: number | null;
  divisionId: number | null;
  tier: number | null;
  divisionCode: string | null;
  divisionName: string | null;
  parentDivisionId: number | null;
  categoryId: number | null;
  costCode: string | null;
  scope: string | null;
  categoryPath: string | null;
  categoryDepth: number | null;
  categorySource: string | null;
  categoryL1Name: string | null;
  categoryL2Name: string | null;
  categoryL3Name: string | null;
  categoryL4Name: string | null;
  activity: string | null;
  uomCode: string | null;
  uomDisplay: string | null;
  qty: number | null;
  rate: number | null;
  amount: number | null;
  calculatedAmount: number | null;
  startDate: string | null;
  endDate: string | null;
  startPeriod: number | null;
  periodsToComplete: number | null;
  endPeriod: number | null;
  escalationRate: number | null;
  contingencyPct: number | null;
  timingMethod: string | null;
  contractNumber: string | null;
  purchaseOrder: string | null;
  isCommitted: boolean | null;
  confidenceLevel: string | null;
  vendorContactId: number | null;
  vendorName: string | null;
  notes: string | null;
  createdAt: string | null;
}

// landscape.vw_budget_variance
export interface BudgetVariance {
  factId: number | null;
  categoryId: number | null;
  projectId: number | null;
  containerId: number | null;
  originalAmount: number | null;
  currentAmount: number | null;
  varianceAmount: number | null;
  variancePercent: number | null;
  varianceStatus: string | null;
}

// landscape.vw_budget_with_dependencies
export interface BudgetWithDependencies {
  budgetItemId: number | null;
  projectId: number | null;
  structureId: number | null;
  scope: string | null;
  category: string | null;
  description: string | null;
  amount: number | null;
  quantity: number | null;
  costPerUnit: number | null;
  notes: string | null;
  timingMethod: string | null;
  timingLocked: boolean | null;
  startPeriod: number | null;
  periodsToComplete: number | null;
  sCurveProfile: string | null;
  actualAmount: number | null;
  varianceAmount: number | null;
  variancePct: number | null;
  dependencyId: number | null;
  triggerEvent: string | null;
  triggerValue: number | null;
  offsetPeriods: number | null;
  isHardDependency: boolean | null;
  hasDependency: boolean | null;
  dependencySummary: string | null;
}

// landscape.vw_category_hierarchy
export interface CategoryHierarchy {
  categoryId: number | null;
  parentId: number | null;
  categoryName: string | null;
  lifecycleStages: any[] | null;
  tags: any | null;
  sortOrder: number | null;
  isActive: boolean | null;
  depth: number | null;
  path: any[] | null;
  displayLabel: string | null;
  fullPath: string | null;
}

// landscape.vw_debt_balance_summary
export interface DebtBalanceSummary {
  loanId: number | null;
  projectId: number | null;
  loanName: string | null;
  loanType: string | null;
  structureType: string | null;
  commitmentAmount: number | null;
  interestRatePct: number | null;
  seniority: number | null;
  periodId: number | null;
  periodStartDate: string | null;
  periodEndDate: string | null;
  drawAmount: number | null;
  cumulativeDrawn: number | null;
  availableRemaining: number | null;
  beginningBalance: number | null;
  interestAmount: number | null;
  cumulativeInterest: number | null;
  principalPayment: number | null;
  endingBalance: number | null;
  utilizationPct: number | null;
}

// landscape.vw_doc_media_summary
export interface DocMediaSummary {
  docId: number | null;
  docName: string | null;
  docType: string | null;
  projectId: number | null;
  mediaScanStatus: string | null;
  mediaScanJson: any | null;
  totalMedia: number | null;
  pendingCount: number | null;
  extractedCount: number | null;
  badgeCounts: any | null;
}

// landscape.vw_extraction_mapping_stats
export interface ExtractionMappingStats {
  mappingId: number | null;
  documentType: string | null;
  sourcePattern: string | null;
  targetTable: string | null;
  targetField: string | null;
  confidence: string | null;
  isActive: boolean | null;
  timesExtracted: number | null;
  projectsUsed: number | null;
  documentsProcessed: number | null;
  avgConfidenceScore: number | null;
  writeRate: number | null;
  acceptanceRate: number | null;
  lastUsedAt: string | null;
}

// landscape.vw_item_dependency_status
export interface ItemDependencyStatus {
  dependencyId: number | null;
  dependentItemType: string | null;
  dependentItemTable: string | null;
  dependentItemId: number | null;
  triggerEvent: string | null;
  triggerValue: number | null;
  offsetPeriods: number | null;
  isHardDependency: boolean | null;
  triggerStartPeriod: number | null;
  triggerCompletionPeriod: number | null;
  calculatedStartPeriod: number | null;
  calculatedAt: string | null;
}

// landscape.vw_lease_expiration_schedule
export interface LeaseExpirationSchedule {
  rentRollId: number | null;
  projectId: number | null;
  tenantName: string | null;
  spaceType: string | null;
  leaseEndDate: string | null;
  leasedSf: number | null;
  baseRentPsfAnnual: number | null;
  annualRent: number | null;
  marketRentPsfAnnual: number | null;
  markToMarketPsf: number | null;
  markToMarketAnnual: number | null;
  renewalProbability: number | null;
  downtimeMonths: number | null;
  expectedRolloverCost: number | null;
  expectedFreeRentMonths: number | null;
  expectedVacancyLoss: number | null;
  leaseStatus: string | null;
}

// landscape.vw_map_plan_parcels
export interface MapPlanParcels {
  projectId: number | null;
  parcelId: number | null;
  parcelCode: string | null;
  landuseCode: string | null;
  landuseType: string | null;
  acresGross: number | null;
  unitsTotal: number | null;
  areaNo: number | null;
  phaseNo: number | null;
  parcelNo: number | null;
  geom: string /* geometry enum */ | null;
  sourceDoc: string | null;
  confidence: number | null;
  version: number | null;
}

// landscape.vw_map_tax_parcels
export interface MapTaxParcels {
  taxParcelId: string | null;
  ownerName: string | null;
  situsAddress: string | null;
  acres: number | null;
  geom: string /* geometry enum */ | null;
}

// landscape.vw_mkt_absorption_by_lot_width
export interface MktAbsorptionByLotWidth {
  lotWidthFt: number | null;
  effectiveDate: string | null;
  projectCount: number | null;
  avgMonthlyRate: number | null;
  avg_3mRate: number | null;
  rateP25: number | null;
  rateMedian: number | null;
  rateP75: number | null;
  avgPrice: number | null;
  avgMosVdl: number | null;
}

// landscape.vw_mkt_absorption_by_lu_product
export interface MktAbsorptionByLuProduct {
  luProductId: number | null;
  productCode: string | null;
  effectiveDate: string | null;
  projectCount: number | null;
  avgMonthlyRate: number | null;
  avg_3mRate: number | null;
  avgPrice: number | null;
}

// landscape.vw_mkt_current_projects
export interface MktCurrentProjects {
  recordId: number | null;
  sourceProjectId: string | null;
  sourceSubdivisionId: string | null;
  effectiveDate: string | null;
  sourceFile: string | null;
  surveyPeriod: string | null;
  projectName: string | null;
  masterPlanName: string | null;
  masterPlanId: string | null;
  masterPlanDeveloper: string | null;
  builderName: string | null;
  parentBuilder: string | null;
  status: string | null;
  productType: string | null;
  productStyle: string | null;
  isActiveAdult: boolean | null;
  characteristics: string | null;
  lotSizeSf: number | null;
  lotWidthFt: number | null;
  lotDepthFt: number | null;
  lotDimensions: string | null;
  unitSizeMinSf: number | null;
  unitSizeMaxSf: number | null;
  unitSizeAvgSf: number | null;
  priceMin: number | null;
  priceMax: number | null;
  priceAvg: number | null;
  pricePerSfAvg: number | null;
  priceChangeDate: string | null;
  unitsPlanned: number | null;
  unitsSold: number | null;
  unitsRemaining: number | null;
  qmiCount: number | null;
  openDate: string | null;
  soldOutDate: string | null;
  salesRateMonthly: number | null;
  salesRate_3mAvg: number | null;
  salesRate_6mAvg: number | null;
  salesRate_12mAvg: number | null;
  salesChangeDate: string | null;
  annualStarts: number | null;
  annualClosings: number | null;
  quarterlyStarts: number | null;
  quarterlyClosings: number | null;
  pipelineExcavation: number | null;
  pipelineSurveyStakes: number | null;
  pipelineStreetPaving: number | null;
  pipelineStreetsIn: number | null;
  pipelineVdl: number | null;
  pipelineVacantLand: number | null;
  pipelineUnderConstruction: number | null;
  pipelineFinishedVacant: number | null;
  modelsCount: number | null;
  occupiedCount: number | null;
  futureInventoryCount: number | null;
  mosVdl: number | null;
  mosInventory: number | null;
  mosFinishedVacant: number | null;
  incentiveQmiPct: number | null;
  incentiveQmiAmt: number | null;
  incentiveQmiType: string | null;
  incentiveTbbPct: number | null;
  incentiveTbbAmt: number | null;
  incentiveTbbType: string | null;
  incentiveBrokerPct: number | null;
  incentiveBrokerAmt: number | null;
  incentiveBrokerType: string | null;
  hoaFeeMonthly: number | null;
  hoaFee_2Monthly: number | null;
  hoaFeePerSqft: number | null;
  assessmentRate: number | null;
  assessmentDescription: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  city: string | null;
  zipCode: string | null;
  county: string | null;
  countyFips: number | null;
  cbsaName: string | null;
  cbsaCode: number | null;
  state: string | null;
  boundaryNames: string | null;
  schoolDistrict: string | null;
  schoolElementary: string | null;
  schoolRatingElementary: string | null;
  schoolMiddle: string | null;
  schoolRatingMiddle: string | null;
  schoolHigh: string | null;
  schoolRatingHigh: string | null;
  websiteUrl: string | null;
  officePhone: string | null;
  luFamilyId: number | null;
  luDensityId: number | null;
  luTypeId: number | null;
  luProductId: number | null;
  luLinkageMethod: string | null;
  luLinkageConfidence: number | null;
  ingestionTimestamp: string | null;
  updatedAt: string | null;
  sourceId: number | null;
}

// landscape.vw_mkt_landscaper_summary
export interface MktLandscaperSummary {
  city: string | null;
  lotWidthFt: number | null;
  activeCommunities: number | null;
  totalUnitsAvailable: number | null;
  avgAbsorptionRate: number | null;
  avgPrice: number | null;
  marketEntryPrice: number | null;
  marketCeilingPrice: number | null;
}

// landscape.vw_mkt_pricing_by_city_lotwidth
export interface MktPricingByCityLotwidth {
  city: string | null;
  lotWidthFt: number | null;
  effectiveDate: string | null;
  projectCount: number | null;
  avgPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  avgPricePsf: number | null;
}

// landscape.vw_multifamily_lease_expirations
export interface MultifamilyLeaseExpirations {
  leaseId: number | null;
  unitId: number | null;
  unitNumber: string | null;
  buildingName: string | null;
  unitType: string | null;
  projectId: number | null;
  projectName: string | null;
  residentName: string | null;
  leaseStartDate: string | null;
  leaseEndDate: string | null;
  leaseTermMonths: number | null;
  baseRentMonthly: number | null;
  effectiveRentMonthly: number | null;
  leaseStatus: string | null;
  noticeDate: string | null;
  noticeToVacateDays: number | null;
  isRenewal: boolean | null;
  daysUntilExpiration: number | null;
  expirationPriority: string | null;
  marketRent: number | null;
  potentialRentIncrease: number | null;
  renewalStatus: string | null;
}

// landscape.vw_multifamily_occupancy_summary
export interface MultifamilyOccupancySummary {
  projectId: number | null;
  projectName: string | null;
  unitType: string | null;
  totalUnits: number | null;
  occupiedUnits: number | null;
  vacantUnits: number | null;
  physicalOccupancyPct: number | null;
  totalMarketRent: number | null;
  totalActualRent: number | null;
  economicOccupancyPct: number | null;
  totalLossToLease: number | null;
  avgMarketRent: number | null;
  avgActualRent: number | null;
  renovatedUnits: number | null;
  renewalLeases: number | null;
  renewalRatePct: number | null;
}

// landscape.vw_multifamily_project_summary
export interface MultifamilyProjectSummary {
  projectId: number | null;
  projectName: string | null;
  totalUnits: number | null;
  occupiedUnits: number | null;
  physicalOccupancyPct: number | null;
  totalMarketRentPotential: number | null;
  totalActualRent: number | null;
  totalLossToLease: number | null;
  unitTypeCount: number | null;
  renovatedUnits: number | null;
  totalTurnsYtd: number | null;
  avgTurnCost: number | null;
  avgTurnDays: number | null;
}

// landscape.vw_multifamily_turn_metrics
export interface MultifamilyTurnMetrics {
  projectId: number | null;
  projectName: string | null;
  unitType: string | null;
  totalTurns: number | null;
  completedTurns: number | null;
  avgVacantDays: number | null;
  avgMakeReadyCost: number | null;
  avgCleaningCost: number | null;
  avgPaintingCost: number | null;
  avgFlooringCost: number | null;
  avgApplianceCost: number | null;
  firstTurnDate: string | null;
  lastTurnDate: string | null;
  avgMakeReadyDays: number | null;
  avgTotalTurnDays: number | null;
}

// landscape.vw_multifamily_unit_status
export interface MultifamilyUnitStatus {
  unitId: number | null;
  projectId: number | null;
  unitNumber: string | null;
  buildingName: string | null;
  unitType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  marketRent: number | null;
  renovationStatus: string | null;
  leaseId: number | null;
  residentName: string | null;
  leaseStartDate: string | null;
  leaseEndDate: string | null;
  baseRentMonthly: number | null;
  effectiveRentMonthly: number | null;
  leaseStatus: string | null;
  isRenewal: boolean | null;
  occupancyStatus: string | null;
  lossToLease: number | null;
  lossToLeasePct: number | null;
  daysUntilExpiration: number | null;
}

// landscape.vw_parcels_with_sales
export interface ParcelsWithSales {
  parcelId: number | null;
  parcelCode: string | null;
  projectId: number | null;
  areaId: number | null;
  devPhaseId: number | null;
  units: number | null;
  acres: number | null;
  salePhaseCode: string | null;
  customSaleDate: string | null;
  hasSaleOverrides: boolean | null;
  useTypeCode: string | null;
  useTypeName: string | null;
  productCode: string | null;
  productName: string | null;
  basePricePerUnit: number | null;
  growthRate: number | null;
  uomCode: string | null;
  pricingBaseDate: string | null;
  saleId: number | null;
  saleDate: string | null;
  buyerName: string | null;
  buyerEntity: string | null;
  saleStatus: string | null;
  grossValue: number | null;
  netProceeds: number | null;
  commissionPct: number | null;
  closingCostPerUnit: number | null;
  onsiteCostPct: number | null;
}

// landscape.vw_permit_annual_by_jurisdiction
export interface PermitAnnualByJurisdiction {
  jurisdictionName: string | null;
  permitYear: number | null;
  annualPermitsSf: number | null;
  annualPermitsTotal: number | null;
  sourceId: number | null;
}

// landscape.vw_permit_msa_monthly
export interface PermitMsaMonthly {
  permitMonth: string | null;
  permitYear: number | null;
  msaPermitsSf: number | null;
  msaPermitsTotal: number | null;
  jurisdictionCount: number | null;
  sourceId: number | null;
}

// landscape.vw_project_acquisition_summary
export interface ProjectAcquisitionSummary {
  projectId: number | null;
  projectName: string | null;
  askingPrice: number | null;
  hasClosingDate: boolean | null;
  closingDate: string | null;
  totalAcquisitionCost: number | null;
  landCost: number | null;
  totalFees: number | null;
  totalDeposits: number | null;
  totalCredits: number | null;
  effectiveAcquisitionPrice: number | null;
  priceSource: string | null;
}

// landscape.vw_revenue_timeline
export interface RevenueTimeline {
  absorptionId: number | null;
  projectId: number | null;
  revenueStreamName: string | null;
  revenueCategory: string | null;
  totalUnits: number | null;
  basePricePerUnit: number | null;
  priceEscalationPct: number | null;
  periodId: number | null;
  periodStartDate: string | null;
  periodEndDate: string | null;
  unitsSoldThisPeriod: number | null;
  cumulativeUnitsSold: number | null;
  unitsRemaining: number | null;
  averagePriceThisPeriod: number | null;
  grossRevenue: number | null;
  salesCommission: number | null;
  closingCosts: number | null;
  netRevenue: number | null;
  pctComplete: number | null;
}

// landscape.vw_zoning_glossary_export
export interface ZoningGlossaryExport {
  glossaryId: string | null;
  jurisdictionDisplay: string | null;
  jurisdictionCity: string | null;
  jurisdictionCounty: string | null;
  jurisdictionState: string | null;
  familyName: string | null;
  districtCode: string | null;
  districtName: string | null;
  localCodeRaw: string | null;
  localCodeCanonical: string | null;
  codeTokenKind: string /* code_token_kind enum */ | null;
  codeTokenConfidence: number | null;
  mappedUse: string | null;
  allowance: string | null;
  purposeText: string | null;
  intentText: string | null;
  conditionsText: string | null;
  developmentStandards: any | null;
  useStandardRefs: any | null;
  definitionsRefs: any | null;
  narrativeSectionRef: string | null;
  narrativeSrcUrl: string | null;
  sourceDocUrl: string | null;
  effectiveDate: string | null;
  isActive: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// landscape.zonda_subdivisions
// Primary Key: id
export interface ZondaSubdivisions {
  /** Default: nextval('zonda_subdivisions_id_seq'::regclass) */
  id: number;
  /** Default: '38060'::character varying */
  msaCode: string;
  projectName: string;
  builder: string | null;
  mpc: string | null;
  propertyType: string | null;
  style: string | null;
  lotSizeSf: number | null;
  lotWidth: number | null;
  lotDepth: number | null;
  productCode: string | null;
  unitsSold: number | null;
  unitsRemaining: number | null;
  sizeMinSf: number | null;
  sizeMaxSf: number | null;
  sizeAvgSf: number | null;
  priceMin: number | null;
  priceMax: number | null;
  priceAvg: number | null;
  latitude: number | null;
  longitude: number | null;
  specialFeatures: string | null;
  sourceFile: string | null;
  sourceDate: string | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.zonda_subdivisions (excludes auto-generated fields)
export type ZondaSubdivisionsInsert = {
  msaCode?: string;
  projectName: string;
  builder?: string | null;
  mpc?: string | null;
  propertyType?: string | null;
  style?: string | null;
  lotSizeSf?: number | null;
  lotWidth?: number | null;
  lotDepth?: number | null;
  productCode?: string | null;
  unitsSold?: number | null;
  unitsRemaining?: number | null;
  sizeMinSf?: number | null;
  sizeMaxSf?: number | null;
  sizeAvgSf?: number | null;
  priceMin?: number | null;
  priceMax?: number | null;
  priceAvg?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  specialFeatures?: string | null;
  sourceFile?: string | null;
  sourceDate?: string | null;
};

// Table name constants
export const TABLE_NAMES = {
  GLOSSARY_ZONING: 'land_v2.glossary_zoning' as const,
  VW_ZONING_GLOSSARY_EXPORT: 'land_v2.vw_zoning_glossary_export' as const,
  _MIGRATIONS: 'landscape._migrations' as const,
  AI_CORRECTION_LOG: 'landscape.ai_correction_log' as const,
  AI_DEBUG_LOG: 'landscape.ai_debug_log' as const,
  AI_DOCUMENT_SUBTYPES: 'landscape.ai_document_subtypes' as const,
  AI_EXTRACTION_STAGING: 'landscape.ai_extraction_staging' as const,
  AI_EXTRACTION_WARNINGS: 'landscape.ai_extraction_warnings' as const,
  AI_INGESTION_HISTORY: 'landscape.ai_ingestion_history' as const,
  AI_REVIEW_HISTORY: 'landscape.ai_review_history' as const,
  AUTH_GROUP: 'landscape.auth_group' as const,
  AUTH_GROUP_PERMISSIONS: 'landscape.auth_group_permissions' as const,
  AUTH_PERMISSION: 'landscape.auth_permission' as const,
  AUTH_USER: 'landscape.auth_user' as const,
  AUTH_USER_GROUPS: 'landscape.auth_user_groups' as const,
  AUTH_USER_USER_PERMISSIONS: 'landscape.auth_user_user_permissions' as const,
  BMK_ABSORPTION_VELOCITY: 'landscape.bmk_absorption_velocity' as const,
  BMK_BUILDER_COMMUNITIES: 'landscape.bmk_builder_communities' as const,
  BMK_BUILDER_INVENTORY: 'landscape.bmk_builder_inventory' as const,
  BMK_BUILDER_PLANS: 'landscape.bmk_builder_plans' as const,
  BMK_RESALE_CLOSINGS: 'landscape.bmk_resale_closings' as const,
  CORE_CATEGORY_LIFECYCLE_STAGES: 'landscape.core_category_lifecycle_stages' as const,
  CORE_CATEGORY_TAG_LIBRARY: 'landscape.core_category_tag_library' as const,
  CORE_DOC: 'landscape.core_doc' as const,
  CORE_DOC_ATTR_ENUM: 'landscape.core_doc_attr_enum' as const,
  CORE_DOC_ATTR_LOOKUP: 'landscape.core_doc_attr_lookup' as const,
  CORE_DOC_FOLDER: 'landscape.core_doc_folder' as const,
  CORE_DOC_FOLDER_LINK: 'landscape.core_doc_folder_link' as const,
  CORE_DOC_MEDIA: 'landscape.core_doc_media' as const,
  CORE_DOC_MEDIA_LINK: 'landscape.core_doc_media_link' as const,
  CORE_DOC_SMARTFILTER: 'landscape.core_doc_smartfilter' as const,
  CORE_DOC_TEXT: 'landscape.core_doc_text' as const,
  CORE_FIN_BUDGET_VERSION: 'landscape.core_fin_budget_version' as const,
  CORE_FIN_CATEGORY_UOM: 'landscape.core_fin_category_uom' as const,
  CORE_FIN_CONFIDENCE_POLICY: 'landscape.core_fin_confidence_policy' as const,
  CORE_FIN_CROSSWALK_AD: 'landscape.core_fin_crosswalk_ad' as const,
  CORE_FIN_CROSSWALK_AE: 'landscape.core_fin_crosswalk_ae' as const,
  CORE_FIN_CURVE: 'landscape.core_fin_curve' as const,
  CORE_FIN_DIVISION_APPLICABILITY: 'landscape.core_fin_division_applicability' as const,
  CORE_FIN_FACT_ACTUAL: 'landscape.core_fin_fact_actual' as const,
  CORE_FIN_FACT_BUDGET: 'landscape.core_fin_fact_budget' as const,
  CORE_FIN_FACT_TAGS: 'landscape.core_fin_fact_tags' as const,
  CORE_FIN_FUNDING_SOURCE: 'landscape.core_fin_funding_source' as const,
  CORE_FIN_GROWTH_RATE_SETS: 'landscape.core_fin_growth_rate_sets' as const,
  CORE_FIN_GROWTH_RATE_STEPS: 'landscape.core_fin_growth_rate_steps' as const,
  CORE_FIN_UOM: 'landscape.core_fin_uom' as const,
  CORE_ITEM_BENCHMARK_LINK: 'landscape.core_item_benchmark_link' as const,
  CORE_LOOKUP_ITEM: 'landscape.core_lookup_item' as const,
  CORE_LOOKUP_LIST: 'landscape.core_lookup_list' as const,
  CORE_LOOKUP_VW: 'landscape.core_lookup_vw' as const,
  CORE_PLANNING_STANDARDS: 'landscape.core_planning_standards' as const,
  CORE_UNIT_COST_CATEGORY: 'landscape.core_unit_cost_category' as const,
  CORE_UNIT_COST_ITEM: 'landscape.core_unit_cost_item' as const,
  CORE_WORKSPACE_MEMBER: 'landscape.core_workspace_member' as const,
  DENSITY_CLASSIFICATION: 'landscape.density_classification' as const,
  DEVELOPER_FEES: 'landscape.developer_fees' as const,
  DJANGO_ADMIN_LOG: 'landscape.django_admin_log' as const,
  DJANGO_CONTENT_TYPE: 'landscape.django_content_type' as const,
  DJANGO_MIGRATIONS: 'landscape.django_migrations' as const,
  DJANGO_SESSION: 'landscape.django_session' as const,
  DMS_ASSERTION: 'landscape.dms_assertion' as const,
  DMS_ATTRIBUTES: 'landscape.dms_attributes' as const,
  DMS_DOC_TAG_ASSIGNMENTS: 'landscape.dms_doc_tag_assignments' as const,
  DMS_DOC_TAGS: 'landscape.dms_doc_tags' as const,
  DMS_EXTRACT_QUEUE: 'landscape.dms_extract_queue' as const,
  DMS_PROFILE_AUDIT: 'landscape.dms_profile_audit' as const,
  DMS_PROJECT_DOC_TYPES: 'landscape.dms_project_doc_types' as const,
  DMS_TEMPLATE_ATTRIBUTES: 'landscape.dms_template_attributes' as const,
  DMS_TEMPLATES: 'landscape.dms_templates' as const,
  DMS_UNMAPPED: 'landscape.dms_unmapped' as const,
  DMS_WORKSPACES: 'landscape.dms_workspaces' as const,
  DOC_EXTRACTED_FACTS: 'landscape.doc_extracted_facts' as const,
  DOC_GEO_TAG: 'landscape.doc_geo_tag' as const,
  DOC_PROCESSING_QUEUE: 'landscape.doc_processing_queue' as const,
  DOCUMENT_TABLES: 'landscape.document_tables' as const,
  EXTRACTION_COMMIT_SNAPSHOT: 'landscape.extraction_commit_snapshot' as const,
  GEOGRAPHY_COLUMNS: 'landscape.geography_columns' as const,
  GEOMETRY_COLUMNS: 'landscape.geometry_columns' as const,
  GIS_BOUNDARY_HISTORY: 'landscape.gis_boundary_history' as const,
  GIS_DOCUMENT_INGESTION: 'landscape.gis_document_ingestion' as const,
  GIS_MAPPING_HISTORY: 'landscape.gis_mapping_history' as const,
  GIS_PLAN_PARCEL: 'landscape.gis_plan_parcel' as const,
  GIS_PROJECT_BOUNDARY: 'landscape.gis_project_boundary' as const,
  GIS_TAX_PARCEL_REF: 'landscape.gis_tax_parcel_ref' as const,
  GLOSSARY_ZONING: 'landscape.glossary_zoning' as const,
  KNOWLEDGE_EMBEDDINGS: 'landscape.knowledge_embeddings' as const,
  KNOWLEDGE_ENTITIES: 'landscape.knowledge_entities' as const,
  KNOWLEDGE_FACTS: 'landscape.knowledge_facts' as const,
  KNOWLEDGE_INSIGHTS: 'landscape.knowledge_insights' as const,
  KNOWLEDGE_INTERACTIONS: 'landscape.knowledge_interactions' as const,
  KNOWLEDGE_SESSIONS: 'landscape.knowledge_sessions' as const,
  LAND_USE_PRICING: 'landscape.land_use_pricing' as const,
  LANDSCAPER_ABSORPTION_DETAIL: 'landscape.landscaper_absorption_detail' as const,
  LANDSCAPER_ACTIVITY: 'landscape.landscaper_activity' as const,
  LANDSCAPER_ADVICE: 'landscape.landscaper_advice' as const,
  LANDSCAPER_CHAT_EMBEDDING: 'landscape.landscaper_chat_embedding' as const,
  LANDSCAPER_CHAT_MESSAGE: 'landscape.landscaper_chat_message' as const,
  LANDSCAPER_CHAT_THREAD: 'landscape.landscaper_chat_thread' as const,
  LANDSCAPER_THREAD_MESSAGE: 'landscape.landscaper_thread_message' as const,
  LKP_BUILDING_CLASS: 'landscape.lkp_building_class' as const,
  LKP_BUYER_SELLER_TYPE: 'landscape.lkp_buyer_seller_type' as const,
  LKP_PRICE_STATUS: 'landscape.lkp_price_status' as const,
  LKP_SALE_TYPE: 'landscape.lkp_sale_type' as const,
  LU_ACREAGE_ALLOCATION_TYPE: 'landscape.lu_acreage_allocation_type' as const,
  LU_COM_SPEC: 'landscape.lu_com_spec' as const,
  LU_FAMILY: 'landscape.lu_family' as const,
  LU_LEASE_STATUS: 'landscape.lu_lease_status' as const,
  LU_LEASE_TYPE: 'landscape.lu_lease_type' as const,
  LU_MARKET: 'landscape.lu_market' as const,
  LU_MEDIA_CLASSIFICATION: 'landscape.lu_media_classification' as const,
  LU_PICKLIST_DISPLAY_CONFIG: 'landscape.lu_picklist_display_config' as const,
  LU_PROPERTY_SUBTYPE: 'landscape.lu_property_subtype' as const,
  LU_RECOVERY_STRUCTURE: 'landscape.lu_recovery_structure' as const,
  LU_RES_SPEC: 'landscape.lu_res_spec' as const,
  LU_SUBTYPE: 'landscape.lu_subtype' as const,
  LU_TYPE: 'landscape.lu_type' as const,
  MANAGEMENT_OVERHEAD: 'landscape.management_overhead' as const,
  MARKET_ACTIVITY: 'landscape.market_activity' as const,
  MARKET_ASSUMPTIONS: 'landscape.market_assumptions' as const,
  MARKET_COMPETITIVE_PROJECT_EXCLUSIONS: 'landscape.market_competitive_project_exclusions' as const,
  MARKET_COMPETITIVE_PROJECT_PRODUCTS: 'landscape.market_competitive_project_products' as const,
  MARKET_COMPETITIVE_PROJECTS: 'landscape.market_competitive_projects' as const,
  MKT_DATA_SOURCE_REGISTRY: 'landscape.mkt_data_source_registry' as const,
  MKT_NEW_HOME_PROJECT: 'landscape.mkt_new_home_project' as const,
  MKT_PERMIT_HISTORY: 'landscape.mkt_permit_history' as const,
  MUTATION_AUDIT_LOG: 'landscape.mutation_audit_log' as const,
  MV_DOC_SEARCH: 'landscape.mv_doc_search' as const,
  OPEX_BENCHMARK: 'landscape.opex_benchmark' as const,
  OPEX_LABEL_MAPPING: 'landscape.opex_label_mapping' as const,
  PENDING_MUTATIONS: 'landscape.pending_mutations' as const,
  PLANNING_DOC: 'landscape.planning_doc' as const,
  PROJECT_BOUNDARIES: 'landscape.project_boundaries' as const,
  PROJECT_JURISDICTION_MAPPING: 'landscape.project_jurisdiction_mapping' as const,
  PROJECT_LAND_USE: 'landscape.project_land_use' as const,
  PROJECT_LAND_USE_PRODUCT: 'landscape.project_land_use_product' as const,
  PROJECT_PARCEL_BOUNDARIES: 'landscape.project_parcel_boundaries' as const,
  REPORT_TEMPLATES: 'landscape.report_templates' as const,
  RES_LOT_PRODUCT: 'landscape.res_lot_product' as const,
  SALE_NAMES: 'landscape.sale_names' as const,
  SPATIAL_REF_SYS: 'landscape.spatial_ref_sys' as const,
  TBL_ABSORPTION_SCHEDULE: 'landscape.tbl_absorption_schedule' as const,
  TBL_ACQUISITION: 'landscape.tbl_acquisition' as const,
  TBL_ACREAGE_ALLOCATION: 'landscape.tbl_acreage_allocation' as const,
  TBL_ADDITIONAL_INCOME: 'landscape.tbl_additional_income' as const,
  TBL_AI_ADJUSTMENT_SUGGESTIONS: 'landscape.tbl_ai_adjustment_suggestions' as const,
  TBL_ALPHA_FEEDBACK: 'landscape.tbl_alpha_feedback' as const,
  TBL_ANALYSIS_DRAFT: 'landscape.tbl_analysis_draft' as const,
  TBL_ANALYSIS_TYPE_CONFIG: 'landscape.tbl_analysis_type_config' as const,
  TBL_APPROVAL: 'landscape.tbl_approval' as const,
  TBL_AREA: 'landscape.tbl_area' as const,
  TBL_ARTIFACT: 'landscape.tbl_artifact' as const,
  TBL_ARTIFACT_VERSION: 'landscape.tbl_artifact_version' as const,
  TBL_ASSUMPTION_SNAPSHOT: 'landscape.tbl_assumption_snapshot' as const,
  TBL_ASSUMPTIONRULE: 'landscape.tbl_assumptionrule' as const,
  TBL_BASE_RENT: 'landscape.tbl_base_rent' as const,
  TBL_BENCHMARK_AI_SUGGESTIONS: 'landscape.tbl_benchmark_ai_suggestions' as const,
  TBL_BENCHMARK_CONTINGENCY: 'landscape.tbl_benchmark_contingency' as const,
  TBL_BENCHMARK_TRANSACTION_COST: 'landscape.tbl_benchmark_transaction_cost' as const,
  TBL_BENCHMARK_UNIT_COST: 'landscape.tbl_benchmark_unit_cost' as const,
  TBL_BUDGET: 'landscape.tbl_budget' as const,
  TBL_BUDGET_FACT: 'landscape.tbl_budget_fact' as const,
  TBL_BUDGET_ITEMS: 'landscape.tbl_budget_items' as const,
  TBL_BUDGET_STRUCTURE: 'landscape.tbl_budget_structure' as const,
  TBL_BUDGET_TIMING: 'landscape.tbl_budget_timing' as const,
  TBL_CABINET: 'landscape.tbl_cabinet' as const,
  TBL_CALCULATION_PERIOD: 'landscape.tbl_calculation_period' as const,
  TBL_CAP_RATE_COMPS: 'landscape.tbl_cap_rate_comps' as const,
  TBL_CAPEX_RESERVE: 'landscape.tbl_capex_reserve' as const,
  TBL_CAPITAL_CALL: 'landscape.tbl_capital_call' as const,
  TBL_CAPITAL_RESERVES: 'landscape.tbl_capital_reserves' as const,
  TBL_CAPITALIZATION: 'landscape.tbl_capitalization' as const,
  TBL_CASHFLOW: 'landscape.tbl_cashflow' as const,
  TBL_CASHFLOW_SUMMARY: 'landscape.tbl_cashflow_summary' as const,
  TBL_CHANGELOG: 'landscape.tbl_changelog' as const,
  TBL_CLOSING_EVENT: 'landscape.tbl_closing_event' as const,
  TBL_COMMERCIAL_LEASE_ARCHIVE_20260506: 'landscape.tbl_commercial_lease_archive_20260506' as const,
  TBL_CONCEPT: 'landscape.tbl_concept' as const,
  TBL_CONCEPT_CATEGORY: 'landscape.tbl_concept_category' as const,
  TBL_CONCEPT_FIELD: 'landscape.tbl_concept_field' as const,
  TBL_CONTACT: 'landscape.tbl_contact' as const,
  TBL_CONTACT_RELATIONSHIP: 'landscape.tbl_contact_relationship' as const,
  TBL_CONTACT_ROLE: 'landscape.tbl_contact_role' as const,
  TBL_COST_ALLOCATION: 'landscape.tbl_cost_allocation' as const,
  TBL_COST_APPROACH: 'landscape.tbl_cost_approach' as const,
  TBL_COST_APPROACH_DEPRECIATION: 'landscape.tbl_cost_approach_depreciation' as const,
  TBL_DCF_ANALYSIS: 'landscape.tbl_dcf_analysis' as const,
  TBL_DEBT_DRAW_SCHEDULE: 'landscape.tbl_debt_draw_schedule' as const,
  TBL_DIVISION: 'landscape.tbl_division' as const,
  TBL_DOCUMENT_PROJECT: 'landscape.tbl_document_project' as const,
  TBL_DYNAMIC_COLUMN_DEFINITION: 'landscape.tbl_dynamic_column_definition' as const,
  TBL_DYNAMIC_COLUMN_VALUE: 'landscape.tbl_dynamic_column_value' as const,
  TBL_EQUITY: 'landscape.tbl_equity' as const,
  TBL_EQUITY_DISTRIBUTION: 'landscape.tbl_equity_distribution' as const,
  TBL_EQUITY_PARTNER: 'landscape.tbl_equity_partner' as const,
  TBL_EQUITY_STRUCTURE: 'landscape.tbl_equity_structure' as const,
  TBL_ESCALATION: 'landscape.tbl_escalation' as const,
  TBL_EXCEL_AUDIT: 'landscape.tbl_excel_audit' as const,
  TBL_EXCEL_AUDIT_FINDING: 'landscape.tbl_excel_audit_finding' as const,
  TBL_EXECUTIVE: 'landscape.tbl_executive' as const,
  TBL_EXECUTIVE_COMPENSATION_PERIOD: 'landscape.tbl_executive_compensation_period' as const,
  TBL_EXECUTIVE_EMPLOYMENT_AGREEMENT: 'landscape.tbl_executive_employment_agreement' as const,
  TBL_EXECUTIVE_INCENTIVE_TARGET: 'landscape.tbl_executive_incentive_target' as const,
  TBL_EXPANSION_OPTION: 'landscape.tbl_expansion_option' as const,
  TBL_EXPENSE_COMPARABLE: 'landscape.tbl_expense_comparable' as const,
  TBL_EXPENSE_DETAIL: 'landscape.tbl_expense_detail' as const,
  TBL_EXPENSE_RECOVERY_ARCHIVE_20260506: 'landscape.tbl_expense_recovery_archive_20260506' as const,
  TBL_EXTRACTION_JOB: 'landscape.tbl_extraction_job' as const,
  TBL_EXTRACTION_LOG: 'landscape.tbl_extraction_log' as const,
  TBL_EXTRACTION_MAPPING: 'landscape.tbl_extraction_mapping' as const,
  TBL_FEEDBACK: 'landscape.tbl_feedback' as const,
  TBL_FIELD_CATALOG: 'landscape.tbl_field_catalog' as const,
  TBL_FIELD_CATALOG_BACKUP_20260324: 'landscape.tbl_field_catalog_backup_20260324' as const,
  TBL_FINANCE_STRUCTURE: 'landscape.tbl_finance_structure' as const,
  TBL_GLOBAL_BENCHMARK_REGISTRY: 'landscape.tbl_global_benchmark_registry' as const,
  TBL_GUARANTOR_FINANCIAL_PERIOD: 'landscape.tbl_guarantor_financial_period' as const,
  TBL_HBU_ANALYSIS: 'landscape.tbl_hbu_analysis' as const,
  TBL_HBU_COMPARABLE_USE: 'landscape.tbl_hbu_comparable_use' as const,
  TBL_HBU_ZONING_DOCUMENT: 'landscape.tbl_hbu_zoning_document' as const,
  TBL_HELP_CONVERSATION: 'landscape.tbl_help_conversation' as const,
  TBL_HELP_MESSAGE: 'landscape.tbl_help_message' as const,
  TBL_IC_CHALLENGE: 'landscape.tbl_ic_challenge' as const,
  TBL_IC_SESSION: 'landscape.tbl_ic_session' as const,
  TBL_INCOME_APPROACH: 'landscape.tbl_income_approach' as const,
  TBL_INCOME_PROPERTY: 'landscape.tbl_income_property' as const,
  TBL_INCOME_PROPERTY_IND_EXT: 'landscape.tbl_income_property_ind_ext' as const,
  TBL_INCOME_PROPERTY_MF_EXT: 'landscape.tbl_income_property_mf_ext' as const,
  TBL_INCOME_PROPERTY_RET_EXT: 'landscape.tbl_income_property_ret_ext' as const,
  TBL_INTAKE_SESSION: 'landscape.tbl_intake_session' as const,
  TBL_INVENTORY_ITEM: 'landscape.tbl_inventory_item' as const,
  TBL_ITEM_DEPENDENCY: 'landscape.tbl_item_dependency' as const,
  TBL_KNOWLEDGE_SOURCE: 'landscape.tbl_knowledge_source' as const,
  TBL_LAND_COMP_ADJUSTMENTS: 'landscape.tbl_land_comp_adjustments' as const,
  TBL_LAND_COMPARABLES: 'landscape.tbl_land_comparables' as const,
  TBL_LANDSCAPER_INSTRUCTIONS: 'landscape.tbl_landscaper_instructions' as const,
  TBL_LANDSCAPER_KPI_DEFINITION: 'landscape.tbl_landscaper_kpi_definition' as const,
  TBL_LANDUSE: 'landscape.tbl_landuse' as const,
  TBL_LANDUSE_PROGRAM: 'landscape.tbl_landuse_program' as const,
  TBL_LEASE: 'landscape.tbl_lease' as const,
  TBL_LEASE_ARCHIVE_20260506: 'landscape.tbl_lease_archive_20260506' as const,
  TBL_LEASE_ASSUMPTIONS: 'landscape.tbl_lease_assumptions' as const,
  TBL_LEASE_IND_EXT: 'landscape.tbl_lease_ind_ext' as const,
  TBL_LEASE_MF_EXT: 'landscape.tbl_lease_mf_ext' as const,
  TBL_LEASE_NL_EXT: 'landscape.tbl_lease_nl_ext' as const,
  TBL_LEASE_RET_EXT: 'landscape.tbl_lease_ret_ext' as const,
  TBL_LEASE_REVENUE_TIMING: 'landscape.tbl_lease_revenue_timing' as const,
  TBL_LEASING_COMMISSION: 'landscape.tbl_leasing_commission' as const,
  TBL_LOAN: 'landscape.tbl_loan' as const,
  TBL_LOAN_CONTAINER: 'landscape.tbl_loan_container' as const,
  TBL_LOAN_FINANCE_STRUCTURE: 'landscape.tbl_loan_finance_structure' as const,
  TBL_LOCATION_BRIEF: 'landscape.tbl_location_brief' as const,
  TBL_LOT: 'landscape.tbl_lot' as const,
  TBL_LOT_TYPE: 'landscape.tbl_lot_type' as const,
  TBL_MARKET_RATE_ANALYSIS: 'landscape.tbl_market_rate_analysis' as const,
  TBL_MASTER_LEASE: 'landscape.tbl_master_lease' as const,
  TBL_MASTER_LEASE_AMENDMENT: 'landscape.tbl_master_lease_amendment' as const,
  TBL_MASTER_LEASE_PROPERTY: 'landscape.tbl_master_lease_property' as const,
  TBL_MEASURES: 'landscape.tbl_measures' as const,
  TBL_MILESTONE: 'landscape.tbl_milestone' as const,
  TBL_MODEL_OVERRIDE: 'landscape.tbl_model_override' as const,
  TBL_MSA: 'landscape.tbl_msa' as const,
  TBL_MULTIFAMILY_LEASE: 'landscape.tbl_multifamily_lease' as const,
  TBL_MULTIFAMILY_PROPERTY: 'landscape.tbl_multifamily_property' as const,
  TBL_MULTIFAMILY_TURN: 'landscape.tbl_multifamily_turn' as const,
  TBL_MULTIFAMILY_UNIT: 'landscape.tbl_multifamily_unit' as const,
  TBL_MULTIFAMILY_UNIT_TYPE: 'landscape.tbl_multifamily_unit_type' as const,
  TBL_NARRATIVE_CHANGE: 'landscape.tbl_narrative_change' as const,
  TBL_NARRATIVE_COMMENT: 'landscape.tbl_narrative_comment' as const,
  TBL_NARRATIVE_VERSION: 'landscape.tbl_narrative_version' as const,
  TBL_OPERATING_EXPENSES: 'landscape.tbl_operating_expenses' as const,
  TBL_OPERATIONS_USER_INPUTS: 'landscape.tbl_operations_user_inputs' as const,
  TBL_OPERATOR: 'landscape.tbl_operator' as const,
  TBL_OPERATOR_ALIAS: 'landscape.tbl_operator_alias' as const,
  TBL_OPERATOR_CONCEPT: 'landscape.tbl_operator_concept' as const,
  TBL_OPERATOR_PRINCIPAL: 'landscape.tbl_operator_principal' as const,
  TBL_OPERATOR_PRINCIPAL_DISTRIBUTION: 'landscape.tbl_operator_principal_distribution' as const,
  TBL_OPEX_TIMING: 'landscape.tbl_opex_timing' as const,
  TBL_PARCEL: 'landscape.tbl_parcel' as const,
  TBL_PARCEL_ACQUISITION_HISTORY: 'landscape.tbl_parcel_acquisition_history' as const,
  TBL_PARCEL_SALE_ASSUMPTIONS: 'landscape.tbl_parcel_sale_assumptions' as const,
  TBL_PARCEL_SALE_EVENT: 'landscape.tbl_parcel_sale_event' as const,
  TBL_PARTICIPATION_PAYMENT: 'landscape.tbl_participation_payment' as const,
  TBL_PERCENTAGE_RENT_ARCHIVE_20260506: 'landscape.tbl_percentage_rent_archive_20260506' as const,
  TBL_PHASE: 'landscape.tbl_phase' as const,
  TBL_PLATFORM_KNOWLEDGE: 'landscape.tbl_platform_knowledge' as const,
  TBL_PLATFORM_KNOWLEDGE_CHAPTERS: 'landscape.tbl_platform_knowledge_chapters' as const,
  TBL_PLATFORM_KNOWLEDGE_CHUNKS: 'landscape.tbl_platform_knowledge_chunks' as const,
  TBL_PRINCIPAL_FINANCIAL_STATEMENT: 'landscape.tbl_principal_financial_statement' as const,
  TBL_PROJECT: 'landscape.tbl_project' as const,
  TBL_PROJECT_ASSUMPTION: 'landscape.tbl_project_assumption' as const,
  TBL_PROJECT_CONFIG: 'landscape.tbl_project_config' as const,
  TBL_PROJECT_CONTACT: 'landscape.tbl_project_contact' as const,
  TBL_PROJECT_INVENTORY_COLUMNS: 'landscape.tbl_project_inventory_columns' as const,
  TBL_PROJECT_METRICS: 'landscape.tbl_project_metrics' as const,
  TBL_PROJECT_SETTINGS: 'landscape.tbl_project_settings' as const,
  TBL_PROPERTY_ACQUISITION: 'landscape.tbl_property_acquisition' as const,
  TBL_PROPERTY_APN: 'landscape.tbl_property_apn' as const,
  TBL_PROPERTY_ATTRIBUTE_DEF: 'landscape.tbl_property_attribute_def' as const,
  TBL_PROPERTY_TYPE_CONFIG: 'landscape.tbl_property_type_config' as const,
  TBL_PROPERTY_USE_TEMPLATE: 'landscape.tbl_property_use_template' as const,
  TBL_RECOVERY: 'landscape.tbl_recovery' as const,
  TBL_RENEWAL_OPTION: 'landscape.tbl_renewal_option' as const,
  TBL_RENT_CONCESSION: 'landscape.tbl_rent_concession' as const,
  TBL_RENT_ESCALATION_ARCHIVE_20260506: 'landscape.tbl_rent_escalation_archive_20260506' as const,
  TBL_RENT_ROLL: 'landscape.tbl_rent_roll' as const,
  TBL_RENT_ROLL_UNIT: 'landscape.tbl_rent_roll_unit' as const,
  TBL_RENT_SCHEDULE_ARCHIVE_20260506: 'landscape.tbl_rent_schedule_archive_20260506' as const,
  TBL_RENT_STEP: 'landscape.tbl_rent_step' as const,
  TBL_RENTAL_COMPARABLE: 'landscape.tbl_rental_comparable' as const,
  TBL_REPORT_DEFINITION: 'landscape.tbl_report_definition' as const,
  TBL_REPORT_HISTORY: 'landscape.tbl_report_history' as const,
  TBL_RESEARCH_FINANCIAL_DATA: 'landscape.tbl_research_financial_data' as const,
  TBL_RESEARCH_HARVEST_LOG: 'landscape.tbl_research_harvest_log' as const,
  TBL_RESEARCH_PUBLICATION: 'landscape.tbl_research_publication' as const,
  TBL_REVENUE_OTHER: 'landscape.tbl_revenue_other' as const,
  TBL_REVENUE_RENT: 'landscape.tbl_revenue_rent' as const,
  TBL_REVENUE_TIMING: 'landscape.tbl_revenue_timing' as const,
  TBL_SALE_BENCHMARKS: 'landscape.tbl_sale_benchmarks' as const,
  TBL_SALE_PHASES: 'landscape.tbl_sale_phases' as const,
  TBL_SALE_SETTLEMENT: 'landscape.tbl_sale_settlement' as const,
  TBL_SALES_COMP_ADJUSTMENTS: 'landscape.tbl_sales_comp_adjustments' as const,
  TBL_SALES_COMP_CONTACTS: 'landscape.tbl_sales_comp_contacts' as const,
  TBL_SALES_COMP_HISTORY: 'landscape.tbl_sales_comp_history' as const,
  TBL_SALES_COMP_HOSPITALITY: 'landscape.tbl_sales_comp_hospitality' as const,
  TBL_SALES_COMP_INDUSTRIAL: 'landscape.tbl_sales_comp_industrial' as const,
  TBL_SALES_COMP_LAND: 'landscape.tbl_sales_comp_land' as const,
  TBL_SALES_COMP_MANUFACTURED: 'landscape.tbl_sales_comp_manufactured' as const,
  TBL_SALES_COMP_MARKET_CONDITIONS: 'landscape.tbl_sales_comp_market_conditions' as const,
  TBL_SALES_COMP_OFFICE: 'landscape.tbl_sales_comp_office' as const,
  TBL_SALES_COMP_RETAIL: 'landscape.tbl_sales_comp_retail' as const,
  TBL_SALES_COMP_SELF_STORAGE: 'landscape.tbl_sales_comp_self_storage' as const,
  TBL_SALES_COMP_SPECIALTY_HOUSING: 'landscape.tbl_sales_comp_specialty_housing' as const,
  TBL_SALES_COMP_STORAGE_UNIT_MIX: 'landscape.tbl_sales_comp_storage_unit_mix' as const,
  TBL_SALES_COMP_TENANTS: 'landscape.tbl_sales_comp_tenants' as const,
  TBL_SALES_COMP_UNIT_MIX: 'landscape.tbl_sales_comp_unit_mix' as const,
  TBL_SALES_COMPARABLES: 'landscape.tbl_sales_comparables' as const,
  TBL_SCENARIO: 'landscape.tbl_scenario' as const,
  TBL_SCENARIO_COMPARISON: 'landscape.tbl_scenario_comparison' as const,
  TBL_SCENARIO_LOG: 'landscape.tbl_scenario_log' as const,
  TBL_SECURITY_DEPOSIT: 'landscape.tbl_security_deposit' as const,
  TBL_SPACE: 'landscape.tbl_space' as const,
  TBL_SPACE_IND_EXT: 'landscape.tbl_space_ind_ext' as const,
  TBL_SPACE_MF_EXT: 'landscape.tbl_space_mf_ext' as const,
  TBL_SPACE_RET_EXT: 'landscape.tbl_space_ret_ext' as const,
  TBL_SYSTEM_PICKLIST: 'landscape.tbl_system_picklist' as const,
  TBL_TEMPLATE_COLUMN_CONFIG: 'landscape.tbl_template_column_config' as const,
  TBL_TENANT: 'landscape.tbl_tenant' as const,
  TBL_TENANT_IMPROVEMENT: 'landscape.tbl_tenant_improvement' as const,
  TBL_TERMINATION_OPTION: 'landscape.tbl_termination_option' as const,
  TBL_UNIT_OPERATIONS: 'landscape.tbl_unit_operations' as const,
  TBL_UOM_CALCULATION_FORMULAS: 'landscape.tbl_uom_calculation_formulas' as const,
  TBL_USER_GRID_PREFERENCE: 'landscape.tbl_user_grid_preference' as const,
  TBL_USER_LANDSCAPER_PROFILE: 'landscape.tbl_user_landscaper_profile' as const,
  TBL_USER_PREFERENCE: 'landscape.tbl_user_preference' as const,
  TBL_USER_REPORT_PERSONAL_DEFAULT: 'landscape.tbl_user_report_personal_default' as const,
  TBL_USER_SAVED_REPORT: 'landscape.tbl_user_saved_report' as const,
  TBL_USER_SCENARIO_VOCAB: 'landscape.tbl_user_scenario_vocab' as const,
  TBL_VACANCY_ASSUMPTION: 'landscape.tbl_vacancy_assumption' as const,
  TBL_VALUATION_RECONCILIATION: 'landscape.tbl_valuation_reconciliation' as const,
  TBL_VALUE_ADD_ASSUMPTIONS: 'landscape.tbl_value_add_assumptions' as const,
  TBL_WATERFALL: 'landscape.tbl_waterfall' as const,
  TBL_WATERFALL_TIER: 'landscape.tbl_waterfall_tier' as const,
  TBL_ZONING_CONTROL: 'landscape.tbl_zoning_control' as const,
  TESTER_FEEDBACK: 'landscape.tester_feedback' as const,
  TYPE_LOT_PRODUCT: 'landscape.type_lot_product' as const,
  USER_PROFILE: 'landscape.user_profile' as const,
  USER_SETTINGS: 'landscape.user_settings' as const,
  V_AI_REVIEW_SUMMARY: 'landscape.v_ai_review_summary' as const,
  V_CONTACT_PROJECTS: 'landscape.v_contact_projects' as const,
  V_CONTACT_RELATIONSHIPS: 'landscape.v_contact_relationships' as const,
  V_LEASE_SUMMARY: 'landscape.v_lease_summary' as const,
  V_PROJECT_CONTACTS: 'landscape.v_project_contacts' as const,
  V_PROJECT_CONTACTS_DETAIL: 'landscape.v_project_contacts_detail' as const,
  V_RENT_ROLL: 'landscape.v_rent_roll' as const,
  V_SALES_COMPARABLES_FULL: 'landscape.v_sales_comparables_full' as const,
  VW_ABSORPTION_WITH_DEPENDENCIES: 'landscape.vw_absorption_with_dependencies' as const,
  VW_ACREAGE_ALLOCATION: 'landscape.vw_acreage_allocation' as const,
  VW_BUDGET_GRID_ITEMS: 'landscape.vw_budget_grid_items' as const,
  VW_BUDGET_VARIANCE: 'landscape.vw_budget_variance' as const,
  VW_BUDGET_WITH_DEPENDENCIES: 'landscape.vw_budget_with_dependencies' as const,
  VW_CATEGORY_HIERARCHY: 'landscape.vw_category_hierarchy' as const,
  VW_DEBT_BALANCE_SUMMARY: 'landscape.vw_debt_balance_summary' as const,
  VW_DOC_MEDIA_SUMMARY: 'landscape.vw_doc_media_summary' as const,
  VW_EXTRACTION_MAPPING_STATS: 'landscape.vw_extraction_mapping_stats' as const,
  VW_ITEM_DEPENDENCY_STATUS: 'landscape.vw_item_dependency_status' as const,
  VW_LEASE_EXPIRATION_SCHEDULE: 'landscape.vw_lease_expiration_schedule' as const,
  VW_MAP_PLAN_PARCELS: 'landscape.vw_map_plan_parcels' as const,
  VW_MAP_TAX_PARCELS: 'landscape.vw_map_tax_parcels' as const,
  VW_MKT_ABSORPTION_BY_LOT_WIDTH: 'landscape.vw_mkt_absorption_by_lot_width' as const,
  VW_MKT_ABSORPTION_BY_LU_PRODUCT: 'landscape.vw_mkt_absorption_by_lu_product' as const,
  VW_MKT_CURRENT_PROJECTS: 'landscape.vw_mkt_current_projects' as const,
  VW_MKT_LANDSCAPER_SUMMARY: 'landscape.vw_mkt_landscaper_summary' as const,
  VW_MKT_PRICING_BY_CITY_LOTWIDTH: 'landscape.vw_mkt_pricing_by_city_lotwidth' as const,
  VW_MULTIFAMILY_LEASE_EXPIRATIONS: 'landscape.vw_multifamily_lease_expirations' as const,
  VW_MULTIFAMILY_OCCUPANCY_SUMMARY: 'landscape.vw_multifamily_occupancy_summary' as const,
  VW_MULTIFAMILY_PROJECT_SUMMARY: 'landscape.vw_multifamily_project_summary' as const,
  VW_MULTIFAMILY_TURN_METRICS: 'landscape.vw_multifamily_turn_metrics' as const,
  VW_MULTIFAMILY_UNIT_STATUS: 'landscape.vw_multifamily_unit_status' as const,
  VW_PARCELS_WITH_SALES: 'landscape.vw_parcels_with_sales' as const,
  VW_PERMIT_ANNUAL_BY_JURISDICTION: 'landscape.vw_permit_annual_by_jurisdiction' as const,
  VW_PERMIT_MSA_MONTHLY: 'landscape.vw_permit_msa_monthly' as const,
  VW_PROJECT_ACQUISITION_SUMMARY: 'landscape.vw_project_acquisition_summary' as const,
  VW_REVENUE_TIMELINE: 'landscape.vw_revenue_timeline' as const,
  VW_ZONING_GLOSSARY_EXPORT: 'landscape.vw_zoning_glossary_export' as const,
  ZONDA_SUBDIVISIONS: 'landscape.zonda_subdivisions' as const,
} as const;

// Table name type
export type TableName = typeof TABLE_NAMES[keyof typeof TABLE_NAMES];
