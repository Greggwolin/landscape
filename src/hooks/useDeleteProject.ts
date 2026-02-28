'use client';

import { useState, useCallback } from 'react';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

export interface TransferSummary {
  transferred: number;
  failed: number;
  skipped: number;
  details: Array<{
    doc_id: number;
    doc_name: string;
    status: 'transferred' | 'failed' | 'skipped';
    error: string | null;
  }>;
}

export interface DeleteProjectResult {
  deleted: boolean;
  project_id: number;
  project_name: string;
  transfer_summary: TransferSummary | null;
}

interface UseDeleteProjectReturn {
  deleteProject: (projectId: number, transferDocuments: boolean) => Promise<DeleteProjectResult>;
  isDeleting: boolean;
  error: string | null;
  clearError: () => void;
}

export function useDeleteProject(): UseDeleteProjectReturn {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const deleteProject = useCallback(
    async (projectId: number, transferDocuments: boolean): Promise<DeleteProjectResult> => {
      setIsDeleting(true);
      setError(null);

      try {
        const response = await fetch(`${DJANGO_API_URL}/api/projects/${projectId}/`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            transfer_documents_to_platform: transferDocuments,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `Delete failed with status ${response.status}`);
        }

        const result: DeleteProjectResult = await response.json();
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete project';
        setError(message);
        throw err;
      } finally {
        setIsDeleting(false);
      }
    },
    []
  );

  return { deleteProject, isDeleting, error, clearError };
}
