/**
 * LayerPanel Component
 *
 * Left sidebar showing the layer tree with toggleable groups and layers.
 *
 * Data-layer rows (the `layers.groups` entries) are drag-reorderable within
 * their group via @dnd-kit when `onReorderLayer` is supplied — the legend order
 * is the source of truth for the map's draw order (top of legend = drawn on
 * top). The Overlays (site plans) and Annotations (per-shape) sections stay
 * pinned; they carry their own "always on top" semantics.
 */

'use client';

import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { LayerGroup, LayerItem, LayerGroupId, LayerPanelProps } from './types';

/** A single draggable data-layer row. Keeps the existing checkbox / color /
 *  name / count controls; the grip handle is the only drag affordance so
 *  clicking the row still toggles or zooms. */
function SortableLayerRow({
  group,
  layer,
  dragEnabled,
  onToggleLayer,
  onZoomToLayer,
}: {
  group: LayerGroup;
  layer: LayerItem;
  dragEnabled: boolean;
  onToggleLayer: (groupId: LayerGroupId, layerId: string) => void;
  onZoomToLayer: (groupId: LayerGroupId, layerId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: layer.id,
    disabled: !dragEnabled || layer.disabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`layer-item layer-item-sortable ${layer.disabled ? 'disabled' : ''}${isDragging ? ' layer-item-dragging' : ''}`}
    >
      {dragEnabled && !layer.disabled && (
        <button
          type="button"
          className="layer-item-drag-handle"
          aria-label={`Reorder ${layer.label}`}
          title="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="9" cy="6" r="1.6" />
            <circle cx="15" cy="6" r="1.6" />
            <circle cx="9" cy="12" r="1.6" />
            <circle cx="15" cy="12" r="1.6" />
            <circle cx="9" cy="18" r="1.6" />
            <circle cx="15" cy="18" r="1.6" />
          </svg>
        </button>
      )}
      <label className={`layer-item-label ${layer.disabled ? 'disabled' : ''}`}>
        <input
          type="checkbox"
          checked={layer.visible}
          onChange={() => onToggleLayer(group.id, layer.id)}
          disabled={layer.disabled}
          className="layer-item-checkbox"
        />
        <span className="layer-item-color" style={{ backgroundColor: layer.color }} />
        <span
          className={`layer-item-name ${layer.disabled ? 'disabled' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (layer.disabled) return;
            onZoomToLayer(group.id, layer.id);
          }}
        >
          {layer.label}
        </span>
        {layer.count !== undefined && layer.count > 0 && (
          <span className="layer-item-count">({layer.count})</span>
        )}
      </label>
    </div>
  );
}

export function LayerPanel({
  layers,
  onToggleLayer,
  onToggleGroup,
  onZoomToLayer,
  sitePlans,
  onToggleSitePlan,
  onEditSitePlan,
  onRemoveSitePlan,
  onRenameSitePlan,
  annotations,
  onToggleAnnotation,
  onRenameAnnotation,
  onEditAnnotation,
  onRemoveAnnotation,
  onReorderLayer,
}: LayerPanelProps) {
  // "Overlays" is its own legend section (saved overlays carry per-plan
  // actions the generic layer rows don't). Local expand state — there's no
  // group-id in the LayerState model for it.
  const [sitePlansExpanded, setSitePlansExpanded] = useState(true);
  const hasSitePlans = Array.isArray(sitePlans) && sitePlans.length > 0;
  // "Annotations" — one row per drawn shape, with an editable name.
  const [annotationsExpanded, setAnnotationsExpanded] = useState(true);
  const hasAnnotations = Array.isArray(annotations) && annotations.length > 0;
  // Inline rename: the overlay id being renamed + the in-progress text.
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  // Inline rename for annotations (string ids, separate from overlays).
  const [renamingAnnId, setRenamingAnnId] = useState<string | null>(null);
  const [annRenameValue, setAnnRenameValue] = useState('');

  const dragEnabled = typeof onReorderLayer === 'function';
  // A small activation distance so a click on the handle that doesn't move
  // (or a click elsewhere on the row) never starts a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (group: LayerGroup) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorderLayer?.(group.id, String(active.id), String(over.id));
  };

  const startRename = (overlayId: number, current: string) => {
    setRenamingId(overlayId);
    setRenameValue(current);
  };
  const commitRename = () => {
    if (renamingId != null) onRenameSitePlan?.(renamingId, renameValue);
    setRenamingId(null);
    setRenameValue('');
  };
  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue('');
  };

  const startAnnRename = (id: string, current: string) => {
    setRenamingAnnId(id);
    setAnnRenameValue(current);
  };
  const commitAnnRename = () => {
    if (renamingAnnId != null) onRenameAnnotation?.(renamingAnnId, annRenameValue);
    setRenamingAnnId(null);
    setAnnRenameValue('');
  };
  const cancelAnnRename = () => {
    setRenamingAnnId(null);
    setAnnRenameValue('');
  };

  return (
    <div className="layer-panel">
      <div className="layer-panel-header">Layers</div>

      <div className="layer-panel-content">
        {layers.groups.map((group) => (
          <div key={group.id} className="layer-group">
            {/* Group Header */}
            <button
              type="button"
              className="layer-group-header"
              onClick={() => onToggleGroup(group.id)}
            >
              <span className={`layer-group-chevron ${group.expanded ? 'expanded' : ''}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </span>
              <span className="layer-group-label">{group.label}</span>
            </button>

            {/* Group Layers — drag-reorderable within the group */}
            {group.expanded && (
              <div className="layer-group-items">
                {dragEnabled ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd(group)}
                  >
                    <SortableContext
                      items={group.layers.map((l) => l.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {group.layers.map((layer) => (
                        <SortableLayerRow
                          key={layer.id}
                          group={group}
                          layer={layer}
                          dragEnabled={dragEnabled}
                          onToggleLayer={onToggleLayer}
                          onZoomToLayer={onZoomToLayer}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                ) : (
                  group.layers.map((layer) => (
                    <SortableLayerRow
                      key={layer.id}
                      group={group}
                      layer={layer}
                      dragEnabled={false}
                      onToggleLayer={onToggleLayer}
                      onZoomToLayer={onZoomToLayer}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        ))}

        {/* Site Plans — saved overlays with per-plan visibility + edit/remove */}
        {hasSitePlans && (
          <div className="layer-group">
            <button
              type="button"
              className="layer-group-header"
              onClick={() => setSitePlansExpanded((v) => !v)}
            >
              <span className={`layer-group-chevron ${sitePlansExpanded ? 'expanded' : ''}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </span>
              <span className="layer-group-label">Overlays</span>
            </button>

            {sitePlansExpanded && (
              <div className="layer-group-items">
                {sitePlans!.map((plan) => (
                  <div
                    key={plan.overlay_id}
                    className={`layer-item${plan.unavailable ? ' layer-item-unavailable' : ''}`}
                  >
                    <label className={`layer-item-label${plan.unavailable ? ' disabled' : ''}`}>
                      <input
                        type="checkbox"
                        // A missing image can't be shown — keep it unchecked + disabled.
                        checked={plan.visible && !plan.unavailable}
                        disabled={plan.unavailable}
                        onChange={() => onToggleSitePlan?.(plan.overlay_id)}
                        className="layer-item-checkbox"
                      />
                      {renamingId === plan.overlay_id ? (
                        <input
                          type="text"
                          className="layer-item-rename-input"
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onClick={(e) => e.preventDefault()}
                          onBlur={commitRename}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
                            else if (e.key === 'Escape') { e.preventDefault(); cancelRename(); }
                          }}
                        />
                      ) : (
                        <span
                          className={`layer-item-name${plan.unavailable ? ' disabled' : ''}`}
                          title={plan.unavailable ? 'Overlay image unavailable — remove and re-drape' : plan.title}
                          onDoubleClick={() => onRenameSitePlan && startRename(plan.overlay_id, plan.title)}
                        >
                          {plan.title}
                          {plan.unavailable && (
                            <span className="layer-item-warning"> · image unavailable — re-drape</span>
                          )}
                        </span>
                      )}
                    </label>
                    <div className="layer-item-actions">
                      {onRenameSitePlan && renamingId !== plan.overlay_id && (
                        <button
                          type="button"
                          className="layer-item-action"
                          onClick={() => startRename(plan.overlay_id, plan.title)}
                        >
                          Rename
                        </button>
                      )}
                      <button
                        type="button"
                        className="layer-item-action"
                        onClick={() => onEditSitePlan?.(plan.overlay_id)}
                        // Can't re-enter the editor on a 404'd image — re-drape instead.
                        disabled={plan.editing || plan.unavailable}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="layer-item-action"
                        onClick={() => onRemoveSitePlan?.(plan.overlay_id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Drawn Items — one row per drawn shape, with a per-shape visibility
            checkbox + editable name. Distinct from the "Annotations" category
            group (Drawn Shapes / Measurements / Notes) rendered above. */}
        {hasAnnotations && (
          <div className="layer-group">
            <button
              type="button"
              className="layer-group-header"
              onClick={() => setAnnotationsExpanded((v) => !v)}
            >
              <span className={`layer-group-chevron ${annotationsExpanded ? 'expanded' : ''}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </span>
              <span className="layer-group-label">Drawn Items</span>
            </button>

            {annotationsExpanded && (
              <div className="layer-group-items">
                {annotations!.map((ann) => (
                  <div key={ann.id} className="layer-item">
                    <label className="layer-item-label">
                      <input
                        type="checkbox"
                        checked={ann.visible !== false}
                        onChange={() => onToggleAnnotation?.(ann.id)}
                        className="layer-item-checkbox"
                      />
                      {renamingAnnId === ann.id ? (
                        <input
                          type="text"
                          className="layer-item-rename-input"
                          autoFocus
                          value={annRenameValue}
                          onChange={(e) => setAnnRenameValue(e.target.value)}
                          onClick={(e) => e.preventDefault()}
                          onBlur={commitAnnRename}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); commitAnnRename(); }
                            else if (e.key === 'Escape') { e.preventDefault(); cancelAnnRename(); }
                          }}
                        />
                      ) : (
                        <span
                          className="layer-item-name"
                          title={ann.label}
                          onDoubleClick={() => onRenameAnnotation && startAnnRename(ann.id, ann.label)}
                        >
                          {ann.label}
                        </span>
                      )}
                    </label>
                    <div className="layer-item-actions">
                      {onRenameAnnotation && renamingAnnId !== ann.id && (
                        <button
                          type="button"
                          className="layer-item-action"
                          onClick={() => startAnnRename(ann.id, ann.label)}
                        >
                          Rename
                        </button>
                      )}
                      {onEditAnnotation && (
                        <button
                          type="button"
                          className="layer-item-action"
                          onClick={() => onEditAnnotation(ann.id)}
                        >
                          Edit
                        </button>
                      )}
                      {onRemoveAnnotation && (
                        <button
                          type="button"
                          className="layer-item-action"
                          onClick={() => onRemoveAnnotation(ann.id)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default LayerPanel;
