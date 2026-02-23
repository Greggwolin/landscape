'use client';

/**
 * SubSubTabBar — Level 3 pill-style tab navigation
 *
 * Renders inside Income Approach (Valuation) or Cash Flow (Investment).
 * Visually distinct from Level 2 underline sub-tabs: uses pill/button
 * style with background fill on active state.
 *
 * @version 1.0
 * @created 2026-02-23
 * @session QT2
 */

import React, { memo } from 'react';

export interface SubSubTab {
  id: string;
  label: string;
}

interface SubSubTabBarProps {
  tabs: SubSubTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  /** Right-aligned summary text, e.g. "7.50% Cap · $322,500 NOI · 2.44x Coverage" */
  metaSummary?: string;
}

function SubSubTabBar({ tabs, activeTab, onTabChange, metaSummary }: SubSubTabBarProps) {
  return (
    <div
      style={{
        height: 36,
        backgroundColor: 'var(--cui-tertiary-bg)',
        borderBottom: '1px solid var(--cui-border-color)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 2,
        flexShrink: 0,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              padding: '4px 12px',
              fontSize: '11.5px',
              color: isActive ? 'var(--cui-body-color)' : 'var(--cui-secondary-color)',
              cursor: 'pointer',
              borderRadius: 5,
              whiteSpace: 'nowrap',
              transition: 'all 0.12s',
              border: isActive ? '1px solid var(--cui-border-color)' : '1px solid transparent',
              background: isActive ? 'var(--active-overlay, rgba(255,255,255,0.08))' : 'transparent',
              fontWeight: isActive ? 500 : 400,
              fontFamily: 'inherit',
              lineHeight: 1,
            }}
          >
            {tab.label}
          </button>
        );
      })}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Right-side meta summary */}
      {metaSummary && (
        <span
          style={{
            fontSize: '10px',
            color: 'var(--cui-tertiary-color, var(--text-secondary))',
            whiteSpace: 'nowrap',
          }}
        >
          {metaSummary}
        </span>
      )}
    </div>
  );
}

export default memo(SubSubTabBar);
