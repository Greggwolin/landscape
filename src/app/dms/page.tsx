'use client';

// Force dynamic rendering for pages using useSearchParams
export const dynamic = 'force-dynamic';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DMSDocument, PlatformKnowledgeDocument } from '@/types/dms';
import DMSLayout from '@/components/dms/shared/DMSLayout';
import ProjectSelector from '@/components/dms/filters/ProjectSelector';
import DocTypeFilters from '@/components/dms/filters/DocTypeFilters';
import DocumentTable from '@/components/dms/list/DocumentTable';
import PlatformKnowledgeTable from '@/components/dms/list/PlatformKnowledgeTable';
import DocumentPreview from '@/components/dms/preview/DocumentPreview';
import { DocumentChatModal } from '@/components/dms/modals';
import DmsLandscaperPanel from '@/components/dms/panels/DmsLandscaperPanel';
import { useDropzone } from 'react-dropzone';
import TriageModal from '@/app/components/dashboard/TriageModal';
import NewProjectModal from '@/app/components/NewProjectModal';
import type { ProjectSummary } from '@/app/components/ProjectProvider';
import PlatformKnowledgeModal, { type PlatformKnowledgeMetadata } from '@/components/dms/modals/PlatformKnowledgeModal';

const PLATFORM_KNOWLEDGE_DOC_TYPE = 'Platform Knowledge';
const LANDSCAPER_COLLAPSE_KEY = 'landscape-dms-landscaper-collapsed';

function normalizeDocument(doc: any): DMSDocument {
  return {
    ...doc,
    doc_id: doc.doc_id?.toString() ?? '',
    project_id: doc.project_id !== null && doc.project_id !== undefined ? doc.project_id.toString() : null,
    workspace_id: doc.workspace_id !== null && doc.workspace_id !== undefined ? doc.workspace_id.toString() : null,
    phase_id: doc.phase_id !== null && doc.phase_id !== undefined ? doc.phase_id.toString() : null,
    parcel_id: doc.parcel_id !== null && doc.parcel_id !== undefined ? doc.parcel_id.toString() : null,
  } as DMSDocument;
}

function DMSPageContent() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const skipNextFetchRef = useRef(false);

  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DMSDocument[]>([]);
  const [platformDocuments, setPlatformDocuments] = useState<PlatformKnowledgeDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DMSDocument | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [isLoadingPlatformDocs, setIsLoadingPlatformDocs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLimit, setSearchLimit] = useState<number | null>(null);
  const [chatDoc, setChatDoc] = useState<DMSDocument | null>(null);
  const [isLandscaperCollapsed, setLandscaperCollapsed] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [landscaperNotice, setLandscaperNotice] = useState<string | null>(null);
  const [isTriageModalOpen, setIsTriageModalOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [knowledgeModalOpen, setKnowledgeModalOpen] = useState(false);
  const [knowledgeFileName, setKnowledgeFileName] = useState<string | null>(null);
  const [knowledgeAnalysis, setKnowledgeAnalysis] = useState<string>('');
  const [knowledgeEstimatedChunks, setKnowledgeEstimatedChunks] = useState<number | null>(null);
  const [knowledgeStorageUri, setKnowledgeStorageUri] = useState<string | null>(null);
  const [knowledgeFileHash, setKnowledgeFileHash] = useState<string | null>(null);
  const [knowledgeMimeType, setKnowledgeMimeType] = useState<string | null>(null);
  const [knowledgeFileSize, setKnowledgeFileSize] = useState<number | null>(null);
  const [knowledgeMetadata, setKnowledgeMetadata] = useState<PlatformKnowledgeMetadata | null>(null);
  const [isKnowledgeSubmitting, setIsKnowledgeSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'folders'>('list');
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(['name', 'project', 'doc_type', 'version', 'modified'])
  );
  const [docTypeCounts, setDocTypeCounts] = useState<Array<{ doc_type: string; count: number }>>([]);

  const isPlatformKnowledge = selectedDocType === PLATFORM_KNOWLEDGE_DOC_TYPE;

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects');
        if (!response.ok) throw new Error('Failed to load projects');
        const data = await response.json();
        setProjects(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Global DMS project load error:', error);
        setProjects([]);
      }
    };

    void fetchProjects();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(LANDSCAPER_COLLAPSE_KEY);
    if (saved !== null) {
      setLandscaperCollapsed(saved === 'true');
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('dms-visible-columns');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setVisibleColumns(new Set(parsed));
          return;
        }
      } catch {
        // ignore parse errors
      }
    }
    setVisibleColumns(new Set(['name', 'project', 'doc_type', 'version', 'modified']));
  }, []);

  const fetchDocuments = async (overrides?: { query?: string; limit?: number | null }) => {
    setIsLoadingDocs(true);
    const query = overrides?.query ?? searchQuery;
    const limitOverride = overrides?.limit ?? searchLimit;
    setIsFiltering(Boolean(query.trim()));
    try {
      const limit = limitOverride ?? 100;
      const params = new URLSearchParams({ limit: limit.toString(), offset: '0' });
      if (selectedProject && !isPlatformKnowledge) params.set('project_id', selectedProject.toString());
      if (selectedDocType) params.set('doc_type', selectedDocType);
      if (query.trim()) params.set('q', query.trim());

      const response = await fetch(`/api/dms/search?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch documents');
      const data = await response.json();
      const normalized = Array.isArray(data.results)
        ? data.results.map(normalizeDocument)
        : [];
      setDocuments(normalized);
      setSelectedDocs(new Set());
      if (normalized.length === 0) {
        setSelectedDoc(null);
      } else if (selectedDoc) {
        const updatedSelection = normalized.find((doc) => doc.doc_id === selectedDoc.doc_id);
        setSelectedDoc(updatedSelection ?? null);
      }
      return normalized;
    } catch (error) {
      console.error('Global DMS documents load error:', error);
      setDocuments([]);
      setSelectedDocs(new Set());
      setSelectedDoc(null);
      return [];
    } finally {
      setIsLoadingDocs(false);
      setIsFiltering(false);
    }
  };

  const fetchPlatformKnowledge = async (overrides?: { query?: string; limit?: number | null }) => {
    setIsLoadingPlatformDocs(true);
    const query = overrides?.query ?? searchQuery;
    const limitOverride = overrides?.limit ?? searchLimit;
    setIsFiltering(Boolean(query.trim()));
    try {
      const limit = limitOverride ?? 100;
      const params = new URLSearchParams({ limit: limit.toString(), offset: '0' });
      if (query.trim()) params.set('q', query.trim());
      const response = await fetch(`/api/platform-knowledge?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch platform knowledge');
      const data = await response.json();
      setPlatformDocuments(Array.isArray(data.results) ? data.results : []);
      return Array.isArray(data.results) ? data.results : [];
    } catch (error) {
      console.error('Platform knowledge load error:', error);
      setPlatformDocuments([]);
      return [];
    } finally {
      setIsLoadingPlatformDocs(false);
      setIsFiltering(false);
    }
  };

  const fetchDocTypeCounts = async () => {
    if (isPlatformKnowledge) return;
    try {
      const params = new URLSearchParams({ limit: '0', offset: '0' });
      if (selectedProject) params.set('project_id', selectedProject.toString());
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      const response = await fetch(`/api/dms/search?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch doc type counts');
      const data = await response.json();
      const facets = data?.facets?.doc_type || {};
      const counts = Object.entries(facets).map(([doc_type, count]) => ({
        doc_type,
        count: Number(count) || 0
      }));
      counts.sort((a, b) => a.doc_type.localeCompare(b.doc_type));
      setDocTypeCounts(counts);
    } catch (error) {
      console.error('Doc type count load error:', error);
      setDocTypeCounts([]);
    }
  };

  useEffect(() => {
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }
    if (isPlatformKnowledge) {
      void fetchPlatformKnowledge();
    } else {
      void fetchDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject, selectedDocType, searchQuery, searchLimit, isPlatformKnowledge]);

  useEffect(() => {
    void fetchDocTypeCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject, searchQuery, isPlatformKnowledge]);

  const handleProjectChange = (projectId: number | null) => {
    setSelectedProject(projectId);
    setSelectedDocType(null);
    setSelectedDoc(null);
  };

  const handleDocTypeChange = (docType: string | null) => {
    setSelectedDocType(docType);
    setSelectedDoc(null);
    if (docType === PLATFORM_KNOWLEDGE_DOC_TYPE) {
      setSelectedProject(null);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const toggleDocSelection = (docId: string) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const toggleAllDocs = () => {
    if (documents.length === 0) return;
    setSelectedDocs((prev) =>
      prev.size === documents.length ? new Set() : new Set(documents.map((doc) => doc.doc_id))
    );
  };

  const totalItemCount = useMemo(
    () => (isPlatformKnowledge ? platformDocuments.length : documents.length),
    [documents.length, isPlatformKnowledge, platformDocuments.length]
  );

  const parseNaturalLanguageQuery = (query: string) => {
    const normalized = query.toLowerCase();
    const limitMatch = normalized.match(/\b(last|latest|recent)\s+(\d+)\b/);
    if (limitMatch) {
      return { limit: parseInt(limitMatch[2], 10) };
    }
    if (normalized.includes('last') || normalized.includes('latest') || normalized.includes('recent')) {
      return { limit: 5 };
    }
    return { limit: null };
  };

  const handleLandscaperQuery = async (query: string) => {
    const parsed = parseNaturalLanguageQuery(query);
    setSearchQuery(query);
    setSearchLimit(parsed.limit);
    skipNextFetchRef.current = true;
    const results = isPlatformKnowledge
      ? await fetchPlatformKnowledge({ query, limit: parsed.limit })
      : await fetchDocuments({ query, limit: parsed.limit });
    return { count: results.length, limit: parsed.limit };
  };

  const handleClearQuery = () => {
    setSearchQuery('');
    setSearchLimit(null);
  };

  const toggleColumn = (column: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(column)) {
        next.delete(column);
      } else {
        next.add(column);
      }
      localStorage.setItem('dms-visible-columns', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const handleDropFiles = (files: File[]) => {
    setPendingFiles(files);
    setIsTriageModalOpen(true);
  };

  const handleTriageClose = () => {
    setIsTriageModalOpen(false);
    setPendingFiles([]);
  };

  const handleTriageNewProject = (files: File[]) => {
    setPendingFiles(files);
    setIsTriageModalOpen(false);
    setTimeout(() => {
      setIsNewProjectModalOpen(true);
    }, 0);
  };

  const handleTriageAssociate = async (projectId: number, files: File[]) => {
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('project_id', projectId.toString());

        await fetch('/api/dms/upload', {
          method: 'POST',
          body: formData
        });
      }
      router.push(`/projects/${projectId}/documents?tab=upload`);
    } catch (error) {
      console.error('Failed to associate files with project:', error);
    }
  };

  const handleTriageKnowledge = async (files: File[]) => {
    if (files.length === 0) return;
    setIsTriageModalOpen(false);
    setPendingFiles([]);
    setIsKnowledgeSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('file', files[0]);
      const response = await fetch('/api/platform-knowledge/analyze', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      const suggestions = data.suggestions || {};
      setKnowledgeFileName(files[0].name);
      setKnowledgeAnalysis(data.analysis || 'Analysis unavailable.');
      setKnowledgeEstimatedChunks(data.estimated_chunks ?? null);
      setKnowledgeStorageUri(data.storage_uri);
      setKnowledgeFileHash(data.file_hash);
      setKnowledgeMimeType(data.mime_type);
      setKnowledgeFileSize(data.file_size_bytes);
      setKnowledgeMetadata({
        knowledge_domain: suggestions.knowledge_domain || 'Other',
        property_types: suggestions.property_types || ['All'],
        source: suggestions.source || 'Other',
        year: suggestions.year ?? null,
        geographic_scope: suggestions.geographic_scope || 'National',
        supersedes: ''
      });
      setKnowledgeModalOpen(true);
    } catch (error) {
      console.error('Platform knowledge analysis failed:', error);
      setLandscaperNotice('Failed to analyze the document. Please try again.');
    } finally {
      setIsKnowledgeSubmitting(false);
    }
  };

  const mapDomainToValue = (domain: string) => {
    const mapping: Record<string, string> = {
      'Operating Expenses': 'operating_expenses',
      'Valuation Methodology': 'valuation_methodology',
      'Market Data': 'market_data',
      'Legal/Regulatory': 'legal_regulatory',
      'Cost Estimation': 'cost_estimation',
      'Other': 'other'
    };
    return mapping[domain] || domain;
  };

  const handleKnowledgeConfirm = async (values: PlatformKnowledgeMetadata) => {
    if (!knowledgeStorageUri || !knowledgeFileName) return;
    setIsKnowledgeSubmitting(true);
    try {
      const response = await fetch('/api/platform-knowledge/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_uri: knowledgeStorageUri,
          doc_name: knowledgeFileName,
          mime_type: knowledgeMimeType,
          file_size_bytes: knowledgeFileSize,
          file_hash: knowledgeFileHash,
          knowledge_domain: mapDomainToValue(values.knowledge_domain),
          property_types: values.property_types,
          source: values.source,
          year: values.year,
          geographic_scope: values.geographic_scope,
          supersedes: values.supersedes,
          description: knowledgeAnalysis
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Ingestion failed');
      }
      setLandscaperNotice('Done. I have indexed this platform knowledge document.');
      setKnowledgeModalOpen(false);
      setKnowledgeMetadata(null);
      // Switch to Platform Knowledge view and refresh the list
      setSelectedDocType(PLATFORM_KNOWLEDGE_DOC_TYPE);
      setSelectedProject(null);
      void fetchPlatformKnowledge();
    } catch (error) {
      console.error('Platform knowledge ingest failed:', error);
      setLandscaperNotice('Failed to ingest the platform knowledge document.');
    } finally {
      setIsKnowledgeSubmitting(false);
    }
  };

  // Page-level dropzone for entire DMS page
  const {
    getRootProps: getPageDropProps,
    getInputProps: getPageDropInput,
    isDragActive: isPageDragActive,
  } = useDropzone({
    onDrop: handleDropFiles,
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

  return (
    <div {...getPageDropProps()} className="h-screen flex flex-col relative">
      <input {...getPageDropInput()} />
      {isPageDragActive && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-500/10 border-4 border-dashed border-blue-500 rounded-lg">
          <div className="bg-white dark:bg-gray-900 rounded-lg px-8 py-6 shadow-lg text-center">
            <div className="text-4xl mb-2">📄</div>
            <div className="text-lg font-medium text-gray-900 dark:text-gray-100">Drop files to upload</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">PDF, Word, Excel, or image files</div>
          </div>
        </div>
      )}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="px-6 py-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-gray-400">Global Documents</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Document Management</div>
          </div>
          <div className="flex flex-1 flex-col gap-2 lg:flex-row lg:items-center lg:justify-end">
            {!isPlatformKnowledge && (
              <div className="min-w-[220px]">
                <ProjectSelector value={selectedProject} onChange={handleProjectChange} />
              </div>
            )}
            <button
              onClick={handleUploadClick}
              className="h-10 px-4 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              Upload Documents
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={(event) => {
                const files = event.target.files ? Array.from(event.target.files) : [];
                if (files.length > 0) {
                  handleDropFiles(files);
                }
                event.target.value = '';
              }}
            />
          </div>
        </div>
      </div>

      <DMSLayout
        sidebarClassName="w-[360px]"
        sidebar={
          <div className="h-full flex flex-col">
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex items-center min-h-[46px]">
              <span className="text-base font-medium text-gray-600 dark:text-gray-300">Document Types</span>
            </div>
            <DocTypeFilters
              projectId={selectedProject}
              selectedDocType={selectedDocType}
              onFilterChange={handleDocTypeChange}
              className="divide-y divide-gray-200 dark:divide-gray-800"
            />
            <div className="border-t border-gray-200 dark:border-gray-800">
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="text-xs uppercase tracking-[0.2em] text-gray-400">Landscaper</div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !isLandscaperCollapsed;
                    setLandscaperCollapsed(next);
                    localStorage.setItem(LANDSCAPER_COLLAPSE_KEY, String(next));
                  }}
                  className="text-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {isLandscaperCollapsed ? 'Expand' : 'Collapse'}
                </button>
              </div>
              {!isLandscaperCollapsed && (
                <div className="px-3 pb-3">
                  <DmsLandscaperPanel
                    onDropFiles={handleDropFiles}
                    onQuerySubmit={handleLandscaperQuery}
                    onClearQuery={handleClearQuery}
                    activeDocType={selectedDocType}
                    isFiltering={isFiltering}
                    notice={landscaperNotice}
                  />
                </div>
              )}
            </div>
          </div>
        }
        main={
          <div className="h-full flex flex-col">
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-4">
                  <span>{totalItemCount} items</span>
                  {!isPlatformKnowledge && <span>{selectedDocs.size} selected</span>}
                </div>
                {!isPlatformKnowledge && (
                  <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-1 text-xs ${
                          viewMode === 'list'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        List View
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('folders')}
                        className={`px-3 py-1 text-xs ${
                          viewMode === 'folders'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        Folder View
                      </button>
                    </div>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsColumnMenuOpen((prev) => !prev)}
                        className="px-3 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                      >
                        Columns
                      </button>
                      {isColumnMenuOpen && (
                        <div className="absolute right-0 mt-2 w-52 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg z-20 p-2 text-xs">
                          {[
                            { key: 'name', label: 'Name' },
                            { key: 'project', label: 'Project' },
                            { key: 'doc_type', label: 'Type' },
                            { key: 'version', label: 'Version' },
                            { key: 'doc_date', label: 'Document Date' },
                            { key: 'parties', label: 'Parties' },
                            { key: 'dollar_amount', label: 'Amount' },
                            { key: 'tags', label: 'Tags' },
                            { key: 'description', label: 'Description' },
                            { key: 'modified', label: 'Modified' },
                          ].map((col) => (
                            <label key={col.key} className="flex items-center gap-2 py-1">
                              <input
                                type="checkbox"
                                checked={visibleColumns.has(col.key)}
                                onChange={() => toggleColumn(col.key)}
                              />
                              {col.label}
                            </label>
                          ))}
                          <div className="pt-1 text-[10px] text-gray-500 dark:text-gray-400">
                            Actions column is always visible.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {isPlatformKnowledge ? (
                <PlatformKnowledgeTable
                  documents={platformDocuments}
                  isLoading={isLoadingPlatformDocs}
                />
              ) : viewMode === 'folders' ? (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {docTypeCounts.length === 0 && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      No document types available.
                    </div>
                  )}
                  {docTypeCounts.map((item) => (
                    <button
                      key={item.doc_type}
                      type="button"
                      onClick={() => {
                        handleDocTypeChange(item.doc_type);
                        setViewMode('list');
                      }}
                      className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-left hover:border-blue-400"
                    >
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        {item.doc_type}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {item.count} documents
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <DocumentTable
                  documents={documents}
                  isLoading={isLoadingDocs}
                  selectedDocId={selectedDoc?.doc_id ?? null}
                  selectedDocIds={selectedDocs}
                  showProjectColumn={!selectedProject && !isPlatformKnowledge}
                  visibleColumns={visibleColumns}
                  onSelectDoc={setSelectedDoc}
                  onToggleDoc={toggleDocSelection}
                  onToggleAll={toggleAllDocs}
                  onChat={(doc) => setChatDoc(doc)}
                />
              )}
            </div>
          </div>
        }
        preview={
          selectedDoc && !isPlatformKnowledge ? (
            <DocumentPreview
              document={selectedDoc}
              showProject
              onClose={() => setSelectedDoc(null)}
              onChat={(doc) => setChatDoc(doc)}
              onUpdate={fetchDocuments}
            />
          ) : null
        }
      />

      {chatDoc && chatDoc.project_id && (
        <DocumentChatModal
          visible={Boolean(chatDoc)}
          onClose={() => setChatDoc(null)}
          projectId={parseInt(chatDoc.project_id, 10)}
          document={{
            doc_id: parseInt(chatDoc.doc_id, 10),
            filename: chatDoc.doc_name,
            version_number: chatDoc.version_no || 1,
          }}
        />
      )}

      <TriageModal
        isOpen={isTriageModalOpen}
        onClose={handleTriageClose}
        files={pendingFiles}
        projects={projects}
        onNewProject={handleTriageNewProject}
        onAssociateWithProject={handleTriageAssociate}
        onAddToKnowledge={handleTriageKnowledge}
      />

      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => {
          setIsNewProjectModalOpen(false);
          setPendingFiles([]);
        }}
        initialFiles={pendingFiles.length > 0 ? pendingFiles : undefined}
      />

      {knowledgeMetadata && knowledgeFileName && (
        <PlatformKnowledgeModal
          visible={knowledgeModalOpen}
          fileName={knowledgeFileName}
          analysis={knowledgeAnalysis}
          estimatedChunks={knowledgeEstimatedChunks}
          initialValues={knowledgeMetadata}
          onClose={() => {
            setKnowledgeModalOpen(false);
            setKnowledgeMetadata(null);
          }}
          onConfirm={handleKnowledgeConfirm}
          isSubmitting={isKnowledgeSubmitting}
        />
      )}
    </div>
  );
}

export default function DMSPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <DMSPageContent />
    </Suspense>
  );
}
