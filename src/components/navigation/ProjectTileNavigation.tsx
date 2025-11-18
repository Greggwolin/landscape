/**
 * ProjectTileNavigation - Wrapper component for progressive tile navigation
 *
 * Integrates with ProjectProvider to:
 * - Get current project data
 * - Calculate tile statuses
 * - Manage tile navigation state
 * - Render TileNavigationGrid
 *
 * Replaces ProjectContextBar with tile-based navigation.
 *
 * @version 1.0
 * @date 2025-11-18
 */
'use client';

import React, { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProjectContext } from '@/app/components/ProjectProvider';
import TileNavigationGrid from './TileNavigationGrid';
import { useTileNavigation } from '@/hooks/useTileNavigation';
import { useTileStatus } from '@/hooks/useTileStatus';
import { type TileConfig } from '@/config/tile-hierarchy';

export interface ProjectTileNavigationProps {
  /** Project ID */
  projectId: number;
}

/**
 * ProjectTileNavigation Component
 *
 * Main entry point for the progressive tile navigation system.
 * Connects hooks and components to provide complete navigation experience.
 */
export default function ProjectTileNavigation({ projectId }: ProjectTileNavigationProps) {
  // Get router for navigation
  const router = useRouter();

  // Get current active tab from URL
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'project';

  // Get project data
  const { activeProject, projects, selectProject } = useProjectContext();

  // Find the current project
  const project = useMemo(() => {
    return projects.find((p) => p.project_id === projectId) || activeProject;
  }, [projectId, projects, activeProject]);

  // Handle project change
  const handleProjectChange = (newProjectId: number) => {
    selectProject(newProjectId);
    router.push(`/projects/${newProjectId}`);
  };

  // Calculate tile statuses based on project data
  const statusMap = useTileStatus(project);

  // Get navigation state
  const {
    currentTiles,
    level,
    parentTile,
    activeTileId,
    handleTileClick,
    handleBack,
  } = useTileNavigation(projectId);

  /**
   * Helper: Check if a tile's route matches the current active tab
   */
  const isTileActive = (tile: TileConfig): boolean => {
    if (!tile.route) return false;
    // Extract tab parameter from route (e.g., "?tab=budget" -> "budget")
    const match = tile.route.match(/[?&]tab=([^&]+)/);
    if (!match) return false;
    return match[1] === activeTab;
  };

  // Enhance tiles with status indicators AND active state
  const tilesWithStatus = useMemo(() => {
    return currentTiles.map((tile) => ({
      ...tile,
      status: statusMap[tile.id] || 'not-started',
      active: isTileActive(tile), // Mark tile as active if its tab matches URL
      selected: level === 2 && parentTile?.id === tile.id, // Mark as selected if it's the parent
      // If tile has children, also enhance children with status and active state
      children: tile.children?.map((child) => ({
        ...child,
        status: statusMap[child.id] || 'not-started',
        active: isTileActive(child),
      })),
    })) as TileConfig[];
  }, [currentTiles, statusMap, activeTab, level, parentTile]);

  return (
    <div className="project-tile-navigation w-full px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-start gap-4">
        {/* Project Selector Dropdown */}
        <div className="flex-shrink-0">
          <select
            value={project?.project_id || projectId}
            onChange={(e) => handleProjectChange(Number(e.target.value))}
            className="px-3 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{
              backgroundColor: 'var(--cui-tertiary-bg)',
              borderColor: 'var(--cui-border-color)',
              color: 'var(--cui-body-color)',
              border: '1px solid var(--cui-border-color)',
              cursor: 'pointer',
              minWidth: '280px',
            }}
          >
            {projects.map((proj) => (
              <option key={proj.project_id} value={proj.project_id}>
                {proj.project_name} - {proj.project_type_code || 'Unknown'}
              </option>
            ))}
          </select>
        </div>

        {/* Tile Navigation */}
        <div className="flex-1">
          <TileNavigationGrid
            tiles={tilesWithStatus}
            level={level}
            parentTile={parentTile}
            activeTileId={activeTileId}
            onTileClick={handleTileClick}
            onBack={level === 2 ? handleBack : undefined}
            projectId={projectId}
          />
        </div>
      </div>
    </div>
  );
}
