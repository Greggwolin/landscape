'use client'

import React, { useState, useCallback, useEffect } from 'react'
import Dropzone from '@/components/dms/upload/Dropzone'
import Queue from '@/components/dms/upload/Queue'
import SearchBox from '@/components/dms/search/SearchBox'
import Facets from '@/components/dms/search/Facets'
import ResultsTable from '@/components/dms/search/ResultsTable'

interface DocumentManagementProps {
  projectId: number | null
}

interface SearchResponse {
  success: boolean;
  source: string;
  results: any[];
  totalHits: number;
  facets?: Record<string, Record<string, number>>;
  processingTimeMs: number;
  query: string;
  pagination: {
    limit: number;
    offset: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

const DocumentManagement: React.FC<DocumentManagementProps> = ({ projectId }) => {
  const [uploadQueue, setUploadQueue] = useState<any[]>([])
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({})
  const [expandedFacets, setExpandedFacets] = useState<string[]>(['doc_type', 'status'])
  const [sortField, setSortField] = useState<string>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [currentQuery, setCurrentQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  
  // Default to workspace ID 1 (W1 - Phased Development)
  const workspaceId = 1

  // Search function
  const performSearch = useCallback(async (query: string, filters: Record<string, string[]> = selectedFilters, sort?: string, direction?: 'asc' | 'desc', offset = 0) => {
    if (!projectId) return

    setLoading(true)
    try {
      const searchParams = new URLSearchParams()
      if (query) searchParams.set('q', query)
      if (projectId) searchParams.set('project_id', projectId.toString())
      if (workspaceId) searchParams.set('workspace_id', workspaceId.toString())
      
      // Apply filters
      Object.entries(filters).forEach(([facet, values]) => {
        if (values.length > 0) {
          if (facet === 'tags') {
            searchParams.set('tags', values.join(','))
          } else {
            searchParams.set(facet.replace('_name', ''), values[0]) // Use first value for non-tag filters
          }
        }
      })

      // Apply sorting
      if (sort && direction) {
        searchParams.set('sort', `${sort}:${direction}`)
      } else if (sortField && sortDirection) {
        searchParams.set('sort', `${sortField}:${sortDirection}`)
      }

      // Pagination
      searchParams.set('limit', '20')
      searchParams.set('offset', offset.toString())

      const response = await fetch(`/api/dms/search?${searchParams}`)
      const data = await response.json()
      
      if (data.success) {
        setSearchResults(data)
        setCurrentPage(offset)
      } else {
        console.error('Search failed:', data.error)
        setSearchResults(null)
      }
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults(null)
    } finally {
      setLoading(false)
    }
  }, [projectId, workspaceId, selectedFilters, sortField, sortDirection])

  // Initialize search on component mount
  useEffect(() => {
    if (projectId) {
      performSearch('')
    }
  }, [projectId, performSearch])

  const handleSearch = useCallback((query: string) => {
    setCurrentQuery(query)
    performSearch(query, selectedFilters, sortField, sortDirection, 0)
  }, [performSearch, selectedFilters, sortField, sortDirection])

  const handleFilterChange = useCallback((facetName: string, value: string, selected: boolean) => {
    const newFilters = { ...selectedFilters }
    
    if (!newFilters[facetName]) {
      newFilters[facetName] = []
    }
    
    if (selected) {
      if (!newFilters[facetName].includes(value)) {
        newFilters[facetName] = [...newFilters[facetName], value]
      }
    } else {
      newFilters[facetName] = newFilters[facetName].filter(v => v !== value)
      if (newFilters[facetName].length === 0) {
        delete newFilters[facetName]
      }
    }
    
    setSelectedFilters(newFilters)
    performSearch(currentQuery, newFilters, sortField, sortDirection, 0)
  }, [selectedFilters, currentQuery, sortField, sortDirection, performSearch])

  const handleClearFilters = useCallback(() => {
    setSelectedFilters({})
    performSearch(currentQuery, {}, sortField, sortDirection, 0)
  }, [currentQuery, sortField, sortDirection, performSearch])

  const handleSort = useCallback((field: string, direction: 'asc' | 'desc') => {
    setSortField(field)
    setSortDirection(direction)
    performSearch(currentQuery, selectedFilters, field, direction, 0)
  }, [currentQuery, selectedFilters, performSearch])

  const handlePageChange = useCallback((offset: number) => {
    performSearch(currentQuery, selectedFilters, sortField, sortDirection, offset)
  }, [currentQuery, selectedFilters, sortField, sortDirection, performSearch])

  const handleToggleExpanded = useCallback((facetName: string) => {
    setExpandedFacets(prev => 
      prev.includes(facetName) 
        ? prev.filter(f => f !== facetName)
        : [...prev, facetName]
    )
  }, [])

  const handleViewDocument = useCallback((docId: number) => {
    // TODO: Implement document viewer
    console.log('View document:', docId)
  }, [])

  const handleDownloadDocument = useCallback((docId: number) => {
    // TODO: Implement document download
    console.log('Download document:', docId)
  }, [])

  const handleUploadComplete = (results: any[]) => {
    console.log('Upload completed:', results)
    // Refresh search results after upload
    if (projectId) {
      performSearch(currentQuery, selectedFilters, sortField, sortDirection, currentPage)
    }
  }

  const handleUploadError = (error: Error) => {
    console.error('Upload error:', error)
    // TODO: Show error notification
  }

  if (!projectId) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-400">
          Please select a project to manage documents.
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Document Management</h1>
          <p className="text-gray-400">Upload, search, and manage project documents</p>
        </div>
      </div>

      {/* Upload Area */}
      <Dropzone
        projectId={projectId}
        workspaceId={workspaceId}
        onUploadComplete={handleUploadComplete}
        onUploadError={handleUploadError}
      />

      {/* Upload Queue */}
      {uploadQueue.length > 0 && (
        <div className="mt-6">
          <Queue 
            items={uploadQueue}
            onRetry={(id) => console.log('Retry:', id)}
            onRemove={(id) => setUploadQueue(prev => prev.filter(item => item.id !== id))}
          />
        </div>
      )}

      {/* Search Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Search and Filters */}
        <div className="lg:col-span-1">
          <div className="space-y-6">
            <SearchBox
              onSearch={handleSearch}
              placeholder="Search documents..."
              initialValue={currentQuery}
            />
            
            {searchResults && searchResults.facets && (
              <Facets
                facets={searchResults.facets}
                selectedFilters={selectedFilters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                expandedFacets={expandedFacets}
                onToggleExpanded={handleToggleExpanded}
              />
            )}
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          <ResultsTable
            results={searchResults}
            loading={loading}
            onSort={handleSort}
            onPageChange={handlePageChange}
            onViewDocument={handleViewDocument}
            onDownloadDocument={handleDownloadDocument}
            sortField={sortField}
            sortDirection={sortDirection}
          />
        </div>
      </div>
    </div>
  )
}

export default DocumentManagement