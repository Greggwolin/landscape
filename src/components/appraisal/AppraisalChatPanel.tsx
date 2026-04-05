/**
 * AppraisalChatPanel
 *
 * Center panel wrapping LandscaperChatThreaded — the full Landscaper UI
 * with header (branding, approach pill, +, notifications), thread list
 * (new/edit/delete), and conversation.
 *
 * Uses LandscaperChatThreaded (NOT LandscaperChat) because the threaded
 * version has built-in thread management matching the existing app.
 *
 * @version 1.3
 * @created 2026-04-04
 * @updated 2026-04-05 — Swapped LandscaperChat → LandscaperChatThreaded
 */

'use client';

import React from 'react';
import type { ApproachId } from './appraisal.types';
import { APPROACH_LABELS } from './appraisal.config';
import { LandscaperChatThreaded } from '@/components/landscaper/LandscaperChatThreaded';

interface AppraisalChatPanelProps {
  projectId: number;
  activeApproach: ApproachId;
}

export function AppraisalChatPanel({ projectId, activeApproach }: AppraisalChatPanelProps) {
  const contextLabel = APPROACH_LABELS[activeApproach] || 'General';

  return (
    <div className="appraisal-center">
      <LandscaperChatThreaded
        projectId={projectId}
        pageContext={activeApproach}
        contextPillLabel={contextLabel}
        isExpanded={true}
      />
    </div>
  );
}
