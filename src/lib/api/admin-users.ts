/**
 * Admin User Management API
 *
 * API functions for admin user management operations.
 */

const DJANGO_API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  company: string | null;
  phone: string | null;
  role: string;
  is_verified: boolean;
  is_active: boolean;
  is_staff: boolean;
  plain_password: string | null;
  created_at: string;
  last_login: string | null;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  phone?: string;
  is_active?: boolean;
  is_staff?: boolean;
  role?: string;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  phone?: string;
  is_active?: boolean;
  is_staff?: boolean;
  role?: string;
}

export interface SetPasswordData {
  password: string;
  password_confirm: string;
}

async function authFetch(url: string, token: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error
      || errorData.detail
      || Object.entries(errorData)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join('; ')
      || `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Fetch all users (admin only)
 */
export async function fetchUsers(token: string): Promise<AdminUser[]> {
  const data = await authFetch(`${DJANGO_API_BASE}/api/auth/users/`, token);
  return data.results || data;
}

/**
 * Fetch a single user by ID
 */
export async function fetchUser(token: string, userId: number): Promise<AdminUser> {
  return authFetch(`${DJANGO_API_BASE}/api/auth/users/${userId}/`, token);
}

/**
 * Create a new user (admin only)
 */
export async function createUser(token: string, data: CreateUserData): Promise<AdminUser> {
  return authFetch(`${DJANGO_API_BASE}/api/auth/users/`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update user details (admin only)
 */
export async function updateUser(token: string, userId: number, data: UpdateUserData): Promise<AdminUser> {
  return authFetch(`${DJANGO_API_BASE}/api/auth/users/${userId}/`, token, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a user (admin only)
 */
export async function deleteUser(token: string, userId: number): Promise<{ message: string }> {
  return authFetch(`${DJANGO_API_BASE}/api/auth/users/${userId}/`, token, {
    method: 'DELETE',
  });
}

/**
 * Set password for a user (admin only, no current password required)
 */
export async function setUserPassword(token: string, userId: number, data: SetPasswordData): Promise<{ message: string }> {
  return authFetch(`${DJANGO_API_BASE}/api/auth/users/${userId}/set_password/`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Activate a user (admin only)
 */
export async function activateUser(token: string, userId: number): Promise<{ message: string }> {
  return authFetch(`${DJANGO_API_BASE}/api/auth/users/${userId}/activate/`, token, {
    method: 'POST',
  });
}

/**
 * Deactivate a user (admin only)
 */
export async function deactivateUser(token: string, userId: number): Promise<{ message: string }> {
  return authFetch(`${DJANGO_API_BASE}/api/auth/users/${userId}/deactivate/`, token, {
    method: 'POST',
  });
}
