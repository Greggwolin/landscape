'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
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
  AddUserModal,
  EditUserModal,
  ResetPasswordModal,
  DeleteUserModal,
} from './components/UserModals';
import { Plus, RefreshCw, Edit2, Key, Trash2, Shield } from 'lucide-react';

function AdminUsersContent() {
  const { tokens, user: currentUser } = useAuth();
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
    if (!tokens?.access) return;

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
    loadUsers();
  }, [loadUsers]);

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

      // Update local state
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

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-white">User Management</h1>
        <div className="flex gap-3">
          <button
            onClick={loadUsers}
            className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-700/50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                          {user.first_name?.[0] || user.username[0].toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">
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
                          <div className="text-sm text-gray-400">@{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{user.email}</div>
                      {user.is_verified && (
                        <span className="inline-flex items-center text-xs text-green-400">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Verified
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-300">{user.company || '-'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              />
                            </svg>
                            ...
                          </span>
                        ) : user.is_active ? (
                          'Active'
                        ) : (
                          'Inactive'
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {user.last_login
                        ? new Date(user.last_login).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
                          title="Edit user"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openResetPasswordModal(user)}
                          className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-gray-700 rounded-lg transition"
                          title="Reset password"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(user)}
                          disabled={user.id === currentUser?.id}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-400 disabled:hover:bg-transparent"
                          title={
                            user.id === currentUser?.id
                              ? "You can't delete yourself"
                              : 'Delete user'
                          }
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
      <div className="mt-6 flex gap-6 text-sm text-gray-400">
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

export default function AdminUsersPage() {
  return (
    <ProtectedRoute requireAdmin>
      <AdminUsersContent />
    </ProtectedRoute>
  );
}
