'use client';

import React, { useState, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface FolderNode {
  folder_id: number;
  parent_id: number | null;
  name: string;
  path: string;
  sort_order: number;
  default_profile: Record<string, any>;
  is_active: boolean;
  children: FolderNode[];
  doc_count?: number;
}

interface FolderTreeProps {
  onFolderSelect?: (folder: FolderNode) => void;
  onDocumentMove?: (docId: number, folderId: number | null) => Promise<void>;
  selectedFolderId?: number | null;
  className?: string;
}

const ItemTypes = {
  FOLDER: 'folder',
  DOCUMENT: 'document',
};

/**
 * Folder Tree Node Component (with drag-and-drop)
 */
function FolderTreeNode({
  folder,
  level = 0,
  onSelect,
  selectedId,
  onDocumentMove,
}: {
  folder: FolderNode;
  level?: number;
  onSelect: (folder: FolderNode) => void;
  selectedId?: number | null;
  onDocumentMove?: (docId: number, folderId: number | null) => Promise<void>;
}) {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels

  // Drop target for documents
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.DOCUMENT,
    drop: async (item: { docId: number }) => {
      if (onDocumentMove) {
        await onDocumentMove(item.docId, folder.folder_id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  const hasChildren = folder.children && folder.children.length > 0;
  const isSelected = selectedId === folder.folder_id;
  const indent = level * 16;

  return (
    <div>
      {/* Folder Row */}
      <div
        ref={drop}
        onClick={() => onSelect(folder)}
        className={`
          flex items-center gap-2 px-3 py-2 cursor-pointer rounded
          hover:bg-gray-100 dark:hover:bg-gray-700
          ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500' : ''}
          ${isOver && canDrop ? 'bg-green-50 dark:bg-green-900/30 border-l-2 border-green-500' : ''}
        `}
        style={{ paddingLeft: `${indent + 12}px` }}
      >
        {/* Expand/Collapse Icon */}
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            {isExpanded ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        )}

        {/* Folder Icon */}
        <svg
          className={`w-5 h-5 ${isExpanded ? 'text-blue-500' : 'text-gray-400'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          {isExpanded ? (
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          ) : (
            <path
              fillRule="evenodd"
              d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
              clipRule="evenodd"
            />
          )}
        </svg>

        {/* Folder Name */}
        <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
          {folder.name}
        </span>

        {/* Document Count Badge */}
        {folder.doc_count !== undefined && folder.doc_count > 0 && (
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
            {folder.doc_count}
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {folder.children.map((child) => (
            <FolderTreeNode
              key={child.folder_id}
              folder={child}
              level={level + 1}
              onSelect={onSelect}
              selectedId={selectedId}
              onDocumentMove={onDocumentMove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Folder Tree Component
 * Displays hierarchical folder structure with drag-and-drop support
 */
export default function FolderTree({
  onFolderSelect,
  onDocumentMove,
  selectedFolderId,
  className = '',
}: FolderTreeProps) {
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch folder tree
  useEffect(() => {
    fetchFolders();
  }, []);

  async function fetchFolders() {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/dms/folders');
      if (!response.ok) {
        throw new Error('Failed to fetch folders');
      }

      const data = await response.json();
      setFolders(data.tree || []);
    } catch (err) {
      console.error('Error fetching folders:', err);
      setError(err instanceof Error ? err.message : 'Failed to load folders');
    } finally {
      setIsLoading(false);
    }
  }

  function handleFolderSelect(folder: FolderNode) {
    if (onFolderSelect) {
      onFolderSelect(folder);
    }
  }

  async function handleDocumentMove(docId: number, folderId: number | null) {
    if (onDocumentMove) {
      await onDocumentMove(docId, folderId);
      // Refresh folders to update doc counts
      fetchFolders();
    }
  }

  if (isLoading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={fetchFolders}
            className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={`overflow-y-auto ${className}`}>
        {/* Header */}
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Folders
            </h3>
            <button
              onClick={fetchFolders}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              title="Refresh folders"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Folder Tree */}
        <div className="py-2">
          {folders.length === 0 ? (
            <div className="px-3 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
              No folders found
            </div>
          ) : (
            folders.map((folder) => (
              <FolderTreeNode
                key={folder.folder_id}
                folder={folder}
                onSelect={handleFolderSelect}
                selectedId={selectedFolderId}
                onDocumentMove={handleDocumentMove}
              />
            ))
          )}
        </div>
      </div>
    </DndProvider>
  );
}

/**
 * Draggable Document Item (for use in document lists)
 * Wrap document rows with this component to enable dragging to folders
 */
export function DraggableDocument({
  docId,
  children,
}: {
  docId: number;
  children: React.ReactNode;
}) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.DOCUMENT,
    item: { docId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
      }}
    >
      {children}
    </div>
  );
}
