'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWrapperProject } from '@/contexts/WrapperProjectContext';
import { useUploadStaging } from '@/contexts/UploadStagingContext';
import { DocumentDetailPanel, DocumentDetailDoc } from './DocumentDetailPanel';
import { DeleteConfirmModal, RenameModal, RestoreConfirmModal } from '@/components/dms/modals';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CFormLabel,
} from '@coreui/react';
import DocTypeCombobox from '@/components/dms/filters/DocTypeCombobox';

const DJANGO_API = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

interface DocType {
  doc_type_name: string;
  is_from_template: boolean;
  id?: number;
  display_order?: number;
}

interface DocTypeWithCount extends DocType {
  count: number;
}

interface DMSDoc extends DocumentDetailDoc {
  uploaded_at?: string;
  media_scan_status?: string | null;
  doc_type?: string;
  profile_json?: Record<string, unknown>;
}

interface DocumentsPanelProps {
  refreshKey?: number;
  onChange?: () => void;
}

export function DocumentsPanel({ refreshKey = 0, onChange }: DocumentsPanelProps = {}) {
  const { project_id } = useWrapperProject();
  const { setDocTypes: setStagingDocTypes } = useUploadStaging();

  // ── Doc-type + doc state ───────────────────────────────────
  const [docTypes, setDocTypes] = useState<DocTypeWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [docsByType, setDocsByType] = useState<Record<string, DMSDoc[]>>({});
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DMSDoc | null>(null);

  // ── Selection state ────────────────────────────────────────
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  const allVisibleDocs = useMemo(() => {
    const out: DMSDoc[] = [];
    for (const docs of Object.values(docsByType)) {
      out.push(...docs);
    }
    return out;
  }, [docsByType]);

  const selectedDocs = useMemo(
    () => allVisibleDocs.filter((d) => selectedDocIds.has(d.doc_id)),
    [allVisibleDocs, selectedDocIds]
  );

  const firstSelectedDoc = selectedDocs[0] ?? null;

  // ── Trash view state ───────────────────────────────────────
  const [viewingTrash, setViewingTrash] = useState(false);
  const [trashedDocs, setTrashedDocs] = useState<DMSDoc[]>([]);
  const [trashCount, setTrashCount] = useState(0);
  const [loadingTrash, setLoadingTrash] = useState(false);

  // ── Modal state ────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false);

  // ── Add Type modal state ───────────────────────────────────
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [addTypeError, setAddTypeError] = useState<string | null>(null);
  const [isSubmittingType, setIsSubmittingType] = useState(false);
  const [templateSuggestions, setTemplateSuggestions] = useState<string[]>([]);

  // ── Ref for AbortController (fixes CC obs #3) ──────────────
  const abortRef = useRef<AbortController | null>(null);

  // ── Refresh helper ─────────────────────────────────────────
  const triggerRefresh = useCallback(() => {
    onChange?.();
  }, [onChange]);

  // ── Fetch template suggestions (once) ───────────────────────
  useEffect(() => {
    fetch('/api/dms/templates/all-doc-types')
      .then((r) => (r.ok ? r.json() : { doc_types: [] }))
      .then((data) => {
        if (Array.isArray(data.doc_types)) setTemplateSuggestions(data.doc_types);
      })
      .catch(() => {});
  }, []);

  // ── Fetch trash count on mount + after refreshKey changes ──
  useEffect(() => {
    if (!project_id) return;
    fetch(`/api/dms/search?project_id=${project_id}&include_deleted=true&deleted_only=true&limit=1`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => setTrashCount(data?.totalHits ?? 0))
      .catch(() => {});
  }, [project_id, refreshKey]);

  // ── Fetch doc types + counts ───────────────────────────────
  useEffect(() => {
    if (!project_id) return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    (async () => {
      setLoading(true);
      try {
        const [typesRes, countsRes] = await Promise.all([
          fetch(`${DJANGO_API}/api/dms/projects/${project_id}/doc-types/`, { signal: ac.signal }),
          fetch(`/api/dms/filters/counts?project_id=${project_id}`, { signal: ac.signal }),
        ]);

        let types: DocType[] = [];
        if (typesRes.ok) {
          const data = await typesRes.json();
          types = Array.isArray(data?.doc_types) ? data.doc_types : [];
        }

        const countMap = new Map<string, number>();
        if (countsRes.ok) {
          const data = await countsRes.json();
          const entries: Array<{ doc_type: string; count: number }> = data?.doc_type_counts ?? [];
          entries.forEach((e) => countMap.set(e.doc_type, e.count ?? 0));
        }

        const merged: DocTypeWithCount[] = types.map((t) => ({
          ...t,
          count: countMap.get(t.doc_type_name) ?? 0,
        }));

        merged.sort((a, b) => {
          const ao = a.display_order ?? 999;
          const bo = b.display_order ?? 999;
          if (ao !== bo) return ao - bo;
          return a.doc_type_name.localeCompare(b.doc_type_name);
        });

        if (!ac.signal.aborted) {
          setDocTypes(merged);
          setStagingDocTypes(merged.map((t) => t.doc_type_name));
          setDocsByType({});
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('[DocumentsPanel] failed to load doc types', err);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [project_id, refreshKey, setStagingDocTypes]);

  // ── Trash loader ───────────────────────────────────────────
  const loadTrash = useCallback(async () => {
    if (!project_id) return;
    setLoadingTrash(true);
    try {
      const res = await fetch(
        `/api/dms/search?project_id=${project_id}&include_deleted=true&deleted_only=true&limit=100`
      );
      if (res.ok) {
        const data = await res.json();
        const docs: DMSDoc[] = data?.results ?? [];
        setTrashedDocs(docs);
        setTrashCount(data?.totalHits ?? docs.length);
      }
    } catch (err) {
      console.error('[DocumentsPanel] failed to load trash', err);
    } finally {
      setLoadingTrash(false);
    }
  }, [project_id]);

  // ── Add Type handler ────────────────────────────────────────
  const handleOpenAddType = useCallback(() => {
    setNewTypeName('');
    setAddTypeError(null);
    setShowAddTypeModal(true);
  }, []);

  const handleCloseAddType = useCallback(() => {
    setShowAddTypeModal(false);
    setNewTypeName('');
    setAddTypeError(null);
  }, []);

  const handleSubmitAddType = useCallback(async () => {
    const trimmed = newTypeName.trim();
    if (!trimmed) { handleCloseAddType(); return; }

    const dup = docTypes.find(
      (t) => t.doc_type_name.toLowerCase() === trimmed.toLowerCase()
    );
    if (dup) { setAddTypeError('This type already exists'); return; }

    setIsSubmittingType(true);
    setAddTypeError(null);
    try {
      const res = await fetch(`${DJANGO_API}/api/dms/projects/${project_id}/doc-types/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_type_name: trimmed }),
      });
      const data = await res.json();
      if (data.existing) { setAddTypeError('This type already exists'); return; }
      if (!data.success || !data.doc_type) { setAddTypeError(data.error || 'Failed to create type'); return; }

      handleCloseAddType();
      triggerRefresh();
    } catch {
      setAddTypeError('Failed to add type');
    } finally {
      setIsSubmittingType(false);
    }
  }, [newTypeName, docTypes, project_id, handleCloseAddType, triggerRefresh]);

  // ── Derived ────────────────────────────────────────────────
  const totalCount = useMemo(
    () => docTypes.reduce((sum, t) => sum + (t.count ?? 0), 0),
    [docTypes]
  );

  const { leftCol, rightCol } = useMemo(() => {
    const mid = Math.ceil(docTypes.length / 2);
    return { leftCol: docTypes.slice(0, mid), rightCol: docTypes.slice(mid) };
  }, [docTypes]);

  // ── Auto-refetch expanded type after cache clear ────────────
  useEffect(() => {
    if (!expandedType || docsByType[expandedType] || loadingType === expandedType) return;
    void handleExpandFetch(expandedType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedType, docsByType]);

  const handleExpandFetch = async (docType: string) => {
    setLoadingType(docType);
    try {
      const res = await fetch(
        `/api/dms/search?project_id=${project_id}&doc_type=${encodeURIComponent(docType)}&limit=20`
      );
      if (res.ok) {
        const data = await res.json();
        const results: DMSDoc[] = data?.results ?? [];
        setDocsByType((prev) => ({ ...prev, [docType]: results }));
      }
    } catch (err) {
      console.error('[DocumentsPanel] failed to load docs for', docType, err);
    } finally {
      setLoadingType(null);
    }
  };

  // ── Expand handler ─────────────────────────────────────────
  const handleExpand = async (docType: string) => {
    if (expandedType === docType) {
      setExpandedType(null);
      return;
    }
    setExpandedType(docType);
    if (docsByType[docType]) return;

    setLoadingType(docType);
    try {
      const res = await fetch(
        `/api/dms/search?project_id=${project_id}&doc_type=${encodeURIComponent(docType)}&limit=20`
      );
      if (res.ok) {
        const data = await res.json();
        const results: DMSDoc[] = data?.results ?? [];
        setDocsByType((prev) => ({ ...prev, [docType]: results }));
      }
    } catch (err) {
      console.error('[DocumentsPanel] failed to load docs for', docType, err);
    } finally {
      setLoadingType(null);
    }
  };

  // ── Selection helpers ──────────────────────────────────────
  const toggleDocSelection = useCallback((docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedDocIds.size === allVisibleDocs.length) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(allVisibleDocs.map((d) => d.doc_id)));
    }
  }, [selectedDocIds.size, allVisibleDocs]);

  const clearSelection = useCallback(() => {
    setSelectedDocIds(new Set());
  }, []);

  // ── API handlers ───────────────────────────────────────────
  const handleBulkDelete = useCallback(async () => {
    const errors: string[] = [];
    for (const doc of selectedDocs) {
      try {
        const res = await fetch(
          `/api/projects/${project_id}/dms/docs/${doc.doc_id}/delete`,
          { method: 'DELETE' }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          errors.push(`${doc.doc_name}: ${(data as { error?: string }).error || 'Delete failed'}`);
        }
      } catch (err) {
        errors.push(`${doc.doc_name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
    if (errors.length > 0) console.error('[DocumentsPanel] bulk delete errors:', errors);
    clearSelection();
    setShowDeleteModal(false);
    triggerRefresh();
  }, [selectedDocs, project_id, clearSelection, triggerRefresh]);

  const handleRename = useCallback(
    async (newName: string) => {
      if (!firstSelectedDoc) return;
      const res = await fetch(
        `/api/projects/${project_id}/dms/docs/${firstSelectedDoc.doc_id}/rename`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ new_name: newName }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || 'Failed to rename document');
      }
      clearSelection();
      setShowRenameModal(false);
      triggerRefresh();
    },
    [firstSelectedDoc, project_id, clearSelection, triggerRefresh]
  );

  const handleBulkRestore = useCallback(async () => {
    const errors: string[] = [];
    const trashSelected = trashedDocs.filter((d) => selectedDocIds.has(d.doc_id));
    for (const doc of trashSelected) {
      try {
        const res = await fetch(
          `/api/projects/${project_id}/dms/docs/${doc.doc_id}/restore`,
          { method: 'POST' }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          errors.push(`${doc.doc_name}: ${(data as { error?: string }).error || 'Restore failed'}`);
        }
      } catch (err) {
        errors.push(`${doc.doc_name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
    if (errors.length > 0) console.error('[DocumentsPanel] bulk restore errors:', errors);
    clearSelection();
    setShowRestoreModal(false);
    const remaining = trashedDocs.length - trashSelected.length;
    if (remaining <= 0) {
      setViewingTrash(false);
    } else {
      void loadTrash();
    }
    triggerRefresh();
  }, [trashedDocs, selectedDocIds, project_id, clearSelection, loadTrash, triggerRefresh]);

  const handleBulkPermanentDelete = useCallback(async () => {
    const errors: string[] = [];
    const trashSelected = trashedDocs.filter((d) => selectedDocIds.has(d.doc_id));
    for (const doc of trashSelected) {
      try {
        const res = await fetch(
          `/api/projects/${project_id}/dms/docs/${doc.doc_id}/permanent-delete`,
          { method: 'DELETE' }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          errors.push(`${doc.doc_name}: ${(data as { error?: string }).error || 'Delete failed'}`);
        }
      } catch (err) {
        errors.push(`${doc.doc_name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
    if (errors.length > 0) console.error('[DocumentsPanel] bulk permanent delete errors:', errors);
    clearSelection();
    setShowPermanentDeleteModal(false);
    const remaining = trashedDocs.length - trashSelected.length;
    if (remaining <= 0) {
      setViewingTrash(false);
    } else {
      void loadTrash();
    }
  }, [trashedDocs, selectedDocIds, project_id, clearSelection, loadTrash]);

  // ── Trash toggle ───────────────────────────────────────────
  const toggleTrash = useCallback(() => {
    const next = !viewingTrash;
    setViewingTrash(next);
    clearSelection();
    if (next) void loadTrash();
  }, [viewingTrash, clearSelection, loadTrash]);

  // ── Compute which docs are shown for trash selection ───────
  const trashSelectedDocs = useMemo(
    () => trashedDocs.filter((d) => selectedDocIds.has(d.doc_id)),
    [trashedDocs, selectedDocIds]
  );

  const selCount = selectedDocIds.size;
  const hasSelection = selCount > 0;

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className={`w-doc-layout${selectedDoc ? ' has-detail' : ''}`}>
      <div className="w-panel w-panel-main">
        <div className="w-panel-head">
          <span className="w-panel-head-title">
            {viewingTrash ? 'Trash' : 'Project Documents'}
          </span>
        </div>

        {/* ── Toolbar ─────────────────────────────────── */}
        <div className="w-doc-toolbar">
          <span className="w-doc-toolbar-selection" onClick={selectAll} style={{ cursor: 'pointer' }}>
            <span className="w-doc-toolbar-chev">▼</span>{' '}
            {viewingTrash ? `${trashCount} trashed` : `${totalCount} items`}
            {' | '}
            {selCount > 0 ? `${selCount} selected` : '0 selected'}
          </span>

          {viewingTrash ? (
            <>
              <button
                className="w-btn w-btn-ghost w-btn-sm"
                onClick={() => setViewingTrash(false)}
              >
                ← Back
              </button>
              <button
                className="w-btn w-btn-ghost w-btn-sm"
                disabled={!hasSelection}
                onClick={() => setShowRestoreModal(true)}
              >
                ↩ Restore
              </button>
              <button
                className="w-btn w-btn-ghost w-btn-sm"
                disabled={!hasSelection}
                onClick={() => setShowPermanentDeleteModal(true)}
              >
                🗑 Delete Forever
              </button>
            </>
          ) : (
            <>
              <button
                className="w-btn w-btn-ghost w-btn-sm"
                onClick={toggleTrash}
              >
                🗑 View Trash{trashCount > 0 ? ` (${trashCount})` : ''}
              </button>
              <button
                className="w-btn w-btn-ghost w-btn-sm"
                disabled={selCount !== 1}
                onClick={() => setShowRenameModal(true)}
              >
                ✏️ Rename
              </button>
              <button
                className="w-btn w-btn-ghost w-btn-sm"
                disabled={!hasSelection}
                onClick={() => setShowDeleteModal(true)}
              >
                🗑 Delete
              </button>
              <button className="w-btn w-btn-ghost w-btn-sm" disabled title="Coming in M3">
                ↗ Move/Copy
              </button>
              <button className="w-btn w-btn-ghost w-btn-sm" disabled title="Coming in M3">
                🔗 Share
              </button>
              <button className="w-btn w-btn-ghost w-btn-sm" disabled title="Coming in M4">
                ✏️ Edit profile
              </button>
            </>
          )}
        </div>

        {/* ── Content ─────────────────────────────────── */}
        {viewingTrash ? (
          <div className="w-doc-type-body" style={{ padding: '8px' }}>
            {loadingTrash ? (
              <div className="w-doc-type-empty">Loading trash…</div>
            ) : trashedDocs.length === 0 ? (
              <div className="w-doc-type-empty">Trash is empty.</div>
            ) : (
              <ul className="w-doc-type-list">
                {trashedDocs.map((d) => {
                  const name = d.doc_name || d.original_filename || `Document ${d.doc_id}`;
                  const isChecked = selectedDocIds.has(d.doc_id);
                  return (
                    <li
                      key={d.doc_id}
                      className={`w-doc-type-list-item${isChecked ? ' is-selected' : ''}`}
                      onClick={(e) => toggleDocSelection(d.doc_id, e)}
                    >
                      <input
                        type="checkbox"
                        className="w-doc-type-list-check"
                        checked={isChecked}
                        onChange={() => {}}
                      />
                      <span className="w-doc-type-list-main">
                        <span className="w-doc-type-list-name">{name}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : loading ? (
          <div className="w-doc-loading">Loading document types…</div>
        ) : (
          <div className={`w-doc-type-grid${selectedDoc ? ' is-single-col' : ''}`}>
            <div className="w-doc-type-col">
              {(selectedDoc ? docTypes : leftCol).map((t) => (
                <DocTypeRowView
                  key={t.doc_type_name}
                  row={t}
                  expanded={expandedType === t.doc_type_name}
                  onExpand={() => handleExpand(t.doc_type_name)}
                  docs={docsByType[t.doc_type_name]}
                  loading={loadingType === t.doc_type_name}
                  selectedDocId={selectedDoc?.doc_id ?? null}
                  onSelectDoc={setSelectedDoc}
                  selectedDocIds={selectedDocIds}
                  onToggleCheck={toggleDocSelection}
                />
              ))}
            </div>
            {!selectedDoc && (
              <div className="w-doc-type-col">
                {rightCol.map((t) => (
                  <DocTypeRowView
                    key={t.doc_type_name}
                    row={t}
                    expanded={expandedType === t.doc_type_name}
                    onExpand={() => handleExpand(t.doc_type_name)}
                    docs={docsByType[t.doc_type_name]}
                    loading={loadingType === t.doc_type_name}
                    selectedDocId={selectedDoc?.doc_id ?? null}
                    onSelectDoc={setSelectedDoc}
                    selectedDocIds={selectedDocIds}
                    onToggleCheck={toggleDocSelection}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="w-doc-add" onClick={handleOpenAddType} style={{ cursor: 'pointer' }}>
          + Add Type
        </div>
      </div>

      {selectedDoc && (
        <div className="w-panel w-panel-detail">
          <DocumentDetailPanel doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
        </div>
      )}

      {/* ── Modals ──────────────────────────────────── */}
      {hasSelection && !viewingTrash && (
        <DeleteConfirmModal
          visible={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          documents={selectedDocs.map((d) => ({
            doc_id: parseInt(d.doc_id, 10),
            doc_name: d.doc_name || d.original_filename || `Document ${d.doc_id}`,
          }))}
          projectId={project_id}
          onDelete={handleBulkDelete}
        />
      )}

      {firstSelectedDoc && !viewingTrash && (
        <RenameModal
          visible={showRenameModal}
          onClose={() => setShowRenameModal(false)}
          docId={parseInt(firstSelectedDoc.doc_id, 10)}
          projectId={project_id}
          currentName={firstSelectedDoc.doc_name || firstSelectedDoc.original_filename || ''}
          onRename={handleRename}
        />
      )}

      {trashSelectedDocs.length > 0 && viewingTrash && (
        <>
          <RestoreConfirmModal
            visible={showRestoreModal}
            onClose={() => setShowRestoreModal(false)}
            documents={trashSelectedDocs.map((d) => ({
              doc_id: parseInt(d.doc_id, 10),
              doc_name: d.doc_name || d.original_filename || `Document ${d.doc_id}`,
            }))}
            projectId={project_id}
            onRestore={handleBulkRestore}
          />
          <DeleteConfirmModal
            visible={showPermanentDeleteModal}
            onClose={() => setShowPermanentDeleteModal(false)}
            documents={trashSelectedDocs.map((d) => ({
              doc_id: parseInt(d.doc_id, 10),
              doc_name: d.doc_name || d.original_filename || `Document ${d.doc_id}`,
            }))}
            projectId={project_id}
            onDelete={handleBulkPermanentDelete}
            isPermanentDelete
          />
        </>
      )}

      {/* ── Add Type Modal ──────────────────────────── */}
      <CModal
        visible={showAddTypeModal}
        onClose={handleCloseAddType}
        alignment="center"
        size="sm"
      >
        <CModalHeader>
          <CModalTitle>Add Document Type</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CFormLabel htmlFor="newDocTypeName">Type Name</CFormLabel>
          <DocTypeCombobox
            value={newTypeName}
            onChange={(val) => {
              setNewTypeName(val);
              if (addTypeError) setAddTypeError(null);
            }}
            suggestions={templateSuggestions}
            existingTypes={docTypes.map((t) => t.doc_type_name)}
            placeholder="Type to search or create..."
            disabled={isSubmittingType}
            autoFocus
            onSubmit={() => void handleSubmitAddType()}
          />
          {addTypeError && (
            <div className="text-xs mt-1" style={{ color: 'var(--cui-danger)' }}>
              {addTypeError}
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={handleCloseAddType} disabled={isSubmittingType}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={() => void handleSubmitAddType()} disabled={isSubmittingType || !newTypeName.trim()}>
            {isSubmittingType ? 'Adding...' : 'Add Type'}
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  );
}

// ── DocTypeRowView ─────────────────────────────────────────
function DocTypeRowView({
  row,
  expanded,
  onExpand,
  docs,
  loading,
  selectedDocId,
  onSelectDoc,
  selectedDocIds,
  onToggleCheck,
}: {
  row: DocTypeWithCount;
  expanded: boolean;
  onExpand: () => void;
  docs?: DMSDoc[];
  loading?: boolean;
  selectedDocId: string | null;
  onSelectDoc: (doc: DMSDoc) => void;
  selectedDocIds: Set<string>;
  onToggleCheck: (docId: string, e: React.MouseEvent) => void;
}) {
  return (
    <div className={`w-doc-type-row${expanded ? ' expanded' : ''}`}>
      <div className="w-doc-type-row-head" onClick={onExpand}>
        <span className="w-doc-type-chev">{expanded ? '▾' : '▸'}</span>
        <span className="w-doc-type-icon" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
            <path d="M12 3L2 8l10 5 10-5-10-5z" />
            <path d="M2 13l10 5 10-5" />
            <path d="M2 18l10 5 10-5" />
          </svg>
        </span>
        <span className="w-doc-type-name">{row.doc_type_name}</span>
        <span className="w-doc-type-count">{row.count}</span>
        <span className="w-doc-type-edit">Edit</span>
      </div>

      {expanded && (
        <div className="w-doc-type-body">
          {loading ? (
            <div className="w-doc-type-empty">Loading…</div>
          ) : !docs || docs.length === 0 ? (
            <div className="w-doc-type-empty">No documents in this type.</div>
          ) : (
            <ul className="w-doc-type-list">
              {docs.map((d) => {
                const name = d.doc_name || d.original_filename || `Document ${d.doc_id}`;
                const ver = d.version_no ? `V${d.version_no}` : 'V1';
                const dateSrc = d.updated_at || d.created_at || d.uploaded_at;
                const date = dateSrc
                  ? new Date(dateSrc).toLocaleDateString('en-US', {
                      month: '2-digit',
                      day: '2-digit',
                      year: 'numeric',
                    })
                  : '';
                const dotColor =
                  d.media_scan_status === 'pending' || d.media_scan_status === 'processing'
                    ? 'is-amber'
                    : 'is-blue';
                const isDetailSelected = selectedDocId === d.doc_id;
                const isChecked = selectedDocIds.has(d.doc_id);
                return (
                  <li
                    key={d.doc_id}
                    className={`w-doc-type-list-item${isDetailSelected ? ' is-selected' : ''}${isChecked ? ' is-checked' : ''}`}
                    onClick={() => onSelectDoc(d)}
                  >
                    <input
                      type="checkbox"
                      className="w-doc-type-list-check"
                      checked={isChecked}
                      onClick={(e) => onToggleCheck(d.doc_id, e)}
                      onChange={() => {}}
                    />
                    <span className={`w-doc-type-list-dot ${dotColor}`} aria-hidden />
                    <span className="w-doc-type-list-chat" aria-hidden>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </span>
                    <span className="w-doc-type-list-main">
                      <span className="w-doc-type-list-name">{name}</span>
                      <span className="w-doc-type-list-meta">
                        {ver}
                        {date ? ` · ${date}` : ''}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
