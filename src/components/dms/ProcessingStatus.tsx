'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';

interface ProcessingStatusProps {
  projectId: string | number;
  showDetails?: boolean;
  className?: string;
}

interface StatusSummary {
  total_documents: number;
  ready: number;
  processing: number;
  queued: number;
  failed: number;
  skipped: number;
}

interface ProcessingDocument {
  doc_id: number;
  doc_name: string;
  doc_type: string;
  processing_status: string;
  processing_error: string | null;
  chunks_count: number;
  embeddings_count: number;
}

interface ProcessingStatusResponse {
  success: boolean;
  project_id: number;
  summary: StatusSummary;
  status_counts: Record<string, number>;
  documents: ProcessingDocument[];
}

/**
 * Document Processing Status indicator for DMS
 *
 * Shows processing status for documents in a project:
 * - Compact mode: Just shows ready count / total with processing indicator
 * - Details mode: Shows breakdown and recent documents
 */
export function ProcessingStatus({
  projectId,
  showDetails = false,
  className = '',
}: ProcessingStatusProps) {
  const { data, isLoading, error } = useQuery<ProcessingStatusResponse>({
    queryKey: ['processing-status', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/processing-status`);
      if (!res.ok) throw new Error('Failed to fetch processing status');
      return res.json();
    },
    refetchInterval: 5000, // Poll every 5 seconds when processing
    staleTime: 3000,
  });

  if (isLoading || error || !data?.success) {
    return null;
  }

  const summary = data.summary;
  const isProcessing = summary.processing > 0 || summary.queued > 0;
  const hasFailures = summary.failed > 0;

  // Compact mode: all good, no active processing
  if (!showDetails && !isProcessing && !hasFailures) {
    return (
      <div className={`flex items-center gap-1.5 text-xs text-muted ${className}`}>
        <span className="w-2 h-2 rounded-full bg-green-500"></span>
        <span>{summary.ready} docs ready for Landscaper</span>
      </div>
    );
  }

  // Compact mode with processing
  if (!showDetails) {
    return (
      <div className={`flex items-center gap-2 text-xs ${className}`}>
        {isProcessing && (
          <div className="flex items-center gap-1.5 text-blue-400">
            <div className="animate-spin w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full"></div>
            <span>Processing {summary.processing + summary.queued}...</span>
          </div>
        )}
        {hasFailures && (
          <div className="flex items-center gap-1 text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span>{summary.failed} failed</span>
          </div>
        )}
        <span className="text-muted">
          {summary.ready}/{summary.total_documents} ready
        </span>
      </div>
    );
  }

  // Detailed mode
  return (
    <div className={`bg-surface-elevated rounded-lg p-4 ${className}`}>
      <div className="font-medium mb-3">Document Processing</div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
        <div className="text-center">
          <div className="text-2xl font-semibold text-green-400">{summary.ready}</div>
          <div className="text-muted text-xs">Ready</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-semibold text-blue-400">
            {summary.processing + summary.queued}
          </div>
          <div className="text-muted text-xs">Processing</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-semibold text-red-400">{summary.failed}</div>
          <div className="text-muted text-xs">Failed</div>
        </div>
      </div>

      {/* Active processing indicator */}
      {isProcessing && (
        <div className="flex items-center gap-2 text-blue-400 mb-3 text-sm">
          <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
          Processing documents... ({summary.processing} active, {summary.queued} queued)
        </div>
      )}

      {/* Recent documents */}
      {data.documents.length > 0 && (
        <div className="mt-4">
          <div className="text-xs text-muted uppercase mb-2">Recent Documents</div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {data.documents.slice(0, 8).map((doc) => (
              <DocumentStatusRow key={doc.doc_id} doc={doc} />
            ))}
          </div>
        </div>
      )}

      {/* Failed documents action */}
      {hasFailures && (
        <button
          className="mt-3 text-xs text-red-400 hover:text-red-300 underline"
          onClick={() => reprocessFailed(projectId)}
        >
          Retry {summary.failed} failed document{summary.failed > 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}

function DocumentStatusRow({ doc }: { doc: ProcessingDocument }) {
  const statusConfig = {
    ready: { color: 'text-green-400', icon: '✓', bg: 'bg-green-500/10' },
    extracting: { color: 'text-blue-400', icon: '⟳', bg: 'bg-blue-500/10' },
    chunking: { color: 'text-blue-400', icon: '⟳', bg: 'bg-blue-500/10' },
    embedding: { color: 'text-blue-400', icon: '⟳', bg: 'bg-blue-500/10' },
    queued: { color: 'text-yellow-400', icon: '◷', bg: 'bg-yellow-500/10' },
    pending: { color: 'text-muted', icon: '○', bg: '' },
    failed: { color: 'text-red-400', icon: '✗', bg: 'bg-red-500/10' },
    skipped: { color: 'text-muted', icon: '⊘', bg: '' },
  };

  const config = statusConfig[doc.processing_status as keyof typeof statusConfig] || statusConfig.pending;

  return (
    <div className={`flex items-center justify-between text-xs p-1.5 rounded ${config.bg}`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className={config.color}>{config.icon}</span>
        <span className="truncate">{doc.doc_name}</span>
      </div>
      <div className={`flex items-center gap-2 ${config.color} whitespace-nowrap`}>
        {doc.processing_status === 'ready' && doc.embeddings_count > 0 && (
          <span className="text-muted">{doc.embeddings_count} chunks</span>
        )}
        {doc.processing_status === 'failed' && (
          <button
            className="hover:underline"
            onClick={() => reprocessDocument(doc.doc_id)}
            title={doc.processing_error || 'Unknown error'}
          >
            retry
          </button>
        )}
        <span className="capitalize">{doc.processing_status}</span>
      </div>
    </div>
  );
}

async function reprocessDocument(docId: number) {
  try {
    const res = await fetch(`/api/dms/docs/${docId}/reprocess`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reprocess');
  } catch (error) {
    console.error('Reprocess failed:', error);
  }
}

async function reprocessFailed(projectId: string | number) {
  try {
    const res = await fetch(`/api/projects/${projectId}/reprocess-failed`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reprocess');
  } catch (error) {
    console.error('Reprocess failed:', error);
  }
}

export default ProcessingStatus;
