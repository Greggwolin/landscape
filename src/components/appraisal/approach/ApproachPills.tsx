/**
 * ApproachPills
 *
 * Sub-nav pills per approach. Config-driven, not hardcoded.
 * Pills with isFlyout have dashed borders and ↗ suffix.
 *
 * @version 1.0
 * @created 2026-04-04
 */

'use client';

import React from 'react';
import type { ApproachId } from '../appraisal.types';
import { getPillsForApproach } from '../appraisal.config';

interface ApproachPillsProps {
  activeApproach: ApproachId;
  activePill: string;
  onPillChange: (pillId: string) => void;
}

export function ApproachPills({ activeApproach, activePill, onPillChange }: ApproachPillsProps) {
  const pillSet = getPillsForApproach(activeApproach);
  if (!pillSet) return null;

  return (
    <div className="appraisal-pill-nav">
      {pillSet.pills.map((pill) => {
        const isActive = pill.id === activePill;
        const pillClass = [
          'appraisal-pill',
          isActive && 'active',
          pill.isFlyout && 'flyout-trigger',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <button
            key={pill.id}
            className={pillClass}
            onClick={() => {
              if (pill.isFlyout) {
                // Flyout pills open the full-page component
                // For now, just log — wiring to existing components is a follow-up
                console.log(`[Appraisal] Flyout: ${pill.id}`);
                return;
              }
              onPillChange(pill.id);
            }}
          >
            {pill.label}
            {pill.isFlyout && ' ↗'}
          </button>
        );
      })}
    </div>
  );
}
