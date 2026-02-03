'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react';
import { SemanticButton } from '@/components/ui/landscape';
import { useProjectContext } from '@/app/components/ProjectProvider';

interface PromoteModalProps {
  visible: boolean;
  onClose: () => void;
  projectId: number;
}

export default function PromoteModal({ visible, onClose, projectId }: PromoteModalProps) {
  const router = useRouter();
  const { refreshProjects } = useProjectContext();
  const [isPromoting, setIsPromoting] = useState(false);

  const handlePromote = async () => {
    setIsPromoting(true);

    try {
      // Call API to update analysis_mode
      const response = await fetch(`/api/projects/${projectId}/promote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to promote project');
      }

      // Refresh projects data
      refreshProjects();

      // Close modal and redirect
      onClose();
      router.push(`/projects/${projectId}`);

    } catch (error) {
      console.error('Error promoting project:', error);
      // For UI shell, we'll still proceed even if API fails
      onClose();
      router.push(`/projects/${projectId}`);
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <CModal visible={visible} onClose={onClose} alignment="center">
      <CModalHeader closeButton>
        <CModalTitle>Promote to Developer Mode?</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <p style={{ color: 'var(--cui-body-color)' }}>
          This will unlock the full project tabs:
        </p>
        <ul style={{ color: 'var(--cui-body-color)' }}>
          <li>Acquisition</li>
          <li>Planning</li>
          <li>Development (Budget)</li>
          <li>Sales</li>
          <li>Analysis</li>
        </ul>
        <p style={{ color: 'var(--cui-body-color)' }}>
          Your Napkin assumptions will be preserved as reference benchmarks in the detailed tabs.
        </p>
        <p
          className="small mt-3 mb-0"
          style={{ color: 'var(--cui-warning)' }}
        >
          This action cannot be undone.
        </p>
      </CModalBody>
      <CModalFooter>
        <SemanticButton intent="secondary-action" variant="outline" onClick={onClose}>
          Cancel
        </SemanticButton>
        <SemanticButton
          intent="primary-action"
          onClick={handlePromote}
          disabled={isPromoting}
        >
          {isPromoting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Promoting...
            </>
          ) : (
            'Promote to Developer'
          )}
        </SemanticButton>
      </CModalFooter>
    </CModal>
  );
}
