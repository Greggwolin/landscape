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

import React from 'react';
import { useWrapperProject } from '@/contexts/WrapperProjectContext';
import { useFolderNavigation } from '@/hooks/useFolderNavigation';
import ProjectContentRouter from '@/app/projects/[projectId]/ProjectContentRouter';

export function PanelScreenView() {
  const project = useWrapperProject();

  const effectiveType =
    project.project_type_code || project.project_type || project.property_subtype;

  const { currentFolder, currentTab, setFolderTab } = useFolderNavigation({
    propertyType: effectiveType ?? undefined,
  });

  // ProjectContentRouter's project prop is structurally wider than
  // WrapperProject; the classic surface and the studio both pass their own
  // record through the same cast.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const routerProject = project as any;

  return (
    <div className="project-folder-content" style={{ height: '100%', overflow: 'auto' }}>
      <ProjectContentRouter
        project={routerProject}
        currentFolder={currentFolder}
        currentTab={currentTab}
        setFolderTab={setFolderTab}
      />
    </div>
  );
}

export default PanelScreenView;
