'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { CCard, CCardHeader, CCardBody, CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter, CButton, CFormInput, CFormLabel } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilLayers, cilTrash, cilActionRedo, cilPlus } from '@coreui/icons';
import AccordionFilters, { type FilterAccordion } from '@/components/dms/filters/AccordionFilters';
import DocumentPreviewPanel from '@/components/dms/views/DocumentPreviewPanel';
import DmsLandscaperPanel, { type DmsPendingVersionLink } from '@/components/dms/panels/DmsLandscaperPanel';
import ProfileForm from '@/components/dms/profile/ProfileForm';
import { DeleteConfirmModal, RenameModal, RestoreConfirmModal } from '@/components/dms/modals';
import MediaPreviewModal from '@/components/dms/modals/MediaPreviewModal';
import StagingTray from '@/components/dms/staging/StagingTray';
import IntakeChoiceModal from '@/components/intelligence/IntakeChoiceModal';
import { UploadStagingProvider, useUploadStaging } from '@/contexts/UploadStagingContext';
import type { DMSDocument } from '@/types/dms';
import { useToast } from '@/hooks/use-toast';

interface DMSViewProps {
  projectId: number;
  projectName: string;
  projectType?: string | null;
}

async function parseJsonSafely<T>(response: Response, context: string): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  const raw = await response.text();
  if (!raw) return {} as T;

  if (!contentType.toLowerCase().includes('application/json')) {
    const preview = raw.slice(0, 120).replace(/\s+/g, ' ').trim();
    throw new Error(`${context}: expected JSON, received ${contentType || 'unknown'} (${response.status}). ${preview}`);
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    const preview = raw.slice(0, 120).replace(/\s+/g, ' ').trim();
    throw new Error(`${context}: invalid JSON response (${response.status}). ${preview}`);
  }
}

const DJANGO_API = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

export default function DMSView(props: DMSViewProps) {
  return (
    <UploadStagingProvider projectId={props.projectId} workspaceId={1}>
      <DMSViewInner {...props} />
    </UploadStagingProvider>
  );
}

function DMSViewInner({
  projectId,
  projectName,
  projectType = null
}: DMSViewProps) {
  const defaultWorkspaceId = 1;
  const { showToast } = useToast();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const { stageFiles, setDocTypes, stagedFiles, pendingIntakeDocs, clearPendingIntakeDocs } = useUploadStaging();
  const prevHadStagedRef = useRef(false);

  // "+ Add Type" modal state
  const [isAddTypeModalOpen, setIsAddTypeModalOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [addTypeError, setAddTypeError] = useState<string | null>(null);
  const [isSubmittingType, setIsSubmittingType] = useState(false);

  // Save-to-template prompt state
  const [saveToTemplatePrompt, setSaveToTemplatePrompt] = useState<{
    typeName: string;
    templateId: number;
    templateName: string;
  } | null>(null);
  const [isSavingToTemplate, setIsSavingToTemplate] = useState(false);

  // Project's assigned template info
  const [projectTemplate, setProjectTemplate] = useState<{
    template_id: number;
    template_name: string;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/dms/doc-types`)
      .then(res => res.json())
      .then(data => {
        if (data.template_id && data.template_name) {
          setProjectTemplate({ template_id: data.template_id, template_name: data.template_name });
        }
      })
      .catch(err => console.error('Failed to fetch project template info:', err));
  }, [projectId]);

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
  const [pendingVersionLink, setPendingVersionLink] = useState<DmsPendingVersionLink | null>(null);
  const [isLandscaperFiltering, setIsLandscaperFiltering] = useState(false);
  const [landscaperNotice, setLandscaperNotice] = useState<string | null>(null);
  const selectAllTrashRef = useRef<HTMLInputElement>(null);

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
      // Try Django project doc-types API first (returns merged template + custom types)
      // Falls back to legacy Next.js template API if Django is unavailable
      let docTypeItems: Array<{ doc_type_name: string; is_from_template: boolean; id?: number }> = [];
      let usedDjangoApi = false;

      try {
        const djangoResponse = await fetch(`${DJANGO_API}/api/dms/projects/${projectId}/doc-types/`);
        if (djangoResponse.ok) {
          const djangoData = await parseJsonSafely<{
            success?: boolean;
            doc_types?: Array<{ doc_type_name: string; is_from_template: boolean; id?: number; display_order?: number }>
          }>(djangoResponse, 'django/project-doc-types');
          if (djangoData.success && Array.isArray(djangoData.doc_types) && djangoData.doc_types.length > 0) {
            docTypeItems = djangoData.doc_types;
            usedDjangoApi = true;
          }
        }
      } catch {
        // Django unavailable — fall through to legacy
      }

      if (!usedDjangoApi) {
        // Legacy: load from Next.js template API
        const docTypeParams = new URLSearchParams({
          project_id: projectId.toString(),
          workspace_id: defaultWorkspaceId.toString()
        });
        if (projectType) {
          docTypeParams.append('project_type', projectType);
        }

        const docTypesResponse = await fetch(`/api/dms/templates/doc-types?${docTypeParams.toString()}`);
        let docTypeOptions: string[] = [];
        if (docTypesResponse.ok) {
          const data = await parseJsonSafely<{ doc_type_options?: string[] }>(
            docTypesResponse,
            'dms/templates/doc-types'
          );
          docTypeOptions = Array.isArray(data.doc_type_options) ? data.doc_type_options : [];
        }

        docTypeItems = docTypeOptions.map(type => ({
          doc_type_name: type,
          is_from_template: true,
        }));
      }

      // Fetch document counts
      const countsResponse = await fetch(`/api/dms/filters/counts?project_id=${projectId}`);
      if (!countsResponse.ok) {
        throw new Error('Failed to fetch filter counts');
      }

      const countsPayload = await parseJsonSafely<{ doc_type_counts?: Array<{ doc_type: string; count: number }> }>(
        countsResponse,
        'dms/filters/counts'
      );
      const { doc_type_counts } = countsPayload;
      const countEntries: Array<{ doc_type: string; count: number }> = Array.isArray(doc_type_counts)
        ? doc_type_counts
        : [];

      const totalDocCount = countEntries.reduce((sum, entry) => sum + (entry.count ?? 0), 0);

      // If no documents and no Django types, fall back to "valuation" template
      if (totalDocCount === 0 && !usedDjangoApi) {
        try {
          const docTypeParams = new URLSearchParams({
            project_id: projectId.toString(),
            workspace_id: defaultWorkspaceId.toString(),
            project_type: 'valuation'
          });
          const valuationResponse = await fetch(`/api/dms/templates/doc-types?${docTypeParams.toString()}`);
          if (valuationResponse.ok) {
            const valuationData = await parseJsonSafely<{ doc_type_options?: string[] }>(
              valuationResponse,
              'dms/templates/doc-types valuation fallback'
            );
            const valuationOptions = Array.isArray(valuationData.doc_type_options) ? valuationData.doc_type_options : [];
            if (valuationOptions.length > 0) {
              docTypeItems = valuationOptions.map(type => ({
                doc_type_name: type,
                is_from_template: true,
              }));
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

      const typeFilters: FilterAccordion[] = docTypeItems.map((item) => {
        const normalized = item.doc_type_name.toLowerCase();
        const count =
          countMap.get(item.doc_type_name) ??
          countMap.get(normalized) ??
          0;

        return {
          doc_type: item.doc_type_name,
          icon: '📁',
          count,
          is_expanded: false,
          documents: [],
          is_from_template: item.is_from_template,
          custom_id: item.id,
        };
      });

      // Add any counted doc types not in the merged list
      const typeSet = new Set(docTypeItems.map(item => item.doc_type_name.toLowerCase()));
      const extraFilters = countEntries
        .filter(({ doc_type }) => doc_type && !typeSet.has(doc_type.toLowerCase()))
        .map(({ doc_type, count }) => ({
          doc_type,
          icon: '📁',
          count: count ?? 0,
          is_expanded: false,
          documents: [],
          is_from_template: true, // treat as template since it came from actual docs
        }));

      setAllFilters([...typeFilters, ...extraFilters]);
      setExpandedFilter(null);
    } catch (error) {
      console.error('Error loading filters:', error);
      setAllFilters([]);
    } finally {
      setIsLoadingFilters(false);
    }
  };

  // Sync doc types to staging context
  useEffect(() => {
    if (allFilters.length > 0) {
      setDocTypes(allFilters.map(f => f.doc_type));
    }
  }, [allFilters, setDocTypes]);

  // Refresh filters when all staged uploads complete
  useEffect(() => {
    const hasActive = stagedFiles.some(f => f.status !== 'complete' && f.status !== 'error');
    const hasCompleted = stagedFiles.some(f => f.status === 'complete');
    if (prevHadStagedRef.current && !hasActive && hasCompleted) {
      void loadFilters();
    }
    prevHadStagedRef.current = stagedFiles.length > 0 && hasActive;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stagedFiles]);

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

      const data = await parseJsonSafely<{ results?: DMSDocument[] }>(response, 'dms/search');

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

  type DocumentChangeOptions = {
    keepSelection?: boolean;
    updatedDoc?: DMSDocument;
  };

  // Handle document changes (refresh filters)
  const handleDocumentChange = (options?: DocumentChangeOptions) => {
    void loadFilters();
    if (viewingTrash) {
      void loadTrashedDocuments();
    }
    setSelectedDocIds(new Set());
    if (options?.keepSelection && options.updatedDoc) {
      setSelectedDocument(options.updatedDoc);
      return;
    }
    setSelectedDocument(null);
  };

  const handleLandscaperQuery = useCallback(
    async (query: string) => {
      setIsLandscaperFiltering(true);
      try {
        const response = await fetch(
          `/api/dms/search?q=${encodeURIComponent(query)}&project_id=${projectId}&limit=50`
        );
        if (!response.ok) {
          throw new Error('Search failed');
        }
        const data = await parseJsonSafely<{ totalHits?: number; pagination?: { limit?: number } }>(
          response,
          'dms/search from landscaper'
        );
        return {
          count: data.totalHits || 0,
          limit: data.pagination?.limit ?? null,
        };
      } finally {
        setIsLandscaperFiltering(false);
      }
    },
    [projectId]
  );

  const handleLandscaperClear = useCallback(() => {
    setLandscaperNotice(null);
  }, []);

  // Load trashed documents
  const loadTrashedDocuments = async () => {
    setIsLoadingTrash(true);
    try {
      const response = await fetch(
        `/api/dms/search?project_id=${projectId}&include_deleted=true&deleted_only=true&limit=100`
      );
      if (response.ok) {
        const data = await parseJsonSafely<{ results?: DMSDocument[]; totalHits?: number }>(
          response,
          'dms/search trash'
        );
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

  const documentLookup = useMemo(() => {
    return new Map(allDocuments.map((doc) => [doc.doc_id, doc]));
  }, [allDocuments]);

  // Get selected documents for delete modal
  const selectedDocuments = useMemo(() => {
    return allDocuments.filter((doc) => selectedDocIds.has(doc.doc_id));
  }, [allDocuments, selectedDocIds]);

  // Get selected trashed documents for restore/permanent delete
  const selectedTrashedDocuments = useMemo(() => {
    if (!viewingTrash) return [];
    return trashedDocuments.filter((doc) => selectedDocIds.has(doc.doc_id));
  }, [trashedDocuments, selectedDocIds, viewingTrash]);

  const selectedTrashCount = useMemo(() => {
    if (!viewingTrash) return 0;
    return trashedDocuments.reduce((count, doc) => count + (selectedDocIds.has(doc.doc_id) ? 1 : 0), 0);
  }, [trashedDocuments, selectedDocIds, viewingTrash]);

  const allTrashSelected = useMemo(() => {
    return viewingTrash && trashedDocuments.length > 0 && selectedTrashCount === trashedDocuments.length;
  }, [selectedTrashCount, trashedDocuments.length, viewingTrash]);

  useEffect(() => {
    if (!selectAllTrashRef.current) return;
    selectAllTrashRef.current.indeterminate = viewingTrash && selectedTrashCount > 0 && !allTrashSelected;
  }, [allTrashSelected, selectedTrashCount, viewingTrash]);

  // Get first selected document (for single-select actions like rename/edit profile)
  const firstSelectedDoc = useMemo(() => {
    if (selectedDocIds.size !== 1) return null;
    const docId = Array.from(selectedDocIds)[0];
    return allDocuments.find((doc) => doc.doc_id === docId) || null;
  }, [allDocuments, selectedDocIds]);

  const handleLinkVersionRequest = useCallback(
    (sourceDocId: string, targetDoc: DMSDocument) => {
      const sourceDoc = documentLookup.get(sourceDocId);
      if (!sourceDoc) {
        console.warn('[DMS] Drag source doc not found:', sourceDocId);
        return;
      }
      setPendingVersionLink({
        projectId,
        sourceDocId: sourceDoc.doc_id,
        sourceDocName: sourceDoc.doc_name,
        targetDocId: targetDoc.doc_id,
        targetDocName: targetDoc.doc_name,
      });
    },
    [documentLookup, projectId]
  );

  const handleResolveVersionLink = useCallback(
    async (action: 'confirm' | 'cancel', link: DmsPendingVersionLink) => {
      if (action === 'cancel') {
        setPendingVersionLink(null);
        return;
      }

      const response = await fetch(
        `/api/projects/${projectId}/dms/docs/${link.targetDocId}/link-version`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source_doc_id: link.sourceDocId }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DMS] Link version failed:', errorText);
        throw new Error('Failed to link version');
      }

      setPendingVersionLink(null);
      handleDocumentChange();
    },
    [handleDocumentChange, projectId]
  );

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
          const data = await parseJsonSafely<{ error?: string }>(response, 'dms/delete');
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
          const data = await parseJsonSafely<{ error?: string }>(response, 'dms/restore');
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
          const data = await parseJsonSafely<{ error?: string }>(response, 'dms/permanent-delete');
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
      const data = await parseJsonSafely<{ error?: string }>(response, 'dms/rename');
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

    // Detect doc_type change for toast notification
    const newDocType = profile.doc_type as string | undefined;
    const oldDocType = firstSelectedDoc.doc_type;
    if (newDocType && newDocType !== oldDocType) {
      const label = newDocType.charAt(0).toUpperCase() + newDocType.slice(1);
      showToast({
        title: 'Document Moved',
        message: `Document moved to ${label}`,
        type: 'success',
      });
    } else {
      showToast('Profile saved', 'success');
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

  const handleToggleAllTrashSelection = () => {
    if (!viewingTrash) return;
    if (allTrashSelected) {
      setSelectedDocIds(new Set());
      return;
    }
    setSelectedDocIds(new Set(trashedDocuments.map((doc) => doc.doc_id)));
  };

  // ─── "+ Add Type" modal handlers ─────────────────────────────────
  const handleOpenAddTypeModal = useCallback(() => {
    setNewTypeName('');
    setAddTypeError(null);
    setIsAddTypeModalOpen(true);
  }, []);

  const handleCloseAddTypeModal = useCallback(() => {
    setIsAddTypeModalOpen(false);
    setNewTypeName('');
    setAddTypeError(null);
  }, []);

  const handleSubmitAddType = useCallback(async () => {
    const trimmed = newTypeName.trim();
    if (!trimmed) {
      handleCloseAddTypeModal();
      return;
    }

    // Check for duplicate (case-insensitive)
    const existing = allFilters.find(
      (f) => f.doc_type.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      setAddTypeError('This type already exists');
      return;
    }

    setIsSubmittingType(true);
    setAddTypeError(null);

    try {
      const response = await fetch(`${DJANGO_API}/api/dms/projects/${projectId}/doc-types/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_type_name: trimmed }),
      });

      const data = await parseJsonSafely<{
        success?: boolean;
        existing?: boolean;
        doc_type?: { id: number; doc_type_name: string; is_from_template: boolean };
        error?: string;
      }>(response, 'django/project-doc-types POST');

      if (data.existing) {
        setAddTypeError('This type already exists');
        return;
      }

      if (!data.success || !data.doc_type) {
        setAddTypeError(data.error || 'Failed to create type');
        return;
      }

      // Add the new filter immediately
      const addedTypeName = data.doc_type!.doc_type_name;
      setAllFilters((prev) => [
        ...prev,
        {
          doc_type: addedTypeName,
          icon: '📁',
          count: 0,
          is_expanded: false,
          documents: [],
          is_from_template: false,
          custom_id: data.doc_type!.id,
        },
      ]);

      handleCloseAddTypeModal();

      // Show save-to-template prompt if project has an assigned template
      if (projectTemplate) {
        setSaveToTemplatePrompt({
          typeName: addedTypeName,
          templateId: projectTemplate.template_id,
          templateName: projectTemplate.template_name,
        });
      }
    } catch (error) {
      console.error('Error adding doc type:', error);
      setAddTypeError('Failed to add type');
    } finally {
      setIsSubmittingType(false);
    }
  }, [newTypeName, allFilters, projectId, handleCloseAddTypeModal, projectTemplate]);

  const handleDeleteFilter = useCallback(async (customId: number, docTypeName: string) => {
    try {
      const response = await fetch(
        `${DJANGO_API}/api/dms/projects/${projectId}/doc-types/${customId}/`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        // Remove from local state immediately
        setAllFilters((prev) => prev.filter((f) => !(f.custom_id === customId)));
        // If the deleted filter was expanded, collapse it
        if (expandedFilter === docTypeName) {
          setExpandedFilter(null);
        }
      } else {
        console.error('Failed to delete custom doc type:', response.status);
      }
    } catch (error) {
      console.error('Error deleting custom doc type:', error);
    }
  }, [projectId, expandedFilter]);

  // Save a custom doc type back to the project's template
  const handleSaveToTemplate = useCallback(async () => {
    if (!saveToTemplatePrompt) return;
    setIsSavingToTemplate(true);
    try {
      // Fetch current template to get existing doc_type_options, then append
      const getRes = await fetch('/api/dms/templates');
      const getData = await getRes.json();
      const currentTemplate = (getData.templates || []).find(
        (t: { template_id: number }) => t.template_id === saveToTemplatePrompt.templateId
      );

      if (!currentTemplate) {
        console.error('Template not found');
        setSaveToTemplatePrompt(null);
        return;
      }

      const currentOptions: string[] = currentTemplate.doc_type_options || [];
      const alreadyExists = currentOptions.some(
        (opt: string) => opt.toLowerCase() === saveToTemplatePrompt.typeName.toLowerCase()
      );

      if (!alreadyExists) {
        const updatedOptions = [...currentOptions, saveToTemplatePrompt.typeName].sort(
          (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })
        );

        await fetch(`/api/dms/templates/${saveToTemplatePrompt.templateId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ doc_type_options: updatedOptions }),
        });
      }

      setSaveToTemplatePrompt(null);
    } catch (error) {
      console.error('Error saving to template:', error);
    } finally {
      setIsSavingToTemplate(false);
    }
  }, [saveToTemplatePrompt]);

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
                  <input
                    ref={uploadInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.xlsm,.csv,.jpg,.jpeg,.png,.gif,.txt"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) stageFiles(files);
                      e.target.value = '';
                    }}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                    className="px-3 py-1 rounded text-white"
                    style={{ backgroundColor: 'var(--cui-primary)', fontSize: '0.85rem', border: 'none', cursor: 'pointer' }}
                  >
                    Upload Documents
                  </button>
                </div>
              </CCardHeader>
              {panelExpanded && (
                <CCardBody className="p-0">
                  <div style={{ backgroundColor: 'var(--cui-body-bg)' }}>
                  {/* Breadcrumb */}
                  {!viewingTrash && (
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
                  )}

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

                  {/* DMS Landscaper Panel */}
                  <div
                    className="px-4 py-3 border-b"
                    style={{ borderColor: 'var(--cui-border-color)', backgroundColor: 'var(--cui-body-bg)' }}
                  >
                    <DmsLandscaperPanel
                      onDropFiles={() => {}}
                      onQuerySubmit={handleLandscaperQuery}
                      onClearQuery={handleLandscaperClear}
                      activeDocType={expandedFilter}
                      isFiltering={isLandscaperFiltering}
                      notice={landscaperNotice}
                      pendingLink={pendingVersionLink}
                      onResolveLink={handleResolveVersionLink}
                      onDocumentsUpdated={handleDocumentChange}
                    />
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
                              <div
                                className="px-4 py-2 border-b"
                                style={{
                                  borderColor: 'var(--cui-border-color)',
                                  backgroundColor: 'var(--cui-body-bg)'
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    ref={selectAllTrashRef}
                                    type="checkbox"
                                    className="h-4 w-4 rounded"
                                    style={{ borderColor: 'var(--cui-border-color)' }}
                                    checked={allTrashSelected}
                                    onChange={handleToggleAllTrashSelection}
                                  />
                                  <span className="text-xs font-semibold" style={{ color: 'var(--cui-secondary-color)' }}>
                                    Select all
                                  </span>
                                </div>
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
                            <div>
                              <div className="grid grid-cols-1 lg:grid-cols-2" style={{ backgroundColor: 'var(--cui-body-bg)' }}>
                                {/* Left Column */}
                                <div className="border-r" style={{ borderColor: 'var(--cui-border-color)' }}>
                                  <AccordionFilters
                                    filters={leftColumnFilters}
                                    onExpand={handleAccordionExpand}
                                    onDocumentSelect={handleDocumentSelect}
                                    expandedFilter={expandedFilter}
                                    selectedDocIds={selectedDocIds}
                                    onToggleDocSelection={handleToggleDocSelection}
                                    onReviewMedia={handleReviewMedia}
                                    onDeleteFilter={handleDeleteFilter}
                                    onLinkVersion={handleLinkVersionRequest}
                                  />
                                </div>

                                {/* Right Column */}
                                <div>
                                  <AccordionFilters
                                    filters={rightColumnFilters}
                                    onExpand={handleAccordionExpand}
                                    onDocumentSelect={handleDocumentSelect}
                                    expandedFilter={expandedFilter}
                                    selectedDocIds={selectedDocIds}
                                    onToggleDocSelection={handleToggleDocSelection}
                                    onReviewMedia={handleReviewMedia}
                                    onDeleteFilter={handleDeleteFilter}
                                    onLinkVersion={handleLinkVersionRequest}
                                  />
                                </div>
                              </div>

                              {/* + Add Type button */}
                              <div
                                className="px-4 py-2 border-t"
                                style={{
                                  borderColor: 'var(--cui-border-color)',
                                  backgroundColor: 'var(--cui-body-bg)'
                                }}
                              >
                                <button
                                  onClick={handleOpenAddTypeModal}
                                  className="flex items-center gap-1.5 text-sm py-1 transition-colors hover:opacity-80"
                                  style={{ color: 'var(--cui-secondary-color)' }}
                                >
                                  <CIcon icon={cilPlus} className="w-4 h-4" />
                                  + Add Type
                                </button>
                              </div>

                              {/* Add Type Modal */}
                              <CModal
                                visible={isAddTypeModalOpen}
                                onClose={handleCloseAddTypeModal}
                                alignment="center"
                                size="sm"
                              >
                                <CModalHeader>
                                  <CModalTitle>Add Document Type</CModalTitle>
                                </CModalHeader>
                                <CModalBody>
                                  <CFormLabel htmlFor="newDocTypeName">Type Name</CFormLabel>
                                  <CFormInput
                                    id="newDocTypeName"
                                    type="text"
                                    placeholder="e.g. Offering, Leases, Title & Survey"
                                    value={newTypeName}
                                    onChange={(e) => {
                                      setNewTypeName(e.target.value);
                                      if (addTypeError) setAddTypeError(null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        void handleSubmitAddType();
                                      }
                                    }}
                                    disabled={isSubmittingType}
                                    invalid={!!addTypeError}
                                    feedbackInvalid={addTypeError || undefined}
                                    autoFocus
                                  />
                                </CModalBody>
                                <CModalFooter>
                                  <CButton
                                    color="secondary"
                                    variant="ghost"
                                    onClick={handleCloseAddTypeModal}
                                    disabled={isSubmittingType}
                                  >
                                    Cancel
                                  </CButton>
                                  <CButton
                                    color="primary"
                                    onClick={() => void handleSubmitAddType()}
                                    disabled={isSubmittingType || !newTypeName.trim()}
                                  >
                                    {isSubmittingType ? 'Adding...' : 'Add Type'}
                                  </CButton>
                                </CModalFooter>
                              </CModal>

                              {/* Save-to-template prompt */}
                              {saveToTemplatePrompt && (
                                <div
                                  className="px-4 py-2 border-t text-sm"
                                  style={{
                                    borderColor: 'var(--cui-border-color)',
                                    backgroundColor: 'var(--cui-info-bg-subtle, var(--cui-tertiary-bg))',
                                  }}
                                >
                                  <p className="mb-2" style={{ color: 'var(--cui-body-color)' }}>
                                    Added &lsquo;{saveToTemplatePrompt.typeName}&rsquo; to this project.
                                    Save to <strong>{saveToTemplatePrompt.templateName}</strong> for future projects?
                                  </p>
                                  <div className="flex gap-2">
                                    <button
                                      className="px-3 py-1 rounded text-xs text-white"
                                      style={{ backgroundColor: 'var(--cui-primary)' }}
                                      disabled={isSavingToTemplate}
                                      onClick={() => void handleSaveToTemplate()}
                                    >
                                      {isSavingToTemplate ? 'Saving...' : 'Save to Template'}
                                    </button>
                                    <button
                                      className="px-3 py-1 rounded text-xs border"
                                      style={{
                                        borderColor: 'var(--cui-border-color)',
                                        color: 'var(--cui-body-color)',
                                      }}
                                      disabled={isSavingToTemplate}
                                      onClick={() => setSaveToTemplatePrompt(null)}
                                    >
                                      Keep Project Only
                                    </button>
                                  </div>
                                </div>
                              )}
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
                            folderDocType={expandedFilter || undefined}
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
                docType={firstSelectedDoc.doc_type || expandedFilter || 'general'}
                projectType={projectType}
                initialProfile={{
                  ...((firstSelectedDoc.profile_json as Record<string, unknown>) || {}),
                  doc_type: firstSelectedDoc.doc_type || expandedFilter || '',
                }}
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

      {/* Staging Tray */}
      <StagingTray />

      {/* Intake Choice Modal — appears when extract-route uploads complete */}
      <IntakeChoiceModal
        visible={pendingIntakeDocs.length > 0}
        projectId={projectId}
        docs={pendingIntakeDocs}
        onClose={clearPendingIntakeDocs}
      />
    </div>
  );
}
