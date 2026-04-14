'use client';

import React, { useState, useCallback, useRef, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Circle, PanelRight } from 'lucide-react';
import { WrapperHeader } from '@/components/wrapper/WrapperHeader';
import { ArtifactPanel } from '@/components/wrapper/ArtifactPanel';
import { LandscaperChatThreaded } from '@/components/landscaper/LandscaperChatThreaded';
import { useWrapperChatRequired } from '@/contexts/WrapperChatContext';
import { useModalRegistry } from '@/contexts/ModalRegistryContext';

const DEFAULT_ARTIFACT_WIDTH = 480;
const MIN_ARTIFACT_WIDTH = 300;
const MAX_ARTIFACT_WIDTH = 700;

/**
 * Inner component that reads searchParams (must be inside Suspense).
 */
function ChatWorkspaceInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = parseInt(params.projectId as string);
  const initialThreadId = searchParams.get('thread') || undefined;

  const { artifactOpen, toggleArtifact, artifactContent } =
    useWrapperChatRequired();
  const { openModal } = useModalRegistry();

  // Intercept open_input_modal tool results from Landscaper
  const handleToolResult = useCallback(
    (toolName: string, result: Record<string, unknown>) => {
      if (toolName === 'open_input_modal' && result.success && result.modal_name) {
        openModal(
          result.modal_name as string,
          (result.context as Record<string, unknown>) || undefined
        );
      }
    },
    [openModal]
  );

  // Artifact panel resize state
  const [artifactWidth, setArtifactWidth] = useState(DEFAULT_ARTIFACT_WIDTH);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  // Center panel collapse detection
  const centerRef = useRef<HTMLDivElement>(null);
  const [centerCollapsed, setCenterCollapsed] = useState(false);

  const handleArtifactResizeStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      isResizing.current = true;
      startX.current = e.clientX;
      startWidth.current = artifactWidth;

      const handleMove = (ev: PointerEvent) => {
        if (!isResizing.current) return;
        const delta = startX.current - ev.clientX;
        const newWidth = Math.min(
          Math.max(startWidth.current + delta, MIN_ARTIFACT_WIDTH),
          MAX_ARTIFACT_WIDTH
        );
        setArtifactWidth(newWidth);

        if (centerRef.current) {
          const centerWidth = centerRef.current.offsetWidth;
          setCenterCollapsed(centerWidth < 400);
        }
      };

      const handleUp = () => {
        isResizing.current = false;
        document.removeEventListener('pointermove', handleMove);
        document.removeEventListener('pointerup', handleUp);
      };

      document.addEventListener('pointermove', handleMove);
      document.addEventListener('pointerup', handleUp);
    },
    [artifactWidth]
  );

  return (
    <div className="wrapper-chat-layout">
      {/* ── Center Panel (Chat) ── */}
      <div
        ref={centerRef}
        className={`wrapper-chat-center${centerCollapsed ? ' collapsed' : ''}`}
      >
        <WrapperHeader>
          <Circle
            size={8}
            fill="var(--w-accent)"
            stroke="none"
            style={{ flexShrink: 0 }}
          />
          <span className="wrapper-header-title">Landscaper AI</span>
          <div className="wrapper-header-spacer" />
          <button
            className={`wrapper-btn-icon${artifactOpen ? ' active' : ''}`}
            onClick={toggleArtifact}
            title="Toggle artifact panel"
          >
            <PanelRight size={16} />
          </button>
        </WrapperHeader>

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <LandscaperChatThreaded
            projectId={projectId}
            pageContext="chat"
            isExpanded={true}
            isIngesting={false}
            initialThreadId={initialThreadId}
            onToolResult={handleToolResult}
          />
        </div>
      </div>

      {/* ── Right Panel (Artifact) ── */}
      {artifactOpen && (
        <ArtifactPanel
          isOpen={artifactOpen}
          onClose={toggleArtifact}
          width={artifactWidth}
          onResizeStart={handleArtifactResizeStart}
          content={artifactContent}
        />
      )}
    </div>
  );
}

/**
 * Chat Workspace — default view when a project is selected.
 * Wrapped in Suspense because useSearchParams requires it.
 */
export default function WrapperProjectChatPage() {
  return (
    <Suspense fallback={<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--w-text-tertiary)' }}>Loading...</div>}>
      <ChatWorkspaceInner />
    </Suspense>
  );
}
