'use client';

import React, { useState, useEffect } from 'react';

interface FolderNode {
  folder_id: number;
  parent_id: number | null;
  name: string;
  path: string;
  sort_order: number;
  default_profile: Record<string, unknown>;
  is_active: boolean;
  children: FolderNode[];
  doc_count?: number;
}

interface FolderTreeProps {
  onFolderSelect: (folder: FolderNode) => void;
  onDocumentMove?: (docId: number, folderId: number | null) => void;
  selectedFolderId?: number;
}

export default function FolderTree({
  onFolderSelect,
  selectedFolderId
}: FolderTreeProps) {
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/dms/folders');
      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders || []);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFolder = (folderId: number) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const renderFolder = (folder: FolderNode, level = 0) => {
    const isExpanded = expandedFolders.has(folder.folder_id);
    const isSelected = selectedFolderId === folder.folder_id;
    const hasChildren = folder.children && folder.children.length > 0;

    return (
      <div key={folder.folder_id}>
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded cursor-pointer hover:bg-opacity-70 ${
            isSelected ? 'bg-blue-100' : 'hover:bg-gray-100'
          }`}
          style={{
            paddingLeft: `${level * 1.5 + 0.75}rem`,
            backgroundColor: isSelected ? 'var(--cui-primary-bg)' : undefined
          }}
          onClick={() => onFolderSelect(folder)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.folder_id);
              }}
              className="w-4 h-4 flex items-center justify-center"
            >
              <svg
                className="w-3 h-3"
                style={{ color: 'var(--cui-secondary-color)' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isExpanded ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                )}
              </svg>
            </button>
          )}
          {!hasChildren && <div className="w-4" />}

          <svg
            className="w-4 h-4"
            style={{ color: isSelected ? 'var(--cui-primary)' : 'var(--cui-secondary-color)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>

          <span
            className="text-sm flex-1"
            style={{ color: isSelected ? 'var(--cui-primary)' : 'var(--cui-body-color)' }}
          >
            {folder.name}
          </span>

          {folder.doc_count !== undefined && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: 'var(--cui-secondary-bg)',
                color: 'var(--cui-secondary-color)'
              }}
            >
              {folder.doc_count}
            </span>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div>
            {folder.children.map(child => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--cui-primary)' }}></div>
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <div className="text-center py-8" style={{ color: 'var(--cui-secondary-color)' }}>
        <svg
          className="mx-auto h-8 w-8 mb-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
        <p className="text-sm">No folders yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {folders.map(folder => renderFolder(folder))}
    </div>
  );
}
