'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CSpinner } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilSend, cilLightbulb, cilBook, cilCog, cilList } from '@coreui/icons';
import SourceToggle, { type SourceFilter } from './SourceToggle';
import FilterColumns, { type Facets, type ActiveFilters } from './FilterColumns';
import CounterBar from './CounterBar';
import UploadDropZone from './UploadDropZone';
import DocResultCard, { type DocResult } from './DocResultCard';
import DocClassificationBar from './DocClassificationBar';
import './knowledge-library.css';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
const MAX_AUTO_DOCS = 50;

const EMPTY_FACETS: Facets = {
  geography: [],
  property_type: [],
  format: [],
  doc_type: [],
  project: [],
};

const EMPTY_FILTERS: ActiveFilters = {
  geo: [],
  property_type: [],
  format: [],
  doc_type: [],
  project_id: [],
};

export default function KnowledgeLibraryPanel() {
  const [source, setSource] = useState<SourceFilter>('all');
  const [facets, setFacets] = useState<Facets>(EMPTY_FACETS);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(EMPTY_FILTERS);
  const [totalCount, setTotalCount] = useState(0);
  const [sourceCounts, setSourceCounts] = useState({ all: 0, user: 0, platform: 0 });
  const [isLoadingFacets, setIsLoadingFacets] = useState(true);
  const [selectedDocs, setSelectedDocs] = useState<Set<number>>(new Set());

  // Auto-populated document list state
  const [documents, setDocuments] = useState<DocResult[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  // Inline accordion expansion state
  const [expandedDocId, setExpandedDocId] = useState<number | null>(null);

  // Chat state for the inline accordion
  interface ChatMessage { role: 'user' | 'assistant'; content: string; timestamp: Date; }
  const [chatHistories, setChatHistories] = useState<Record<number, ChatMessage[]>>({});
  const [isChatLoading, setIsChatLoading] = useState(false);

  const fetchFacets = useCallback(async (
    currentSource: SourceFilter,
    currentFilters: ActiveFilters,
  ) => {
    setIsLoadingFacets(true);
    try {
      const params = new URLSearchParams();
      params.append('source', currentSource);
      currentFilters.geo.forEach((v) => params.append('geo', v));
      currentFilters.property_type.forEach((v) => params.append('property_type', v));
      currentFilters.format.forEach((v) => params.append('fmt', v));
      currentFilters.doc_type.forEach((v) => params.append('doc_type', v));
      currentFilters.project_id.forEach((v) => params.append('project_id', v));

      const response = await fetch(
        `${DJANGO_API_URL}/api/knowledge/library/facets/?${params.toString()}`
      );

      if (!response.ok) throw new Error('Failed to fetch facets');

      const data = await response.json();
      setFacets(data.facets || EMPTY_FACETS);
      setTotalCount(data.total_count || 0);
    } catch (error) {
      console.error('Error fetching facets:', error);
      setFacets(EMPTY_FACETS);
      setTotalCount(0);
    } finally {
      setIsLoadingFacets(false);
    }
  }, []);

  const fetchDocuments = useCallback(async (
    currentSource: SourceFilter,
    currentFilters: ActiveFilters,
  ) => {
    setIsLoadingDocs(true);
    try {
      const response = await fetch(`${DJANGO_API_URL}/api/knowledge/library/search/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: '',
          filters: {
            source: currentSource,
            geo: currentFilters.geo,
            property_type: currentFilters.property_type,
            format: currentFilters.format,
            doc_type: currentFilters.doc_type,
            project_id: currentFilters.project_id,
          },
          fallback_level: 0,
          limit: MAX_AUTO_DOCS,
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch documents');

      const data = await response.json();
      setDocuments(data.results || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments([]);
    } finally {
      setIsLoadingDocs(false);
    }
  }, []);

  const fetchSourceCounts = useCallback(async () => {
    try {
      const [allRes, userRes, platformRes] = await Promise.all([
        fetch(`${DJANGO_API_URL}/api/knowledge/library/facets/?source=all`),
        fetch(`${DJANGO_API_URL}/api/knowledge/library/facets/?source=user`),
        fetch(`${DJANGO_API_URL}/api/knowledge/library/facets/?source=platform`),
      ]);

      const [allData, userData, platformData] = await Promise.all([
        allRes.json(),
        userRes.json(),
        platformRes.json(),
      ]);

      setSourceCounts({
        all: allData.total_count || 0,
        user: userData.total_count || 0,
        platform: platformData.total_count || 0,
      });
    } catch (error) {
      console.error('Error fetching source counts:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    void fetchFacets(source, activeFilters);
    void fetchDocuments(source, activeFilters);
    void fetchSourceCounts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch facets and documents when filters change
  useEffect(() => {
    void fetchFacets(source, activeFilters);
    void fetchDocuments(source, activeFilters);
  }, [source, activeFilters, fetchFacets, fetchDocuments]);

  const handleSourceChange = (newSource: SourceFilter) => {
    setSource(newSource);
    setActiveFilters(EMPTY_FILTERS);
    setSelectedDocs(new Set());
  };

  const handleToggleFilter = (dimension: keyof ActiveFilters, value: string) => {
    setActiveFilters((prev) => {
      const current = prev[dimension];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [dimension]: next };
    });
  };

  const handleClearFilters = () => {
    setActiveFilters(EMPTY_FILTERS);
  };

  const handleToggleSelect = (docId: number) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const handleSelectAll = (docIds: number[]) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      docIds.forEach((id) => next.add(id));
      return next;
    });
  };

  // Download notification state
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  const handleDownloadSelected = async () => {
    if (selectedDocs.size === 0) return;

    setDownloadNotice('Preparing download...');

    try {
      const response = await fetch(`${DJANGO_API_URL}/api/knowledge/library/batch-download/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_ids: Array.from(selectedDocs) }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error || 'Download failed');
      }

      // Read download stats from response headers
      const included = parseInt(response.headers.get('X-Download-Included') || '0', 10);
      const skipped = parseInt(response.headers.get('X-Download-Skipped') || '0', 10);
      const total = parseInt(response.headers.get('X-Download-Total') || '0', 10);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'knowledge-library-download.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      // Show result notification
      if (skipped > 0) {
        setDownloadNotice(`Downloaded ${included} of ${total} files. ${skipped} file${skipped !== 1 ? 's were' : ' was'} not available.`);
      } else {
        setDownloadNotice(`Downloaded ${included} file${included !== 1 ? 's' : ''} successfully.`);
      }
      setTimeout(() => setDownloadNotice(null), 5000);
    } catch (error) {
      console.error('Batch download error:', error);
      setDownloadNotice(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setDownloadNotice(null), 5000);
    }
  };

  const isPreviewable = (uri: string | null): boolean => {
    if (!uri) return false;
    if (uri.includes('placeholder.local')) return false;
    if (uri.startsWith('/Users/') || uri.startsWith('/home/')) return false;
    if (uri === 'pending') return false;
    return uri.startsWith('http');
  };

  const handlePreview = (docId: number) => {
    const doc = documents.find((d) => d.doc_id === docId);
    if (!doc) return;
    const uri = doc.storage_uri || '';

    if (isPreviewable(uri)) {
      window.open(uri, '_blank');
    }
    // Non-previewable URIs are handled by button state (disabled + tooltip)
  };

  const handleRowClick = (docId: number) => {
    setExpandedDocId((prev) => (prev === docId ? null : docId));
  };

  const handleSendMessage = useCallback(async (docId: number, projectId: number, message: string, documentKey?: string | null) => {
    const userMessage: ChatMessage = { role: 'user', content: message, timestamp: new Date() };
    setChatHistories((prev) => ({
      ...prev,
      [docId]: [...(prev[docId] || []), userMessage],
    }));
    setIsChatLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const tokens = localStorage.getItem('auth_tokens');
        const accessToken = tokens ? JSON.parse(tokens).access : null;
        if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
      } catch { /* best-effort */ }

      // Route to the correct chat endpoint based on document type:
      // - Platform Knowledge (negative doc_id + document_key) → /api/platform-knowledge/{key}/chat
      // - Core doc (positive doc_id + project_id) → /api/projects/{pid}/dms/docs/{did}/chat
      const isPlatformKnowledge = docId < 0 && documentKey;
      const chatUrl = isPlatformKnowledge
        ? `/api/platform-knowledge/${documentKey}/chat`
        : `/api/projects/${projectId}/dms/docs/${docId}/chat`;

      const response = await fetch(chatUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Chat request failed');
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.content || data.response || data.answer || 'No response received',
        timestamp: new Date(),
      };
      setChatHistories((prev) => ({
        ...prev,
        [docId]: [...(prev[docId] || []), assistantMessage],
      }));
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        timestamp: new Date(),
      };
      setChatHistories((prev) => ({
        ...prev,
        [docId]: [...(prev[docId] || []), errorMessage],
      }));
    } finally {
      setIsChatLoading(false);
    }
  }, []);

  const handleQuickAction = useCallback((docId: number, projectId: number, action: string, documentKey?: string | null) => {
    const prompts: Record<string, string> = {
      summarize: 'Please provide a concise summary of this document, highlighting the main points and key takeaways.',
      key_points: 'What are the key points and important details in this document?',
      extract_data: 'What key data points, numbers, dates, or financial figures can you extract from this document?',
      qa_prep: 'What questions might someone ask about this document and what are the answers based on its content?',
    };
    handleSendMessage(docId, projectId, prompts[action], documentKey);
  }, [handleSendMessage]);

  const refreshData = useCallback(() => {
    void fetchFacets(source, activeFilters);
    void fetchDocuments(source, activeFilters);
    void fetchSourceCounts();
  }, [source, activeFilters, fetchFacets, fetchDocuments, fetchSourceCounts]);

  const handleUploadComplete = () => {
    refreshData();
  };

  const handleSelectAllVisible = () => {
    handleSelectAll(documents.map((d) => d.doc_id));
  };

  return (
    <div className="knowledge-library-panel">
      {/* Source Toggle */}
      <SourceToggle
        active={source}
        counts={sourceCounts}
        onChange={handleSourceChange}
      />

      {/* Filter Columns */}
      {isLoadingFacets && facets === EMPTY_FACETS ? (
        <div className="kl-loading-center">
          <CSpinner size="sm" />
          <span className="kl-loading-text">Loading filters...</span>
        </div>
      ) : (
        <FilterColumns
          facets={facets}
          activeFilters={activeFilters}
          onToggleFilter={handleToggleFilter}
        />
      )}

      {/* Counter Bar */}
      <CounterBar
        totalCount={totalCount}
        activeFilters={activeFilters}
        selectedCount={selectedDocs.size}
        onDownloadSelected={() => void handleDownloadSelected()}
        onClearFilters={handleClearFilters}
      />

      {/* Download / Upload Notification */}
      {downloadNotice && (
        <div className={`kl-notice ${downloadNotice.includes('failed') ? 'kl-notice-danger' : 'kl-notice-success'}`}>
          {downloadNotice}
        </div>
      )}

      {/* Auto-populated Document List */}
      <div className="kl-doc-list">
        {isLoadingDocs ? (
          <div className="kl-doc-list-loading">
            <CSpinner size="sm" />
            <span>Loading documents...</span>
          </div>
        ) : documents.length > 0 ? (
          <>
            <div className="kl-doc-list-header">
              <button
                type="button"
                className="kl-select-all-row"
                onClick={handleSelectAllVisible}
              >
                Select all {documents.length} visible
              </button>
            </div>
            <div className="kl-doc-list-scroll">
              {documents.map((doc) => {
                const isExpanded = expandedDocId === doc.doc_id;
                return (
                  <React.Fragment key={doc.doc_id}>
                    <DocResultCard
                      doc={doc}
                      isSelected={selectedDocs.has(doc.doc_id)}
                      isExpanded={isExpanded}
                      isPreviewable={isPreviewable(doc.storage_uri)}
                      onToggleSelect={handleToggleSelect}
                      onPreview={handlePreview}
                      onRowClick={handleRowClick}
                    />
                    {isExpanded && (
                      <KLAccordionPanel
                        doc={doc}
                        chatHistory={chatHistories[doc.doc_id] || []}
                        isChatLoading={isChatLoading}
                        onSendMessage={(msg) => handleSendMessage(doc.doc_id, doc.project_id ?? 0, msg, doc.document_key)}
                        onQuickAction={(action) => handleQuickAction(doc.doc_id, doc.project_id ?? 0, action, doc.document_key)}
                        onClassificationChange={refreshData}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            {totalCount > MAX_AUTO_DOCS && (
              <div className="kl-doc-list-overflow">
                Showing {documents.length} of {totalCount} documents — use filters to narrow results
              </div>
            )}
          </>
        ) : (
          <div className="kl-doc-list-empty">
            No documents match the current filters
          </div>
        )}
      </div>

      {/* Upload Drop Zone */}
      <UploadDropZone
        djangoApiUrl={DJANGO_API_URL}
        onUploadComplete={handleUploadComplete}
      />

    </div>
  );
}


/* ─── Inline Accordion Panel (Quick Actions + Chat) ─── */
interface ChatMsg { role: 'user' | 'assistant'; content: string; timestamp: Date; }

interface KLAccordionPanelProps {
  doc: DocResult;
  chatHistory: ChatMsg[];
  isChatLoading: boolean;
  onSendMessage: (message: string) => Promise<void>;
  onQuickAction: (action: string) => void;
  onClassificationChange?: () => void;
}

function KLAccordionPanel({ doc, chatHistory, isChatLoading, onSendMessage, onQuickAction, onClassificationChange }: KLAccordionPanelProps) {
  const [inputValue, setInputValue] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Scroll so the clicked card + accordion panel are visible within the scroll container
  React.useEffect(() => {
    // Double-rAF ensures DOM has painted the expanded panel before we measure
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = panelRef.current;
        if (!el) return;
        // Find the scroll container (.kl-doc-list-scroll)
        const scrollContainer = el.closest('.kl-doc-list-scroll') as HTMLElement | null;
        const card = el.previousElementSibling as HTMLElement | null;
        if (scrollContainer && card) {
          // Scroll the card to the top of the scroll container so
          // both card header and accordion panel below it are visible
          const cardTop = card.offsetTop;
          scrollContainer.scrollTo({ top: cardTop, behavior: 'smooth' });
        } else {
          // Fallback: scroll the panel itself into view
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    });
  }, []);

  React.useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory]);
  React.useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isSending) return;
    const message = inputValue.trim();
    setInputValue('');
    setIsSending(true);
    try { await onSendMessage(message); } finally { setIsSending(false); }
  };

  const busy = isSending || isChatLoading;

  const quickActions = [
    { key: 'summarize', label: 'Summarize', icon: cilLightbulb, color: 'var(--cui-warning)' },
    { key: 'key_points', label: 'Key points', icon: cilList, color: 'var(--cui-success)' },
    { key: 'extract_data', label: 'Extract data', icon: cilBook, color: 'var(--cui-primary)' },
    { key: 'qa_prep', label: 'Q&A prep', icon: cilCog, color: 'var(--cui-info)' },
  ];

  return (
    <div ref={panelRef} className="kl-accordion-panel" onClick={(e) => e.stopPropagation()}>
      {/* Classification Override Bar (Part D) */}
      <DocClassificationBar
        docId={doc.doc_id}
        currentDocType={doc.doc_type}
        currentPropertyType={(doc as Record<string, unknown>).property_type as string | null | undefined}
        onClassificationChange={onClassificationChange}
      />

      <div className="kl-accordion-inner">
        {/* Left panel — Quick Actions */}
        <div className="kl-accordion-sidebar">
          <div className="kl-accordion-sidebar-title">Quick Actions</div>
          {quickActions.map((qa) => (
            <button
              key={qa.key}
              type="button"
              className="kl-accordion-action-btn"
              disabled={busy}
              onClick={() => onQuickAction(qa.key)}
            >
              <CIcon icon={qa.icon} className="icon" style={{ color: qa.color }} />
              <span>{qa.label}</span>
            </button>
          ))}
          <div className="kl-accordion-chatting-with">
            <div className="kl-accordion-chatting-label">Chatting with:</div>
            <div className="kl-accordion-chatting-name" title={doc.name}>
              {doc.name}
            </div>
          </div>
        </div>

        {/* Right panel — Chat */}
        <div className="kl-accordion-chat">
          <div className="kl-accordion-messages">
            {chatHistory.length === 0 ? (
              <div className="kl-accordion-empty">
                <span className="kl-accordion-empty-icon">💬</span>
                <p className="kl-accordion-empty-text">Ask Landscaper about this document</p>
                <p className="kl-accordion-empty-hint">or use a quick action to get started</p>
              </div>
            ) : (
              <div className="kl-chat-messages">
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`kl-chat-row kl-chat-row-${msg.role}`}>
                    <div className={`kl-chat-bubble kl-chat-bubble-${msg.role}`}>
                      <div className="kl-chat-content">{msg.content}</div>
                      <div className={`kl-chat-time kl-chat-time-${msg.role}`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {busy && (
              <div className="kl-chat-thinking">
                <div className="kl-chat-thinking-bubble">
                  <CSpinner size="sm" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="kl-accordion-input-area">
            <form onSubmit={handleSubmit} className="kl-accordion-input-form">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about this document..."
                disabled={busy}
                className="kl-accordion-input"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || busy}
                className="kl-accordion-send-btn"
              >
                <CIcon icon={cilSend} className="icon" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
