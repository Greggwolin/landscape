'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilCommentSquare } from '@coreui/icons';
import { LandscaperChatThreaded, LandscaperChatHandle } from '@/components/landscaper/LandscaperChatThreaded';
import { ProjectHomepage } from '@/components/wrapper/ProjectHomepage';
import { LandscaperIcon } from '@/components/icons/LandscaperIcon';
import { useWrapperUI } from '@/contexts/WrapperUIContext';
import { useModalRegistrySafe } from '@/contexts/ModalRegistryContext';
import { ChatSearchOverlay } from '@/components/wrapper/ChatSearchOverlay';
import { WrapperHeader } from '@/components/wrapper/WrapperHeader';
import { getPropertyTypeBadgeStyle, getPropertyTypeLabel } from '@/config/propertyTypeTokens';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

/** Map open_input_modal names → Landscaper page context values. */
const MODAL_TO_CONTEXT: Record<string, string> = {
  operating_statement: 'operations',
  rent_roll: 'property',
  property_details: 'property',
  budget: 'budget',
  sales_comps: 'valuation',
  cost_approach: 'valuation',
  income_approach: 'valuation',
  reconciliation: 'valuation',
  loan_inputs: 'capitalization',
  equity_structure: 'capitalization',
  land_use: 'planning',
  parcels: 'planning',
  sales_absorption: 'planning',
  renovation: 'property',
  acquisition: 'capitalization',
  // contacts and project_details don't change context — stay on 'home'
};

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
  /** Project metadata for the header — passed from layout. */
  projectName?: string;
  projectLocation?: string;
  projectTypeCode?: string;
  /**
   * Force-remount key for the chat subtree. Bump this (from the layout's
   * "New chat" handler) to reset thread state without a page nav.
   */
  sessionKey?: string | number;
}

/**
 * Center Landscaper chat panel — three-panel layout middle column.
 *
 * When on the project root page (/w/projects/:id with no sub-page) and no
 * active thread has been selected, renders <ProjectHomepage> instead of the
 * full chat UI.  Selecting a thread or submitting the chat starter switches
 * to <LandscaperChatThreaded> with that thread pre-loaded.
 */
export function CenterChatPanel({ projectId, initialThreadId, projectName, projectLocation, projectTypeCode, sessionKey }: CenterChatPanelProps) {
  const { chatOpen, closeChat, openChat, setActiveMapArtifact, toggleArtifacts, artifactsOpen, activeContentContext, setActiveContentContext } = useWrapperUI();
  const pathname = usePathname();
  const router = useRouter();

  // On /w/chat routes, chat IS the content — always visible regardless of chatOpen toggle.
  const isChatRoute = /^\/w\/chat(\/|$)/.test(pathname);

  // Auto-open chat panel when navigating to a chat route (ensures toggle state stays in sync)
  useEffect(() => {
    if (isChatRoute && !chatOpen) openChat();
  }, [isChatRoute, chatOpen, openChat]);

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
        // Update content context for Landscaper page context enrichment
        const derivedContext = MODAL_TO_CONTEXT[result.modal_name];
        if (derivedContext) {
          setActiveContentContext(derivedContext);
        }
      }
      // Map artifact → push to artifacts panel
      if (toolName === 'generate_map_artifact' && result.action === 'show_map_artifact' && result.map_config) {
        setActiveMapArtifact(result.map_config as import('@/contexts/WrapperUIContext').MapArtifactConfig);
        // Auto-open artifacts panel if collapsed
        if (!artifactsOpen) toggleArtifacts();
      }
    },
    [modalRegistry, setActiveMapArtifact, artifactsOpen, toggleArtifacts, setActiveContentContext],
  );

  // threadId selected/created from the homepage (null = homepage mode)
  const [homepageThreadId, setHomepageThreadId] = useState<string | null>(null);
  const [threadTitle, setThreadTitle] = useState<string | null>(null);
  const [isStartingChat, setIsStartingChat] = useState(false);

  // Thread count for the badge on the thread-history toggle button
  const [threadCount, setThreadCount] = useState<number>(0);
  useEffect(() => {
    if (!projectId) { setThreadCount(0); return; }
    fetch(`${DJANGO_API_URL}/api/landscaper/threads/?project_id=${projectId}&include_closed=true`, {
      headers: getAuthHeaders(),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data?.threads)) setThreadCount(data.threads.length);
      })
      .catch(() => {});
  }, [projectId, homepageThreadId]); // refetch after a new thread starts

  // Whether the in-panel thread history drawer is visible
  const [threadListVisible, setThreadListVisible] = useState(false);

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

  // On /w/chat root (no initialThreadId), when the hook creates a thread on
  // first message send, replace the URL to /w/chat/[newId] so refresh resumes
  // and the URL becomes the source of truth.
  const isUnassignedChatRoot = isChatRoute && !initialThreadId;
  const handleActiveThreadChange = useCallback(
    (threadId: string | null) => {
      if (!isUnassignedChatRoot) return;
      if (!threadId) return;
      // Only swap the URL when we're still sitting on /w/chat (not a sub-thread).
      if (pathname === '/w/chat' || pathname === '/w/chat/') {
        router.replace(`/w/chat/${threadId}`);
      }
    },
    [isUnassignedChatRoot, pathname, router]
  );

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
    setActiveContentContext(null);
  }, [setActiveContentContext]);

  if (!chatOpen && !isChatRoute) return null;

  const getPageContext = () => {
    if (activeContentContext && isProjectRoot) return activeContentContext;
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
      {/* ── Unified center-panel header: icon + breadcrumb title ── */}
      <WrapperHeader
        leading={
          <LandscaperIcon style={{ width: 24, height: 24, flexShrink: 0 }} />
        }
        title={
          showHomepage ? (
            <span className="wrapper-header-title" style={{ fontWeight: 600 }}>
              {projectName || 'Landscaper'}
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, fontSize: '12px' }}>
              {projectName && (
                <>
                  <span style={{ opacity: 0.55, whiteSpace: 'nowrap', flexShrink: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {projectName}
                  </span>
                  <span style={{ opacity: 0.35, flexShrink: 0 }}>/</span>
                </>
              )}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 2 }}>
                {threadTitle || 'New conversation'}
              </span>
            </span>
          )
        }
        trailing={
          <>
            {projectTypeCode && (
              <span
                style={{
                  ...getPropertyTypeBadgeStyle(projectTypeCode, 'soft'),
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.4px',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  flexShrink: 0,
                }}
              >
                {getPropertyTypeLabel(projectTypeCode)}
              </span>
            )}
            {isProjectRoot && homepageThreadId && (
              <button
                className="w-btn w-btn-ghost w-btn-sm"
                onClick={handleBackToHomepage}
                style={{ marginRight: '4px' }}
                title="Back to project overview"
              >
                ← Back
              </button>
            )}
            {projectId && !showHomepage && (
              <button
                className="w-btn w-btn-icon w-btn-sm"
                onClick={() => handleStartChat('')}
                title="New chat in this project"
              >
                <CIcon icon={cilPlus} size="sm" />
              </button>
            )}
            {projectId && !showHomepage && (
              <button
                className="w-btn w-btn-icon w-btn-sm"
                onClick={() => setThreadListVisible((v) => !v)}
                title={threadListVisible ? 'Hide thread history' : 'Show thread history'}
                style={{ position: 'relative' }}
              >
                <CIcon
                  icon={cilCommentSquare}
                  size="sm"
                  style={{ color: threadListVisible ? 'var(--w-accent, #0ea5e9)' : 'inherit' }}
                />
                {threadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -2,
                      right: -2,
                      minWidth: 16,
                      height: 16,
                      padding: '0 4px',
                      borderRadius: 8,
                      background: 'var(--w-accent, #0ea5e9)',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                    }}
                  >
                    {threadCount}
                  </span>
                )}
              </button>
            )}
            {!showHomepage && !isChatRoute && !isProjectRoot && (
              <button className="w-btn w-btn-ghost w-btn-sm" onClick={closeChat} title="Close chat panel">
                Close
              </button>
            )}
          </>
        }
      />

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
            key={sessionKey ?? 'default'}
            ref={chatRef}
            projectId={projectId}
            pageContext={projectId ? getPageContext() : 'general'}
            isExpanded={true}
            hideInternalHeader={true}
            initialThreadId={initialThreadId ?? homepageThreadId ?? undefined}
            onToolResult={handleToolResult}
            onActiveThreadChange={handleActiveThreadChange}
            showThreadList={threadListVisible}
          />
        )}
      </div>
      <ChatSearchOverlay />
    </div>
  );
}
