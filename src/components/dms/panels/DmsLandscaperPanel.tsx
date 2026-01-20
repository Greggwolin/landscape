'use client';

import React, { useMemo, useState } from 'react';
import CIcon from '@coreui/icons-react';
import { cilCloudUpload, cilSend } from '@coreui/icons';
import { useDropzone } from 'react-dropzone';

// ============================================
// INTENT DETECTION SYSTEM
// ============================================

type QueryIntent = 'document_filter' | 'knowledge_query' | 'benchmark_query' | 'ambiguous';

interface IntentResult {
  intent: QueryIntent;
  confidence: number;
  signals: string[];
}

function detectQueryIntent(query: string): IntentResult {
  const queryLower = query.toLowerCase();
  const signals: string[] = [];

  // ============================================
  // KNOWLEDGE QUERY SIGNALS
  // ============================================

  // Explicit knowledge source references
  const knowledgeSources = [
    'irem', 'appraisal of real estate', 'appraisal institute',
    'uspap', 'uniform standards', 'platform knowledge',
    'income expense', 'income/expense'
  ];
  const hasKnowledgeSource = knowledgeSources.some(src => queryLower.includes(src));
  if (hasKnowledgeSource) signals.push('knowledge_source_reference');

  // Question patterns seeking explanation/information
  const questionPatterns = [
    /^what'?s?\s/,                          // "what", "what's", "whats"
    /^what (does|do|is|are|did)/,
    /^how (does|do|should|can|to|much)/,    // Added "how much"
    /^why (does|do|is|are)/,
    /^explain/,
    /^describe/,
    /^tell me about/,
    /what.+say about/,
    /according to/,
  ];
  const hasQuestionPattern = questionPatterns.some(p => p.test(queryLower));
  if (hasQuestionPattern) signals.push('question_pattern');

  // Conceptual/methodology terms
  const conceptTerms = [
    'cap rate', 'capitalization', 'dcf', 'discount rate',
    'highest and best use', 'market value', 'expense ratio',
    'noi', 'net operating income', 'vacancy rate', 'absorption',
    'benchmark', 'industry standard', 'best practice',
    'methodology', 'approach', 'technique', 'calculation',
    'expense growth', 'operating expense', 'r&m', 'repairs and maintenance'
  ];
  const hasConceptTerm = conceptTerms.some(term => queryLower.includes(term));
  if (hasConceptTerm) signals.push('concept_term');

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
  // BENCHMARK QUERY SIGNALS
  // ============================================

  const benchmarkPatterns = [
    /\bbenchmark\b/i,
    /\birem\b/i,
    /\bboma\b/i,
    /\bnaa\b/i,
    /industry (average|standard|norm)/i,
    /typical (expense|cost|ratio)/i,
    /how does.+compare/i,
    /is (my|this|the).+(reasonable|normal|typical|high|low)/i,
    /what('s| is) (a )?(reasonable|typical|normal|average)/i,
    /\br&m\b/i,
    /repairs and maintenance/i,
    /operating expense/i,
    /\$\s*\/?\s*(sf|unit|sqft|sq\.?\s*ft)/i,  // $/SF, $/unit, $ per sf, etc.
    /per\s+(unit|sf|sqft|square foot)/i,       // "per unit", "per SF"
    /\bestimate\b/i,
    /\baverage\b/i,
    /\bnorm(al)?\b/i,
    /expense (ratio|growth|data)/i,
  ];
  const hasBenchmarkSignal = benchmarkPatterns.some(p => p.test(queryLower));
  if (hasBenchmarkSignal) signals.push('benchmark_query');

  // ============================================
  // SCORING
  // ============================================

  const knowledgeSignals = ['knowledge_source_reference', 'question_pattern', 'concept_term'];
  const filterSignals = ['document_type_reference', 'filter_action_verb', 'time_reference', 'project_reference'];

  const knowledgeScore = signals.filter(s => knowledgeSignals.includes(s)).length;
  const filterScore = signals.filter(s => filterSignals.includes(s)).length;
  const hasBenchmark = signals.includes('benchmark_query');

  // Check for explicit IREM/benchmark source mentions (high priority)
  const hasExplicitBenchmarkSource = /\b(irem|boma|naa)\b/i.test(query);

  // Determine intent
  let intent: QueryIntent;
  let confidence: number;

  // PRIORITY 1: Explicit benchmark source (IREM, BOMA, NAA) - route to benchmark with high confidence
  if (hasExplicitBenchmarkSource) {
    intent = 'benchmark_query';
    confidence = 0.95;  // High confidence when IREM/BOMA/NAA explicitly mentioned
  }
  // PRIORITY 2: Benchmark signals present ($/SF, $/unit, estimate, typical, etc.)
  else if (hasBenchmark && filterScore === 0) {
    intent = 'benchmark_query';
    confidence = 0.85;
  }
  // PRIORITY 3: Mixed benchmark + filter signals - benchmark wins if no strong filter signals
  else if (hasBenchmark && filterScore <= 1) {
    intent = 'benchmark_query';
    confidence = 0.75;
  }
  // PRIORITY 4: Pure knowledge query (no filter signals)
  else if (knowledgeScore > 0 && filterScore === 0) {
    intent = 'knowledge_query';
    confidence = Math.min(0.9, 0.5 + (knowledgeScore * 0.15));
  }
  // PRIORITY 5: Pure document filter (no knowledge signals)
  else if (filterScore > 0 && knowledgeScore === 0 && !hasBenchmark) {
    intent = 'document_filter';
    confidence = Math.min(0.9, 0.5 + (filterScore * 0.15));
  }
  // PRIORITY 6: Knowledge signals dominate
  else if (knowledgeScore > filterScore) {
    intent = 'knowledge_query';
    confidence = 0.6 + ((knowledgeScore - filterScore) * 0.1);
  }
  // PRIORITY 7: Filter signals dominate
  else if (filterScore > knowledgeScore) {
    intent = 'document_filter';
    confidence = 0.6 + ((filterScore - knowledgeScore) * 0.1);
  }
  // PRIORITY 8: Only fall back to ambiguous when NO signals at all
  else if (signals.length === 0) {
    intent = 'ambiguous';
    confidence = 0.3;
  }
  // PRIORITY 9: Tied signals - default to knowledge query (less intrusive)
  else {
    intent = 'knowledge_query';
    confidence = 0.5;
  }

  return { intent, confidence, signals };
}

export interface DmsLandscaperMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface PlatformKnowledgeResult {
  content: string;
  similarity: number;
  document_title: string;
  document_key: string;
  chapter_title?: string;
  chapter_number?: number;
  page?: number;
  section_path?: string;
}

interface BenchmarkResult {
  source: string;
  source_year: number;
  expense_category: string;
  expense_subcategory?: string;
  per_unit_amount?: number;
  pct_of_egi?: number;
  pct_of_gpi?: number;
  sample_size?: number;
  notes?: string;
}

interface BenchmarkSearchResponse {
  query: string;
  results: BenchmarkResult[];
  count: number;
}

// Format category names for display
function formatCategoryName(category: string): string {
  return category
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Format benchmark results for chat display
function formatBenchmarkResults(results: BenchmarkResult[]): string {
  if (results.length === 0) {
    return "I don't have benchmark data for that expense category.";
  }

  const lines: string[] = [];

  for (const b of results) {
    const catName = formatCategoryName(b.expense_category);
    const subName = b.expense_subcategory ? ` - ${formatCategoryName(b.expense_subcategory)}` : '';

    lines.push(`${b.source} ${b.source_year}: ${catName}${subName}`);

    if (b.pct_of_egi !== undefined && b.pct_of_egi !== null) {
      lines.push(`    ${b.pct_of_egi}% of Effective Gross Income`);
    }
    if (b.per_unit_amount !== undefined && b.per_unit_amount !== null) {
      lines.push(`    $${b.per_unit_amount.toLocaleString()}/unit/year`);
    }
    if (b.sample_size) {
      lines.push(`    Based on ${b.sample_size.toLocaleString()} properties`);
    }
    if (b.notes) {
      lines.push(`    Note: ${b.notes}`);
    }
    lines.push('');
  }

  return lines.join('\n');
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
  const [messages, setMessages] = useState<DmsLandscaperMessage[]>([
    {
      role: 'assistant',
      content: 'Ask me about documents across all projects.'
    }
  ]);
  const [isSending, setIsSending] = useState(false);

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

  const handleSend = async () => {
    const query = input.trim();
    if (!query || isSending) return;

    setMessages((prev) => [...prev, { role: 'user', content: query }]);
    setInput('');
    setIsSending(true);

    try {
      // ============================================
      // INTENT DETECTION
      // ============================================
      const { intent, confidence, signals } = detectQueryIntent(query);

      console.log(`[DMS_LANDSCAPER] Intent: ${intent} (${confidence.toFixed(2)})`);
      console.log(`[DMS_LANDSCAPER] Signals: ${signals.join(', ')}`);

      // ============================================
      // ROUTE BY INTENT
      // ============================================

      if (intent === 'benchmark_query') {
        // -----------------------------------------
        // PATH A: IREM Benchmark Query (structured data)
        // -----------------------------------------
        const response = await fetch(`/api/benchmarks/search?q=${encodeURIComponent(query)}`);
        const data: BenchmarkSearchResponse = await response.json();

        if (!response.ok) {
          throw new Error('Benchmark query failed');
        }

        const formatted = formatBenchmarkResults(data.results);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.results.length > 0
              ? `IREM Benchmark Data:\n\n${formatted}`
              : `I don't have benchmark data matching "${query}". Try asking about:\n` +
                `- R&M / repairs and maintenance\n` +
                `- Utilities (electric, water, gas)\n` +
                `- Management fees\n` +
                `- Insurance\n` +
                `- Total operating expenses`
          }
        ]);

        // Do NOT update document list for benchmark queries

      } else if (intent === 'knowledge_query') {
        // -----------------------------------------
        // PATH B: Platform Knowledge RAG
        // -----------------------------------------
        const response = await fetch('/api/platform-knowledge/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, max_chunks: 5 })
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Query failed');
        }

        const results: PlatformKnowledgeResult[] = data.results || [];

        if (results.length === 0) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `I found 0 relevant passages in the platform knowledge base for "${query}". Try rephrasing your question or uploading more reference documents.`
            }
          ]);
        } else {
          // Format the RAG results for display - clean text, no markdown
          const formattedResults = results.slice(0, 3).map((r, idx) => {
            const source = r.chapter_title
              ? `${r.document_title}, Ch. ${r.chapter_number}: ${r.chapter_title}${r.page ? `, p. ${r.page}` : ''}`
              : `${r.document_title}${r.page ? `, p. ${r.page}` : ''}`;
            const similarity = Math.round(r.similarity * 100);
            // Clean content: trim, normalize whitespace, truncate
            const cleanContent = r.content
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 250);
            const truncated = r.content.length > 250 ? '...' : '';
            return `[${idx + 1}] ${source}\n    Match: ${similarity}%\n    "${cleanContent}${truncated}"`;
          });

          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `I found ${results.length} relevant passages:\n\n${formattedResults.join('\n\n')}`
            }
          ]);
        }

        // Do NOT update document list for knowledge queries

      } else if (intent === 'document_filter') {
        // -----------------------------------------
        // PATH B: Document Filter (existing behavior)
        // -----------------------------------------
        const result = await onQuerySubmit(query);
        const countLabel = result.count === 1 ? 'document' : 'documents';
        const limitNote = result.limit ? ` (showing ${result.limit})` : '';
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `I found ${result.count} ${countLabel}${limitNote}. They are listed at right.${result.count > 0 ? ' Want me to open one?' : ''}`
          }
        ]);

      } else {
        // -----------------------------------------
        // PATH C: Ambiguous - Ask for clarification
        // -----------------------------------------
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `I'm not sure if you want me to:\n\n` +
              `- Search documents - Find files in your projects\n` +
              `- Answer a question - Use platform knowledge (IREM, Appraisal Institute, etc.)\n\n` +
              `Could you clarify? For example:\n` +
              `- "Show me rent rolls from Peoria Lakes"\n` +
              `- "What does IREM say about expense ratios?"`
          }
        ]);
      }

    } catch (error) {
      console.error('[DMS_LANDSCAPER] Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I ran into an issue while processing your request. Please try again.'
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      {...getRootProps()}
      className="relative rounded-xl border border-dashed border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3"
    >
      <input {...getInputProps()} />
      {isDragActive && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center z-10"
          style={{
            borderRadius: '12px',
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
