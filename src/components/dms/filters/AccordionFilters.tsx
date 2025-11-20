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

import styles from './AccordionFilters.module.css';

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
    color: 'var(--cui-body-color)'
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
        const headerDynamicStyle: React.CSSProperties = {
          ...headerStyle,
          backgroundColor: isActive ? 'var(--cui-primary-bg)' : headerStyle.backgroundColor,
          borderBottomColor: isActive ? 'var(--cui-primary)' : 'var(--cui-border-color)'
        };
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
                borderBottomWidth: '1px',
                borderBottomStyle: 'solid',
                borderBottomColor: headerDynamicStyle.borderBottomColor ?? 'var(--cui-border-color)'
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
              className={`${styles.filterIconButton} ${filter.is_expanded ? styles.filterIconButtonActive : ''}`}
              aria-label={`Open ${filter.doc_type} filter`}
            >
              <CIcon icon={cilFilterSquare} className="w-6 h-6" />
            </button>

            {/* Filter Name - Click to open filter detail view */}
            <button
              onClick={() => onFilterClick(filter.doc_type)}
              className={`${styles.filterNameButton} ${isActive ? styles.filterNameButtonActive : ''}`}
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
            <button className="text-sm hover:underline" style={{ color: 'var(--cui-body-color)' }}>
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
