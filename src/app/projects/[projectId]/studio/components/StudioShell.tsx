"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { CCard, CCardHeader, CCardBody } from "@coreui/react";
import { useProjectContext } from "@/app/components/ProjectProvider";
import TileGrid from "./TileGrid";
import LandscaperPanel from "./LandscaperPanel";
import ActivityFeed from "./ActivityFeed";
import FlyoutShell from "./FlyoutShell";
import { FlyoutProvider } from "./FlyoutContext";
import { StudioTile } from "@/lib/utils/studioTiles";

interface StudioShellProps {
  projectId: number;
  tiles: StudioTile[];
  currentProject: any;
  children: React.ReactNode;
}

export default function StudioShell({
  projectId,
  tiles,
  currentProject,
  children,
}: StudioShellProps) {
  const router = useRouter();
  const { projects, selectProject } = useProjectContext();

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProjectId = Number(e.target.value);
    if (!Number.isNaN(newProjectId)) {
      selectProject(newProjectId);
      router.push(`/projects/${newProjectId}/studio`);
    }
  };

  return (
    <FlyoutProvider projectId={projectId}>
      <div className="studio-layout">
        <aside className="studio-sidebar">
          <CCard className="h-full" style={{ margin: 0 }}>
            <CCardHeader
              style={{
                padding: '0.75rem 1rem',
                minHeight: '52px',
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--cui-card-cap-bg)',
              }}
            >
              <span className="fw-semibold" style={{ fontSize: '1rem' }}>Project</span>
            </CCardHeader>
            <CCardBody style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div className="studio-project-selector">
                <select
                  className="form-select form-select-sm"
                  value={projectId}
                  onChange={handleProjectChange}
                  style={{
                    backgroundColor: 'var(--cui-tertiary-bg)',
                    borderColor: 'var(--cui-border-color)',
                    color: 'var(--cui-body-color)',
                  }}
                >
                  {projects.map((project) => (
                    <option key={project.project_id} value={project.project_id}>
                      {project.project_id} - {project.project_name}
                    </option>
                  ))}
                </select>
                {currentProject?.analysis_type ? (
                  <div className="studio-project-meta" style={{ marginTop: '0.5rem' }}>
                    <span
                      className="studio-project-type"
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--cui-secondary-color)',
                      }}
                    >
                      Scope: {currentProject.analysis_type.charAt(0).toUpperCase() + currentProject.analysis_type.slice(1).toLowerCase()}
                    </span>
                  </div>
                ) : null}
              </div>

              <TileGrid tiles={tiles} projectId={projectId} />

              <LandscaperPanel
                projectId={projectId}
                contextLabel={currentProject?.project_name || "Studio"}
                showActivity={false}
              />
              <ActivityFeed projectId={projectId} />
            </CCardBody>
          </CCard>
        </aside>

        <main className="studio-main">{children}</main>

        <FlyoutShell />
      </div>
    </FlyoutProvider>
  );
}
