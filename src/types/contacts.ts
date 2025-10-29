export interface ProjectContact {
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

export interface ContactGroup {
  role_key: string;
  role_label: string;
  contacts: ProjectContact[];
}

export interface ContactFormData {
  contact_role: string;
  name: string;
  title?: string;
  company?: string;
  email?: string;
  phone_direct?: string;
  phone_mobile?: string;
  notes?: string;
}

export const CONTACT_ROLES = [
  { value: 'property_contact', label: 'Property Contact' },
  { value: 'listing_broker', label: 'Listing Broker' },
  { value: 'owner_representative', label: 'Owner Representative' },
  { value: 'architect', label: 'Architect' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'legal_counsel', label: 'Legal Counsel' },
  { value: 'other', label: 'Other' }
] as const;
