'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import ProjectContextBar from '@/app/components/ProjectContextBar';
import LandscaperChatModal from '@/app/components/LandscaperChatModal';
import { CButton } from '@coreui/react';

/**
 * Landscaper AI Page
 *
 * Phase 1: Opens the Landscaper AI modal
 * Future phases may add project-specific context and history
 */
export default function LandscaperPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);
  const [isLandscaperOpen, setLandscaperOpen] = useState(true);

  return (
    <>
      <ProjectContextBar projectId={projectId} />
      <div className="container py-4">
        <div className="row">
          <div className="col-12">
            <h1 className="h3 mb-4">Landscaper AI Assistant</h1>
            <p className="text-muted mb-4">
              Your AI assistant for project analysis, insights, and recommendations.
            </p>
            <CButton
              color="primary"
              onClick={() => setLandscaperOpen(true)}
            >
              Open Landscaper
            </CButton>
          </div>
        </div>
      </div>

      {/* Landscaper AI Modal */}
      <LandscaperChatModal
        isOpen={isLandscaperOpen}
        onClose={() => setLandscaperOpen(false)}
        projectId={projectId}
      />
    </>
  );
}
