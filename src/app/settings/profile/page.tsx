'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

const DJANGO_API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
const CUSTOM_INSTRUCTIONS_MAX = 4000;

function ProfileSettingsContent() {
  const { user, updateProfile, tokens, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Custom Landscaper Instructions
  const [customInstructions, setCustomInstructions] = useState('');
  const [savedCustomInstructions, setSavedCustomInstructions] = useState('');
  const [isSavingInstructions, setIsSavingInstructions] = useState(false);
  const [instructionsLoaded, setInstructionsLoaded] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    company: '',
    phone: '',
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    new_password_confirm: '',
  });

  // Initialize form data when user loads
  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        company: user.company || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  // Fetch custom instructions from landscaper profile
  const fetchCustomInstructions = useCallback(async () => {
    if (!tokens?.access) return;
    try {
      const res = await fetch(`${DJANGO_API_BASE}/api/users/landscaper-profile/`, {
        headers: { 'Authorization': `Bearer ${tokens.access}` },
      });
      if (res.ok) {
        const data = await res.json();
        const val = data.custom_instructions || '';
        setCustomInstructions(val);
        setSavedCustomInstructions(val);
        setInstructionsLoaded(true);
      }
    } catch {
      // Profile may not exist yet — that's fine
      setInstructionsLoaded(true);
    }
  }, [tokens?.access]);

  useEffect(() => {
    fetchCustomInstructions();
  }, [fetchCustomInstructions]);

  const handleSaveInstructions = async () => {
    if (!tokens?.access) return;
    setIsSavingInstructions(true);
    setMessage(null);
    try {
      const res = await fetch(`${DJANGO_API_BASE}/api/users/landscaper-profile/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.access}`,
        },
        body: JSON.stringify({ custom_instructions: customInstructions || null }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.custom_instructions?.[0] || err.detail || 'Failed to save');
      }
      setSavedCustomInstructions(customInstructions);
      setMessage({ type: 'success', text: 'Custom instructions saved!' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save instructions' });
    } finally {
      setIsSavingInstructions(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      await updateProfile(formData);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update profile' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (passwordData.new_password !== passwordData.new_password_confirm) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordData.new_password.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters' });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`${DJANGO_API_BASE}/api/auth/password-change/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens?.access}`,
        },
        body: JSON.stringify(passwordData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.detail || 'Failed to change password');
      }

      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setPasswordData({ current_password: '', new_password: '', new_password_confirm: '' });
      setIsChangingPassword(false);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to change password' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        company: user.company || '',
        phone: user.phone || '',
      });
    }
    setIsEditing(false);
    setMessage(null);
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-white mb-8">Profile Settings</h1>

      {/* Messages */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-900/50 border border-green-500 text-green-200'
            : 'bg-red-900/50 border border-red-500 text-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-[#212529] rounded-lg border border-[#2d3238] p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-white">Personal Information</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white
                         rounded-lg transition"
            >
              Edit Profile
            </button>
          )}
        </div>

        <form onSubmit={handleSaveProfile}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                First Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#2d3238] border border-[#3d4248] rounded-lg
                             text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-white py-2">{user.first_name || '-'}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Last Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#2d3238] border border-[#3d4248] rounded-lg
                             text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-white py-2">{user.last_name || '-'}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Email
              </label>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#2d3238] border border-[#3d4248] rounded-lg
                             text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-white py-2">{user.email}</p>
              )}
            </div>

            {/* Username (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Username
              </label>
              <p className="text-gray-500 py-2">{user.username}</p>
            </div>

            {/* Company */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Company
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#2d3238] border border-[#3d4248] rounded-lg
                             text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-white py-2">{user.company || '-'}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Phone
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#2d3238] border border-[#3d4248] rounded-lg
                             text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-white py-2">{user.phone || '-'}</p>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="flex gap-4 mt-6">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800
                           text-white rounded-lg transition flex items-center"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-6 py-2 bg-[#2d3238] hover:bg-[#3d4248] text-white rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Account Information */}
      <div className="bg-[#212529] rounded-lg border border-[#2d3238] p-6 mb-6">
        <h2 className="text-lg font-medium text-white mb-6">Account Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Role</label>
            <p className="text-white capitalize">{user.role}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
            <span className={`inline-flex px-3 py-1 rounded-full text-sm ${
              user.is_active
                ? 'bg-green-900/50 text-green-300'
                : 'bg-red-900/50 text-red-300'
            }`}>
              {user.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Email Verified</label>
            <span className={`inline-flex px-3 py-1 rounded-full text-sm ${
              user.is_verified
                ? 'bg-green-900/50 text-green-300'
                : 'bg-yellow-900/50 text-yellow-300'
            }`}>
              {user.is_verified ? 'Verified' : 'Pending'}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Member Since</label>
            <p className="text-white">
              {new Date(user.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-[#212529] rounded-lg border border-[#2d3238] p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-white">Security</h2>
          {!isChangingPassword && (
            <button
              onClick={() => setIsChangingPassword(true)}
              className="px-4 py-2 text-sm bg-[#2d3238] hover:bg-[#3d4248] text-white
                         rounded-lg transition"
            >
              Change Password
            </button>
          )}
        </div>

        {isChangingPassword && (
          <form onSubmit={handleChangePassword} className="max-w-md">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  name="current_password"
                  value={passwordData.current_password}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-3 bg-[#2d3238] border border-[#3d4248] rounded-lg
                             text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  name="new_password"
                  value={passwordData.new_password}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-3 bg-[#2d3238] border border-[#3d4248] rounded-lg
                             text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  name="new_password_confirm"
                  value={passwordData.new_password_confirm}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-3 bg-[#2d3238] border border-[#3d4248] rounded-lg
                             text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800
                           text-white rounded-lg transition"
              >
                {isSaving ? 'Changing...' : 'Change Password'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsChangingPassword(false);
                  setPasswordData({ current_password: '', new_password: '', new_password_confirm: '' });
                }}
                className="px-6 py-2 bg-[#2d3238] hover:bg-[#3d4248] text-white rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Custom Landscaper Instructions */}
      {instructionsLoaded && (
        <div className="bg-[#212529] rounded-lg border border-[#2d3238] p-6 mb-6">
          <h2 className="text-lg font-medium text-white mb-2">Custom Landscaper Instructions</h2>
          <p className="text-sm text-gray-400 mb-4">
            Freeform instructions that shape how Landscaper responds to you.
          </p>
          <textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            maxLength={CUSTOM_INSTRUCTIONS_MAX}
            rows={5}
            placeholder="e.g., Always format dollar values with commas. Prefer concise bullet points over paragraphs. Use IRR as the primary return metric."
            className="w-full px-4 py-3 bg-[#2d3238] border border-[#3d4248] rounded-lg
                       text-white placeholder-gray-500 focus:outline-none focus:ring-2
                       focus:ring-blue-500 resize-y text-sm"
          />
          <div className="flex items-center justify-between mt-2">
            <span className={`text-xs ${
              customInstructions.length > CUSTOM_INSTRUCTIONS_MAX * 0.9
                ? 'text-yellow-400'
                : 'text-gray-500'
            }`}>
              {customInstructions.length.toLocaleString()} / {CUSTOM_INSTRUCTIONS_MAX.toLocaleString()} characters
            </span>
            <div className="flex gap-3">
              {customInstructions !== savedCustomInstructions && (
                <button
                  type="button"
                  onClick={() => setCustomInstructions(savedCustomInstructions)}
                  className="px-4 py-2 text-sm bg-[#2d3238] hover:bg-[#3d4248] text-white
                             rounded-lg transition"
                >
                  Discard
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveInstructions}
                disabled={isSavingInstructions || customInstructions === savedCustomInstructions}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700
                           disabled:bg-blue-800 disabled:opacity-50 text-white
                           rounded-lg transition"
              >
                {isSavingInstructions ? 'Saving...' : 'Save Instructions'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="bg-[#212529] rounded-lg border border-red-900/50 p-6">
        <h2 className="text-lg font-medium text-red-400 mb-4">Danger Zone</h2>
        <p className="text-gray-400 mb-4">
          Once you sign out, you will need to log in again to access your account.
        </p>
        <button
          onClick={logout}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default function ProfileSettingsPage() {
  return (
    <ProtectedRoute>
      <ProfileSettingsContent />
    </ProtectedRoute>
  );
}
