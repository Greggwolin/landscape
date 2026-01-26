'use client';

import React, { useEffect, useCallback } from 'react';
import CIcon from '@coreui/icons-react';
import { cilX, cilCloudDownload, cilSpreadsheet, cilFile } from '@coreui/icons';

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function AgentModal({ isOpen, onClose, title, subtitle, children }: AgentModalProps) {
  // Handle escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      {/* Modal Container - Full screen with padding */}
      <div className="flex-1 flex flex-col m-4 overflow-hidden bg-background" style={{ borderRadius: 'var(--cui-card-border-radius)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            {subtitle && (
              <p className="text-sm text-muted mt-1">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Export Buttons (placeholder) */}
            <ExportButton icon={cilSpreadsheet} label="Excel" />
            <ExportButton icon={cilFile} label="PDF" />
            <ExportButton icon={cilCloudDownload} label="Export" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-hover-overlay text-muted hover:text-foreground transition-colors ml-2"
              aria-label="Close modal"
            >
              <CIcon icon={cilX} size="lg" />
            </button>
          </div>
        </div>

        {/* Content Area - Two columns: Canvas + Chat */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Canvas */}
          <div className="flex-1 overflow-auto p-6">
            {children}
          </div>

          {/* Embedded Chat Panel */}
          <div className="w-80 border-l border-border flex flex-col bg-surface-card">
            <div className="px-4 py-3 border-b border-border">
              <span className="text-sm font-medium text-foreground">Chat</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="text-center text-muted text-sm py-8">
                <p>Ask questions about this view</p>
                <p className="text-xs mt-2 opacity-60">Chat coming soon</p>
              </div>
            </div>
            <div className="p-3 border-t border-border">
              <input
                type="text"
                placeholder="Ask a question..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                disabled
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportButton({ icon, label }: { icon: string[]; label: string }) {
  return (
    <button
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted hover:text-foreground hover:bg-hover-overlay transition-colors"
      title={`Export as ${label}`}
      disabled
    >
      <CIcon icon={icon} size="sm" />
      <span>{label}</span>
    </button>
  );
}
