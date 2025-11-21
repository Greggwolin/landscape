import { ComplexityModeProvider } from '@/contexts/ComplexityModeContext';
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
      <>
        <ProjectContextBar projectId={parseInt(projectId)} />
        <main style={{ overflow: 'visible' }}>
          {children}
        </main>
      </>
    </ComplexityModeProvider>
  );
}
