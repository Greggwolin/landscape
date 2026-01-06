'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LandscaperChat } from './LandscaperChat';
import { ActivityFeed } from './ActivityFeed';
import { useUploadThing } from '@/lib/uploadthing';
import { ExtractionReviewModal } from './ExtractionReviewModal';

interface LandscaperPanelProps {
  projectId: number;
  activeTab?: string;
}

interface UploadResult {
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
  };
}

interface ExtractionResult {
  doc_id: number;
  doc_name: string;
  field_mappings: Array<{
    extraction_id?: number;
    source_text: string;
    suggested_field: string;
    suggested_value: string;
    confidence: number;
    scope?: string;
    scope_label?: string;
    status?: 'pending' | 'conflict';
    conflict_existing_value?: string;
    conflict_existing_doc_name?: string;
    conflict_existing_confidence?: number;
  }>;
  summary?: {
    total: number;
    pending: number;
    conflict: number;
    validated: number;
    applied: number;
  };
}

export function LandscaperPanel({ projectId, activeTab = 'home' }: LandscaperPanelProps) {
  // Internal state management with localStorage persistence
  const [isActivityExpanded, setActivityExpanded] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropNotice, setDropNotice] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState('');
  const [showExtractionModal, setShowExtractionModal] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const dragDepth = useRef(0);

  // Default workspace ID (should match dms_workspaces.is_default = true)
  const defaultWorkspaceId = 1;

  // UploadThing hook for file uploads
  // Note: 'Property Data' is the default doc_type for Landscaper uploads
  const { startUpload, isUploading: uploadThingIsUploading } = useUploadThing('documentUploader', {
    headers: {
      'x-project-id': projectId.toString(),
      'x-workspace-id': defaultWorkspaceId.toString(),
      'x-doc-type': 'Property Data',
    },
    onClientUploadComplete: (res) => {
      console.log('Landscaper upload complete:', res);
    },
    onUploadError: (error) => {
      console.error('Landscaper upload error:', error);
      // Provide more helpful error message for common UploadThing issues
      const errorMsg = error.message.includes('parse response')
        ? 'Upload service unavailable. Please restart the dev server or try again later.'
        : error.message;
      setDropNotice(`Upload failed: ${errorMsg}`);
      setIsUploading(false);
      setUploadProgress(0);
      setUploadMessage('');
    },
  });

  // Generate a SHA256 hash for a file (client-side fallback)
  const generateSha256 = async (file: File, url: string): Promise<string> => {
    // Use SubtleCrypto to hash file content + metadata
    const encoder = new TextEncoder();
    const data = encoder.encode(url + file.name + file.size + Date.now());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Upload files and create document records
  const uploadFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadMessage('Preparing upload...');
    const previewNames = files.slice(0, 3).map(f => f.name).join(', ');
    const extraCount = files.length > 3 ? ` (+${files.length - 3} more)` : '';
    setDropNotice(`Uploading ${files.length} file${files.length > 1 ? 's' : ''}: ${previewNames}${extraCount}...`);

    try {
      // Phase 1: Upload files (0-50%)
      setUploadMessage('Uploading files...');
      setUploadProgress(10);
      const results = await startUpload(files) as UploadResult[] | undefined;

      if (!results || results.length === 0) {
        throw new Error('Upload service did not return results. Please restart the dev server and try again.');
      }

      setUploadProgress(50);
      console.log('UploadThing results:', results);

      // Phase 2: Create document records (50-100%)
      setUploadMessage('Creating records...');
      const createdDocs: number[] = [];
      const totalFiles = results.length;

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const file = files[i];
        const serverData = result.serverData;

        // Update progress for each file processed
        const fileProgress = 50 + ((i + 1) / totalFiles) * 50;
        setUploadProgress(fileProgress);
        setUploadMessage(`Processing ${i + 1}/${totalFiles}...`);

        // Generate fallback SHA256 if serverData doesn't have one
        const sha256 = serverData?.sha256 || await generateSha256(file, result.url);

        const payload = {
          system: {
            project_id: serverData?.project_id ?? projectId,
            workspace_id: serverData?.workspace_id ?? defaultWorkspaceId,
            doc_name: serverData?.doc_name ?? file.name,
            doc_type: serverData?.doc_type ?? 'Property Data',
            status: 'draft',
            storage_uri: serverData?.storage_uri ?? result.url,
            sha256: sha256,
            file_size_bytes: serverData?.file_size_bytes ?? file.size,
            mime_type: serverData?.mime_type ?? file.type,
            version_no: 1,
          },
          profile: {},
          ai: { source: 'landscaper' },
        };

        console.log(`Creating document record for: ${file.name}`, payload);

        try {
          const response = await fetch('/api/dms/docs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            const docResult = await response.json();
            console.log(`Document created: doc_id=${docResult.doc?.doc_id}`);
            if (docResult.doc?.doc_id) {
              createdDocs.push(docResult.doc.doc_id);
            }
          } else {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error(`Failed to create document for ${file.name}:`, errorData);
            // Show error to user if it's a validation error
            if (errorData.error === 'Invalid doc_type' && errorData.valid_doc_types) {
              setDropNotice(`Invalid doc type. Valid options: ${errorData.valid_doc_types.join(', ')}`);
            }
          }
        } catch (docError) {
          console.error(`Error creating document for ${file.name}:`, docError);
        }
      }

      if (createdDocs.length > 0) {
        setDropNotice(`Uploaded ${createdDocs.length} document${createdDocs.length > 1 ? 's' : ''} to project.`);

        // Trigger AI extraction using Python backend (comprehensive extraction service)
        if (files.length > 0 && createdDocs.length > 0) {
          setUploadMessage('Processing document for extraction...');
          setUploadProgress(80);

          try {
            const docId = createdDocs[0];
            const backendUrl =
              process.env.NEXT_PUBLIC_DJANGO_API_URL ||
              process.env.DJANGO_API_URL ||
              'http://localhost:8000';

            // Run synchronous processing to ensure text + embeddings exist before extraction
            const processResponse = await fetch(`${backendUrl}/api/knowledge/documents/${docId}/process/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });

            const processText = await processResponse.text();
            let processBody: any = {};
            try {
              processBody = processText ? JSON.parse(processText) : {};
            } catch (err) {
              processBody = { raw: processText || '', parseError: (err as Error)?.message };
            }

            const processedOk =
              processResponse.ok &&
              (processBody?.success === true ||
                processBody?.status === 'ready' ||
                (processBody?.chunks_created ?? 0) > 0 ||
                (processBody?.embeddings_created ?? 0) > 0);

            if (!processedOk) {
              console.error(
                'Document processing failed:',
                processResponse.status,
                processBody || processText || 'Unknown'
              );
              setDropNotice(
                `Uploaded ${createdDocs.length} document(s). Processing failed: ${
                  processBody?.error || processBody?.raw || processText || processResponse.statusText
                }`
              );
              return;
            }

            // Prefer processing response counts; fall back to status check
            let embeddingsReady =
              (processBody?.embeddings_created ?? 0) > 0 ||
              (processBody?.chunks_created ?? 0) > 0 ||
              processBody?.status === 'ready';

            let statusBody: any = null;

            if (!embeddingsReady) {
              const statusResponse = await fetch(
                `${backendUrl}/api/knowledge/documents/${docId}/status/`,
                { headers: { 'Content-Type': 'application/json' } }
              );
              const statusText = await statusResponse.text();
              try {
                statusBody = statusText ? JSON.parse(statusText) : {};
              } catch (err) {
                statusBody = {
                  raw: statusText || '',
                  parseError: (err as Error)?.message,
                };
              }

              embeddingsReady =
                statusResponse.ok &&
                statusBody?.success &&
                (statusBody?.document?.embeddings_count ?? 0) > 0;

              if (!embeddingsReady) {
                console.error('Document not ready for extraction:', statusResponse.status, statusBody);
                setDropNotice(
                  `Uploaded ${createdDocs.length} document(s). Processing incomplete: ${
                    statusBody?.document?.processing_status ||
                    statusBody?.raw ||
                    processBody?.status ||
                    'pending'
                  }${
                    statusBody?.document?.processing_error
                      ? ` - ${statusBody.document.processing_error}`
                      : ''
                  }`
                );
                return;
              }
            }

            if (!embeddingsReady) {
              console.error('Document not ready for extraction:', statusResponse.status, statusBody);
              setDropNotice(
                `Uploaded ${createdDocs.length} document(s). Processing incomplete: ${
                  statusBody?.document?.processing_status || 'pending'
                }${statusBody?.document?.processing_error ? ` - ${statusBody.document.processing_error}` : ''}`
              );
              return;
            }

            setUploadMessage('Running AI extraction...');
            setUploadProgress(90);

            // Use the Python backend's batched extraction endpoint for comprehensive field extraction
            const extractResponse = await fetch(`${backendUrl}/api/knowledge/documents/${docId}/extract-batched/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                project_id: projectId,
                property_type: 'multifamily', // Default to multifamily for OMs
                batches: ['core_property', 'financials', 'deal_market'], // Key batches for OMs
              }),
            });

            if (extractResponse.ok) {
              const extractData = await extractResponse.json();
              console.log('Python extraction result:', extractData);

              // Get pending extractions to show in modal
              const pendingResponse = await fetch(`${backendUrl}/api/knowledge/projects/${projectId}/extractions/pending/`);
              const pendingData = pendingResponse.ok ? await pendingResponse.json() : { extractions: [], summary: null };

              if (extractData.success && (extractData.total_staged > 0 || pendingData.extractions?.length > 0)) {
                // Convert extraction staging format to field_mappings format for modal
                // field_key contains the proper field name (e.g., "replacement_reserves")
                // target_field contains the generic column name (e.g., "value")
                const fieldMappings = (pendingData.extractions || []).map((ext: {
                  extraction_id?: number;
                  source_text?: string;
                  source_snippet?: string;
                  target_field?: string;
                  field_key?: string;
                  extracted_value?: unknown;
                  confidence_score?: number;
                  scope?: string;
                  scope_label?: string;
                  status?: 'pending' | 'conflict';
                  conflict_existing_value?: unknown;
                  conflict_existing_doc_name?: string;
                  conflict_existing_confidence?: number;
                }) => ({
                  extraction_id: ext.extraction_id,
                  source_text: ext.source_snippet || ext.source_text || '',
                  suggested_field: ext.field_key || ext.target_field || '',
                  suggested_value: typeof ext.extracted_value === 'string'
                    ? ext.extracted_value
                    : JSON.stringify(ext.extracted_value),
                  confidence: ext.confidence_score || 0.8,
                  scope: ext.scope,
                  scope_label: ext.scope_label,
                  status: ext.status,
                  conflict_existing_value: ext.conflict_existing_value
                    ? typeof ext.conflict_existing_value === 'string'
                      ? ext.conflict_existing_value
                      : JSON.stringify(ext.conflict_existing_value)
                    : undefined,
                  conflict_existing_doc_name: ext.conflict_existing_doc_name,
                  conflict_existing_confidence: ext.conflict_existing_confidence,
                }));

                if (fieldMappings.length > 0) {
                  setExtractionResult({
                    doc_id: docId,
                    doc_name: files[0].name,
                    field_mappings: fieldMappings,
                    summary: pendingData.summary,
                  });
                  setPendingFile(files[0]);
                  setShowExtractionModal(true);
                  setDropNotice(null);
                } else {
                  setDropNotice(`Uploaded ${createdDocs.length} document(s). ${extractData.total_staged || 0} fields extracted and staged.`);
                }
              } else {
                const errorMsg = extractData.error || 'No extractable fields found.';
                setDropNotice(`Uploaded ${createdDocs.length} document(s). ${errorMsg}`);
              }
            } else {
              const rawError = await extractResponse.text();
              let errorData: { error?: string } = {};
              try {
                errorData = JSON.parse(rawError);
              } catch {
                // keep raw text
              }
              console.error(
                'Python extraction failed:',
                extractResponse.status,
                errorData.error || rawError || 'Unknown'
              );
              setDropNotice(
                `Uploaded ${createdDocs.length} document(s). Extraction error: ${
                  errorData.error || rawError || 'Unknown'
                }`
              );
            }
          } catch (extractError) {
            console.error('Extraction error:', extractError);
            setDropNotice(`Uploaded ${createdDocs.length} document(s). Extraction failed: ${extractError instanceof Error ? extractError.message : 'Unknown error'}`);
          }
        }
      } else {
        setDropNotice('Files uploaded but document records could not be created.');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setDropNotice(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadMessage('');
    }
  }, [startUpload, projectId, defaultWorkspaceId]);

  // Restore state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('landscape-activity-expanded');
    if (saved !== null) {
      setActivityExpanded(saved === 'true');
    }
  }, []);

  const handleActivityToggle = () => {
    const newValue = !isActivityExpanded;
    setActivityExpanded(newValue);
    localStorage.setItem('landscape-activity-expanded', String(newValue));
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current += 1;
    setIsDragOver(true);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragOver) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = 0;
    setIsDragOver(false);

    const files = Array.from(event.dataTransfer?.files || []);
    if (files.length > 0 && !isUploading && !uploadThingIsUploading) {
      // Actually upload the files
      uploadFiles(files);
    } else if (isUploading || uploadThingIsUploading) {
      setDropNotice('Upload in progress, please wait...');
    } else {
      setDropNotice('No files detected in drop.');
    }
  };

  useEffect(() => {
    if (!dropNotice) return;
    const timer = setTimeout(() => setDropNotice(null), 8000);
    return () => clearTimeout(timer);
  }, [dropNotice]);

  return (
    <div
      className="flex flex-col h-full gap-3 relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        borderRadius: '12px',
        border: isDragOver ? '2px dashed var(--cui-primary)' : '1px dashed transparent',
        backgroundColor: isDragOver ? 'var(--cui-tertiary-bg)' : 'transparent',
        transition: 'border-color 0.15s ease, background-color 0.15s ease'
      }}
    >
      {isDragOver && (
        <div
          className="absolute inset-0 d-flex flex-column align-items-center justify-content-center text-center"
          style={{
            borderRadius: '12px',
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
            color: 'var(--cui-body-color)',
            pointerEvents: 'none'
          }}
        >
          <div className="fw-semibold">Drop documents for Landscaper</div>
          <div className="text-sm mt-1" style={{ color: 'var(--cui-secondary-color)' }}>
            Files land in this project for model updates.
          </div>
        </div>
      )}

      {dropNotice && (
        <div
          className="mb-2 rounded-lg px-3 py-2 text-sm"
          style={{
            backgroundColor: 'var(--cui-tertiary-bg)',
            border: `1px solid var(--cui-border-color)`,
            color: 'var(--cui-body-color)'
          }}
        >
          {dropNotice}
        </div>
      )}
      {/* Landscaper Chat Card - reduced height to ensure Activity Feed is visible */}
      <div
        className={`flex flex-col min-h-0 rounded-xl shadow-lg overflow-hidden ${
          isActivityExpanded ? 'flex-[0.35]' : 'flex-1'
        }`}
        style={{ backgroundColor: 'var(--cui-card-bg)', maxHeight: isActivityExpanded ? '45vh' : undefined }}
      >
        <LandscaperChat
          projectId={projectId}
          activeTab={activeTab}
          isIngesting={isUploading || uploadThingIsUploading}
          ingestionProgress={uploadProgress}
          ingestionMessage={uploadMessage}
        />
      </div>

      {/* Activity Feed Card - More prominent to show content without scrolling */}
      <div
        className={`rounded-xl shadow-lg overflow-hidden ${
          isActivityExpanded ? 'flex-[0.65] min-h-[250px]' : 'flex-none'
        }`}
        style={{ backgroundColor: 'var(--cui-card-bg)' }}
      >
        <ActivityFeed
          projectId={projectId}
          isExpanded={isActivityExpanded}
          onToggle={handleActivityToggle}
        />
      </div>

      {/* Extraction Review Modal */}
      {showExtractionModal && extractionResult && (
        <ExtractionReviewModal
          isOpen={showExtractionModal}
          onClose={() => {
            setShowExtractionModal(false);
            setExtractionResult(null);
            setPendingFile(null);
          }}
          projectId={projectId}
          docId={extractionResult.doc_id}
          docName={extractionResult.doc_name}
          fieldMappings={extractionResult.field_mappings}
          summary={extractionResult.summary}
          onCommit={() => {
            setShowExtractionModal(false);
            setExtractionResult(null);
            setPendingFile(null);
            setDropNotice('Extraction data committed successfully.');
          }}
        />
      )}
    </div>
  );
}
