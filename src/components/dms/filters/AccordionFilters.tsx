'use client';

import React from 'react';
import CIcon from '@coreui/icons-react';
import { cilFilterSquare } from '@coreui/icons';
import type { DMSDocument } from '@/types/dms';

export interface FilterAccordion {
  doc_type: string;
  icon: string;
  count: number;
  is_expanded: boolean;
  documents?: DMSDocument[];
}

interface AccordionFiltersProps {
  projectId: number;
  filters: FilterAccordion[];
  onExpand: (docType: string) => void;
  onFilterClick: (docType: string) => void;
  onDocumentSelect: (doc: DMSDocument) => void;
  activeFilter?: string | null;
}

export default function AccordionFilters({
  filters,
  onExpand,
  onFilterClick,
  onDocumentSelect,
  activeFilter
}: AccordionFiltersProps) {
  const headerStyle: React.CSSProperties = {
    backgroundColor: 'var(--cui-card-bg)',
    color: 'var(--cui-body-color)',
    borderColor: 'var(--cui-border-color)'
  };

  const mutedTextStyle: React.CSSProperties = {
    color: 'var(--cui-secondary-color)'
  };

  const expandedStyle: React.CSSProperties = {
    backgroundColor: 'var(--cui-body-bg)',
    borderColor: 'var(--cui-border-color)'
  };

  const rowStyle: React.CSSProperties = {
    color: 'var(--cui-body-color)'
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="divide-y" style={{ borderColor: 'var(--cui-border-color)' }}>
      {filters.map((filter) => {
        const isActive = activeFilter === filter.doc_type;
        const headerDynamicStyle: React.CSSProperties = isActive
          ? {
              ...headerStyle,
              backgroundColor: 'var(--cui-primary-bg)',
              borderColor: 'var(--cui-primary)'
            }
          : headerStyle;
        const nameStyle: React.CSSProperties = isActive
          ? {
              ...rowStyle,
              color: 'var(--cui-primary)',
              fontWeight: 600
            }
          : rowStyle;

        return (
          <div key={filter.doc_type} style={{ backgroundColor: 'var(--cui-body-bg)' }}>
            {/* Accordion Header Row */}
            <div
            className="flex items-center gap-3 px-6 py-3 transition-colors"
            style={{
              ...headerDynamicStyle,
              borderBottom: '1px solid var(--cui-border-color)'
            }}
          >
            {/* Chevron - Click to expand/collapse */}
            <button
              onClick={() => onExpand(filter.doc_type)}
              className="w-4 flex-shrink-0 transition-colors"
              style={mutedTextStyle}
              aria-label={filter.is_expanded ? 'Collapse' : 'Expand'}
            >
              {filter.is_expanded ? '▾' : '▸'}
            </button>

            {/* Folder Icon - Click to open filter detail view */}
            <button
              onClick={() => onFilterClick(filter.doc_type)}
              className="flex-shrink-0 hover:scale-110 transition-transform"
              aria-label={`Open ${filter.doc_type} filter`}
            >
              <CIcon icon={cilFilterSquare} className="w-5 h-5" style={{ color: 'var(--cui-primary)' }} />
            </button>

            {/* Filter Name - Click to open filter detail view */}
            <button
              onClick={() => onFilterClick(filter.doc_type)}
              className="font-medium flex-1 text-left transition-colors"
              style={nameStyle}
              aria-current={isActive ? 'true' : undefined}
            >
              {filter.doc_type}
            </button>

            {/* Count Badge */}
            <span className="text-sm" style={mutedTextStyle}>
              ~{filter.count}
            </span>

            {/* Edit Link */}
            <button className="text-sm hover:underline" style={{ color: 'var(--cui-primary)' }}>
              Edit
            </button>
          </div>

            {/* Expanded Document List */}
            {filter.is_expanded && (
              <div
                className="px-12 py-3 space-y-2 border-t"
                style={expandedStyle}
              >
                {!filter.documents || filter.documents.length === 0 ? (
                  <div className="text-sm italic py-2" style={mutedTextStyle}>
                    No documents
                  </div>
                ) : (
                  filter.documents.map((doc) => (
                    <div
                      key={doc.doc_id}
                      className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer transition-colors"
                      style={{
                        ...rowStyle,
                        backgroundColor: 'var(--cui-card-bg)'
                      }}
                      onClick={() => onDocumentSelect(doc)}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded"
                        style={{ borderColor: 'var(--cui-border-color)' }}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => {}}
                      />
                      <button
                        className="transition-colors"
                        style={mutedTextStyle}
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Toggle star
                        }}
                      >
                        ⭐
                      </button>
                      <span className="text-lg" style={{ color: 'var(--cui-danger)' }}>📄</span>
                      <div className="flex-1 min-w-0" style={rowStyle}>
                        <div className="font-medium truncate">
                          {doc.doc_name}
                        </div>
                        <div className="text-sm" style={mutedTextStyle}>
                          V{doc.version_no || 1} • {doc.updated_at ? formatDate(doc.updated_at) : 'No date'}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
