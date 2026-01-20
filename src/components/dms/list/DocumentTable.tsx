'use client';

import React from 'react';
import CIcon from '@coreui/icons-react';
import { cilCommentSquare } from '@coreui/icons';
import Link from 'next/link';
import type { DMSDocument } from '@/types/dms';

interface DocumentTableProps {
  documents: DMSDocument[];
  isLoading?: boolean;
  selectedDocId?: string | null;
  selectedDocIds?: Set<string>;
  showProjectColumn?: boolean;
  visibleColumns?: Set<string>;
  onSelectDoc?: (doc: DMSDocument) => void;
  onToggleDoc?: (docId: string) => void;
  onToggleAll?: () => void;
  onChat?: (doc: DMSDocument) => void;
}

const formatDateTime = (dateString: string | null | undefined) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function DocumentTable({
  documents,
  isLoading = false,
  selectedDocId = null,
  selectedDocIds,
  showProjectColumn = false,
  visibleColumns,
  onSelectDoc,
  onToggleDoc,
  onToggleAll,
  onChat
}: DocumentTableProps) {
  const allSelected = selectedDocIds && documents.length > 0 && selectedDocIds.size === documents.length;
  const isVisible = (key: string) => !visibleColumns || visibleColumns.has(key);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading documents...</span>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <span className="text-4xl mb-3">📄</span>
        <p className="text-sm">No documents found</p>
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
        <tr className="border-b border-gray-200 dark:border-gray-700">
          <th className="w-10 px-3 py-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
              checked={Boolean(allSelected)}
              onChange={() => onToggleAll?.()}
            />
          </th>
          <th className="w-10"></th>
          <th className="w-10"></th>
          {isVisible('name') && (
            <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Name</th>
          )}
          {showProjectColumn && isVisible('project') && (
            <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Project</th>
          )}
          {isVisible('doc_type') && (
            <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Type</th>
          )}
          {isVisible('version') && (
            <th className="px-3 py-2 text-center text-sm font-medium text-gray-600 dark:text-gray-400">Version</th>
          )}
          {isVisible('doc_date') && (
            <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Document Date</th>
          )}
          {isVisible('parties') && (
            <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Parties</th>
          )}
          {isVisible('dollar_amount') && (
            <th className="px-3 py-2 text-right text-sm font-medium text-gray-600 dark:text-gray-400">Amount</th>
          )}
          {isVisible('tags') && (
            <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Tags</th>
          )}
          {isVisible('description') && (
            <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Description</th>
          )}
          {isVisible('modified') && (
            <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Modified</th>
          )}
          <th className="px-3 py-2 text-right text-sm font-medium text-gray-600 dark:text-gray-400">Actions</th>
        </tr>
      </thead>
      <tbody>
        {documents.map((doc) => {
          const isSelected = selectedDocId === doc.doc_id;
          const isChecked = selectedDocIds?.has(doc.doc_id) ?? false;
          const profile = (doc.profile_json || {}) as Record<string, unknown>;
          const docDate = typeof profile.doc_date === 'string' ? profile.doc_date : doc.doc_date;
          const parties = typeof profile.parties === 'string' ? profile.parties : null;
          const dollarAmount = typeof profile.dollar_amount === 'number' || typeof profile.dollar_amount === 'string'
            ? profile.dollar_amount
            : null;
          const tags = Array.isArray(profile.tags) ? profile.tags : doc.tags;
          const description = typeof profile.description === 'string' ? profile.description : null;

          return (
            <tr
              key={doc.doc_id}
              className={`
                border-b border-gray-100 dark:border-gray-800
                hover:bg-gray-50 dark:hover:bg-gray-800
                cursor-pointer
                transition-colors
                ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
              `}
              onClick={() => onSelectDoc?.(doc)}
            >
              <td className="px-3 py-3" onClick={(event) => event.stopPropagation()}>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
                  checked={isChecked}
                  onChange={() => onToggleDoc?.(doc.doc_id)}
                />
              </td>
              <td className="px-3 py-3">
                <button
                  className="text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors"
                  onClick={(event) => event.stopPropagation()}
                >
                  ⭐
                </button>
              </td>
              <td className="px-3 py-3">
                <span className="text-red-600 dark:text-red-400 text-lg">📄</span>
              </td>
              {isVisible('name') && (
                <td className="px-3 py-3">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{doc.doc_name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDateTime(doc.created_at)}
                  </div>
                </td>
              )}
              {showProjectColumn && isVisible('project') && (
                <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {doc.project_id ? (
                    <Link
                      href={`/projects/${doc.project_id}/documents`}
                      className="text-blue-600 hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {doc.project_name || `Project ${doc.project_id}`}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
              )}
              {isVisible('doc_type') && (
                <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {doc.doc_type || '—'}
                </td>
              )}
              {isVisible('version') && (
                <td className="px-3 py-3 text-center">
                  <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm">
                    {doc.version_no || 1}
                  </span>
                </td>
              )}
              {isVisible('doc_date') && (
                <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {docDate || '—'}
                </td>
              )}
              {isVisible('parties') && (
                <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {parties || '—'}
                </td>
              )}
              {isVisible('dollar_amount') && (
                <td className="px-3 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                  {dollarAmount?.toString() || '—'}
                </td>
              )}
              {isVisible('tags') && (
                <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {tags?.join(', ') || '—'}
                </td>
              )}
              {isVisible('description') && (
                <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {description || '—'}
                </td>
              )}
              {isVisible('modified') && (
                <td className="px-3 py-3 text-gray-600 dark:text-gray-400 text-sm">
                  {formatDateTime(doc.updated_at)}
                </td>
              )}
              <td className="px-3 py-3 text-right">
                <button
                  className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                  onClick={(event) => {
                    event.stopPropagation();
                    onChat?.(doc);
                  }}
                  title="Chat"
                >
                  <CIcon icon={cilCommentSquare} className="w-4 h-4" />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
