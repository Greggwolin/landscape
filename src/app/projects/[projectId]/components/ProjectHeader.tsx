'use client';

import React, { useState } from 'react';
import { useProjectContext } from '@/app/components/ProjectProvider';
import { useTheme } from '@/app/components/CoreUIThemeProvider';
import { ComplexityTier } from '@/contexts/ComplexityModeContext';
import NewProjectModal from '@/app/components/NewProjectModal';

interface ProjectHeaderProps {
  projectId: number;
  project: {
    project_id: number;
    project_name: string;
    property_type_code?: string;
  };
  complexityMode?: ComplexityTier;
  onComplexityModeChange?: (mode: ComplexityTier) => void;
  hideProjectSelector?: boolean;
  hideThemeToggle?: boolean;
}

export default function ProjectHeader({
  projectId,
  project,
  complexityMode,
  onComplexityModeChange,
  hideProjectSelector = false,
  hideThemeToggle = false
}: ProjectHeaderProps) {
  const { projects } = useProjectContext();
  const { theme, toggleTheme } = useTheme();
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const showProjectSelector = !hideProjectSelector;
  const showComplexityToggle = Boolean(onComplexityModeChange && complexityMode);
  const showThemeToggle = !hideThemeToggle;

  if (!showProjectSelector && !showComplexityToggle && !showThemeToggle) {
    return null;
  }

  return (
    <>
    <div
      className="px-6 py-3 border-b flex items-center justify-between"
      style={{
        backgroundColor: 'var(--cui-tertiary-bg)',
        borderColor: 'var(--cui-border-color)'
      }}
    >
      {showProjectSelector || showComplexityToggle ? (
        <div className="flex items-center gap-4">
          {showProjectSelector ? (
            <>
              <span className="text-sm font-medium" style={{ color: 'var(--cui-body-color)' }}>
                Active Project:
              </span>
              <select
                value={project?.project_id || projectId}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'new') {
                    setIsNewProjectModalOpen(true);
                    return;
                  }
                  const newProjectId = Number(value);
                  if (!Number.isNaN(newProjectId)) {
                    window.location.href = `/projects/${newProjectId}?tab=overview`;
                  }
                }}
                className="px-3 py-2 text-sm font-semibold rounded focus:outline-none cursor-pointer"
                style={{
                  backgroundColor: 'var(--cui-body-bg)',
                  borderColor: 'var(--cui-border-color)',
                  color: 'var(--cui-body-color)',
                  border: '1px solid var(--cui-border-color)'
                }}
              >
                <option value="">Select a project</option>
                {projects.map((proj) => (
                  <option key={proj.project_id} value={proj.project_id}>
                    {proj.project_name} - {proj.property_type_code || 'Unknown Type'}
                  </option>
                ))}
                <option value="new" style={{ fontWeight: 'bold', borderTop: '1px solid var(--cui-border-color)' }}>
                  + Add New Project
                </option>
              </select>
            </>
          ) : null}

          {showComplexityToggle ? (
            <div className="inline-flex rounded-md shadow-sm ml-4" role="group">
              <button
                type="button"
                onClick={() => onComplexityModeChange?.('basic')}
                className="px-4 py-2 text-sm font-medium border transition-colors rounded-l-lg"
                style={{
                  backgroundColor: complexityMode === 'basic' ? 'var(--cui-primary)' : 'var(--cui-body-bg)',
                  color: complexityMode === 'basic' ? 'white' : 'var(--cui-body-color)',
                  borderColor: 'var(--cui-border-color)'
                }}
              >
                Basic
              </button>
              <button
                type="button"
                onClick={() => onComplexityModeChange?.('standard')}
                className="px-4 py-2 text-sm font-medium border-t border-b transition-colors"
                style={{
                  backgroundColor: complexityMode === 'standard' ? 'var(--cui-primary)' : 'var(--cui-body-bg)',
                  color: complexityMode === 'standard' ? 'white' : 'var(--cui-body-color)',
                  borderColor: 'var(--cui-border-color)'
                }}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => onComplexityModeChange?.('advanced')}
                className="px-4 py-2 text-sm font-medium border transition-colors rounded-r-lg"
                style={{
                  backgroundColor: complexityMode === 'advanced' ? 'var(--cui-primary)' : 'var(--cui-body-bg)',
                  color: complexityMode === 'advanced' ? 'white' : 'var(--cui-body-color)',
                  borderColor: 'var(--cui-border-color)'
                }}
              >
                Pro
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div />
      )}

      {showThemeToggle ? (
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="px-3 py-1 text-xs font-medium rounded transition-colors"
            style={{
              backgroundColor: 'var(--cui-secondary-bg)',
              color: 'var(--cui-body-color)',
              border: '1px solid var(--cui-border-color)'
            }}
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
      ) : (
        <div />
      )}
    </div>
    <NewProjectModal
      isOpen={isNewProjectModalOpen}
      onClose={() => setIsNewProjectModalOpen(false)}
    />
    </>
  );
}
