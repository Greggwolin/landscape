'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useUploadThing } from '@/lib/uploadthing';
import { useLandscaperCollision } from '@/contexts/LandscaperCollisionContext';

interface UploadThingResult {
  url: string;
  key: string;
  name: string;
  size: number;
  serverData?: {
    storage_uri: string;
    sha256: string;
    doc_name: string;
    mime_type: string;
    file_size_bytes: number;
    project_id: number;
    workspace_id: number;
    doc_type: string;
    discipline?: string;
    phase_id?: number;
    parcel_id?: number;
  };
}

interface DocCreateResult {
  success: boolean;
  duplicate: boolean;
  doc: {
    doc_id: number;
    version_no: number;
    doc_name: string;
    status: string;
    created_at: string;
  };
}

interface CollisionCheckResult {
  collision: boolean;
  match_type?: 'filename' | 'content' | 'both';
  existing_doc?: {
    doc_id: number;
    filename: string;
    version_number: number;
    uploaded_at: string;
    extraction_summary: {
      facts_extracted: number;
      embeddings: number;
    };
  };
}

// CollisionData type moved to LandscaperCollisionContext

interface DropzoneProps {
  projectId: number;
  workspaceId: number;
  docType?: string;
  discipline?: string;
  phaseId?: number;
  parcelId?: number;
  onUploadComplete?: (results: any[]) => void;
  onUploadError?: (error: Error) => void;
}

/**
 * Compute real SHA-256 hash of file content
 */
async function computeFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check for collision with existing documents
 */
async function checkCollision(
  projectId: number,
  filename: string,
  contentHash: string
): Promise<CollisionCheckResult> {
  try {
    const response = await fetch(`/api/projects/${projectId}/dms/check-collision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename,
        content_hash: contentHash
      })
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

export default function Dropzone({
  projectId,
  workspaceId,
  docType = 'general',
  discipline,
  phaseId,
  parcelId,
  onUploadComplete,
  onUploadError
}: DropzoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  // pendingFiles stores remaining files when collision pauses processing
  // Will be used by collision resolution to continue the upload queue
  const [, setPendingFiles] = useState<File[]>([]);

  // Collision handling via Landscaper context
  const { addCollision, pendingCollision } = useLandscaperCollision();

  const { startUpload, isUploading: uploadThingUploading } = useUploadThing('documentUploader', {
    headers: {
      'x-project-id': projectId.toString(),
      'x-workspace-id': workspaceId.toString(),
      'x-doc-type': docType,
      ...(discipline && { 'x-discipline': discipline }),
      ...(phaseId && { 'x-phase-id': phaseId.toString() }),
      ...(parcelId && { 'x-parcel-id': parcelId.toString() })
    },
    onClientUploadComplete: (res) => {
      console.log('Upload completed (UploadThing):', res);
      setIsUploading(false);
      setUploadProgress({});
    },
    onUploadError: (error) => {
      console.error('Upload error:', error);
      setIsUploading(false);
      setUploadProgress({});
      onUploadError?.(error);
    },
    onUploadBegin: (name) => {
      console.log('Upload begin:', name);
      setUploadProgress(prev => ({ ...prev, [name]: 0 }));
    },
    onUploadProgress: (progress) => {
      setUploadProgress(prev => ({ ...prev, [`progress-${Date.now()}`]: progress }));
    }
  });

  /**
   * Upload a single file and create document record
   */
  const uploadSingleFile = async (file: File, hash?: string): Promise<any> => {
    const results = await startUpload([file]) as UploadThingResult[] | undefined;

    if (!results || results.length === 0) {
      throw new Error('No upload results returned');
    }

    const result = results[0];
    const serverData = result.serverData;
    const sha256 = serverData?.sha256 || hash || await computeFileHash(file);

    const payload = {
      system: {
        project_id: serverData?.project_id ?? projectId,
        workspace_id: serverData?.workspace_id ?? workspaceId,
        phase_id: serverData?.phase_id ?? phaseId,
        parcel_id: serverData?.parcel_id ?? parcelId,
        doc_name: serverData?.doc_name ?? file.name,
        doc_type: serverData?.doc_type ?? docType,
        discipline: serverData?.discipline ?? discipline,
        status: 'draft',
        storage_uri: serverData?.storage_uri ?? result.url,
        sha256: sha256,
        file_size_bytes: serverData?.file_size_bytes ?? file.size,
        mime_type: serverData?.mime_type ?? file.type,
        version_no: 1,
      },
      profile: {},
      ai: { source: 'upload' },
    };

    console.log(`Creating document record for: ${file.name}`, payload);

    const response = await fetch('/api/dms/docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const responseText = await response.text();
      console.error(`Failed to create document record for ${file.name}:`, responseText);
      throw new Error(`Failed to create document record: ${response.statusText}`);
    }

    const docResult: DocCreateResult = await response.json();
    console.log(`Document record created: doc_id=${docResult.doc?.doc_id}`);

    return {
      ...result,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      doc_id: docResult.doc?.doc_id,
      duplicate: docResult.duplicate,
      profile_json: {},
    };
  };

  /**
   * Process files with collision detection - triggers Landscaper for collisions
   */
  const processFilesWithCollisionCheck = useCallback(async (files: File[]) => {
    if (files.length === 0) {
      setIsUploading(false);
      return;
    }

    const file = files[0];
    const remainingFiles = files.slice(1);

    try {
      // 1. Compute real content hash
      console.log(`Computing hash for: ${file.name}`);
      const contentHash = await computeFileHash(file);
      console.log(`Hash computed: ${contentHash.substring(0, 16)}...`);

      // 2. Check for collision
      console.log(`Checking collision for: ${file.name}`);
      const collision = await checkCollision(projectId, file.name, contentHash);
      console.log('Collision result:', collision);

      if (collision.collision && collision.existing_doc && collision.match_type) {
        // 3. Collision found - trigger Landscaper instead of modal
        addCollision({
          file,
          hash: contentHash,
          matchType: collision.match_type,
          existingDoc: {
            doc_id: collision.existing_doc.doc_id,
            filename: collision.existing_doc.filename,
            version_number: collision.existing_doc.version_number,
            uploaded_at: collision.existing_doc.uploaded_at,
          },
          projectId,
        });
        setPendingFiles(remainingFiles);
        // Don't proceed with upload - Landscaper will handle via context
        return;
      }

      // 4. No collision - proceed with upload
      const result = await uploadSingleFile(file, contentHash);
      onUploadComplete?.([result]);

      // 5. Continue with remaining files
      if (remainingFiles.length > 0) {
        await processFilesWithCollisionCheck(remainingFiles);
      } else {
        setIsUploading(false);
      }

    } catch (error) {
      console.error('Error processing file:', error);
      onUploadError?.(error instanceof Error ? error : new Error('Upload failed'));
      // Continue with remaining files despite error
      if (remainingFiles.length > 0) {
        await processFilesWithCollisionCheck(remainingFiles);
      } else {
        setIsUploading(false);
      }
    }
  }, [projectId, onUploadComplete, onUploadError, addCollision]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsUploading(true);

    // Initialize progress tracking
    const progressMap: Record<string, number> = {};
    acceptedFiles.forEach((file, index) => {
      progressMap[`${file.name}-${index}`] = 0;
    });
    setUploadProgress(progressMap);

    // Process files with collision detection
    await processFilesWithCollisionCheck(acceptedFiles);
  }, [processFilesWithCollisionCheck]);

  // Collision resolution is now handled by Landscaper via context
  // When user responds in Landscaper chat, the context will trigger the appropriate action

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
    isDragAccept
  } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv']
    },
    maxSize: 32 * 1024 * 1024, // 32MB
    maxFiles: 10,
    disabled: isUploading || uploadThingUploading || !!pendingCollision
  });

  const borderColor = isDragAccept
    ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
    : isDragReject
    ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
    : isDragActive
    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
    : 'border-gray-300 dark:border-gray-600';

  const activeUploading = isUploading || uploadThingUploading;

  return (
    <>
      <div className="w-full">
        <div
          {...getRootProps()}
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors duration-200 ease-in-out
            ${borderColor}
            ${activeUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10'}
          `}
        >
          <input {...getInputProps()} />

          {activeUploading ? (
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Uploading files...
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Please wait while your documents are being processed
                </p>

                {/* Progress indicators */}
                {Object.entries(uploadProgress).length > 0 && (
                  <div className="mt-4 space-y-2">
                    {Object.entries(uploadProgress).map(([filename, progress]) => (
                      <div key={filename} className="text-left">
                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                          <span className="truncate">{filename.replace(/-.+$/, '')}</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 48 48" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  />
                </svg>
              </div>

              {isDragActive ? (
                isDragAccept ? (
                  <div>
                    <p className="text-lg font-medium text-green-600 dark:text-green-400">
                      Drop files here to upload
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Release to start uploading
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg font-medium text-red-600 dark:text-red-400">
                      Some files are not supported
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Only PDF, Office docs, images, and text files are allowed
                    </p>
                  </div>
                )
              ) : (
                <div>
                  <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Drag and drop files here, or click to browse
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Supports PDF, Word, Excel, images, and text files up to 32MB
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Maximum 10 files per upload
                  </p>
                </div>
              )}

              <div className="flex items-center justify-center">
                <button
                  type="button"
                  className="btn btn-primary btn-sm d-inline-flex align-items-center"
                >
                  Select Files
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Upload context info */}
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Upload Context
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
            <div>
              <span className="font-medium">Project:</span> {projectId}
            </div>
            <div>
              <span className="font-medium">Workspace:</span> {workspaceId}
            </div>
            <div>
              <span className="font-medium">Type:</span> {docType}
            </div>
            {discipline && (
              <div>
                <span className="font-medium">Discipline:</span> {discipline}
              </div>
            )}
            {phaseId && (
              <div>
                <span className="font-medium">Phase:</span> {phaseId}
              </div>
            )}
            {parcelId && (
              <div>
                <span className="font-medium">Parcel:</span> {parcelId}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Collision handling moved to Landscaper chat via LandscaperCollisionContext */}
    </>
  );
}
