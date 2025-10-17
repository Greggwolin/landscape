'use client';

import React from 'react';
import { useProject } from './ProjectProvider';

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
  const { projects, activeProject, selectProject } = useProject();

  return (
    <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center gap-4">
          <div className="text-2xl font-bold text-white">
            Landscape
          </div>
        </div>

        {/* Center: Project Selector */}
        <div className="flex-1 max-w-md mx-8">
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
