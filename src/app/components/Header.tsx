// app/components/Header.tsx
import React, { useState, useEffect } from 'react';
import { useProjectContext } from './ProjectProvider';

interface HeaderProps {
  onEditClick?: () => void;
  isEditing?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onEditClick, isEditing, onSave, onCancel, isSaving }) => {
  const { projects, activeProject, selectProject, isLoading } = useProjectContext();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isDropdownOpen) {
        const target = event.target as Element;
        if (!target.closest('.relative')) {
          setIsDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleProjectSelect = (projectId: number) => {
    setIsDropdownOpen(false);
    selectProject(projectId);
  };

  const handleAddNew = () => {
    setIsDropdownOpen(false);
    // TODO: Implement add new project functionality
    console.log('Add new project clicked');
  };

  return (
    <header className="bg-gray-900 border-b border-gray-700 px-4 py-2 flex items-center">
      <div className="flex items-center">
        <img 
          src="/logo-invert.png" 
          alt="Landscape Logo" 
          className="h-10 w-auto object-contain"
        />
      </div>

      {/* Project Selector - Much Wider */}
      <div className="flex items-center space-x-4 ml-6 flex-1 max-w-2xl">
        <div className="relative flex-1">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center justify-between w-full px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
          >
            <span className="text-sm truncate">
              {activeProject?.project_name || (activeProject?.project_id ? `Project ${activeProject.project_id}` : 'Select Project')}
            </span>
            <svg className="w-4 h-4 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isDropdownOpen && (
            <div className="absolute left-0 mt-2 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50">
              <div className="py-1 max-h-60 overflow-y-auto">
                {isLoading ? (
                  <div className="px-4 py-2 text-gray-400 text-sm">Loading projects...</div>
                ) : (
                  <>
                    {projects.map((project) => (
                      <button
                        key={project.project_id}
                        onClick={() => handleProjectSelect(project.project_id)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700 transition-colors ${
                          activeProject?.project_id === project.project_id
                            ? 'bg-gray-700 text-white'
                            : 'text-gray-300'
                        }`}
                      >
                        {project.project_name || `Project ${project.project_id}`}
                      </button>
                    ))}
                    <hr className="border-gray-600 my-1" />
                    <button
                      onClick={handleAddNew}
                      className="w-full text-left px-4 py-2 text-sm text-blue-400 hover:bg-gray-700 transition-colors"
                    >
                      + Add New Project
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Edit Controls */}
        {onEditClick && (
          <div className="flex space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={onSave}
                  disabled={isSaving}
                  className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={onCancel}
                  className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={onEditClick}
                className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                Edit
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center space-x-4">
        <button className="px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600">
          Export
        </button>
        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
          <span className="text-gray-300 text-xs">U</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
