'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { WrapperUIProvider } from '@/contexts/WrapperUIContext';
import { ProjectContextShell } from '@/components/wrapper/ProjectContextShell';
import { WrapperChatProvider } from '@/contexts/WrapperChatContext';
import { ModalRegistryProvider, type ModalProject } from '@/contexts/ModalRegistryContext';
import { WrapperProjectProvider, type WrapperProject } from '@/contexts/WrapperProjectContext';
import { LandscapeCommandSubscriber } from '@/components/wrapper/LandscapeCommandSubscriber';
import { getAuthHeaders } from '@/lib/authHeaders';
import '@/components/wrapper/modals'; // Side-effect: registers modal definitions
import '@/styles/wrapper.css'; // reused .wrapper-sidebar / .sb-* + chat/right-panel classes (no /w/ outer shell here)
import '@/styles/design.css'; // design-shell visual deltas — keep last

/**
 * Project-scoped layout for the isolated Design shell (/design/[projectId]).
 *
 * A visual restyle of the Studio shell (Stage A): identical provider stack and
 * component logic; only presentation changes, carried by design.css loaded
 * last. Mirrors /studio/[projectId]/layout.tsx exactly.
 *
 * Top-level route — does NOT inherit the /w/ WrapperLayout, so it owns its own
 * WrapperUIProvider (chat/artifact panel state) and the project-scoped provider
 * stack the reused CenterChatPanel + modal bridge need.
 *
 * Additive and isolated: classic /projects/[id], the /w/ shell, and /studio
 * are untouched.
 */
export default function DesignProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const projectId = parseInt(params.projectId as string, 10);

  const [project, setProject] = useState<WrapperProject>({
    project_id: projectId,
    project_name: '',
  });

  const fetchProject = useCallback(() => {
    fetch(`/api/projects/${projectId}`, { headers: getAuthHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setProject({
            project_id: data.project_id ?? projectId,
            project_name: data.project_name ?? '',
            project_type_code: data.project_type_code ?? undefined,
            project_type: data.project_type ?? undefined,
            property_subtype: data.property_subtype ?? undefined,
            // Location passthrough so the Map tab centers on the saved point
            // instead of auto-fitting to a zoomed-out world view.
            location_lat: data.location_lat ?? null,
            location_lon: data.location_lon ?? null,
            latitude: data.latitude ?? null,
            longitude: data.longitude ?? null,
            county: data.county ?? undefined,
            state: data.state ?? undefined,
            apn_primary: data.apn_primary ?? undefined,
          });
        }
      })
      .catch(() => {});
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // ModalProject is structurally compatible with WrapperProject.
  const modalProject: ModalProject = project;

  return (
    <WrapperUIProvider>
      <ProjectContextShell>
        <WrapperChatProvider>
          <WrapperProjectProvider project={project} onRefetch={fetchProject}>
            <ModalRegistryProvider project={modalProject}>
              {/* Bridges chat-panel command bus → project-scoped modal surfaces. */}
              <LandscapeCommandSubscriber />
              {children}
            </ModalRegistryProvider>
          </WrapperProjectProvider>
        </WrapperChatProvider>
      </ProjectContextShell>
    </WrapperUIProvider>
  );
}
