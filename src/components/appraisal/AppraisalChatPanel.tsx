/**
 * AppraisalChatPanel
 *
 * Center panel wrapping the existing Landscaper chat components.
 * Shows a small colored dot (matching topbar tab status) + thread title.
 *
 * @version 1.1
 * @created 2026-04-04
 * @updated 2026-04-05 — pill replaced with colored dot
 */

'use client';

import React from 'react';
import type { ApproachId } from './appraisal.types';
import { APPROACH_DOT_COLORS } from './appraisal.config';
import { LandscaperChat } from '@/components/landscaper/LandscaperChat';

interface AppraisalChatPanelProps {
  projectId: number;
  activeApproach: ApproachId;
}

export function AppraisalChatPanel({ projectId, activeApproach }: AppraisalChatPanelProps) {
  const dotColor = APPROACH_DOT_COLORS[activeApproach] || 'gray';

  return (
    <div className="appraisal-center">
      <div className="appraisal-chat-header">
        <div className={`ch-dot ${dotColor}`} />
        <div className="appraisal-ch-title">New conversation</div>
      </div>
      <div className="appraisal-chat-body">
        <LandscaperChat
          projectId={projectId}
          activeTab={activeApproach}
          isExpanded={true}
        />
      </div>
    </div>
  );
}
