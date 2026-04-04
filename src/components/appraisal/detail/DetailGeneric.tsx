'use client';

import React from 'react';

interface Props {
  title?: string;
  onClose: () => void;
}

export function DetailGeneric({ title = 'Line Item Detail', onClose }: Props) {
  return (
    <>
      <div className="dp-hdr">
        <div className="dp-hdr-top">
          <div className="dp-hdr-title">{title}</div>
          <button className="dp-hdr-close" onClick={onClose}>✕</button>
        </div>
        <div className="dp-hdr-meta">Detail panel</div>
      </div>
      <div className="dp-body">
        <div className="dp-current">
          <div className="dp-current-label">Current value</div>
          <div className="dp-current-val">—</div>
          <div className="dp-current-basis">Double-click any line item to see its detail</div>
        </div>
        <button className="dp-add-row">+ Add sub-category</button>
        <div className="dp-chat-hint">
          <strong>Chat-enabled:</strong> Tell Landscaper what you&apos;d like to do with this line item.
        </div>
      </div>
      <div className="dp-footer">
        <button className="dp-btn primary">Save</button>
        <button className="dp-btn secondary" onClick={onClose}>Cancel</button>
      </div>
    </>
  );
}
