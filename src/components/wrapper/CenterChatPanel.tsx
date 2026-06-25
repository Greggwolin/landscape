'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilCommentSquare } from '@coreui/icons';
import { LandscaperChatThreaded, LandscaperChatHandle } from '@/components/landscaper/LandscaperChatThreaded';
import { ProjectHomepage } from '@/components/wrapper/ProjectHomepage';
import { LandscaperIcon } from '@/components/icons/LandscaperIcon';
import { useWrapperUI } from '@/contexts/WrapperUIContext';
import { emitLandscapeCommand } from '@/lib/landscape-command-bus';
import { setPendingPlanExtract, type PlanOverlayPayload } from '@/lib/gis/planExtractBridge';
import { ChatSearchOverlay } from '@/components/wrapper/ChatSearchOverlay';
import { WrapperHeader } from '@/components/wrapper/WrapperHeader';
import { getPropertyTypeBadgeStyle, getPropertyTypeLabel } from '@/config/propertyTypeTokens';
import { useChatAttachment } from '@/components/landscaper/useChatAttachment';
import { ChatDragOverlay } from '@/components/landscaper/ChatDragOverlay';

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
  /** User's display name. Used as the header fallback when no projectName is
   *  set (i.e., unassigned/home chats), so the surface reads as the user's
   *  own space rather than the generic "Landscaper." LF-USERDASH-0514. */
  userName?: string;
  /**
   * Studio screen-router pre-send hook (JB37). Forwarded verbatim to
   * LandscaperChatThreaded's `onBeforeUserSend`. The studio passes this to
   * intercept clean "show me [screen]" phrases and navigate in code before the
   * LLM is invoked; every /w/ caller omits it, leaving the send path unchanged.
   */
  onBeforeUserSend?: (text: string) => boolean | void;
  /**
   * Studio "new chat" handler (JB43). When provided, the header "+" starts a
   * fresh BLANK chat in place (no eager thread create, no /w/chat redirect) by
   * delegating to this callback instead of `handleStartChat`. /w/ callers omit
   * it, preserving the existing project-homepage new-chat behavior.
   */
  onNewChat?: () => void;
}

/**
 * Center Landscaper chat panel — three-panel layout middle column.
 *
 * When on the project root page (/w/projects/:id with no sub-page) and no
 * active thread has been selected, renders <ProjectHomepage> instead of the
 * full chat UI.  Selecting a thread or submitting the chat starter switches
 * to <LandscaperChatThreaded> with that thread pre-loaded.
 */
export function CenterChatPanel({ projectId, initialThreadId, projectName, projectLocation, projectTypeCode, sessionKey, userName, onBeforeUserSend, onNewChat }: CenterChatPanelProps) {
  const { chatOpen, closeChat, openChat, setActiveMapArtifact, setActiveLocationBrief, mergeActiveExcelAudit, setActiveArtifactId, toggleArtifacts, artifactsOpen, activeContentContext, setActiveContentContext } = useWrapperUI();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();

  // On /w/chat routes, chat IS the content — always visible regardless of chatOpen toggle.
  const isChatRoute = /^\/w\/chat(\/|$)/.test(pathname);
  // Studio surface (/studio/[id]) — recovery + new-chat must stay in place here,
  // never bounce to /w/chat (JB43-STUDIO-CHAT-FIXES-0625).
  const isStudioRoute = /^\/studio\/\d+/.test(pathname);

  // Auto-open chat panel when navigating to a chat route (ensures toggle state stays in sync)
  useEffect(() => {
    if (isChatRoute && !chatOpen) openChat();
  }, [isChatRoute, chatOpen, openChat]);

  // Bridge: Landscaper tool results → command bus
  //
  // Architectural note: we used to call useModalRegistrySafe() here and
  // dispatch directly to the modal registry. That silently failed on
  // /w/projects/* routes because the chat panel lives in the OUTER /w/
  // layout shell while ModalRegistryProvider is mounted in the CHILD
  // /w/projects/[projectId]/ layout — React context flows down the tree,
  // not up, so the chat panel couldn't see the provider mounted below it.
  //
  // The command bus inverts the dependency: emit a command from up here,
  // a subscriber mounted inside the provider's tree handles it. See
  // /src/lib/landscape-command-bus.ts and
  // /src/components/wrapper/LandscapeCommandSubscriber.tsx.

  const handleToolResult = useCallback(
    (toolName: string, result: Record<string, unknown>) => {
      // LF-USERDASH-0514 Phase 3: route the user's browser on navigate
      // tool results. navigate_to_project / navigate_to_dashboard both
      // return { action: 'navigate', target_url: '/w/...' }. The /w/ layout
      // subscribes and calls router.push.
      if (result.action === 'navigate' && typeof result.target_url === 'string') {
        emitLandscapeCommand('navigate', {
          target_url: result.target_url,
          context: { tool: toolName },
        });
      }
      // navigate_to_screen → switch the studio folder/sub-tab in place.
      if (result.action === 'navigate_screen' && typeof result.folder === 'string') {
        emitLandscapeCommand('navigate_screen', {
          folder: result.folder,
          tab: typeof result.tab === 'string' ? result.tab : undefined,
        });
      }
      if (toolName === 'open_input_modal' && result.action === 'open_modal' && typeof result.modal_name === 'string') {
        emitLandscapeCommand('open_modal', {
          modal_name: result.modal_name,
          context: (result.context as Record<string, unknown>) || undefined,
        });
        // Update content context for Landscaper page context enrichment.
        // Local state in this component — no bus dispatch needed.
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
      // Location brief artifact → push to artifacts panel
      if (
        toolName === 'generate_location_brief' &&
        result.action === 'show_location_brief' &&
        result.location_brief_config
      ) {
        setActiveLocationBrief(
          result.location_brief_config as import('@/contexts/WrapperUIContext').LocationBriefArtifactConfig,
        );
        // LF-USERDASH-0514: when the wrapped tool also returns an artifact_id
        // (Phase 4 registration), promote it to activeArtifactId too. The
        // dispatch in ProjectArtifactsPanel prefers activeArtifactId over
        // activeLocationBrief, so this routes the panel through
        // ArtifactWorkspacePanel (sections list + active artifact slot —
        // same layout as project pages). ArtifactWorkspacePanel's
        // tool-name carve-out renders the rich LocationBriefArtifact view
        // inside the active slot, so the user sees BOTH the sections list
        // AND the rich brief content at once.
        if (typeof result.artifact_id === 'number') {
          setActiveArtifactId(result.artifact_id);
        }
        if (!artifactsOpen) toggleArtifacts();
      }
      // Excel audit artifact → merge into the audit artifact (5 audit tools
      // each contribute a section: classification, structural, integrity,
      // assumptions, waterfall). Latest tool's section gets highlighted.
      if (
        result.action === 'show_excel_audit' &&
        result.excel_audit_config
      ) {
        mergeActiveExcelAudit(
          result.excel_audit_config as Partial<import('@/contexts/WrapperUIContext').ExcelAuditArtifactConfig>,
        );
        if (!artifactsOpen) toggleArtifacts();
      }
      // Generative artifact (Finding #4 Phase 3) — create_artifact /
      // update_artifact tools both return action='show_artifact' with an
      // artifact_id. Set as active and auto-open the panel; the panel's
      // ArtifactWorkspacePanel handles fetch + render via useArtifact.
      if (
        result.action === 'show_artifact' &&
        typeof result.artifact_id === 'number'
      ) {
        setActiveArtifactId(result.artifact_id);
        // Invalidate the Recent Artifacts rail so the new artifact appears
        // without a hard refresh. Mirrors the pattern used in useArtifact.ts
        // mutations (useArtifactPatch / useArtifactUpdateState).
        qc.invalidateQueries({ queryKey: ['artifacts', 'list'] });
        if (!artifactsOpen) toggleArtifacts();
      }
      // Plan extraction (D15/D16) — extract_plan_image fires from chat. The map +
      // trace canvas (MapTab) live in a different layout subtree and only mount on
      // the /w/projects/[id]/map route, so for each action we: (a) latch the
      // payload, (b) navigate the /w/ panel to the map so MapTab mounts (a no-op in
      // the classic shell — no navigate subscriber there, and a no-op if already on
      // the map), and (c) fire the live CustomEvent for the already-mounted case.
      // MapTab drains the latch on mount, so nothing is lost; its existing handlers
      // (canvas, drape, control points, save) do all the work — no duplication.
      if (toolName === 'extract_plan_image' && result.action === 'show_plan_extract_preview') {
        const preview = result.preview as { url?: string; doc_id?: number; page?: number } | undefined;
        if (preview?.url) {
          setPendingPlanExtract({
            kind: 'canvas',
            payload: { url: preview.url, sourceDocId: preview.doc_id ?? null, sourcePage: preview.page ?? null },
          });
          if (projectId) {
            emitLandscapeCommand('navigate', { target_url: `/w/projects/${projectId}/map`, context: { tool: toolName } });
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('landscaper:extract_plan_canvas'));
          }
        }
      }
      if (toolName === 'extract_plan_image' && result.action === 'place_plan_overlay' && result.overlay) {
        const overlay = result.overlay as PlanOverlayPayload;
        setPendingPlanExtract({ kind: 'overlay', payload: overlay });
        if (projectId) {
          emitLandscapeCommand('navigate', { target_url: `/w/projects/${projectId}/map`, context: { tool: toolName } });
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('landscaper:place_plan_overlay', { detail: overlay }));
        }
      }
    },
    [setActiveMapArtifact, setActiveLocationBrief, mergeActiveExcelAudit, setActiveArtifactId, artifactsOpen, toggleArtifacts, setActiveContentContext, qc, projectId],
  );

  // threadId selected/created from the homepage (null = homepage mode)
  const [homepageThreadId, setHomepageThreadId] = useState<string | null>(null);
  // threadTitle is tracked for downstream effects (auto-clear on new chat,
  // capture on thread select) but no longer rendered — the header now shows
  // only the project name. The thread title appears at the top of the thread
  // body itself.
  const [, setThreadTitle] = useState<string | null>(null);
  const [isStartingChat, setIsStartingChat] = useState(false);

  // Thread count for the badge on the thread-history toggle button.
  // Single source of truth: LandscaperChatThreaded already loads `allThreads`
  // for the in-panel browser; it now emits the count up via onThreadCountChange.
  // Removing the duplicate fetch eliminates the badge ↔ list drift bug where
  // the badge could go stale after a thread create/delete.
  const [threadCount, setThreadCount] = useState<number>(0);
  // Tracks whether we've already seen at least one count value, so the initial
  // mount (0 → 0, or first real value) doesn't emit a redundant refresh event.
  const prevThreadCountRef = useRef<number | null>(null);
  // When the in-panel count changes (mount, create, delete), notify the
  // sidebar so its cross-project list refreshes too. The dispatch lives in
  // the effect below — NOT inside the setState updater — to avoid triggering
  // a parent setState during a child render (React 19 surfaces this as the
  // "Cannot update a component while rendering a different component" error).
  const handleThreadCountChange = useCallback((count: number) => {
    setThreadCount(count);
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prev = prevThreadCountRef.current;
    prevThreadCountRef.current = threadCount;
    // Skip the first observed value (mount). Only emit when the count
    // actually changes after we've established a baseline.
    if (prev === null) return;
    if (prev === threadCount) return;
    window.dispatchEvent(new CustomEvent('landscaper:threads-changed'));
  }, [threadCount]);

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

  // Seed-prompt consumption (LF-USERDASH-0514 Phase 1 tail fix, v3).
  //
  // The dashboard's prompt input routes the user to /w/chat?seed=<text> when
  // they hit Enter from the home surface. This effect picks up the seed and
  // populates the chat input box. It deliberately does NOT auto-send — that
  // path turned out to be timing-fragile across remount scenarios. Phase 3
  // will replace the seed mechanism entirely with a direct dashboard→chat
  // submit path.
  //
  // v3 changes from v2:
  //   - No auto-send. setInputText only. User clicks Send themselves to
  //     submit. Removes the entire class of "did sendMessage fire / did it
  //     succeed silently" timing questions.
  //   - No effect cleanup. React strict-mode double-invokes effects, and a
  //     cleanup that cancels the polling killed v2's poll mid-flight. The
  //     polling now runs to completion or to MAX_ATTEMPTS regardless of
  //     strict-mode unmount/remount simulation. MAX_ATTEMPTS caps total
  //     work at ~2s of polling.
  //   - Diagnostic console.logs at each branch point so we can see exactly
  //     which step is failing if the symptom recurs.
  const seedConsumedRef = useRef(false);
  useEffect(() => {
    if (seedConsumedRef.current) return;
    const seed = searchParams?.get('seed');
    console.log('[seed-fix] effect mount, seed param =', JSON.stringify(seed));
    if (!seed) return;
    seedConsumedRef.current = true;

    // Clean the URL immediately so a reload doesn't replay the message.
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.delete('seed');
    const cleanUrl = pathname + (params.toString() ? `?${params.toString()}` : '');
    router.replace(cleanUrl);
    console.log('[seed-fix] URL stripped, polling for chat handle');

    let attempts = 0;
    const MAX_ATTEMPTS = 20; // ~2s at 100ms cadence
    const INTERVAL_MS = 100;

    const dispatch = () => {
      const handle = chatRef.current;
      if (handle && typeof handle.setInputText === 'function') {
        console.log('[seed-fix] handle ready after', attempts, 'attempts — populating input + auto-sending');
        // Populate input first so the user sees their text even if
        // sendMessage fails for any reason.
        try {
          handle.setInputText(seed);
        } catch (e) {
          console.error('[seed-fix] setInputText threw:', e);
        }
        // Auto-send. The pre-existing activeThread-watch abort race that
        // previously made this fragile is closed (useLandscaperThreads
        // guards on sendingRef during first-message thread creation).
        // We use a small additional delay so the hook's initialization
        // has settled before sendMessage runs — the input box has a
        // visible flash of populated state in the meantime.
        setTimeout(() => {
          const h = chatRef.current;
          if (!h || typeof h.sendMessage !== 'function') {
            console.warn('[seed-fix] handle disappeared before auto-send');
            return;
          }
          try {
            const result = h.sendMessage(seed);
            console.log('[seed-fix] sendMessage invoked');
            // sendMessage doesn't touch the chat's input state (that's
            // owned by the chat's own Send button handler). When we
            // invoke sendMessage via the imperative handle, the input
            // box keeps whatever setInputText put there. Clear it now
            // so the user sees an empty input after auto-send, same as
            // a normal Send-button flow.
            try {
              h.setInputText('');
            } catch {
              /* harmless */
            }
            Promise.resolve(result).catch((e) => {
              console.error('[seed-fix] sendMessage rejected:', e);
            });
          } catch (e) {
            console.error('[seed-fix] sendMessage threw:', e);
          }
        }, 150);
        return;
      }
      attempts += 1;
      if (attempts >= MAX_ATTEMPTS) {
        console.warn('[seed-fix] gave up after', attempts, 'attempts — chat handle never appeared');
        return;
      }
      setTimeout(dispatch, INTERVAL_MS);
    };

    // First attempt after one frame so React has committed the chat tree.
    setTimeout(dispatch, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // ── Universal file-attach wiring (FB-298) ──
  // Drop/paste any file(s) → pending-attachment pills → upload on Send via the
  // shared useChatAttachment hook (identical path in classic LandscaperPanel).
  // Project-scoped uploads use projectId; pre-project uploads (on /w/chat /
  // /w/chat/[threadId]) auto-create + attach to a chat thread.

  // Track the active thread id from any source (URL prop, homepage state, or
  // the LandscaperChatThreaded onActiveThreadChange callback).
  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    initialThreadId ?? null
  );
  useEffect(() => {
    if (initialThreadId) setActiveThreadId(initialThreadId);
    else if (homepageThreadId) setActiveThreadId(homepageThreadId);
  }, [initialThreadId, homepageThreadId]);

  // Bridge the existing handleActiveThreadChange so it ALSO updates our
  // local activeThreadId — the upload path needs it for unassigned uploads.
  // Wraps the original callback (URL-replace logic preserved).
  const handleActiveThreadChangeWithUpload = useCallback(
    (threadId: string | null) => {
      if (threadId) setActiveThreadId(threadId);
      handleActiveThreadChange(threadId);
    },
    [handleActiveThreadChange]
  );

  /**
   * Ensure we have a thread to attach an unassigned upload to. If the user
   * is sitting on /w/chat with no thread yet, create one. Returns the thread
   * id, or null if creation failed.
   */
  const ensureUnassignedThread = useCallback(async (): Promise<string | null> => {
    if (activeThreadId) return activeThreadId;
    try {
      const res = await fetch(`${DJANGO_API_URL}/api/landscaper/threads/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ project_id: null, page_context: null }),
      });
      const data = await res.json();
      const newId: string | null = data?.thread?.threadId ?? data?.thread?.id ?? null;
      if (newId) {
        setActiveThreadId(newId);
        // Mirror the URL-replace behavior of handleActiveThreadChange so the
        // user can refresh and resume on the right thread.
        if (pathname === '/w/chat' || pathname === '/w/chat/') {
          router.replace(`/w/chat/${newId}`);
        }
      }
      return newId;
    } catch (e) {
      console.error('Failed to create unassigned thread for upload', e);
      return null;
    }
  }, [activeThreadId, pathname, router]);

  // Shared universal attach hook (FB-298) — owns pending attachments, the
  // UploadThing + /api/dms/docs upload, and the onBeforeSend contextSuffix.
  // Identical path is used by the classic LandscaperPanel.
  const attachment = useChatAttachment({
    projectId,
    activeThreadId,
    ensureThread: ensureUnassignedThread,
    source: 'center_chat_panel_drop',
  });

  // Every dropped file — any type — becomes a pending attachment. No Excel
  // gate; non-Excel files are no longer routed into the FileDropContext void.
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      attachment.addFiles(acceptedFiles);
    },
    [attachment],
  );

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop,
    maxSize: 50 * 1024 * 1024,
    multiple: true,
    noClick: true,
    noKeyboard: true,
  });

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
    <div
      {...getRootProps()}
      className="wrapper-chat-center"
      style={{
        outline: isDragActive ? '2px dashed var(--cui-primary)' : '2px dashed transparent',
        outlineOffset: '-2px',
        backgroundColor: isDragActive ? 'var(--cui-tertiary-bg)' : undefined,
        transition: 'outline-color 0.15s ease, background-color 0.15s ease',
      }}
    >
      {/* Hidden file input for react-dropzone */}
      <input {...getInputProps()} />

      {/* Drag overlay — shared component so both UIs look identical */}
      <ChatDragOverlay
        isDragActive={isDragActive}
        isDragAccept={isDragAccept}
        isDragReject={isDragReject}
      />

      {/* Upload error banner — only shown after a failed upload during Send */}
      {attachment.error && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 60,
            maxWidth: 360,
            padding: '8px 12px',
            borderRadius: 6,
            background: 'rgba(239, 68, 68, 0.12)',
            color: 'var(--cui-danger, #b91c1c)',
            fontSize: 12,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
          }}
        >
          <span style={{ flex: 1 }}>{attachment.error}</span>
          <button
            onClick={() => attachment.setError(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              padding: 0,
              fontSize: 14,
              lineHeight: 1,
            }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Unified center-panel header: icon + project title ──
          Thread name is intentionally NOT shown here — it appears at the
          top of the thread itself, so repeating it in the header is just
          duplication and forces the breadcrumb to truncate. */}
      <WrapperHeader
        leading={
          <LandscaperIcon style={{ width: 32, height: 32, flexShrink: 0 }} />
        }
        title={
          <span className="wrapper-header-title" style={{ fontWeight: 600 }}>
            {projectName || userName || 'Landscaper'}
          </span>
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
                onClick={() => (onNewChat ? onNewChat() : handleStartChat(''))}
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
            onActiveThreadChange={handleActiveThreadChangeWithUpload}
            onThreadCountChange={handleThreadCountChange}
            showThreadList={threadListVisible}
            onBeforeSend={attachment.handleBeforeSend}
            onBeforeUserSend={onBeforeUserSend}
            attachments={attachment.pendingAttachments}
            onRemoveAttachment={attachment.removeAttachment}
            onAddAttachments={attachment.addFiles}
            attachmentUploading={attachment.uploading}
            // Phase 4 — chat-card "Open" → re-activate the artifact in the
            // workspace panel (and re-open the panel if collapsed).
            onOpenArtifact={(artifactId) => {
              setActiveArtifactId(artifactId);
              if (!artifactsOpen) toggleArtifacts();
            }}
            onThreadNotFound={() => {
              // URL-pinned thread is permanently gone (404). Recover to a fresh
              // blank chat for THIS surface — never strand the user on a dead URL.
              if (isStudioRoute && projectId) {
                // Studio: drop the bad ?thread and stay blank in /studio/[id]
                // (JB43). No /w/chat bounce, no red error (hook no longer sets one).
                router.replace(`/studio/${projectId}`);
                return;
              }
              if (isChatRoute) {
                router.replace('/w/chat');
              }
              // Other project routes: leave the user on the page; the chat panel
              // will fall back to project-scoped get_or_create on next send.
            }}
          />
        )}
      </div>

      {/* Pending-attachment pills now render in LandscaperChatThreaded's
          composer (FB-298) so both UIs show them identically. */}

      <ChatSearchOverlay />
    </div>
  );
}
