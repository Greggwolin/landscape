'use client';

/**
 * UploadStagingContext — Universal staging layer for DMS file uploads.
 *
 * Intercepts all incoming files, holds them in browser memory, runs
 * client-side classification and collision detection, and requires
 * explicit user confirmation before any file is written to the server.
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useUploadThing } from '@/lib/uploadthing';
import { computeFileHash, checkCollision } from '@/lib/dms/uploadUtils';
import {
  createStagedFile,
  type StagedFile,
  type StagingRoute,
  type StagingStatus,
  type CollisionInfo,
} from '@/components/dms/staging/classifyFile';

// ============================================
// CONTEXT VALUE
// ============================================

export interface StageFilesOptions {
  suggestedDocType?: string;
}

interface UploadStagingContextValue {
  stagedFiles: StagedFile[];
  isTrayOpen: boolean;
  stageFiles: (files: File[], options?: StageFilesOptions) => void;
  removeFile: (id: string) => void;
  clearAll: () => void;
  closeTray: () => void;
  setFileDocType: (id: string, docType: string) => void;
  setFileRoute: (id: string, route: StagingRoute) => void;
  confirmFile: (id: string) => Promise<void>;
  confirmAll: () => Promise<void>;
  docTypes: string[];
  setDocTypes: (types: string[]) => void;
  projectId: number | null;
  workspaceId: number;
}

const StagingContext = createContext<UploadStagingContextValue | null>(null);

// ============================================
// REDUCER
// ============================================

type StagingAction =
  | { type: 'ADD_FILES'; files: StagedFile[] }
  | { type: 'UPDATE_FILE'; id: string; updates: Partial<StagedFile> }
  | { type: 'REMOVE_FILE'; id: string }
  | { type: 'CLEAR_ALL' };

function stagingReducer(state: StagedFile[], action: StagingAction): StagedFile[] {
  switch (action.type) {
    case 'ADD_FILES':
      return [...state, ...action.files];
    case 'UPDATE_FILE':
      return state.map(f => (f.id === action.id ? { ...f, ...action.updates } : f));
    case 'REMOVE_FILE':
      return state.filter(f => f.id !== action.id);
    case 'CLEAR_ALL':
      return [];
    default:
      return state;
  }
}

// ============================================
// PROVIDER
// ============================================

interface UploadStagingProviderProps {
  children: ReactNode;
  projectId: number;
  workspaceId?: number;
  onUploadComplete?: () => void;
}

export function UploadStagingProvider({
  children,
  projectId,
  workspaceId = 1,
  onUploadComplete,
}: UploadStagingProviderProps) {
  const [stagedFiles, dispatch] = useReducer(stagingReducer, []);
  const [isTrayOpen, setIsTrayOpen] = React.useState(false);
  const [docTypes, setDocTypes] = React.useState<string[]>([]);

  // Track whether we're currently analyzing to prevent concurrent runs
  const analyzeQueueRef = useRef<StagedFile[]>([]);
  const isAnalyzingRef = useRef(false);

  // UploadThing hook for executing confirmed uploads
  const { startUpload } = useUploadThing('documentUploader', {
    headers: {
      'x-project-id': projectId.toString(),
      'x-workspace-id': workspaceId.toString(),
      'x-doc-type': 'staged',
    },
  });

  // ------------------------------------------
  // ANALYSIS PIPELINE
  // ------------------------------------------

  const analyzeFile = useCallback(
    async (staged: StagedFile) => {
      try {
        // 1. Compute SHA-256 hash
        const hash = await computeFileHash(staged.file);
        dispatch({ type: 'UPDATE_FILE', id: staged.id, updates: { hash } });

        // 2. Check collision
        let collision: CollisionInfo | null = null;
        if (projectId) {
          const result = await checkCollision(projectId, staged.file.name, hash);
          if (result.collision && result.existing_doc && result.match_type) {
            collision = {
              matchType: result.match_type,
              existingDoc: result.existing_doc,
            };
          }
        }

        dispatch({
          type: 'UPDATE_FILE',
          id: staged.id,
          updates: { status: 'ready', hash, collision },
        });
      } catch (error) {
        console.error(`[STAGING] Analysis failed for ${staged.file.name}:`, error);
        dispatch({
          type: 'UPDATE_FILE',
          id: staged.id,
          updates: {
            status: 'error',
            errorMessage: error instanceof Error ? error.message : 'Analysis failed',
          },
        });
      }
    },
    [projectId]
  );

  const processQueue = useCallback(async () => {
    if (isAnalyzingRef.current) return;
    isAnalyzingRef.current = true;

    while (analyzeQueueRef.current.length > 0) {
      // Process up to 2 files concurrently
      const batch = analyzeQueueRef.current.splice(0, 2);
      await Promise.all(batch.map(analyzeFile));
    }

    isAnalyzingRef.current = false;
  }, [analyzeFile]);

  // ------------------------------------------
  // ACTIONS
  // ------------------------------------------

  const stageFiles = useCallback(
    (files: File[], options?: StageFilesOptions) => {
      const newStaged = files.map(file =>
        createStagedFile(file, options?.suggestedDocType)
      );

      dispatch({ type: 'ADD_FILES', files: newStaged });
      setIsTrayOpen(true);

      // Queue for analysis
      analyzeQueueRef.current.push(...newStaged);
      void processQueue();
    },
    [processQueue]
  );

  const removeFile = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_FILE', id });
  }, []);

  const clearAll = useCallback(() => {
    analyzeQueueRef.current = [];
    dispatch({ type: 'CLEAR_ALL' });
    setIsTrayOpen(false);
  }, []);

  const closeTray = useCallback(() => {
    const hasPending = stagedFiles.some(
      f => f.status !== 'complete' && f.status !== 'error'
    );
    if (hasPending) {
      const confirmed = window.confirm(
        `You have ${stagedFiles.filter(f => f.status !== 'complete' && f.status !== 'error').length} files pending. Discard all?`
      );
      if (!confirmed) return;
    }
    clearAll();
  }, [stagedFiles, clearAll]);

  const setFileDocType = useCallback((id: string, docType: string) => {
    dispatch({ type: 'UPDATE_FILE', id, updates: { userDocType: docType } });
  }, []);

  const setFileRoute = useCallback((id: string, route: StagingRoute) => {
    dispatch({ type: 'UPDATE_FILE', id, updates: { userRoute: route } });
  }, []);

  // ------------------------------------------
  // UPLOAD EXECUTION
  // ------------------------------------------

  const confirmFile = useCallback(
    async (id: string) => {
      const staged = stagedFiles.find(f => f.id === id);
      if (!staged || staged.status !== 'ready') return;

      const effectiveDocType = staged.userDocType || staged.classifiedDocType || 'General';
      const effectiveRoute = staged.userRoute || staged.route;

      dispatch({ type: 'UPDATE_FILE', id, updates: { status: 'uploading' } });

      // Route B: Cost Library stub
      if (effectiveRoute === 'library') {
        dispatch({ type: 'UPDATE_FILE', id, updates: { status: 'complete' } });
        return;
      }

      try {
        // 1. Upload file via UploadThing
        const results = await startUpload([staged.file]);
        if (!results || results.length === 0) {
          throw new Error('No upload results returned');
        }

        const result = results[0];
        const serverData = (result as { serverData?: Record<string, unknown> }).serverData as
          | Record<string, unknown>
          | undefined;

        // 2. Create document record
        const payload = {
          system: {
            project_id: (serverData?.project_id as number) ?? projectId,
            workspace_id: (serverData?.workspace_id as number) ?? workspaceId,
            doc_name: (serverData?.doc_name as string) ?? staged.file.name,
            doc_type: effectiveDocType,
            status: 'draft',
            storage_uri: (serverData?.storage_uri as string) ?? (result as { url?: string }).url,
            sha256: staged.hash ?? (serverData?.sha256 as string),
            file_size_bytes: (serverData?.file_size_bytes as number) ?? staged.file.size,
            mime_type: (serverData?.mime_type as string) ?? staged.file.type,
            version_no: 1,
          },
          profile: {},
          ai: { source: 'staging-tray' },
        };

        const response = await fetch('/api/dms/docs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || `Upload failed: ${response.statusText}`);
        }

        const docResult = await response.json();

        // 3. If extract route and not a collision/duplicate, extraction is
        //    already queued by the POST /api/dms/docs endpoint.
        //    Route 'reference' documents also get created but the endpoint
        //    handles extraction queueing based on doc_type.

        console.log(
          `[STAGING] Upload complete: ${staged.file.name} → doc_id=${docResult.doc?.doc_id}`
        );

        dispatch({ type: 'UPDATE_FILE', id, updates: { status: 'complete' } });
      } catch (error) {
        console.error(`[STAGING] Upload error for ${staged.file.name}:`, error);
        dispatch({
          type: 'UPDATE_FILE',
          id,
          updates: {
            status: 'error',
            errorMessage: error instanceof Error ? error.message : 'Upload failed',
          },
        });
      }
    },
    [stagedFiles, startUpload, projectId, workspaceId]
  );

  const confirmAll = useCallback(async () => {
    const readyFiles = stagedFiles.filter(f => f.status === 'ready');
    for (const file of readyFiles) {
      await confirmFile(file.id);
    }
    onUploadComplete?.();
  }, [stagedFiles, confirmFile, onUploadComplete]);

  // ------------------------------------------
  // Auto-close tray when all files are done
  // ------------------------------------------

  useEffect(() => {
    if (stagedFiles.length === 0) return;
    const allDone = stagedFiles.every(f => f.status === 'complete');
    if (allDone) {
      // Small delay so user sees the success state
      const timer = setTimeout(() => {
        dispatch({ type: 'CLEAR_ALL' });
        setIsTrayOpen(false);
        onUploadComplete?.();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [stagedFiles, onUploadComplete]);

  // ------------------------------------------
  // Navigation guard
  // ------------------------------------------

  useEffect(() => {
    const hasPending = stagedFiles.some(
      f => f.status !== 'complete' && f.status !== 'error'
    );
    if (!isTrayOpen || !hasPending) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You have files staged for upload. Are you sure you want to leave?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isTrayOpen, stagedFiles]);

  // ------------------------------------------
  // CONTEXT VALUE
  // ------------------------------------------

  const value: UploadStagingContextValue = {
    stagedFiles,
    isTrayOpen,
    stageFiles,
    removeFile,
    clearAll,
    closeTray,
    setFileDocType,
    setFileRoute,
    confirmFile,
    confirmAll,
    docTypes,
    setDocTypes,
    projectId,
    workspaceId,
  };

  return (
    <StagingContext.Provider value={value}>
      {children}
    </StagingContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useUploadStaging(): UploadStagingContextValue {
  const ctx = useContext(StagingContext);
  if (!ctx) {
    throw new Error('useUploadStaging must be used within an UploadStagingProvider');
  }
  return ctx;
}
