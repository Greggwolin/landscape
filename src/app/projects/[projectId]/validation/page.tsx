'use client';

import { use } from 'react';
import { CContainer } from '@coreui/react';
import { ValidationReport } from '@/components/analysis/validation';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

/**
 * Validation Report Page
 *
 * Development debugging tool that displays project data in a format
 * mirroring the Peoria Lakes Excel "Project Costs" layout.
 *
 * Route: /projects/[id]/validation
 */
export default function ValidationPage({ params }: PageProps) {
  const { projectId } = use(params);
  const projectIdNum = parseInt(projectId, 10);

  if (isNaN(projectIdNum)) {
    return (
      <CContainer fluid className="py-4">
        <div className="alert alert-danger" role="alert">
          Invalid project ID
        </div>
      </CContainer>
    );
  }

  return (
    <CContainer fluid className="py-4">
      <ValidationReport projectId={projectIdNum} />
    </CContainer>
  );
}
