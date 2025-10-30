'use client';

import React from 'react';
import { Z_INDEX } from './navigation/constants';

/**
 * LandscaperChatModal Component
 *
 * Full-screen modal overlay for the general Landscaper AI chat interface.
 * Not associated with any specific tab or function.
 *
 * @param isOpen - Whether the modal is visible
 * @param onClose - Callback function to close the modal
 */
interface LandscaperChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LandscaperChatModal({
  isOpen,
  onClose,
}: LandscaperChatModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: Z_INDEX.MODAL }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close modal"
      />

      {/* Modal Content */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="landscaper-modal-title"
        className="relative flex max-h-[85vh] w-[92vw] max-w-7xl flex-col overflow-hidden rounded-2xl border shadow-2xl"
        style={{
          backgroundColor: 'var(--cui-body-bg)',
          borderColor: 'var(--cui-border-color)',
        }}
      >
        {/* Header */}
        <header
          className="border-b px-6 py-5 flex items-center justify-between"
          style={{ borderColor: 'var(--cui-border-color)' }}
        >
          <h2
            id="landscaper-modal-title"
            className="text-2xl font-bold"
            style={{ color: 'var(--cui-body-color)' }}
          >
            Landscaper AI
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 transition-colors"
            style={{ color: 'var(--cui-body-color)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                'var(--cui-sidebar-nav-link-hover-bg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label="Close Landscaper AI"
          >
            <span className="text-2xl">×</span>
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          <div
            className="h-full rounded-lg border p-4"
            style={{
              backgroundColor: 'var(--cui-tertiary-bg)',
              borderColor: 'var(--cui-border-color)',
              color: 'var(--cui-body-color)',
            }}
          >
            <p className="text-center text-sm opacity-70">
              General Landscaper AI chat interface - not associated with a
              specific tab or function.
            </p>
            <p className="text-center text-xs opacity-50 mt-2">
              (Chat component will be integrated here)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
