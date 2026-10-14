'use client';

/**
 * PanelScreenView — a classic project screen, rendered inside the chat-first
 * right panel.
 *
 * Settled 2026-09-18 (chat VW, `D-2026-09-18-TARGET`): the chat-first UI is the
 * working surface and the classic screens come to it, rather than the work
 * moving to the studio shell. Registers — where you type — are screens;
 * reports are artifacts. This is the host for the screen half.
 *
 * It renders `ProjectContentRouter`, the same screen tree the classic surface,
 * the studio and the design shell all render. Nothing about the screens is
 * forked: one tree, four hosts.
 *
 * Folder and sub-tab live in the URL (`?folder=budget&tab=budget`), the
 * convention the classic surface and the studio already use, so the sidebar
 * tree, this panel and a link pasted into chat all agree without a context
 * between them.
 *
 * Gated to the project surface by its caller: `useWrapperProject` throws
 * without a provider, and the dashboard renders the panel without one — the
 * same reason the map view is gated. See PanelMapView.
 *
 * The width rule (`D-2026-09-18-YIELD`) landed 2026-10-14 (QX): the screen
 * measures how much sideways room its content is asking for and requests it
 * through the same channel the artifacts use, so the chat gives way to a wide
 * register or cash flow the way it gives way to the budget artifact. The
 * sidebar does not move (Rule 11). In-place editing on the registers is still
 * NOT in this slice.
 */

import React, { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useWrapperProject } from '@/contexts/WrapperProjectContext';
import { useFolderNavigation } from '@/hooks/useFolderNavigation';
import { formatFolderLabel } from '@/lib/utils/folderTabConfig';
import ProjectContentRouter from '@/app/projects/[projectId]/ProjectContentRouter';
import { useArtifactWidthRequest } from './artifactWidthRequest';

/* How much sideways room the screen's content wants beyond what it has.
 * The classic pages put their tables in `overflow-x: auto` boxes, so an
 * ancestor's scrollWidth never sees the overflow; walk the descendants and
 * take the widest shortfall. Cheap: one screen, run on resize/mutation only. */
function measureNeededWidth(root: HTMLElement): number {
  let shortfall = 0;
  const nodes = root.querySelectorAll<HTMLElement>('*');
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i];
    const over = el.scrollWidth - el.clientWidth;
    if (over > shortfall && el.clientWidth > 0) shortfall = over;
  }
  return root.clientWidth + shortfall;
}

/** Folders that are panel TABS, not screens (Rule 9). */
const TAB_FOLDERS = new Set(['documents', 'map']);

export function PanelScreenView() {
  const project = useWrapperProject();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const effectiveType =
    project.project_type_code || project.project_type || project.property_subtype;

  const { currentFolder, currentTab, setFolderTab, folderConfig } = useFolderNavigation({
    propertyType: effectiveType ?? undefined,
  });

  // RULE 9 (Gregg "9a"): one Documents and one Map per project, and they are
  // the panel's tabs. An address that asks for either as a SCREEN (an older
  // link, a remembered chat from before this rule) is sent to the tab, and the
  // folder is dropped from the address so the Screens button does not bounce
  // back here next time.
  useEffect(() => {
    if (!TAB_FOLDERS.has(currentFolder)) return;
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('view', currentFolder);
    if (currentFolder === 'documents' && params.get('tab')) {
      params.set('doctab', params.get('tab') as string);
    }
    params.delete('folder');
    params.delete('tab');
    router.replace(`${pathname}?${params.toString()}`);
  }, [currentFolder, pathname, router, searchParams]);

  // ProjectContentRouter's project prop is structurally wider than
  // WrapperProject; the classic surface and the studio both pass their own
  // record through the same cast.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const routerProject = project as any;

  const screenFolders = folderConfig.folders.filter((f) => !TAB_FOLDERS.has(f.id));
  const activeFolder = screenFolders.find((f) => f.id === currentFolder);

  // The width rule. Measure after the screen settles, and again whenever its
  // content changes (a tab switch, a table that loads late) or the panel is
  // resized. Request only when the content is wider than the room it has;
  // the panel never shrinks on a request, so withdrawing is harmless.
  const { requestWidth } = useArtifactWidthRequest();
  const contentRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const needed = measureNeededWidth(root);
        // +24 so the last column is not flush against the panel edge.
        requestWidth(needed > root.clientWidth + 8 ? needed + 24 : null);
      });
    };
    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(root);
    const mo = new MutationObserver(schedule);
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      mo.disconnect();
      requestWidth(null);
    };
  }, [currentFolder, currentTab, requestWidth]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* RULE 12 (Gregg "13a"): the Screens view carries its own folder →
          screen picker, so any screen is reachable from the panel without the
          sidebar tree. The Screens button reopens the last screen the chat had
          (it is kept in the address, per chat). */}
      <div
        className="d-flex align-items-center gap-2"
        style={{
          padding: '6px 12px',
          borderBottom: '1px solid var(--cui-border-color)',
          flexShrink: 0,
        }}
      >
        <label
          htmlFor="panel-screen-folder"
          style={{ fontSize: 12, color: 'var(--cui-secondary-color)', margin: 0 }}
        >
          Screen
        </label>
        <select
          id="panel-screen-folder"
          className="form-select form-select-sm"
          style={{ width: 'auto', minWidth: 140 }}
          value={activeFolder ? activeFolder.id : ''}
          onChange={(e) => setFolderTab(e.target.value)}
        >
          {!activeFolder && <option value="">Choose…</option>}
          {screenFolders.map((f) => (
            <option key={f.id} value={f.id}>
              {formatFolderLabel(f.label)}
            </option>
          ))}
        </select>
        {/* Sub-pages are links beside the box, not a second dropdown
            (Gregg, 2026-09-30): every page in the folder is visible at once
            and one click away. Same look as the Screens | Artifacts |
            Documents | Map row above. Wraps to a second line when a folder
            has more pages than the panel is wide. */}
        {activeFolder && activeFolder.subTabs.length > 0 && (
          <nav className="panel-screen-subtabs" aria-label="Pages in this screen">
            {activeFolder.subTabs.map((t, i) => (
              <React.Fragment key={t.id}>
                {i > 0 && (
                  <span className="panel-screen-subtab-sep" aria-hidden>
                    |
                  </span>
                )}
                <button
                  type="button"
                  className={`panel-screen-subtab${t.id === currentTab ? ' is-active' : ''}`}
                  aria-current={t.id === currentTab ? 'page' : undefined}
                  onClick={() => {
                    if (t.id !== currentTab) setFolderTab(activeFolder.id, t.id);
                  }}
                >
                  {t.label}
                </button>
              </React.Fragment>
            ))}
          </nav>
        )}
      </div>
      <div ref={contentRef} className="project-folder-content" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <ProjectContentRouter
          project={routerProject}
          currentFolder={currentFolder}
          currentTab={currentTab}
          setFolderTab={setFolderTab}
        />
      </div>
    </div>
  );
}

export default PanelScreenView;
