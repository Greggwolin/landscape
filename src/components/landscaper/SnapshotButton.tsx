'use client';

import { CButton } from '@coreui/react';
import { useState } from 'react';
import { ScenarioSaveModal } from './ScenarioSaveModal';

const API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

interface SnapshotButtonProps {
  projectId: number | string;
  variant?: 'outline' | 'ghost';
  size?: 'sm' | 'lg';
  className?: string;
}

export function SnapshotButton({
  projectId,
  variant = 'outline',
  size = 'sm',
  className = '',
}: SnapshotButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleSave = async (data: {
    scenario_name: string;
    description: string;
    tags: string[];
  }) => {
    const res = await fetch(
      `${API_BASE}/api/landscaper/projects/${projectId}/scenarios/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, source: 'user_manual' }),
      },
    );
    const result = await res.json();
    if (!result.success) {
      throw new Error(result.error || 'Snapshot failed');
    }
  };

  return (
    <>
      <CButton
        color="info"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setModalOpen(true)}
      >
        Snapshot
      </CButton>

      <ScenarioSaveModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        defaultName={`Snapshot ${new Date().toLocaleDateString()}`}
      />
    </>
  );
}
