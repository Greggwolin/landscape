// ExpandableDetailsRow - Shows additional budget item fields in accordion pattern
// v2.6 · 2025-11-16 · Balanced inline layout with improved spacing

'use client';

import React, { useState } from 'react';
import {
  CBadge,
  CFormLabel,
} from '@coreui/react';
import type { BudgetItem } from '@/types/budget';
import type { BudgetMode } from '@/types/budget';
import { getFieldGroupsByMode, shouldShowField } from '../config/fieldGroups';
import { FieldRenderer } from '../fields/FieldRenderer';

interface ExpandableDetailsRowProps {
  item: BudgetItem;
  mode: BudgetMode;
  columnCount: number;
  projectTypeCode?: string;
  onInlineCommit?: (
    item: BudgetItem,
    field: keyof BudgetItem,
    value: unknown
  ) => Promise<void> | void;
}

function ExpandableDetailsRow({
  item,
  mode,
  columnCount,
  projectTypeCode,
  onInlineCommit,
}: ExpandableDetailsRowProps) {
  // Initialize state before any conditional logic (React Hooks rules)
  const fieldGroups = getFieldGroupsByMode(mode);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(() =>
    new Set(fieldGroups.map((_, index) => index))
  );

  // Don't show for napkin mode (early return AFTER hooks)
  if (mode === 'napkin') return null;

  const handleFieldChange = async (fieldName: keyof BudgetItem, value: any) => {
    if (onInlineCommit) {
      await onInlineCommit(item, fieldName, value);
    }
  };

  const toggleSection = (index: number) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <tr className="expandable-details-row">
      <td colSpan={columnCount} style={{ padding: '0.75rem' }}>
        <div>
          {fieldGroups.map((group, index) => {
            const groupColor = group.color || (group.mode === 'standard' ? 'var(--cui-warning)' : 'var(--cui-danger)');
            const isExpanded = expandedSections.has(index);

            return (
              <div
                key={index}
                style={{
                  marginBottom: '0.5rem',
                  border: '1px solid var(--cui-border-color)',
                  borderRadius: '0.375rem',
                  overflow: 'hidden',
                }}
              >
                {/* Header */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSection(index);
                  }}
                  className={`accordion-header-base ${
                    group.mode === 'standard'
                      ? 'accordion-header-standard'
                      : 'accordion-header-detail'
                  }`}
                  style={{
                    width: '100%',
                    border: 'none',
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {/* Chevron */}
                  <span style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>
                    {isExpanded ? '▼' : '▶'}
                  </span>

                  {/* Color indicator */}
                  <div
                    style={{
                      width: '4px',
                      height: '20px',
                      backgroundColor: groupColor,
                      borderRadius: '2px',
                      flexShrink: 0,
                    }}
                    title={`${group.mode === 'standard' ? 'Standard' : 'Detail'} fields`}
                  />

                  {/* Group label */}
                  <strong style={{ fontSize: '0.875rem', flex: 1 }}>{group.label}</strong>

                  {/* Field count badge */}
                  <CBadge
                    color={group.mode === 'standard' ? 'warning' : 'danger'}
                  >
                    {group.fields.length} fields
                  </CBadge>
                </button>

                {/* Body - 3-column layout with minimal spacing */}
                {isExpanded && (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: 'var(--cui-body-bg)',
                      borderTop: '1px solid var(--cui-border-color)',
                    }}
                  >
                    <div className="row g-2" style={{ width: '100%', rowGap: '0.5rem' }}>
                      {group.fields.map((field) => {
                        const value = item[field.name];

                        // Check if field should be visible based on dependencies and project type
                        if (!shouldShowField(field, item, projectTypeCode)) {
                          return null;
                        }

                        // Determine column class: full-width > auto > standard 3-column
                        const colClass = field.fullWidth
                          ? 'col-12'
                          : field.colWidth === 'auto'
                            ? 'col-auto'
                            : 'col-md-4';

                        return (
                          <div key={field.name} className={colClass} style={{ marginBottom: '0.25rem' }}>
                            {/* Field Label - Minimal */}
                            <CFormLabel
                              className="small text-muted d-flex align-items-center gap-1"
                              style={{
                                fontSize: '0.75rem',
                                marginBottom: '0.125rem',
                                lineHeight: 1.2,
                              }}
                            >
                              <span>{field.label}</span>
                              {field.readonly && (
                                <CBadge color="light" textColor="dark" style={{ fontSize: '0.6rem', padding: '0.05rem 0.2rem' }}>
                                  RO
                                </CBadge>
                              )}
                              {field.computed && (
                                <CBadge color="light" textColor="dark" style={{ fontSize: '0.6rem', padding: '0.05rem 0.2rem' }}>
                                  calc
                                </CBadge>
                              )}
                            </CFormLabel>

                            {/* Field Input */}
                            <FieldRenderer
                              field={field}
                              value={value}
                              item={item}
                              onChange={handleFieldChange}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </td>
    </tr>
  );
}

export default ExpandableDetailsRow;
