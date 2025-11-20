'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import ProjectSubNav from '@/components/project/ProjectSubNav';
import SalesContent from '@/components/sales/SalesContent';

/**
 * Project Sales & Absorption Page
 *
 * Phase 3: Moved under PROJECT tab as a subtab
 * Integrates existing SalesContent component with new Sale Transaction Details accordion
 */
export default function ProjectSalesPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  return (
    <>
      <ProjectSubNav projectId={projectId} />
      <SalesContent projectId={projectId} />
    </>
  );
}
