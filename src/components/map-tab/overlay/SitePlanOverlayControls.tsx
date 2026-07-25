'use client';

/**
 * SitePlanOverlayControls — opacity, rotation, scale, lock, warp-mode, snap indicator,
 * and save for the site-plan image drape. Presentational; state lives in
 * useSitePlanOverlay. Uses CoreUI / wrapper CSS tokens — no hardcoded palette except
 * the green snap indicator, which mirrors the handle snap color.
 *
 * SS14: scale slider, lock toggle, and Quad/Warp (TPS) mode switch are additive; the
 * opacity/rotation/name/save controls are unchanged.
 */

import React from 'react';

export type OverlayWarpMode = 'quad' | 'tps';

export interface SitePlanOverlayControlsProps {
  /** Editable overlay name (set during creation; pre-filled when editing). */
  title: string;
  onTitleChange: (value: string) => void;
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
  // SS14 — additive. Rendered only when the handlers are supplied.
  scale?: number;
  onScaleChange?: (factor: number) => void;
  locked?: boolean;
  onLockToggle?: (locked: boolean) => void;
  warpMode?: OverlayWarpMode;
  onWarpModeChange?: (mode: OverlayWarpMode) => void;
  /** TPS warp needs ≥3 control points; the toggle is disabled until then. */
  tpsAvailable?: boolean;
}

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--w-text-secondary, var(--cui-body-color))',
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '2px',
};

export function SitePlanOverlayControls({
  title,
  onTitleChange,
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
  scale,
  onScaleChange,
  locked = false,
  onLockToggle,
  warpMode = 'quad',
  onWarpModeChange,
  tpsAvailable = false,
}: SitePlanOverlayControlsProps) {
  const showScale = typeof scale === 'number' && !!onScaleChange;
  const showLock = !!onLockToggle;
  const showWarp = !!onWarpModeChange;
  const isTps = warpMode === 'tps';
  // In TPS mode the warp is driven by control points, so the quad transforms
  // (rotation/scale) don't apply; lock also freezes them.
  const transformsDisabled = locked || isTps;

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
          Overlay
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

      {/* Name */}
      <div>
        <div style={labelStyle}>
          <span>Name</span>
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Overlay name"
          style={{
            width: '100%',
            fontSize: '12px',
            padding: '4px 6px',
            borderRadius: '4px',
            border: '1px solid var(--w-border, var(--cui-border-color))',
            background: 'var(--w-bg-input, var(--cui-body-bg))',
            color: 'var(--w-text-primary, var(--cui-body-color))',
          }}
        />
      </div>

      {/* Warp mode (SS14) */}
      {showWarp && (
        <div>
          <div style={labelStyle}>
            <span>Warp mode</span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className={`btn ${!isTps ? 'btn-primary' : 'btn-ghost-secondary'}`}
              onClick={() => onWarpModeChange?.('quad')}
              style={{ flex: 1, fontSize: '11.5px', padding: '4px 6px' }}
            >
              4-corner
            </button>
            <button
              type="button"
              className={`btn ${isTps ? 'btn-primary' : 'btn-ghost-secondary'}`}
              onClick={() => tpsAvailable && onWarpModeChange?.('tps')}
              disabled={!tpsAvailable}
              title={tpsAvailable ? 'Rubber-sheet warp from control points' : 'Place at least 3 control points to enable warp'}
              style={{ flex: 1, fontSize: '11.5px', padding: '4px 6px', opacity: tpsAvailable ? 1 : 0.5 }}
            >
              Warp (TPS)
            </button>
          </div>
        </div>
      )}

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
          disabled={transformsDisabled}
          style={{ width: '100%', opacity: transformsDisabled ? 0.5 : 1 }}
        />
      </div>

      {/* Scale (SS14) */}
      {showScale && (
        <div>
          <div style={labelStyle}>
            <span>Scale</span>
            <span>{Math.round((scale as number) * 100)}%</span>
          </div>
          <input
            type="range"
            min={25}
            max={400}
            step={5}
            value={Math.round((scale as number) * 100)}
            onChange={(e) => onScaleChange?.(Number(e.target.value) / 100)}
            disabled={transformsDisabled}
            style={{ width: '100%', opacity: transformsDisabled ? 0.5 : 1 }}
          />
        </div>
      )}

      {/* Lock (SS14) */}
      {showLock && (
        <button
          type="button"
          className={`btn ${locked ? 'btn-warning' : 'btn-ghost-secondary'}`}
          onClick={() => onLockToggle?.(!locked)}
          style={{ fontSize: '11.5px', padding: '4px 8px', alignSelf: 'flex-start' }}
          title={locked ? 'Unlock the overlay transform' : 'Lock so the overlay can’t be nudged'}
        >
          {locked ? '🔒 Locked' : '🔓 Lock transform'}
        </button>
      )}

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
