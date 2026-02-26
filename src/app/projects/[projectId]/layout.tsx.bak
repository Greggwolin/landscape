/**
 * Project Layout
 *
 * Layout hierarchy:
 * 1. ActiveProjectBar (full width, sticky below top nav)
 * 2. ProjectLayoutClient (two-column resizable):
 *    - Left: Landscaper panel (collapsible)
 *    - Right: Folder tabs + content area
 *
 * @version 3.0
 * @updated 2026-02-08 - ActiveProjectBar promoted to full width above split layout
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
          {/* ActiveProjectBar is rendered inside ProjectLayoutClient at full width */}
          <ProjectLayoutClient projectId={projectIdNum}>
            {children}
          </ProjectLayoutClient>
        </div>
      </ProjectModeProvider>
    </ComplexityModeProvider>
  );
}
