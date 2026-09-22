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
 * NOT in this slice: the width rule (a screen stating what it needs and the
 * chat yielding to it, `D-2026-09-18-YIELD`), and in-place editing on the
 * registers. Both land on top of this.
 */

import React, { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useWrapperProject } from '@/contexts/WrapperProjectContext';
import { useFolderNavigation } from '@/hooks/useFolderNavigation';
import { formatFolderLabel } from '@/lib/utils/folderTabConfig';
import ProjectContentRouter from '@/app/projects/[projectId]/ProjectContentRouter';

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
        {activeFolder && activeFolder.subTabs.length > 0 && (
          <select
            aria-label="Screen within this folder"
            className="form-select form-select-sm"
            style={{ width: 'auto', minWidth: 140 }}
            value={currentTab}
            onChange={(e) => setFolderTab(activeFolder.id, e.target.value)}
          >
            {activeFolder.subTabs.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="project-folder-content" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
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
