"use client";

import React from "react";
import { useProjectContext } from "@/app/components/ProjectProvider";

interface StudioPageFrameProps {
  projectId: number;
  children: (project: any) => React.ReactNode;
}

export default function StudioPageFrame({ projectId, children }: StudioPageFrameProps) {
  const { projects, activeProject, isLoading } = useProjectContext();
  const project = projects.find((item) => item.project_id === projectId) || activeProject;

  if (isLoading) {
    return <div className="studio-page-state">Loading project...</div>;
  }

  if (!project) {
    return <div className="studio-page-state">Project not found.</div>;
  }

  return <div className="studio-page-content">{children(project)}</div>;
}
