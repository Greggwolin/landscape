/**
 * Project Layout
 *
 * Layout hierarchy:
 * Two-column layout:
 *   - Left: Project selector card + Landscaper panel
 *   - Right: Folder tabs + content area
 *
 * The folder tabs REPLACE the colored tile navigation.
 *
 * @version 2.1
 * @updated 2026-01-23 - Moved project selector into left column above Landscaper
 */

import { ComplexityModeProvider } from '@/contexts/ComplexityModeContext';
import { ProjectModeProvider } from '@/contexts/ProjectModeContext';
import { ProjectLayoutClient } from './ProjectLayoutClient';

type Params = { projectId: string };

export default async function ProjectLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<Params>;
}) {
  const { projectId } = await params;
  const projectIdNum = parseInt(projectId);

  return (
    <ComplexityModeProvider
      userId="demo_user"
      projectId={projectIdNum}
    >
      <ProjectModeProvider projectId={projectIdNum}>
        <div className="app-page flex-1 min-h-0">
          {/* Two-column layout: Project Selector + Landscaper | Folder Tabs/Content */}
          <ProjectLayoutClient projectId={projectIdNum}>
            {children}
          </ProjectLayoutClient>
        </div>
      </ProjectModeProvider>
    </ComplexityModeProvider>
  );
}
