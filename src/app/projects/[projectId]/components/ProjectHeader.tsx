'use client';

import React from 'react';
import { useProjectContext } from '@/app/components/ProjectProvider';
import { useTheme } from '@/app/components/CoreUIThemeProvider';
import { ComplexityTier } from '@/contexts/ComplexityModeContext';

interface ProjectHeaderProps {
  projectId: number;
  project: {
    project_id: number;
    project_name: string;
    property_type_code?: string;
  };
  complexityMode?: ComplexityTier;
  onComplexityModeChange?: (mode: ComplexityTier) => void;
}

export default function ProjectHeader({ projectId, project, complexityMode, onComplexityModeChange }: ProjectHeaderProps) {
  const { projects } = useProjectContext();
  const { theme, toggleTheme } = useTheme();

  return (
    <div
      className="px-6 py-3 border-b flex items-center justify-between"
      style={{
        backgroundColor: 'var(--cui-tertiary-bg)',
        borderColor: 'var(--cui-border-color)'
      }}
    >
      {/* Project Selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium" style={{ color: 'var(--cui-body-color)' }}>
          Active Project:
        </span>
        <select
          value={project?.project_id || projectId}
          onChange={(e) => {
            const value = e.target.value;
            if (value === 'new') {
              // TODO: Open new project modal or navigate to project creation page
              window.location.href = '/projects/setup';
            } else {
              const newProjectId = Number(value);
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

        {/* Complexity Mode Toggle - Only show if handler provided */}
        {onComplexityModeChange && complexityMode && (
          <div className="inline-flex rounded-md shadow-sm ml-4" role="group">
            <button
              type="button"
              onClick={() => onComplexityModeChange('basic')}
              className={`px-4 py-2 text-sm font-medium border transition-colors rounded-l-lg`}
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
              onClick={() => onComplexityModeChange('standard')}
              className={`px-4 py-2 text-sm font-medium border-t border-b transition-colors`}
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
              onClick={() => onComplexityModeChange('advanced')}
              className={`px-4 py-2 text-sm font-medium border transition-colors rounded-r-lg`}
              style={{
                backgroundColor: complexityMode === 'advanced' ? 'var(--cui-primary)' : 'var(--cui-body-bg)',
                color: complexityMode === 'advanced' ? 'white' : 'var(--cui-body-color)',
                borderColor: 'var(--cui-border-color)'
              }}
            >
              Pro
            </button>
          </div>
        )}
      </div>

      {/* Theme Toggle */}
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
    </div>
  );
}
