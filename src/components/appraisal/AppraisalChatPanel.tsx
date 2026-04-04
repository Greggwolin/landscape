/**
 * AppraisalChatPanel
 *
 * Center panel wrapping the existing Landscaper chat components.
 * Always present as the primary interface.
 *
 * @version 1.0
 * @created 2026-04-04
 */

'use client';

import React from 'react';
import { APPROACH_LABELS } from './appraisal.config';
import type { ApproachId } from './appraisal.types';
import { LandscaperChat } from '@/components/landscaper/LandscaperChat';

interface AppraisalChatPanelProps {
  projectId: number;
  activeApproach: ApproachId;
}

export function AppraisalChatPanel({ projectId, activeApproach }: AppraisalChatPanelProps) {
  const approachLabel = APPROACH_LABELS[activeApproach] || 'General';

  return (
    <div className="appraisal-center">
      <div className="appraisal-chat-header">
        <div className="appraisal-ch-title">Landscaper</div>
        <div className="appraisal-ch-approach">{approachLabel}</div>
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
