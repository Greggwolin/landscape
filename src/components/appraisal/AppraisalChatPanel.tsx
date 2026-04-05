/**
 * AppraisalChatPanel
 *
 * Center panel wrapping the existing Landscaper chat components.
 * LandscaperChat owns the full UI including header, thread management,
 * and conversation — no custom header overlay.
 *
 * @version 1.2
 * @created 2026-04-04
 * @updated 2026-04-05 — Removed custom chat header; LandscaperChat renders its own
 */

'use client';

import React from 'react';
import type { ApproachId } from './appraisal.types';
import { LandscaperChat } from '@/components/landscaper/LandscaperChat';

interface AppraisalChatPanelProps {
  projectId: number;
  activeApproach: ApproachId;
}

export function AppraisalChatPanel({ projectId, activeApproach }: AppraisalChatPanelProps) {
  return (
    <div className="appraisal-center">
      <LandscaperChat
        projectId={projectId}
        activeTab={activeApproach}
        isExpanded={true}
      />
    </div>
  );
}
