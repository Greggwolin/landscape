'use client';

import React, { useState } from 'react';
import { Z_INDEX } from './navigation/constants';
import ChatInterface from '@/components/landscaper/ChatInterface';
import AdviceAdherencePanel from '@/components/landscaper/AdviceAdherencePanel';

/**
 * LandscaperChatModal Component
 *
 * Full-screen modal overlay for the Landscaper AI chat interface.
 * Phase 6: Includes chat interface and advice adherence panel.
 *
 * @param isOpen - Whether the modal is visible
 * @param onClose - Callback function to close the modal
 * @param projectId - ID of the current project
 */
interface LandscaperChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  activeTab?: string;  // Page context for tool filtering (e.g., 'property', 'operations', 'valuation')
}

export default function LandscaperChatModal({
  isOpen,
  onClose,
  projectId,
  activeTab = 'home',
}: LandscaperChatModalProps) {
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [adviceVariances, setAdviceVariances] = useState<any[]>([]);
  const [varianceThreshold, setVarianceThreshold] = useState(10);

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
              e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label="Close Landscaper AI"
          >
            <span className="text-2xl">×</span>
          </button>
        </header>

        {/* Content: Two-column layout */}
        <div className="flex-1 overflow-hidden p-4">
          <div
            className="d-flex gap-3 h-100"
            style={{ height: 'calc(85vh - 120px)' }}
          >
            {/* LEFT: Chat Interface (66%) */}
            <div
              style={{
                flex: '0 0 66%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <ChatInterface
                projectId={projectId}
                messages={chatMessages}
                onMessagesUpdate={setChatMessages}
                activeTab={activeTab}
              />
            </div>

            {/* RIGHT: Advice Adherence Panel (33%) */}
            <div
              style={{
                flex: '0 0 33%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <AdviceAdherencePanel
                projectId={projectId}
                variances={adviceVariances}
                threshold={varianceThreshold}
                onThresholdChange={setVarianceThreshold}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
