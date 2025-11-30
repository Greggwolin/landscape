// Auto-generated database types
// Generated on: 2025-09-24T15:43:10.206Z
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

// landscape.core_doc
// Primary Key: doc_id
// Foreign Keys: parcel_id -> landscape.tbl_parcel.parcel_id, parent_doc_id -> landscape.core_doc.doc_id, phase_id -> landscape.tbl_phase.phase_id, project_id -> landscape.tbl_project.project_id, workspace_id -> landscape.dms_workspaces.workspace_id
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
};

// landscape.core_fin_budget_version
// Primary Key: budget_id
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

// landscape.core_fin_category
// Primary Key: category_id
// Foreign Keys: parent_id -> landscape.core_fin_category.category_id
export interface FinCategory {
  /** Default: nextval('core_fin_category_category_id_seq'::regclass) */
  categoryId: number;
  parentId: number | null;
  code: string;
  kind: string;
  class: string | null;
  event: string | null;
  scope: string | null;
  detail: string | null;
  /** Default: true */
  isActive: boolean;
  /** Default: now() */
  createdAt: string;
}

// Insert type for landscape.core_fin_category (excludes auto-generated fields)
export type FinCategoryInsert = {
  parentId?: number | null;
  code: string;
  kind: string;
  class?: string | null;
  event?: string | null;
  scope?: string | null;
  detail?: string | null;
  isActive?: boolean;
};

// landscape.core_fin_category_uom
// Primary Key: category_id, uom_code
// Foreign Keys: category_id -> landscape.core_fin_category.category_id, uom_code -> landscape.core_fin_uom.uom_code
export interface FinCategoryUom {
  categoryId: number;
  uomCode: string;
}

// landscape.core_fin_crosswalk_ad
// Primary Key: ad_code, category_id
// Foreign Keys: category_id -> landscape.core_fin_category.category_id
export interface FinCrosswalkAd {
  adCode: string;
  adGroup: string | null;
  categoryId: number;
}

// landscape.core_fin_crosswalk_ae
// Primary Key: category_id, ae_coa
// Foreign Keys: category_id -> landscape.core_fin_category.category_id
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

// landscape.core_fin_curve_profile
// Primary Key: curve_id
export interface FinCurveProfile {
  /** Default: nextval('core_fin_curve_profile_curve_id_seq'::regclass) */
  curveId: number;
  curveName: string;
  curveCode: string;
  description: string | null;
  pctAt10: number;
  pctAt20: number;
  pctAt30: number;
  pctAt40: number;
  pctAt50: number;
  pctAt60: number;
  pctAt70: number;
  pctAt80: number;
  pctAt90: number;
  pctAt100: number;
  /** Default: true */
  isActive: boolean | null;
  /** Default: true */
  isSystem: boolean | null;
  /** Default: now() */
  createdAt: string | null;
  /** Default: now() */
  updatedAt: string | null;
}

// Insert type for landscape.core_fin_curve_profile (excludes auto-generated fields)
export type FinCurveProfileInsert = {
  curveName: string;
  curveCode: string;
  description?: string | null;
  pctAt10: number;
  pctAt20: number;
  pctAt30: number;
  pctAt40: number;
  pctAt50: number;
  pctAt60: number;
  pctAt70: number;
  pctAt80: number;
  pctAt90: number;
  pctAt100?: number;
  isActive?: boolean | null;
  isSystem?: boolean | null;
};

// landscape.core_fin_fact_actual
// Primary Key: fact_id
// Foreign Keys: category_id -> landscape.core_fin_category.category_id, container_id -> landscape.tbl_container.container_id, uom_code -> landscape.core_fin_uom.uom_code
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
  containerId: number | null;
  projectId: number | null;
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
  containerId?: number | null;
  projectId?: number | null;
};

// landscape.core_fin_fact_budget
// Primary Key: fact_id
// Foreign Keys: budget_id -> landscape.core_fin_budget_version.budget_id, category_id -> landscape.core_fin_category.category_id, container_id -> landscape.tbl_container.container_id, curve_id -> landscape.core_fin_curve.curve_id, funding_id -> landscape.core_fin_funding_source.funding_id, growth_rate_set_id -> landscape.core_fin_growth_rate_sets.set_id, uom_code -> landscape.core_fin_uom.uom_code, vendor_contact_id -> landscape.tbl_contacts.contact_id
export interface FinFactBudget {
  /** Default: nextval('core_fin_fact_budget_fact_id_seq'::regclass) */
  factId: number;
  budgetId: number;
  categoryId: number;
  fundingId: number | null;
  uomCode: string;
  /** Default: 1 */
  qty: number | null;
  rate: number | null;
  amount: number | null;
  startDate: string | null;
  endDate: string | null;
  curveId: number | null;
  curveSteepness: number | null;
  notes: string | null;
  /** Default: now() */
  createdAt: string;
  containerId: number | null;
  projectId: number | null;
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
}

// Insert type for landscape.core_fin_fact_budget (excludes auto-generated fields)
export type FinFactBudgetInsert = {
  budgetId: number;
  categoryId: number;
  fundingId?: number | null;
  uomCode: string;
  qty?: number | null;
  rate?: number | null;
  amount?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  curveId?: number | null;
  curveSteepness?: number | null;
  notes?: string | null;
  containerId?: number | null;
  projectId?: number | null;
  confidenceLevel?: string | null;
  vendorContactId?: number | null;
  escalationRate?: number | null;
  contingencyPct?: number | null;
  timingMethod?: string | null;
  contractNumber?: string | null;
  purchaseOrder?: string | null;
  isCommitted?: boolean | null;
  growthRateSetId?: number | null;
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
}

// Insert type for landscape.core_fin_growth_rate_sets (excludes auto-generated fields)
export type FinGrowthRateSetsInsert = {
  projectId: number;
  cardType: string;
  setName?: string;
  isDefault?: boolean | null;
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

// landscape.core_fin_container_applicability
// Primary Key: category_id, container_level
// Foreign Keys: category_id -> landscape.core_fin_category.category_id
export interface FinContainerApplicability {
  categoryId: number;
  containerLevel: number;
}

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
}

// Insert type for landscape.dms_templates (excludes auto-generated fields)
export type DmsTemplatesInsert = {
  templateName: string;
  workspaceId?: number | null;
  projectId?: number | null;
  docType?: string | null;
  isDefault?: boolean | null;
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

// landscape.land_use_pricing
// Primary Key: id
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
}

// Insert type for landscape.land_use_pricing (excludes auto-generated fields)
export type LandUsePricingInsert = {
  projectId: number;
  luTypeCode: string;
  pricePerUnit?: number | null;
  unitOfMeasure?: string | null;
  inflationType?: string | null;
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

// landscape.res_lot_product
// Primary Key: product_id
export interface ResLotProduct {
  productId: number;
  code: string;
  lotWFt: number;
  lotDFt: number;
  lotAreaSf: number | null;
}

// landscape.spatial_ref_sys
// Primary Key: srid
export interface SpatialRefSys {
  srid: number;
  authName: string | null;
  authSrid: number | null;
  srtext: string | null;
  proj4text: string | null;
}

// landscape.tbl_acquisition
// Primary Key: acquisition_id
// Foreign Keys: contact_id -> landscape.tbl_contacts.contact_id, measure_id -> landscape.tbl_measures.measure_id, project_id -> landscape.tbl_project.project_id
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
  /** Default: false */
  isDepositRefundable: boolean | null;
  depositGoesHardDate: string | null;
  /** Default: false */
  isConditional: boolean | null;
  unitsConveyed: number | null;
  measureId: number | null;
  notes: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
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
  isDepositRefundable?: boolean | null;
  depositGoesHardDate?: string | null;
  isConditional?: boolean | null;
  unitsConveyed?: number | null;
  measureId?: number | null;
  notes?: string | null;
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

// landscape.tbl_assumptionrule
// Primary Key: rule_id
export interface Assumptionrule {
  ruleId: number;
  ruleCategory: string | null;
  ruleKey: string | null;
  ruleValue: string | null;
}

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
}

// landscape.tbl_budget_items
// Primary Key: budget_item_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id, structure_id -> landscape.tbl_budget_structure.structure_id
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
}

// Insert type for landscape.tbl_budget_items (excludes auto-generated fields)
export type BudgetItemsInsert = {
  projectId: number;
  structureId: number;
  amount?: number | null;
  quantity?: number | null;
  costPerUnit?: number | null;
  notes?: string | null;
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
}

// Insert type for landscape.tbl_calculation_period (excludes auto-generated fields)
export type CalculationPeriodInsert = {
  periodId: number;
  projectId: number;
  periodStartDate: string;
  periodEndDate: string;
  periodType: string;
  periodSequence: number;
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

// landscape.tbl_contacts
// Primary Key: contact_id
export interface Contacts {
  /** Default: nextval('tbl_contacts_contact_id_seq'::regclass) */
  contactId: number;
  companyName: string | null;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  /** Default: false */
  isParent: boolean | null;
  parentCompanyName: string | null;
  parentContactPerson: string | null;
  parentEmail: string | null;
  parentPhone: string | null;
  parentAddressLine1: string | null;
  parentAddressLine2: string | null;
  parentCity: string | null;
  parentState: string | null;
  parentZip: string | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_contacts (excludes auto-generated fields)
export type ContactsInsert = {
  companyName?: string | null;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  isParent?: boolean | null;
  parentCompanyName?: string | null;
  parentContactPerson?: string | null;
  parentEmail?: string | null;
  parentPhone?: string | null;
  parentAddressLine1?: string | null;
  parentAddressLine2?: string | null;
  parentCity?: string | null;
  parentState?: string | null;
  parentZip?: string | null;
};

// landscape.tbl_container
// Primary Key: container_id
// Foreign Keys: parent_container_id -> landscape.tbl_container.container_id, project_id -> landscape.tbl_project.project_id
export interface Container {
  containerId: number;
  projectId: number;
  parentContainerId: number | null;
  containerLevel: number;
  containerCode: string;
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
}

// Insert type for landscape.tbl_container (excludes auto-generated fields)
export type ContainerInsert = {
  containerId: number;
  projectId: number;
  parentContainerId?: number | null;
  containerLevel: number;
  containerCode: string;
  displayName: string;
  sortOrder?: number | null;
  attributes?: any | null;
  isActive?: boolean | null;
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

// landscape.tbl_lot_type
// Primary Key: producttype_id
export interface LotType {
  producttypeId: number;
  producttypeName: string;
  typicalLotWidth: number | null;
  typicalLotDepth: number | null;
}

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
}

// Insert type for landscape.tbl_measures (excludes auto-generated fields)
export type MeasuresInsert = {
  measureCode: string;
  measureName: string;
  measureCategory: string;
  isSystem?: boolean | null;
  createdBy?: number | null;
  propertyTypes?: any | null;
};

// landscape.tbl_parcel
// Primary Key: parcel_id
// Foreign Keys: area_id -> landscape.tbl_area.area_id, density_code -> landscape.density_classification.code, landuse_code -> landscape.tbl_landuse.landuse_code, lot_type_id -> landscape.tbl_lot_type.producttype_id, phase_id -> landscape.tbl_phase.phase_id
export interface Parcel {
  parcelId: number;
  areaId: number;
  phaseId: number;
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
}

// landscape.tbl_project
// Primary Key: project_id
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
  planningEfficiency: number | null;
}

// landscape.tbl_project_config
// Primary Key: project_id
// Foreign Keys: project_id -> landscape.tbl_project.project_id
export interface ProjectConfig {
  projectId: number;
  assetType: string;
  /** Default: 'Area'::character varying */
  level1Label: string;
  /** Default: 'Phase'::character varying */
  level2Label: string;
  /** Default: 'Parcel'::character varying */
  level3Label: string;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string;
}

// Insert type for landscape.tbl_project_config (excludes auto-generated fields)
export type ProjectConfigInsert = {
  projectId: number;
  assetType: string;
  level1Label?: string;
  level2Label?: string;
  level3Label?: string;
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
  costInflationSetId?: number | null;
  priceInflationSetId?: number | null;
  analysisStartDate: string | null;
  analysisEndDate: string | null;
  /** Default: 0.10 */
  discountRate: number | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string;
}

// Insert type for landscape.tbl_project_settings (excludes auto-generated fields)
export type ProjectSettingsInsert = {
  projectId: number;
  defaultCurrency?: string | null;
  defaultPeriodType?: string | null;
  globalInflationRate?: number | null;
  costInflationSetId?: number | null;
  priceInflationSetId?: number | null;
  analysisStartDate?: string | null;
  analysisEndDate?: string | null;
  discountRate?: number | null;
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

// landscape.tmp_search_results
export interface TmpSearchResults {
  tableName: string | null;
  columnName: string | null;
  value: string | null;
}

// landscape.type_lot_product
// Primary Key: product_id, type_id
// Foreign Keys: product_id -> landscape.res_lot_product.product_id, type_id -> landscape.lu_type.type_id
export interface TypeLotProduct {
  typeId: number;
  productId: number;
}

// landscape.vw_lu_choices
export interface LuChoices {
  code: string | null;
  displayName: string | null;
  category: string | null;
  isActive: boolean | null;
  familyId: number | null;
  familyCode: string | null;
  familyName: string | null;
  familyActive: boolean | null;
  subtypeId: number | null;
  subtypeCode: string | null;
  subtypeName: string | null;
  subtypeOrder: number | null;
  subtypeActive: boolean | null;
  hasFamily: boolean | null;
  hasSubtype: boolean | null;
  categoryOrder: number | null;
  displayOrder: number | null;
}

// landscape.vw_product_choices
export interface ProductChoices {
  productId: number | null;
  productName: string | null;
  lotWidth: number | null;
  lotDepth: number | null;
  displayOrder: number | null;
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

// Schema-specific type collections
export namespace LandscapeSchema {
  export type CoreDoc = Doc;
  export type CoreFinBudgetVersion = FinBudgetVersion;
  export type CoreFinCategory = FinCategory;
  export type CoreFinCategoryUom = FinCategoryUom;
  export type CoreFinCrosswalkAd = FinCrosswalkAd;
  export type CoreFinCrosswalkAe = FinCrosswalkAe;
  export type CoreFinCurve = FinCurve;
  export type CoreFinFactActual = FinFactActual;
  export type CoreFinFactBudget = FinFactBudget;
  export type CoreFinFactTags = FinFactTags;
  export type CoreFinFundingSource = FinFundingSource;
  export type CoreFinGrowthRateSets = FinGrowthRateSets;
  export type CoreFinGrowthRateSteps = FinGrowthRateSteps;
  export type CoreFinContainerApplicability = FinContainerApplicability;
  export type CoreFinUom = FinUom;
  export type CoreLookupItem = LookupItem;
  export type CoreLookupList = LookupList;
  export type CoreLookupVw = LookupVw;
  export type DensityClassification = DensityClassification;
  export type DmsAttributes = DmsAttributes;
  export type DmsExtractQueue = DmsExtractQueue;
  export type DmsProfileAudit = DmsProfileAudit;
  export type DmsTemplateAttributes = DmsTemplateAttributes;
  export type DmsTemplates = DmsTemplates;
  export type DmsWorkspaces = DmsWorkspaces;
  export type GeographyColumns = GeographyColumns;
  export type GeometryColumns = GeometryColumns;
  export type GlossaryZoning = GlossaryZoning;
  export type LandUsePricing = LandUsePricing;
  export type LuComSpec = ComSpec;
  export type LuFamily = Family;
  export type LuResSpec = ResSpec;
  export type LuSubtype = Subtype;
  export type LuType = Type;
  export type MarketAssumptions = MarketAssumptions;
  export type PlanningDoc = PlanningDoc;
  export type ProjectJurisdictionMapping = ProjectJurisdictionMapping;
  export type ResLotProduct = ResLotProduct;
  export type SpatialRefSys = SpatialRefSys;
  export type TblAcquisition = Acquisition;
  export type TblApproval = Approval;
  export type TblArea = Area;
  export type TblAssumptionrule = Assumptionrule;
  export type TblBudget = Budget;
  export type TblBudgetItems = BudgetItems;
  export type TblBudgetStructure = BudgetStructure;
  export type TblBudgetTiming = BudgetTiming;
  export type TblCalculationPeriod = CalculationPeriod;
  export type TblCapitalization = Capitalization;
  export type TblContacts = Contacts;
  export type TblContainer = Container;
  export type TblLanduse = Landuse;
  export type TblLanduseProgram = LanduseProgram;
  export type TblLotType = LotType;
  export type TblMeasures = Measures;
  export type TblParcel = Parcel;
  export type TblPhase = Phase;
  export type TblProject = Project;
  export type TblProjectConfig = ProjectConfig;
  export type TblProjectSettings = ProjectSettings;
  export type TblZoningControl = ZoningControl;
  export type TmpSearchResults = TmpSearchResults;
  export type TypeLotProduct = TypeLotProduct;
  export type VwLuChoices = LuChoices;
  export type VwProductChoices = ProductChoices;
  export type VwZoningGlossaryExport = ZoningGlossaryExport;
}

export namespace LandV2Schema {
  export type GlossaryZoning = GlossaryZoning;
  export type VwZoningGlossaryExport = ZoningGlossaryExport;
}

// Table name constants
export const TABLE_NAMES = {
  GLOSSARY_ZONING: 'land_v2.glossary_zoning' as const,
  VW_ZONING_GLOSSARY_EXPORT: 'land_v2.vw_zoning_glossary_export' as const,
  CORE_DOC: 'landscape.core_doc' as const,
  CORE_FIN_BUDGET_VERSION: 'landscape.core_fin_budget_version' as const,
  CORE_FIN_CATEGORY: 'landscape.core_fin_category' as const,
  CORE_FIN_CATEGORY_UOM: 'landscape.core_fin_category_uom' as const,
  CORE_FIN_CROSSWALK_AD: 'landscape.core_fin_crosswalk_ad' as const,
  CORE_FIN_CROSSWALK_AE: 'landscape.core_fin_crosswalk_ae' as const,
  CORE_FIN_CURVE: 'landscape.core_fin_curve' as const,
  CORE_FIN_CURVE_PROFILE: 'landscape.core_fin_curve_profile' as const,
  CORE_FIN_FACT_ACTUAL: 'landscape.core_fin_fact_actual' as const,
  CORE_FIN_FACT_BUDGET: 'landscape.core_fin_fact_budget' as const,
  CORE_FIN_FACT_TAGS: 'landscape.core_fin_fact_tags' as const,
  CORE_FIN_FUNDING_SOURCE: 'landscape.core_fin_funding_source' as const,
  CORE_FIN_GROWTH_RATE_SETS: 'landscape.core_fin_growth_rate_sets' as const,
  CORE_FIN_GROWTH_RATE_STEPS: 'landscape.core_fin_growth_rate_steps' as const,
  CORE_FIN_CONTAINER_APPLICABILITY: 'landscape.core_fin_container_applicability' as const,
  CORE_FIN_UOM: 'landscape.core_fin_uom' as const,
  CORE_LOOKUP_ITEM: 'landscape.core_lookup_item' as const,
  CORE_LOOKUP_LIST: 'landscape.core_lookup_list' as const,
  CORE_LOOKUP_VW: 'landscape.core_lookup_vw' as const,
  DENSITY_CLASSIFICATION: 'landscape.density_classification' as const,
  DMS_ATTRIBUTES: 'landscape.dms_attributes' as const,
  DMS_EXTRACT_QUEUE: 'landscape.dms_extract_queue' as const,
  DMS_PROFILE_AUDIT: 'landscape.dms_profile_audit' as const,
  DMS_TEMPLATE_ATTRIBUTES: 'landscape.dms_template_attributes' as const,
  DMS_TEMPLATES: 'landscape.dms_templates' as const,
  DMS_WORKSPACES: 'landscape.dms_workspaces' as const,
  GEOGRAPHY_COLUMNS: 'landscape.geography_columns' as const,
  GEOMETRY_COLUMNS: 'landscape.geometry_columns' as const,
  GLOSSARY_ZONING: 'landscape.glossary_zoning' as const,
  LAND_USE_PRICING: 'landscape.land_use_pricing' as const,
  LU_COM_SPEC: 'landscape.lu_com_spec' as const,
  LU_FAMILY: 'landscape.lu_family' as const,
  LU_RES_SPEC: 'landscape.lu_res_spec' as const,
  LU_SUBTYPE: 'landscape.lu_subtype' as const,
  LU_TYPE: 'landscape.lu_type' as const,
  MARKET_ASSUMPTIONS: 'landscape.market_assumptions' as const,
  PLANNING_DOC: 'landscape.planning_doc' as const,
  PROJECT_JURISDICTION_MAPPING: 'landscape.project_jurisdiction_mapping' as const,
  RES_LOT_PRODUCT: 'landscape.res_lot_product' as const,
  SPATIAL_REF_SYS: 'landscape.spatial_ref_sys' as const,
  TBL_ACQUISITION: 'landscape.tbl_acquisition' as const,
  TBL_APPROVAL: 'landscape.tbl_approval' as const,
  TBL_AREA: 'landscape.tbl_area' as const,
  TBL_ASSUMPTIONRULE: 'landscape.tbl_assumptionrule' as const,
  TBL_BUDGET: 'landscape.tbl_budget' as const,
  TBL_BUDGET_ITEMS: 'landscape.tbl_budget_items' as const,
  TBL_BUDGET_STRUCTURE: 'landscape.tbl_budget_structure' as const,
  TBL_BUDGET_TIMING: 'landscape.tbl_budget_timing' as const,
  TBL_CALCULATION_PERIOD: 'landscape.tbl_calculation_period' as const,
  TBL_CAPITALIZATION: 'landscape.tbl_capitalization' as const,
  TBL_CONTACTS: 'landscape.tbl_contacts' as const,
  TBL_CONTAINER: 'landscape.tbl_container' as const,
  TBL_LANDUSE: 'landscape.tbl_landuse' as const,
  TBL_LANDUSE_PROGRAM: 'landscape.tbl_landuse_program' as const,
  TBL_LOT_TYPE: 'landscape.tbl_lot_type' as const,
  TBL_MEASURES: 'landscape.tbl_measures' as const,
  TBL_PARCEL: 'landscape.tbl_parcel' as const,
  TBL_PHASE: 'landscape.tbl_phase' as const,
  TBL_PROJECT: 'landscape.tbl_project' as const,
  TBL_PROJECT_CONFIG: 'landscape.tbl_project_config' as const,
  TBL_PROJECT_SETTINGS: 'landscape.tbl_project_settings' as const,
  TBL_ZONING_CONTROL: 'landscape.tbl_zoning_control' as const,
  TMP_SEARCH_RESULTS: 'landscape.tmp_search_results' as const,
  TYPE_LOT_PRODUCT: 'landscape.type_lot_product' as const,
  VW_LU_CHOICES: 'landscape.vw_lu_choices' as const,
  VW_PRODUCT_CHOICES: 'landscape.vw_product_choices' as const,
  VW_ZONING_GLOSSARY_EXPORT: 'landscape.vw_zoning_glossary_export' as const,
} as const;

// Table name type
export type TableName = typeof TABLE_NAMES[keyof typeof TABLE_NAMES];
