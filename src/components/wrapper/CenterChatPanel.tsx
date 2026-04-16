'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { LandscaperChatThreaded, LandscaperChatHandle } from '@/components/landscaper/LandscaperChatThreaded';
import { ProjectHomepage } from '@/components/wrapper/ProjectHomepage';
import { useWrapperUI } from '@/contexts/WrapperUIContext';
import { useModalRegistrySafe } from '@/contexts/ModalRegistryContext';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('auth_tokens');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.access) return { Authorization: `Bearer ${parsed.access}` };
    }
  } catch { /* ignore */ }
  return {};
}

interface CenterChatPanelProps {
  projectId?: number;
  /** When provided, mounts the chat with this thread pre-selected (used by /w/chat/[threadId]). */
  initialThreadId?: string;
}

/**
 * Center Landscaper chat panel — three-panel layout middle column.
 *
 * When on the project root page (/w/projects/:id with no sub-page) and no
 * active thread has been selected, renders <ProjectHomepage> instead of the
 * full chat UI.  Selecting a thread or submitting the chat starter switches
 * to <LandscaperChatThreaded> with that thread pre-loaded.
 */
export function CenterChatPanel({ projectId, initialThreadId }: CenterChatPanelProps) {
  const { chatOpen, closeChat } = useWrapperUI();
  const pathname = usePathname();

  // Bridge: Landscaper tool results → ModalRegistry
  // When open_input_modal returns { action: 'open_modal', modal_name }, dispatch to the registry.
  // Uses safe variant — returns null when outside ModalRegistryProvider (unassigned chats).
  const modalRegistry = useModalRegistrySafe();

  const handleToolResult = useCallback(
    (toolName: string, result: Record<string, unknown>) => {
      if (toolName === 'open_input_modal' && result.action === 'open_modal' && typeof result.modal_name === 'string') {
        if (modalRegistry) {
          modalRegistry.openModal(result.modal_name, (result.context as Record<string, unknown>) || undefined);
        }
      }
    },
    [modalRegistry],
  );

  // threadId selected/created from the homepage (null = homepage mode)
  const [homepageThreadId, setHomepageThreadId] = useState<string | null>(null);
  const [threadTitle, setThreadTitle] = useState<string | null>(null);
  const [isStartingChat, setIsStartingChat] = useState(false);

  // Ref to the chat component so we can auto-send the initial message
  const chatRef = useRef<LandscaperChatHandle>(null);
  const pendingMessageRef = useRef<string | null>(null);

  // Detect project root: pathname ends with /projects/<id> (no sub-page)
  const isProjectRoot = /\/projects\/\d+$/.test(pathname);

  // Reset homepage thread when navigating away from the project root
  useEffect(() => {
    if (!isProjectRoot) {
      setHomepageThreadId(null);
      pendingMessageRef.current = null;
    }
  }, [isProjectRoot]);

  // After switching from homepage → chat, fire the pending message
  useEffect(() => {
    if (homepageThreadId && pendingMessageRef.current) {
      const msg = pendingMessageRef.current;
      pendingMessageRef.current = null;
      // Give LandscaperChatThreaded time to mount and load the thread
      const timer = setTimeout(() => {
        chatRef.current?.sendMessage(msg);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [homepageThreadId]);

  const showHomepage = isProjectRoot && !homepageThreadId && !initialThreadId;

  const handleSelectThread = useCallback((threadId: string, title?: string) => {
    setHomepageThreadId(threadId);
    setThreadTitle(title ?? null);
  }, []);

  const handleStartChat = useCallback(
    async (message: string) => {
      if (!projectId || isStartingChat) return;
      setIsStartingChat(true);
      try {
        const res = await fetch(`${DJANGO_API_URL}/api/landscaper/threads/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ project_id: projectId, page_context: 'home' }),
        });
        const data = await res.json();
        if (data?.success && data?.thread?.threadId) {
          pendingMessageRef.current = message;
          setHomepageThreadId(data.thread.threadId);
        }
      } catch {
        // ignore — user can type in the normal chat input
      } finally {
        setIsStartingChat(false);
      }
    },
    [projectId, isStartingChat]
  );

  const handleBackToHomepage = useCallback(() => {
    setHomepageThreadId(null);
    setThreadTitle(null);
    pendingMessageRef.current = null;
  }, []);

  if (!chatOpen) return null;

  const getPageContext = () => {
    if (showHomepage) return 'home';
    if (pathname.includes('/documents')) return 'documents';
    if (pathname.includes('/reports')) return 'reports';
    if (pathname.includes('/map')) return 'map';
    if (pathname.includes('/tools')) return 'tools';
    if (pathname.includes('/admin')) return 'admin';
    if (pathname.includes('/landscaper-ai')) return 'landscaper';
    if (pathname.includes('/projects')) return 'projects';
    return 'general';
  };

  return (
    <div className="wrapper-chat-center">
      <div className="wrapper-header">
        <span className="wrapper-header-title">
          {showHomepage ? '' : (threadTitle || 'New conversation')}
        </span>
        <div className="wrapper-header-spacer" />
        {/* Back button when a thread is active from the homepage */}
        {isProjectRoot && homepageThreadId && (
          <button
            className="wrapper-btn-ghost"
            onClick={handleBackToHomepage}
            style={{ marginRight: '4px' }}
            title="Back to project overview"
          >
            ← Back
          </button>
        )}
        {!showHomepage && (
          <button className="wrapper-btn-ghost" onClick={closeChat} title="Close chat panel">
            Close
          </button>
        )}
      </div>

      <div className="wrapper-chat-body">
        {showHomepage ? (
          <ProjectHomepage
            projectId={projectId!}
            onSelectThread={handleSelectThread}
            onStartChat={handleStartChat}
            isStartingChat={isStartingChat}
          />
        ) : (
          <LandscaperChatThreaded
            ref={chatRef}
            projectId={projectId}
            pageContext={projectId ? getPageContext() : 'general'}
            isExpanded={true}
            hideInternalHeader={true}
            initialThreadId={initialThreadId ?? homepageThreadId ?? undefined}
            onToolResult={handleToolResult}
          />
        )}
      </div>
    </div>
  );
}
