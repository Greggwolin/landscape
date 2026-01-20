/**
 * Contact Management Types
 *
 * Supports the Cabinet/Contact architecture:
 * - Cabinet: Security/tenancy boundary
 * - Contact: People and entities (cabinet-scoped)
 * - ContactRole: Configurable roles for project associations
 * - ContactRelationship: Relationships between contacts
 * - ProjectContact: Junction linking contacts to projects with roles
 */

// =============================================================================
// ENUMS AND CONSTANTS
// =============================================================================

export type ContactType = 'Person' | 'Company' | 'Entity' | 'Fund' | 'Government' | 'Other';

export type RoleCategory = 'Principal' | 'Financing' | 'Advisor' | 'Contact' | 'Other';

export type RelationshipType =
  | 'Employee'
  | 'Principal'
  | 'Subsidiary'
  | 'Affiliate'
  | 'Member'
  | 'Counsel'
  | 'Advisor'
  | 'Spouse'
  | 'Other';

export const CONTACT_TYPES: { value: ContactType; label: string }[] = [
  { value: 'Person', label: 'Person' },
  { value: 'Company', label: 'Company' },
  { value: 'Entity', label: 'Entity (LLC, LP, etc.)' },
  { value: 'Fund', label: 'Fund' },
  { value: 'Government', label: 'Government' },
  { value: 'Other', label: 'Other' },
];

export const ROLE_CATEGORIES: { value: RoleCategory; label: string }[] = [
  { value: 'Principal', label: 'Principal' },
  { value: 'Financing', label: 'Financing' },
  { value: 'Advisor', label: 'Advisor' },
  { value: 'Contact', label: 'Contact' },
  { value: 'Other', label: 'Other' },
];

export const RELATIONSHIP_TYPES: { value: RelationshipType; label: string; description: string }[] = [
  { value: 'Employee', label: 'Employee', description: 'Person works for Company' },
  { value: 'Principal', label: 'Principal', description: 'Person is principal/partner of Company/Entity' },
  { value: 'Subsidiary', label: 'Subsidiary', description: 'Entity is subsidiary of Company' },
  { value: 'Affiliate', label: 'Affiliate', description: 'Entity is affiliated with Company' },
  { value: 'Member', label: 'Member', description: 'Person is member of Entity (LLC)' },
  { value: 'Counsel', label: 'Counsel', description: 'Person/Company provides legal counsel' },
  { value: 'Advisor', label: 'Advisor', description: 'Person/Company provides advisory services' },
  { value: 'Spouse', label: 'Spouse', description: 'Person is spouse of Person' },
  { value: 'Other', label: 'Other', description: 'Other relationship type' },
];

export const ENTITY_TYPES = [
  'LLC',
  'LP',
  'LLP',
  'Corporation',
  'S-Corp',
  'C-Corp',
  'Trust',
  'REIT',
  'Partnership',
  'Sole Proprietorship',
  'Other',
] as const;

// =============================================================================
// CABINET
// =============================================================================

export interface Cabinet {
  cabinet_id: number;
  cabinet_name: string;
  owner_user_id: string;
  cabinet_type: 'standard' | 'enterprise' | 'personal';
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface CabinetStats {
  cabinet_id: number;
  cabinet_name: string;
  project_count: number;
  contact_count: number;
  document_count: number;
}

// =============================================================================
// CONTACT ROLE
// =============================================================================

export interface ContactRole {
  role_id: number;
  cabinet_id: number | null; // null = system role
  role_code: string;
  role_label: string;
  role_category: RoleCategory;
  typical_contact_types: ContactType[];
  description?: string;
  display_order: number;
  is_system: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ContactRoleFormData {
  role_code: string;
  role_label: string;
  role_category: RoleCategory;
  typical_contact_types: ContactType[];
  description?: string;
  display_order?: number;
}

// =============================================================================
// CONTACT
// =============================================================================

export interface Contact {
  contact_id: number;
  cabinet_id: number;
  contact_type: ContactType;
  name: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  company_name?: string;
  entity_type?: string;
  email?: string;
  phone?: string;
  phone_mobile?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  notes?: string;
  tags: string[];
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  is_active: boolean;
}

export interface ContactListItem {
  contact_id: number;
  contact_type: ContactType;
  name: string;
  display_name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  is_active: boolean;
}

export interface ContactDetail extends Contact {
  relationships: ContactRelationshipSummary[];
  projects: ContactProjectSummary[];
}

export interface ContactFormData {
  contact_type: ContactType;
  name: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  company_name?: string;
  entity_type?: string;
  email?: string;
  phone?: string;
  phone_mobile?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  notes?: string;
  tags?: string[];
}

export interface ContactTypeaheadItem {
  contact_id: number;
  name: string;
  company_name?: string;
  contact_type: ContactType;
  label: string; // Formatted display label
}

// =============================================================================
// CONTACT RELATIONSHIP
// =============================================================================

export interface ContactRelationship {
  relationship_id: number;
  cabinet_id: number;
  contact_id: number;
  contact_name: string;
  contact_type: ContactType;
  related_to_id: number;
  related_to_name: string;
  related_to_type: ContactType;
  relationship_type: RelationshipType;
  role_title?: string;
  start_date?: string;
  end_date?: string;
  is_current: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ContactRelationshipSummary {
  relationship_id: number;
  direction: 'outgoing' | 'incoming';
  related_contact: {
    contact_id: number;
    name: string;
    contact_type: ContactType;
  };
  relationship_type: RelationshipType;
  role_title?: string;
  is_current: boolean;
}

export interface ContactRelationshipFormData {
  contact_id: number;
  related_to_id: number;
  relationship_type: RelationshipType;
  role_title?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
}

// =============================================================================
// PROJECT CONTACT (Junction)
// =============================================================================

export interface ProjectContact {
  project_contact_id: number;
  project_id: number;
  contact_id: number;
  contact_name: string;
  contact_type: ContactType;
  contact_email?: string;
  contact_phone?: string;
  company_name?: string;
  role_id: number;
  role_code: string;
  role_label: string;
  role_category: RoleCategory;
  is_primary: boolean;
  is_billing_contact: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectContactFormData {
  contact_id: number;
  role_id: number;
  is_primary?: boolean;
  is_billing_contact?: boolean;
  notes?: string;
}

export interface ContactProjectSummary {
  project_id: number;
  project_name: string;
  role: string;
  role_category: RoleCategory;
  is_primary: boolean;
}

// =============================================================================
// GROUPED DATA STRUCTURES
// =============================================================================

export interface ContactsByCategory {
  [category: string]: ProjectContact[];
}

export interface RolesByCategory {
  [category: string]: ContactRole[];
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ContactRelationshipsResponse {
  outgoing: ContactRelationship[];
  incoming: ContactRelationship[];
}

// =============================================================================
// LEGACY TYPES (for backward compatibility during migration)
// =============================================================================

/** @deprecated Use ProjectContact instead */
export interface LegacyProjectContact {
  contact_id: number;
  name: string;
  title?: string;
  company?: string;
  email?: string;
  phone_direct?: string;
  phone_mobile?: string;
  notes?: string;
  sort_order?: number;
}

/** @deprecated Use ContactsByCategory instead */
export interface ContactGroup {
  role_key: string;
  role_label: string;
  contacts: LegacyProjectContact[];
}

/** @deprecated Use ContactFormData instead */
export interface LegacyContactFormData {
  contact_role: string;
  name: string;
  title?: string;
  company?: string;
  email?: string;
  phone_direct?: string;
  phone_mobile?: string;
  notes?: string;
}

/** @deprecated Use CONTACT_ROLES from API instead */
export const CONTACT_ROLES = [
  { value: 'property_contact', label: 'Property Contact' },
  { value: 'listing_broker', label: 'Listing Broker' },
  { value: 'owner_representative', label: 'Owner Representative' },
  { value: 'architect', label: 'Architect' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'legal_counsel', label: 'Legal Counsel' },
  { value: 'other', label: 'Other' }
] as const;
