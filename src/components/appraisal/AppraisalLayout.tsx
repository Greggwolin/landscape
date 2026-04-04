/**
 * AppraisalLayout
 *
 * Main three-panel shell for the appraisal conversational UI.
 * Rendered when a project URL includes ?ui=appraisal.
 *
 * Left (220px, collapsible) | Center (flex, Landscaper chat) | Right (320px, approach views)
 *
 * @version 1.0
 * @created 2026-04-04
 */

'use client';

import React, { useState, useCallback } from 'react';
import type { ApproachId, BottomView, DetailId } from './appraisal.types';
import type { Project } from './appraisal.types';
import { APPROACH_TABS } from './appraisal.config';
import { getPillsForApproach } from './appraisal.config';
import { AppraisalTopbar } from './AppraisalTopbar';
import { AppraisalLeftPanel } from './AppraisalLeftPanel';
import { AppraisalChatPanel } from './AppraisalChatPanel';
import { AppraisalRightPanel } from './AppraisalRightPanel';
import './appraisal.css';

interface AppraisalLayoutProps {
  project: Project;
}

export function AppraisalLayout({ project }: AppraisalLayoutProps) {
  // Layout state
  const [leftCollapsed, setLeftCollapsed] = useState(false);

  // Approach navigation state
  const [activeApproach, setActiveApproach] = useState<ApproachId>('income');
  const [activePills, setActivePills] = useState<Record<string, string>>(() => {
    // Initialize with default pill for each approach
    const defaults: Record<string, string> = {};
    APPROACH_TABS.forEach((tab) => {
      const pillSet = getPillsForApproach(tab.id);
      if (pillSet) {
        defaults[tab.id] = pillSet.defaultPill;
      }
    });
    return defaults;
  });

  // Detail panel state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<DetailId | string>('generic');
  const [detailLabel, setDetailLabel] = useState('Line Item Detail');

  // Bottom section state
  const [bottomView, setBottomView] = useState<BottomView>('reports');

  // Handlers
  const handleToggleLeft = useCallback(() => {
    setLeftCollapsed((prev) => !prev);
  }, []);

  const handleApproachChange = useCallback((id: ApproachId) => {
    setActiveApproach(id);
    // Reset to default pill for the new approach
    const pillSet = getPillsForApproach(id);
    if (pillSet) {
      setActivePills((prev) => ({ ...prev, [id]: pillSet.defaultPill }));
    }
  }, []);

  const handlePillChange = useCallback(
    (pillId: string) => {
      setActivePills((prev) => ({ ...prev, [activeApproach]: pillId }));
    },
    [activeApproach]
  );

  const handleOpenDetail = useCallback((id: DetailId | string, label?: string) => {
    setDetailId(id);
    setDetailLabel(label || 'Line Item Detail');
    setDetailOpen(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailOpen(false);
  }, []);

  const handleBottomViewChange = useCallback((view: BottomView) => {
    setBottomView(view);
  }, []);

  const handleBottomViewReset = useCallback(() => {
    setBottomView('reports');
  }, []);

  const activePillId = activePills[activeApproach] || '';

  return (
    <div className="appraisal-layout">
      <AppraisalTopbar
        projectName={project.project_name || 'Untitled Project'}
        activeApproach={activeApproach}
        onApproachChange={handleApproachChange}
        onToggleLeft={handleToggleLeft}
      />
      <div className="appraisal-body">
        <AppraisalLeftPanel
          projectId={project.project_id}
          projectName={project.project_name || 'Untitled Project'}
          collapsed={leftCollapsed}
        />
        <AppraisalChatPanel
          projectId={project.project_id}
          activeApproach={activeApproach}
        />
        <AppraisalRightPanel
          activeApproach={activeApproach}
          activePill={activePillId}
          onPillChange={handlePillChange}
          detailOpen={detailOpen}
          detailId={detailId}
          detailLabel={detailLabel}
          onOpenDetail={handleOpenDetail}
          onCloseDetail={handleCloseDetail}
          bottomView={bottomView}
          onBottomViewChange={handleBottomViewChange}
          onBottomViewReset={handleBottomViewReset}
        />
      </div>
    </div>
  );
}
