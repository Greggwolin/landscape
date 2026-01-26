'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/toast';
import {
  AdminUser,
  CreateUserData,
  UpdateUserData,
  SetPasswordData,
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  setUserPassword,
  activateUser,
  deactivateUser,
} from '@/lib/api/admin-users';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, RefreshCw, Edit2, Key, Trash2, Shield, Users } from 'lucide-react';

// ============================================================================
// User Management Panel
// ============================================================================

export default function UserManagementPanel() {
  const { tokens, user: currentUser, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const loadUsers = useCallback(async () => {
    if (!tokens?.access) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchUsers(tokens.access);
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [tokens]);

  useEffect(() => {
    // Wait for auth to finish loading before attempting to fetch users
    if (!authLoading) {
      if (tokens?.access) {
        loadUsers();
      } else {
        setIsLoading(false);
        setError('Please log in to manage users');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, tokens?.access]);

  // Handle toggle active status
  const handleToggleActive = async (user: AdminUser) => {
    if (!tokens?.access) return;

    setActionLoading(user.id);

    try {
      if (user.is_active) {
        await deactivateUser(tokens.access, user.id);
        showToast(`${user.username} has been deactivated`, 'success');
      } else {
        await activateUser(tokens.access, user.id);
        showToast(`${user.username} has been activated`, 'success');
      }

      setUsers(prev =>
        prev.map(u => (u.id === user.id ? { ...u, is_active: !user.is_active } : u))
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle create user
  const handleCreateUser = async (data: CreateUserData) => {
    if (!tokens?.access) return;
    setModalLoading(true);

    try {
      await createUser(tokens.access, data);
      showToast('User created successfully', 'success');
      await loadUsers();
    } finally {
      setModalLoading(false);
    }
  };

  // Handle update user
  const handleUpdateUser = async (userId: number, data: UpdateUserData) => {
    if (!tokens?.access) return;
    setModalLoading(true);

    try {
      await updateUser(tokens.access, userId, data);
      showToast('User updated successfully', 'success');
      await loadUsers();
    } finally {
      setModalLoading(false);
    }
  };

  // Handle set password
  const handleSetPassword = async (userId: number, data: SetPasswordData) => {
    if (!tokens?.access) return;
    setModalLoading(true);

    try {
      await setUserPassword(tokens.access, userId, data);
      showToast('Password updated successfully', 'success');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async (userId: number) => {
    if (!tokens?.access) return;
    setModalLoading(true);

    try {
      await deleteUser(tokens.access, userId);
      showToast('User deleted successfully', 'success');
      await loadUsers();
    } finally {
      setModalLoading(false);
    }
  };

  // Open modals
  const openEditModal = (user: AdminUser) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const openResetPasswordModal = (user: AdminUser) => {
    setSelectedUser(user);
    setShowResetPasswordModal(true);
  };

  const openDeleteModal = (user: AdminUser) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-blue-400" />
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--cui-body-color)' }}>
              User Management
            </h2>
            <p className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
              Manage user accounts, permissions, and access
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadUsers}
            className="px-3 py-1.5 text-sm rounded-lg transition flex items-center gap-2"
            style={{
              backgroundColor: 'var(--cui-tertiary-bg)',
              color: 'var(--cui-body-color)',
              border: '1px solid var(--cui-border-color)',
            }}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
          {error}
          {error.includes('log in') && (
            <p className="mt-2 text-sm">
              Click the user icon in the top navigation bar to sign in.
            </p>
          )}
        </div>
      )}

      {/* Users Table */}
      <div
        className="rounded-lg overflow-hidden"
        style={{
          backgroundColor: 'var(--cui-card-bg)',
          border: '1px solid var(--cui-border-color)',
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--cui-secondary-color)' }}>
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--cui-secondary-color)' }}>
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--cui-secondary-color)' }}>
                  Organization
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--cui-secondary-color)' }}>
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--cui-secondary-color)' }}>
                  Last Login
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--cui-secondary-color)' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody style={{ borderTop: '1px solid var(--cui-border-color)' }}>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center" style={{ color: 'var(--cui-secondary-color)' }}>
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user, idx) => (
                  <tr
                    key={user.id}
                    className="hover:bg-opacity-50 transition"
                    style={{
                      backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--cui-tertiary-bg)',
                      borderBottom: '1px solid var(--cui-border-color)',
                    }}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                          {user.first_name?.[0] || user.username[0].toUpperCase()}
                        </div>
                        <div className="ml-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium" style={{ color: 'var(--cui-body-color)' }}>
                              {user.first_name && user.last_name
                                ? `${user.first_name} ${user.last_name}`
                                : user.username}
                            </span>
                            {user.is_staff && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-purple-900/50 text-purple-300">
                                <Shield className="w-3 h-3 mr-1" />
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
                            @{user.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm" style={{ color: 'var(--cui-body-color)' }}>{user.email}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
                        {user.company || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(user)}
                        disabled={actionLoading === user.id || user.id === currentUser?.id}
                        className={`inline-flex px-2 py-1 text-xs rounded-full transition ${
                          user.is_active
                            ? 'bg-green-900/50 text-green-300 hover:bg-green-900'
                            : 'bg-red-900/50 text-red-300 hover:bg-red-900'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={user.id === currentUser?.id ? "You can't deactivate yourself" : ''}
                      >
                        {actionLoading === user.id ? (
                          <span className="flex items-center gap-1">
                            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            ...
                          </span>
                        ) : user.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-1.5 rounded-lg transition"
                          style={{ color: 'var(--cui-secondary-color)' }}
                          title="Edit user"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openResetPasswordModal(user)}
                          className="p-1.5 rounded-lg transition text-yellow-500 hover:text-yellow-400"
                          title="Reset password"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(user)}
                          disabled={user.id === currentUser?.id}
                          className="p-1.5 rounded-lg transition text-red-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                          title={user.id === currentUser?.id ? "You can't delete yourself" : 'Delete user'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="flex gap-6 text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
        <span>Total: {users.length} users</span>
        <span>Active: {users.filter(u => u.is_active).length}</span>
        <span>Inactive: {users.filter(u => !u.is_active).length}</span>
        <span>Admins: {users.filter(u => u.is_staff).length}</span>
      </div>

      {/* Modals */}
      <AddUserModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleCreateUser}
        isLoading={modalLoading}
      />

      <EditUserModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onSubmit={handleUpdateUser}
        onSetPassword={handleSetPassword}
        isLoading={modalLoading}
      />

      <ResetPasswordModal
        isOpen={showResetPasswordModal}
        onClose={() => {
          setShowResetPasswordModal(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onSubmit={handleSetPassword}
        isLoading={modalLoading}
      />

      <DeleteUserModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onConfirm={handleDeleteUser}
        isLoading={modalLoading}
      />
    </div>
  );
}

// ============================================================================
// Modal Components (inlined for simplicity)
// ============================================================================

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
}

const modalStyle = {
  backgroundColor: 'var(--cui-tertiary-bg)',
  borderColor: 'var(--cui-border-color)',
  color: 'var(--cui-body-color)',
};
const inputStyle = {
  backgroundColor: 'var(--cui-secondary-bg)',
  borderColor: 'var(--cui-border-color)',
  color: 'var(--cui-body-color)',
};
const inputClass = "w-full px-3 py-2 border rounded-lg placeholder-gray-400 focus:outline-none";
const secondaryTextStyle = { color: 'var(--cui-secondary-color)' };
const dangerTextStyle = { color: 'var(--cui-danger)' };
const errorStyle = {
  backgroundColor: 'color-mix(in srgb, var(--cui-danger) 15%, var(--cui-body-bg))',
  borderColor: 'var(--cui-danger)',
  color: 'var(--cui-danger)',
};

interface UserFormModalProps extends BaseModalProps {
  title: string;
  description: string;
  submitLabel: string;
  initialData: CreateUserData;
  passwordRequired: boolean;
  onSubmit: (data: CreateUserData) => Promise<void>;
}

function UserFormModal({
  isOpen,
  onClose,
  isLoading,
  title,
  description,
  submitLabel,
  initialData,
  passwordRequired,
  onSubmit,
}: UserFormModalProps) {
  const [formData, setFormData] = useState<CreateUserData>(initialData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData);
      setError(null);
    }
  }, [isOpen, initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const password = formData.password || '';
    const passwordConfirm = formData.password_confirm || '';

    if (passwordRequired || password || passwordConfirm) {
      if (!password || !passwordConfirm) {
        setError('Password and confirmation are required');
        return;
      }
      if (password !== passwordConfirm) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
    }

    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="border max-w-lg max-h-[90vh] overflow-y-auto" style={modalStyle}>
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--cui-body-color)' }}>{title}</DialogTitle>
          <DialogDescription style={secondaryTextStyle}>{description}</DialogDescription>
        </DialogHeader>

        {error && <div className="p-3 border rounded text-sm" style={errorStyle}>{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={secondaryTextStyle}>First Name</label>
              <input type="text" name="first_name" value={formData.first_name || ''} onChange={handleChange} className={inputClass} style={inputStyle} placeholder="John" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={secondaryTextStyle}>Last Name</label>
              <input type="text" name="last_name" value={formData.last_name || ''} onChange={handleChange} className={inputClass} style={inputStyle} placeholder="Doe" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={secondaryTextStyle}>Username <span style={dangerTextStyle}>*</span></label>
            <input type="text" name="username" value={formData.username} onChange={handleChange} required className={inputClass} style={inputStyle} placeholder="johndoe" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={secondaryTextStyle}>Email <span style={dangerTextStyle}>*</span></label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required className={inputClass} style={inputStyle} placeholder="john@example.com" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={secondaryTextStyle}>Role <span style={dangerTextStyle}>*</span></label>
            <select name="role" value={formData.role} onChange={handleChange} required className={inputClass} style={inputStyle}>
              <option value="admin">Admin</option>
              <option value="alpha_tester">Alpha Tester</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={secondaryTextStyle}>Company</label>
              <input type="text" name="company" value={formData.company || ''} onChange={handleChange} className={inputClass} style={inputStyle} placeholder="Company Inc." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={secondaryTextStyle}>Phone</label>
              <input type="tel" name="phone" value={formData.phone || ''} onChange={handleChange} className={inputClass} style={inputStyle} placeholder="(555) 123-4567" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={secondaryTextStyle}>Password <span style={dangerTextStyle}>*</span></label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} required={passwordRequired} minLength={8} className={inputClass} style={inputStyle} placeholder="Min 8 characters" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={secondaryTextStyle}>Confirm Password <span style={dangerTextStyle}>*</span></label>
              <input type="password" name="password_confirm" value={formData.password_confirm} onChange={handleChange} required={passwordRequired} minLength={8} className={inputClass} style={inputStyle} placeholder="Repeat password" />
            </div>
          </div>

          <div className="flex gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="is_active" checked={formData.is_active || false} onChange={handleChange} className="w-4 h-4 rounded" style={{ accentColor: 'var(--cui-primary)' }} />
              <span className="text-sm" style={secondaryTextStyle}>Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="is_staff" checked={formData.is_staff || false} onChange={handleChange} className="w-4 h-4 rounded" style={{ accentColor: 'var(--cui-primary)' }} />
              <span className="text-sm" style={secondaryTextStyle}>Admin</span>
            </label>
          </div>

          <DialogFooter className="pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm transition hover:opacity-80" style={secondaryTextStyle}>Cancel</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 rounded-lg transition flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90" style={{ backgroundColor: 'var(--cui-primary)', color: 'white' }}>
              {isLoading && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
              {submitLabel}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Add User Modal
interface AddUserModalProps extends BaseModalProps {
  onSubmit: (data: CreateUserData) => Promise<void>;
}

export function AddUserModal({ isOpen, onClose, onSubmit, isLoading }: AddUserModalProps) {
  const initialData = useMemo<CreateUserData>(() => ({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    company: '',
    phone: '',
    is_active: true,
    is_staff: false,
    role: 'alpha_tester',
  }), []);

  return (
    <UserFormModal
      isOpen={isOpen}
      onClose={onClose}
      isLoading={isLoading}
      title="Add New User"
      description="Create a new user account. All required fields are marked with *."
      submitLabel="Create User"
      initialData={initialData}
      passwordRequired
      onSubmit={onSubmit}
    />
  );
}

// Edit User Modal
interface EditUserModalProps extends BaseModalProps {
  user: AdminUser | null;
  onSubmit: (userId: number, data: UpdateUserData) => Promise<void>;
  onSetPassword: (userId: number, data: SetPasswordData) => Promise<void>;
}

export function EditUserModal({ isOpen, onClose, user, onSubmit, onSetPassword, isLoading }: EditUserModalProps) {
  if (!user) return null;

  const initialData = useMemo<CreateUserData>(() => ({
    username: user.username,
    email: user.email,
    password: '',
    password_confirm: '',
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    company: user.company || '',
    phone: user.phone || '',
    is_active: user.is_active,
    is_staff: user.is_staff,
    role: user.role,
  }), [user]);

  const handleSubmit = async (data: CreateUserData) => {
    const { password, password_confirm, ...updateData } = data;
    await onSubmit(user.id, updateData);

    if (password || password_confirm) {
      await onSetPassword(user.id, {
        password: password || '',
        password_confirm: password_confirm || '',
      });
    }
  };

  return (
    <UserFormModal
      isOpen={isOpen}
      onClose={onClose}
      isLoading={isLoading}
      title="Edit User"
      description={`Update user details for ${user.username}`}
      submitLabel="Save Changes"
      initialData={initialData}
      passwordRequired={false}
      onSubmit={handleSubmit}
    />
  );
}

// Reset Password Modal
interface ResetPasswordModalProps extends BaseModalProps {
  user: AdminUser | null;
  onSubmit: (userId: number, data: SetPasswordData) => Promise<void>;
}

export function ResetPasswordModal({ isOpen, onClose, user, onSubmit, isLoading }: ResetPasswordModalProps) {
  const [formData, setFormData] = useState<SetPasswordData>({ password: '', password_confirm: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({ password: '', password_confirm: '' });
      setError(null);
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);

    if (formData.password !== formData.password_confirm) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      await onSubmit(user.id, formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="border max-w-md" style={modalStyle}>
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--cui-body-color)' }}>Reset Password</DialogTitle>
          <DialogDescription style={secondaryTextStyle}>Set a new password for <span style={{ color: 'var(--cui-body-color)', fontWeight: 500 }}>{user.username}</span></DialogDescription>
        </DialogHeader>

        {error && <div className="p-3 border rounded text-sm" style={errorStyle}>{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={secondaryTextStyle}>New Password <span style={dangerTextStyle}>*</span></label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} required minLength={8} className={inputClass} style={inputStyle} placeholder="Min 8 characters" autoFocus />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={secondaryTextStyle}>Confirm Password <span style={dangerTextStyle}>*</span></label>
            <input type="password" name="password_confirm" value={formData.password_confirm} onChange={handleChange} required minLength={8} className={inputClass} style={inputStyle} placeholder="Repeat password" />
          </div>

          <DialogFooter className="pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm transition hover:opacity-80" style={secondaryTextStyle}>Cancel</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 rounded-lg transition flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90" style={{ backgroundColor: 'var(--cui-primary)', color: 'white' }}>
              {isLoading && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
              Reset Password
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Delete User Confirmation Modal
interface DeleteUserModalProps extends BaseModalProps {
  user: AdminUser | null;
  onConfirm: (userId: number) => Promise<void>;
}

export function DeleteUserModal({ isOpen, onClose, user, onConfirm, isLoading }: DeleteUserModalProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) setError(null);
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!user) return;
    setError(null);

    try {
      await onConfirm(user.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="border max-w-md" style={modalStyle}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: 'var(--cui-body-color)' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={dangerTextStyle}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Delete User
          </DialogTitle>
          <DialogDescription style={secondaryTextStyle}>
            Are you sure you want to delete <span style={{ color: 'var(--cui-body-color)', fontWeight: 500 }}>{user.username}</span>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {error && <div className="p-3 border rounded text-sm" style={errorStyle}>{error}</div>}

        <div className="rounded-lg p-4 border" style={{ backgroundColor: 'var(--cui-secondary-bg)', borderColor: 'var(--cui-border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-medium" style={{ backgroundColor: 'var(--cui-primary)', color: 'white' }}>
              {user.first_name?.[0] || user.username[0].toUpperCase()}
            </div>
            <div>
              <p className="font-medium" style={{ color: 'var(--cui-body-color)' }}>
                {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username}
              </p>
              <p className="text-sm" style={secondaryTextStyle}>{user.email}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm transition hover:opacity-80" style={secondaryTextStyle}>Cancel</button>
          <button type="button" onClick={handleConfirm} disabled={isLoading} className="px-4 py-2 rounded-lg transition flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90" style={{ backgroundColor: 'var(--cui-danger)', color: 'white' }}>
            {isLoading && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
            Delete User
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
