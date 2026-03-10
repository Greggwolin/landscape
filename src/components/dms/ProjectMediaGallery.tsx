'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
 CCard,
 CCardHeader,
 CCardBody,
 CBadge,
 CSpinner,
 CDropdown,
 CDropdownToggle,
 CDropdownMenu,
 CDropdownItem,
 CModal,
 CModalHeader,
 CModalTitle,
 CModalBody,
 CModalFooter,
} from '@coreui/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { resolveMediaUrl } from '@/lib/utils/mediaUtils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface MediaItem {
 media_id: number;
 doc_id: number;
 source_page: number;
 width_px: number;
 height_px: number;
 storage_uri: string;
 thumbnail_uri?: string;
 status?: string;
 suggested_action?: string;
 user_action?: string;
 ai_confidence?: number;
 ai_description?: string | null;
 classification: {
 code: string;
 name: string;
 badge_color: string;
 classification_id?: number;
 } | null;
 source_doc_name?: string;
}

interface Classification {
 classification_id: number;
 code: string;
 name: string;
 badge_color: string;
}

interface DocMediaResponse {
 doc_id: number;
 doc_name: string;
 media_scan_status: string;
 summary: {
 total: number;
 by_action: Record<string, number>;
 by_color: Record<string, unknown>;
 };
 items: MediaItem[];
}

interface DocListItem {
 doc_id: number | string;
 file_name?: string;
 doc_name?: string;
 storage_uri?: string | null;
 mime_type?: string;
 media_scan_status?: string | null;
 media_scan_json?: {
 total_detected?: number | string;
 total_extracted?: number | string;
 } | null;
}

interface ProcessingDocProgress {
 doc_id: string;
 doc_name: string;
 status: string;
 detected: number;
 extracted: number;
}

interface ProjectMediaGalleryProps {
 projectId: number;
 projectName?: string;
}

// EditorPanelLayout removed — replaced by CModal-based tag editor

// ─────────────────────────────────────────────────────────────────────────────
// Filter categories
// ─────────────────────────────────────────────────────────────────────────────

type FilterKey = 'all' | 'photos' | 'plans' | 'maps' | 'charts' | 'renders' | 'other';

const FILTER_MAP: Record<FilterKey, string[]> = {
 all: [],
 photos: ['property_photo', 'aerial_photo', 'before_after'],
 plans: ['site_plan', 'floor_plan'],
 maps: ['aerial_map', 'zoning_map', 'location_map', 'planning_map'],
 charts: ['chart', 'infographic'],
 renders: ['rendering'],
 other: ['logo', 'other'],
};

const FILTER_LABELS: { key: FilterKey; label: string }[] = [
 { key: 'all', label: 'All' },
 { key: 'photos', label: 'Photos' },
 { key: 'plans', label: 'Plans' },
 { key: 'maps', label: 'Maps' },
 { key: 'charts', label: 'Charts' },
 { key: 'renders', label: 'Renders' },
 { key: 'other', label: 'Other' },
];

// ─────────────────────────────────────────────────────────────────────────────
// All 14 classification types (from lu_media_classification)
// ─────────────────────────────────────────────────────────────────────────────

const ALL_CLASSIFICATIONS: Classification[] = [
 { classification_id: 1, code: 'property_photo', name: 'Property Photo', badge_color: 'success' },
 { classification_id: 2, code: 'aerial_photo', name: 'Aerial Photo', badge_color: 'info' },
 { classification_id: 3, code: 'site_plan', name: 'Site Plan', badge_color: 'primary' },
 { classification_id: 4, code: 'floor_plan', name: 'Floor Plan', badge_color: 'primary' },
 { classification_id: 5, code: 'rendering', name: 'Rendering', badge_color: 'warning' },
 { classification_id: 6, code: 'aerial_map', name: 'Aerial Map', badge_color: 'info' },
 { classification_id: 7, code: 'zoning_map', name: 'Zoning Map', badge_color: 'dark' },
 { classification_id: 8, code: 'location_map', name: 'Location Map', badge_color: 'secondary' },
 { classification_id: 9, code: 'planning_map', name: 'Planning Map', badge_color: 'dark' },
 { classification_id: 10, code: 'chart', name: 'Chart / Graph', badge_color: 'warning' },
 { classification_id: 11, code: 'infographic', name: 'Infographic', badge_color: 'warning' },
 { classification_id: 12, code: 'before_after', name: 'Before / After', badge_color: 'success' },
 { classification_id: 13, code: 'logo', name: 'Logo / Branding', badge_color: 'light' },
 { classification_id: 14, code: 'other', name: 'Other', badge_color: 'secondary' },
];

const TILE_MAX_WIDTH = 420;
const TILE_HEIGHT = 270;
const TERMINAL_MEDIA_STATUSES = new Set(['classified', 'complete']);
const ACTIVE_MEDIA_STATUSES = new Set([
 'scanning',
 'extracting',
 'classifying',
 'scanned',
]);

const normalizeScanStatus = (status: string | null | undefined): string =>
 (status || '').toLowerCase();

const isTerminalScanStatus = (status: string | null | undefined): boolean =>
 TERMINAL_MEDIA_STATUSES.has(normalizeScanStatus(status));

const isActiveScanStatus = (status: string | null | undefined): boolean =>
 ACTIVE_MEDIA_STATUSES.has(normalizeScanStatus(status));

const formatScanStatus = (status: string | null | undefined): string => {
 const normalized = normalizeScanStatus(status);
 if (!normalized) return 'Processing';
 return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ProjectMediaGallery({
 projectId,
}: ProjectMediaGalleryProps) {
 const djangoBaseUrl =
 process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
 const queryClient = useQueryClient();

 // ── State ──────────────────────────────────────────────────────────────
 const [mediaOpen, setMediaOpen] = useState(true);
 const [filter, setFilter] = useState<FilterKey>('all');
 const [scanning, setScanning] = useState(false);
 const [scanProgress, setScanProgress] = useState('');
 const [savingMediaId, setSavingMediaId] = useState<number | null>(null);

 // Tag-edit modal state
 const [editModalItem, setEditModalItem] = useState<MediaItem | null>(null);
 const [editModalTags, setEditModalTags] = useState<number[]>([]);
 const [editModalSaving, setEditModalSaving] = useState(false);

 // ── Data fetching ──────────────────────────────────────────────────────

 // Fetch project documents list + poll status while processing
 const { data: docsData = [] } = useQuery<DocListItem[]>({
 queryKey: ['project-docs-for-scan', projectId],
 queryFn: async () => {
 const res = await fetch(`/api/dms/docs?project_id=${projectId}&limit=200`);
 if (!res.ok) throw new Error('Failed to load documents');
 const payload = await res.json();
 if (Array.isArray(payload?.docs)) return payload.docs;
 if (Array.isArray(payload?.results)) return payload.results;
 return [];
 },
 enabled: !!projectId,
 refetchInterval: 5000,
 });

 // All PDFs in the project
 const allPDFs = useMemo(() => {
 if (!docsData) return [];
 return docsData.filter(
 (d) =>
 d.file_name?.toLowerCase().endsWith('.pdf') ||
 d.doc_name?.toLowerCase().endsWith('.pdf') ||
 d.mime_type === 'application/pdf'
 );
 }, [docsData]);

 const totalPDFs = allPDFs.length;

 // PDFs with media states that can contribute visible gallery items
 const scannedDocIds = useMemo(() => {
 return allPDFs
 .filter(
 (d) =>
 isActiveScanStatus(d.media_scan_status) ||
 isTerminalScanStatus(d.media_scan_status)
 )
 .map((d) => d.doc_id);
 }, [allPDFs]);

 // PDFs not yet processed (for "Scan New")
 const unscannedPDFs = useMemo(() => {
 return allPDFs.filter(
 (d) => {
 const status = normalizeScanStatus(d.media_scan_status);
 return !status || status === 'unscanned' || status === 'pending' || status === 'error';
 }
 );
 }, [allPDFs]);

 const processingDocs = useMemo(
 () => allPDFs.filter((d) => isActiveScanStatus(d.media_scan_status)),
 [allPDFs]
 );
 const hasActiveProcessing = processingDocs.length > 0;
 const isPipelineBusy = scanning || hasActiveProcessing;

 const processingDocProgressKey = useMemo(
 () => processingDocs.map((doc) => String(doc.doc_id)).join(','),
 [processingDocs]
 );

 const { data: processingDocProgress = {} } = useQuery<Record<string, ProcessingDocProgress>>({
 queryKey: ['project-processing-progress', projectId, processingDocProgressKey],
 queryFn: async () => {
 const entries = await Promise.all(
 processingDocs.map(async (doc) => {
 const docId = String(doc.doc_id);
 const fallbackDetected = Number(doc.media_scan_json?.total_detected ?? 0) || 0;
 const fallbackExtracted = Number(doc.media_scan_json?.total_extracted ?? 0) || 0;
 try {
 const res = await fetch(`${djangoBaseUrl}/api/dms/documents/${docId}/media/`);
 if (!res.ok) {
 return [
 docId,
 {
 doc_id: docId,
 doc_name: doc.doc_name || doc.file_name || `Document ${docId}`,
 status: normalizeScanStatus(doc.media_scan_status),
 detected: fallbackDetected,
 extracted: fallbackExtracted,
 },
 ] as const;
 }
 const data: DocMediaResponse = await res.json();
 const items = data.items || [];
 const extracted = items.filter(
 (item) => item.status !== 'pending' && !!item.storage_uri
 ).length;
 const detected = items.length;
 return [
 docId,
 {
 doc_id: docId,
 doc_name: doc.doc_name || doc.file_name || data.doc_name || `Document ${docId}`,
 status: normalizeScanStatus(data.media_scan_status || doc.media_scan_status),
 detected: Math.max(detected, fallbackDetected),
 extracted: Math.max(extracted, fallbackExtracted),
 },
 ] as const;
 } catch {
 return [
 docId,
 {
 doc_id: docId,
 doc_name: doc.doc_name || doc.file_name || `Document ${docId}`,
 status: normalizeScanStatus(doc.media_scan_status),
 detected: fallbackDetected,
 extracted: fallbackExtracted,
 },
 ] as const;
 }
 })
 );
 return Object.fromEntries(entries);
 },
 enabled: processingDocs.length > 0,
 refetchInterval: 5000,
 });

 // Fetch media items for all scanned documents
 const {
 data: allMediaItems,
 isLoading: mediaLoading,
 refetch: refetchMedia,
 } = useQuery<MediaItem[]>({
 queryKey: ['project-all-media', projectId, scannedDocIds.join(',')],
 queryFn: async () => {
 if (scannedDocIds.length === 0) return [];

 const results: MediaItem[] = [];
 for (const docId of scannedDocIds) {
 try {
 const res = await fetch(
 `${djangoBaseUrl}/api/dms/documents/${docId}/media/`
 );
 if (!res.ok) continue;
 const data: DocMediaResponse = await res.json();
 const extracted = (data.items || []).filter(
 (item) => item.storage_uri && item.status !== 'pending'
 );
 for (const item of extracted) {
 item.source_doc_name = item.source_doc_name || data.doc_name;
 }
 results.push(...extracted);
 } catch {
 // Skip docs that fail
 }
 }
 return results;
 },
 enabled: scannedDocIds.length > 0,
 refetchInterval: isPipelineBusy ? 5000 : false,
 });

 // Filter out discarded / rejected items
 const mediaItems = useMemo(() => {
 return (allMediaItems ?? []).filter(
 (item) => item.user_action !== 'ignore' && item.status !== 'rejected'
 );
 }, [allMediaItems]);

 // ── Filtering ──────────────────────────────────────────────────────────

 const filteredItems = useMemo(() => {
 if (filter === 'all') return mediaItems;
 const codes = FILTER_MAP[filter];
 return mediaItems.filter(
 (item) => item.classification && codes.includes(item.classification.code)
 );
 }, [mediaItems, filter]);

 // Count items per filter category
 const filterCounts = useMemo(() => {
 const counts: Record<FilterKey, number> = {
 all: mediaItems.length,
 photos: 0,
 plans: 0,
 maps: 0,
 charts: 0,
 renders: 0,
 other: 0,
 };
 for (const item of mediaItems) {
 const code = item.classification?.code;
 if (!code) {
 counts.other++;
 continue;
 }
 let matched = false;
 for (const [key, codes] of Object.entries(FILTER_MAP)) {
 if (key === 'all') continue;
 if (codes.includes(code)) {
 counts[key as FilterKey]++;
 matched = true;
 break;
 }
 }
 if (!matched) counts.other++;
 }
 return counts;
 }, [mediaItems]);

 const processingRows = useMemo(() => {
 return processingDocs.map((doc) => {
 const docId = String(doc.doc_id);
 const fallbackDetected = Number(doc.media_scan_json?.total_detected ?? 0) || 0;
 const fallbackExtracted = Number(doc.media_scan_json?.total_extracted ?? 0) || 0;
 const progress = processingDocProgress[docId];
 return {
 doc_id: docId,
 doc_name: doc.doc_name || doc.file_name || `Document ${docId}`,
 status: progress?.status || normalizeScanStatus(doc.media_scan_status),
 detected: progress?.detected ?? fallbackDetected,
 extracted: progress?.extracted ?? fallbackExtracted,
 };
 });
 }, [processingDocs, processingDocProgress]);

 const aggregateDetected = useMemo(
 () => processingRows.reduce((sum, row) => sum + row.detected, 0),
 [processingRows]
 );
 const aggregateExtracted = useMemo(
 () => processingRows.reduce((sum, row) => sum + Math.min(row.extracted, row.detected || row.extracted), 0),
 [processingRows]
 );
 const aggregateProgressPct = aggregateDetected > 0
 ? Math.max(0, Math.min(100, (aggregateExtracted / aggregateDetected) * 100))
 : null;
 const showProcessingIndicator = isPipelineBusy;

 const wasProcessingRef = useRef(false);
 useEffect(() => {
 if (hasActiveProcessing) {
 wasProcessingRef.current = true;
 return;
 }
 if (!wasProcessingRef.current) return;
 wasProcessingRef.current = false;
 queryClient.invalidateQueries({
 queryKey: ['project-docs-for-scan', projectId],
 });
 queryClient.invalidateQueries({
 queryKey: ['project-all-media', projectId],
 });
 refetchMedia();
 }, [hasActiveProcessing, projectId, queryClient, refetchMedia]);

 // ── Pipeline helper ──────────────────────────────────────────────────
 // Runs scan → extract → classify → auto-confirm for a list of docs

 const runPipelineForDocs = useCallback(
 async (docs: DocListItem[]) => {
 for (let i = 0; i < docs.length; i++) {
 const doc = docs[i];
 const name = doc.doc_name || doc.file_name || `Document ${doc.doc_id}`;

 try {
 // Step 1: Scan (detect images)
 setScanProgress(`Scanning ${i + 1} of ${docs.length}: ${name}`);
 await fetch(
 `${djangoBaseUrl}/api/dms/documents/${doc.doc_id}/media/scan/`,
 {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ mode: 'full' }),
 }
 );

 // Step 2: Extract (write images to disk)
 setScanProgress(`Extracting ${i + 1} of ${docs.length}: ${name}`);
 await fetch(
 `${djangoBaseUrl}/api/dms/documents/${doc.doc_id}/media/extract/`,
 {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ extract_all: true }),
 }
 );

 // Step 3: Classify
 setScanProgress(`Classifying ${i + 1} of ${docs.length}: ${name}`);
 const classifyController = new AbortController();
 const classifyTimeout = setTimeout(
 () => classifyController.abort(),
 5 * 60 * 1000
 );
 await fetch(
 `${djangoBaseUrl}/api/dms/documents/${doc.doc_id}/media/classify/`,
 {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ strategy: 'auto' }),
 signal: classifyController.signal,
 }
 );
 clearTimeout(classifyTimeout);

 // Step 4: Auto-confirm with suggested actions
 setScanProgress(`Saving ${i + 1} of ${docs.length}: ${name}`);
 const mediaListRes = await fetch(
 `${djangoBaseUrl}/api/dms/documents/${doc.doc_id}/media/`
 );
 if (mediaListRes.ok) {
 const mediaList: DocMediaResponse = await mediaListRes.json();
 const actions = (mediaList.items || []).map((item) => ({
 media_id: item.media_id,
 action: item.suggested_action || 'save_image',
 }));
 if (actions.length > 0) {
 await fetch(
 `${djangoBaseUrl}/api/dms/documents/${doc.doc_id}/media/actions/`,
 {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ actions }),
 }
 );
 }
 }
 } catch (err) {
 if (err instanceof DOMException && err.name === 'AbortError') {
 console.warn(`Classify timed out for doc ${doc.doc_id}, continuing...`);
 } else {
 console.error(`Media pipeline failed for doc ${doc.doc_id}:`, err);
 }
 }
 }
 },
 [djangoBaseUrl]
 );

 // ── Scan New action ──────────────────────────────────────────────────
 // Only scans PDFs that haven't been scanned yet

 const handleScanNew = useCallback(async () => {
 if (isPipelineBusy) return;
 if (unscannedPDFs.length === 0) return;
 setScanning(true);
 setScanProgress('Preparing scan...');

 try {
 await runPipelineForDocs(unscannedPDFs);

 queryClient.invalidateQueries({
 queryKey: ['project-docs-for-scan', projectId],
 });
 queryClient.invalidateQueries({
 queryKey: ['project-all-media', projectId],
 });
 await refetchMedia();
 } finally {
 setScanning(false);
 setScanProgress('');
 }
 }, [isPipelineBusy, unscannedPDFs, runPipelineForDocs, refetchMedia, queryClient, projectId]);

 // ── Rescan All action ────────────────────────────────────────────────
 // Resets all documents and re-runs full pipeline

 const handleRescanAll = useCallback(async (force = false) => {
 if (allPDFs.length === 0) return;

 if (hasActiveProcessing && !force) return;
 if (hasActiveProcessing && force) {
 const confirmed = window.confirm(
 'Extraction is still running. Rescanning will restart from scratch. Continue?'
 );
 if (!confirmed) return;
 }

 setScanning(true);
 setScanProgress('Resetting media...');

 try {
 // Step 0: Reset each previously-scanned doc (delete media records & files)
 for (const docId of scannedDocIds) {
 try {
 await fetch(
 `${djangoBaseUrl}/api/dms/documents/${docId}/media/reset/`,
 {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 }
 );
 } catch (err) {
 console.error(`Reset failed for doc ${docId}:`, err);
 }
 }

 // Now run full pipeline on all PDFs
 await runPipelineForDocs(allPDFs);

 queryClient.invalidateQueries({
 queryKey: ['project-docs-for-scan', projectId],
 });
 queryClient.invalidateQueries({
 queryKey: ['project-all-media', projectId],
 });
 await refetchMedia();
 } finally {
 setScanning(false);
 setScanProgress('');
 }
 }, [
 allPDFs,
 hasActiveProcessing,
 scannedDocIds,
 djangoBaseUrl,
 runPipelineForDocs,
 refetchMedia,
 queryClient,
 projectId,
 ]);

 // ── Single-item reclassify ───────────────────────────────────────────

 const handleSingleReclassify = useCallback(
 async (mediaId: number, classificationId: number, classInfo: Classification): Promise<boolean> => {
 try {
 const res = await fetch(
 `${djangoBaseUrl}/api/dms/media/${mediaId}/reclassify/`,
 {
 method: 'PATCH',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ classification_id: classificationId }),
 }
 );
 if (!res.ok) {
 console.error('Reclassify failed:', await res.text());
 return false;
 }

 // Optimistic update in query cache
 queryClient.setQueryData<MediaItem[]>(
 ['project-all-media', projectId, scannedDocIds.join(',')],
 (old) => {
 if (!old) return old;
 return old.map((item) =>
 item.media_id === mediaId
 ? {
 ...item,
 classification: {
 code: classInfo.code,
 name: classInfo.name,
 badge_color: classInfo.badge_color,
 classification_id: classInfo.classification_id,
 },
 }
 : item
 );
 }
 );
 return true;
 } catch (err) {
 console.error('Reclassify error:', err);
 return false;
 }
 },
 [djangoBaseUrl, queryClient, projectId, scannedDocIds]
 );

 // ── Discard ──────────────────────────────────────────────────────────

 const handleDiscard = useCallback(
 async (mediaId: number, reasonCode: string, customReason?: string): Promise<boolean> => {
 try {
 const res = await fetch(
 `${djangoBaseUrl}/api/dms/media/${mediaId}/discard/`,
 {
 method: 'PATCH',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 reason_code: reasonCode,
 reason_text: customReason,
 }),
 }
 );
 if (!res.ok) {
 console.error('Discard failed:', await res.text());
 return false;
 }

 // Optimistic: remove from cache
 queryClient.setQueryData<MediaItem[]>(
 ['project-all-media', projectId, scannedDocIds.join(',')],
 (old) => {
 if (!old) return old;
 return old.map((item) =>
 item.media_id === mediaId
 ? { ...item, user_action: 'ignore', status: 'rejected' }
 : item
 );
 }
 );
 return true;
 } catch (err) {
 console.error('Discard error:', err);
 return false;
 }
 },
 [djangoBaseUrl, queryClient, projectId, scannedDocIds]
 );

 const getClassificationIdForItem = useCallback((item: MediaItem): number | null => {
 if (item.classification?.classification_id) {
 return item.classification.classification_id;
 }
 return (
 ALL_CLASSIFICATIONS.find(
 (cls) => cls.code === item.classification?.code
 )?.classification_id ?? null
 );
 }, []);

 // ── Tag-edit modal helpers ──────────────────────────────────────────

 const openTagModal = useCallback(
 (item: MediaItem) => {
 const currentId = getClassificationIdForItem(item);
 setEditModalTags(currentId ? [currentId] : []);
 setEditModalItem(item);
 },
 [getClassificationIdForItem]
 );

 const closeTagModal = useCallback(() => {
 setEditModalItem(null);
 setEditModalTags([]);
 setEditModalSaving(false);
 }, []);

 const toggleModalTag = useCallback((classificationId: number) => {
 setEditModalTags((prev) =>
 prev.includes(classificationId)
 ? prev.filter((id) => id !== classificationId)
 : [...prev, classificationId]
 );
 }, []);

 const handleSaveModalTags = useCallback(async () => {
 if (!editModalItem || editModalTags.length === 0) return;
 setEditModalSaving(true);
 try {
 // Use the first selected tag as the primary classification
 const primaryTagId = editModalTags[0];
 const classInfo = ALL_CLASSIFICATIONS.find(
 (cls) => cls.classification_id === primaryTagId
 );
 if (!classInfo) return;
 const success = await handleSingleReclassify(
 editModalItem.media_id,
 primaryTagId,
 classInfo
 );
 if (success) closeTagModal();
 } finally {
 setEditModalSaving(false);
 }
 }, [editModalItem, editModalTags, handleSingleReclassify, closeTagModal]);

 // ── Quick delete (bypasses tagging) ────────────────────────────────

 const handleQuickDelete = useCallback(
 async (item: MediaItem) => {
 if (savingMediaId === item.media_id) return;
 setSavingMediaId(item.media_id);
 try {
 await handleDiscard(item.media_id, 'not_relevant');
 } finally {
 setSavingMediaId((prev) => (prev === item.media_id ? null : prev));
 }
 },
 [handleDiscard, savingMediaId]
 );

 // ── Render ─────────────────────────────────────────────────────────────

 const hasMedia = mediaItems.length > 0;
 const hasUnscannedPDFs = unscannedPDFs.length > 0;
 const hasAnyPDFs = allPDFs.length > 0;

 return (
 <CCard className="mb-3 shadow-sm">
 <CCardHeader
 onClick={() => setMediaOpen((prev) => !prev)}
 style={{ cursor: 'pointer', userSelect: 'none' }}
 className="d-flex align-items-center justify-content-between py-2"
 >
 <div className="d-flex align-items-center gap-2">
 <span
 style={{
 fontSize: '0.75rem',
 transition: 'transform 0.2s',
 transform: mediaOpen ? 'rotate(90deg)' : 'rotate(0deg)',
 }}
 >
 &#9654;
 </span>
 <strong>Project Media</strong>
 {hasMedia && (
 <span
 className="text-body-secondary"
 style={{ fontSize: '0.8rem' }}
 >
 {mediaItems.length} items
 </span>
 )}
 </div>
 <div
 className="d-flex gap-2"
 onClick={(e) => e.stopPropagation()}
 >
 {hasAnyPDFs && !isPipelineBusy && (
 <CDropdown variant="btn-group">
 <CDropdownToggle
 color="primary"
 size="sm"
 style={{ fontSize: '0.85rem' }}
 >
 {hasUnscannedPDFs
 ? `Scan New (${unscannedPDFs.length})`
 : 'Scan PDFs'}
 </CDropdownToggle>
 <CDropdownMenu>
 {hasUnscannedPDFs && (
 <CDropdownItem onClick={() => void handleScanNew()}>
 Scan New PDFs ({unscannedPDFs.length})
 </CDropdownItem>
 )}
 <CDropdownItem onClick={() => void handleRescanAll(false)}>
 Rescan All PDFs ({allPDFs.length})
 </CDropdownItem>
 </CDropdownMenu>
 </CDropdown>
 )}
 {hasAnyPDFs && isPipelineBusy && (
 <div className="d-flex align-items-center gap-2">
 <span
 className="d-flex align-items-center text-body-secondary"
 style={{ fontSize: '0.82rem' }}
 >
 <CSpinner size="sm" className="me-2" />
 Extraction in progress...
 </span>
 <button
 type="button"
 className="btn btn-outline-danger btn-sm"
 style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
 onClick={() => void handleRescanAll(true)}
 >
 Force Rescan
 </button>
 </div>
 )}
 </div>
 </CCardHeader>

 {mediaOpen && (
 <CCardBody className="p-3">
 {/* Loading state */}
 {mediaLoading && (
 <div
 className="d-flex align-items-center justify-content-center"
 style={{ minHeight: '120px' }}
 >
 <CSpinner size="sm" className="me-2" />
 <span
 className="text-body-secondary"
 style={{ fontSize: '0.85rem' }}
 >
 Loading media...
 </span>
 </div>
 )}

 {/* Processing progress */}
 {showProcessingIndicator && (
 <div
 className="mb-3 p-3 rounded border"
 style={{ borderColor: 'var(--cui-border-color)', backgroundColor: 'var(--cui-tertiary-bg)' }}
 >
 <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
 <div className="d-flex align-items-center">
 <CSpinner size="sm" className="me-2" />
 <span className="fw-semibold" style={{ fontSize: '0.88rem' }}>
 Media processing in progress
 </span>
 </div>
 <span className="text-body-secondary" style={{ fontSize: '0.8rem' }}>
 {aggregateDetected > 0
 ? `${aggregateExtracted} of ${aggregateDetected} extracted`
 : 'Preparing extraction...'}
 </span>
 </div>
 {scanProgress && (
 <div
 className="text-body-secondary mb-2"
 style={{ fontSize: '0.78rem' }}
 >
 {scanProgress}
 </div>
 )}
 <div
 className="progress mb-2"
 role="progressbar"
 aria-label="Media extraction progress"
 aria-valuemin={0}
 aria-valuemax={100}
 aria-valuenow={aggregateProgressPct ?? undefined}
 style={{ height: '8px' }}
 >
 <div
 className={`progress-bar ${aggregateProgressPct == null ? 'progress-bar-striped progress-bar-animated' : ''}`}
 style={{ width: `${aggregateProgressPct ?? 100}%` }}
 />
 </div>
 {processingRows.length > 0 ? (
 <div className="d-flex flex-column gap-1">
 {processingRows.map((row) => {
 const extracted = row.detected > 0
 ? Math.min(row.extracted, row.detected)
 : row.extracted;
 const progressText = row.detected > 0
 ? `(${extracted} of ${row.detected})`
 : '(processing...)';
 return (
 <div
 key={row.doc_id}
 className="d-flex align-items-center justify-content-between gap-2 text-body-secondary"
 style={{ fontSize: '0.76rem' }}
 >
 <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
 {row.doc_name}: {formatScanStatus(row.status)} {progressText}
 </span>
 </div>
 );
 })}
 </div>
 ) : (
 <div className="text-body-secondary" style={{ fontSize: '0.76rem' }}>
 Waiting for document status updates...
 </div>
 )}
 </div>
 )}

 {/* Empty state — no media, but scannable PDFs exist */}
 {!mediaLoading &&
 !isPipelineBusy &&
 !hasMedia &&
 hasUnscannedPDFs && (
 <div
 className="d-flex flex-column align-items-center justify-content-center text-center"
 style={{ minHeight: '160px' }}
 >
 <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
 {'\u{1F5BC}'}
 </div>
 <div
 className="fw-semibold mb-1"
 style={{ color: 'var(--cui-body-color)' }}
 >
 No media extracted yet
 </div>
 <div
 className="mb-3"
 style={{
 color: 'var(--cui-secondary-color)',
 fontSize: '0.85rem',
 maxWidth: '360px',
 }}
 >
 This project has {totalPDFs} PDF document
 {totalPDFs !== 1 ? 's' : ''} that may contain photos, maps,
 and plans.
 </div>
 <button
 onClick={() => void handleScanNew()}
 className="px-4 py-2 rounded text-white border-0"
 style={{
 backgroundColor: 'var(--cui-primary)',
 cursor: 'pointer',
 fontSize: '0.9rem',
 }}
 >
 Scan PDFs for Images
 </button>
 </div>
 )}

 {/* Empty state — no PDFs at all */}
 {!mediaLoading &&
 !hasMedia &&
 !hasAnyPDFs && (
 <div
 className="d-flex flex-column align-items-center justify-content-center text-center"
 style={{ minHeight: '120px' }}
 >
 <div
 style={{
 color: 'var(--cui-secondary-color)',
 fontSize: '0.85rem',
 maxWidth: '360px',
 }}
 >
 No PDF documents to scan. Upload documents with embedded
 images to build your project media library.
 </div>
 </div>
 )}

 {/* Empty state — pipeline active, media not yet available */}
 {!mediaLoading && !hasMedia && isPipelineBusy && (
 <div
 className="d-flex flex-column align-items-center justify-content-center text-center"
 style={{ minHeight: '120px' }}
 >
 <div
 style={{
 color: 'var(--cui-secondary-color)',
 fontSize: '0.85rem',
 maxWidth: '420px',
 }}
 >
 Extraction is running. Images will appear here automatically as each document finishes.
 </div>
 </div>
 )}

 {/* ── Gallery grid view ── */}
 {!mediaLoading && hasMedia && (
 <>
 {/* Filter bar */}
 <div
 className="d-flex flex-wrap gap-1 mb-3"
 style={{ borderBottom: '1px solid var(--cui-border-color)', paddingBottom: '0.5rem' }}
 >
 {FILTER_LABELS.map(({ key, label }) => {
 const count = filterCounts[key];
 if (key !== 'all' && count === 0) return null;
 const isActive = filter === key;
 return (
 <button
 key={key}
 onClick={() => setFilter(key)}
 className={`px-2 py-1 rounded border-0 ${
 isActive ? 'text-white' : ''
 }`}
 style={{
 fontSize: '0.8rem',
 cursor: 'pointer',
 backgroundColor: isActive
 ? 'var(--cui-primary)'
 : 'transparent',
 color: isActive
 ? '#fff'
 : 'var(--cui-secondary-color)',
 }}
 >
 {label}
 {key !== 'all' && (
 <span style={{ marginLeft: '0.25rem', opacity: 0.8 }}>
 ({count})
 </span>
 )}
 </button>
 );
 })}
 </div>

 {/* Thumbnail grid */}
 <div
 style={{
 display: 'grid',
 gridTemplateColumns:
 `repeat(auto-fill, minmax(min(100%, ${TILE_MAX_WIDTH}px), 1fr))`,
 gap: '1rem',
 }}
 >
 {filteredItems.map((item) => {
 const thumbSrc = resolveMediaUrl(item.storage_uri || item.thumbnail_uri);
 const isDeleting = savingMediaId === item.media_id;

 return (
 <div
 key={item.media_id}
 style={{
 cursor: 'default',
 borderRadius: '4px',
 overflow: 'hidden',
 border: '1px solid var(--cui-border-color)',
 backgroundColor: 'var(--cui-card-bg)',
 transition: 'box-shadow 0.15s',
 opacity: isDeleting ? 0.5 : 1,
 }}
 onMouseEnter={(e) => {
 (e.currentTarget as HTMLDivElement).style.boxShadow =
 '0 2px 8px rgba(0,0,0,0.15)';
 }}
 onMouseLeave={(e) => {
 (e.currentTarget as HTMLDivElement).style.boxShadow =
 'none';
 }}
 >
 {/* Thumbnail — click opens tag modal */}
 <div
 style={{
 width: '100%',
 height: `${TILE_HEIGHT}px`,
 overflow: 'hidden',
 backgroundColor: 'var(--cui-tertiary-bg)',
 cursor: 'pointer',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 }}
 onClick={() => openTagModal(item)}
 >
 {thumbSrc ? (
 <img
 src={thumbSrc}
 alt={item.classification?.name ?? 'Media'}
 loading="lazy"
 style={{
 width: '100%',
 height: '100%',
 objectFit: 'cover',
 }}
 />
 ) : (
 <span style={{ fontSize: '2rem', opacity: 0.4 }}>{'\u{1F5BC}'}</span>
 )}
 </div>

 {/* Info row + edit/delete buttons */}
 <div style={{ padding: '0.5rem 0.7rem 0.55rem' }}>
 <div className="d-flex align-items-start justify-content-between">
 <div style={{ minWidth: 0, flex: 1 }}>
 {item.classification && (
 <CBadge
 color={item.classification.badge_color || 'secondary'}
 style={{
 fontSize: '0.7rem',
 marginBottom: '0.2rem',
 }}
 >
 {item.classification.name}
 </CBadge>
 )}
 <div
 style={{
 fontSize: '0.75rem',
 color: 'var(--cui-secondary-color)',
 lineHeight: 1.3,
 }}
 >
 pg. {item.source_page}
 </div>
 {item.source_doc_name && (
 <div
 style={{
 fontSize: '0.7rem',
 color: 'var(--cui-secondary-color)',
 whiteSpace: 'nowrap',
 overflow: 'hidden',
 textOverflow: 'ellipsis',
 }}
 >
 {item.source_doc_name}
 </div>
 )}
 </div>

 {/* Edit / Delete buttons */}
 <div className="d-flex gap-1" style={{ flexShrink: 0, marginTop: '0.15rem' }}>
 <button
 type="button"
 title="Edit tags"
 onClick={(e) => {
 e.stopPropagation();
 openTagModal(item);
 }}
 style={{
 background: 'transparent',
 border: '1px solid var(--cui-border-color)',
 borderRadius: '4px',
 padding: '0.2rem 0.35rem',
 cursor: 'pointer',
 fontSize: '0.72rem',
 lineHeight: 1,
 color: 'var(--cui-secondary-color)',
 }}
 >
 &#9998;
 </button>
 <button
 type="button"
 title="Delete"
 disabled={isDeleting}
 onClick={(e) => {
 e.stopPropagation();
 void handleQuickDelete(item);
 }}
 style={{
 background: 'transparent',
 border: '1px solid var(--cui-border-color)',
 borderRadius: '4px',
 padding: '0.2rem 0.35rem',
 cursor: isDeleting ? 'not-allowed' : 'pointer',
 fontSize: '0.72rem',
 lineHeight: 1,
 color: 'var(--cui-danger)',
 }}
 >
 &#128465;
 </button>
 </div>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </>
 )}

 {/* ── Tag-edit modal ── */}
 <CModal
 visible={!!editModalItem}
 onClose={closeTagModal}
 alignment="center"
 size="lg"
 >
 <CModalHeader closeButton>
 <CModalTitle style={{ fontSize: '0.95rem' }}>
 Edit Tags
 </CModalTitle>
 </CModalHeader>
 <CModalBody>
 {editModalItem && (
 <div className="d-flex gap-3" style={{ minHeight: '220px' }}>
 {/* Preview */}
 <div
 style={{
 width: '200px',
 flexShrink: 0,
 borderRadius: '4px',
 overflow: 'hidden',
 backgroundColor: 'var(--cui-tertiary-bg)',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 }}
 >
 {resolveMediaUrl(editModalItem.storage_uri || editModalItem.thumbnail_uri) ? (
 <img
 src={resolveMediaUrl(editModalItem.storage_uri || editModalItem.thumbnail_uri)}
 alt={editModalItem.classification?.name ?? 'Media'}
 style={{
 maxWidth: '100%',
 maxHeight: '220px',
 objectFit: 'contain',
 }}
 />
 ) : (
 <span style={{ fontSize: '2rem', opacity: 0.4 }}>{'\u{1F5BC}'}</span>
 )}
 </div>

 {/* Tag selection — multi-select */}
 <div style={{ flex: 1 }}>
 <div
 style={{
 fontSize: '0.78rem',
 color: 'var(--cui-secondary-color)',
 marginBottom: '0.5rem',
 }}
 >
 Select one or more tags (first selected = primary):
 </div>
 <div className="d-flex flex-wrap gap-1">
 {ALL_CLASSIFICATIONS.map((cls) => {
 const isSelected = editModalTags.includes(cls.classification_id);
 const isPrimary = editModalTags[0] === cls.classification_id;
 return (
 <button
 key={cls.classification_id}
 type="button"
 onClick={() => toggleModalTag(cls.classification_id)}
 className="border rounded-pill px-2 py-1"
 style={{
 fontSize: '0.74rem',
 lineHeight: 1.3,
 cursor: 'pointer',
 borderColor: isSelected
 ? isPrimary
 ? 'var(--cui-primary)'
 : `var(--cui-${cls.badge_color || 'secondary'})`
 : 'var(--cui-border-color)',
 backgroundColor: isSelected
 ? isPrimary
 ? 'var(--cui-primary)'
 : `var(--cui-${cls.badge_color || 'secondary'})`
 : 'transparent',
 color: isSelected ? '#fff' : 'var(--cui-body-color)',
 }}
 >
 {cls.name}
 </button>
 );
 })}
 </div>

 {editModalTags.length > 1 && (
 <div
 style={{
 fontSize: '0.72rem',
 color: 'var(--cui-secondary-color)',
 marginTop: '0.6rem',
 }}
 >
 Primary tag: <strong>
 {ALL_CLASSIFICATIONS.find((c) => c.classification_id === editModalTags[0])?.name}
 </strong>
 {' '}(saved to database). Additional tags are visual only for now.
 </div>
 )}
 </div>
 </div>
 )}
 </CModalBody>
 <CModalFooter>
 <button
 type="button"
 className="btn btn-sm btn-ghost-secondary"
 onClick={closeTagModal}
 >
 Cancel
 </button>
 <button
 type="button"
 className="btn btn-sm btn-primary"
 disabled={editModalSaving || editModalTags.length === 0}
 onClick={() => void handleSaveModalTags()}
 >
 {editModalSaving ? 'Saving...' : 'Save Tags'}
 </button>
 </CModalFooter>
 </CModal>
 </CCardBody>
 )}
 </CCard>
 );
}
