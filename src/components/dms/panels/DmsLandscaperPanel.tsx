'use client';

import React, { useMemo, useState, useCallback } from 'react';
import CIcon from '@coreui/icons-react';
import { cilCloudUpload, cilSend } from '@coreui/icons';
import { useDropzone } from 'react-dropzone';
import { useLandscaper } from '@/hooks/useLandscaper';
import { processLandscaperResponse } from '@/utils/formatLandscaperResponse';

// ============================================
// INTENT DETECTION SYSTEM
// ============================================

type QueryIntent = 'document_filter' | 'ai_query' | 'ambiguous';

interface IntentResult {
  intent: QueryIntent;
  confidence: number;
  signals: string[];
}

/**
 * Simplified intent detection - routes to:
 * - document_filter: when user wants to find/filter project documents
 * - ai_query: when user wants AI to answer questions (benchmark or knowledge)
 *
 * The Django Landscaper API handles benchmark vs knowledge tool selection.
 */
function detectQueryIntent(query: string): IntentResult {
  const queryLower = query.toLowerCase();
  const signals: string[] = [];

  // ============================================
  // DOCUMENT FILTER SIGNALS
  // ============================================

  // Document type references
  const docTypes = [
    'rent roll', 'operating statement', 'om ', 'offering memorandum',
    'appraisal report', 'survey', 'title', 'lease', 'agreement',
    'contract', 'invoice', 'receipt', 'tax return', 'financials',
    'pdf', 'excel', 'spreadsheet'
  ];
  const hasDocType = docTypes.some(dt => queryLower.includes(dt));
  if (hasDocType) signals.push('document_type_reference');

  // Action verbs for document operations
  const filterVerbs = [
    /^(show|find|get|list|display|pull|open)/,
    /^(filter|search|look for)/,
    /(from|in) (project|last|this)/,
  ];
  const hasFilterVerb = filterVerbs.some(p => p.test(queryLower));
  if (hasFilterVerb) signals.push('filter_action_verb');

  // Time-based document references
  const timePatterns = [
    /last (week|month|year|quarter)/,
    /this (week|month|year|quarter)/,
    /recent/,
    /latest/,
    /uploaded (today|yesterday|recently)/,
  ];
  const hasTimePattern = timePatterns.some(p => p.test(queryLower));
  if (hasTimePattern) signals.push('time_reference');

  // Project-specific references
  const projectPatterns = [
    /\bproject\b/,
    /\bproperty\b/,
    /(peoria|chadron|torrance|lynn villa)/i, // Known project names
  ];
  const hasProjectRef = projectPatterns.some(p => p.test(queryLower));
  if (hasProjectRef) signals.push('project_reference');

  // ============================================
  // AI QUERY SIGNALS (benchmark + knowledge combined)
  // ============================================

  // Question patterns seeking explanation/information
  const questionPatterns = [
    /^what'?s?\s/,
    /^what (does|do|is|are|did)/,
    /^how (does|do|should|can|to|much)/,
    /^why (does|do|is|are)/,
    /^explain/,
    /^describe/,
    /^tell me about/,
    /what.+say about/,
    /according to/,
  ];
  const hasQuestionPattern = questionPatterns.some(p => p.test(queryLower));
  if (hasQuestionPattern) signals.push('question_pattern');

  // Knowledge/benchmark terms
  const aiTerms = [
    'irem', 'appraisal', 'uspap', 'boma', 'naa',
    'cap rate', 'capitalization', 'dcf', 'discount rate',
    'expense ratio', 'noi', 'net operating income',
    'benchmark', 'industry standard', 'typical',
    'r&m', 'repairs and maintenance', 'operating expense',
    '$/sf', '$/unit', 'per unit', 'per sf'
  ];
  const hasAITerm = aiTerms.some(term => queryLower.includes(term));
  if (hasAITerm) signals.push('ai_term');

  // ============================================
  // SCORING
  // ============================================

  const filterSignals = ['document_type_reference', 'filter_action_verb', 'time_reference', 'project_reference'];
  const aiSignals = ['question_pattern', 'ai_term'];

  const filterScore = signals.filter(s => filterSignals.includes(s)).length;
  const aiScore = signals.filter(s => aiSignals.includes(s)).length;

  // Determine intent
  let intent: QueryIntent;
  let confidence: number;

  // Pure document filter (no AI signals)
  if (filterScore > 0 && aiScore === 0) {
    intent = 'document_filter';
    confidence = Math.min(0.9, 0.5 + (filterScore * 0.15));
  }
  // Pure AI query (no filter signals)
  else if (aiScore > 0 && filterScore === 0) {
    intent = 'ai_query';
    confidence = Math.min(0.9, 0.5 + (aiScore * 0.2));
  }
  // Filter signals dominate
  else if (filterScore > aiScore) {
    intent = 'document_filter';
    confidence = 0.6 + ((filterScore - aiScore) * 0.1);
  }
  // AI signals dominate or tie
  else if (aiScore >= filterScore && aiScore > 0) {
    intent = 'ai_query';
    confidence = 0.6 + ((aiScore - filterScore) * 0.1);
  }
  // No signals at all
  else {
    intent = 'ambiguous';
    confidence = 0.3;
  }

  return { intent, confidence, signals };
}

export interface DmsLandscaperMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface DmsLandscaperPanelProps {
  onDropFiles: (files: File[]) => void;
  onQuerySubmit: (query: string) => Promise<{ count: number; limit?: number | null }>;
  onClearQuery: () => void;
  activeDocType?: string | null;
  isFiltering?: boolean;
  notice?: string | null;
}

export default function DmsLandscaperPanel({
  onDropFiles,
  onQuerySubmit,
  onClearQuery,
  activeDocType,
  isFiltering = false,
  notice
}: DmsLandscaperPanelProps) {
  const [input, setInput] = useState('');
  const [localMessages, setLocalMessages] = useState<DmsLandscaperMessage[]>([
    {
      role: 'assistant',
      content: 'Ask me about documents across all projects, IREM benchmarks, or real estate concepts.'
    }
  ]);

  // Use unified Landscaper API for AI queries (projectId: null for global context)
  const {
    messages: aiMessages,
    isLoading: aiLoading,
    sendMessage: sendAiMessage,
  } = useLandscaper({
    projectId: null,
    activeTab: 'dms',
  });

  // Combine local messages (document filter results) with AI messages
  const messages = useMemo(() => {
    const combined: DmsLandscaperMessage[] = [...localMessages];
    // Add AI messages after the initial greeting
    for (const msg of aiMessages) {
      combined.push({
        role: msg.role,
        content: msg.role === 'assistant' ? processLandscaperResponse(msg.content) : msg.content,
      });
    }
    return combined;
  }, [localMessages, aiMessages]);

  const isSending = aiLoading;

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
    isDragAccept
  } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onDropFiles(acceptedFiles);
      }
    },
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    multiple: true,
    noClick: true,
    noKeyboard: true
  });

  const contextLabel = useMemo(() => {
    if (!activeDocType) return 'All document types';
    return activeDocType;
  }, [activeDocType]);

  const handleSend = useCallback(async () => {
    const query = input.trim();
    if (!query || isSending) return;

    setInput('');

    // ============================================
    // INTENT DETECTION
    // ============================================
    const { intent, confidence, signals } = detectQueryIntent(query);

    console.log(`[DMS_LANDSCAPER] Intent: ${intent} (${confidence.toFixed(2)})`);
    console.log(`[DMS_LANDSCAPER] Signals: ${signals.join(', ')}`);

    // ============================================
    // ROUTE BY INTENT
    // ============================================

    if (intent === 'ai_query') {
      // -----------------------------------------
      // PATH A: AI Query via unified Landscaper API
      // The Django backend will use search_irem_benchmarks
      // or query_platform_knowledge tools as appropriate
      // -----------------------------------------
      try {
        await sendAiMessage(query);
      } catch (error) {
        console.error('[DMS_LANDSCAPER] AI query error:', error);
        setLocalMessages((prev) => [
          ...prev,
          { role: 'user', content: query },
          {
            role: 'assistant',
            content: 'I ran into an issue while processing your request. Please try again.'
          }
        ]);
      }

    } else if (intent === 'document_filter') {
      // -----------------------------------------
      // PATH B: Document Filter (existing behavior)
      // -----------------------------------------
      setLocalMessages((prev) => [...prev, { role: 'user', content: query }]);

      try {
        const result = await onQuerySubmit(query);
        const countLabel = result.count === 1 ? 'document' : 'documents';
        const limitNote = result.limit ? ` (showing ${result.limit})` : '';
        setLocalMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `I found ${result.count} ${countLabel}${limitNote}. They are listed at right.${result.count > 0 ? ' Want me to open one?' : ''}`
          }
        ]);
      } catch (error) {
        console.error('[DMS_LANDSCAPER] Document filter error:', error);
        setLocalMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'I ran into an issue filtering documents. Please try again.'
          }
        ]);
      }

    } else {
      // -----------------------------------------
      // PATH C: Ambiguous - Ask for clarification
      // -----------------------------------------
      setLocalMessages((prev) => [
        ...prev,
        { role: 'user', content: query },
        {
          role: 'assistant',
          content: `I'm not sure if you want me to:\n\n` +
            `- Search documents - Find files in your projects\n` +
            `- Answer a question - Use platform knowledge (IREM, benchmarks, etc.)\n\n` +
            `Could you clarify? For example:\n` +
            `- "Show me rent rolls from Peoria Lakes"\n` +
            `- "What does IREM say about expense ratios?"`
        }
      ]);
    }
  }, [input, isSending, sendAiMessage, onQuerySubmit]);

  return (
    <div
      {...getRootProps()}
      className="relative border border-dashed border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3"
      style={{ borderRadius: 'var(--cui-card-border-radius)' }}
    >
      <input {...getInputProps()} />
      {isDragActive && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center z-10"
          style={{
            borderRadius: 'var(--cui-card-border-radius)',
            backgroundColor: isDragReject
              ? 'rgba(239, 68, 68, 0.12)'
              : isDragAccept
                ? 'rgba(34, 197, 94, 0.12)'
                : 'rgba(0, 0, 0, 0.05)'
          }}
        >
          <CIcon icon={cilCloudUpload} className="mb-2" />
          <div className="text-sm font-medium">
            {isDragReject ? 'File type not supported' : 'Drop documents to upload'}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            PDF, Word, Excel, or image files
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-gray-400">Landscaper</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Context: {contextLabel}</div>
        </div>
        {isFiltering && (
          <div className="text-xs text-blue-600 dark:text-blue-300">Filtering…</div>
        )}
      </div>

      {notice && (
        <div className="mt-2 rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
          {notice}
        </div>
      )}

      <div className="mt-3 space-y-2 max-h-[360px] overflow-y-auto pr-1">
        {messages.map((msg, idx) => (
          <div
            key={`${msg.role}-${idx}`}
            className={`rounded-lg px-3 py-2 text-xs ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white ml-4'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'
            }`}
            style={{ whiteSpace: 'pre-wrap' }}
          >
            {msg.content}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          type="text"
          placeholder="Ask for documents or filters..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void handleSend();
            }
          }}
          className="h-9 flex-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-xs text-gray-900 dark:text-gray-100"
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={isSending || !input.trim()}
          className="h-9 w-9 rounded-md bg-blue-600 text-white text-xs disabled:opacity-60"
        >
          <CIcon icon={cilSend} className="w-3 h-3" />
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
        <span>Drop files here to upload</span>
        <button
          type="button"
          onClick={onClearQuery}
          className="text-blue-600 dark:text-blue-300"
        >
          Clear filter
        </button>
      </div>
    </div>
  );
}
