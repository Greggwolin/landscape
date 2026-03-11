'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import CIcon from '@coreui/icons-react';
import { cilLayers } from '@coreui/icons';
import { useDropzone } from 'react-dropzone';
import type { DMSDocument } from '@/types/dms';
import { useUploadStaging } from '@/contexts/UploadStagingContext';
import MediaBadgeChips from '@/components/dms/MediaBadgeChips';

export interface FilterAccordion {
  doc_type: string;
  icon: string;
  count: number;
  is_expanded: boolean;
  documents?: DMSDocument[];
  is_from_template?: boolean;
  custom_id?: number; // dms_project_doc_types.id for custom types
}

import styles from './AccordionFilters.module.css';

interface AccordionFiltersProps {
  filters: FilterAccordion[];
  onExpand: (docType: string) => void;
  onFilterClick?: (docType: string) => void; // Optional - kept for backwards compatibility
  onDocumentSelect: (doc: DMSDocument) => void;
  expandedFilter?: string | null;
  activeFilter?: string | null;
  selectedDocIds?: Set<string>;
  onToggleDocSelection?: (docId: string) => void;
  onReviewMedia?: (docId: number, docName: string) => void;
  onDeleteFilter?: (customId: number, docTypeName: string) => void;
  onLinkVersion?: (sourceDocId: string, targetDoc: DMSDocument) => void;
  onDocumentDrop?: (docIds: string[], targetDocType: string) => void;
}

const acceptedFileTypes = {
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
};

interface FilterDropRowProps {
  filter: FilterAccordion;
  expandedFilter?: string | null;
  onExpand: (docType: string) => void;
  onDocumentSelect: (doc: DMSDocument) => void;
  selectedDocIds?: Set<string>;
  onToggleDocSelection?: (docId: string) => void;
  onReviewMedia?: (docId: number, docName: string) => void;
  onDeleteFilter?: (customId: number, docTypeName: string) => void;
  onLinkVersion?: (sourceDocId: string, targetDoc: DMSDocument) => void;
  onDocumentDrop?: (docIds: string[], targetDocType: string) => void;
}

function FilterDropRow({
  filter,
  expandedFilter,
  onExpand,
  onDocumentSelect,
  selectedDocIds,
  onToggleDocSelection,
  onReviewMedia,
  onDeleteFilter,
  onLinkVersion,
  onDocumentDrop
}: FilterDropRowProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dropTargetDocId, setDropTargetDocId] = useState<string | null>(null);
  const [isReclassifyDropTarget, setIsReclassifyDropTarget] = useState(false);
  const [isDropSuccess, setIsDropSuccess] = useState(false);
  const dropSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { stageFiles } = useUploadStaging();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      stageFiles(acceptedFiles, { suggestedDocType: filter.doc_type });
    },
    [stageFiles, filter.doc_type]
  );

  const {
    getRootProps,
    isDragActive,
    isDragReject
  } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    maxSize: 32 * 1024 * 1024,
    maxFiles: 10,
    noClick: true,
    noKeyboard: true,
  });

  const isExpanded = expandedFilter === filter.doc_type;
  const headerDynamicStyle: React.CSSProperties = {
    backgroundColor: isExpanded ? 'var(--cui-primary-bg)' : 'var(--cui-body-bg)',
    borderBottomColor: isExpanded ? 'var(--cui-primary)' : 'var(--cui-border-color)',
    color: 'var(--cui-body-color)'
  };
  const mutedTextStyle: React.CSSProperties = {
    color: 'var(--cui-secondary-color)'
  };
  const nameStyle: React.CSSProperties = isExpanded
    ? {
        color: 'var(--cui-primary)',
        fontWeight: 600
      }
    : { color: 'var(--cui-body-color)' };

  const dropStateClass = isDragActive
    ? (isDragReject ? styles.filterRowReject : styles.filterRowActive)
    : '';

  // Reclassify drop target class
  const reclassifyClass = isDropSuccess
    ? styles.filterRowDropSuccess
    : isReclassifyDropTarget
      ? styles.filterRowReclassifyTarget
      : '';

  // Handle native drag events for reclassify (layered on top of react-dropzone)
  const handleHeaderDragOver = useCallback((e: React.DragEvent) => {
    // Only handle our custom doc drags, not file drops
    if (!e.dataTransfer.types.includes('application/x-dms-reclassify')) return;
    e.preventDefault();
    e.stopPropagation();
    // Check if dragged doc is from a different category
    const currentType = e.dataTransfer.types.includes('application/x-dms-current-type')
      ? '' // Can't read data during dragover, just allow the drop
      : '';
    void currentType;
    e.dataTransfer.dropEffect = 'move';
    setIsReclassifyDropTarget(true);
  }, []);

  const handleHeaderDragEnter = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('application/x-dms-reclassify')) return;
    e.preventDefault();
    e.stopPropagation();
    setIsReclassifyDropTarget(true);
  }, []);

  const handleHeaderDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('application/x-dms-reclassify')) return;
    // Only clear if leaving the header (not entering a child)
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    const currentTarget = e.currentTarget as HTMLElement;
    if (relatedTarget && currentTarget.contains(relatedTarget)) return;
    setIsReclassifyDropTarget(false);
  }, []);

  const handleHeaderDrop = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('application/x-dms-reclassify')) return;
    e.preventDefault();
    e.stopPropagation();
    setIsReclassifyDropTarget(false);

    const docIdsRaw = e.dataTransfer.getData('application/x-dms-reclassify');
    const currentType = e.dataTransfer.getData('application/x-dms-current-type');

    if (!docIdsRaw) return;

    // No-op if dropping on same category
    if (currentType === filter.doc_type) return;

    const docIds = docIdsRaw.split(',').filter(Boolean);
    if (docIds.length === 0) return;

    // Flash success
    if (dropSuccessTimerRef.current) clearTimeout(dropSuccessTimerRef.current);
    setIsDropSuccess(true);
    dropSuccessTimerRef.current = setTimeout(() => setIsDropSuccess(false), 300);

    onDocumentDrop?.(docIds, filter.doc_type);
  }, [filter.doc_type, onDocumentDrop]);

  const rootProps = getRootProps();

  return (
    <div key={filter.doc_type} style={{ backgroundColor: 'var(--cui-body-bg)' }}>
      <div
        {...rootProps}
        onDragOver={(e) => {
          handleHeaderDragOver(e);
          rootProps.onDragOver?.(e as unknown as React.DragEvent<HTMLElement>);
        }}
        onDragEnter={(e) => {
          handleHeaderDragEnter(e);
          rootProps.onDragEnter?.(e as unknown as React.DragEvent<HTMLElement>);
        }}
        onDragLeave={(e) => {
          handleHeaderDragLeave(e);
          rootProps.onDragLeave?.(e as unknown as React.DragEvent<HTMLElement>);
        }}
        onDrop={(e) => {
          if (e.dataTransfer.types.includes('application/x-dms-reclassify')) {
            handleHeaderDrop(e);
          } else {
            rootProps.onDrop?.(e as unknown as React.DragEvent<HTMLElement>);
          }
        }}
        className={`group flex items-center gap-1.5 px-3 py-1.25 transition-colors ${styles.filterRow} ${dropStateClass} ${reclassifyClass}`}
        style={{
          ...headerDynamicStyle,
          borderBottomWidth: '1px',
          borderBottomStyle: 'solid',
          borderBottomColor: headerDynamicStyle.borderBottomColor ?? 'var(--cui-border-color)',
          ...(isReclassifyDropTarget ? {
            borderLeft: '2px solid var(--cui-primary)',
            backgroundColor: 'var(--cui-primary-bg-subtle, rgba(var(--cui-primary-rgb), 0.08))',
          } : {}),
          ...(isDropSuccess ? {
            backgroundColor: 'var(--cui-success-bg-subtle, rgba(var(--cui-success-rgb), 0.1))',
          } : {}),
        }}
        data-doc-type={filter.doc_type}
        aria-dropeffect={isReclassifyDropTarget ? 'move' : undefined}
      >
        <button
          onClick={() => onExpand(filter.doc_type)}
          className="w-4 flex-shrink-0 transition-colors"
          style={mutedTextStyle}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? '▾' : '▸'}
        </button>

        <button
          onClick={() => onExpand(filter.doc_type)}
          className={`${styles.filterIconButton} ${isExpanded ? styles.filterIconButtonActive : ''}`}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${filter.doc_type}`}
        >
          <CIcon icon={cilLayers} className="w-5 h-5" />
        </button>

        <button
          onClick={() => onExpand(filter.doc_type)}
          className={`${styles.filterNameButton} ${isExpanded ? styles.filterNameButtonActive : ''}`}
          style={nameStyle}
          aria-expanded={isExpanded}
        >
          {filter.doc_type}
        </button>

        <span className="text-sm" style={mutedTextStyle}>
          ~{filter.count}
        </span>

        <button className="text-sm hover:underline" style={{ color: 'var(--cui-body-color)' }}>
          Edit
        </button>

        {/* Delete button for custom (non-template) types */}
        {filter.is_from_template === false && filter.custom_id && onDeleteFilter && (
          <div className="relative" style={{ marginLeft: '2px' }}>
            {showDeleteConfirm ? (
              <div
                className="absolute right-0 top-full z-50 mt-1 p-2 rounded shadow-lg border text-xs"
                style={{
                  backgroundColor: 'var(--cui-body-bg)',
                  borderColor: 'var(--cui-border-color)',
                  minWidth: '200px',
                  whiteSpace: 'nowrap'
                }}
              >
                <p className="mb-2" style={{ color: 'var(--cui-body-color)' }}>
                  Remove &lsquo;{filter.doc_type}&rsquo;?<br />
                  <span style={{ color: 'var(--cui-secondary-color)' }}>
                    Documents move to Misc.
                  </span>
                </p>
                <div className="flex gap-2">
                  <button
                    className="px-2 py-0.5 rounded text-white"
                    style={{ backgroundColor: 'var(--cui-danger)', fontSize: '0.7rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFilter(filter.custom_id!, filter.doc_type);
                      setShowDeleteConfirm(false);
                    }}
                  >
                    Remove
                  </button>
                  <button
                    className="px-2 py-0.5 rounded border"
                    style={{
                      borderColor: 'var(--cui-border-color)',
                      color: 'var(--cui-body-color)',
                      fontSize: '0.7rem'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                className={styles.filterDeleteButton}
                style={{
                  color: 'var(--cui-secondary-color)',
                  fontSize: '0.9rem',
                  lineHeight: 1,
                  padding: '2px 4px',
                  borderRadius: '3px'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                }}
                title={`Remove "${filter.doc_type}"`}
              >
                ×
              </button>
            )}
          </div>
        )}
      </div>

      {isExpanded && (
        <div
          className="px-4 py-2 space-y-1 border-t"
          style={{
            backgroundColor: 'var(--cui-tertiary-bg)',
            borderColor: 'var(--cui-border-color)'
          }}
        >
          {!filter.documents || filter.documents.length === 0 ? (
            <div className="text-sm italic py-2" style={mutedTextStyle}>
              {filter.count === 0 ? 'No documents' : 'Loading...'}
            </div>
          ) : (
            filter.documents.map((doc) => (
              <div
                key={doc.doc_id}
                className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer transition-colors border-b last:border-b-0 hover:bg-opacity-50 relative"
                style={{
                  color: 'var(--cui-body-color)',
                  backgroundColor: dropTargetDocId === doc.doc_id ? 'var(--cui-primary-bg)' : 'var(--cui-body-bg)',
                  borderColor: 'var(--cui-border-color)'
                }}
                onClick={() => onDocumentSelect(doc)}
                draggable={!!onLinkVersion || !!onDocumentDrop}
                onDragStart={(event) => {
                  // Version-link data (existing)
                  if (onLinkVersion) {
                    event.dataTransfer.setData('application/x-dms-doc', doc.doc_id);
                  }
                  // Reclassify data — if this doc is selected in a multi-select, drag all selected
                  if (onDocumentDrop) {
                    const isSelected = selectedDocIds?.has(doc.doc_id);
                    const docIds = isSelected && selectedDocIds && selectedDocIds.size > 1
                      ? Array.from(selectedDocIds)
                      : [doc.doc_id];
                    event.dataTransfer.setData('application/x-dms-reclassify', docIds.join(','));
                    event.dataTransfer.setData('application/x-dms-current-type', doc.doc_type || '');
                    // Set drag image badge for multi-select
                    if (docIds.length > 1) {
                      const badge = document.createElement('div');
                      badge.textContent = `${docIds.length} documents`;
                      badge.style.cssText = 'padding:4px 10px;background:var(--cui-primary);color:var(--cui-white, white);border-radius:4px;font-size:12px;position:absolute;top:-9999px;';
                      document.body.appendChild(badge);
                      event.dataTransfer.setDragImage(badge, 0, 0);
                      setTimeout(() => document.body.removeChild(badge), 0);
                    }
                  }
                  event.dataTransfer.effectAllowed = 'move';
                  // Visual cue: reduce opacity
                  (event.currentTarget as HTMLElement).style.opacity = '0.5';
                }}
                onDragEnd={(event) => {
                  (event.currentTarget as HTMLElement).style.opacity = '1';
                }}
                onDragOver={(event) => {
                  if (!onLinkVersion) return;
                  if (!Array.from(event.dataTransfer.types).includes('application/x-dms-doc')) return;
                  event.preventDefault();
                  setDropTargetDocId(doc.doc_id);
                }}
                onDragLeave={() => {
                  if (!onLinkVersion) return;
                  if (dropTargetDocId === doc.doc_id) {
                    setDropTargetDocId(null);
                  }
                }}
                onDrop={(event) => {
                  if (!onLinkVersion) return;
                  event.preventDefault();
                  const sourceDocId = event.dataTransfer.getData('application/x-dms-doc');
                  setDropTargetDocId(null);
                  if (sourceDocId && sourceDocId !== doc.doc_id) {
                    onLinkVersion(sourceDocId, doc);
                  }
                }}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded"
                  style={{ borderColor: 'var(--cui-border-color)' }}
                  checked={selectedDocIds?.has(doc.doc_id) ?? false}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => onToggleDocSelection?.(doc.doc_id)}
                />
                <span className="text-lg" style={{ color: 'var(--cui-danger)' }}>📄</span>
                <div className="flex-1 min-w-0" style={{ color: 'var(--cui-body-color)' }}>
                  <div className="font-medium truncate">
                    {doc.doc_name}
                  </div>
                  <div className="text-sm" style={mutedTextStyle}>
                    V{doc.version_no || 1} • {doc.created_at ? new Date(doc.created_at).toLocaleDateString('en-US', {
                      month: '2-digit',
                      day: '2-digit',
                      year: 'numeric'
                    }) : 'No date'}
                  </div>
                </div>
                {/* Media badge chips — color-coded by media category */}
                {onReviewMedia && (
                  <MediaBadgeChips
                    mediaScanJson={doc.media_scan_json}
                    scanStatus={doc.media_scan_status}
                    compact={true}
                    onClick={() => onReviewMedia(parseInt(doc.doc_id, 10), doc.doc_name)}
                  />
                )}
                {dropTargetDocId === doc.doc_id && (
                  <span
                    className="absolute right-2 top-1 text-[10px] uppercase tracking-wide"
                    style={{ color: 'var(--cui-primary)' }}
                  >
                    Link as Version
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
}

export default function AccordionFilters({
  filters,
  onExpand,
  onDocumentSelect,
  expandedFilter,
  selectedDocIds,
  onToggleDocSelection,
  onReviewMedia,
  onDeleteFilter,
  onLinkVersion,
  onDocumentDrop
}: AccordionFiltersProps) {
  const renderedFilters = useMemo(() => filters, [filters]);

  return (
    <div className="divide-y" style={{ borderColor: 'var(--cui-border-color)' }}>
      {renderedFilters.map((filter) => (
        <FilterDropRow
          key={filter.doc_type}
          filter={filter}
          expandedFilter={expandedFilter}
          onExpand={onExpand}
          onDocumentSelect={onDocumentSelect}
          selectedDocIds={selectedDocIds}
          onToggleDocSelection={onToggleDocSelection}
          onReviewMedia={onReviewMedia}
          onDeleteFilter={onDeleteFilter}
          onLinkVersion={onLinkVersion}
          onDocumentDrop={onDocumentDrop}
        />
      ))}
    </div>
  );
}
