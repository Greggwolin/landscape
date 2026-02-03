'use client';

import React from 'react';
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  CBadge,
  CSpinner,
  CTable,
  CTableBody,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react';
import { SemanticButton } from '@/components/ui/landscape';
import CIcon from '@coreui/icons-react';
import { cilPlus } from '@coreui/icons';
import { UnitOfMeasure, UnitOfMeasureDraft } from '@/lib/measures';
import AddUOMRow from './AddUOMRow';
import UOMRow from './UOMRow';

type SaveResult = { ok: boolean; error?: string };

interface UOMTableProps {
  measures: UnitOfMeasure[];
  isAdding: boolean;
  onAddClick: () => void;
  onCancelAdd: () => void;
  onSaveNew: (draft: UnitOfMeasureDraft) => Promise<SaveResult>;
  editingCode: string | null;
  savingCode: string | null;
  onStartEdit: (code: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (code: string, draft: UnitOfMeasureDraft) => Promise<SaveResult>;
  onRequestDelete: (measure: UnitOfMeasure) => void;
  loading?: boolean;
  onReorder: (codes: string[]) => void;
}

const UOMTable: React.FC<UOMTableProps> = ({
  measures,
  isAdding,
  onAddClick,
  onCancelAdd,
  onSaveNew,
  editingCode,
  savingCode,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onRequestDelete,
  loading = false,
  onReorder,
}) => {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = measures.findIndex((m) => m.measure_code === active.id);
    const newIndex = measures.findIndex((m) => m.measure_code === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(measures, oldIndex, newIndex);
    onReorder(reordered.map((m) => m.measure_code));
  };

  const SortableRow = ({ measure }: { measure: UnitOfMeasure }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: measure.measure_code,
      disabled: isAdding || Boolean(activeId && activeId !== measure.measure_code) || loading,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.6 : undefined,
      cursor: 'grab',
    };

    return (
      <UOMRow
        ref={setNodeRef}
        measure={measure}
        isEditing={editingCode === measure.measure_code}
        isSaving={savingCode === measure.measure_code}
        onEdit={() => onStartEdit(measure.measure_code)}
        onSave={(draft) => onSaveEdit(measure.measure_code, draft)}
        onCancel={onCancelEdit}
        onDelete={() => onRequestDelete(measure)}
        dragHandleAttributes={attributes}
        dragHandleListeners={listeners}
        dragStyle={style}
      />
    );
  };

  return (
    <div>
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <SortableContext
          items={measures.map((m) => m.measure_code)}
          strategy={verticalListSortingStrategy}
        >
          <div className="uom-table-card">
            <CTable hover responsive bordered className="uom-table mb-0">
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell scope="col" style={{ width: '40px' }} />
                  <CTableHeaderCell scope="col" style={{ width: '90px' }}>
                    Code
                  </CTableHeaderCell>
                <CTableHeaderCell scope="col" style={{ width: '240px' }}>
                  Name
                </CTableHeaderCell>
                <CTableHeaderCell scope="col" style={{ width: '160px' }}>
                  Category
                </CTableHeaderCell>
                <CTableHeaderCell scope="col" style={{ width: '200px' }}>
                  Contexts
                </CTableHeaderCell>
                <CTableHeaderCell scope="col" style={{ width: '160px' }} className="text-end">
                  <div className="d-flex justify-content-end align-items-center gap-2">
                    <span className="fw-semibold">Actions</span>
                    <SemanticButton intent="primary-action" size="sm" onClick={onAddClick} disabled={isAdding || Boolean(savingCode) || loading}>
                      <CIcon icon={cilPlus} className="me-1" /> Add
                    </SemanticButton>
                  </div>
                </CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {isAdding && (
                  <AddUOMRow
                  onSave={onSaveNew}
                  onCancel={onCancelAdd}
                  isSaving={savingCode === 'NEW'}
                />
              )}

                {measures.map((measure) => (
                  <SortableRow key={measure.measure_code} measure={measure} />
                ))}

              {!isAdding && measures.length === 0 && (
                <CTableRow>
                  <CTableHeaderCell colSpan={6} className="text-center py-4">
                    {loading ? (
                      <div className="d-flex align-items-center justify-content-center gap-2">
                        <CSpinner size="sm" />
                        <span>Loading measures...</span>
                      </div>
                    ) : (
                      <div className="text-muted">No measures found</div>
                    )}
                  </CTableHeaderCell>
                </CTableRow>
                )}
              </CTableBody>
            </CTable>
          </div>
        </SortableContext>
      </DndContext>

      {loading && measures.length > 0 && (
        <div className="d-flex align-items-center gap-2 text-muted small mt-2">
          <CSpinner size="sm" />
          <span>Refreshing measures...</span>
        </div>
      )}

      <div className="d-flex gap-2 align-items-center text-muted small mt-2">
        <CBadge color="success" shape="rounded-pill">
          Active
        </CBadge>
        <span>visible in dropdowns ·</span>
        <CBadge color="secondary" shape="rounded-pill">
          Inactive
        </CBadge>
        <span>kept for historical data</span>
      </div>
    </div>
  );
};

export default UOMTable;
