'use client';

import { RightContentPanel } from '@/components/wrapper/RightContentPanel';
import { MapTab } from '@/components/map-tab/MapTab';
import type { Project } from '@/components/map-tab/types';
import { useWrapperProject } from '@/contexts/WrapperProjectContext';

export default function WrapperMapPage() {
  const project = useWrapperProject();

  // Adapt WrapperProject to the MapTab Project shape. Project carries an
  // index signature ([key: string]: unknown) that WrapperProject lacks, so
  // spread into a fresh object literal to satisfy the structural target.
  const mapProject: Project = { ...project };

  return (
    <RightContentPanel title="Map" subtitle={project.project_name}>
      <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex' }}>
        <MapTab project={mapProject} />
      </div>
    </RightContentPanel>
  );
}
