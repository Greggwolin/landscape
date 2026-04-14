'use client';

import { PageShell } from '@/components/wrapper/PageShell';
import { MapTab } from '@/components/map-tab/MapTab';
import { useWrapperProject } from '@/contexts/WrapperProjectContext';

export default function WrapperMapPage() {
  const project = useWrapperProject();

  return (
    <PageShell
      title="Map"
      subtitle={project.project_name}
      showChat
      chatPageContext="map"
      projectId={project.project_id}
      hideHeader={true}
    >
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <MapTab project={project} />
      </div>
    </PageShell>
  );
}
