/**
 * ApproachTabs
 *
 * 6 tab pills in the topbar: Property, Market, Sales, Income, Cost, Reconciliation.
 * Each has a status dot (green/yellow/gray).
 *
 * @version 1.0
 * @created 2026-04-04
 */

'use client';

import React from 'react';
import type { ApproachId } from '../appraisal.types';
import { APPROACH_TABS } from '../appraisal.config';

interface ApproachTabsProps {
  activeApproach: ApproachId;
  onApproachChange: (id: ApproachId) => void;
}

export function ApproachTabs({ activeApproach, onApproachChange }: ApproachTabsProps) {
  return (
    <div className="approach-nav">
      {APPROACH_TABS.map((tab) => {
        const isActive = tab.id === activeApproach;
        const tabClass = ['approach-tab', isActive && 'active'].filter(Boolean).join(' ');

        return (
          <button
            key={tab.id}
            className={tabClass}
            onClick={() => onApproachChange(tab.id)}
          >
            {tab.label}
            <span className={`approach-tab-dot ${tab.status}`} />
          </button>
        );
      })}
    </div>
  );
}
