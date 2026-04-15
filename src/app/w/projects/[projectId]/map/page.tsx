'use client';

import { RightContentPanel } from '@/components/wrapper/RightContentPanel';
import { MapTab } from '@/components/map-tab/MapTab';
import { useWrapperProject } from '@/contexts/WrapperProjectContext';

export default function WrapperMapPage() {
  const project = useWrapperProject();

  return (
    <RightContentPanel title="Map" subtitle={project.project_name}>
      <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex' }}>
        <MapTab project={project} />
      </div>
    </RightContentPanel>
  );
}
