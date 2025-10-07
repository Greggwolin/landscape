'use client';

import React, { useState, useEffect } from 'react';

interface FolderEditorProps {
  folderId?: number; // If editing existing folder
  parentId?: number | null; // Parent folder ID for new folder
  onSave?: (folderId: number) => void;
  onCancel?: () => void;
}

interface FolderFormData {
  name: string;
  parent_id: number | null;
  sort_order: number;
  default_profile: Record<string, any>;
}

/**
 * Folder Editor Component
 * Create or edit folders with default profile configuration
 */
export default function FolderEditor({
  folderId,
  parentId,
  onSave,
  onCancel,
}: FolderEditorProps) {
  const [formData, setFormData] = useState<FolderFormData>({
    name: '',
    parent_id: parentId || null,
    sort_order: 0,
    default_profile: {},
  });

  const [profileText, setProfileText] = useState('{}'); // JSON editor
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableFolders, setAvailableFolders] = useState<any[]>([]);

  // Fetch existing folder data if editing
  useEffect(() => {
    if (folderId) {
      fetchFolderData();
    }
    fetchAvailableFolders();
  }, [folderId]);

  async function fetchFolderData() {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/dms/folders?flat=true`);
      const data = await response.json();

      const folder = data.folders.find((f: any) => f.folder_id === folderId);
      if (folder) {
        setFormData({
          name: folder.name,
          parent_id: folder.parent_id,
          sort_order: folder.sort_order,
          default_profile: folder.default_profile || {},
        });
        setProfileText(JSON.stringify(folder.default_profile || {}, null, 2));
      }
    } catch (err) {
      console.error('Error fetching folder:', err);
      setError('Failed to load folder data');
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchAvailableFolders() {
    try {
      const response = await fetch('/api/dms/folders?flat=true');
      const data = await response.json();
      setAvailableFolders(data.folders || []);
    } catch (err) {
      console.error('Error fetching folders:', err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validate JSON profile
    let profile: Record<string, any>;
    try {
      profile = JSON.parse(profileText);
    } catch (err) {
      setError('Invalid JSON in default profile');
      return;
    }

    try {
      setIsSaving(true);

      const payload = {
        ...formData,
        default_profile: profile,
      };

      let response;
      if (folderId) {
        // Update existing folder
        response = await fetch('/api/dms/folders', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder_id: folderId, ...payload }),
        });
      } else {
        // Create new folder
        response = await fetch('/api/dms/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save folder');
      }

      const data = await response.json();
      if (onSave) {
        onSave(data.folder.folder_id);
      }
    } catch (err) {
      console.error('Error saving folder:', err);
      setError(err instanceof Error ? err.message : 'Failed to save folder');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {folderId ? 'Edit Folder' : 'New Folder'}
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Configure folder settings and default profile values
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Folder Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Folder Name *
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          maxLength={255}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter folder name"
        />
      </div>

      {/* Parent Folder */}
      <div>
        <label htmlFor="parent_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Parent Folder
        </label>
        <select
          id="parent_id"
          value={formData.parent_id || ''}
          onChange={(e) => setFormData({
            ...formData,
            parent_id: e.target.value ? parseInt(e.target.value) : null
          })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">None (Root Level)</option>
          {availableFolders
            .filter((f) => f.folder_id !== folderId) // Can't be own parent
            .map((folder) => (
              <option key={folder.folder_id} value={folder.folder_id}>
                {folder.path}
              </option>
            ))}
        </select>
      </div>

      {/* Sort Order */}
      <div>
        <label htmlFor="sort_order" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Sort Order
        </label>
        <input
          type="number"
          id="sort_order"
          value={formData.sort_order}
          onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Lower numbers appear first
        </p>
      </div>

      {/* Default Profile (JSON) */}
      <div>
        <label htmlFor="default_profile" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Default Profile (JSON)
        </label>
        <textarea
          id="default_profile"
          value={profileText}
          onChange={(e) => setProfileText(e.target.value)}
          rows={10}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     font-mono text-sm"
          placeholder='{"doc_type": "plan", "priority": "high"}'
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Profile values will be applied to documents moved into this folder (unless opted out)
        </p>
      </div>

      {/* Common Profile Examples */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
          Common Profile Examples:
        </p>
        <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 font-mono">
          <li>• <code>{`{"doc_type": "plan"}`}</code></li>
          <li>• <code>{`{"discipline": "architecture"}`}</code></li>
          <li>• <code>{`{"priority": "high", "tags": ["urgent"]}`}</code></li>
          <li>• <code>{`{"status": "indexed"}`}</code></li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
                       hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700
                     disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg"
        >
          {isSaving ? 'Saving...' : folderId ? 'Update Folder' : 'Create Folder'}
        </button>
      </div>
    </form>
  );
}
