'use client';

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CAlert,
  CBadge,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
  CFormCheck,
  CSpinner,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilInfo, cilWarning, cilCheckCircle, cilCheckAlt, cilHistory, cilReload } from '@coreui/icons';
import { formatFieldValue, getFieldLabel, isNumericField } from '@/utils/fieldFormatters';

interface Snapshot {
  snapshot_id: number;
  committed_at: string | null;
  is_active: boolean;
  rolled_back_at: string | null;
  units_count: number;
  extractions_count: number;
  doc_id: number | null;
}

export interface RentRollFieldChange {
  field: string;
  action: 'fill' | 'replace_placeholder' | 'conflict';
  extracted_value: unknown;
  existing_value: unknown;
  placeholder_pattern?: string;
}

export interface RentRollUnitDelta {
  unit_number: string | number | null;
  extraction_id: number;
  changes: RentRollFieldChange[];
}

export interface RentRollComparisonResponse {
  document_name: string | null;
  summary: {
    total_fields_extracted: number;
    exact_matches: number;
    fills: number;
    conflicts: number;
  };
  analysis: {
    placeholder_detected: boolean;
    placeholder_fields: string[];
    message: string;
    recommendation: 'accept_all' | 'review_conflicts';
  };
  deltas: RentRollUnitDelta[];
}

export type RentRollExtractionMap = Record<number, Record<string, unknown>>;

interface Props {
  visible: boolean;
  onClose: () => void;
  projectId: number;
  comparisonData: RentRollComparisonResponse;
  extractedUnitsById: RentRollExtractionMap;
  onCommitSuccess: (snapshotId?: number) => void;
  onRefresh?: () => void;
}

type FieldDecision = 'accept' | 'keep_existing';
type FilterMode = 'all' | 'conflicts' | 'fills';

export const RentRollUpdateReviewModal: React.FC<Props> = ({
  visible,
  onClose,
  projectId,
  comparisonData,
  extractedUnitsById,
  onCommitSuccess,
  onRefresh,
}) => {
  const [decisions, setDecisions] = useState<Record<number, Record<string, FieldDecision>>>({});
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUnits, setSelectedUnits] = useState<Set<number>>(new Set());
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());

  // Undo/Rollback state
  const [showUndoSection, setShowUndoSection] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<number | null>(null);

  const { summary, analysis, deltas, document_name } = comparisonData;

  // All changed fields from original deltas (for reference)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _changedFields = useMemo(() => {
    const fields = new Set<string>();
    deltas.forEach((unit) => {
      unit.changes.forEach((change) => fields.add(change.field));
    });
    return Array.from(fields);
  }, [deltas]);

  const filteredDeltas = useMemo(() => {
    if (filterMode === 'all') return deltas;

    return deltas
      .map((unit) => ({
        ...unit,
        changes: unit.changes.filter((change) =>
          filterMode === 'conflicts' ? change.action === 'conflict' : change.action !== 'conflict'
        ),
      }))
      .filter((unit) => unit.changes.length > 0);
  }, [deltas, filterMode]);

  // Cell key separator - use '::' to avoid conflicts with field names that contain underscores
  const CELL_KEY_SEP = '::';

  // Track which cells have been committed (accepted or ignored)
  const [committedCells, setCommittedCells] = useState<Set<string>>(new Set());

  // Check if a specific cell has been committed
  const isCellCommitted = useCallback((extractionId: number, field: string): boolean => {
    return committedCells.has(`${extractionId}${CELL_KEY_SEP}${field}`);
  }, [committedCells]);

  // Filter out units where ALL changes have been committed
  const visibleDeltas = useMemo(() => {
    return filteredDeltas
      .map((unit) => ({
        ...unit,
        changes: unit.changes.filter(
          (change) => !isCellCommitted(unit.extraction_id, change.field)
        ),
      }))
      .filter((unit) => unit.changes.length > 0);
  }, [filteredDeltas, isCellCommitted]);

  // Visible fields from visible deltas (columns disappear when all cells committed)
  const visibleFields = useMemo(() => {
    const fields = new Set<string>();
    visibleDeltas.forEach((unit) => {
      unit.changes.forEach((change) => fields.add(change.field));
    });
    return Array.from(fields);
  }, [visibleDeltas]);

  const getDecision = useCallback((extractionId: number, field: string): FieldDecision => {
    return decisions[extractionId]?.[field] || 'accept';
  }, [decisions]);

  const setDecision = (extractionId: number, field: string, decision: FieldDecision) => {
    setDecisions((prev) => ({
      ...prev,
      [extractionId]: {
        ...prev[extractionId],
        [field]: decision,
      },
    }));
  };

  const acceptAll = () => {
    const next: Record<number, Record<string, FieldDecision>> = {};
    deltas.forEach((unit) => {
      next[unit.extraction_id] = {};
      unit.changes.forEach((change) => {
        next[unit.extraction_id][change.field] = 'accept';
      });
    });
    setDecisions(next);
  };

  const keepAllExisting = () => {
    const next: Record<number, Record<string, FieldDecision>> = {};
    deltas.forEach((unit) => {
      next[unit.extraction_id] = {};
      unit.changes.forEach((change) => {
        if (change.action === 'conflict') {
          next[unit.extraction_id][change.field] = 'keep_existing';
        } else {
          next[unit.extraction_id][change.field] = 'accept';
        }
      });
    });
    setDecisions(next);
  };

  // Multi-select handlers
  const toggleUnitSelection = useCallback((extractionId: number) => {
    setSelectedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(extractionId)) {
        next.delete(extractionId);
      } else {
        next.add(extractionId);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedUnits.size === visibleDeltas.length) {
      setSelectedUnits(new Set());
    } else {
      setSelectedUnits(new Set(visibleDeltas.map((d) => d.extraction_id)));
    }
  }, [visibleDeltas, selectedUnits.size]);

  // Bulk action for fills only
  const acceptAllFills = useCallback(() => {
    setDecisions((prev) => {
      const next = { ...prev };
      deltas.forEach((unit) => {
        if (!next[unit.extraction_id]) next[unit.extraction_id] = {};
        unit.changes.forEach((change) => {
          if (change.action !== 'conflict') {
            next[unit.extraction_id][change.field] = 'accept';
          }
        });
      });
      return next;
    });
  }, [deltas]);


  // Column selection handlers
  const toggleFieldSelection = useCallback((field: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  }, []);

  // Check if a field column is fully selected (all visible units with that field)
  const getFieldSelectionState = useCallback((field: string): 'none' | 'some' | 'all' => {
    const unitsWithField = visibleDeltas.filter((unit) =>
      unit.changes.some((c) => c.field === field)
    );
    if (unitsWithField.length === 0) return 'none';

    if (selectedFields.has(field)) {
      return 'all';
    }
    return 'none';
  }, [visibleDeltas, selectedFields]);

  // Get all selected cells (combination of row selection and column selection)
  const getSelectedCells = useCallback((): Set<string> => {
    const cells = new Set<string>();

    // Add cells from selected rows
    visibleDeltas.forEach((unit) => {
      if (selectedUnits.has(unit.extraction_id)) {
        unit.changes.forEach((change) => {
          cells.add(`${unit.extraction_id}${CELL_KEY_SEP}${change.field}`);
        });
      }
    });

    // Add cells from selected columns
    selectedFields.forEach((field) => {
      visibleDeltas.forEach((unit) => {
        if (unit.changes.some((c) => c.field === field)) {
          cells.add(`${unit.extraction_id}${CELL_KEY_SEP}${field}`);
        }
      });
    });

    return cells;
  }, [visibleDeltas, selectedUnits, selectedFields]);

  // Track partial commit loading state
  const [isPartialCommitting, setIsPartialCommitting] = useState(false);

  // Helper to commit selected ROWS to the database
  // Only commits extractions where the entire row is selected (all fields)
  const commitSelectedCells = useCallback(async (action: 'accept' | 'keep_existing') => {
    const selectedCells = getSelectedCells();
    if (selectedCells.size === 0) return;

    setIsPartialCommitting(true);
    setError(null);

    try {
      // Group selected cells by extraction_id
      const cellsByExtraction = new Map<number, Set<string>>();
      selectedCells.forEach((cellKey) => {
        const [extractionIdStr, field] = cellKey.split(CELL_KEY_SEP);
        const extractionId = parseInt(extractionIdStr, 10);
        if (!cellsByExtraction.has(extractionId)) {
          cellsByExtraction.set(extractionId, new Set());
        }
        cellsByExtraction.get(extractionId)!.add(field);
      });

      // Only commit rows where ALL visible fields are selected
      const extractionIds: number[] = [];
      const decisionPayload: Record<string, { action: string; edited_value?: unknown }> = {};
      const cellsToCommit = new Set<string>();

      cellsByExtraction.forEach((selectedFieldsForRow, extractionId) => {
        // Find the unit delta for this extraction
        const unit = visibleDeltas.find((d) => d.extraction_id === extractionId);
        if (!unit) return;

        // Check if ALL fields for this row are selected
        const allFieldsForRow = unit.changes.map((c) => c.field);
        const allSelected = allFieldsForRow.every((field) => selectedFieldsForRow.has(field));

        if (!allSelected) {
          // Skip this row - not all fields selected
          // Skipping - not all fields selected for this row
          return;
        }

        // All fields selected - include this row
        extractionIds.push(extractionId);

        const extractedBase = extractedUnitsById[extractionId];
        const editedValue: Record<string, unknown> =
          extractedBase && typeof extractedBase === 'object'
            ? { ...(extractedBase as Record<string, unknown>) }
            : { unit_number: unit.unit_number };

        let needsEdit = false;

        // Process each change in this unit
        unit.changes.forEach((change) => {
          // Mark this cell as being committed
          cellsToCommit.add(`${extractionId}${CELL_KEY_SEP}${change.field}`);

          // Apply the action
          if (action === 'keep_existing') {
            needsEdit = true;
            editedValue[change.field] = change.existing_value;
          }
          // For 'accept', we use the extracted value (already in editedValue from extractedBase)
        });

        if (needsEdit) {
          decisionPayload[String(extractionId)] = {
            action: 'edit',
            edited_value: editedValue,
          };
        } else {
          decisionPayload[String(extractionId)] = { action: 'accept' };
        }
      });

      if (extractionIds.length === 0) {
        setError('Please select all fields in a row to commit. Partial row selection is not supported.');
        return;
      }

      // Call the apply API
      const response = await fetch(`/api/projects/${projectId}/extractions/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extraction_ids: extractionIds,
          decisions: decisionPayload,
        }),
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        const message = result.error || result.errors?.map((e: { error: string }) => e.error).join(', ') || 'Failed to apply changes.';
                throw new Error(message);
      }

      // Success - update local state
      // Update decisions for committed cells only
      setDecisions((prev) => {
        const next = { ...prev };
        cellsToCommit.forEach((cellKey) => {
          const [extractionIdStr, field] = cellKey.split(CELL_KEY_SEP);
          const extractionId = parseInt(extractionIdStr, 10);
          if (!next[extractionId]) next[extractionId] = {};
          next[extractionId][field] = action;
        });
        return next;
      });

      // Mark cells as committed (will be hidden from view)
      setCommittedCells((prev) => {
        const next = new Set(prev);
        cellsToCommit.forEach((cellKey) => next.add(cellKey));
        return next;
      });

      // Clear selection
      setSelectedUnits(new Set());
      setSelectedFields(new Set());

      
    } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsPartialCommitting(false);
    }
  }, [getSelectedCells, visibleDeltas, extractedUnitsById, projectId]);

  // Accept selected cells - commit to DB with extracted values
  const acceptSelectedCells = useCallback(() => {
    commitSelectedCells('accept');
  }, [commitSelectedCells]);

  // Ignore selected cells - commit to DB keeping existing values
  const ignoreSelectedCells = useCallback(() => {
    commitSelectedCells('keep_existing');
  }, [commitSelectedCells]);

  // Count of selected cells for display
  const selectedCellCount = useMemo(() => {
    return getSelectedCells().size;
  }, [getSelectedCells]);

  const handleCommit = async () => {
    setIsCommitting(true);
    setError(null);

    try {
      const extractionIds = deltas.map((d) => d.extraction_id);
      const decisionPayload: Record<string, { action: string; edited_value?: unknown }> = {};

      deltas.forEach((unit) => {
        const extractionId = unit.extraction_id;
        const extractedBase = extractedUnitsById[extractionId];
        const editedValue: Record<string, unknown> =
          extractedBase && typeof extractedBase === 'object'
            ? { ...(extractedBase as Record<string, unknown>) }
            : { unit_number: unit.unit_number };

        let needsEdit = false;

        unit.changes.forEach((change) => {
          const decision = getDecision(extractionId, change.field);
          if (decision === 'keep_existing') {
            needsEdit = true;
            editedValue[change.field] = change.existing_value;
          } else if (!extractedBase) {
            editedValue[change.field] = change.extracted_value;
          }
        });

        if (needsEdit) {
          decisionPayload[String(extractionId)] = {
            action: 'edit',
            edited_value: editedValue,
          };
        } else {
          decisionPayload[String(extractionId)] = { action: 'accept' };
        }
      });

      const response = await fetch(`/api/projects/${projectId}/extractions/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extraction_ids: extractionIds,
          decisions: decisionPayload,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        const message = result.error || (result.errors?.length ? 'Some changes failed to apply.' : 'Failed to commit changes.');
        throw new Error(message);
      }

      onCommitSuccess(result.snapshot_id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsCommitting(false);
    }
  };

  // Detailed status counts for footer
  const statusCounts = useMemo(() => {
    let pendingConflicts = 0;
    let resolvedConflicts = 0;
    let acceptedFills = 0;
    let totalChanges = 0;
    let committedCount = 0;

    deltas.forEach((unit) => {
      unit.changes.forEach((change) => {
        totalChanges += 1;
        const isCommitted = isCellCommitted(unit.extraction_id, change.field);
        if (isCommitted) {
          committedCount += 1;
        } else {
          const decision = getDecision(unit.extraction_id, change.field);
          if (change.action === 'conflict') {
            if (decision === 'accept') {
              pendingConflicts += 1;
            } else {
              resolvedConflicts += 1;
            }
          } else {
            if (decision === 'accept') {
              acceptedFills += 1;
            }
          }
        }
      });
    });

    return {
      pendingConflicts,
      resolvedConflicts,
      acceptedFills,
      totalChanges,
      committedCount,
      remainingCount: totalChanges - committedCount,
    };
  }, [deltas, getDecision, isCellCommitted]);

  // Helper to check if a unit row is resolved (all conflicts decided)
  const isUnitResolved = useCallback((unit: RentRollUnitDelta): boolean => {
    return unit.changes.every((change) => {
      if (change.action !== 'conflict') return true;
      const decision = getDecision(unit.extraction_id, change.field);
      return decision === 'keep_existing';
    });
  }, [getDecision]);

  // Helper to get row styling
  const getRowStyle = useCallback((unit: RentRollUnitDelta): { className: string; style?: React.CSSProperties } => {
    const hasConflict = unit.changes.some((c) => c.action === 'conflict');
    const resolved = isUnitResolved(unit);

    if (hasConflict && !resolved) {
      return { className: 'table-warning' }; // Yellow for unresolved conflicts
    }
    if (hasConflict && resolved) {
      return { className: 'table-secondary' }; // Muted for resolved
    }
    // Light green for fills only (no conflicts)
    return { className: '', style: { backgroundColor: 'rgba(25, 135, 84, 0.1)' } };
  }, [isUnitResolved]);

  // Fetch available snapshots for undo
  const fetchSnapshots = useCallback(async () => {
    setLoadingSnapshots(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/snapshots`);
      const data = await response.json();
      if (data.success && data.snapshots) {
        setSnapshots(data.snapshots);
      }
    } catch (err) {
      console.error('Failed to fetch snapshots:', err);
    } finally {
      setLoadingSnapshots(false);
    }
  }, [projectId]);

  // Load snapshots when undo section is opened
  useEffect(() => {
    if (showUndoSection && snapshots.length === 0) {
      fetchSnapshots();
    }
  }, [showUndoSection, snapshots.length, fetchSnapshots]);

  // Perform rollback to selected snapshot
  const handleRollback = useCallback(async () => {
    if (!selectedSnapshotId) return;

    setIsRollingBack(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/rollback/${selectedSnapshotId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to rollback');
      }

      // Success - refresh data and close
      onRefresh?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rollback failed');
    } finally {
      setIsRollingBack(false);
    }
  }, [selectedSnapshotId, projectId, onRefresh, onClose]);

  // Format date for display
  const formatSnapshotDate = (isoDate: string | null): string => {
    if (!isoDate) return 'Unknown';
    const date = new Date(isoDate);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <CModal
      visible={visible}
      onClose={onClose}
      size="xl"
      scrollable
      backdrop="static"
    >
      <CModalHeader>
        <CModalTitle className="d-flex align-items-center gap-2">
          <span>Review Extracted Data</span>
          {document_name && (
            <small className="text-body-secondary fw-normal">
              - {document_name}
            </small>
          )}
        </CModalTitle>
      </CModalHeader>

      <CModalBody>
        <CAlert
          color={analysis.placeholder_detected ? 'info' : summary.conflicts > 0 ? 'warning' : 'success'}
          className="d-flex align-items-start gap-2"
        >
          <CIcon
            icon={analysis.placeholder_detected ? cilInfo : summary.conflicts > 0 ? cilWarning : cilCheckCircle}
            size="lg"
            className="flex-shrink-0 mt-1"
          />
          <div>
            <strong>Landscaper Analysis</strong>
            <p className="mb-0 mt-1">{analysis.message || 'No additional analysis available.'}</p>
            {summary.exact_matches > 0 && (
              <small className="text-body-secondary">
                {summary.exact_matches} fields matched exactly and will not be modified.
              </small>
            )}
          </div>
        </CAlert>

        <div className="d-flex gap-2 mb-3 flex-wrap">
          <CBadge
            color={filterMode === 'all' ? 'primary' : 'secondary'}
            className="cursor-pointer px-3 py-2"
            onClick={() => setFilterMode('all')}
          >
            All Changes: {summary.fills + summary.conflicts}
          </CBadge>

          {summary.conflicts > 0 && (
            <CBadge
              color={filterMode === 'conflicts' ? 'danger' : 'secondary'}
              className="cursor-pointer px-3 py-2"
              onClick={() => setFilterMode('conflicts')}
            >
              Conflicts: {summary.conflicts}
            </CBadge>
          )}

          {summary.fills > 0 && (
            <CBadge
              color={filterMode === 'fills' ? 'success' : 'secondary'}
              className="cursor-pointer px-3 py-2"
              onClick={() => setFilterMode('fills')}
            >
              Fills: {summary.fills}
            </CBadge>
          )}
        </div>

        {/* Bulk action buttons */}
        <div className="d-flex gap-2 mb-3 flex-wrap align-items-center">
          {summary.fills > 0 && (
            <CButton color="success" size="sm" onClick={acceptAllFills}>
              Accept All Fills
            </CButton>
          )}
          {analysis.recommendation === 'accept_all' && (
            <CButton color="primary" size="sm" onClick={acceptAll}>
              Accept All Extracted
            </CButton>
          )}
          {summary.conflicts > 0 && (
            <>
              <CButton color="outline-primary" size="sm" onClick={acceptAll}>
                Use All Extracted
              </CButton>
              <CButton color="outline-secondary" size="sm" onClick={keepAllExisting}>
                Keep All Existing
              </CButton>
            </>
          )}
          {selectedCellCount > 0 && (
            <>
              <span className="border-start mx-2" style={{ height: '24px' }} />
              <CButton
                color="primary"
                size="sm"
                onClick={acceptSelectedCells}
                disabled={isPartialCommitting}
              >
                {isPartialCommitting ? (
                  <>
                    <CSpinner size="sm" className="me-1" />
                    Committing...
                  </>
                ) : (
                  `Accept Selected (${selectedCellCount})`
                )}
              </CButton>
              <CButton
                color="secondary"
                size="sm"
                onClick={ignoreSelectedCells}
                disabled={isPartialCommitting}
              >
                Ignore Selected ({selectedCellCount})
              </CButton>
            </>
          )}
        </div>

        {visibleDeltas.length > 0 ? (
          <div className="table-responsive">
            <CTable small bordered hover className="mb-0">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell style={{ width: '40px' }}>
                    <CFormCheck
                      checked={selectedUnits.size === visibleDeltas.length && visibleDeltas.length > 0}
                      indeterminate={selectedUnits.size > 0 && selectedUnits.size < visibleDeltas.length}
                      onChange={toggleSelectAll}
                      title="Select all"
                    />
                  </CTableHeaderCell>
                  <CTableHeaderCell style={{ minWidth: '80px' }}>Unit</CTableHeaderCell>
                  {visibleFields.map((field) => {
                    const selectionState = getFieldSelectionState(field);
                    return (
                      <CTableHeaderCell
                        key={field}
                        className={isNumericField(field) ? 'text-end' : ''}
                        style={{ minWidth: '100px' }}
                      >
                        <div className="d-flex align-items-center gap-1">
                          <CFormCheck
                            checked={selectionState === 'all'}
                            indeterminate={selectionState === 'some'}
                            onChange={() => toggleFieldSelection(field)}
                            title={`Select all ${getFieldLabel(field)} values`}
                            className="me-1"
                          />
                          <span>{getFieldLabel(field)}</span>
                        </div>
                      </CTableHeaderCell>
                    );
                  })}
                  <CTableHeaderCell style={{ width: '40px' }}>Status</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {visibleDeltas.map((unit) => {
                  const rowResolved = isUnitResolved(unit);
                  const hasConflict = unit.changes.some((c) => c.action === 'conflict');
                  const rowStyle = getRowStyle(unit);

                  return (
                    <CTableRow key={unit.extraction_id} className={rowStyle.className} style={rowStyle.style}>
                      <CTableDataCell>
                        <CFormCheck
                          checked={selectedUnits.has(unit.extraction_id)}
                          onChange={() => toggleUnitSelection(unit.extraction_id)}
                        />
                      </CTableDataCell>
                      <CTableDataCell className="fw-medium">
                        {unit.unit_number ?? '-'}
                      </CTableDataCell>
                      {visibleFields.map((field) => {
                        const change = unit.changes.find((c) => c.field === field);
                        if (!change) {
                          return <CTableDataCell key={field}>-</CTableDataCell>;
                        }

                        const decision = getDecision(unit.extraction_id, field);
                        const isConflict = change.action === 'conflict';

                        return (
                          <CTableDataCell
                            key={field}
                            className={isNumericField(field) ? 'text-end' : ''}
                          >
                            {isConflict ? (
                              <ConflictCell
                                change={change}
                                decision={decision}
                                idPrefix={`${unit.extraction_id}-${field}`}
                                onDecisionChange={(next) => setDecision(unit.extraction_id, field, next)}
                              />
                            ) : (
                              <span title={change.action === 'replace_placeholder' ? 'Replacing placeholder' : 'Filling blank'}>
                                {formatFieldValue(field, change.extracted_value)}
                              </span>
                            )}
                          </CTableDataCell>
                        );
                      })}
                      <CTableDataCell className="text-center">
                        {hasConflict ? (
                          rowResolved ? (
                            <CIcon icon={cilCheckAlt} size="sm" className="text-success" title="Resolved" />
                          ) : (
                            <CIcon icon={cilWarning} size="sm" className="text-warning" title="Needs review" />
                          )
                        ) : (
                          <CIcon icon={cilCheckCircle} size="sm" className="text-success" title="Ready" />
                        )}
                      </CTableDataCell>
                    </CTableRow>
                  );
                })}
              </CTableBody>
            </CTable>
          </div>
        ) : (
          <CAlert color="secondary">
            No changes to display for the current filter.
          </CAlert>
        )}

        {/* Undo/Rollback Section */}
        <div className="mt-4 border-top pt-3">
          <div
            className="d-flex align-items-center gap-2 cursor-pointer text-body-secondary"
            onClick={() => setShowUndoSection((prev) => !prev)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setShowUndoSection((prev) => !prev);
            }}
          >
            <CIcon icon={cilHistory} size="sm" />
            <span className="small fw-medium">
              {showUndoSection ? 'Hide' : 'Show'} Undo Options
            </span>
          </div>

          {showUndoSection && (
            <div className="mt-3 p-3 bg-body-tertiary rounded">
              <h6 className="mb-2 d-flex align-items-center gap-2">
                <CIcon icon={cilReload} />
                Rollback to Previous State
              </h6>
              <p className="small text-body-secondary mb-3">
                Select a previous commit to restore the rent roll to that state. This will undo all changes made after that point.
              </p>

              {loadingSnapshots ? (
                <div className="d-flex align-items-center gap-2 text-body-secondary">
                  <CSpinner size="sm" />
                  <span>Loading snapshots...</span>
                </div>
              ) : snapshots.length === 0 ? (
                <CAlert color="info" className="mb-0">
                  No previous commits available for rollback.
                </CAlert>
              ) : (
                <>
                  <div className="mb-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {snapshots.map((snap) => (
                      <div
                        key={snap.snapshot_id}
                        className={`p-2 border rounded mb-2 cursor-pointer ${
                          selectedSnapshotId === snap.snapshot_id
                            ? 'border-primary bg-primary bg-opacity-10'
                            : 'border-secondary-subtle'
                        } ${!snap.is_active ? 'opacity-50' : ''}`}
                        onClick={() => snap.is_active && setSelectedSnapshotId(snap.snapshot_id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if ((e.key === 'Enter' || e.key === ' ') && snap.is_active) {
                            setSelectedSnapshotId(snap.snapshot_id);
                          }
                        }}
                      >
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <span className="fw-medium">
                              {formatSnapshotDate(snap.committed_at)}
                            </span>
                            <span className="ms-2 text-body-secondary small">
                              ({snap.extractions_count} extractions, {snap.units_count} units)
                            </span>
                          </div>
                          <div>
                            {snap.is_active ? (
                              <CBadge color="success" className="small">Available</CBadge>
                            ) : (
                              <CBadge color="secondary" className="small">
                                Rolled back {snap.rolled_back_at ? formatSnapshotDate(snap.rolled_back_at) : ''}
                              </CBadge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="d-flex gap-2">
                    <CButton
                      color="warning"
                      size="sm"
                      onClick={handleRollback}
                      disabled={!selectedSnapshotId || isRollingBack}
                    >
                      {isRollingBack ? (
                        <>
                          <CSpinner size="sm" className="me-1" />
                          Rolling back...
                        </>
                      ) : (
                        'Rollback to Selected'
                      )}
                    </CButton>
                    <CButton
                      color="secondary"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedSnapshotId(null);
                        setShowUndoSection(false);
                      }}
                    >
                      Cancel
                    </CButton>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {error && (
          <CAlert color="danger" className="mt-3">
            {error}
          </CAlert>
        )}
      </CModalBody>

      <CModalFooter className="d-flex justify-content-between">
        <div className="text-body-secondary small d-flex gap-3 flex-wrap">
          <span>
            <strong>{statusCounts.remainingCount}</strong> of {statusCounts.totalChanges} field(s) remaining
          </span>
          {statusCounts.committedCount > 0 && (
            <span className="text-success">
              <CIcon icon={cilCheckAlt} size="sm" className="me-1" />
              {statusCounts.committedCount} committed
            </span>
          )}
          {statusCounts.pendingConflicts > 0 && (
            <span className="text-warning">
              <CIcon icon={cilWarning} size="sm" className="me-1" />
              {statusCounts.pendingConflicts} conflicts pending
            </span>
          )}
        </div>
        <div className="d-flex gap-2">
          <CButton
            color="secondary"
            onClick={() => {
              onRefresh?.();
              onClose();
            }}
          >
            Close
          </CButton>
          <CButton
            color="primary"
            onClick={handleCommit}
            disabled={isCommitting || statusCounts.remainingCount === 0}
          >
            {isCommitting ? (
              <>
                <CSpinner size="sm" className="me-2" />
                Committing...
              </>
            ) : statusCounts.remainingCount === 0 ? (
              'All Done!'
            ) : (
              `Commit ${statusCounts.remainingCount} Field(s)`
            )}
          </CButton>
        </div>
      </CModalFooter>
    </CModal>
  );
};

interface ConflictCellProps {
  change: RentRollFieldChange;
  decision: FieldDecision;
  idPrefix: string;
  onDecisionChange: (decision: FieldDecision) => void;
}

const ConflictCell: React.FC<ConflictCellProps> = ({
  change,
  decision,
  idPrefix,
  onDecisionChange,
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const [openLeft, setOpenLeft] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayValue = decision === 'keep_existing'
    ? change.existing_value
    : change.extracted_value;

  // Smart positioning: check if dropdown would overflow right edge
  useEffect(() => {
    if (showOptions && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const dropdownWidth = 220; // minWidth + padding
      const spaceOnRight = viewportWidth - rect.right;

      // If not enough space on right, open to the left
      setOpenLeft(spaceOnRight < dropdownWidth);
    }
  }, [showOptions]);

  // Close on click outside
  useEffect(() => {
    if (!showOptions) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setShowOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showOptions]);

  const isResolved = decision === 'keep_existing';

  return (
    <div className="position-relative" ref={triggerRef}>
      <div
        className="d-flex align-items-center gap-1 cursor-pointer"
        onClick={() => setShowOptions((prev) => !prev)}
      >
        <span className={isResolved ? 'text-body-secondary text-decoration-line-through' : ''}>
          {formatFieldValue(change.field, displayValue)}
        </span>
        {isResolved ? (
          <CIcon icon={cilCheckAlt} size="sm" className="text-success" />
        ) : (
          <CIcon icon={cilWarning} size="sm" className="text-warning" />
        )}
      </div>

      {showOptions && (
        <div
          ref={dropdownRef}
          className="position-absolute bg-body border rounded shadow-sm p-2"
          style={{
            minWidth: '200px',
            top: '100%',
            left: openLeft ? 'auto' : 0,
            right: openLeft ? 0 : 'auto',
            zIndex: 10,
          }}
        >
          <div className="small text-body-secondary mb-2">
            <div className="d-flex justify-content-between">
              <span>Existing:</span>
              <strong>{formatFieldValue(change.field, change.existing_value)}</strong>
            </div>
            <div className="d-flex justify-content-between">
              <span>Extracted:</span>
              <strong className="text-primary">{formatFieldValue(change.field, change.extracted_value)}</strong>
            </div>
          </div>
          <div className="d-flex flex-column gap-1">
            <CFormCheck
              type="radio"
              name={`conflict-${idPrefix}`}
              id={`use-extracted-${idPrefix}`}
              label="Use extracted"
              checked={decision === 'accept'}
              onChange={() => {
                onDecisionChange('accept');
                setShowOptions(false);
              }}
            />
            <CFormCheck
              type="radio"
              name={`conflict-${idPrefix}`}
              id={`keep-existing-${idPrefix}`}
              label="Keep existing"
              checked={decision === 'keep_existing'}
              onChange={() => {
                onDecisionChange('keep_existing');
                setShowOptions(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default RentRollUpdateReviewModal;
