'use client';

import React, { useState } from 'react';
import { CButton, CForm, CFormInput, CFormLabel, CFormTextarea } from '@coreui/react';

interface FolderEditorProps {
  folderId?: number;
  parentId?: number;
  onSave: () => void;
  onCancel: () => void;
}

export default function FolderEditor({
  folderId,
  parentId,
  onSave,
  onCancel
}: FolderEditorProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Folder name is required');
      return;
    }

    try {
      setIsSaving(true);

      const url = folderId ? `/api/dms/folders/${folderId}` : '/api/dms/folders';
      const method = folderId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          parent_id: parentId || null,
          is_active: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save folder');
      }

      onSave();
    } catch (err) {
      console.error('Error saving folder:', err);
      setError(err instanceof Error ? err.message : 'Failed to save folder');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold" style={{ color: 'var(--cui-body-color)' }}>
          {folderId ? 'Edit Folder' : 'New Folder'}
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--cui-secondary-color)' }}>
          {folderId ? 'Update folder details' : 'Create a new folder to organize documents'}
        </p>
      </div>

      <CForm onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <CFormLabel htmlFor="folderName">
              Folder Name <span className="text-red-500">*</span>
            </CFormLabel>
            <CFormInput
              id="folderName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Financial Reports, Legal Documents"
              required
            />
          </div>

          <div>
            <CFormLabel htmlFor="folderDescription">
              Description
            </CFormLabel>
            <CFormTextarea
              id="folderDescription"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of what this folder contains"
            />
          </div>

          {error && (
            <div
              className="p-3 rounded border"
              style={{
                backgroundColor: 'var(--cui-danger-bg)',
                borderColor: 'var(--cui-danger)',
                color: 'var(--cui-danger-text)'
              }}
            >
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: 'var(--cui-border-color)' }}>
            <CButton
              type="submit"
              color="primary"
              disabled={isSaving || !name.trim()}
            >
              {isSaving ? 'Saving...' : folderId ? 'Update Folder' : 'Create Folder'}
            </CButton>
            <CButton
              type="button"
              color="secondary"
              variant="outline"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </CButton>
          </div>
        </div>
      </CForm>
    </div>
  );
}
