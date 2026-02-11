'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { CCard, CCardHeader, CCardBody } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilLayers, cilTrash, cilActionRedo } from '@coreui/icons';
import AccordionFilters, { type FilterAccordion } from '@/components/dms/filters/AccordionFilters';
import DocumentPreviewPanel from '@/components/dms/views/DocumentPreviewPanel';
import ProfileForm from '@/components/dms/profile/ProfileForm';
import { DeleteConfirmModal, RenameModal, RestoreConfirmModal } from '@/components/dms/modals';
import MediaPreviewModal from '@/components/dms/modals/MediaPreviewModal';
import type { DMSDocument } from '@/types/dms';

interface DMSViewProps {
  projectId: number;
  projectName: string;
  projectType?: string | null;
}

export default function DMSView({
  projectId,
  projectName,
  projectType = null
}: DMSViewProps) {
  const defaultWorkspaceId = 1;

  // Documents state
  const [selectedDocument, setSelectedDocument] = useState<DMSDocument | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false);
  const [allFilters, setAllFilters] = useState<FilterAccordion[]>([]);
  const [expandedFilter, setExpandedFilter] = useState<string | null>(null);
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);

  // Trash view state
  const [viewingTrash, setViewingTrash] = useState(false);
  const [trashedDocuments, setTrashedDocuments] = useState<DMSDocument[]>([]);
  const [trashCount, setTrashCount] = useState(0);
  const [isLoadingTrash, setIsLoadingTrash] = useState(false);

  const [panelExpanded, setPanelExpanded] = useState(true);

  // Media preview modal state
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const [mediaPreviewDocId, setMediaPreviewDocId] = useState<number | null>(null);
  const [mediaPreviewDocName, setMediaPreviewDocName] = useState<string>('');

  // Fetch filter data
  useEffect(() => {
    if (projectId) {
      void loadFilters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, projectType]);

  const loadFilters = async () => {
    setIsLoadingFilters(true);
    try {
      const docTypeParams = new URLSearchParams({
        project_id: projectId.toString(),
        workspace_id: defaultWorkspaceId.toString()
      });
      if (projectType) {
        docTypeParams.append('project_type', projectType);
      }

      const [docTypesResponse, countsResponse] = await Promise.all([
        fetch(`/api/dms/templates/doc-types?${docTypeParams.toString()}`),
        fetch(`/api/dms/filters/counts?project_id=${projectId}`)
      ]);

      let docTypeOptions: string[] = [];
      if (docTypesResponse.ok) {
        const data = await docTypesResponse.json();
        docTypeOptions = Array.isArray(data.doc_type_options) ? data.doc_type_options : [];
      }

      if (!countsResponse.ok) {
        throw new Error('Failed to fetch filter counts');
      }

      const { doc_type_counts } = await countsResponse.json();
      const countEntries: Array<{ doc_type: string; count: number }> = Array.isArray(doc_type_counts)
        ? doc_type_counts
        : [];

      const totalDocCount = countEntries.reduce((sum, entry) => sum + (entry.count ?? 0), 0);

      // If no documents are profiled yet, fall back to the "valuation" template filters when available
      if (totalDocCount === 0) {
        try {
          const valuationParams = new URLSearchParams(docTypeParams);
          valuationParams.set('project_type', 'valuation');
          const valuationResponse = await fetch(`/api/dms/templates/doc-types?${valuationParams.toString()}`);
          if (valuationResponse.ok) {
            const valuationData = await valuationResponse.json();
            const valuationOptions = Array.isArray(valuationData.doc_type_options) ? valuationData.doc_type_options : [];
            if (valuationOptions.length > 0) {
              docTypeOptions = valuationOptions;
            }
          }
        } catch (valuationError) {
          console.error('Fallback valuation template fetch failed:', valuationError);
        }
      }

      const countMap = new Map<string, number>();
      countEntries.forEach(({ doc_type, count }) => {
        if (doc_type) {
          countMap.set(doc_type, count);
          countMap.set(doc_type.toLowerCase(), count);
        }
      });

      const templateFilters = docTypeOptions.map((type: string) => {
        const normalized = type.toLowerCase();
        const count =
          countMap.get(type) ??
          countMap.get(normalized) ??
          0;

        return {
          doc_type: type,
          icon: '📁',
          count,
          is_expanded: false,
          documents: []
        };
      });

      const templateSet = new Set(docTypeOptions.map(type => type.toLowerCase()));
      const extraFilters = countEntries
        .filter(({ doc_type }) => doc_type && !templateSet.has(doc_type.toLowerCase()))
        .map(({ doc_type, count }) => ({
          doc_type,
          icon: '📁',
          count: count ?? 0,
          is_expanded: false,
          documents: []
        }));

      setAllFilters([...templateFilters, ...extraFilters]);
      setExpandedFilter(null);
    } catch (error) {
      console.error('Error loading filters:', error);
      setAllFilters([]);
    } finally {
      setIsLoadingFilters(false);
    }
  };

  const totalItemCount = useMemo(() => {
    return allFilters.reduce((sum, f) => sum + (Number.isFinite(f.count) ? f.count : 0), 0);
  }, [allFilters]);

  // Split filters into two columns
  const leftColumnFilters = useMemo(() => {
    return allFilters.slice(0, Math.ceil(allFilters.length / 2));
  }, [allFilters]);

  const rightColumnFilters = useMemo(() => {
    return allFilters.slice(Math.ceil(allFilters.length / 2));
  }, [allFilters]);

  // Handle accordion expand/collapse
  const handleAccordionExpand = async (docType: string) => {
    if (expandedFilter === docType) {
      setExpandedFilter(null);
      setAllFilters((prev) =>
        prev.map((f) => ({ ...f, is_expanded: false, documents: [] }))
      );
      return;
    }

    setAllFilters((prev) => prev.map((f) => ({ ...f, is_expanded: false })));
    setExpandedFilter(docType);

    try {
      const response = await fetch(
        `/api/dms/search?project_id=${projectId}&doc_type=${encodeURIComponent(docType)}&limit=20`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();

      setAllFilters((prev) =>
        prev.map((f) =>
          f.doc_type === docType
            ? { ...f, is_expanded: true, documents: data.results || [] }
            : f
        )
      );
    } catch (error) {
      console.error('Error fetching documents for filter:', error);
    }
  };

  // Handle document selection from accordion - opens preview panel for single doc
  const handleDocumentSelect = (doc: DMSDocument) => {
    setSelectedDocument(doc);
  };

  // Handle closing document preview
  const handleCloseDocumentPreview = () => {
    setSelectedDocument(null);
  };

  // Handle opening media preview modal from document row
  const handleReviewMedia = (docId: number, docName: string) => {
    setMediaPreviewDocId(docId);
    setMediaPreviewDocName(docName);
    setShowMediaPreview(true);
  };

  // Handle document changes (refresh filters)
  const handleDocumentChange = () => {
    void loadFilters();
    if (viewingTrash) {
      void loadTrashedDocuments();
    }
    setSelectedDocument(null);
    setSelectedDocIds(new Set());
  };

  // Load trashed documents
  const loadTrashedDocuments = async () => {
    setIsLoadingTrash(true);
    try {
      const response = await fetch(
        `/api/dms/search?project_id=${projectId}&include_deleted=true&deleted_only=true&limit=100`
      );
      if (response.ok) {
        const data = await response.json();
        setTrashedDocuments(data.results || []);
        setTrashCount(data.totalHits || data.results?.length || 0);
      }
    } catch (error) {
      console.error('Error loading trashed documents:', error);
      setTrashedDocuments([]);
    } finally {
      setIsLoadingTrash(false);
    }
  };

  // Toggle trash view
  const handleToggleTrashView = () => {
    const newViewingTrash = !viewingTrash;
    setViewingTrash(newViewingTrash);
    setSelectedDocIds(new Set());
    setSelectedDocument(null);
    if (newViewingTrash) {
      void loadTrashedDocuments();
    }
  };

  // Get all documents from expanded filters for selection/deletion
  const allDocuments = useMemo(() => {
    if (viewingTrash) {
      return trashedDocuments;
    }
    return allFilters.flatMap((f) => f.documents || []);
  }, [allFilters, viewingTrash, trashedDocuments]);

  // Get selected documents for delete modal
  const selectedDocuments = useMemo(() => {
    return allDocuments.filter((doc) => selectedDocIds.has(doc.doc_id));
  }, [allDocuments, selectedDocIds]);

  // Get selected trashed documents for restore/permanent delete
  const selectedTrashedDocuments = useMemo(() => {
    if (!viewingTrash) return [];
    return trashedDocuments.filter((doc) => selectedDocIds.has(doc.doc_id));
  }, [trashedDocuments, selectedDocIds, viewingTrash]);

  // Get first selected document (for single-select actions like rename/edit profile)
  const firstSelectedDoc = useMemo(() => {
    if (selectedDocIds.size !== 1) return null;
    const docId = Array.from(selectedDocIds)[0];
    return allDocuments.find((doc) => doc.doc_id === docId) || null;
  }, [allDocuments, selectedDocIds]);

  // Handle bulk delete (move to trash)
  const handleBulkDelete = async () => {
    const errors: string[] = [];

    for (const doc of selectedDocuments) {
      try {
        const response = await fetch(
          `/api/projects/${projectId}/dms/docs/${doc.doc_id}/delete`,
          { method: 'DELETE' }
        );
        if (!response.ok) {
          const data = await response.json();
          errors.push(`${doc.doc_name}: ${data.error || 'Delete failed'}`);
        }
      } catch (error) {
        errors.push(`${doc.doc_name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (errors.length > 0) {
      console.error('Bulk delete errors:', errors);
    }

    setSelectedDocIds(new Set());
    setShowDeleteModal(false);
    void loadFilters();
  };

  // Handle bulk restore from trash
  const handleBulkRestore = async () => {
    const errors: string[] = [];

    for (const doc of selectedTrashedDocuments) {
      try {
        const response = await fetch(
          `/api/projects/${projectId}/dms/docs/${doc.doc_id}/restore`,
          { method: 'POST' }
        );
        if (!response.ok) {
          const data = await response.json();
          errors.push(`${doc.doc_name}: ${data.error || 'Restore failed'}`);
        }
      } catch (error) {
        errors.push(`${doc.doc_name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (errors.length > 0) {
      console.error('Bulk restore errors:', errors);
    }

    setSelectedDocIds(new Set());
    setShowRestoreModal(false);
    void loadTrashedDocuments();
    void loadFilters();
  };

  // Handle bulk permanent delete
  const handleBulkPermanentDelete = async () => {
    const errors: string[] = [];

    for (const doc of selectedTrashedDocuments) {
      try {
        const response = await fetch(
          `/api/projects/${projectId}/dms/docs/${doc.doc_id}/permanent-delete`,
          { method: 'DELETE' }
        );
        if (!response.ok) {
          const data = await response.json();
          errors.push(`${doc.doc_name}: ${data.error || 'Permanent delete failed'}`);
        }
      } catch (error) {
        errors.push(`${doc.doc_name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (errors.length > 0) {
      console.error('Bulk permanent delete errors:', errors);
    }

    setSelectedDocIds(new Set());
    setShowPermanentDeleteModal(false);
    void loadTrashedDocuments();
  };

  // Handle rename for single selected document
  const handleRename = async (newName: string) => {
    if (!firstSelectedDoc) return;

    const response = await fetch(
      `/api/projects/${projectId}/dms/docs/${firstSelectedDoc.doc_id}/rename`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_name: newName }),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to rename document');
    }

    setShowRenameModal(false);
    setSelectedDocIds(new Set());
    void loadFilters();
  };

  // Handle profile save for single selected document
  const handleEditProfileSave = async (profile: Record<string, unknown>) => {
    if (!firstSelectedDoc) return;

    const response = await fetch(`/api/dms/documents/${firstSelectedDoc.doc_id}/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile }),
    });

    if (!response.ok) {
      throw new Error('Failed to save profile');
    }

    setShowProfileModal(false);
    setSelectedDocIds(new Set());
    void loadFilters();
  };

  // Toggle document selection
  const handleToggleDocSelection = (docId: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
      {/* Main Content */}
      <div className="flex-1 overflow-hidden" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
        <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
          <div className="px-3 lg:px-4 py-4 lg:py-6">
            <CCard className="mb-3 shadow-sm">
              <CCardHeader
                onClick={() => setPanelExpanded((prev) => !prev)}
                style={{ cursor: 'pointer', userSelect: 'none' }}
                className="d-flex align-items-center justify-content-between py-2"
              >
                <div className="d-flex align-items-center gap-2">
                  <span style={{ fontSize: '0.75rem', transition: 'transform 0.2s', transform: panelExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>&#9654;</span>
                  <strong>Project Documents</strong>
                  <span className="text-body-secondary" style={{ fontSize: '0.8rem' }}>
                    {totalItemCount} items
                  </span>
                </div>
                <div className="d-flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <a
                    href="/dms"
                    className="px-3 py-1 rounded border transition-colors"
                    style={{
                      borderColor: 'var(--cui-border-color)',
                      color: 'var(--cui-primary)',
                      fontSize: '0.85rem',
                      textDecoration: 'none'
                    }}
                  >
                    Open Global DMS
                  </a>
                  <a
                    href={`/projects/${projectId}/documents?tab=upload`}
                    className="px-3 py-1 rounded text-white"
                    style={{ backgroundColor: 'var(--cui-primary)', fontSize: '0.85rem', textDecoration: 'none' }}
                  >
                    Upload Documents
                  </a>
                </div>
              </CCardHeader>
              {panelExpanded && (
                <CCardBody className="p-0">
                  <div style={{ backgroundColor: 'var(--cui-body-bg)' }}>
                  {/* Breadcrumb */}
                  <div className="px-6 py-2 border-b" style={{ borderColor: 'var(--cui-border-color)', backgroundColor: 'var(--cui-body-bg)' }}>
                    <div className="flex items-center gap-2 text-sm">
                      <button style={{ color: 'var(--cui-primary)' }} className="hover:underline">Home</button>
                      <span style={{ color: 'var(--cui-secondary-color)' }}>{'>'}</span>
                      <button style={{ color: 'var(--cui-primary)' }} className="hover:underline">Projects</button>
                      <span style={{ color: 'var(--cui-secondary-color)' }}>{'>'}</span>
                      <span className="truncate" style={{ color: 'var(--cui-body-color)' }}>
                        {projectName}
                      </span>
                    </div>
                  </div>

                  {/* Toolbar */}
                  <div className="px-4 py-1 border-b" style={{ borderColor: 'var(--cui-border-color)', backgroundColor: 'var(--cui-body-bg)' }}>
                    <div className="flex items-center gap-3">
                      <button style={{ color: 'var(--cui-primary)', fontSize: '0.75rem' }}>🔻</button>
                      <span style={{ color: 'var(--cui-secondary-color)', fontSize: '0.8rem' }}>
                        {viewingTrash ? `${trashCount} in trash` : `${totalItemCount} items`} | {selectedDocIds.size} selected
                      </span>

                      {/* Trash view actions */}
                      {viewingTrash ? (
                        <>
                          {selectedDocIds.size > 0 && (
                            <>
                              <button
                                type="button"
                                onClick={() => setShowRestoreModal(true)}
                                className="px-3 py-1 text-xs rounded-md text-white flex items-center gap-1"
                                style={{ backgroundColor: 'var(--cui-success)' }}
                              >
                                <CIcon icon={cilActionRedo} className="w-3 h-3" />
                                Restore ({selectedDocIds.size})
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowPermanentDeleteModal(true)}
                                className="px-3 py-1 text-xs rounded-md text-white flex items-center gap-1"
                                style={{ backgroundColor: 'var(--cui-danger)' }}
                              >
                                <CIcon icon={cilTrash} className="w-3 h-3" />
                                Delete Permanently ({selectedDocIds.size})
                              </button>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          {selectedDocIds.size > 0 && (
                            <button
                              type="button"
                              onClick={() => setShowDeleteModal(true)}
                              className="px-3 py-1 text-xs rounded-md text-white flex items-center gap-1"
                              style={{ backgroundColor: 'var(--cui-warning)' }}
                            >
                              <CIcon icon={cilTrash} className="w-3 h-3" />
                              Move to Trash ({selectedDocIds.size})
                            </button>
                          )}
                        </>
                      )}

                      <div className="ml-auto flex items-center gap-3 text-sm">
                        {/* Trash toggle button */}
                        <button
                          className="hover:opacity-70 flex items-center gap-1"
                          style={{ color: viewingTrash ? 'var(--cui-warning)' : 'var(--cui-secondary-color)' }}
                          onClick={handleToggleTrashView}
                        >
                          <CIcon icon={cilTrash} className="w-4 h-4" />
                          {viewingTrash ? 'Exit Trash' : 'View Trash'}
                        </button>

                        {/* Normal view actions - hidden when viewing trash */}
                        {!viewingTrash && (
                          <>
                            <button
                              className={`hover:opacity-70 ${selectedDocIds.size !== 1 ? 'cursor-not-allowed opacity-50' : ''}`}
                              style={{ color: 'var(--cui-secondary-color)' }}
                              disabled={selectedDocIds.size !== 1}
                              onClick={() => selectedDocIds.size === 1 && setShowRenameModal(true)}
                            >
                              ✏️ Rename
                            </button>
                            <button
                              className={`hover:opacity-70 flex items-center gap-1 ${selectedDocIds.size !== 1 ? 'cursor-not-allowed opacity-50' : ''}`}
                              style={{ color: 'var(--cui-secondary-color)' }}
                              disabled={selectedDocIds.size !== 1}
                              onClick={() => selectedDocIds.size === 1 && alert('Move/Copy coming soon')}
                            >
                              <CIcon icon={cilLayers} className="w-4 h-4" />
                              Move/Copy
                            </button>
                            <button className="hover:opacity-70 cursor-not-allowed opacity-50" style={{ color: 'var(--cui-secondary-color)' }} disabled>
                              📧 Email copy
                            </button>
                            <button
                              className={`hover:opacity-70 ${selectedDocIds.size !== 1 ? 'cursor-not-allowed opacity-50' : ''}`}
                              style={{ color: 'var(--cui-secondary-color)' }}
                              disabled={selectedDocIds.size !== 1}
                              onClick={() => selectedDocIds.size === 1 && setShowProfileModal(true)}
                            >
                              ✏️ Edit profile
                            </button>
                            <button className="hover:opacity-70" style={{ color: 'var(--cui-secondary-color)' }}>
                              ⋯ More
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 relative flex flex-col lg:flex-row overflow-hidden" style={{ backgroundColor: 'var(--cui-body-bg)' }}>
                    <div className={`flex-1 overflow-y-auto ${selectedDocument ? 'lg:flex-1' : 'w-full'}`}>
                      <div className="p-4 lg:p-6" style={{ backgroundColor: 'var(--cui-body-bg)' }}>
                        {viewingTrash ? (
                          /* Trash View */
                          isLoadingTrash ? (
                            <div className="flex items-center justify-center h-64">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--cui-primary)' }}></div>
                              <span className="ml-3" style={{ color: 'var(--cui-secondary-color)' }}>Loading trash...</span>
                            </div>
                          ) : trashedDocuments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64" style={{ color: 'var(--cui-secondary-color)' }}>
                              <CIcon icon={cilTrash} className="w-8 h-8 mb-3" />
                              <p className="text-sm">Trash is empty</p>
                            </div>
                          ) : (
                            <div style={{ backgroundColor: 'var(--cui-body-bg)' }}>
                              <div className="mb-4 p-3 rounded border" style={{ borderColor: 'var(--cui-warning)', backgroundColor: 'var(--cui-warning-bg)' }}>
                                <p className="text-sm" style={{ color: 'var(--cui-warning)' }}>
                                  Documents in trash can be restored or permanently deleted. Permanent deletion cannot be undone.
                                </p>
                              </div>
                              <div className="space-y-2">
                                {trashedDocuments.map((doc) => (
                                  <div
                                    key={doc.doc_id}
                                    className="flex items-center gap-3 px-4 py-3 rounded border cursor-pointer transition-colors"
                                    style={{
                                      borderColor: selectedDocIds.has(doc.doc_id) ? 'var(--cui-primary)' : 'var(--cui-border-color)',
                                      backgroundColor: selectedDocIds.has(doc.doc_id) ? 'var(--cui-primary-bg)' : 'var(--cui-body-bg)'
                                    }}
                                    onClick={() => handleToggleDocSelection(doc.doc_id)}
                                  >
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 rounded"
                                      style={{ borderColor: 'var(--cui-border-color)' }}
                                      checked={selectedDocIds.has(doc.doc_id)}
                                      onChange={() => handleToggleDocSelection(doc.doc_id)}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <CIcon icon={cilTrash} className="w-5 h-5" style={{ color: 'var(--cui-warning)' }} />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate" style={{ color: 'var(--cui-body-color)' }}>
                                        {doc.doc_name}
                                      </div>
                                      <div className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
                                        {doc.doc_type || 'Unknown type'} • Deleted {doc.deleted_at ? new Date(doc.deleted_at).toLocaleDateString() : 'recently'}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        ) : (
                          /* Normal Document View */
                          isLoadingFilters ? (
                            <div className="flex items-center justify-center h-64">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--cui-primary)' }}></div>
                              <span className="ml-3" style={{ color: 'var(--cui-secondary-color)' }}>Loading filters...</span>
                            </div>
                          ) : allFilters.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64" style={{ color: 'var(--cui-secondary-color)' }}>
                              <CIcon icon={cilLayers} className="w-8 h-8 mb-3" />
                              <p className="text-sm">No documents found in this project</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2" style={{ backgroundColor: 'var(--cui-body-bg)' }}>
                              {/* Left Column */}
                              <div className="border-r" style={{ borderColor: 'var(--cui-border-color)' }}>
                                <AccordionFilters
                                  projectId={projectId}
                                  workspaceId={defaultWorkspaceId}
                                  filters={leftColumnFilters}
                                  onExpand={handleAccordionExpand}
                                  onDocumentSelect={handleDocumentSelect}
                                  expandedFilter={expandedFilter}
                                  onUploadComplete={handleDocumentChange}
                                  selectedDocIds={selectedDocIds}
                                  onToggleDocSelection={handleToggleDocSelection}
                                  onReviewMedia={handleReviewMedia}
                                />
                              </div>

                              {/* Right Column */}
                              <div>
                                <AccordionFilters
                                  projectId={projectId}
                                  workspaceId={defaultWorkspaceId}
                                  filters={rightColumnFilters}
                                  onExpand={handleAccordionExpand}
                                  onDocumentSelect={handleDocumentSelect}
                                  expandedFilter={expandedFilter}
                                  onUploadComplete={handleDocumentChange}
                                  selectedDocIds={selectedDocIds}
                                  onToggleDocSelection={handleToggleDocSelection}
                                  onReviewMedia={handleReviewMedia}
                                />
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    {/* Single document preview panel */}
                    {selectedDocument && (
                      <>
                        <div
                          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
                          onClick={handleCloseDocumentPreview}
                          role="presentation"
                        />
                        <div
                          className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l shadow-xl lg:static lg:z-auto lg:max-w-none lg:w-[480px]"
                          style={{ borderColor: 'var(--cui-border-color)', backgroundColor: 'var(--cui-body-bg)' }}
                        >
                          <DocumentPreviewPanel
                            projectId={projectId}
                            document={selectedDocument}
                            onClose={handleCloseDocumentPreview}
                            onDocumentChange={handleDocumentChange}
                          />
                        </div>
                      </>
                    )}
                  </div>
                  </div>
                </CCardBody>
              )}
            </CCard>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {selectedDocIds.size > 0 && (
        <DeleteConfirmModal
          visible={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          documents={selectedDocuments.map((doc) => ({
            doc_id: parseInt(doc.doc_id, 10),
            doc_name: doc.doc_name
          }))}
          projectId={projectId}
          onDelete={handleBulkDelete}
        />
      )}

      {/* Rename Modal */}
      {firstSelectedDoc && (
        <RenameModal
          visible={showRenameModal}
          onClose={() => setShowRenameModal(false)}
          docId={parseInt(firstSelectedDoc.doc_id, 10)}
          projectId={projectId}
          currentName={firstSelectedDoc.doc_name}
          onRename={handleRename}
        />
      )}

      {/* Edit Profile Modal */}
      {firstSelectedDoc && showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="w-full max-w-lg mx-4 rounded-lg shadow-xl overflow-hidden"
            style={{ backgroundColor: 'var(--cui-body-bg)' }}
          >
            <div
              className="px-6 py-4 border-b"
              style={{ borderColor: 'var(--cui-border-color)' }}
            >
              <h3 className="text-lg font-semibold" style={{ color: 'var(--cui-body-color)' }}>
                Edit Profile: {firstSelectedDoc.doc_name}
              </h3>
            </div>
            <div className="p-6">
              <ProfileForm
                docId={parseInt(firstSelectedDoc.doc_id, 10)}
                projectId={projectId}
                workspaceId={defaultWorkspaceId}
                docType={firstSelectedDoc.doc_type || 'general'}
                projectType={projectType}
                initialProfile={(firstSelectedDoc.profile_json as Record<string, unknown>) || {}}
                onSave={handleEditProfileSave}
                onCancel={() => setShowProfileModal(false)}
                onSuccess={() => {
                  setShowProfileModal(false);
                  setSelectedDocIds(new Set());
                  void loadFilters();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {selectedTrashedDocuments.length > 0 && (
        <RestoreConfirmModal
          visible={showRestoreModal}
          onClose={() => setShowRestoreModal(false)}
          documents={selectedTrashedDocuments.map((doc) => ({
            doc_id: parseInt(doc.doc_id, 10),
            doc_name: doc.doc_name
          }))}
          projectId={projectId}
          onRestore={handleBulkRestore}
        />
      )}

      {/* Permanent Delete Confirmation Modal */}
      {selectedTrashedDocuments.length > 0 && (
        <DeleteConfirmModal
          visible={showPermanentDeleteModal}
          onClose={() => setShowPermanentDeleteModal(false)}
          documents={selectedTrashedDocuments.map((doc) => ({
            doc_id: parseInt(doc.doc_id, 10),
            doc_name: doc.doc_name
          }))}
          projectId={projectId}
          onDelete={handleBulkPermanentDelete}
          isPermanentDelete={true}
        />
      )}

      {/* Media Preview Modal */}
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
            // Refresh filters to update media counts
            void loadFilters();
          }}
        />
      )}
    </div>
  );
}
