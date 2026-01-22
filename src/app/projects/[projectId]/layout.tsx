import { ComplexityModeProvider } from '@/contexts/ComplexityModeContext';
import { ProjectModeProvider } from '@/contexts/ProjectModeContext';
import { ProjectLayoutContent } from './ProjectLayoutContent';

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
        <ProjectLayoutContent projectId={projectIdNum}>
          {children}
        </ProjectLayoutContent>
      </ProjectModeProvider>
    </ComplexityModeProvider>
  );
}
