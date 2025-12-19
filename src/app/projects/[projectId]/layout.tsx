import { ComplexityModeProvider } from '@/contexts/ComplexityModeContext';
import { ProjectModeProvider } from '@/contexts/ProjectModeContext';
import ProjectContextBar from '@/app/components/ProjectContextBar';
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
        <div className="flex flex-col h-screen">
          {/* Full-width header */}
          <ProjectContextBar projectId={projectIdNum} />

          {/* 30/70 split content area */}
          <ProjectLayoutClient projectId={projectIdNum}>
            {children}
          </ProjectLayoutClient>
        </div>
      </ProjectModeProvider>
    </ComplexityModeProvider>
  );
}
