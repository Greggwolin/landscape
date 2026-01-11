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
  projectId: number;
  selectedDocType: string | null;
  onFilterChange: (docType: string | null) => void;
  className?: string;
}

export default function DocTypeFilters({
  projectId,
  selectedDocType,
  onFilterChange,
  className = ''
}: DocTypeFiltersProps) {
  const [docTypes, setDocTypes] = useState<DocTypeFilter[]>([]);
  const [smartFilters, setSmartFilters] = useState<SmartFilter[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void fetchCounts();
  }, [projectId]);

  const fetchCounts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/dms/filters/counts?project_id=${projectId}`);
      if (!response.ok) throw new Error('Failed to fetch filter counts');
      const data = await response.json();
      setDocTypes(
        Array.isArray(data.doc_type_counts)
          ? data.doc_type_counts.map((item: any) => ({
              doc_type: item.doc_type,
              count: item.count ?? 0
            }))
          : []
      );
      setSmartFilters(Array.isArray(data.smart_filters) ? data.smart_filters : []);
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
              className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
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
