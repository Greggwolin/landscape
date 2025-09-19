'use client';

import React, { useState } from 'react';
import { DocumentIcon, PencilSquareIcon, EyeIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { CoreDoc } from '@/lib/dms/db';

interface DocCardProps {
  doc: CoreDoc & {
    project_name?: string;
    workspace_name?: string;
    phase_no?: string;
  };
  onEdit: (doc: CoreDoc) => void;
  onView: (doc: CoreDoc) => void;
  onClose?: () => void;
  isCompact?: boolean;
  showActions?: boolean;
}

export default function DocCard({
  doc,
  onEdit,
  onView,
  onClose,
  isCompact = false,
  showActions = true
}: DocCardProps) {
  const [imageError, setImageError] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'indexed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'archived': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return '🖼️';
    } else if (mimeType === 'application/pdf') {
      return '📄';
    } else if (mimeType.includes('word')) {
      return '📝';
    } else if (mimeType.includes('excel') || mimeType.includes('sheet')) {
      return '📊';
    } else {
      return '📄';
    }
  };

  const isImage = doc.mime_type.startsWith('image/');

  if (isCompact) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">
              {getFileIcon(doc.mime_type)}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {doc.doc_name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {doc.doc_type} • {formatFileSize(doc.file_size_bytes)}
              </p>
            </div>
          </div>
          
          {showActions && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onView(doc)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="View document"
              >
                <EyeIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => onEdit(doc)}
                className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                title="Edit profile"
              >
                <PencilSquareIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <DocumentIcon className="w-6 h-6 text-gray-400" />
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {doc.doc_name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Version {doc.version_no} • {formatDate(doc.created_at)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
            {doc.status}
          </span>
          
          {showActions && (
            <>
              <button
                onClick={() => onView(doc)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                title="View document"
              >
                <EyeIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => onEdit(doc)}
                className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                title="Edit profile"
              >
                <PencilSquareIcon className="w-5 h-5" />
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  title="Close"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="p-4">
        {isImage && !imageError ? (
          <div className="mb-4">
            <img
              src={doc.storage_uri}
              alt={doc.doc_name}
              className="max-w-full h-48 object-contain rounded-lg border border-gray-200 dark:border-gray-700"
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <div className="mb-4 flex items-center justify-center h-32 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
            <div className="text-center">
              <div className="text-4xl mb-2">
                {getFileIcon(doc.mime_type)}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {doc.mime_type}
              </p>
            </div>
          </div>
        )}

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="font-medium text-gray-900 dark:text-gray-100">Project</dt>
            <dd className="text-gray-600 dark:text-gray-400">
              {doc.project_name || `Project ${doc.project_id}`}
            </dd>
          </div>
          
          <div>
            <dt className="font-medium text-gray-900 dark:text-gray-100">Workspace</dt>
            <dd className="text-gray-600 dark:text-gray-400">
              {doc.workspace_name || `Workspace ${doc.workspace_id}`}
            </dd>
          </div>
          
          <div>
            <dt className="font-medium text-gray-900 dark:text-gray-100">Type</dt>
            <dd className="text-gray-600 dark:text-gray-400">{doc.doc_type}</dd>
          </div>
          
          <div>
            <dt className="font-medium text-gray-900 dark:text-gray-100">Size</dt>
            <dd className="text-gray-600 dark:text-gray-400">
              {formatFileSize(doc.file_size_bytes)}
            </dd>
          </div>
          
          {doc.discipline && (
            <div>
              <dt className="font-medium text-gray-900 dark:text-gray-100">Discipline</dt>
              <dd className="text-gray-600 dark:text-gray-400">{doc.discipline}</dd>
            </div>
          )}
          
          {doc.phase_no && (
            <div>
              <dt className="font-medium text-gray-900 dark:text-gray-100">Phase</dt>
              <dd className="text-gray-600 dark:text-gray-400">Phase {doc.phase_no}</dd>
            </div>
          )}
          
          {doc.doc_date && (
            <div>
              <dt className="font-medium text-gray-900 dark:text-gray-100">Document Date</dt>
              <dd className="text-gray-600 dark:text-gray-400">
                {formatDate(doc.doc_date)}
              </dd>
            </div>
          )}
          
          {doc.contract_value && (
            <div>
              <dt className="font-medium text-gray-900 dark:text-gray-100">Contract Value</dt>
              <dd className="text-gray-600 dark:text-gray-400">
                ${doc.contract_value.toLocaleString()}
              </dd>
            </div>
          )}
          
          {doc.priority && (
            <div>
              <dt className="font-medium text-gray-900 dark:text-gray-100">Priority</dt>
              <dd className="text-gray-600 dark:text-gray-400">{doc.priority}</dd>
            </div>
          )}
          
          {doc.tags && doc.tags.length > 0 && (
            <div className="col-span-2">
              <dt className="font-medium text-gray-900 dark:text-gray-100 mb-2">Tags</dt>
              <dd className="flex flex-wrap gap-1">
                {doc.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                  >
                    {tag}
                  </span>
                ))}
              </dd>
            </div>
          )}
        </div>

        {/* Custom profile data */}
        {doc.profile_json && Object.keys(doc.profile_json).length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Custom Attributes</h4>
            <div className="space-y-2">
              {Object.entries(doc.profile_json)
                .filter(([key, value]) => 
                  key !== 'upload_date' && 
                  key !== 'original_name' && 
                  key !== 'file_url' && 
                  value !== null && 
                  value !== undefined && 
                  value !== ''
                )
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                      {key.replace(/_/g, ' ')}:
                    </span>
                    <span className="text-gray-600 dark:text-gray-400 text-right max-w-xs truncate">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}