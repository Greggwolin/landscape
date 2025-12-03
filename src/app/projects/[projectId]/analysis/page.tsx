'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import FeasibilityTab from '../components/tabs/FeasibilityTab';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

/**
 * Feasibility / Valuation Page
 *
 * Main entry point for the Analysis navigation tile.
 * Displays the FeasibilityTab component with project data.
 */
export default function FeasibilityPage({ params }: PageProps) {
  const { projectId } = use(params);

  // Fetch project data
  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) throw new Error('Failed to fetch project');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="alert alert-danger" role="alert">
        Failed to load project data
      </div>
    );
  }

  return (
    <div style={{ paddingLeft: '1rem', paddingRight: '1rem' }}>
      <FeasibilityTab project={project} />
    </div>
  );
}
