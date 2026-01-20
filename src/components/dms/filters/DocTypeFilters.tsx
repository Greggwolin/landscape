'use client';

import React, { useEffect, useMemo, useState } from 'react';

export interface DocTypeFilter {
  doc_type: string;
  count: number;
  is_expanded?: boolean;
}

export interface SmartFilter {
  filter_id: number;
  filter_name: string;
  doc_type: string;
  tags: string[];
  count: number;
}

interface DocTypeFiltersProps {
  projectId: number | null;
  selectedDocType: string | null;
  onFilterChange: (docType: string | null) => void;
  className?: string;
  workspaceId?: number;
}

export default function DocTypeFilters({
  projectId,
  selectedDocType,
  onFilterChange,
  className = '',
  workspaceId = 1
}: DocTypeFiltersProps) {
  const [docTypes, setDocTypes] = useState<DocTypeFilter[]>([]);
  const [smartFilters, setSmartFilters] = useState<SmartFilter[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void fetchCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const applyPlatformKnowledge = (entries: DocTypeFilter[], platformCount = 0) => {
    const normalized = entries.filter(
      (item) => item.doc_type.toLowerCase() !== 'platform knowledge'
    );
    const existing = entries.find(
      (item) => item.doc_type.toLowerCase() === 'platform knowledge'
    );
    return [
      ...normalized,
      {
        doc_type: 'Platform Knowledge',
        count: existing?.count ?? platformCount
      }
    ];
  };

  const fetchCounts = async () => {
    setIsLoading(true);
    try {
      if (!projectId) {
        const [response, platformResponse] = await Promise.all([
          fetch('/api/dms/search?limit=0&offset=0'),
          fetch('/api/platform-knowledge?limit=0&offset=0')
        ]);
        if (!response.ok) throw new Error('Failed to fetch global filters');
        const data = await response.json();
        const platformData = platformResponse.ok ? await platformResponse.json() : { totalHits: 0 };
        const facetDocTypes = data?.facets?.doc_type || {};
        const docTypeEntries = Object.entries(facetDocTypes)
          .filter(([docType]) => docType && docType !== 'null')
          .map(([docType, count]) => ({
            doc_type: docType,
            count: Number(count) || 0
          }))
          .sort((a, b) => a.doc_type.localeCompare(b.doc_type));
        setDocTypes(applyPlatformKnowledge(docTypeEntries, platformData.totalHits || 0));
        setSmartFilters([]);
        return;
      }

      const [docTypesResponse, countsResponse] = await Promise.all([
        fetch(`/api/dms/templates/doc-types?project_id=${projectId}&workspace_id=${workspaceId}`),
        fetch(`/api/dms/filters/counts?project_id=${projectId}`)
      ]);
      const platformResponse = await fetch('/api/platform-knowledge?limit=0&offset=0');

      let docTypeOptions: string[] = [];
      if (docTypesResponse.ok) {
        const data = await docTypesResponse.json();
        docTypeOptions = Array.isArray(data.doc_type_options) ? data.doc_type_options : [];
      }

      if (!countsResponse.ok) throw new Error('Failed to fetch filter counts');
      const countsData = await countsResponse.json();
      const countEntries: Array<{ doc_type: string; count: number }> = Array.isArray(countsData.doc_type_counts)
        ? countsData.doc_type_counts
        : [];
      const countMap = new Map<string, number>();
      countEntries.forEach(({ doc_type, count }) => {
        if (!doc_type) return;
        countMap.set(doc_type, count ?? 0);
        countMap.set(doc_type.toLowerCase(), count ?? 0);
      });

      const templateFilters = docTypeOptions.map((type) => ({
        doc_type: type,
        count: countMap.get(type) ?? countMap.get(type.toLowerCase()) ?? 0
      }));

      const templateSet = new Set(docTypeOptions.map((type) => type.toLowerCase()));
      const extraFilters = countEntries
        .filter(({ doc_type }) => doc_type && !templateSet.has(doc_type.toLowerCase()))
        .map(({ doc_type, count }) => ({
          doc_type,
          count: count ?? 0
        }));

      const platformData = platformResponse.ok ? await platformResponse.json() : { totalHits: 0 };
      setDocTypes(applyPlatformKnowledge([...templateFilters, ...extraFilters], platformData.totalHits || 0));
      setSmartFilters(
        Array.isArray(countsData.smart_filters)
          ? countsData.smart_filters.map((item: any) => ({
              filter_id: item.filter_id,
              filter_name: item.filter_name,
              doc_type: item.query?.doc_type || '',
              tags: item.query?.tags || [],
              count: 0
            }))
          : []
      );
    } catch (error) {
      console.error('DocTypeFilters load error:', error);
      setDocTypes([]);
      setSmartFilters([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (docType: string) => {
    const next = new Set(expanded);
    if (next.has(docType)) {
      next.delete(docType);
    } else {
      next.add(docType);
    }
    setExpanded(next);
  };

  const smartFiltersByType = useMemo(() => {
    const map = new Map<string, SmartFilter[]>();
    smartFilters.forEach((sf) => {
      const list = map.get(sf.doc_type) ?? [];
      list.push(sf);
      map.set(sf.doc_type, list);
    });
    return map;
  }, [smartFilters]);

  if (isLoading) {
    return (
      <div className={`text-sm text-gray-500 dark:text-gray-400 p-4 ${className}`}>
        Loading filters...
      </div>
    );
  }

  if (docTypes.length === 0) {
    return (
      <div className={`text-sm text-gray-500 dark:text-gray-400 p-4 ${className}`}>
        No document types found
      </div>
    );
  }

  return (
    <div className={className}>
      {docTypes.map((item) => {
        const isActive = selectedDocType === item.doc_type;
        const isExpanded = expanded.has(item.doc_type);
        const smartList = smartFiltersByType.get(item.doc_type) ?? [];

        return (
          <div key={item.doc_type} className="border-b border-gray-200 dark:border-gray-800">
            <button
              onClick={() => {
                handleToggle(item.doc_type);
                onFilterChange(item.doc_type);
              }}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                isActive ? 'bg-[#EBF5FF] text-[#1E40AF]' : 'text-gray-800 dark:text-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400">
                  {isExpanded ? '▾' : '▸'}
                </span>
                <span className="font-medium">{item.doc_type}</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">{item.count ?? 0}</span>
            </button>

            {isExpanded && smartList.length > 0 && (
              <div className="pl-6 pr-3 pb-2 space-y-1">
                {smartList.map((sf) => {
                  const sfActive = selectedDocType === sf.doc_type && sf.filter_name === sf.filter_name;
                  return (
                    <button
                      key={sf.filter_id}
                      onClick={() => onFilterChange(sf.doc_type)}
                      className={`w-full flex items-center justify-between text-xs px-2 py-1 rounded ${
                        sfActive ? 'bg-[#EBF5FF] text-[#1E40AF]' : 'text-gray-700 dark:text-gray-200'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-gray-400">•</span>
                        {sf.filter_name}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">{sf.count ?? 0}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
