'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProjectContextShell } from '@/components/wrapper/ProjectContextShell';
import { WrapperChatProvider } from '@/contexts/WrapperChatContext';
import { ModalRegistryProvider, type ModalProject } from '@/contexts/ModalRegistryContext';
import { WrapperProjectProvider, type WrapperProject } from '@/contexts/WrapperProjectContext';
import { ProjectContentWrapper } from '@/components/wrapper/ProjectContentWrapper';
import '@/components/wrapper/modals'; // Side-effect: registers modal definitions

/**
 * Project-scoped layout for the wrapper UI.
 * Fetches project data and provides it via WrapperProjectContext to all sub-pages.
 * Also wraps with ProjectContextShell, WrapperChatProvider, and ModalRegistryProvider.
 */
export default function WrapperProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  const [project, setProject] = useState<WrapperProject>({
    project_id: projectId,
    project_name: '',
  });

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setProject({
            project_id: data.project_id ?? projectId,
            project_name: data.project_name ?? '',
            project_type_code: data.project_type_code ?? undefined,
            project_type: data.project_type ?? undefined,
            property_subtype: data.property_subtype ?? undefined,
          });
        }
      })
      .catch(() => {});
  }, [projectId]);

  // ModalProject is structurally compatible with WrapperProject
  const modalProject: ModalProject = project;

  return (
    <ProjectContextShell>
      <WrapperChatProvider>
        <WrapperProjectProvider project={project}>
          <ModalRegistryProvider project={modalProject}>
            <ProjectContentWrapper>
              {children}
            </ProjectContentWrapper>
          </ModalRegistryProvider>
        </WrapperProjectProvider>
      </WrapperChatProvider>
    </ProjectContextShell>
  );
}
