// Auto-generated database types
// Generated on: 2025-09-12T22:29:57.588Z
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
}

// Insert type for landscape.core_fin_budget_version (excludes auto-generated fields)
export type FinBudgetVersionInsert = {
  name: string;
  asOf: string;
  status?: string;
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
// Primary Key: category_id, ad_code
// Foreign Keys: category_id -> landscape.core_fin_category.category_id
export interface FinCrosswalkAd {
  adCode: string;
  adGroup: string | null;
  categoryId: number;
}

// landscape.core_fin_crosswalk_ae
// Primary Key: ae_coa, category_id
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

// landscape.core_fin_fact_actual
// Primary Key: fact_id
// Foreign Keys: category_id -> landscape.core_fin_category.category_id, uom_code -> landscape.core_fin_uom.uom_code
export interface FinFactActual {
  /** Default: nextval('core_fin_fact_actual_fact_id_seq'::regclass) */
  factId: number;
  peLevel: string /* pe_level enum */;
  peId: string;
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
}

// Insert type for landscape.core_fin_fact_actual (excludes auto-generated fields)
export type FinFactActualInsert = {
  peLevel: string /* pe_level enum */;
  peId: string;
  categoryId: number;
  uomCode: string;
  qty?: number | null;
  rate?: number | null;
  amount?: number | null;
  txnDate: string;
  sourceDoc?: string | null;
};

// landscape.core_fin_fact_budget
// Primary Key: fact_id
// Foreign Keys: budget_id -> landscape.core_fin_budget_version.budget_id, category_id -> landscape.core_fin_category.category_id, curve_id -> landscape.core_fin_curve.curve_id, funding_id -> landscape.core_fin_funding_source.funding_id, uom_code -> landscape.core_fin_uom.uom_code
export interface FinFactBudget {
  /** Default: nextval('core_fin_fact_budget_fact_id_seq'::regclass) */
  factId: number;
  budgetId: number;
  peLevel: string /* pe_level enum */;
  peId: string;
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
  notes: string | null;
  /** Default: now() */
  createdAt: string;
}

// Insert type for landscape.core_fin_fact_budget (excludes auto-generated fields)
export type FinFactBudgetInsert = {
  budgetId: number;
  peLevel: string /* pe_level enum */;
  peId: string;
  categoryId: number;
  fundingId?: number | null;
  uomCode: string;
  qty?: number | null;
  rate?: number | null;
  amount?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  curveId?: number | null;
  notes?: string | null;
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

// landscape.core_fin_pe_applicability
// Primary Key: pe_level, category_id
// Foreign Keys: category_id -> landscape.core_fin_category.category_id
export interface FinPeApplicability {
  categoryId: number;
  peLevel: string /* pe_level enum */;
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
};

// landscape.lu_com_spec
// Primary Key: com_spec_id
// Foreign Keys: doc_id -> landscape.planning_doc.doc_id, subtype_id -> landscape.lu_subtype.subtype_id
export interface ComSpec {
  comSpecId: number;
  subtypeId: number;
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
// Foreign Keys: doc_id -> landscape.planning_doc.doc_id, subtype_id -> landscape.lu_subtype.subtype_id
export interface ResSpec {
  resSpecId: number;
  subtypeId: number;
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
  subtypeId: number;
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
}

// Insert type for landscape.market_assumptions (excludes auto-generated fields)
export type MarketAssumptionsInsert = {
  projectId: number;
  commissionBasis?: string | null;
  demandUnit?: string | null;
  uom?: string | null;
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

// landscape.res_lot_product
// Primary Key: product_id
export interface ResLotProduct {
  productId: number;
  code: string;
  lotWFt: number;
  lotDFt: number;
  lotAreaSf: number | null;
}

// landscape.subtype_lot_product
// Primary Key: product_id, subtype_id
// Foreign Keys: product_id -> landscape.res_lot_product.product_id, subtype_id -> landscape.lu_subtype.subtype_id
export interface SubtypeLotProduct {
  subtypeId: number;
  productId: number;
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

// landscape.tbl_landuse
// Primary Key: landuse_id
// Foreign Keys: subtype_id -> landscape.lu_subtype.subtype_id
export interface Landuse {
  landuseId: number;
  landuseCode: string;
  landuseType: string | null;
  subtypeId: number | null;
  name: string | null;
  description: string | null;
  /** Default: true */
  active: boolean | null;
  /** Default: CURRENT_TIMESTAMP */
  createdAt: string | null;
  /** Default: CURRENT_TIMESTAMP */
  updatedAt: string | null;
}

// Insert type for landscape.tbl_landuse (excludes auto-generated fields)
export type LanduseInsert = {
  landuseId: number;
  landuseCode: string;
  landuseType?: string | null;
  subtypeId?: number | null;
  name?: string | null;
  description?: string | null;
  active?: boolean | null;
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
// Foreign Keys: area_id -> landscape.tbl_area.area_id, landuse_code -> landscape.tbl_landuse.landuse_code, lot_type_id -> landscape.tbl_lot_type.producttype_id, phase_id -> landscape.tbl_phase.phase_id
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
}

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
  export type CoreFinBudgetVersion = FinBudgetVersion;
  export type CoreFinCategory = FinCategory;
  export type CoreFinCategoryUom = FinCategoryUom;
  export type CoreFinCrosswalkAd = FinCrosswalkAd;
  export type CoreFinCrosswalkAe = FinCrosswalkAe;
  export type CoreFinCurve = FinCurve;
  export type CoreFinFactActual = FinFactActual;
  export type CoreFinFactBudget = FinFactBudget;
  export type CoreFinFundingSource = FinFundingSource;
  export type CoreFinPeApplicability = FinPeApplicability;
  export type CoreFinUom = FinUom;
  export type CoreLookupItem = LookupItem;
  export type CoreLookupList = LookupList;
  export type CoreLookupVw = LookupVw;
  export type GlossaryZoning = GlossaryZoning;
  export type LuComSpec = ComSpec;
  export type LuFamily = Family;
  export type LuResSpec = ResSpec;
  export type LuSubtype = Subtype;
  export type MarketAssumptions = MarketAssumptions;
  export type PlanningDoc = PlanningDoc;
  export type ResLotProduct = ResLotProduct;
  export type SubtypeLotProduct = SubtypeLotProduct;
  export type TblAcquisition = Acquisition;
  export type TblApproval = Approval;
  export type TblArea = Area;
  export type TblAssumptionrule = Assumptionrule;
  export type TblBudget = Budget;
  export type TblBudgetItems = BudgetItems;
  export type TblBudgetStructure = BudgetStructure;
  export type TblCapitalization = Capitalization;
  export type TblContacts = Contacts;
  export type TblLanduse = Landuse;
  export type TblLanduseProgram = LanduseProgram;
  export type TblLotType = LotType;
  export type TblMeasures = Measures;
  export type TblParcel = Parcel;
  export type TblPhase = Phase;
  export type TblProject = Project;
  export type TblZoningControl = ZoningControl;
  export type TmpSearchResults = TmpSearchResults;
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
  CORE_FIN_BUDGET_VERSION: 'landscape.core_fin_budget_version' as const,
  CORE_FIN_CATEGORY: 'landscape.core_fin_category' as const,
  CORE_FIN_CATEGORY_UOM: 'landscape.core_fin_category_uom' as const,
  CORE_FIN_CROSSWALK_AD: 'landscape.core_fin_crosswalk_ad' as const,
  CORE_FIN_CROSSWALK_AE: 'landscape.core_fin_crosswalk_ae' as const,
  CORE_FIN_CURVE: 'landscape.core_fin_curve' as const,
  CORE_FIN_FACT_ACTUAL: 'landscape.core_fin_fact_actual' as const,
  CORE_FIN_FACT_BUDGET: 'landscape.core_fin_fact_budget' as const,
  CORE_FIN_FUNDING_SOURCE: 'landscape.core_fin_funding_source' as const,
  CORE_FIN_PE_APPLICABILITY: 'landscape.core_fin_pe_applicability' as const,
  CORE_FIN_UOM: 'landscape.core_fin_uom' as const,
  CORE_LOOKUP_ITEM: 'landscape.core_lookup_item' as const,
  CORE_LOOKUP_LIST: 'landscape.core_lookup_list' as const,
  CORE_LOOKUP_VW: 'landscape.core_lookup_vw' as const,
  GLOSSARY_ZONING: 'landscape.glossary_zoning' as const,
  LU_COM_SPEC: 'landscape.lu_com_spec' as const,
  LU_FAMILY: 'landscape.lu_family' as const,
  LU_RES_SPEC: 'landscape.lu_res_spec' as const,
  LU_SUBTYPE: 'landscape.lu_subtype' as const,
  MARKET_ASSUMPTIONS: 'landscape.market_assumptions' as const,
  PLANNING_DOC: 'landscape.planning_doc' as const,
  RES_LOT_PRODUCT: 'landscape.res_lot_product' as const,
  SUBTYPE_LOT_PRODUCT: 'landscape.subtype_lot_product' as const,
  TBL_ACQUISITION: 'landscape.tbl_acquisition' as const,
  TBL_APPROVAL: 'landscape.tbl_approval' as const,
  TBL_AREA: 'landscape.tbl_area' as const,
  TBL_ASSUMPTIONRULE: 'landscape.tbl_assumptionrule' as const,
  TBL_BUDGET: 'landscape.tbl_budget' as const,
  TBL_BUDGET_ITEMS: 'landscape.tbl_budget_items' as const,
  TBL_BUDGET_STRUCTURE: 'landscape.tbl_budget_structure' as const,
  TBL_CAPITALIZATION: 'landscape.tbl_capitalization' as const,
  TBL_CONTACTS: 'landscape.tbl_contacts' as const,
  TBL_LANDUSE: 'landscape.tbl_landuse' as const,
  TBL_LANDUSE_PROGRAM: 'landscape.tbl_landuse_program' as const,
  TBL_LOT_TYPE: 'landscape.tbl_lot_type' as const,
  TBL_MEASURES: 'landscape.tbl_measures' as const,
  TBL_PARCEL: 'landscape.tbl_parcel' as const,
  TBL_PHASE: 'landscape.tbl_phase' as const,
  TBL_PROJECT: 'landscape.tbl_project' as const,
  TBL_ZONING_CONTROL: 'landscape.tbl_zoning_control' as const,
  TMP_SEARCH_RESULTS: 'landscape.tmp_search_results' as const,
  VW_ZONING_GLOSSARY_EXPORT: 'landscape.vw_zoning_glossary_export' as const,
} as const;

// Table name type
export type TableName = typeof TABLE_NAMES[keyof typeof TABLE_NAMES];
