/**
 * DrawToolbar Component
 *
 * Tool palette for drawing points, lines, polygons, and editing features.
 */

'use client';

import React from 'react';
import type { DrawToolbarProps, DrawTool } from './types';

interface ToolConfig {
  id: DrawTool;
  label: string;
  shortcut: string;
}

const TOOLS: ToolConfig[] = [
  { id: 'point', label: 'Pt', shortcut: 'P' },
  { id: 'line', label: 'Ln', shortcut: 'L' },
  { id: 'polygon', label: 'Pg', shortcut: 'G' },
  { id: 'edit', label: 'Ed', shortcut: 'E' },
  { id: 'delete', label: 'Del', shortcut: 'D' },
];

// SVG icons for each tool
const ToolIcon = ({ tool }: { tool: DrawTool }) => {
  switch (tool) {
    case 'point':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
        </svg>
      );
    case 'line':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="4" y1="20" x2="20" y2="4" />
          <circle cx="4" cy="20" r="2" fill="currentColor" />
          <circle cx="20" cy="4" r="2" fill="currentColor" />
        </svg>
      );
    case 'polygon':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
        </svg>
      );
    case 'edit':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      );
    case 'delete':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      );
    default:
      return null;
  }
};

export function DrawToolbar({ activeTool, onToolChange, disabled }: DrawToolbarProps) {
  return (
    <div className="draw-toolbar">
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          type="button"
          className={`draw-tool-btn ${activeTool === tool.id ? 'active' : ''}`}
          onClick={() => onToolChange(tool.id)}
          disabled={disabled}
          title={`${tool.label} (${tool.shortcut})`}
        >
          <ToolIcon tool={tool.id} />
          <span className="draw-tool-label">{tool.label}</span>
        </button>
      ))}
    </div>
  );
}

export default DrawToolbar;
