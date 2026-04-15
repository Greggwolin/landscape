'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useWrapperProject } from '@/contexts/WrapperProjectContext';
import { DocumentDetailPanel, DocumentDetailDoc } from './DocumentDetailPanel';

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
}

export function DocumentsPanel() {
  const { project_id } = useWrapperProject();

  const [docTypes, setDocTypes] = useState<DocTypeWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [docsByType, setDocsByType] = useState<Record<string, DMSDoc[]>>({});
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DMSDoc | null>(null);

  useEffect(() => {
    if (!project_id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [typesRes, countsRes] = await Promise.all([
          fetch(`${DJANGO_API}/api/dms/projects/${project_id}/doc-types/`),
          fetch(`/api/dms/filters/counts?project_id=${project_id}`),
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

        // Sort by display_order then name
        merged.sort((a, b) => {
          const ao = a.display_order ?? 999;
          const bo = b.display_order ?? 999;
          if (ao !== bo) return ao - bo;
          return a.doc_type_name.localeCompare(b.doc_type_name);
        });

        if (!cancelled) setDocTypes(merged);
      } catch (err) {
        console.error('[DocumentsPanel] failed to load doc types', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [project_id]);

  const totalCount = useMemo(
    () => docTypes.reduce((sum, t) => sum + (t.count ?? 0), 0),
    [docTypes]
  );

  const { leftCol, rightCol } = useMemo(() => {
    const mid = Math.ceil(docTypes.length / 2);
    return { leftCol: docTypes.slice(0, mid), rightCol: docTypes.slice(mid) };
  }, [docTypes]);

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

  return (
    <div className={`w-doc-layout${selectedDoc ? ' has-detail' : ''}`}>
      <div className="w-panel w-panel-main">
      <div className="w-panel-head">
        <span className="w-panel-head-title">Project Documents</span>
      </div>
      <div className="w-doc-toolbar">
            <span className="w-doc-toolbar-selection">
              <span className="w-doc-toolbar-chev">▼</span> {totalCount} items | 0 selected
            </span>
            <button className="w-doc-toolbar-btn" disabled>🗑 View Trash</button>
            <button className="w-doc-toolbar-btn" disabled>✏️ Rename</button>
            <button className="w-doc-toolbar-btn" disabled>↗ Move/Copy</button>
            <button className="w-doc-toolbar-btn" disabled>🔗 Share</button>
            <button className="w-doc-toolbar-btn" disabled>✏️ Edit profile</button>
          </div>

          {loading ? (
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
                    />
                  ))}
                </div>
              )}
            </div>
          )}

      <div className="w-doc-add">+ Add Type</div>
      </div>
      {selectedDoc && (
        <div className="w-panel w-panel-detail">
          <DocumentDetailPanel doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
        </div>
      )}
    </div>
  );
}

function DocTypeRowView({
  row,
  expanded,
  onExpand,
  docs,
  loading,
  selectedDocId,
  onSelectDoc,
}: {
  row: DocTypeWithCount;
  expanded: boolean;
  onExpand: () => void;
  docs?: DMSDoc[];
  loading?: boolean;
  selectedDocId: string | null;
  onSelectDoc: (doc: DMSDoc) => void;
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
                const isSelected = selectedDocId === d.doc_id;
                return (
                  <li
                    key={d.doc_id}
                    className={`w-doc-type-list-item${isSelected ? ' is-selected' : ''}`}
                    onClick={() => onSelectDoc(d)}
                  >
                    <span className="w-doc-type-list-check" aria-hidden />
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
