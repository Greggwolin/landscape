'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { RightContentPanel } from '@/components/wrapper/RightContentPanel';

/**
 * Platform Knowledge — cross-project knowledge library.
 *
 * Renders inside the right `<main>` panel of the /w/ shell, with the
 * Landscaper chat held by the center panel and unassigned by default
 * (no project context — the URL has no /projects/[id] segment, so
 * /w/layout.tsx derives projectId === undefined and the chat is scoped
 * to platform-wide queries).
 *
 * The Knowledge Library surface itself is the same component that used to
 * live inside the legacy AdminModal's "Landscaper" tab — promoted here to
 * first-class navigation so users can browse every document across every
 * project without ducking into a system administration modal.
 */
const KnowledgeLibraryPanel = dynamic(
  () => import('@/components/admin/knowledge-library/KnowledgeLibraryPanel'),
  { ssr: false }
);

export default function WrapperPlatformKnowledgePage() {
  return (
    <RightContentPanel
      title="Platform Knowledge"
      subtitle="Cross-project document library"
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '12px',
        }}
      >
        <KnowledgeLibraryPanel />
      </div>
    </RightContentPanel>
  );
}
