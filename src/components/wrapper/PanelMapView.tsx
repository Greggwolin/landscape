'use client';

import { MapTab } from '@/components/map-tab/MapTab';
import type { Project } from '@/components/map-tab/types';
import { useWrapperProject, useWrapperProjectRefetch } from '@/contexts/WrapperProjectContext';

/**
 * The live map, as the third view of the project's right-hand panel (MK22).
 *
 * Gregg: "once the map panel opens, there's no way to get back to the
 * Artifacts / Documents panel". That was structural — Artifacts and Documents
 * are two views of one panel, while the map was a separate route that
 * replaced the whole surface, toggle included. This mounts the same MapTab
 * inside the panel so the toggle survives.
 *
 * Kept as its own component for one reason: it calls `useWrapperProject`,
 * which THROWS when there is no WrapperProjectProvider above it. The panel is
 * also rendered on /w/dashboard, which has no such provider — so the caller
 * must only render this on the project surface. ProjectArtifactsPanel gates it
 * behind `showViewToggle`, which is set on the project page and not on the
 * dashboard. Isolating the hook here means that gate is the only thing that
 * has to hold.
 *
 * Bridge safety: MapTab drains a module-level latch (`takePendingPlanExtract`)
 * and registers window listeners for the chat-driven drape commands. Two
 * mounted MapTabs would mean one stealing the other's payload and live events
 * firing twice. That cannot happen here — the project layout renders only
 * `{children}`, so /w/projects/[id]/map (which mounts its own MapTab) and
 * /w/projects/[id] (which mounts the panel) are different routes and never
 * both mounted.
 */
export function PanelMapView() {
  const project = useWrapperProject();
  const refetchProject = useWrapperProjectRefetch();

  // Project carries an index signature ([key: string]: unknown) that
  // WrapperProject lacks, so spread into a fresh object literal to satisfy the
  // structural target — same adaptation the map route does.
  const mapProject: Project = { ...project };

  return (
    <div
      className="project-right-panel-body project-right-panel-body--map"
      style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex' }}
    >
      <MapTab project={mapProject} onProjectUpdated={refetchProject} />
    </div>
  );
}
