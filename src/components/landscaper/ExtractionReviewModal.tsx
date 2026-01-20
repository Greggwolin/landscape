'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CBadge,
  CAlert,
} from '@coreui/react';
import { UnitMixAccordion, UnitMixRow } from './UnitMixAccordion';
import { ExtractionFieldRow } from './ExtractionFieldRow';
import { emitMutationComplete } from '@/lib/events/landscaper-events';

interface FieldMapping {
  extraction_id?: number;
  source_text: string;
  suggested_field: string;
  suggested_value: string;
  confidence: number;
  scope?: string;
  scope_label?: string;
  status?: 'pending' | 'conflict';
  // Conflict details
  conflict_existing_value?: string;
  conflict_existing_doc_name?: string;
  conflict_existing_confidence?: number;
}

interface ExtractionSummary {
  total: number;
  pending: number;
  conflict: number;
  validated: number;
  applied: number;
}

interface ExtractionReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  docId: number;
  docName: string;
  fieldMappings: FieldMapping[];
  summary?: ExtractionSummary;
  onCommit: () => void;
  onCreateProject?: () => void;
  onOpenProject?: () => void;
}

// Scope-based category mapping (matches extraction service scopes)
const SCOPE_CONFIG: Record<string, { label: string; icon: string; order: number }> = {
  core_property: { label: 'Property Details', icon: '🏢', order: 1 },
  financials: { label: 'Financial Metrics', icon: '💰', order: 2 },
  deal_market: { label: 'Deal & Market', icon: '📊', order: 3 },
  unit_types: { label: 'Unit Types', icon: '🏠', order: 4 },
  operating_expenses: { label: 'Operating Expenses', icon: '📋', order: 5 },
  rent_roll: { label: 'Rent Roll', icon: '📑', order: 6 },
  // Legacy categories for backwards compatibility
  property: { label: 'Property', icon: '🏢', order: 1 },
  budget: { label: 'Budget', icon: '💰', order: 2 },
  market: { label: 'Market', icon: '📊', order: 3 },
  underwriting: { label: 'Underwriting', icon: '📋', order: 4 },
};

const SCOPE_TABLE_MAP: Record<string, string[]> = {
  core_property: ['project'],
  financials: ['project'],
  deal_market: ['project'],
  unit_types: ['unit_types'],
  operating_expenses: ['operating_expenses'],
  rent_roll: ['units', 'leases'],
  property: ['project'],
  budget: ['project'],
};

// Map field names to scopes for backwards compatibility
const FIELD_TO_SCOPE: Record<string, string> = {
  project_name: 'core_property',
  property_name: 'core_property',
  address: 'core_property',
  city: 'core_property',
  state: 'core_property',
  zip: 'core_property',
  county: 'core_property',
  total_acres: 'core_property',
  net_acres: 'core_property',
  year_built: 'core_property',
  total_units: 'core_property',
  zoning: 'core_property',
  land_cost: 'financials',
  acquisition_cost: 'financials',
  development_cost: 'financials',
  construction_cost: 'financials',
  asking_price: 'financials',
  price_per_unit: 'financials',
  price_per_sf: 'financials',
  cap_rate: 'deal_market',
  market_rent: 'deal_market',
  vacancy_rate: 'deal_market',
  noi: 'financials',
  irr: 'financials',
  dscr: 'financials',
};

const getScopeForField = (field: FieldMapping): string => {
  // Prefer explicit scope from extraction
  if (field.scope && SCOPE_CONFIG[field.scope]) {
    return field.scope;
  }
  // Fall back to field name mapping
  const normalized = field.suggested_field.toLowerCase().replace(/\s+/g, '_');
  return FIELD_TO_SCOPE[normalized] || 'core_property';
};

const getTablesForMappings = (mappings: FieldMapping[]): string[] => {
  const tables = new Set<string>();
  mappings.forEach((mapping) => {
    const scope = getScopeForField(mapping);
    const mappedTables = SCOPE_TABLE_MAP[scope];
    if (mappedTables) {
      mappedTables.forEach((table) => tables.add(table));
    }
  });
  return Array.from(tables);
};

interface FieldState {
  choice: 'accept' | 'edit' | 'skip' | 'keep_existing' | 'use_new' | 'enter_different';
  editedValue: string;
}

export function ExtractionReviewModal({
  isOpen,
  onClose,
  projectId,
  docId,
  docName,
  fieldMappings,
  summary,
  onCommit,
  onCreateProject,
  onOpenProject,
}: ExtractionReviewModalProps) {
  // Start with first two scopes expanded
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['core_property', 'financials', 'property', 'budget'])
  );
  const [fieldStates, setFieldStates] = useState<Record<number, FieldState>>(() => {
    const initial: Record<number, FieldState> = {};
    fieldMappings.forEach((mapping, idx) => {
      // Default to 'accept' for pending, 'use_new' for conflicts
      initial[idx] = {
        choice: mapping.status === 'conflict' ? 'use_new' : 'accept',
        editedValue: '',
      };
    });
    return initial;
  });
  const [isCommitting, setIsCommitting] = useState(false);

  // Count conflicts
  const conflictCount = fieldMappings.filter((m) => m.status === 'conflict').length;

  // Build a map of all numeric extraction values for calculated field comparisons
  const extractionValues = useMemo(() => {
    const values: Record<string, number> = {};
    fieldMappings.forEach((mapping) => {
      const key = mapping.suggested_field.toLowerCase().replace(/\s+/g, '_');
      const numValue = parseFloat(String(mapping.suggested_value).replace(/[$,%,]/g, ''));
      if (!isNaN(numValue)) {
        values[key] = numValue;
      }
    });
    return values;
  }, [fieldMappings]);

  // Extract unit mix data from unit_types scope
  const unitMixData = useMemo((): UnitMixRow[] => {
    const unitTypeItems = fieldMappings.filter(
      (m) => m.scope === 'unit_types' || getScopeForField(m) === 'unit_types'
    );

    // Group by unit_type if there are multiple fields per unit type
    const unitMap = new Map<string, UnitMixRow>();

    unitTypeItems.forEach((item) => {
      const fieldKey = item.suggested_field.toLowerCase();
      // Try to extract unit type name from scope_label or field name
      const unitType = item.scope_label || 'Unknown';

      if (!unitMap.has(unitType)) {
        unitMap.set(unitType, {
          unit_type: unitType,
          unit_count: 0,
          avg_sf: 0,
          current_rent: 0,
          extraction_id: item.extraction_id,
          accepted: false,
        });
      }

      const row = unitMap.get(unitType)!;
      const numValue = parseFloat(String(item.suggested_value).replace(/[$,%,]/g, ''));

      if (fieldKey.includes('count') || fieldKey.includes('units')) {
        row.unit_count = numValue || 0;
      } else if (fieldKey.includes('sf') || fieldKey.includes('sqft') || fieldKey.includes('size')) {
        row.avg_sf = numValue || 0;
      } else if (fieldKey.includes('rent')) {
        row.current_rent = numValue || 0;
      }
    });

    return Array.from(unitMap.values()).filter(
      (row) => row.unit_count > 0 || row.avg_sf > 0 || row.current_rent > 0
    );
  }, [fieldMappings]);

  // Group fields by scope
  const groupedMappings = useMemo(() => {
    const groups: Record<string, Array<{ mapping: FieldMapping; originalIndex: number }>> = {};

    // Initialize all known scopes
    Object.keys(SCOPE_CONFIG).forEach((scope) => {
      groups[scope] = [];
    });

    fieldMappings.forEach((mapping, index) => {
      const scope = getScopeForField(mapping);
      if (!groups[scope]) {
        groups[scope] = [];
      }
      groups[scope].push({ mapping, originalIndex: index });
    });

    return groups;
  }, [fieldMappings]);

  // Get ordered scopes that have items
  const orderedScopes = useMemo(() => {
    return Object.entries(groupedMappings)
      .filter(([_, items]) => items.length > 0)
      .sort((a, b) => {
        const orderA = SCOPE_CONFIG[a[0]]?.order ?? 99;
        const orderB = SCOPE_CONFIG[b[0]]?.order ?? 99;
        return orderA - orderB;
      })
      .map(([scope]) => scope);
  }, [groupedMappings]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const updateFieldState = (index: number, updates: Partial<FieldState>) => {
    setFieldStates((prev) => ({
      ...prev,
      [index]: { ...prev[index], ...updates },
    }));
  };

  const getConfidenceColor = (confidence: number): 'success' | 'warning' | 'danger' => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.5) return 'warning';
    return 'danger';
  };

  const handleCommit = async () => {
    setIsCommitting(true);

    try {
      // Build the payload of accepted/edited fields with conflict resolution
      const fieldsToCommit = fieldMappings
        .map((mapping, idx) => {
          const state = fieldStates[idx];

          // Skip items that user explicitly skipped or chose to keep existing
          if (state.choice === 'skip' || state.choice === 'keep_existing') {
            return null;
          }

          // Determine the value to commit
          let valueToCommit = mapping.suggested_value;
          if (state.choice === 'edit' || state.choice === 'enter_different') {
            valueToCommit = state.editedValue;
          }

          return {
            extraction_id: mapping.extraction_id,
            field: mapping.suggested_field,
            value: valueToCommit,
            source: mapping.source_text,
            confidence: mapping.confidence,
            scope: mapping.scope,
            scope_label: mapping.scope_label,
            // Include conflict resolution action for conflict items
            conflict_resolution:
              mapping.status === 'conflict'
                ? state.choice === 'use_new'
                  ? 'use_new'
                  : state.choice === 'enter_different'
                  ? 'use_custom'
                  : null
                : null,
          };
        })
        .filter(Boolean);

      console.log('Committing extraction fields:', fieldsToCommit);

      // Call API to save the extracted data
      const response = await fetch(`/api/projects/${projectId}/extractions/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_id: docId,
          fields: fieldsToCommit,
        }),
      });

      if (response.ok) {
        const tables = getTablesForMappings(fieldMappings);
        if (tables.length > 0) {
          emitMutationComplete({
            projectId,
            mutationType: 'extraction_commit',
            tables,
            counts: {
              created: fieldsToCommit.length,
              total: fieldsToCommit.length,
            },
          });
        }
        onCommit();
      } else {
        console.error('Failed to commit extraction:', await response.text());
        // Still close modal on error for now
        onCommit();
      }
    } catch (error) {
      console.error('Commit error:', error);
      onCommit();
    } finally {
      setIsCommitting(false);
    }
  };

  // Count items that will be committed (accepted, edited, or conflict resolved to use new)
  const acceptedCount = Object.values(fieldStates).filter(
    (s) =>
      s.choice === 'accept' ||
      s.choice === 'edit' ||
      s.choice === 'use_new' ||
      s.choice === 'enter_different'
  ).length;
  // Count items that will be skipped or kept at existing value
  const skippedCount = Object.values(fieldStates).filter(
    (s) => s.choice === 'skip' || s.choice === 'keep_existing'
  ).length;

  return (
    <CModal visible={isOpen} onClose={onClose} size="xl" backdrop="static">
      <CModalHeader>
        <div className="d-flex align-items-center justify-content-between w-100 pe-3">
          <div className="d-flex align-items-center gap-2">
            <Image src="/landscaper-icon.png" alt="Landscaper" width={24} height={24} />
            <CModalTitle>Review Extracted Data</CModalTitle>
          </div>
          {/* Header action buttons */}
          <div className="d-flex gap-2">
            {onCreateProject && (
              <CButton color="success" size="sm" onClick={onCreateProject}>
                Create Project
              </CButton>
            )}
            {onOpenProject && (
              <CButton color="primary" size="sm" variant="outline" onClick={onOpenProject}>
                Open Project
              </CButton>
            )}
          </div>
        </div>
      </CModalHeader>

      <CModalBody style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {/* Conflict Alert Banner */}
        {conflictCount > 0 && (
          <CAlert color="warning" className="mb-3 d-flex align-items-center">
            <span className="fw-semibold me-2">⚠️ {conflictCount} conflict{conflictCount > 1 ? 's' : ''} detected</span>
            <span className="text-body-secondary">
              Some fields have different values in existing documents. Review and choose which value to keep.
            </span>
          </CAlert>
        )}

        <div className="mb-3 p-3 rounded" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
          <div className="fw-medium mb-1">{docName}</div>
          <div className="d-flex align-items-center gap-3">
            <span className="text-body-secondary small">
              {fieldMappings.length} fields extracted
            </span>
            {summary && (
              <>
                {summary.pending > 0 && (
                  <CBadge color="warning" shape="rounded-pill">
                    {summary.pending} pending
                  </CBadge>
                )}
                {summary.conflict > 0 && (
                  <CBadge color="danger" shape="rounded-pill">
                    {summary.conflict} conflicts
                  </CBadge>
                )}
                {summary.validated > 0 && (
                  <CBadge color="info" shape="rounded-pill">
                    {summary.validated} validated
                  </CBadge>
                )}
              </>
            )}
          </div>
        </div>

        {/* Unit Mix Accordion - shown when unit type data exists */}
        {unitMixData.length > 0 && (
          <UnitMixAccordion
            unitMix={unitMixData}
            confidence={
              fieldMappings
                .filter((m) => m.scope === 'unit_types')
                .reduce((sum, m) => sum + m.confidence, 0) /
              Math.max(fieldMappings.filter((m) => m.scope === 'unit_types').length, 1)
            }
            onAcceptAll={() => {
              // Mark all unit_types scope items as accepted
              const unitTypeIndices = fieldMappings
                .map((m, idx) => (m.scope === 'unit_types' ? idx : -1))
                .filter((idx) => idx >= 0);
              unitTypeIndices.forEach((idx) => {
                updateFieldState(idx, { choice: 'accept' });
              });
            }}
          />
        )}

        <div className="d-flex flex-column gap-2">
          {orderedScopes.map((scope) => {
            const items = groupedMappings[scope] || [];
            if (items.length === 0) return null;

            const isExpanded = expandedSections.has(scope);
            const config = SCOPE_CONFIG[scope] || { label: scope, icon: '📄', order: 99 };
            const scopeConflicts = items.filter((item) => item.mapping.status === 'conflict').length;
            const scopeAccepted = items.filter(
              (item) => {
                const choice = fieldStates[item.originalIndex]?.choice;
                return choice !== 'skip' && choice !== 'keep_existing';
              }
            ).length;

            return (
              <div
                key={scope}
                className="border rounded"
                style={{
                  borderColor: scopeConflicts > 0 ? 'var(--cui-warning)' : 'var(--cui-border-color)',
                }}
              >
                {/* Accordion Header */}
                <button
                  onClick={() => toggleSection(scope)}
                  className="w-100 d-flex align-items-center justify-content-between px-3 py-2 border-0 bg-transparent"
                  style={{ cursor: 'pointer' }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <span>{config.icon}</span>
                    <span className="fw-medium">{config.label}</span>
                    <CBadge color="primary" shape="rounded-pill">
                      {items.length}
                    </CBadge>
                    {scopeConflicts > 0 && (
                      <CBadge color="danger" shape="rounded-pill">
                        {scopeConflicts} conflict{scopeConflicts > 1 ? 's' : ''}
                      </CBadge>
                    )}
                    {scopeAccepted > 0 && scopeConflicts === 0 && (
                      <CBadge color="success" shape="rounded-pill">
                        {scopeAccepted} accepted
                      </CBadge>
                    )}
                  </div>
                  <svg
                    className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    style={{ width: '20px', height: '20px', transition: 'transform 0.2s' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Accordion Content - ISSUE 3 FIX: Inline row format */}
                {isExpanded && (
                  <div className="border-top" style={{ borderColor: 'var(--cui-border-color)' }}>
                    {/* Table header row */}
                    <div
                      className="d-flex align-items-center py-2 px-3 small fw-medium text-body-secondary"
                      style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}
                    >
                      <div className="flex-shrink-0" style={{ width: '180px' }}>
                        Field
                      </div>
                      <div className="flex-grow-1">Value</div>
                      <div className="flex-shrink-0 text-center" style={{ width: '50px' }}>
                        Conf
                      </div>
                      <div className="flex-shrink-0 text-end" style={{ width: '80px' }}>
                        Action
                      </div>
                    </div>

                    {/* Field rows */}
                    {items.map(({ mapping, originalIndex }) => {
                      const state = fieldStates[originalIndex];

                      return (
                        <ExtractionFieldRow
                          key={originalIndex}
                          field={{
                            extraction_id: mapping.extraction_id,
                            field_key: mapping.suggested_field,
                            suggested_field: mapping.suggested_field,
                            suggested_value: mapping.suggested_value,
                            confidence: mapping.confidence,
                            source_text: mapping.source_text,
                            status: mapping.status,
                            conflict: mapping.status === 'conflict'
                              ? {
                                  existing_value: mapping.conflict_existing_value || '',
                                  existing_doc_name: mapping.conflict_existing_doc_name,
                                }
                              : undefined,
                          }}
                          extractionValues={extractionValues}
                          choice={state.choice}
                          editedValue={state.editedValue}
                          onChoiceChange={(newChoice) =>
                            updateFieldState(originalIndex, {
                              choice: newChoice,
                              editedValue:
                                newChoice === 'edit' || newChoice === 'enter_different'
                                  ? state.editedValue || mapping.suggested_value
                                  : state.editedValue,
                            })
                          }
                          onEditValueChange={(value) =>
                            updateFieldState(originalIndex, { editedValue: value })
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CModalBody>

      <CModalFooter className="d-flex justify-content-between">
        <div className="d-flex align-items-center gap-3">
          <span className="text-body-secondary small">
            {acceptedCount} field(s) to commit
          </span>
          {skippedCount > 0 && (
            <span className="text-body-secondary small">{skippedCount} skipped</span>
          )}
          {conflictCount > 0 && (
            <CBadge color="warning" shape="rounded-pill">
              {conflictCount} conflict{conflictCount > 1 ? 's' : ''} to resolve
            </CBadge>
          )}
        </div>
        <div className="d-flex gap-2">
          <CButton color="secondary" variant="ghost" onClick={onClose} disabled={isCommitting}>
            Cancel
          </CButton>
          <CButton
            color="primary"
            onClick={handleCommit}
            disabled={isCommitting || acceptedCount === 0}
          >
            {isCommitting ? 'Committing...' : `Commit ${acceptedCount} Field(s)`}
          </CButton>
        </div>
      </CModalFooter>
    </CModal>
  );
}
