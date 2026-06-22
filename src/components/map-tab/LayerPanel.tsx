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
}: LayerPanelProps) {
  // "Site Plans" is its own legend section (saved overlays carry per-plan
  // actions the generic layer rows don't). Local expand state — there's no
  // group-id in the LayerState model for it.
  const [sitePlansExpanded, setSitePlansExpanded] = useState(true);
  const hasSitePlans = Array.isArray(sitePlans) && sitePlans.length > 0;

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
              <span className="layer-group-label">Site Plans</span>
            </button>

            {sitePlansExpanded && (
              <div className="layer-group-items">
                {sitePlans!.map((plan) => (
                  <div key={plan.overlay_id} className="layer-item">
                    <label className="layer-item-label">
                      <input
                        type="checkbox"
                        checked={plan.visible}
                        onChange={() => onToggleSitePlan?.(plan.overlay_id)}
                        className="layer-item-checkbox"
                      />
                      <span className="layer-item-name" title={plan.title}>
                        {plan.title}
                      </span>
                    </label>
                    <div className="layer-item-actions">
                      <button
                        type="button"
                        className="layer-item-action"
                        onClick={() => onEditSitePlan?.(plan.overlay_id)}
                        disabled={plan.editing}
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
