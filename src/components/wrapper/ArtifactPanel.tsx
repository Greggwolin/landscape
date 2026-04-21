'use client';

import React, { useState } from 'react';
import { X, Globe, Download, FileText, BarChart3, Table2, FileCode } from 'lucide-react';
import { WrapperHeader } from './WrapperHeader';
import type { ArtifactContent } from '@/contexts/WrapperChatContext';

interface ArtifactPanelProps {
  isOpen: boolean;
  onClose: () => void;
  width: number;
  onResizeStart: (e: React.PointerEvent) => void;
  content: ArtifactContent | null;
}

const TYPE_ICONS: Record<string, typeof FileText> = {
  analysis: BarChart3,
  report: FileText,
  table: Table2,
  code: FileCode,
};

export function ArtifactPanel({
  isOpen,
  onClose,
  width,
  onResizeStart,
  content,
}: ArtifactPanelProps) {
  const [mode, setMode] = useState<'preview' | 'source'>('preview');

  if (!isOpen) return null;

  const TypeIcon = content ? (TYPE_ICONS[content.type] || FileText) : FileText;

  return (
    <>
      {/* ── Left drag handle ── */}
      <div
        className="wrapper-artifact-drag-handle"
        onPointerDown={onResizeStart}
      />

      <div className="wrapper-artifact-panel" style={{ width }}>
        <WrapperHeader
          leading={content ? <TypeIcon size={14} style={{ flexShrink: 0, opacity: 0.6 }} /> : undefined}
          title={content?.title ?? 'Artifact'}
          trailing={
            <>
              <div className="ap-toggle">
                <button
                  className={`ap-toggle-btn${mode === 'preview' ? ' active' : ''}`}
                  onClick={() => setMode('preview')}
                >
                  Preview
                </button>
                <button
                  className={`ap-toggle-btn${mode === 'source' ? ' active' : ''}`}
                  onClick={() => setMode('source')}
                >
                  Source
                </button>
              </div>
              <button className="w-btn w-btn-icon" title="Open in browser">
                <Globe size={14} />
              </button>
              <button className="w-btn w-btn-icon" title="Download">
                <Download size={14} />
              </button>
              <button className="w-btn w-btn-icon" onClick={onClose} title="Close artifact panel">
                <X size={14} />
              </button>
            </>
          }
        />

        <div className="wrapper-artifact-body">
          {content ? (
            <div style={{ color: 'var(--w-text-secondary)', fontSize: '13px' }}>
              <div style={{ marginBottom: 8, fontWeight: 600 }}>
                {mode === 'preview' ? 'Preview' : 'Source'}: {content.title}
              </div>
              <div style={{ color: 'var(--w-text-tertiary)', fontSize: '12px' }}>
                Type: {content.type}
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--w-text-tertiary)',
                fontSize: '13px',
              }}
            >
              No artifact selected
            </div>
          )}
        </div>
      </div>
    </>
  );
}
