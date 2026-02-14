'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CButton, CFormInput, CSpinner } from '@coreui/react';
import DocResultCard, { type DocResult } from './DocResultCard';
import type { ActiveFilters } from './FilterColumns';
import type { SourceFilter } from './SourceToggle';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  results?: DocResult[];
  searchScope?: {
    level: number;
    description: string;
    found: boolean;
  };
}

interface KnowledgeChatPanelProps {
  activeFilters: ActiveFilters;
  source: SourceFilter;
  totalCount: number;
  selectedDocs: Set<number>;
  onToggleSelect: (docId: number) => void;
  onPreview: (docId: number) => void;
  onSelectAll: (docIds: number[]) => void;
  djangoApiUrl: string;
}

export default function KnowledgeChatPanel({
  activeFilters,
  source,
  totalCount,
  selectedDocs,
  onToggleSelect,
  onPreview,
  onSelectAll,
  djangoApiUrl,
}: KnowledgeChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const buildScopeChips = (): string[] => {
    const chips: string[] = [];
    if (activeFilters.geo.length > 0) chips.push(...activeFilters.geo);
    if (activeFilters.property_type.length > 0) chips.push(...activeFilters.property_type);
    if (activeFilters.format.length > 0) chips.push(...activeFilters.format);
    if (activeFilters.doc_type.length > 0) chips.push(...activeFilters.doc_type);
    return chips;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch(`${djangoApiUrl}/api/knowledge/library/search/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage,
          filters: {
            source,
            geo: activeFilters.geo,
            property_type: activeFilters.property_type,
            format: activeFilters.format,
            doc_type: activeFilters.doc_type,
            project_id: activeFilters.project_id,
          },
          fallback_level: 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.results?.length
            ? `Found ${data.results.length} document${data.results.length !== 1 ? 's' : ''}:`
            : 'No documents found matching your query.',
          results: data.results || [],
          searchScope: data.search_scope,
        },
      ]);
    } catch (error) {
      console.error('Knowledge library search error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, an error occurred while searching. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const scopeChips = buildScopeChips();

  return (
    <div className="kl-chat-panel">
      {/* Scope indicator */}
      <div className="kl-chat-scope-indicator">
        <span>Searching within:</span>
        {scopeChips.length > 0 ? (
          scopeChips.map((chip) => (
            <span key={chip} className="kl-chat-scope-chip">{chip}</span>
          ))
        ) : (
          <span style={{ fontStyle: 'italic' }}>All documents</span>
        )}
        <span style={{ marginLeft: 'auto' }}>
          {totalCount} document{totalCount !== 1 ? 's' : ''} &middot; Source: {source === 'all' ? 'All' : source === 'user' ? 'My Docs' : 'Platform'}
        </span>
      </div>

      {/* Messages */}
      <div className="kl-chat-messages" ref={scrollRef}>
        {messages.length === 0 && !isLoading && (
          <div className="kl-empty-state">
            <div className="kl-empty-state-icon">&#128269;</div>
            <p style={{ marginBottom: 4 }}>Search the Knowledge Library</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--cui-secondary-color)' }}>
              Ask a question or describe the document you&apos;re looking for
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <React.Fragment key={i}>
            <div className={`kl-chat-message ${msg.role}`}>
              {msg.content}
            </div>

            {/* Search scope feedback */}
            {msg.searchScope && (
              <div className={`kl-scope-feedback ${msg.searchScope.level === 0 ? 'found' : 'expanded'}`}>
                {msg.searchScope.level === 0
                  ? `\u2713 Found in filtered set: ${msg.searchScope.description}`
                  : msg.searchScope.found
                    ? `\u26A0 Expanded search (level ${msg.searchScope.level}): ${msg.searchScope.description}`
                    : `No results found — searched full library`
                }
              </div>
            )}

            {/* Document results */}
            {msg.results && msg.results.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {msg.results.map((doc) => (
                  <DocResultCard
                    key={doc.doc_id}
                    doc={doc}
                    isSelected={selectedDocs.has(doc.doc_id)}
                    onToggleSelect={onToggleSelect}
                    onPreview={onPreview}
                  />
                ))}
                {msg.results.length > 1 && (
                  <button
                    type="button"
                    className="kl-select-all-row"
                    onClick={() => onSelectAll(msg.results!.map((d) => d.doc_id))}
                  >
                    Select all {msg.results.length} results
                  </button>
                )}
              </div>
            )}
          </React.Fragment>
        ))}

        {isLoading && (
          <div style={{ alignSelf: 'flex-start', padding: '8px 12px' }}>
            <CSpinner size="sm" />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="kl-chat-input-area">
        <CFormInput
          placeholder="Search for documents..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          size="sm"
        />
        <CButton
          color="primary"
          size="sm"
          onClick={() => void handleSend()}
          disabled={isLoading || !input.trim()}
        >
          Search
        </CButton>
      </div>
    </div>
  );
}
