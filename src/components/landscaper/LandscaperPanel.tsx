'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { CCard, CAlert, CButton, CSpinner } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCheckCircle, cilWarning, cilX } from '@coreui/icons';
import { useQueryClient } from '@tanstack/react-query';
import { LandscaperChatThreaded, type LandscaperChatHandle } from './LandscaperChatThreaded';
import { ActivityFeed } from './ActivityFeed';
import { useUploadThing } from '@/lib/uploadthing';
import { ExtractionReviewModal } from './ExtractionReviewModal';
import { useExtractionJobStatus } from '@/hooks/useExtractionJobStatus';
import { usePendingRentRollExtractions } from '@/hooks/usePendingRentRollExtractions';
import {
  RentRollUpdateReviewModal,
  type RentRollComparisonResponse,
  type RentRollExtractionMap,
} from './RentRollUpdateReviewModal';
import FieldMappingInterface from './FieldMappingInterface';
import MediaPreviewModal from '@/components/dms/modals/MediaPreviewModal';
import { useFileDrop } from '@/contexts/FileDropContext';

interface LandscaperPanelProps {
  projectId: number;
  activeTab?: string;
  pageContext?: string;
  contextPillLabel?: string;
  contextPillColor?: string;
  onToggleCollapse?: () => void;
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

export function LandscaperPanel({
  projectId,
  activeTab = 'home',
  pageContext,
  contextPillLabel,
  contextPillColor,
  onToggleCollapse,
}: LandscaperPanelProps) {
  // Internal state management with localStorage persistence
  const queryClient = useQueryClient();
  const [isActivityExpanded, setActivityExpanded] = useState(true);
  const [expandedSplitRatio, setExpandedSplitRatio] = useState(0.25);
  const [collapsedSplitRatio, setCollapsedSplitRatio] = useState(0.75);
  const [splitRatio, setSplitRatio] = useState(0.25);
  const [splitContainerHeight, setSplitContainerHeight] = useState(0);
  const [isResizing, setIsResizing] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement | null>(null);
  const chatRef = useRef<LandscaperChatHandle>(null);
  const splitRatioRef = useRef(splitRatio);
  const expandedSplitRef = useRef(expandedSplitRatio);
  const collapsedSplitRef = useRef(collapsedSplitRatio);
  const [dropNotice, setDropNotice] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState('');
  const [showExtractionModal, setShowExtractionModal] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [, setPendingFile] = useState<File | null>(null);
  const [rentRollComparison, setRentRollComparison] = useState<RentRollComparisonResponse | null>(null);
  const [rentRollExtractedUnits, setRentRollExtractedUnits] = useState<RentRollExtractionMap>({});
  const [showRentRollReviewModal, setShowRentRollReviewModal] = useState(false);

  // Field mapping interface state (for Excel/CSV rent rolls)
  const [showFieldMappingModal, setShowFieldMappingModal] = useState(false);
  const [fieldMappingDocId, setFieldMappingDocId] = useState<number | null>(null);
  const [fieldMappingDocName, setFieldMappingDocName] = useState<string>('');

  // Media preview modal state
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const [mediaPreviewDocId, setMediaPreviewDocId] = useState<number | null>(null);
  const [mediaPreviewDocName, setMediaPreviewDocName] = useState<string>('');

  // Extraction job status
  const { rentRollJob, cancelJob: cancelExtractionJob } = useExtractionJobStatus(projectId);
  const { pendingCount: rentRollPendingCount, documentId: pendingDocumentId, refresh: refreshPendingExtractions } = usePendingRentRollExtractions(projectId);
  const [extractionBannerDismissed, setExtractionBannerDismissed] = useState(false);

  // Get files dropped anywhere in the project layout
  const { pendingFiles, consumeFiles } = useFileDrop();

  const RESIZER_SIZE = 10;
  const MIN_CHAT_HEIGHT = 180;
  const MIN_ACTIVITY_HEIGHT = 160;

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

            // Detect document type from filename to choose appropriate extraction batches
            const docName = files[0]?.name?.toLowerCase() || '';
            const isRentRoll = docName.includes('rent roll') ||
                              docName.includes('rentroll') ||
                              docName.includes('rent_roll') ||
                              docName.includes('unit list') ||
                              docName.includes('lease list');
            const isT12 = docName.includes('t-12') ||
                         docName.includes('t12') ||
                         docName.includes('trailing') ||
                         docName.includes('operating statement');

            // Check if file is Excel or CSV (structured format that supports column mapping)
            const fileExt = files[0]?.name?.split('.').pop()?.toLowerCase() || '';
            const isStructuredFile = ['xlsx', 'xls', 'csv'].includes(fileExt);

            // For structured rent roll files, use conversational column mapping via Landscaper chat
            if (isRentRoll && isStructuredFile) {
              const chatMsg = `I've uploaded "${files[0].name}" (document ID: ${docId}). Please analyze the columns for rent roll mapping.`;
              chatRef.current?.sendMessage(chatMsg);
              setDropNotice(null);
              setIsUploading(false);
              setUploadProgress(0);
              setUploadMessage('');
              return;
            }

            // Select extraction approach based on document type
            let extractResponse: Response;

            if (isRentRoll) {
              // Use dedicated chunked rent roll extraction endpoint for PDF rent rolls
              // This handles large rent rolls (100+ units) by processing in chunks
              extractResponse = await fetch(`${backendUrl}/api/knowledge/documents/${docId}/extract-rent-roll/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  project_id: projectId,
                  property_type: 'multifamily',
                }),
              });
            } else {
              // Use batched extraction for other document types
              let batches: string[];
              if (isT12) {
                // T-12s focus on operating expenses and income
                batches = ['core_property', 'financials'];
              } else {
                // Default for OMs and other documents
                batches = ['core_property', 'financials', 'deal_market'];
              }

              extractResponse = await fetch(`${backendUrl}/api/knowledge/documents/${docId}/extract-batched/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  project_id: projectId,
                  property_type: 'multifamily',
                  batches,
                }),
              });
            }

            if (extractResponse.ok) {
              const extractData = await extractResponse.json();
              console.log('Python extraction result:', extractData);

              // Get pending extractions to show in modal
              const pendingResponse = await fetch(`${backendUrl}/api/knowledge/projects/${projectId}/extractions/pending/`);
              const pendingData = pendingResponse.ok ? await pendingResponse.json() : { extractions: [], summary: null };

              if (extractData.success && (extractData.total_staged > 0 || pendingData.extractions?.length > 0)) {
                if (isRentRoll) {
                  try {
                    const compareResponse = await fetch(
                      `${backendUrl}/api/knowledge/projects/${projectId}/rent-roll/compare/`,
                      {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ document_id: docId }),
                      }
                    );

                    if (compareResponse.ok) {
                      const comparison = await compareResponse.json();
                      if (comparison?.deltas?.length > 0) {
                        const extractionIds = new Set(
                          comparison.deltas.map((delta: { extraction_id: number }) => delta.extraction_id)
                        );
                        const extractedUnits: RentRollExtractionMap = {};
                        (pendingData.extractions || []).forEach((ext: {
                          extraction_id?: number;
                          extracted_value?: unknown;
                        }) => {
                          if (!ext.extraction_id || !extractionIds.has(ext.extraction_id)) return;
                          let extractedValue = ext.extracted_value;
                          if (typeof extractedValue === 'string') {
                            try {
                              extractedValue = JSON.parse(extractedValue);
                            } catch {
                              return;
                            }
                          }
                          if (extractedValue && typeof extractedValue === 'object') {
                            extractedUnits[ext.extraction_id] = extractedValue as Record<string, unknown>;
                          }
                        });

                        setRentRollComparison(comparison);
                        setRentRollExtractedUnits(extractedUnits);
                        setShowRentRollReviewModal(true);
                        setShowExtractionModal(false);
                        setExtractionResult(null);
                        setPendingFile(null);
                        setDropNotice(null);
                        return;
                      }

                      setDropNotice(`Uploaded ${createdDocs.length} document(s). No rent roll changes found to review.`);
                      return;
                    }

                    const compareErrorText = await compareResponse.text();
                    console.error('Rent roll comparison failed:', compareResponse.status, compareErrorText);
                  } catch (compareError) {
                    console.error('Rent roll comparison failed:', compareError);
                  }
                }

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

  // Process files dropped anywhere in the project layout (via FileDropContext)
  useEffect(() => {
    if (pendingFiles.length > 0 && !isUploading && !uploadThingIsUploading) {
      const files = consumeFiles();
      if (files.length > 0) {
        uploadFiles(files);
      }
    }
  }, [pendingFiles, consumeFiles, uploadFiles, isUploading, uploadThingIsUploading]);

  // Restore state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('landscape-activity-expanded');
    const savedExpanded = localStorage.getItem('landscape-landscaper-split-expanded');
    const savedCollapsed = localStorage.getItem('landscape-landscaper-split-collapsed');
    const nextIsExpanded = saved === null ? true : saved === 'true';
    const parsedExpanded = Number.parseFloat(savedExpanded ?? '');
    const parsedCollapsed = Number.parseFloat(savedCollapsed ?? '');
    const nextExpandedRatio = Number.isFinite(parsedExpanded) && parsedExpanded > 0 && parsedExpanded < 1
      ? parsedExpanded
      : 0.25;
    const nextCollapsedRatio = Number.isFinite(parsedCollapsed) && parsedCollapsed > 0 && parsedCollapsed < 1
      ? parsedCollapsed
      : 0.75;

    setActivityExpanded(nextIsExpanded);
    setExpandedSplitRatio(nextExpandedRatio);
    setCollapsedSplitRatio(nextCollapsedRatio);
    setSplitRatio(nextIsExpanded ? nextExpandedRatio : nextCollapsedRatio);
  }, []);

  useEffect(() => {
    splitRatioRef.current = splitRatio;
  }, [splitRatio]);

  useEffect(() => {
    expandedSplitRef.current = expandedSplitRatio;
  }, [expandedSplitRatio]);

  useEffect(() => {
    collapsedSplitRef.current = collapsedSplitRatio;
  }, [collapsedSplitRatio]);

  const handleActivityToggle = () => {
    const newValue = !isActivityExpanded;
    setActivityExpanded(newValue);
    localStorage.setItem('landscape-activity-expanded', String(newValue));
    setSplitRatio(newValue ? expandedSplitRatio : collapsedSplitRatio);
  };

  // Handle dropped files via react-dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0 && !isUploading && !uploadThingIsUploading) {
      uploadFiles(acceptedFiles);
    } else if (isUploading || uploadThingIsUploading) {
      setDropNotice('Upload in progress, please wait...');
    } else {
      setDropNotice('No files detected in drop.');
    }
  }, [uploadFiles, isUploading, uploadThingIsUploading]);

  // Open rent roll review modal
  const openRentRollReviewModal = useCallback(async () => {
    if (!pendingDocumentId || rentRollPendingCount === 0) return;

    try {
      const backendUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/knowledge/projects/${projectId}/rent-roll/compare/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: pendingDocumentId }),
      });

      if (!response.ok) {
        console.error('Failed to fetch rent roll comparison:', response.status);
        return;
      }

      const data = await response.json();

      // Build extraction map from deltas
      const extractedUnits: RentRollExtractionMap = {};
      if (data.deltas) {
        data.deltas.forEach((delta: { extraction_id: number; unit_number: string | number | null; changes: Array<{ field: string; extracted_value: unknown }> }) => {
          const unitData: Record<string, unknown> = { unit_number: delta.unit_number };
          delta.changes.forEach((change) => {
            unitData[change.field] = change.extracted_value;
          });
          extractedUnits[delta.extraction_id] = unitData;
        });
      }

      setRentRollComparison(data);
      setRentRollExtractedUnits(extractedUnits);
      setShowRentRollReviewModal(true);
    } catch (err) {
      console.error('Error fetching rent roll comparison:', err);
    }
  }, [projectId, pendingDocumentId, rentRollPendingCount]);

  // Handle field mapping completion
  const handleFieldMappingComplete = useCallback(
    async (result: { jobId: number; unitsExtracted: number }) => {
      setShowFieldMappingModal(false);
      setFieldMappingDocId(null);
      setFieldMappingDocName('');

      // Reset banner dismissed state so it shows for this new extraction
      setExtractionBannerDismissed(false);

      // Refresh pending extractions to pick up any staged data
      refreshPendingExtractions();

      // If there are pending changes, open the rent roll review modal
      if (result.unitsExtracted > 0 && pendingDocumentId) {
        setDropNotice(`Extraction complete! ${result.unitsExtracted} units ready for review.`);
        // The review banner will appear automatically via the pending extractions hook
      } else {
        setDropNotice(`Extraction complete. ${result.unitsExtracted} units processed.`);
      }
    },
    [refreshPendingExtractions, pendingDocumentId]
  );

  const handleRentRollCommitSuccess = useCallback(async (snapshotId?: number) => {
    setShowRentRollReviewModal(false);
    setRentRollComparison(null);
    setRentRollExtractedUnits({});
    setDropNotice('Rent roll data committed successfully.');
    refreshPendingExtractions();

    if (!snapshotId) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/landscaper/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_type: 'update',
          title: 'Rent Roll Updated',
          summary: `Rent roll updated from ${rentRollComparison?.document_name || 'document'}.`,
          status: 'complete',
          confidence: null,
          details: [
            'Rollback available',
            `snapshot_id:${snapshotId}`,
          ],
          source_type: 'rent_roll',
          source_id: String(snapshotId),
        }),
      });
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['landscaper-activities', projectId.toString()] });
      }
    } catch (activityError) {
      console.error('Failed to create activity item:', activityError);
    }
  }, [projectId, queryClient, rentRollComparison, refreshPendingExtractions]);

  // Media preview modal handler (triggered from Landscaper chat MediaSummaryCard)
  const handleReviewMedia = useCallback((docId: number, docName: string) => {
    setMediaPreviewDocId(docId);
    setMediaPreviewDocName(docName);
    setShowMediaPreview(true);
  }, []);

  // Use react-dropzone for more reliable drag and drop
  // Supports multiple files for OM packages (rent roll + T-12 + OM together)
  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
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
    },
    maxSize: 50 * 1024 * 1024, // 50MB per file
    multiple: true, // Allow multiple files (OM packages: rent roll + T-12 + OM)
    disabled: isUploading || uploadThingIsUploading,
    noClick: true, // Don't open file dialog on click - we want the whole panel as drop zone
    noKeyboard: true,
  });

  useEffect(() => {
    if (!dropNotice) return;
    const timer = setTimeout(() => setDropNotice(null), 8000);
    return () => clearTimeout(timer);
  }, [dropNotice]);

  useEffect(() => {
    const container = splitContainerRef.current;
    if (!container) return;

    const updateHeight = () => {
      setSplitContainerHeight(container.clientHeight);
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  const clampSplitRatio = useCallback((ratio: number, containerHeight: number) => {
    const availableHeight = Math.max(containerHeight - RESIZER_SIZE, 1);
    const minRatio = Math.min(0.9, MIN_CHAT_HEIGHT / availableHeight);
    const maxRatio = Math.max(0.1, 1 - MIN_ACTIVITY_HEIGHT / availableHeight);
    if (minRatio > maxRatio) {
      return 0.5;
    }
    return Math.min(Math.max(ratio, minRatio), maxRatio);
  }, []);

  const getRatioFromClientY = useCallback((clientY: number) => {
    const container = splitContainerRef.current;
    if (!container) return splitRatioRef.current;
    const rect = container.getBoundingClientRect();
    const availableHeight = Math.max(container.clientHeight - RESIZER_SIZE, 1);
    const offset = clientY - rect.top;
    return offset / availableHeight;
  }, []);

  const updateSplitRatio = useCallback((ratio: number) => {
    const clampedRatio = clampSplitRatio(ratio, splitContainerHeight);
    setSplitRatio(clampedRatio);
    if (isActivityExpanded) {
      setExpandedSplitRatio(clampedRatio);
    } else {
      setCollapsedSplitRatio(clampedRatio);
    }
  }, [clampSplitRatio, isActivityExpanded, splitContainerHeight]);

  const handleResizerPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    updateSplitRatio(getRatioFromClientY(event.clientY));
    setIsResizing(true);
  }, [getRatioFromClientY, updateSplitRatio]);

  useEffect(() => {
    if (!isResizing) return;

    const handlePointerMove = (event: PointerEvent) => {
      updateSplitRatio(getRatioFromClientY(event.clientY));
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      localStorage.setItem('landscape-landscaper-split-expanded', String(expandedSplitRef.current));
      localStorage.setItem('landscape-landscaper-split-collapsed', String(collapsedSplitRef.current));
    };

    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isResizing, updateSplitRatio]);

  useEffect(() => {
    if (!splitContainerHeight) return;
    const nextRatio = clampSplitRatio(splitRatioRef.current, splitContainerHeight);
    if (nextRatio !== splitRatioRef.current) {
      updateSplitRatio(nextRatio);
    }
  }, [clampSplitRatio, splitContainerHeight, updateSplitRatio]);

  const availableHeight = Math.max(splitContainerHeight - RESIZER_SIZE, 0);
  const chatHeight = Math.round(availableHeight * splitRatio);
  const activityHeight = Math.max(availableHeight - chatHeight, 0);
  const hasMeasuredHeight = splitContainerHeight > 0;

  return (
    <div
      {...getRootProps()}
      className="flex flex-col h-full gap-3 relative"
      style={{
        borderRadius: 'var(--cui-card-border-radius)',
        border: isDragActive ? '2px dashed var(--cui-primary)' : '1px dashed transparent',
        backgroundColor: isDragActive ? 'var(--cui-tertiary-bg)' : 'transparent',
        transition: 'border-color 0.15s ease, background-color 0.15s ease'
      }}
    >
      {/* Hidden file input for react-dropzone */}
      <input {...getInputProps()} />

      {isDragActive && (
        <div
          className="absolute inset-0 d-flex flex-column align-items-center justify-content-center text-center z-50"
          style={{
            borderRadius: 'var(--cui-card-border-radius)',
            backgroundColor: isDragAccept ? 'rgba(34, 197, 94, 0.1)' : isDragReject ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            color: 'var(--cui-body-color)',
            pointerEvents: 'none'
          }}
        >
          <div className="fw-semibold">
            {isDragReject ? 'File type not supported' : 'Drop documents for Landscaper'}
          </div>
          <div className="text-sm mt-1" style={{ color: 'var(--cui-secondary-color)' }}>
            {isDragReject
              ? 'Use PDF, Word, Excel, or image files'
              : 'Drop multiple files at once (OM + Rent Roll + T-12)'}
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
      <div
        ref={splitContainerRef}
        className="flex flex-col flex-1 min-h-0"
        style={{ cursor: isResizing ? 'row-resize' : 'default' }}
      >
        {/* Landscaper Chat Card */}
        <CCard
          className="flex flex-col min-h-0 shadow-lg overflow-hidden"
          style={{
            height: hasMeasuredHeight ? `${chatHeight}px` : undefined,
            flex: hasMeasuredHeight ? '0 0 auto' : '1 1 0',
          }}
        >
          <LandscaperChatThreaded
            ref={chatRef}
            projectId={projectId}
            pageContext={pageContext || activeTab}
            contextPillLabel={contextPillLabel}
            contextPillColor={contextPillColor}
            isIngesting={isUploading || uploadThingIsUploading}
            ingestionProgress={uploadProgress}
            ingestionMessage={uploadMessage}
            isExpanded={!isActivityExpanded}
            onToggleExpand={handleActivityToggle}
            onCollapsePanel={onToggleCollapse}
            onReviewMedia={handleReviewMedia}
          />
        </CCard>

        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize Landscaper panel"
          className="flex items-center justify-center"
          style={{
            height: `${RESIZER_SIZE}px`,
            cursor: 'row-resize',
            backgroundColor: 'transparent',
          }}
          onPointerDown={handleResizerPointerDown}
        >
          <div
            style={{
              width: '60px',
              height: '2px',
              borderRadius: '999px',
              backgroundColor: 'var(--cui-border-color)',
              opacity: 0.7,
            }}
          />
        </div>

        {/* Extraction Job Status Indicator */}
        {rentRollJob && (rentRollJob.status === 'processing' || rentRollJob.status === 'queued') && (
          <CAlert color="info" className="mb-2 d-flex align-items-center justify-content-between py-2">
            <div className="d-flex align-items-center gap-2">
              <CSpinner size="sm" />
              <span className="small">
                Processing {rentRollJob.document_name || 'rent roll'}...
                {rentRollJob.progress.total && rentRollJob.progress.total > 0 && (
                  <span className="text-body-secondary ms-1">
                    ({rentRollJob.progress.processed}/{rentRollJob.progress.total})
                  </span>
                )}
              </span>
            </div>
            <CButton
              color="link"
              size="sm"
              className="p-0 text-body-secondary"
              onClick={() => cancelExtractionJob(rentRollJob.id)}
              title="Cancel extraction"
            >
              <CIcon icon={cilX} size="sm" />
            </CButton>
          </CAlert>
        )}

        {rentRollJob?.status === 'failed' && (
          <CAlert color="danger" className="mb-2 py-2">
            <div className="d-flex align-items-center gap-2">
              <CIcon icon={cilWarning} size="sm" />
              <span className="small">
                Extraction failed: {rentRollJob.error_message || 'Unknown error'}
              </span>
            </div>
          </CAlert>
        )}

        {rentRollJob?.status === 'completed' && rentRollPendingCount > 0 && !extractionBannerDismissed && (
          <CAlert
            color="success"
            className="mb-2 d-flex align-items-center justify-content-between py-2"
            dismissible
            onClose={() => setExtractionBannerDismissed(true)}
          >
            <div className="d-flex align-items-center gap-2">
              <CIcon icon={cilCheckCircle} size="sm" />
              <span className="small">
                Extraction complete! {rentRollPendingCount} changes ready for review.
              </span>
            </div>
            <CButton
              color="primary"
              size="sm"
              onClick={openRentRollReviewModal}
              className="me-2"
            >
              Review Now
            </CButton>
          </CAlert>
        )}

        {/* Activity Feed Card */}
        <CCard
          className="shadow-lg overflow-hidden"
          style={{
            height: hasMeasuredHeight ? `${activityHeight}px` : undefined,
            flex: hasMeasuredHeight ? '0 0 auto' : '1 1 0',
          }}
        >
          <ActivityFeed
            projectId={projectId}
            isExpanded={isActivityExpanded}
            onToggle={handleActivityToggle}
          />
        </CCard>
      </div>

      {/* Extraction Review Modal */}
      {showRentRollReviewModal && rentRollComparison && (
        <RentRollUpdateReviewModal
          visible={showRentRollReviewModal}
          onClose={() => {
            setShowRentRollReviewModal(false);
            setRentRollComparison(null);
            setRentRollExtractedUnits({});
          }}
          projectId={projectId}
          comparisonData={rentRollComparison}
          extractedUnitsById={rentRollExtractedUnits}
          onCommitSuccess={handleRentRollCommitSuccess}
        />
      )}

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

      {/* Field Mapping Interface for structured rent rolls (Excel/CSV) */}
      {showFieldMappingModal && fieldMappingDocId && (
        <FieldMappingInterface
          projectId={projectId}
          documentId={fieldMappingDocId}
          documentName={fieldMappingDocName}
          visible={showFieldMappingModal}
          onClose={() => {
            setShowFieldMappingModal(false);
            setFieldMappingDocId(null);
            setFieldMappingDocName('');
          }}
          onComplete={handleFieldMappingComplete}
        />
      )}

      {/* Media Preview Modal — triggered from Landscaper chat MediaSummaryCard */}
      {showMediaPreview && mediaPreviewDocId && (
        <MediaPreviewModal
          isOpen={showMediaPreview}
          onClose={() => {
            setShowMediaPreview(false);
            setMediaPreviewDocId(null);
            setMediaPreviewDocName('');
          }}
          docId={mediaPreviewDocId}
          docName={mediaPreviewDocName}
          projectId={projectId}
          onComplete={() => {
            setShowMediaPreview(false);
            setMediaPreviewDocId(null);
            setMediaPreviewDocName('');
            setDropNotice('Media review completed. Actions applied successfully.');
          }}
        />
      )}
    </div>
  );
}
