/**
 * Shared upload utilities for DMS file operations.
 * Extracted from Dropzone.tsx and AccordionFilters.tsx to avoid duplication.
 */

export interface CollisionExistingDoc {
  doc_id: number;
  filename: string;
  version_number: number;
  uploaded_at: string;
  doc_type?: string | null;
  file_size_bytes?: number | null;
  mime_type?: string | null;
  extraction_summary?: {
    facts_extracted: number;
    embeddings: number;
  };
}

export interface CollisionCheckResult {
  collision: boolean;
  match_type?: 'filename' | 'content' | 'both';
  existing_doc?: CollisionExistingDoc;
}

/**
 * Compute SHA-256 hash of file content using Web Crypto API.
 */
export async function computeFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check for collision with existing documents in a project.
 */
export async function checkCollision(
  projectId: number,
  filename: string,
  contentHash: string
): Promise<CollisionCheckResult> {
  try {
    const response = await fetch(`/api/projects/${projectId}/dms/check-collision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, content_hash: contentHash }),
    });

    if (!response.ok) {
      console.error('Collision check failed:', response.status);
      return { collision: false };
    }

    return response.json();
  } catch (error) {
    console.error('Collision check error:', error);
    return { collision: false };
  }
}
