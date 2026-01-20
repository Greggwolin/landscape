'use client';

import React, { useState } from 'react';
import CIcon from '@coreui/icons-react';
import { cilCommentSquare, cilPencil, cilX, cilBook } from '@coreui/icons';
import type { PlatformKnowledgeDocument } from '@/types/dms';
import PlatformKnowledgeProfileForm from '../profile/PlatformKnowledgeProfileForm';
import { useToast } from '@/hooks/use-toast';

interface PlatformKnowledgePreviewProps {
  document: PlatformKnowledgeDocument;
  onClose: () => void;
  onChat?: (doc: PlatformKnowledgeDocument) => void;
  onUpdate?: () => void;
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
};

const formatFileSize = (bytes: number | null | undefined) => {
  if (bytes == null) return '—';
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatKnowledgeDomain = (domain: string | null | undefined) => {
  if (!domain) return '—';
  return domain
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function PlatformKnowledgePreview({
  document,
  onClose,
  onChat,
  onUpdate,
}: PlatformKnowledgePreviewProps) {
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const handleSaveProfile = async (updates: Partial<PlatformKnowledgeDocument>) => {
    try {
      const response = await fetch(`/api/platform-knowledge/${document.document_key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update profile');
      }
      setIsEditing(false);
      onUpdate?.();
      showToast('Profile updated', 'success');
    } catch (error) {
      console.error('Profile update failed:', error);
      showToast('Failed to update profile', 'error');
      throw error;
    }
  };

  if (isEditing) {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-gray-900">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <span className="font-medium text-gray-900 dark:text-gray-100">Edit Profile</span>
          <button
            onClick={() => setIsEditing(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
            aria-label="Close edit"
          >
            <CIcon icon={cilX} className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <PlatformKnowledgeProfileForm
            document={document}
            onSave={handleSaveProfile}
            onCancel={() => setIsEditing(false)}
            onSuccess={() => setIsEditing(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <CIcon icon={cilBook} className="text-blue-600 dark:text-blue-400 w-5 h-5 flex-shrink-0" />
          <span className="font-medium truncate text-gray-900 dark:text-gray-100">
            {document.title}
          </span>
          {document.ingestion_status && (
            <span
              className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${
                document.ingestion_status === 'indexed'
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                  : document.ingestion_status === 'processing'
                  ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
              }`}
            >
              {document.ingestion_status}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onChat && document.ingestion_status === 'indexed' && (
            <button
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center gap-1"
              onClick={() => onChat(document)}
            >
              <CIcon icon={cilCommentSquare} className="w-4 h-4" />
              Chat
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
            aria-label="Close preview"
          >
            <CIcon icon={cilX} className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Document Icon */}
        <div className="mb-4 border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
          <div className="aspect-[8.5/11] bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
            <CIcon icon={cilBook} className="text-blue-400 dark:text-blue-500 w-24 h-24 opacity-50" />
          </div>
        </div>

        {/* Platform Knowledge Metadata */}
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                Title
              </td>
              <td className="py-2 text-gray-900 dark:text-gray-100">{document.title}</td>
            </tr>

            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                Source
              </td>
              <td className="py-2 text-gray-900 dark:text-gray-100">
                {document.publisher || '—'}
              </td>
            </tr>

            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                Source Year
              </td>
              <td className="py-2 text-gray-900 dark:text-gray-100">
                {document.publication_year || '—'}
              </td>
            </tr>

            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                Knowledge Domain
              </td>
              <td className="py-2 text-gray-900 dark:text-gray-100">
                {formatKnowledgeDomain(document.knowledge_domain)}
              </td>
            </tr>

            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap align-top">
                Property Types
              </td>
              <td className="py-2 text-gray-900 dark:text-gray-100">
                {document.property_types && document.property_types.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {document.property_types.map((type, idx) => (
                      <span
                        key={idx}
                        className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                ) : (
                  '—'
                )}
              </td>
            </tr>

            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                Geographic Scope
              </td>
              <td className="py-2 text-gray-900 dark:text-gray-100 capitalize">
                {document.subtitle || '—'}
              </td>
            </tr>

            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                Status
              </td>
              <td className="py-2 text-gray-900 dark:text-gray-100 capitalize">
                {document.ingestion_status || '—'}
              </td>
            </tr>

            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                Chunks
              </td>
              <td className="py-2 text-gray-900 dark:text-gray-100">
                {document.chunk_count ?? '—'}
              </td>
            </tr>

            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                File Size
              </td>
              <td className="py-2 text-gray-900 dark:text-gray-100">
                {formatFileSize(document.file_size_bytes)}
              </td>
            </tr>

            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                Created
              </td>
              <td className="py-2 text-gray-900 dark:text-gray-100">
                {formatDate(document.created_at)}
              </td>
            </tr>

            <tr>
              <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap align-top">
                Description
              </td>
              <td className="py-2 text-gray-900 dark:text-gray-100">
                {document.description || '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
        <button
          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 rounded flex items-center gap-2 text-gray-700 dark:text-gray-300 transition-colors"
          onClick={() => setIsEditing(true)}
        >
          <CIcon icon={cilPencil} className="w-4 h-4" />
          <span>Edit Profile</span>
        </button>
      </div>
    </div>
  );
}
