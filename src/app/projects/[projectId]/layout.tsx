import { ComplexityModeProvider } from '@/contexts/ComplexityModeContext';
import ProjectTileNavigation from '@/components/navigation/ProjectTileNavigation';

type Params = { projectId: string };

/**
 * Project Layout
 *
 * Wraps all project pages with:
 * - ComplexityModeProvider context
 * - ProjectTileNavigation (progressive tile navigation system)
 *
 * The tile navigation replaces the old ProjectContextBar with a more
 * intuitive tile-based interface that subdivides into granular sections.
 */
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
      {/* Progressive Tile Navigation */}
      <ProjectTileNavigation projectId={projectIdNum} />

      {/* Page Content */}
      <main style={{ overflow: 'visible' }}>
        {children}
      </main>
    </ComplexityModeProvider>
  );
}
