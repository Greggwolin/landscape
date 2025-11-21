import { ComplexityModeProvider } from '@/contexts/ComplexityModeContext';
import ProjectContextBar from '@/app/components/ProjectContextBar';
import { LifecycleTileNav } from '@/components/projects/LifecycleTileNav';

type Params = { projectId: string };

export default async function ProjectLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<Params>;
}) {
  const { projectId } = await params;

  // TODO: Read tierLevel from user settings/subscription
  // For now, default to 'analyst' tier
  const tierLevel: 'analyst' | 'pro' = 'analyst';

  return (
    <ComplexityModeProvider
      userId="demo_user"
      projectId={parseInt(projectId)}
    >
      <>
        <ProjectContextBar projectId={parseInt(projectId)} />
        <div className="container-fluid px-4">
          <LifecycleTileNav projectId={projectId} tierLevel={tierLevel} />
        </div>
        <main style={{ overflow: 'visible' }}>
          {children}
        </main>
      </>
    </ComplexityModeProvider>
  );
}
