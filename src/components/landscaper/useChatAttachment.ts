'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useUploadThing } from '@/lib/uploadthing';
import { getAuthHeaders } from '@/lib/authHeaders';

/**
 * useChatAttachment — shared universal drop/paste/attach-on-send hook (FB-298).
 *
 * One implementation behind BOTH Landscaper surfaces (chat-forward
 * `CenterChatPanel` and classic `LandscaperPanel`) so the drop gesture, the
 * pending-attachment pills, paste support, and the upload-on-Send path are
 * byte-for-byte identical.
 *
 * Behavior:
 *   - Dropped/pasted files of ANY type become pending attachments (no Excel
 *     gate). Multiple files are supported — each is kept in a list.
 *   - Nothing uploads on drop. On Send, `handleBeforeSend` uploads each pending
 *     file via UploadThing + /api/dms/docs and returns a single `contextSuffix`
 *     containing one `[Attached: <name> — doc_id <id>]` line per file, which
 *     LandscaperChatThreaded appends to the user's message so the model is
 *     doc-aware (and can run e.g. Excel-audit tools if the user asks).
 *
 * Ownership target resolution (per upload):
 *   1. projectId (explicit project route)
 *   2. activeThreadId (existing thread)
 *   3. ensureThread() (auto-create an unassigned thread — /w/chat only)
 *
 * The structured-ingestion / Ingestion Workbench pipeline is intentionally NOT
 * invoked here (`intent: 'dms_only'`); the user's typed prompt drives any tool
 * use. Intent-driven auto-routing is a deferred later pass.
 */

const EXCEL_EXTENSIONS = ['.xlsx', '.xlsm', '.xls'];
const isExcelFile = (file: File): boolean => {
  const name = file.name.toLowerCase();
  return EXCEL_EXTENSIONS.some(ext => name.endsWith(ext));
};

/** Derive a sensible DMS doc_type label from the file. Excel keeps the
 *  'Financial Model' label (so audit tools read naturally); everything else
 *  gets a generic 'Document' label rather than being mislabeled. */
function deriveDocType(file: File): string {
  return isExcelFile(file) ? 'Financial Model' : 'Document';
}

export interface UseChatAttachmentOptions {
  /** Explicit project route — uploads are scoped to this project. */
  projectId?: number;
  /** Current chat thread id (used for thread-scoped uploads when no projectId). */
  activeThreadId?: string | null;
  /**
   * Creates an unassigned thread on demand and returns its id (or null on
   * failure). Required for pre-project /w/chat uploads; omit when a projectId
   * is always present (classic panel).
   */
  ensureThread?: () => Promise<string | null>;
  /** Tag recorded on the DMS doc's `ai.source` for provenance. */
  source?: string;
}

export interface UseChatAttachmentResult {
  pendingAttachments: File[];
  /** Append files (drop or paste) to the pending list. */
  addFiles: (files: File[]) => void;
  /** Remove a single pending attachment by index. */
  removeAttachment: (index: number) => void;
  /** Clear all pending attachments. */
  clear: () => void;
  /** True while uploading on Send. */
  uploading: boolean;
  error: string | null;
  setError: (e: string | null) => void;
  /** Pre-send hook handed to LandscaperChatThreaded's `onBeforeSend`. */
  handleBeforeSend: () => Promise<{ contextSuffix?: string } | void>;
}

export function useChatAttachment({
  projectId,
  activeThreadId,
  ensureThread,
  source = 'chat_attachment',
}: UseChatAttachmentOptions): UseChatAttachmentResult {
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UploadThing's `headers` option captures values at hook-call time; reading
  // the thread id through a ref ensures the latest value is sent without
  // re-instantiating the hook. The header is best-effort — the durable
  // doc→thread link is carried in the /api/dms/docs payload below.
  const threadIdRef = useRef<string | null>(activeThreadId ?? null);
  useEffect(() => {
    threadIdRef.current = activeThreadId ?? null;
  }, [activeThreadId]);

  const { startUpload } = useUploadThing('documentUploader', {
    headers: () => {
      const h: Record<string, string> = {
        'x-workspace-id': '1',
        'x-doc-type': 'Financial Model',
      };
      if (projectId) {
        h['x-project-id'] = String(projectId);
      } else if (threadIdRef.current) {
        h['x-thread-id'] = threadIdRef.current;
      }
      return h;
    },
  });

  const addFiles = useCallback((files: File[]) => {
    if (!files || files.length === 0) return;
    setPendingAttachments(prev => [...prev, ...files]);
    setError(null);
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clear = useCallback(() => setPendingAttachments([]), []);

  /**
   * Upload a single file via UploadThing + /api/dms/docs. `threadId` is the
   * resolved ownership thread (used only when there's no projectId). Throws on
   * failure. Does NOT fire any chat message.
   */
  const uploadOne = useCallback(
    async (file: File, threadId: string | null): Promise<{ doc_id: number; doc_name: string }> => {
      const uploadResult = await startUpload([file]);
      if (!uploadResult || uploadResult.length === 0) {
        throw new Error('UploadThing returned no result');
      }
      const uploaded = uploadResult[0] as { serverData?: Record<string, unknown>; url?: string };
      const storage_uri = (uploaded.serverData?.storage_uri as string) ?? uploaded.url ?? '';
      const sha256 = (uploaded.serverData?.sha256 as string) ?? '';

      if (!storage_uri || sha256.length !== 64) {
        throw new Error(`UploadThing response missing storage_uri or sha256 (sha256 len=${sha256.length})`);
      }

      const systemPayload: Record<string, unknown> = {
        workspace_id: 1,
        doc_name: file.name,
        doc_type: deriveDocType(file),
        status: 'draft',
        storage_uri,
        sha256,
        file_size_bytes: file.size,
        mime_type: file.type || 'application/octet-stream',
        version_no: 1,
        // Route through DMS only; the user's typed prompt drives any tool use.
        intent: 'dms_only',
      };
      if (projectId) {
        systemPayload.project_id = projectId;
      } else if (threadId) {
        systemPayload.thread_id = threadId;
      }

      const createRes = await fetch('/api/dms/docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          system: systemPayload,
          profile: {},
          ai: { source },
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        const detail = err.detail || err.error || err.details || createRes.statusText;
        throw new Error(`Failed to register document [${createRes.status}]: ${detail}`);
      }
      const docData = await createRes.json();
      const docId: number | null =
        docData.doc?.doc_id ?? docData.existing_doc?.doc_id ?? null;
      if (!docId) throw new Error('No doc_id returned from /api/dms/docs');

      return { doc_id: docId, doc_name: file.name };
    },
    [projectId, startUpload, source],
  );

  /**
   * Pre-send hook. Uploads every pending attachment and returns one combined
   * `contextSuffix` (one `[Attached: …]` line per file). If any upload throws,
   * the error is surfaced and re-thrown so LandscaperChatThreaded restores the
   * user's input.
   */
  const handleBeforeSend = useCallback(async (): Promise<{ contextSuffix?: string } | void> => {
    if (pendingAttachments.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      // Resolve the ownership thread once (pre-project chat) and reuse it for
      // every file in this batch.
      let threadId: string | null = threadIdRef.current;
      if (!projectId && !threadId && ensureThread) {
        threadId = await ensureThread();
        if (!threadId) {
          throw new Error(
            'Could not create a chat thread to attach the file to. Try sending a message first, then attach the file again.',
          );
        }
      }

      const refs: string[] = [];
      for (const file of pendingAttachments) {
        const { doc_id, doc_name } = await uploadOne(file, threadId);
        refs.push(`[Attached: ${doc_name} — doc_id ${doc_id}]`);
      }
      setPendingAttachments([]);
      return { contextSuffix: refs.join('\n') };
    } catch (e) {
      console.error('Pending attachment upload failed', e);
      setError(e instanceof Error ? e.message : 'Upload failed');
      throw e; // bubble up so handleSend restores the input
    } finally {
      setUploading(false);
    }
  }, [pendingAttachments, projectId, ensureThread, uploadOne]);

  return {
    pendingAttachments,
    addFiles,
    removeAttachment,
    clear,
    uploading,
    error,
    setError,
    handleBeforeSend,
  };
}
