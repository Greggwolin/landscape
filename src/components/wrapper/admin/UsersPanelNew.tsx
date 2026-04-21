'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  AdminUser,
  CreateUserData,
  UpdateUserData,
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  setUserPassword,
  activateUser,
  deactivateUser,
} from '@/lib/api/admin-users';

type Mode = 'create' | 'edit' | 'password' | null;

interface FormState {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  company: string;
  phone: string;
  role: string;
  is_active: boolean;
  is_staff: boolean;
  password: string;
  password_confirm: string;
}

const EMPTY_FORM: FormState = {
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  company: '',
  phone: '',
  role: 'user',
  is_active: true,
  is_staff: false,
  password: '',
  password_confirm: '',
};

function initials(u: AdminUser): string {
  const f = (u.first_name || '').trim();
  const l = (u.last_name || '').trim();
  if (f || l) return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase();
  return (u.username || u.email || '?').slice(0, 2).toUpperCase();
}

export default function UsersPanelNew() {
  const { tokens, user: currentUser, isLoading: authLoading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const load = useCallback(async () => {
    if (!tokens?.access) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUsers(tokens.access);
      setUsers(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [tokens?.access]);

  useEffect(() => {
    if (!authLoading && tokens?.access) void load();
  }, [authLoading, tokens?.access, load]);

  const openCreate = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setMode('create');
  };

  const openEdit = (u: AdminUser) => {
    setEditingUser(u);
    setForm({
      ...EMPTY_FORM,
      username: u.username,
      email: u.email,
      first_name: u.first_name || '',
      last_name: u.last_name || '',
      company: u.company || '',
      phone: u.phone || '',
      role: u.role || 'user',
      is_active: u.is_active,
      is_staff: u.is_staff,
    });
    setMode('edit');
  };

  const openPassword = (u: AdminUser) => {
    setEditingUser(u);
    setForm({ ...EMPTY_FORM, password: '', password_confirm: '' });
    setMode('password');
  };

  const closeModal = () => {
    setMode(null);
    setEditingUser(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokens?.access) return;
    setLoading(true);
    setError(null);
    try {
      if (mode === 'create') {
        const payload: CreateUserData = {
          username: form.username,
          email: form.email,
          password: form.password,
          password_confirm: form.password_confirm,
          first_name: form.first_name,
          last_name: form.last_name,
          company: form.company,
          phone: form.phone,
          role: form.role,
          is_active: form.is_active,
          is_staff: form.is_staff,
        };
        await createUser(tokens.access, payload);
      } else if (mode === 'edit' && editingUser) {
        const payload: UpdateUserData = {
          username: form.username,
          email: form.email,
          first_name: form.first_name,
          last_name: form.last_name,
          company: form.company,
          phone: form.phone,
          role: form.role,
          is_active: form.is_active,
          is_staff: form.is_staff,
        };
        await updateUser(tokens.access, editingUser.id, payload);
      } else if (mode === 'password' && editingUser) {
        await setUserPassword(tokens.access, editingUser.id, {
          password: form.password,
          password_confirm: form.password_confirm,
        });
      }
      await load();
      closeModal();
    } catch (e: any) {
      setError(e?.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (u: AdminUser) => {
    if (!tokens?.access) return;
    setLoading(true);
    try {
      if (u.is_active) await deactivateUser(tokens.access, u.id);
      else await activateUser(tokens.access, u.id);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to toggle user');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (u: AdminUser) => {
    if (!tokens?.access) return;
    if (!confirm(`Delete user "${u.username}"? This cannot be undone.`)) return;
    setLoading(true);
    try {
      await deleteUser(tokens.access, u.id);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className="w-dms-admin-empty">Loading…</div>;

  if (!currentUser?.is_staff) {
    return (
      <div className="w-dms-admin-empty">
        Admin access required. Sign in as a staff user to manage users.
      </div>
    );
  }

  return (
    <div className="w-dms-admin">
      <div className="w-dms-admin-head">
        <div>
          <div className="w-admin-section-title" style={{ fontSize: 15 }}>Team Members</div>
          <div className="w-admin-section-note" style={{ marginBottom: 0 }}>
            Manage platform users, roles, and access
          </div>
        </div>
        <button className="w-btn w-btn-primary" onClick={openCreate}>+ Invite User</button>
      </div>

      {error && (
        <div className="w-dms-admin-empty" style={{ color: 'var(--w-danger-text)', borderColor: 'var(--w-danger-text)' }}>
          {error}
        </div>
      )}

      {loading && users.length === 0 ? (
        <div className="w-dms-admin-empty">Loading users…</div>
      ) : users.length === 0 ? (
        <div className="w-dms-admin-empty">No users found.</div>
      ) : (
        <div className="w-admin-card" style={{ padding: 0 }}>
          {users.map((u) => (
            <div key={u.id} className="w-admin-row" style={{ padding: '8px 12px' }}>
              <div className="w-admin-user">
                <div className="w-admin-avatar tone-accent">{initials(u)}</div>
                <div>
                  <div className="w-admin-user-name">
                    {u.first_name || u.last_name
                      ? `${u.first_name} ${u.last_name}`.trim()
                      : u.username}
                    {u.id === currentUser?.id && (
                      <span className="w-admin-pill accent" style={{ marginLeft: 6 }}>You</span>
                    )}
                  </div>
                  <div className="w-admin-user-email">{u.email}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`w-admin-pill ${u.is_staff ? 'accent' : 'muted'}`}>
                  {u.is_staff ? 'Admin' : u.role || 'User'}
                </span>
                <span className={`w-admin-status ${u.is_active ? 'active' : 'draft'}`}>
                  {u.is_active ? 'Active' : 'Inactive'}
                </span>
                <button className="w-dms-link" onClick={() => openEdit(u)}>Edit</button>
                <button className="w-dms-link" onClick={() => openPassword(u)}>Password</button>
                <button className="w-dms-link" onClick={() => toggleActive(u)}>
                  {u.is_active ? 'Deactivate' : 'Activate'}
                </button>
                {u.id !== currentUser?.id && (
                  <button className="w-dms-link is-danger" onClick={() => remove(u)}>Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {mode && (
        <div className="w-modal-backdrop" onClick={closeModal}>
          <div className="w-modal" onClick={(e) => e.stopPropagation()}>
            <div className="w-modal-head">
              <span>
                {mode === 'create'
                  ? 'Invite User'
                  : mode === 'edit'
                  ? `Edit ${editingUser?.username}`
                  : `Set Password — ${editingUser?.username}`}
              </span>
              <button className="w-modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={submit} className="w-modal-body">
              {mode !== 'password' && (
                <>
                  <label className="w-modal-field">
                    <span>Username *</span>
                    <input
                      type="text"
                      required
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                    />
                  </label>
                  <label className="w-modal-field">
                    <span>Email *</span>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <label className="w-modal-field">
                      <span>First Name</span>
                      <input
                        type="text"
                        value={form.first_name}
                        onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                      />
                    </label>
                    <label className="w-modal-field">
                      <span>Last Name</span>
                      <input
                        type="text"
                        value={form.last_name}
                        onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                      />
                    </label>
                  </div>
                  <label className="w-modal-field">
                    <span>Company</span>
                    <input
                      type="text"
                      value={form.company}
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
                    />
                  </label>
                  <label className="w-modal-field">
                    <span>Role</span>
                    <input
                      type="text"
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      placeholder="user, analyst, admin…"
                    />
                  </label>
                  <label className="w-modal-check">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    />
                    <span>Active</span>
                  </label>
                  <label className="w-modal-check">
                    <input
                      type="checkbox"
                      checked={form.is_staff}
                      onChange={(e) => setForm({ ...form, is_staff: e.target.checked })}
                    />
                    <span>Admin (staff) — full admin panel access</span>
                  </label>
                </>
              )}

              {(mode === 'create' || mode === 'password') && (
                <>
                  <label className="w-modal-field">
                    <span>Password *</span>
                    <input
                      type="password"
                      required
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                  </label>
                  <label className="w-modal-field">
                    <span>Confirm Password *</span>
                    <input
                      type="password"
                      required
                      value={form.password_confirm}
                      onChange={(e) => setForm({ ...form, password_confirm: e.target.value })}
                    />
                  </label>
                </>
              )}

              <div className="w-modal-foot">
                <button
                  type="button"
                  className="w-btn w-btn-ghost"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-btn w-btn-primary"
                  disabled={loading}
                >
                  {loading
                    ? 'Saving…'
                    : mode === 'create'
                    ? 'Create User'
                    : mode === 'password'
                    ? 'Set Password'
                    : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
