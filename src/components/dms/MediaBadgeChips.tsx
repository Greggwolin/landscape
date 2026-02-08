'use client';

import React, { useState } from 'react';
import { CBadge, CSpinner } from '@coreui/react';

/**
 * Badge color order for consistent rendering (most common media types first).
 * Maps to CoreUI color tokens used in lu_media_classification.
 */
const BADGE_COLOR_ORDER = ['primary', 'success', 'danger', 'warning', 'info', 'secondary'] as const;

/**
 * Icon hints for each badge color group (tooltip context).
 */
const COLOR_LABELS: Record<string, string> = {
  primary: 'Photos',
  success: 'Plans',
  danger: 'Maps',
  warning: 'Charts',
  info: 'Renderings',
  secondary: 'Other',
};

interface MediaScanByColor {
  detected: number;
  extracted: number;
}

export interface MediaBadgeChipsProps {
  mediaScanJson: {
    total_detected?: number;
    total_extracted?: number;
    by_color?: Record<string, MediaScanByColor>;
  } | null | undefined;
  scanStatus?: string | null;
  compact?: boolean;
  onClick?: () => void;
}

/**
 * Renders a row of color-coded badge chips representing detected media assets.
 *
 * - Solid fill: all items extracted (extracted === detected)
 * - Outline with count: partially or not yet extracted
 * - Hidden: no items of that color detected
 *
 * Clickable — opens MediaPreviewModal when onClick is provided.
 */
export default function MediaBadgeChips({
  mediaScanJson,
  scanStatus,
  compact = true,
  onClick,
}: MediaBadgeChipsProps) {
  const [isHovered, setIsHovered] = useState(false);

  // State: unscanned or not applicable — render nothing
  if (!scanStatus || scanStatus === 'unscanned' || scanStatus === 'not_applicable') {
    return null;
  }

  // State: scanning in progress — show animated indicator
  if (scanStatus === 'scanning' || scanStatus === 'extracting') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.7rem',
          color: 'var(--cui-secondary-color)',
          whiteSpace: 'nowrap',
        }}
      >
        <CSpinner size="sm" style={{ width: '12px', height: '12px' }} />
        <span>Scanning…</span>
      </span>
    );
  }

  // State: error — show warning
  if (scanStatus === 'error') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          fontSize: '0.7rem',
          color: 'var(--cui-danger)',
          whiteSpace: 'nowrap',
        }}
        title="Media scan failed"
      >
        ⚠
      </span>
    );
  }

  // No data or nothing detected — render nothing
  if (!mediaScanJson || !mediaScanJson.total_detected || mediaScanJson.total_detected <= 0) {
    return null;
  }

  const byColor = mediaScanJson.by_color;
  if (!byColor || typeof byColor !== 'object') {
    return null;
  }

  // Build chips: only colors with detected > 0, in consistent order
  const chips: Array<{
    color: string;
    detected: number;
    extracted: number;
    label: string;
  }> = [];

  for (const color of BADGE_COLOR_ORDER) {
    const entry = byColor[color];
    if (entry && entry.detected > 0) {
      chips.push({
        color,
        detected: entry.detected,
        extracted: entry.extracted ?? 0,
        label: COLOR_LABELS[color] || color,
      });
    }
  }

  // Handle non-standard colors that aren't in our predefined order
  for (const [color, entry] of Object.entries(byColor)) {
    if (
      entry &&
      entry.detected > 0 &&
      !BADGE_COLOR_ORDER.includes(color as typeof BADGE_COLOR_ORDER[number])
    ) {
      chips.push({
        color,
        detected: entry.detected,
        extracted: entry.extracted ?? 0,
        label: COLOR_LABELS[color] || color,
      });
    }
  }

  if (chips.length === 0) {
    return null;
  }

  const isComplete = scanStatus === 'complete';
  const allExtracted =
    mediaScanJson.total_extracted != null &&
    mediaScanJson.total_detected != null &&
    mediaScanJson.total_extracted >= mediaScanJson.total_detected;

  return (
    <span
      role="button"
      tabIndex={onClick ? 0 : undefined}
      onClick={
        onClick
          ? (e: React.MouseEvent) => {
              e.stopPropagation();
              onClick();
            }
          : undefined
      }
      onKeyDown={
        onClick
          ? (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={`${mediaScanJson.total_detected} media assets detected${
        mediaScanJson.total_extracted ? `, ${mediaScanJson.total_extracted} extracted` : ''
      } — click to review`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        cursor: onClick ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
        verticalAlign: 'middle',
        transition: 'filter 0.15s ease',
        filter: isHovered && onClick ? 'brightness(1.15)' : 'none',
      }}
    >
      {chips.map(({ color, detected, extracted, label }) => {
        const fullyExtracted = extracted >= detected;
        const partiallyExtracted = extracted > 0 && extracted < detected;

        if (fullyExtracted) {
          // Solid filled badge — all extracted
          return (
            <CBadge
              key={color}
              color={color as 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'secondary'}
              style={{
                fontSize: '0.7rem',
                padding: '2px 5px',
                lineHeight: 1,
                minWidth: '18px',
                textAlign: 'center',
              }}
              title={compact ? `${label}: ${detected} (all extracted)` : undefined}
            >
              {detected}
            </CBadge>
          );
        }

        if (partiallyExtracted) {
          // Outline badge with fraction — partially extracted
          return (
            <CBadge
              key={color}
              style={{
                fontSize: '0.7rem',
                padding: '2px 5px',
                lineHeight: 1,
                minWidth: '18px',
                textAlign: 'center',
                color: `var(--cui-${color})`,
                border: `1px solid var(--cui-${color})`,
                backgroundColor: 'transparent',
              }}
              title={compact ? `${label}: ${extracted}/${detected} extracted` : undefined}
            >
              {compact ? detected : `${extracted}/${detected}`}
            </CBadge>
          );
        }

        // Outline badge — none extracted
        return (
          <CBadge
            key={color}
            style={{
              fontSize: '0.7rem',
              padding: '2px 5px',
              lineHeight: 1,
              minWidth: '18px',
              textAlign: 'center',
              color: `var(--cui-${color})`,
              border: `1px solid var(--cui-${color})`,
              backgroundColor: 'transparent',
              opacity: 0.65,
            }}
            title={compact ? `${label}: ${detected} (pending)` : undefined}
          >
            {detected}
          </CBadge>
        );
      })}

      {/* Completed checkmark — all actions reviewed */}
      {isComplete && allExtracted && (
        <span
          style={{
            fontSize: '0.65rem',
            color: 'var(--cui-success)',
            marginLeft: '3px',
            lineHeight: 1,
          }}
        >
          ✓
        </span>
      )}
    </span>
  );
}
