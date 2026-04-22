'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import CIcon from '@coreui/icons-react';
import { cilSearch, cilX } from '@coreui/icons';
import { useWrapperUI } from '@/contexts/WrapperUIContext';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('auth_tokens');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.access) return { Authorization: `Bearer ${parsed.access}` };
    }
  } catch { /* ignore */ }
  return {};
}

interface SearchResult {
  thread_id: string;
  thread_title: string;
  project_id: number | null;
  project_name: string | null;
  snippet: string;
  matched_on: 'title' | 'message' | 'project';
  timestamp: string;
}

/**
 * Full-text chat search overlay — renders over the center chat panel.
 *
 * Searches thread titles, message content, and associated project names.
 * Clicking a result navigates to that thread and closes the overlay.
 *
 * Backend endpoint: GET /api/landscaper/threads/search/?q=<term>
 * Until the backend is wired, shows a "search not available" message.
 */
export function ChatSearchOverlay() {
  const { searchOpen, closeSearch } = useWrapperUI();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input on open
  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchOpen]);

  // Reset state when overlay closes
  useEffect(() => {
    if (!searchOpen) {
      setQuery('');
      setResults([]);
      setSearched(false);
      setError(null);
    }
  }, [searchOpen]);

  // Debounced search
  const doSearch = useCallback(async (term: string) => {
    if (term.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(
        `${DJANGO_API_URL}/api/landscaper/threads/search/?q=${encodeURIComponent(term.trim())}`,
        { headers: { ...getAuthHeaders() } }
      );
      if (!resp.ok) {
        if (resp.status === 404) {
          setError('Search endpoint not available yet — run the CC prompt to add it.');
        } else {
          setError(`Search failed (${resp.status})`);
        }
        setResults([]);
      } else {
        const data = await resp.json();
        setResults(data.results || []);
      }
    } catch {
      setError('Could not reach search API');
      setResults([]);
    }
    setSearched(true);
    setLoading(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 350);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeSearch();
    }
  };

  const handleResultClick = (result: SearchResult) => {
    closeSearch();
    if (result.project_id) {
      router.push(`/w/projects/${result.project_id}?thread=${result.thread_id}`);
    } else {
      router.push(`/w/chat/${result.thread_id}`);
    }
  };

  if (!searchOpen) return null;

  return (
    <div className="chat-search-overlay" onClick={closeSearch}>
      <div className="chat-search-container" onClick={(e) => e.stopPropagation()}>
        {/* Search input */}
        <div className="chat-search-input-row">
          <span className="chat-search-icon"><CIcon icon={cilSearch} size="sm" /></span>
          <input
            ref={inputRef}
            type="text"
            className="chat-search-input"
            placeholder="Search threads by name, content, or project…"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          <button className="chat-search-close" onClick={closeSearch} title="Close (Esc)">
            <CIcon icon={cilX} size="sm" />
          </button>
        </div>

        {/* Results area */}
        <div className="chat-search-results">
          {loading && (
            <div className="chat-search-status">Searching…</div>
          )}

          {error && (
            <div className="chat-search-status chat-search-error">{error}</div>
          )}

          {!loading && !error && searched && results.length === 0 && (
            <div className="chat-search-status">No threads found for &ldquo;{query}&rdquo;</div>
          )}

          {!loading && !error && !searched && query.length < 2 && (
            <div className="chat-search-status">Type at least 2 characters to search</div>
          )}

          {results.map((r) => (
            <div
              key={r.thread_id}
              className="chat-search-result"
              onClick={() => handleResultClick(r)}
            >
              <div className="chat-search-result-header">
                <span className="chat-search-result-title">
                  {r.thread_title || 'Untitled thread'}
                </span>
                {r.project_name && (
                  <span className="chat-search-result-project">{r.project_name}</span>
                )}
              </div>
              {r.snippet && (
                <div className="chat-search-result-snippet">{r.snippet}</div>
              )}
              <div className="chat-search-result-meta">
                <span className="chat-search-result-match">
                  {r.matched_on === 'title' ? 'Title match' :
                   r.matched_on === 'project' ? 'Project match' : 'Message match'}
                </span>
                {r.timestamp && (
                  <span className="chat-search-result-time">
                    {new Date(r.timestamp).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ChatSearchOverlay;
