'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useWrapperUI } from '@/contexts/WrapperUIContext';
import { MapArtifactRenderer } from './MapArtifactRenderer';
import { LocationBriefArtifact } from './LocationBriefArtifact';
import { ExcelAuditArtifact } from './ExcelAuditArtifact';
import { ArtifactWorkspacePanel } from './ArtifactWorkspacePanel';
import { WrapperHeader } from './WrapperHeader';
import { ProjectDocumentsBody } from './ProjectDocumentsBody';
import { PanelMapView } from './PanelMapView';
import { ClassicViewToggle } from '@/components/ui/ClassicViewToggle';
import {
  ArtifactWidthRequestProvider,
  useArtifactWidthRequest,
} from './artifactWidthRequest';

const DEFAULT_ARTIFACTS_WIDTH = 420;
const MIN_ARTIFACTS_WIDTH = 320;
const MAX_ARTIFACTS_WIDTH = 1600;

/* The chat's floor. The panel may grow over everything else on the row, but not
 * over this — a chat narrower than this stops being usable, and the artifact
 * panel taking the whole window is a different feature (takeover), reached
 * deliberately rather than by opening a wide table. */
const MIN_CHAT_WIDTH = 380;

// MK24 §5/§6 — widths as a share of the viewport rather than fixed pixels.
// The map wants the screen; the artifacts rail wants to sit beside the chat.
const ARTIFACTS_VIEWPORT_SHARE = 0.25;
// 70% — Gregg's number, restored 2026-08-17.
//
// MK24 set this to 70%, MK28 reduced it to 60% on the reasoning that the chat
// shares the row and needed protecting. That was wrong: he had used 70% and
// wanted it back ("it was 70% before you started tweaking"). The squeeze he
// actually reported came from the destination push and the 1600px clamp
// below, not from the share — both fixed separately. Don't lower this again
// without him asking.
const MAP_VIEWPORT_SHARE = 0.7;

/** A viewport share in pixels.
 *
 * The upper bound is the LARGER of the legacy pixel cap and the requested
 * share. MAX_ARTIFACTS_WIDTH (1600) was chosen for artifact takeover, and on a
 * wide display it silently ate the map's share: 60% of a 3200px screen is
 * 1920, clamped down to 1600, which lands back at ~50% — exactly the "it only
 * opens at 50%" Gregg reported after MK28 set it to 60%. A share is a
 * deliberate instruction about proportion; a constant tuned for a different
 * purpose should not quietly overrule it. The lower bound still applies, so a
 * narrow window cannot produce an unusable sliver.
 */
function widthForShare(share: number): number {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1600;
  const wanted = Math.round(vw * share);
  const upper = Math.max(MAX_ARTIFACTS_WIDTH, wanted);
  return Math.min(Math.max(wanted, MIN_ARTIFACTS_WIDTH), upper);
}

// ── Seam for per-artifact width rules ───────────────────────────────────────
// Gregg: "we will need to create rules for the panel widths as we finalize the
// design of the standard artifacts." A table with twelve columns and a two-line
// summary should not get the same width — but which gets what has not been
// decided, so nothing is guessed here.
//
// ⚠️ THAT DECISION LANDED 2026-08-22 AND IT DID NOT LAND HERE. Gregg: "the user
// needs access to all columns. if the artifacts panel needs to expand in width
// to accommodate, thats fine." The rule turned out not to be per-artifact at
// all — it is per COLUMN SET, and the column set changes with the detail rung,
// the chips the user has toggled, and the constant-drop rule, none of which
// move the artifact id. A share computed from an id would be stale the moment a
// chip was clicked. So the rule lives in ./artifactWidthRequest, where the
// artifact reports the width its current columns need and this panel grows to
// meet it (see requestedWidth below).
//
// This seam stays for the case it was actually written for: an artifact whose
// natural width is a proportion of the screen rather than a sum of columns — a
// map, a drawing, an image. Return a viewport share for such an artifact;
// return null to take the default. The user's drag still wins over both.
function preferredShareForArtifact(_artifactId: number | null): number | null {
  return null;
}

// Left sidebar collapses to this width during artifact takeover. Mirrors
// COLLAPSED_WIDTH in src/app/w/layout.tsx — when activeArtifactId becomes
// truthy, layout.tsx auto-collapses the sidebar to 48px, so we use that
// same number to compute the 50/50 split for chat + artifact.
const SIDEBAR_COLLAPSED_WIDTH = 48;

interface ProjectArtifactsPanelProps {
  projectId: number;
  /** Override the "Project Documents" section label. Used by the home-page
   *  dashboard which mounts this panel against the user's home project; the
   *  label there is just "Documents" since there's no real project context. */
  documentsLabel?: string;
  /** Include unassigned (project_id=null) artifacts alongside project-scoped
   *  ones. Transitional flag for the home page — until Phase 3 attaches
   *  dashboard chats to the home project, their artifacts are unassigned. */
  includeUnassigned?: boolean;
  /** Show the "Classic view" toggle in the header. Only true on the real
   *  project view (/w/projects/[id]); the dashboard mount leaves it off so the
   *  toggle doesn't appear in a no-real-project context. */
  showViewToggle?: boolean;
}

export function ProjectArtifactsPanel(props: ProjectArtifactsPanelProps) {
  // The provider has to sit ABOVE the panel body, because the body renders the
  // artifact that makes the request and this panel has to read it back.
  return (
    <ArtifactWidthRequestProvider>
      <ProjectArtifactsPanelInner {...props} />
    </ArtifactWidthRequestProvider>
  );
}

function ProjectArtifactsPanelInner({ projectId, documentsLabel, includeUnassigned, showViewToggle }: ProjectArtifactsPanelProps) {
  const {
    artifactsOpen,
    toggleArtifacts,
    activeMapArtifact,
    activeLocationBrief,
    activeExcelAudit,
    activeArtifactId,
    projectRightPanelView,
    setProjectRightPanelView,
  } = useWrapperUI();

  // Draggable width (LEFT-edge handle, dragging left widens the panel)
  // MK24 §6 — 25% of the viewport, not a fixed 420px.
  //
  // The first render must NOT measure the window. This started as a lazy
  // initialiser branching on `typeof window`, which is the textbook cause of a
  // hydration mismatch: the server has no window and renders the constant, the
  // browser measures and renders a share of the viewport, React finds two
  // different widths for the same element and gives up reconciling that
  // subtree. So both sides start from the constant and the viewport share is
  // applied just after mount, one frame later.
  const [panelWidth, setPanelWidth] = useState(DEFAULT_ARTIFACTS_WIDTH);
  // Once he has dragged the panel, the drag is authoritative — no automatic
  // sizing (including the per-artifact seam above) may override it.
  //
  // Kept as BOTH a ref and state on purpose: the effects below read it
  // synchronously while they run, and the render needs it to decide whether a
  // width request may grow the panel. A ref alone would not re-render; state
  // alone would be a frame late for the effects.
  const hasUserDragged = useRef(false);
  const [userSized, setUserSized] = useState(false);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  /* ── Growing to fit the content ──────────────────────────────────────────
   * The mounted artifact reports the width its current columns need. The panel
   * grows to meet it, and stops at whatever leaves the chat usable. Nothing
   * here ever SHRINKS the panel — a request smaller than the current width is
   * simply not a constraint, so closing columns does not yank the panel in
   * while the user is reading it. */
  const { requestedWidth } = useArtifactWidthRequest();
  const [viewportWidth, setViewportWidth] = useState<number | null>(null);

  // Measured after mount, never during render — see the panelWidth note above
  // for why the first render must not touch `window`.
  useEffect(() => {
    const measure = () => setViewportWidth(window.innerWidth);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // The widest the panel may go: everything on the row except the collapsed
  // sidebar and the chat's floor. Null until the viewport has been measured,
  // which keeps the first render identical on both sides of hydration.
  const maxContentWidth =
    viewportWidth == null
      ? null
      : Math.max(
          viewportWidth - SIDEBAR_COLLAPSED_WIDTH - MIN_CHAT_WIDTH,
          MIN_ARTIFACTS_WIDTH
        );

  // What actually gets rendered. A width he dragged for himself is final.
  const effectiveWidth =
    userSized || requestedWidth == null || maxContentWidth == null
      ? panelWidth
      : Math.max(panelWidth, Math.min(requestedWidth, maxContentWidth));

  // Takeover mode — when activeArtifactId becomes truthy, expand the panel
  // to share the remaining viewport with the chat (50/50 after the
  // collapsed sidebar). On close (X clicked → activeArtifactId nulled),
  // restore the pre-takeover width. layout.tsx handles the sidebar
  // collapse + restore in parallel. RP-CFRPT-2605 Phase 3 follow-up.
  const preTakeoverWidth = useRef<number | null>(null);
  const inTakeoverMode = useRef(false);
  const takeoverMode = activeArtifactId != null;

  // The opening width, applied one frame after mount — see the note on the
  // panelWidth state above for why it cannot be measured during the first
  // render. Runs once: this is the size the panel opens at, not a responsive
  // rule, and re-running it on viewport changes would yank a panel the user
  // had deliberately sized.
  useEffect(() => {
    if (hasUserDragged.current || inTakeoverMode.current) return;
    setPanelWidth(widthForShare(ARTIFACTS_VIEWPORT_SHARE));
     
  }, []);

  useEffect(() => {
    // MK24 §5 — the map is a takeover too, just a wider one (70% rather than
    // the artifact's half-of-remaining). Same snapshot-and-restore machinery:
    // entering remembers the width the user had, leaving puts it back, so a
    // deliberately dragged panel survives a trip to the map and back.
    const mapMode = projectRightPanelView === 'map' && showViewToggle;
    const wantsTakeover = takeoverMode || mapMode;

    if (wantsTakeover && !inTakeoverMode.current) {
      preTakeoverWidth.current = panelWidth;
      inTakeoverMode.current = true;
      if (mapMode) {
        setPanelWidth(widthForShare(MAP_VIEWPORT_SHARE));
      } else {
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1600;
        const available = Math.max(vw - SIDEBAR_COLLAPSED_WIDTH, MIN_ARTIFACTS_WIDTH * 2);
        const half = Math.round(available / 2);
        setPanelWidth(Math.min(Math.max(half, MIN_ARTIFACTS_WIDTH), MAX_ARTIFACTS_WIDTH));
      }
    } else if (wantsTakeover && inTakeoverMode.current) {
      // Already in takeover but the KIND changed (artifact ⇄ map) — resize
      // without touching the remembered pre-takeover width.
      setPanelWidth(
        mapMode
          ? widthForShare(MAP_VIEWPORT_SHARE)
          : Math.min(
              Math.max(
                Math.round(
                  Math.max(
                    (typeof window !== 'undefined' ? window.innerWidth : 1600) -
                      SIDEBAR_COLLAPSED_WIDTH,
                    MIN_ARTIFACTS_WIDTH * 2
                  ) / 2
                ),
                MIN_ARTIFACTS_WIDTH
              ),
              MAX_ARTIFACTS_WIDTH
            )
      );
    } else if (!wantsTakeover && inTakeoverMode.current) {
      setPanelWidth(preTakeoverWidth.current ?? widthForShare(ARTIFACTS_VIEWPORT_SHARE));
      preTakeoverWidth.current = null;
      inTakeoverMode.current = false;
    } else if (!wantsTakeover && !hasUserDragged.current) {
      // Artifacts view, not in takeover, and he has not sized the panel
      // himself: 25% by default, or wider if this artifact asks for it. The
      // per-artifact rule is the seam above — it returns null today, so this
      // is the plain 25%.
      const share =
        preferredShareForArtifact(activeArtifactId) ?? ARTIFACTS_VIEWPORT_SHARE;
      setPanelWidth(widthForShare(share));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [takeoverMode, projectRightPanelView, showViewToggle]);

  const handleResizeStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      isResizing.current = true;
      startX.current = e.clientX;
      // Start from what is on screen, not from the stored width. If the content
      // grew the panel past `panelWidth`, dragging from the stored value would
      // jump the edge away from the cursor on the first pixel of movement.
      startWidth.current = effectiveWidth;

      // The drag may go as wide as the content may — otherwise a table that
      // widened itself past the legacy 1600 cap could not then be dragged, and
      // the handle would appear broken exactly where it matters most.
      const dragCeiling = Math.max(MAX_ARTIFACTS_WIDTH, maxContentWidth ?? 0);

      const handleMove = (ev: PointerEvent) => {
        if (!isResizing.current) return;
        const delta = startX.current - ev.clientX;
        const newWidth = startWidth.current + delta;
        setPanelWidth(
          Math.min(Math.max(newWidth, MIN_ARTIFACTS_WIDTH), dragCeiling)
        );
      };

      const handleUp = () => {
        isResizing.current = false;
        // MK24 §6 — from here on the drag is authoritative. Per-artifact width
        // rules (preferredShareForArtifact) must not move a panel he has
        // deliberately sized; the takeover snapshot/restore still applies,
        // because that restores HIS width rather than imposing one. A content
        // width request is subject to the same rule — see effectiveWidth.
        hasUserDragged.current = true;
        setUserSized(true);
        document.removeEventListener('pointermove', handleMove);
        document.removeEventListener('pointerup', handleUp);
      };

      document.addEventListener('pointermove', handleMove);
      document.addEventListener('pointerup', handleUp);
    },
    [effectiveWidth, maxContentWidth]
  );

  /* ── Collapsed strip ── */
  if (!artifactsOpen) {
    return (
      <div className="artifacts-collapsed">
        <button
          className="artifacts-expand-btn"
          onClick={toggleArtifacts}
          title="Open artifacts panel"
        >
          ☰
        </button>
      </div>
    );
  }

  /* ── Expanded panel ── */
  // The parent <main class="wrapper-main wrapper-main-narrow"> is
  // flex-direction: column, which would stack the drag handle ABOVE the
  // panel as a zero-height horizontal strip (it has explicit width: 6 but
  // no height). Wrap the handle + panel in a row-direction container so
  // the handle sits to the LEFT of the panel as designed, regardless of
  // the parent's flex direction.
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        height: '100%',
        // alignSelf: flex-start prevents the column-flex parent from
        // stretching this wrapper to fill the cross-axis (width). Content
        // sizing then comes from the row-flex children (handle + panel),
        // so <main> can resize as panelWidth changes.
        alignSelf: 'flex-start',
        width: 'max-content',
      }}
    >
      <div
        className="wrapper-drag-handle"
        onPointerDown={handleResizeStart}
        style={{
          cursor: 'col-resize',
          width: 4,
          flexShrink: 0,
          background: 'transparent',
        }}
      />
      <div className="artifacts-panel" style={{ width: effectiveWidth, flexShrink: 0 }}>
      {/* Header — Artifacts | Documents view toggle. Sits at the top of
          the rail full-bleed (no gutter). Active label is white, inactive
          is muted. Clicking either swaps the panel body without navigating
          away or losing the active chat thread. Persists across project
          sub-routes via WrapperUIContext. */}
      <WrapperHeader
        title={
          <div className="project-right-panel-toggle">
            <button
              type="button"
              className={`prp-toggle-btn${projectRightPanelView === 'artifacts' ? ' is-active' : ''}`}
              onClick={() => setProjectRightPanelView('artifacts')}
            >
              Artifacts
            </button>
            <span className="prp-toggle-sep" aria-hidden>|</span>
            <button
              type="button"
              className={`prp-toggle-btn${projectRightPanelView === 'documents' ? ' is-active' : ''}`}
              onClick={() => setProjectRightPanelView('documents')}
            >
              Documents
            </button>
            {/* MK22 — Map as a third view. Only on the project surface:
                PanelMapView calls useWrapperProject, which throws without a
                WrapperProjectProvider, and the dashboard renders this panel
                without one. showViewToggle is set on the project page only. */}
            {showViewToggle && (
              <>
                <span className="prp-toggle-sep" aria-hidden>|</span>
                <button
                  type="button"
                  className={`prp-toggle-btn${projectRightPanelView === 'map' ? ' is-active' : ''}`}
                  onClick={() => setProjectRightPanelView('map')}
                >
                  Map
                </button>
              </>
            )}
          </div>
        }
        trailing={
          <>
            {showViewToggle && (
              <ClassicViewToggle
                projectId={projectId}
                current="unified"
                className="w-btn w-btn-ghost w-btn-sm"
                style={{ fontSize: '12px', padding: '2px 8px' }}
              />
            )}
            <button
              className="w-btn w-btn-ghost w-btn-sm"
              onClick={toggleArtifacts}
              title="Collapse panel"
              style={{ fontSize: '14px', padding: '2px 6px' }}
            >
              ☰
            </button>
          </>
        }
      />

      {/* Body — padded rail gutter that hosts cards. View dispatch:
          - Documents view: full-bleed DMS surface (no card wrap; the
            DMS owns the entire body and has its own internal layout).
          - Artifacts view with active full-artifact (LocationBrief / Map
            / ExcelAudit): the artifact fills the body in a single
            flex-grow card.
          - Default artifacts view: ArtifactWorkspacePanel renders its
            own per-section card stack inside .artifacts-panel-body. */}
      {projectRightPanelView === 'documents' ? (
        <div className="project-right-panel-body project-right-panel-body--documents">
          <ProjectDocumentsBody projectId={projectId} />
        </div>
      ) : projectRightPanelView === 'map' && showViewToggle ? (
        // MK22 — the live map, keeping the toggle above it. Guarded by
        // showViewToggle for the same reason the button is; if the view
        // somehow persists onto the dashboard, this falls through to the
        // artifacts branch rather than throwing on a missing project context.
        <PanelMapView />
      ) : activeArtifactId != null ? (
        <ArtifactWorkspacePanel projectId={projectId} documentsLabel={documentsLabel} includeUnassigned={includeUnassigned} takeoverMode />
      ) : activeLocationBrief ? (
        <LocationBriefArtifact
          config={activeLocationBrief}
          onClose={toggleArtifacts}
        />
      ) : activeMapArtifact ? (
        <MapArtifactRenderer
          config={activeMapArtifact}
          onClose={toggleArtifacts}
        />
      ) : activeExcelAudit ? (
        <ExcelAuditArtifact
          config={activeExcelAudit}
          onClose={toggleArtifacts}
        />
      ) : (
        <ArtifactWorkspacePanel projectId={projectId} documentsLabel={documentsLabel} includeUnassigned={includeUnassigned} />
      )}
      </div>
    </div>
  );
}
