'use client';

import React, { useState } from 'react';

type MediaTab = 'all' | 'photos' | 'charts' | 'renders' | 'other';

const TABS: { id: MediaTab; label: string; count?: number }[] = [
  { id: 'all', label: 'All' },
  { id: 'photos', label: 'Photos', count: 50 },
  { id: 'charts', label: 'Charts', count: 2 },
  { id: 'renders', label: 'Renders', count: 4 },
  { id: 'other', label: 'Other', count: 3 },
];

export function MediaPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<MediaTab>('all');

  return (
    <div className="w-panel">
      <div className="w-panel-head" onClick={() => setCollapsed((v) => !v)}>
        <span className="w-panel-chev">{collapsed ? '▸' : '▾'}</span>
        <span className="w-panel-title">Project Media</span>
        <span className="w-panel-count">59 items</span>
        <div className="w-panel-spacer" />
        <button className="wrapper-btn wrapper-btn-ghost" onClick={(e) => e.stopPropagation()}>
          Scan PDFs ▾
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="w-media-tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`w-media-tab${tab === t.id ? ' active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
                {t.count !== undefined && ` (${t.count})`}
              </button>
            ))}
          </div>

          <div className="w-media-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="w-media-thumb">
                <div className="w-media-thumb-placeholder">📊</div>
                <div className="w-media-thumb-meta">
                  <span className="w-media-thumb-tag">{i % 2 === 0 ? 'Chart / Graph' : 'Rendering'}</span>
                  <span className="w-media-thumb-page">pg. {i + 1}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
