'use client';

import React from 'react';
import { useProjectContext } from './ProjectProvider';

interface HeaderProps {
  title?: string;
  isEditing?: boolean;
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
}

export default function Header({
  title = 'Landscape Platform',
  isEditing = false,
  onEdit,
  onSave,
  onCancel,
  isSaving = false
}: HeaderProps) {
  const { activeProject } = useProjectContext();

  return (
    <header
      className="border-b px-6 py-4"
      style={{
        backgroundColor: 'var(--cui-header-bg)',
        borderColor: 'var(--cui-header-border-color)'
      }}
    >
      <div className="flex items-center justify-between">
        {/* Left: Page Title */}
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--cui-body-color)' }}>
            {title}
          </h1>
          {activeProject && (
            <p className="text-sm mt-1" style={{ color: 'var(--cui-secondary-color)' }}>
              {activeProject.project_name}
            </p>
          )}
        </div>

        {/* Right: Conditional Edit/Save/Cancel Controls */}
        {onEdit && onSave && onCancel && (
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={onEdit}
                className="px-4 py-2 transition-colors"
                style={{ color: 'var(--cui-secondary-color)' }}
              >
                <i className="ri-edit-line mr-2"></i>
                Edit
              </button>
            ) : (
              <>
                <button
                  onClick={onCancel}
                  className="px-4 py-2 transition-colors"
                  style={{ color: 'var(--cui-secondary-color)' }}
                  disabled={isSaving}
                >
                  <i className="ri-close-line mr-2"></i>
                  Cancel
                </button>
                <button
                  onClick={onSave}
                  className="px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--cui-primary)',
                    color: '#ffffff'
                  }}
                  disabled={isSaving}
                >
                  <i className="ri-save-line mr-2"></i>
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
