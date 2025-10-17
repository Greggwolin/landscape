'use client';

import React from 'react';
import Image from 'next/image';
import { useProjectContext } from './ProjectProvider';

interface HeaderProps {
  isEditing?: boolean;
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
}

export default function Header({
  isEditing = false,
  onEdit,
  onSave,
  onCancel,
  isSaving = false
}: HeaderProps) {
  const { projects, activeProject, selectProject } = useProjectContext();

  return (
    <header className="bg-gray-900 border-b border-gray-800 px-4 py-3">
      <div className="flex items-center gap-4">
        {/* Left: Logo */}
        <div className="flex items-center flex-shrink-0">
          <Image
            src="/logo-invert.png"
            alt="Landscape Logo"
            width={120}
            height={40}
            className="h-10 object-contain"
            style={{ width: 'auto' }}
            priority
          />
        </div>

        {/* Project Selector - full width minus logo and controls */}
        <div className="flex-1">
          <select
            value={activeProject?.project_id || ''}
            onChange={(e) => selectProject(Number(e.target.value))}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            disabled={isEditing}
          >
            <option value="">Select a project</option>
            {projects.map((project) => (
              <option key={project.project_id} value={project.project_id}>
                {project.project_name}
              </option>
            ))}
          </select>
        </div>

        {/* Right: Conditional Edit/Save/Cancel Controls */}
        {onEdit && onSave && onCancel && (
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={onEdit}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                <i className="ri-edit-line mr-2"></i>
                Edit
              </button>
            ) : (
              <>
                <button
                  onClick={onCancel}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                  disabled={isSaving}
                >
                  <i className="ri-close-line mr-2"></i>
                  Cancel
                </button>
                <button
                  onClick={onSave}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
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
