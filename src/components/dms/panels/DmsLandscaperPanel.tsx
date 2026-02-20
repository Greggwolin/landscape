'use client';

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import CIcon from '@coreui/icons-react';
import { cilCloudUpload, cilSend } from '@coreui/icons';
import { useDropzone } from 'react-dropzone';
import { useLandscaper } from '@/hooks/useLandscaper';
import { processLandscaperResponse } from '@/utils/formatLandscaperResponse';
import { useUploadThing } from '@/lib/uploadthing';
import {
  useLandscaperCollision,
  buildCollisionMessage,
  type CollisionAction,
  type PendingCollision,
} from '@/contexts/LandscaperCollisionContext';

// ============================================
// INTENT DETECTION SYSTEM
// ============================================

type QueryIntent = 'document_filter' | 'ai_query' | 'ambiguous';

interface IntentResult {
 intent: QueryIntent;
 confidence: number;
 signals: string[];
}

/**
 * Simplified intent detection - routes to:
 * - document_filter: when user wants to find/filter project documents
 * - ai_query: when user wants AI to answer questions (benchmark or knowledge)
 *
 * The Django Landscaper API handles benchmark vs knowledge tool selection.
 */
function detectQueryIntent(query: string): IntentResult {
 const queryLower = query.toLowerCase();
 const signals: string[] = [];

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
 // AI QUERY SIGNALS (benchmark + knowledge combined)
 // ============================================

 // Question patterns seeking explanation/information
 const questionPatterns = [
 /^what'?s?\s/,
 /^what (does|do|is|are|did)/,
 /^how (does|do|should|can|to|much)/,
 /^why (does|do|is|are)/,
 /^explain/,
 /^describe/,
 /^tell me about/,
 /what.+say about/,
 /according to/,
 ];
 const hasQuestionPattern = questionPatterns.some(p => p.test(queryLower));
 if (hasQuestionPattern) signals.push('question_pattern');

 // Knowledge/benchmark terms
 const aiTerms = [
 'irem', 'appraisal', 'uspap', 'boma', 'naa',
 'cap rate', 'capitalization', 'dcf', 'discount rate',
 'expense ratio', 'noi', 'net operating income',
 'benchmark', 'industry standard', 'typical',
 'r&m', 'repairs and maintenance', 'operating expense',
 '$/sf', '$/unit', 'per unit', 'per sf'
 ];
 const hasAITerm = aiTerms.some(term => queryLower.includes(term));
 if (hasAITerm) signals.push('ai_term');

 // ============================================
 // SCORING
 // ============================================

 const filterSignals = ['document_type_reference', 'filter_action_verb', 'time_reference', 'project_reference'];
 const aiSignals = ['question_pattern', 'ai_term'];

 const filterScore = signals.filter(s => filterSignals.includes(s)).length;
 const aiScore = signals.filter(s => aiSignals.includes(s)).length;

 // Determine intent
 let intent: QueryIntent;
 let confidence: number;

 // Pure document filter (no AI signals)
 if (filterScore > 0 && aiScore === 0) {
 intent = 'document_filter';
 confidence = Math.min(0.9, 0.5 + (filterScore * 0.15));
 }
 // Pure AI query (no filter signals)
 else if (aiScore > 0 && filterScore === 0) {
 intent = 'ai_query';
 confidence = Math.min(0.9, 0.5 + (aiScore * 0.2));
 }
 // Filter signals dominate
 else if (filterScore > aiScore) {
 intent = 'document_filter';
 confidence = 0.6 + ((filterScore - aiScore) * 0.1);
 }
 // AI signals dominate or tie
 else if (aiScore >= filterScore && aiScore > 0) {
 intent = 'ai_query';
 confidence = 0.6 + ((aiScore - filterScore) * 0.1);
 }
 // No signals at all
 else {
 intent = 'ambiguous';
 confidence = 0.3;
 }

 return { intent, confidence, signals };
}

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

async function computeFileHash(file: File): Promise<string> {
 const arrayBuffer = await file.arrayBuffer();
 const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
 const hashArray = Array.from(new Uint8Array(hashBuffer));
 return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface DmsLandscaperMessage {
 role: 'user' | 'assistant';
 content: string;
}

export interface DmsPendingVersionLink {
  projectId: number;
  sourceDocId: string;
  sourceDocName: string;
  targetDocId: string;
  targetDocName: string;
}

interface DmsLandscaperPanelProps {
 onDropFiles: (files: File[]) => void;
 onQuerySubmit: (query: string) => Promise<{ count: number; limit?: number | null }>;
 onClearQuery: () => void;
 activeDocType?: string | null;
 isFiltering?: boolean;
 notice?: string | null;
 pendingLink?: DmsPendingVersionLink | null;
 onResolveLink?: (action: 'confirm' | 'cancel', link: DmsPendingVersionLink) => Promise<void>;
 onDocumentsUpdated?: () => void;
}

export default function DmsLandscaperPanel({
 onDropFiles,
 onQuerySubmit,
 onClearQuery,
 activeDocType,
 isFiltering = false,
 notice,
 pendingLink,
 onResolveLink,
 onDocumentsUpdated,
}: DmsLandscaperPanelProps) {
 const [input, setInput] = useState('');
 const [localMessages, setLocalMessages] = useState<DmsLandscaperMessage[]>([
 {
 role: 'assistant',
 content: 'Ask me about documents across all projects, IREM benchmarks, or real estate concepts.'
 }
 ]);
 const [isHandlingCollision, setIsHandlingCollision] = useState(false);
 const [isHandlingLink, setIsHandlingLink] = useState(false);
 const lastCollisionIdRef = useRef<string | null>(null);
 const lastLinkKeyRef = useRef<string | null>(null);

 const {
  pendingCollision,
  resolveCollision,
  setOnCollisionResolved,
 } = useLandscaperCollision();

 // Use unified Landscaper API for AI queries (projectId: null for global context)
 const {
 messages: aiMessages,
 isLoading: aiLoading,
 sendMessage: sendAiMessage,
 } = useLandscaper({
 projectId: null,
 activeTab: 'dms',
 });

 const uploadHeaders = useMemo(() => {
  if (!pendingCollision) {
   return {
    'x-project-id': '0',
    'x-workspace-id': '1',
    'x-doc-type': 'general',
   };
  }
  return {
   'x-project-id': pendingCollision.projectId.toString(),
   'x-workspace-id': (pendingCollision.workspaceId ?? 1).toString(),
   'x-doc-type': pendingCollision.docType || 'general',
   ...(pendingCollision.discipline && { 'x-discipline': pendingCollision.discipline }),
   ...(pendingCollision.phaseId && { 'x-phase-id': pendingCollision.phaseId.toString() }),
   ...(pendingCollision.parcelId && { 'x-parcel-id': pendingCollision.parcelId.toString() }),
  };
 }, [pendingCollision]);

 const { startUpload } = useUploadThing('documentUploader', {
  headers: uploadHeaders,
  onUploadError: (error) => {
   console.error('[DMS_LANDSCAPER] Upload error:', error);
  },
 });

 // Combine local messages (document filter results) with AI messages
 const messages = useMemo(() => {
 const combined: DmsLandscaperMessage[] = [...localMessages];
 // Add AI messages after the initial greeting
 for (const msg of aiMessages) {
 combined.push({
 role: msg.role,
 content: msg.role === 'assistant' ? processLandscaperResponse(msg.content) : msg.content,
 });
 }
 return combined;
 }, [localMessages, aiMessages]);

 const isSending = aiLoading;

 const appendMessage = useCallback((message: DmsLandscaperMessage) => {
  setLocalMessages((prev) => [...prev, message]);
 }, []);

 useEffect(() => {
  if (!pendingCollision || pendingCollision.id === lastCollisionIdRef.current) return;
  lastCollisionIdRef.current = pendingCollision.id;
  appendMessage({
   role: 'assistant',
   content: buildCollisionMessage(
    pendingCollision.file,
    pendingCollision.matchType,
    pendingCollision.existingDoc
   ),
  });
 }, [pendingCollision, appendMessage]);

 useEffect(() => {
  if (!pendingCollision) {
   lastCollisionIdRef.current = null;
  }
 }, [pendingCollision]);

 useEffect(() => {
  if (!pendingLink) return;
  const linkKey = `${pendingLink.sourceDocId}-${pendingLink.targetDocId}`;
  if (lastLinkKeyRef.current === linkKey) return;
  lastLinkKeyRef.current = linkKey;
  appendMessage({
   role: 'assistant',
   content: `Link "${pendingLink.sourceDocName}" as a new version of "${pendingLink.targetDocName}"?`,
  });
 }, [pendingLink, appendMessage]);

 useEffect(() => {
  if (!pendingLink) {
   lastLinkKeyRef.current = null;
  }
 }, [pendingLink]);

 useEffect(() => {
  const handleCollisionResponse = async (action: CollisionAction, collision: PendingCollision) => {
   const { file, existingDoc, projectId: collisionProjectId } = collision;
   setIsHandlingCollision(true);
   try {
    if (action === 'version') {
     const formData = new FormData();
     formData.append('file', file);

     const response = await fetch(
      `/api/projects/${collisionProjectId}/dms/docs/${existingDoc.doc_id}/version`,
      {
       method: 'POST',
       body: formData,
      }
     );

     if (!response.ok) {
      throw new Error('Failed to upload new version');
     }

     const result = await response.json();
     appendMessage({
      role: 'assistant',
      content: `Done. I've uploaded "${file.name}" as V${result.version_no || result.new_version || 'new'} of "${existingDoc.filename}".`,
     });
     onDocumentsUpdated?.();
    } else if (action === 'skip') {
     const results = await startUpload([file]) as UploadThingResult[] | undefined;
     if (!results || results.length === 0) {
      throw new Error('Upload failed - no results');
     }

     const result = results[0];
     const serverData = result.serverData;
     const sha256 = serverData?.sha256 || collision.hash || await computeFileHash(file);

     const payload = {
      system: {
       project_id: serverData?.project_id ?? collision.projectId,
       workspace_id: serverData?.workspace_id ?? collision.workspaceId ?? 1,
       phase_id: serverData?.phase_id ?? collision.phaseId ?? null,
       parcel_id: serverData?.parcel_id ?? collision.parcelId ?? null,
       doc_name: serverData?.doc_name ?? file.name,
       doc_type: serverData?.doc_type ?? collision.docType ?? 'general',
       discipline: serverData?.discipline ?? collision.discipline,
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

     const response = await fetch('/api/dms/docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
     });

     if (!response.ok) {
      throw new Error('Failed to create document record');
     }

     appendMessage({
      role: 'assistant',
      content: `Got it. I uploaded "${file.name}" as a separate document.`,
     });
     onDocumentsUpdated?.();
    }
   } catch (error) {
    console.error('[DMS_LANDSCAPER] Collision resolution error:', error);
    appendMessage({
     role: 'assistant',
     content: `There was an error processing the file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
   } finally {
    setIsHandlingCollision(false);
   }
  };

  setOnCollisionResolved(handleCollisionResponse);

  return () => {
   setOnCollisionResolved(null);
  };
 }, [appendMessage, onDocumentsUpdated, setOnCollisionResolved, startUpload]);

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

 const handleSend = useCallback(async () => {
 const query = input.trim();
 if (!query || isSending || isHandlingCollision || isHandlingLink) return;

 setInput('');

 // -----------------------------------------
 // Collision resolution (yes/no)
 // -----------------------------------------
 if (pendingCollision) {
  const normalized = query.toLowerCase();
  const isYes = /^(y|yes|yeah|yep|sure|ok|okay|upload|version)/.test(normalized);
  const isNo = /^(n|no|nope|nah|separate|skip)/.test(normalized);

  appendMessage({ role: 'user', content: query });

  if (isYes) {
   resolveCollision('version');
   return;
  }
  if (isNo) {
   resolveCollision('skip');
   return;
  }

  appendMessage({
   role: 'assistant',
   content: 'Please reply "yes" to upload as a new version, or "no" to upload as a separate document.',
  });
  return;
 }

 // -----------------------------------------
 // Link-version confirmation (yes/no)
 // -----------------------------------------
 if (pendingLink) {
  const normalized = query.toLowerCase();
  const isYes = /^(y|yes|yeah|yep|sure|ok|okay|link|confirm)/.test(normalized);
  const isNo = /^(n|no|nope|nah|cancel|stop)/.test(normalized);

  appendMessage({ role: 'user', content: query });

  if (isYes) {
   setIsHandlingLink(true);
   try {
    await onResolveLink?.('confirm', pendingLink);
    appendMessage({
     role: 'assistant',
     content: `Linked "${pendingLink.sourceDocName}" as a new version of "${pendingLink.targetDocName}".`,
    });
    onDocumentsUpdated?.();
   } catch (error) {
    console.error('[DMS_LANDSCAPER] Link version error:', error);
    appendMessage({
     role: 'assistant',
     content: 'There was an error linking those documents. Please try again.',
    });
   } finally {
    setIsHandlingLink(false);
   }
   return;
  }

  if (isNo) {
   setIsHandlingLink(true);
   try {
    await onResolveLink?.('cancel', pendingLink);
    appendMessage({
     role: 'assistant',
     content: 'Okay, I will not link those documents.',
    });
   } finally {
    setIsHandlingLink(false);
   }
   return;
  }

  appendMessage({
   role: 'assistant',
   content: 'Please reply "yes" to link as a new version, or "no" to cancel.',
  });
  return;
 }

 // ============================================
 // INTENT DETECTION
 // ============================================
 const { intent, confidence, signals } = detectQueryIntent(query);

 console.log(`[DMS_LANDSCAPER] Intent: ${intent} (${confidence.toFixed(2)})`);
 console.log(`[DMS_LANDSCAPER] Signals: ${signals.join(', ')}`);

 // ============================================
 // ROUTE BY INTENT
 // ============================================

 if (intent === 'ai_query') {
 // -----------------------------------------
 // PATH A: AI Query via unified Landscaper API
 // The Django backend will use search_irem_benchmarks
 // or query_platform_knowledge tools as appropriate
 // -----------------------------------------
 try {
 await sendAiMessage(query);
 } catch (error) {
 console.error('[DMS_LANDSCAPER] AI query error:', error);
 setLocalMessages((prev) => [
 ...prev,
 { role: 'user', content: query },
 {
 role: 'assistant',
 content: 'I ran into an issue while processing your request. Please try again.'
 }
 ]);
 }

 } else if (intent === 'document_filter') {
 // -----------------------------------------
 // PATH B: Document Filter (existing behavior)
 // -----------------------------------------
 setLocalMessages((prev) => [...prev, { role: 'user', content: query }]);

 try {
 const result = await onQuerySubmit(query);
 const countLabel = result.count === 1 ? 'document' : 'documents';
 const limitNote = result.limit ? ` (showing ${result.limit})` : '';
 setLocalMessages((prev) => [
 ...prev,
 {
 role: 'assistant',
 content: `I found ${result.count} ${countLabel}${limitNote}.${result.count > 0 ? ' Want me to open one?' : ''}`
 }
 ]);
 } catch (error) {
 console.error('[DMS_LANDSCAPER] Document filter error:', error);
 setLocalMessages((prev) => [
 ...prev,
 {
 role: 'assistant',
 content: 'I ran into an issue filtering documents. Please try again.'
 }
 ]);
 }

 } else {
 // -----------------------------------------
 // PATH C: Ambiguous - Ask for clarification
 // -----------------------------------------
 setLocalMessages((prev) => [
 ...prev,
 { role: 'user', content: query },
 {
 role: 'assistant',
 content: `I'm not sure if you want me to:\n\n` +
 `- Search documents - Find files in your projects\n` +
 `- Answer a question - Use platform knowledge (IREM, benchmarks, etc.)\n\n` +
 `Could you clarify? For example:\n` +
 `-"Show me rent rolls from Peoria Lakes"\n` +
 `-"What does IREM say about expense ratios?"`
 }
 ]);
 }
 }, [
  input,
  isSending,
  isHandlingCollision,
  isHandlingLink,
  pendingCollision,
  pendingLink,
  resolveCollision,
  appendMessage,
  onResolveLink,
  onDocumentsUpdated,
  sendAiMessage,
  onQuerySubmit,
 ]);

 return (
 <div
 {...getRootProps()}
 className="relative border border-dashed border bg-body p-3"
 style={{ borderRadius: 'var(--cui-card-border-radius)' }}
 >
 <input {...getInputProps()} />
 {isDragActive && (
 <div
 className="absolute inset-0 flex flex-col items-center justify-center text-center z-10"
 style={{
 borderRadius: 'var(--cui-card-border-radius)',
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
 <div className="text-xs text-body-tertiary mt-1">
 PDF, Word, Excel, or image files
 </div>
 </div>
 )}

 <div className="flex items-center justify-between border-b border pb-2">
 <div>
 <div className="text-xs uppercase tracking-[0.2em] text-body-tertiary">Landscaper</div>
 <div className="text-xs text-body-tertiary">Context: {contextLabel}</div>
 </div>
 {isFiltering && (
 <div className="text-xs text-blue-600">Filtering…</div>
 )}
 </div>

 {notice && (
 <div className="mt-2 rounded-md border border bg-body-tertiary px-3 py-2 text-xs text-body-secondary">
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
 : 'bg-body-secondary text-body-secondary '
 }`}
 style={{ whiteSpace: 'pre-wrap' }}
 >
 {msg.content}
 </div>
 ))}
 </div>

 {pendingCollision && (
 <div className="mt-3 flex flex-wrap gap-2">
 <button
 type="button"
 disabled={isHandlingCollision}
 onClick={() => {
 appendMessage({ role: 'user', content: 'Yes' });
 resolveCollision('version');
 }}
 className="px-3 py-1 rounded-md text-xs text-white"
 style={{ backgroundColor: 'var(--cui-primary)' }}
 >
 Upload as New Version
 </button>
 <button
 type="button"
 disabled={isHandlingCollision}
 onClick={() => {
 appendMessage({ role: 'user', content: 'No' });
 resolveCollision('skip');
 }}
 className="px-3 py-1 rounded-md text-xs border"
 style={{ borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
 >
 Upload Separately
 </button>
 </div>
 )}

 {pendingLink && (
 <div className="mt-3 flex flex-wrap gap-2">
 <button
 type="button"
 disabled={isHandlingLink}
 onClick={async () => {
 setIsHandlingLink(true);
 try {
 await onResolveLink?.('confirm', pendingLink);
 appendMessage({
 role: 'assistant',
 content: `Linked "${pendingLink.sourceDocName}" as a new version of "${pendingLink.targetDocName}".`,
 });
 onDocumentsUpdated?.();
 } catch (error) {
 console.error('[DMS_LANDSCAPER] Link version error:', error);
 appendMessage({
 role: 'assistant',
 content: 'There was an error linking those documents. Please try again.',
 });
 } finally {
 setIsHandlingLink(false);
 }
 }}
 className="px-3 py-1 rounded-md text-xs text-white"
 style={{ backgroundColor: 'var(--cui-primary)' }}
 >
 Link as Version
 </button>
 <button
 type="button"
 disabled={isHandlingLink}
 onClick={async () => {
 setIsHandlingLink(true);
 try {
 await onResolveLink?.('cancel', pendingLink);
 appendMessage({ role: 'assistant', content: 'Okay, I will not link those documents.' });
 } finally {
 setIsHandlingLink(false);
 }
 }}
 className="px-3 py-1 rounded-md text-xs border"
 style={{ borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
 >
 Cancel
 </button>
 </div>
 )}

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
 disabled={isHandlingCollision || isHandlingLink}
 className="h-9 flex-1 rounded-md border border bg-body px-3 text-xs text-body"
 />
 <button
 type="button"
 onClick={() => void handleSend()}
 disabled={isSending || isHandlingCollision || isHandlingLink || !input.trim()}
 className="h-9 w-9 rounded-md bg-blue-600 text-white text-xs disabled:opacity-60"
 >
 <CIcon icon={cilSend} className="w-3 h-3" />
 </button>
 </div>

 <div className="mt-2 flex items-center justify-between text-[11px] text-body-tertiary">
 <span>Drop files here to upload</span>
 <button
 type="button"
 onClick={onClearQuery}
 className="text-blue-600"
 >
 Clear filter
 </button>
 </div>
 </div>
 );
}
