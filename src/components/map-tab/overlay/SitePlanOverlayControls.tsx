'use client';

/**
 * SitePlanOverlayControls — opacity, rotation, snap indicator, and save for the
 * site-plan image drape (first slice). Presentational; state lives in
 * useSitePlanOverlay. Uses CoreUI / wrapper CSS tokens — no hardcoded palette
 * except the green snap indicator, which mirrors the handle snap color.
 */

import React from 'react';

export interface SitePlanOverlayControlsProps {
  opacity: number;
  rotationDeg: number;
  snapping: boolean;
  lastSnapped: boolean;
  saving?: boolean;
  saveError?: string | null;
  onOpacityChange: (value: number) => void;
  onRotationChange: (deg: number) => void;
  onSave: () => void;
  onCancel: () => void;
}

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--w-text-secondary, var(--cui-body-color))',
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '2px',
};

export function SitePlanOverlayControls({
  opacity,
  rotationDeg,
  snapping,
  lastSnapped,
  saving = false,
  saveError = null,
  onOpacityChange,
  onRotationChange,
  onSave,
  onCancel,
}: SitePlanOverlayControlsProps) {
  return (
    <div
      style={{
        padding: '10px 12px',
        borderTop: '1px solid var(--w-border, var(--cui-border-color))',
        background: 'var(--w-bg-surface, var(--cui-secondary-bg))',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--w-text-primary, var(--cui-body-color))' }}>
          Site Plan Overlay
        </span>
        {snapping && (
          <span
            style={{
              fontSize: '10.5px',
              fontWeight: 600,
              color: lastSnapped ? '#2e9c6f' : 'var(--w-text-tertiary, var(--cui-tertiary-color))',
            }}
            title="Drag a corner near a parcel line to snap"
          >
            {lastSnapped ? '● snapped to lot' : '○ snap on'}
          </span>
        )}
      </div>

      {/* Opacity */}
      <div>
        <div style={labelStyle}>
          <span>Opacity</span>
          <span>{Math.round(opacity * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(opacity * 100)}
          onChange={(e) => onOpacityChange(Number(e.target.value) / 100)}
          style={{ width: '100%' }}
        />
      </div>

      {/* Rotation */}
      <div>
        <div style={labelStyle}>
          <span>Rotation</span>
          <span>{rotationDeg}°</span>
        </div>
        <input
          type="range"
          min={-180}
          max={180}
          value={rotationDeg}
          onChange={(e) => onRotationChange(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {saveError && (
        <div style={{ fontSize: '11px', color: 'var(--cui-danger, #ef4444)' }}>{saveError}</div>
      )}

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn btn-ghost-secondary"
          onClick={onCancel}
          disabled={saving}
          style={{ fontSize: '12px', padding: '5px 12px' }}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onSave}
          disabled={saving}
          style={{ fontSize: '12px', padding: '5px 12px' }}
        >
          {saving ? 'Saving…' : 'Save Overlay'}
        </button>
      </div>
    </div>
  );
}
