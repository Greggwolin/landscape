'use client';

/**
 * StudioPanel - Combined left panel with tiles and Landscaper
 *
 * STYLING RULES:
 * - All colors use CSS variables from studio-theme.css
 * - No Tailwind color classes (bg-*, text-*, border-* with colors)
 * - Tailwind layout utilities (flex, grid, gap, p-*, m-*) are allowed
 *
 * This is the main container for the Studio navigation panel.
 * Width: 280px (defined by --studio-sidebar-width CSS variable)
 *
 * @version 1.0
 * @created 2026-01-20
 */

import React from 'react';
import { TileGrid, type AnalysisType, type TileStatus } from './TileGrid';
import { LandscaperPanel, type ActivityItem } from './LandscaperPanel';

export interface StudioPanelProps {
  /** Project ID for navigation */
  projectId: number;
  /** Analysis type determines which tiles are shown */
  analysisType: AnalysisType;
  /** Currently active tile (for highlighting) */
  activeTile?: string;
  /** Optional tile status overrides */
  tileStatuses?: Record<string, { status: TileStatus; statusText?: string }>;
  /** Callback when user sends a message to Landscaper */
  onSendMessage?: (message: string) => void;
  /** Activity items to display in Landscaper feed */
  activities?: ActivityItem[];
  /** Context label shown in Landscaper header */
  contextLabel?: string;
  /** Placeholder text for chat input */
  chatPlaceholder?: string;
  /** Whether Landscaper is processing */
  isProcessing?: boolean;
}

/**
 * StudioPanel - Combined left panel with tiles and Landscaper
 *
 * This is the main container for the Studio navigation panel.
 * Width: 280px (defined by CSS variable)
 *
 * @example
 * <StudioPanel
 *   projectId={1}
 *   analysisType="VALUATION"
 *   activeTile="property"
 *   onSendMessage={(msg) => console.log(msg)}
 * />
 */
export function StudioPanel({
  projectId,
  analysisType,
  activeTile,
  tileStatuses,
  onSendMessage,
  activities,
  contextLabel,
  chatPlaceholder,
  isProcessing,
}: StudioPanelProps): JSX.Element {
  return (
    <aside
      className="flex flex-col h-full overflow-hidden"
      style={{
        width: 'var(--studio-sidebar-width, 280px)',
        backgroundColor: 'var(--studio-surface-panel)',
        borderRight: '1px solid var(--studio-border-soft)',
      }}
    >
      {/* Tile Navigation */}
      <TileGrid
        projectId={projectId}
        analysisType={analysisType}
        activeTile={activeTile}
        tileStatuses={tileStatuses}
      />

      {/* Landscaper */}
      <LandscaperPanel
        projectId={projectId}
        onSendMessage={onSendMessage}
        activities={activities}
        contextLabel={contextLabel}
        placeholder={chatPlaceholder}
        isProcessing={isProcessing}
      />
    </aside>
  );
}

export default StudioPanel;
