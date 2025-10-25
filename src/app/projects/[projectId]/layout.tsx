import { ComplexityModeProvider } from '@/contexts/ComplexityModeContext';

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
      {children}
    </ComplexityModeProvider>
  );
}
