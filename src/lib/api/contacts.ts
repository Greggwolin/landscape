/**
 * API client for Contact Management Django REST endpoints
 *
 * This module provides type-safe wrappers around the Django REST API
 * for cabinet/contact management functionality.
 */

import type {
  Cabinet,
  CabinetStats,
  Contact,
  ContactListItem,
  ContactDetail,
  ContactFormData,
  ContactRole,
  ContactRoleFormData,
  ContactRelationship,
  ContactRelationshipFormData,
  ContactRelationshipsResponse,
  ContactTypeaheadItem,
  ProjectContact,
  ProjectContactFormData,
  ContactsByCategory,
  PaginatedResponse,
  ContactType,
  RoleCategory,
} from '@/types/contacts';

const DJANGO_API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

// ============================================================================
// Helper Functions
// ============================================================================

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${DJANGO_API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || error.error || `API error: ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// ============================================================================
// Cabinet API
// ============================================================================

export async function getCabinets(): Promise<PaginatedResponse<Cabinet>> {
  return fetchApi<PaginatedResponse<Cabinet>>('/api/cabinet/');
}

export async function getCabinet(cabinetId: number): Promise<Cabinet> {
  return fetchApi<Cabinet>(`/api/cabinet/${cabinetId}/`);
}

export async function getCabinetStats(cabinetId: number): Promise<CabinetStats> {
  return fetchApi<CabinetStats>(`/api/cabinet/${cabinetId}/stats/`);
}

export async function updateCabinet(
  cabinetId: number,
  data: Partial<Cabinet>
): Promise<Cabinet> {
  return fetchApi<Cabinet>(`/api/cabinet/${cabinetId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ============================================================================
// Contact Role API
// ============================================================================

export async function getContactRoles(params?: {
  category?: RoleCategory;
  cabinet_id?: number;
}): Promise<PaginatedResponse<ContactRole>> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set('category', params.category);
  if (params?.cabinet_id) searchParams.set('cabinet_id', params.cabinet_id.toString());

  const query = searchParams.toString();
  return fetchApi<PaginatedResponse<ContactRole>>(
    `/api/contact-roles/${query ? `?${query}` : ''}`
  );
}

export async function getContactRole(roleId: number): Promise<ContactRole> {
  return fetchApi<ContactRole>(`/api/contact-roles/${roleId}/`);
}

export async function createContactRole(data: ContactRoleFormData): Promise<ContactRole> {
  return fetchApi<ContactRole>('/api/contact-roles/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateContactRole(
  roleId: number,
  data: Partial<ContactRoleFormData>
): Promise<ContactRole> {
  return fetchApi<ContactRole>(`/api/contact-roles/${roleId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteContactRole(roleId: number): Promise<void> {
  await fetchApi<void>(`/api/contact-roles/${roleId}/`, {
    method: 'DELETE',
  });
}

export async function toggleContactRoleVisibility(
  roleId: number,
  isActive: boolean
): Promise<ContactRole> {
  return fetchApi<ContactRole>(`/api/contact-roles/${roleId}/visibility/`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive }),
  });
}

// ============================================================================
// Contact API
// ============================================================================

export interface GetContactsParams {
  cabinet_id?: number;
  type?: ContactType;
  search?: string;
  tag?: string[];
}

export async function getContacts(
  params?: GetContactsParams
): Promise<PaginatedResponse<ContactListItem>> {
  const searchParams = new URLSearchParams();
  if (params?.cabinet_id) searchParams.set('cabinet_id', params.cabinet_id.toString());
  if (params?.type) searchParams.set('type', params.type);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.tag) {
    params.tag.forEach((t) => searchParams.append('tag', t));
  }

  const query = searchParams.toString();
  return fetchApi<PaginatedResponse<ContactListItem>>(
    `/api/contacts/${query ? `?${query}` : ''}`
  );
}

export async function getContact(contactId: number): Promise<ContactDetail> {
  return fetchApi<ContactDetail>(`/api/contacts/${contactId}/`);
}

export async function createContact(
  data: ContactFormData & { cabinet_id?: number }
): Promise<Contact> {
  return fetchApi<Contact>('/api/contacts/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateContact(
  contactId: number,
  data: Partial<ContactFormData>
): Promise<Contact> {
  return fetchApi<Contact>(`/api/contacts/${contactId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteContact(contactId: number): Promise<void> {
  await fetchApi<void>(`/api/contacts/${contactId}/`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Contact Typeahead API
// ============================================================================

export async function searchContacts(
  query: string,
  options?: {
    type?: ContactType | ContactType[];
    cabinet_id?: number;
  }
): Promise<ContactTypeaheadItem[]> {
  if (query.length < 2) return [];

  const searchParams = new URLSearchParams();
  searchParams.set('q', query);
  if (options?.cabinet_id) {
    searchParams.set('cabinet_id', options.cabinet_id.toString());
  }
  if (options?.type) {
    const types = Array.isArray(options.type) ? options.type.join(',') : options.type;
    searchParams.set('type', types);
  }

  return fetchApi<ContactTypeaheadItem[]>(
    `/api/contacts/typeahead/?${searchParams.toString()}`
  );
}

// ============================================================================
// Contact Relationship API
// ============================================================================

export async function getContactRelationships(
  contactId: number
): Promise<ContactRelationshipsResponse> {
  return fetchApi<ContactRelationshipsResponse>(
    `/api/contacts/${contactId}/relationships/`
  );
}

export async function createContactRelationship(
  contactId: number,
  data: Omit<ContactRelationshipFormData, 'contact_id'>
): Promise<ContactRelationship> {
  return fetchApi<ContactRelationship>(`/api/contacts/${contactId}/relationships/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteContactRelationship(
  contactId: number,
  relationshipId: number
): Promise<void> {
  await fetchApi<void>(
    `/api/contacts/${contactId}/relationships/${relationshipId}/`,
    { method: 'DELETE' }
  );
}

// ============================================================================
// Contact Projects API
// ============================================================================

export async function getContactProjects(contactId: number): Promise<
  Array<{
    project_contact_id: number;
    project_id: number;
    project_name: string;
    project_type_code: string;
    role: string;
    role_category: RoleCategory;
    is_primary: boolean;
    assigned_at: string;
  }>
> {
  return fetchApi(`/api/contacts/${contactId}/projects/`);
}

// ============================================================================
// Project Contact API (Junction)
// ============================================================================

export async function getProjectContacts(
  projectId: number
): Promise<PaginatedResponse<ProjectContact>> {
  return fetchApi<PaginatedResponse<ProjectContact>>(
    `/api/projects/${projectId}/contacts/`
  );
}

export async function getProjectContactsByCategory(
  projectId: number
): Promise<ContactsByCategory> {
  return fetchApi<ContactsByCategory>(
    `/api/projects/${projectId}/contacts/by_category/`
  );
}

export async function addContactToProject(
  projectId: number,
  data: ProjectContactFormData
): Promise<ProjectContact> {
  return fetchApi<ProjectContact>(`/api/projects/${projectId}/contacts/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProjectContact(
  projectId: number,
  projectContactId: number,
  data: Partial<ProjectContactFormData>
): Promise<ProjectContact> {
  return fetchApi<ProjectContact>(
    `/api/projects/${projectId}/contacts/${projectContactId}/`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    }
  );
}

export async function removeContactFromProject(
  projectId: number,
  projectContactId: number
): Promise<void> {
  await fetchApi<void>(
    `/api/projects/${projectId}/contacts/${projectContactId}/`,
    { method: 'DELETE' }
  );
}

// ============================================================================
// SWR Fetcher Helpers
// ============================================================================

/**
 * SWR fetcher for contacts list
 * Usage: useSWR(['/api/contacts', params], contactsFetcher)
 */
export const contactsFetcher = async ([, params]: [string, GetContactsParams?]) => {
  return getContacts(params);
};

/**
 * SWR fetcher for single contact
 * Usage: useSWR(['/api/contacts', contactId], contactFetcher)
 */
export const contactFetcher = async ([, contactId]: [string, number]) => {
  return getContact(contactId);
};

/**
 * SWR fetcher for contact roles
 * Usage: useSWR('/api/contact-roles', rolesFetcher)
 */
export const rolesFetcher = async () => {
  return getContactRoles();
};

/**
 * SWR fetcher for project contacts
 * Usage: useSWR(['/api/projects', projectId, 'contacts'], projectContactsFetcher)
 */
export const projectContactsFetcher = async ([, projectId]: [string, number, string]) => {
  return getProjectContacts(projectId);
};

/**
 * SWR fetcher for project contacts by category
 * Usage: useSWR(['/api/projects', projectId, 'contacts/by_category'], projectContactsByCategoryFetcher)
 */
export const projectContactsByCategoryFetcher = async ([, projectId]: [
  string,
  number,
  string
]) => {
  return getProjectContactsByCategory(projectId);
};
