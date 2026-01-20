'use client';

import React, { useState, useCallback, Fragment } from 'react';
import CIcon from '@coreui/icons-react';
import { cilCommentBubble, cilChevronBottom, cilChevronRight } from '@coreui/icons';
import type { PlatformKnowledgeDocument } from '@/types/dms';
import PlatformKnowledgeAccordion from './PlatformKnowledgeAccordion';
import ColumnChooser, { type ColumnConfig } from './ColumnChooser';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PlatformKnowledgeTableProps {
  documents: PlatformKnowledgeDocument[];
  isLoading?: boolean;
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

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'title', label: 'Title', visible: true, required: true },
  { id: 'domain', label: 'Domain', visible: true },
  { id: 'source', label: 'Source', visible: true },
  { id: 'year', label: 'Year', visible: true },
  { id: 'scope', label: 'Scope', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'updated', label: 'Updated', visible: false },
  { id: 'actions', label: 'Actions', visible: true, required: true }
];

const STORAGE_KEY = 'platform-knowledge-columns';

export default function PlatformKnowledgeTable({
  documents,
  isLoading = false
}: PlatformKnowledgeTableProps) {
  const [expandedDocKey, setExpandedDocKey] = useState<string | null>(null);
  const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>({});
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [loadingChat, setLoadingChat] = useState(false);

  const visibleColumns = columns.filter(c => c.visible);
  const colSpan = visibleColumns.length;

  const handleRowClick = useCallback((docKey: string) => {
    setExpandedDocKey(prev => prev === docKey ? null : docKey);
  }, []);

  const handleSendMessage = useCallback(async (docKey: string, message: string) => {
    // Add user message immediately
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    setChatHistories(prev => ({
      ...prev,
      [docKey]: [...(prev[docKey] || []), userMessage]
    }));

    setLoadingChat(true);

    try {
      const response = await fetch(`/api/platform-knowledge/${docKey}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Chat request failed');
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.content || data.response || data.answer || 'No response received',
        timestamp: new Date()
      };

      setChatHistories(prev => ({
        ...prev,
        [docKey]: [...(prev[docKey] || []), assistantMessage]
      }));
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        timestamp: new Date()
      };

      setChatHistories(prev => ({
        ...prev,
        [docKey]: [...(prev[docKey] || []), errorMessage]
      }));
    } finally {
      setLoadingChat(false);
    }
  }, []);

  const handleQuickAction = useCallback((docKey: string, action: 'summarize' | 'topics' | 'key_concepts' | 'methodologies') => {
    const prompts: Record<string, string> = {
      summarize: 'Please provide a concise summary of this document, highlighting the main points and key takeaways.',
      topics: 'What are the main topics, chapters, or sections covered in this document? Provide an overview of the structure and content areas.',
      key_concepts: 'What are the key concepts and terminology defined or explained in this document?',
      methodologies: 'What methodologies, frameworks, or approaches are described in this document?'
    };

    handleSendMessage(docKey, prompts[action]);
  }, [handleSendMessage]);

  const isColumnVisible = (colId: string) => columns.find(c => c.id === colId)?.visible ?? false;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading knowledge docs...</span>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <span className="text-4xl mb-3">📘</span>
        <p className="text-sm">No platform knowledge documents found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {documents.length} document{documents.length !== 1 ? 's' : ''}
        </div>
        <ColumnChooser
          columns={columns}
          onChange={setColumns}
          storageKey={STORAGE_KEY}
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {isColumnVisible('title') && (
                <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Title</th>
              )}
              {isColumnVisible('domain') && (
                <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Domain</th>
              )}
              {isColumnVisible('source') && (
                <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Source</th>
              )}
              {isColumnVisible('year') && (
                <th className="px-3 py-2 text-center text-sm font-medium text-gray-600 dark:text-gray-400">Year</th>
              )}
              {isColumnVisible('scope') && (
                <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Scope</th>
              )}
              {isColumnVisible('status') && (
                <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Status</th>
              )}
              {isColumnVisible('updated') && (
                <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Updated</th>
              )}
              {isColumnVisible('actions') && (
                <th className="px-3 py-2 text-right text-sm font-medium text-gray-600 dark:text-gray-400">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => {
              const isExpanded = expandedDocKey === doc.document_key;
              const canChat = doc.ingestion_status === 'indexed';

              return (
                <Fragment key={doc.document_key}>
                  <tr
                    onClick={() => canChat && handleRowClick(doc.document_key)}
                    className={`border-b border-gray-100 dark:border-gray-800 ${
                      canChat ? 'cursor-pointer' : 'cursor-default'
                    } ${
                      isExpanded
                        ? 'bg-blue-50 dark:bg-blue-900/30'
                        : canChat
                        ? 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        : ''
                    }`}
                  >
                    {isColumnVisible('title') && (
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {canChat && (
                            <span className="text-gray-400 dark:text-gray-500">
                              <CIcon
                                icon={isExpanded ? cilChevronBottom : cilChevronRight}
                                className="w-4 h-4"
                              />
                            </span>
                          )}
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">{doc.title}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {doc.document_key}
                            </div>
                          </div>
                        </div>
                      </td>
                    )}
                    {isColumnVisible('domain') && (
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {doc.knowledge_domain || '—'}
                      </td>
                    )}
                    {isColumnVisible('source') && (
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {doc.publisher || '—'}
                      </td>
                    )}
                    {isColumnVisible('year') && (
                      <td className="px-3 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                        {doc.publication_year ?? '—'}
                      </td>
                    )}
                    {isColumnVisible('scope') && (
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {doc.subtitle || '—'}
                      </td>
                    )}
                    {isColumnVisible('status') && (
                      <td className="px-3 py-3 text-sm">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          doc.ingestion_status === 'indexed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : doc.ingestion_status === 'processing'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {doc.ingestion_status || '—'}
                        </span>
                      </td>
                    )}
                    {isColumnVisible('updated') && (
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {formatDateTime(doc.updated_at)}
                      </td>
                    )}
                    {isColumnVisible('actions') && (
                      <td className="px-3 py-3 text-right">
                        {canChat ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(doc.document_key);
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded ${
                              isExpanded
                                ? 'bg-blue-600 text-white'
                                : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                            }`}
                            title={isExpanded ? 'Close chat' : 'Chat with this document'}
                          >
                            <CIcon icon={cilCommentBubble} className="w-3.5 h-3.5" />
                            <span>{isExpanded ? 'Close' : 'Chat'}</span>
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">Not indexed</span>
                        )}
                      </td>
                    )}
                  </tr>

                  {/* Accordion row */}
                  {isExpanded && (
                    <PlatformKnowledgeAccordion
                      documentKey={doc.document_key}
                      documentTitle={doc.title}
                      pageCount={doc.page_count}
                      chatHistory={chatHistories[doc.document_key] || []}
                      onSendMessage={(message) => handleSendMessage(doc.document_key, message)}
                      onQuickAction={(action) => handleQuickAction(doc.document_key, action)}
                      isLoading={loadingChat}
                    />
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
