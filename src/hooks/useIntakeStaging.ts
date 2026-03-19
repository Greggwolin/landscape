import { useState, useCallback, useRef } from 'react';
import { classifyFile, CollisionInfo } from '@/components/dms/staging/classifyFile';
import { getAuthHeaders } from '@/lib/authHeaders';
import { useUploadThing } from '@/lib/uploadthing';
import { v4 as uuidv4 } from 'uuid';

// Type definitions
export type IntakeIntent = 'structured_ingestion' | 'project_knowledge' | 'platform_knowledge';
export type IntakeStatus = 'analyzing' | 'ready' | 'uploading' | 'complete' | 'error';

export interface IntakeStagedFile {
  id: string;
  file: File;
  hash: string | null;
  status: IntakeStatus;
  docType: string;
  confidence: number;
  intent: IntakeIntent;
  userDocType: string | null;
  collision: CollisionInfo | null;
  errorMessage: string | null;
  docId: number | null;
}

// Helper function to generate SHA256 hash
async function generateSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Map old routes to new intents
function mapRouteToIntent(route?: string): IntakeIntent {
  switch (route) {
    case 'extract':
      return 'structured_ingestion';
    case 'library':
      return 'project_knowledge';
    case 'reference':
    default:
      return 'project_knowledge';
  }
}

// Check for collisions with existing documents
async function checkCollisions(
  projectId: number,
  files: File[],
  hashes: Map<string, string>
): Promise<Map<string, CollisionInfo | null>> {
  const collisions = new Map<string, CollisionInfo | null>();

  try {
    const res = await fetch(`/api/dms/docs?project_id=${projectId}&limit=500`, {
      headers: { ...getAuthHeaders() },
    });

    if (!res.ok) {
      console.warn('Failed to fetch existing docs for collision check');
      files.forEach((f) => collisions.set(f.name, null));
      return collisions;
    }

    const data = await res.json();
    const existingDocs = data.results || [];

    files.forEach((file) => {
      const fileHash = hashes.get(file.name);
      let collision: CollisionInfo | null = null;

      for (const doc of existingDocs) {
        // Check hash collision
        if (fileHash && doc.file_hash === fileHash) {
          collision = {
            matchType: 'content',
            existingDoc: {
              doc_id: doc.id,
              filename: doc.filename,
              version_number: 0,
              uploaded_at: new Date().toISOString(),
            },
          };
          break;
        }

        // Check filename collision
        if (doc.filename === file.name) {
          collision = {
            matchType: 'filename',
            existingDoc: {
              doc_id: doc.id,
              filename: doc.filename,
              version_number: 0,
              uploaded_at: new Date().toISOString(),
            },
          };
          break;
        }
      }

      collisions.set(file.name, collision);
    });
  } catch (error) {
    console.error('Error checking collisions:', error);
    files.forEach((f) => collisions.set(f.name, null));
  }

  return collisions;
}

export function useIntakeStaging(projectId: number, workspaceId?: number) {
  const [files, setFiles] = useState<IntakeStagedFile[]>([]);
  const analysisInProgressRef = useRef<Set<string>>(new Set());
  const { startUpload } = useUploadThing('documentUploader', {
    headers: {
      'x-project-id': projectId.toString(),
      'x-workspace-id': (workspaceId ?? 1).toString(),
      'x-doc-type': 'Property Data',
    },
  });

  // Add files and begin analysis
  const addFiles = useCallback(
    async (newFiles: File[]) => {
      const stagedFiles: IntakeStagedFile[] = newFiles.map((file) => ({
        id: uuidv4(),
        file,
        hash: null,
        status: 'analyzing',
        docType: 'unknown',
        confidence: 0,
        intent: 'project_knowledge',
        userDocType: null,
        collision: null,
        errorMessage: null,
        docId: null,
      }));

      setFiles((prev) => [...prev, ...stagedFiles]);

      // Analyze each file in parallel
      const analysisPromises = stagedFiles.map(async (stagedFile) => {
        try {
          analysisInProgressRef.current.add(stagedFile.id);

          // Generate hash
          const hash = await generateSha256(stagedFile.file);

          // Classify file
          const classification = await classifyFile(stagedFile.file);

          // Map classification to intent
          const intent = mapRouteToIntent(classification.route);

          // Check for collisions
          const collisionsMap = await checkCollisions(
            projectId,
            [stagedFile.file],
            new Map([[stagedFile.file.name, hash]])
          );
          const collision = collisionsMap.get(stagedFile.file.name) || null;

          // Update file state
          setFiles((prev) =>
            prev.map((f) =>
              f.id === stagedFile.id
                ? {
                    ...f,
                    hash,
                    docType: classification.docType,
                    confidence: classification.confidence,
                    intent,
                    collision,
                    status: 'ready',
                    errorMessage: null,
                  }
                : f
            )
          );
        } catch (error) {
          console.error(`Error analyzing file ${stagedFile.id}:`, error);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === stagedFile.id
                ? {
                    ...f,
                    status: 'error',
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                  }
                : f
            )
          );
        } finally {
          analysisInProgressRef.current.delete(stagedFile.id);
        }
      });

      await Promise.allSettled(analysisPromises);
    },
    [projectId]
  );

  // Remove file from staging
  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // Set intent for a single file
  const setIntent = useCallback((id: string, intent: IntakeIntent) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, intent } : f))
    );
  }, []);

  // Set doc type for a single file
  const setDocType = useCallback((id: string, docType: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, userDocType: docType } : f))
    );
  }, []);

  // Set intent for all files
  const setAllIntent = useCallback((intent: IntakeIntent) => {
    setFiles((prev) =>
      prev.map((f) => ({ ...f, intent }))
    );
  }, []);

  // Upload all files sequentially — returns completed files with docIds
  const uploadAll = useCallback(async (): Promise<IntakeStagedFile[]> => {
    const readyFiles = files.filter((f) => f.status === 'ready');
    const completedFiles: IntakeStagedFile[] = [];

    for (const stagedFile of readyFiles) {
      try {
        // Mark as uploading
        setFiles((prev) =>
          prev.map((f) => (f.id === stagedFile.id ? { ...f, status: 'uploading' } : f))
        );

        // Upload file to UploadThing
        const uploadResult = await startUpload([stagedFile.file]);

        if (!uploadResult || uploadResult.length === 0) {
          throw new Error('Upload failed: no response from UploadThing');
        }

        const uploadedFile = uploadResult[0];

        // Create DMS document record — matches POST /api/dms/docs Zod schema
        const serverData = (uploadedFile as { serverData?: Record<string, unknown> }).serverData as Record<string, unknown> | undefined;
        const storageUri = (serverData?.storage_uri as string) ?? (uploadedFile as { url?: string }).url ?? '';
        const sha256 = (serverData?.sha256 as string) ?? stagedFile.hash ?? '';

        const createDocRes = await fetch('/api/dms/docs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            system: {
              project_id: projectId,
              workspace_id: workspaceId ?? 1,
              doc_name: stagedFile.file.name,
              doc_type: stagedFile.userDocType || stagedFile.docType || 'General',
              status: 'draft',
              storage_uri: storageUri,
              sha256: sha256,
              file_size_bytes: stagedFile.file.size,
              mime_type: stagedFile.file.type,
              version_no: 1,
              intent: stagedFile.intent,
            },
            profile: {},
            ai: { source: 'intake_modal' },
          }),
        });

        if (!createDocRes.ok) {
          const errorData = await createDocRes.json();
          throw new Error(
            `Failed to create DMS record: ${errorData.detail || createDocRes.statusText}`
          );
        }

        const docData = await createDocRes.json();
        const docId = docData.doc?.doc_id || docData.existing_doc?.doc_id || null;

        const completedFile = { ...stagedFile, status: 'complete' as const, docId, errorMessage: null };
        completedFiles.push(completedFile);

        // Mark as complete and store doc ID
        setFiles((prev) =>
          prev.map((f) =>
            f.id === stagedFile.id
              ? {
                  ...f,
                  status: 'complete',
                  docId: docId,
                  errorMessage: null,
                }
              : f
          )
        );
      } catch (error) {
        console.error(`Error uploading file ${stagedFile.id}:`, error);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === stagedFile.id
              ? {
                  ...f,
                  status: 'error',
                  errorMessage: error instanceof Error ? error.message : 'Upload failed',
                }
              : f
          )
        );
      }
    }

    return completedFiles;
  }, [files, projectId, workspaceId, startUpload]);

  // Reset all staging state
  const reset = useCallback(() => {
    setFiles([]);
    analysisInProgressRef.current.clear();
  }, []);

  // Computed values
  const isUploading = files.some((f) => f.status === 'uploading');
  const readyCount = files.filter((f) => f.status === 'ready').length;
  const allDone = files.length > 0 && files.every((f) => f.status === 'complete' || f.status === 'error');

  return {
    files,
    addFiles,
    removeFile,
    setIntent,
    setDocType,
    setAllIntent,
    uploadAll,
    reset,
    isUploading,
    readyCount,
    allDone,
  };
}
