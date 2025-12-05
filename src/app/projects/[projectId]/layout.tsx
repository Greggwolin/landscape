import { ComplexityModeProvider } from '@/contexts/ComplexityModeContext';
import { ProjectModeProvider } from '@/contexts/ProjectModeContext';
import ProjectContextBar from '@/app/components/ProjectContextBar';

type Params = { projectId: string };

export default async function ProjectLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<Params>;
}) {
  const { projectId } = await params;

  return (
    <ComplexityModeProvider
      userId="demo_user"
      projectId={parseInt(projectId)}
    >
      <ProjectModeProvider projectId={parseInt(projectId)}>
        <div className="app-page">
          <ProjectContextBar projectId={parseInt(projectId)} />
          <main className="app-content" style={{ overflow: 'visible' }}>
            {children}
          </main>
        </div>
      </ProjectModeProvider>
    </ComplexityModeProvider>
  );
}
