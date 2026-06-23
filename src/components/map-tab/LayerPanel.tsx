/**
 * LayerPanel Component
 *
 * Left sidebar showing the layer tree with toggleable groups and layers.
 */

'use client';

import React, { useState } from 'react';
import type { LayerPanelProps } from './types';

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
}: LayerPanelProps) {
  // "Overlays" is its own legend section (saved overlays carry per-plan
  // actions the generic layer rows don't). Local expand state — there's no
  // group-id in the LayerState model for it.
  const [sitePlansExpanded, setSitePlansExpanded] = useState(true);
  const hasSitePlans = Array.isArray(sitePlans) && sitePlans.length > 0;
  // Inline rename: the overlay id being renamed + the in-progress text.
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');

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

            {/* Group Layers */}
            {group.expanded && (
              <div className="layer-group-items">
                {group.layers.map((layer) => (
                  <div key={layer.id} className={`layer-item ${layer.disabled ? 'disabled' : ''}`}>
                    <label className={`layer-item-label ${layer.disabled ? 'disabled' : ''}`}>
                      <input
                        type="checkbox"
                        checked={layer.visible}
                        onChange={() => onToggleLayer(group.id, layer.id)}
                        disabled={layer.disabled}
                        className="layer-item-checkbox"
                      />
                      <span
                        className="layer-item-color"
                        style={{ backgroundColor: layer.color }}
                      />
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
                ))}
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
      </div>
    </div>
  );
}

export default LayerPanel;
