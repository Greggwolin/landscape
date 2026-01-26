'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CContainer, CCard, CCardHeader, CCardBody, CBadge } from '@coreui/react';
import { useProjectContext } from '@/app/components/ProjectProvider';
import NewProjectModal from '@/app/components/NewProjectModal';
import DashboardMap from '@/app/components/dashboard/DashboardMap';
import TriageModal from '@/app/components/dashboard/TriageModal';
import { ActivityFeed } from '@/components/landscaper/ActivityFeed';
import { LandscaperChat } from '@/components/landscaper/LandscaperChat';
import { LandscapeButton } from '@/components/ui/landscape';
import type { ProjectSummary } from '@/app/components/ProjectProvider';

type PropertyFilterKey = 'ALL' | 'LAND' | 'MF' | 'COMMERCIAL' | 'RET' | 'OFF' | 'IND';

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  LAND: 'Land Development',
  MF: 'Multifamily',
  OFF: 'Office',
  RET: 'Retail',
  IND: 'Industrial',
  HTL: 'Hotel',
  MXU: 'Mixed-Use',
  MPC: 'Master Planned Community',
  MULTIFAMILY: 'Multifamily',
  OFFICE: 'Office',
  RETAIL: 'Retail',
  INDUSTRIAL: 'Industrial',
  HOTEL: 'Hotel',
  MIXED_USE: 'Mixed Use',
  SUBDIVISION: 'Subdivision'
};

const PROPERTY_TYPE_COLORS: Record<string, string> = {
  LAND: 'primary',
  MF: 'success',
  OFF: 'warning',
  RET: 'danger',
  IND: 'secondary',
  HTL: 'dark',
  MXU: 'info',
  MPC: 'primary',
  MULTIFAMILY: 'success',
  OFFICE: 'warning',
  RETAIL: 'danger',
  INDUSTRIAL: 'secondary',
  HOTEL: 'dark',
  MIXED_USE: 'info',
  SUBDIVISION: 'info'
};

const PROPERTY_TYPE_COLOR_HEX: Record<string, string> = {
  LAND: '#0d6efd',
  MF: '#198754',
  OFF: '#ffc107',
  RET: '#dc3545',
  IND: '#6c757d',
  HTL: '#212529',
  MXU: '#0dcaf0',
  MPC: '#0d6efd',
  MULTIFAMILY: '#198754',
  OFFICE: '#ffc107',
  RETAIL: '#dc3545',
  INDUSTRIAL: '#6c757d',
  HOTEL: '#212529',
  MIXED_USE: '#0dcaf0',
  SUBDIVISION: '#0dcaf0'
};

const PROPERTY_FILTERS: Array<{ key: PropertyFilterKey; label: string; codes: string[] }> = [
  { key: 'ALL', label: 'All Projects', codes: [] },
  { key: 'LAND', label: 'Land Development', codes: ['LAND', 'MPC', 'SUBDIVISION'] },
  { key: 'MF', label: 'Multifamily', codes: ['MF', 'MULTIFAMILY'] },
  { key: 'COMMERCIAL', label: 'Commercial', codes: ['MXU', 'HTL', 'MIXED_USE', 'HOTEL'] },
  { key: 'RET', label: 'Retail', codes: ['RET', 'RETAIL'] },
  { key: 'OFF', label: 'Office', codes: ['OFF', 'OFFICE'] },
  { key: 'IND', label: 'Industrial', codes: ['IND', 'INDUSTRIAL'] }
];

const getFilterColors = (filterKey: PropertyFilterKey) => {
  if (filterKey === 'ALL') {
    return { varColor: 'var(--cui-primary)', hexColor: '#0d6efd' };
  }
  const filter = PROPERTY_FILTERS.find((f) => f.key === filterKey);
  const colorKey = filter?.codes[0] ? PROPERTY_TYPE_COLORS[filter.codes[0]] : 'primary';
  const hexColor = filter?.codes[0]
    ? PROPERTY_TYPE_COLOR_HEX[filter.codes[0]] || '#0d6efd'
    : '#0d6efd';
  return { varColor: `var(--cui-${colorKey})`, hexColor };
};

const toTypeCode = (project: ProjectSummary) =>
  project.project_type_code?.toUpperCase() ||
  project.project_type?.toUpperCase() ||
  project.property_subtype?.toUpperCase() ||
  null;

const formatLocation = (project: ProjectSummary) => {
  if (project.location) return project.location;
  if (project.location_description) return project.location_description;
  if (project.jurisdiction_city && project.jurisdiction_state) {
    return `${project.jurisdiction_city}, ${project.jurisdiction_state}`;
  }
  return project.jurisdiction_county || 'Location TBD';
};

const formatUnits = (project: ProjectSummary) => {
  const typeCode = toTypeCode(project);
  const units = project.total_residential_units ?? null;
  const acreage = project.acreage ?? project.acres_gross ?? null;
  const commercialSqft = project.total_commercial_sqft ?? null;

  if (typeCode === 'LAND' || typeCode === 'MPC' || typeCode === 'SUBDIVISION') {
    if (units && units > 0) return `${units.toLocaleString()}`;
    if (acreage) return `${acreage} Acres`;
  }

  if (typeCode === 'MF' || typeCode === 'MULTIFAMILY') {
    if (units && units > 0) return `${units.toLocaleString()}`;
  }

  if (typeCode && ['COMMERCIAL', 'MXU', 'RET', 'OFF', 'OFFICE', 'IND', 'INDUSTRIAL'].includes(typeCode)) {
    if (commercialSqft && commercialSqft > 0) return `${commercialSqft.toLocaleString()} SF`;
  }

  return 'TBD';
};

const matchesFilter = (project: ProjectSummary, filterKey: PropertyFilterKey) => {
  if (filterKey === 'ALL') return true;
  const code = toTypeCode(project);
  const filter = PROPERTY_FILTERS.find((f) => f.key === filterKey);
  return filter ? filter.codes.includes(code ?? '') : true;
};

const getTypeLabel = (project: ProjectSummary) => {
  const typeCode = toTypeCode(project);
  if (typeCode && PROPERTY_TYPE_LABELS[typeCode]) return PROPERTY_TYPE_LABELS[typeCode];
  return typeCode || 'Not specified';
};

const getTypeColor = (project: ProjectSummary) => {
  const typeCode = toTypeCode(project);
  if (typeCode && PROPERTY_TYPE_COLORS[typeCode]) return PROPERTY_TYPE_COLORS[typeCode];
  return 'secondary';
};

function ProjectAccordion({
  projects,
  selectedProjectId,
  onProjectClick,
  onNewProject
}: {
  projects: ProjectSummary[];
  selectedProjectId: number | null;
  onProjectClick: (project: ProjectSummary) => void;
  onNewProject: () => void;
}) {
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  useEffect(() => {
    if (!selectedProjectId) return;
    const node = itemRefs.current.get(selectedProjectId);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedProjectId]);

  return (
    <CCard>
      <CCardHeader style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold">Projects</span>
          <LandscapeButton color="primary" size="sm" onClick={onNewProject}>
            + New Project
          </LandscapeButton>
        </div>
      </CCardHeader>
      <CCardBody className="p-0">
        <div className="divide-y" style={{ borderColor: 'var(--cui-border-color)' }}>
          {projects.map((project) => {
            const isSelected = selectedProjectId === project.project_id;
            const isHovered = hoveredId === project.project_id;
            return (
              <button
                key={project.project_id}
                type="button"
                ref={(node) => node && itemRefs.current.set(project.project_id, node)}
                onClick={() => onProjectClick(project)}
                onMouseEnter={() => setHoveredId(project.project_id)}
                onMouseLeave={() => setHoveredId(null)}
                className="w-full text-left transition-colors"
                style={{
                  padding: '12px 16px',
                  backgroundColor: isSelected
                    ? 'var(--cui-tertiary-bg)'
                    : isHovered
                      ? 'var(--cui-card-cap-bg)'
                      : 'transparent',
                  borderLeft: isSelected ? '3px solid var(--cui-primary)' : '3px solid transparent'
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold leading-tight">{project.project_name}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-sm">
                      <CBadge color={getTypeColor(project)}>{getTypeLabel(project)}</CBadge>
                      <span style={{ color: 'var(--cui-secondary-color)' }}>
                        {formatLocation(project)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--cui-secondary-color)' }}>
                      Units
                    </div>
                    <div className="font-semibold text-base">{formatUnits(project)}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {projects.length === 0 && (
          <div className="text-center py-6">
            <p className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
              No projects found for this filter.
            </p>
          </div>
        )}
      </CCardBody>
    </CCard>
  );
}

function ProjectCountTiles({
  projects,
  activeFilter,
  onFilterChange
}: {
  projects: ProjectSummary[];
  activeFilter: PropertyFilterKey;
  onFilterChange: (filter: PropertyFilterKey) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {PROPERTY_FILTERS.map((filter) => {
        const isActive = activeFilter === filter.key || (filter.key === 'ALL' && activeFilter === 'ALL');
        const count =
          filter.key === 'ALL'
            ? projects.length
            : projects.filter((project) => matchesFilter(project, filter.key)).length;
        const { varColor, hexColor } = getFilterColors(filter.key);
        const textColor = isActive ? '#ffffff' : hexColor;
        const inactiveBg = `${hexColor}1a`; // ~10% opacity on hex

        return (
          <button
            key={filter.key}
            type="button"
            className="cursor-pointer transition-all rounded-md px-2 py-1.5 text-center"
            onClick={() => onFilterChange(filter.key)}
            style={{
              border: `1px solid ${isActive ? varColor : hexColor}`,
              boxShadow: isActive ? `0 0 0 1px ${hexColor}` : undefined,
              backgroundColor: isActive ? hexColor : inactiveBg,
              color: textColor
            }}
          >
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-sm font-semibold" style={{ color: textColor }}>
                {count}
              </span>
              <span className="text-xs truncate" style={{ color: isActive ? '#f8f9fa' : 'var(--cui-secondary-color)' }}>
                {filter.label}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const { projects, selectProject } = useProjectContext();
  const router = useRouter();
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isTriageModalOpen, setIsTriageModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<PropertyFilterKey>('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const sortedProjects = useMemo(() => {
    // Get last accessed timestamps from localStorage
    const getLastAccessed = (projectId: number): number => {
      if (typeof window === 'undefined') return 0;
      const key = `project_${projectId}_last_accessed`;
      const timestamp = localStorage.getItem(key);
      return timestamp ? parseInt(timestamp, 10) : 0;
    };

    return [...projects].sort((a, b) => {
      const aAccessed = getLastAccessed(a.project_id);
      const bAccessed = getLastAccessed(b.project_id);

      // If both have been accessed, sort by most recent access
      if (aAccessed && bAccessed) {
        return bAccessed - aAccessed;
      }

      // If only one has been accessed, it goes first
      if (aAccessed) return -1;
      if (bAccessed) return 1;

      // If neither has been accessed, fall back to updated_at
      const aDate = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const bDate = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return bDate - aDate;
    });
  }, [projects]);

  const filteredProjects = useMemo(
    () => sortedProjects.filter((project) => matchesFilter(project, activeFilter)),
    [sortedProjects, activeFilter]
  );

  useEffect(() => {
    if (selectedProjectId && !filteredProjects.some((p) => p.project_id === selectedProjectId)) {
      setSelectedProjectId(null);
    }
  }, [filteredProjects, selectedProjectId]);

  const handleProjectClick = (projectId: number) => {
    const project = projects.find((p) => p.project_id === projectId);
    if (project) {
      // Record access timestamp in localStorage
      const key = `project_${projectId}_last_accessed`;
      localStorage.setItem(key, Date.now().toString());

      selectProject(projectId);
      router.push(`/projects/${projectId}`);
    }
  };

  const handleProjectSelect = (projectId: number) => {
    setSelectedProjectId(projectId);
  };

  const handleFilterChange = (filter: PropertyFilterKey) => {
    if (filter === 'ALL') {
      setActiveFilter('ALL');
      return;
    }
    setActiveFilter((prev) => (prev === filter ? 'ALL' : filter));
  };

  // Clear pending files when modal closes
  const handleModalClose = () => {
    setIsNewProjectModalOpen(false);
    setPendingFiles([]);
  };

  // Triage modal handlers
  const handleTriageClose = () => {
    setIsTriageModalOpen(false);
    setPendingFiles([]);
  };

  const handleTriageNewProject = (files: File[]) => {
    // First set the files, then open modal in next tick to ensure state is updated
    setPendingFiles(files);
    setIsTriageModalOpen(false);
    // Use setTimeout to ensure pendingFiles state is committed before modal checks it
    setTimeout(() => {
      setIsNewProjectModalOpen(true);
    }, 0);
  };

  const handleTriageAssociate = async (projectId: number, files: File[]) => {
    // Upload files to DMS for the existing project
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('project_id', projectId.toString());

        await fetch('/api/dms/upload', {
          method: 'POST',
          body: formData
        });
      }

      // Navigate to the project
      selectProject(projectId);
      router.push(`/projects/${projectId}`);
    } catch (error) {
      console.error('Failed to associate files with project:', error);
    }
  };

  const handleTriageKnowledge = async (files: File[]) => {
    // Upload to knowledge store without project association
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('knowledge_only', 'true');

        await fetch('/api/dms/upload', {
          method: 'POST',
          body: formData
        });
      }
      // Could show a toast notification here
      console.log('Files added to knowledge store');
    } catch (error) {
      console.error('Failed to add files to knowledge store:', error);
    }
  };

  const [isActivityExpanded, setActivityExpanded] = useState(true);

  return (
    <CContainer fluid className="space-y-2" style={{ padding: '0.25rem 0.5rem 0.5rem 0.25rem' }}>
      {/* Three-column layout: Activity+Landscaper | Projects | Map with Filters */}
      <div className="flex flex-1 min-h-0 gap-2" style={{ alignItems: 'flex-start' }}>
        {/* Left Column: Activity Feed (top) + Landscaper Chat (bottom) */}
        <div
          className="flex-shrink-0 sticky top-0 flex flex-col gap-1"
          style={{
            width: '30%',
            minWidth: '350px',
            maxWidth: '450px',
            height: 'calc(100vh - 100px)',
          }}
        >
          {/* Landscaper Chat - Top */}
          <CCard
            className="flex-1 shadow-lg overflow-hidden"
            style={{
              minHeight: '200px',
            }}
          >
            <LandscaperChat
              projectId={0}
              activeTab="dashboard"
              isExpanded={!isActivityExpanded}
              onToggleExpand={() => setActivityExpanded(!isActivityExpanded)}
            />
          </CCard>

          {/* Activity Feed - Bottom */}
          <CCard
            className="shadow-lg overflow-hidden"
            style={{
              height: isActivityExpanded ? '45%' : '48px',
              minHeight: isActivityExpanded ? '200px' : '48px',
              transition: 'height 0.2s ease',
            }}
          >
            <ActivityFeed
              projectId={0}
              isExpanded={isActivityExpanded}
              onToggle={() => setActivityExpanded(!isActivityExpanded)}
            />
          </CCard>
        </div>

        {/* Middle Column: Projects List */}
        <div
          className="flex-shrink-0"
          style={{
            width: 'minmax(380px, 480px)',
            minWidth: '380px',
            maxWidth: '480px',
          }}
        >
          <ProjectAccordion
            projects={filteredProjects}
            selectedProjectId={selectedProjectId}
            onProjectClick={(project) => {
              setSelectedProjectId(project.project_id);
              handleProjectClick(project.project_id);
            }}
            onNewProject={() => setIsNewProjectModalOpen(true)}
          />
        </div>

        {/* Right Column: Filter Tiles + Map */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {/* Filter Tiles */}
          <div className="px-1">
            <ProjectCountTiles
              projects={projects}
              activeFilter={activeFilter}
              onFilterChange={handleFilterChange}
            />
          </div>

          {/* Map */}
          <CCard style={{ height: 'calc(100vh - 180px)', minHeight: '400px' }}>
            <CCardBody style={{ height: '100%', padding: 0 }}>
              <DashboardMap
                projects={filteredProjects}
                selectedProjectId={selectedProjectId}
                onProjectSelect={handleProjectSelect}
              />
            </CCardBody>
          </CCard>
        </div>
      </div>

      <TriageModal
        isOpen={isTriageModalOpen}
        onClose={handleTriageClose}
        files={pendingFiles}
        projects={projects}
        onNewProject={handleTriageNewProject}
        onAssociateWithProject={handleTriageAssociate}
        onAddToKnowledge={handleTriageKnowledge}
      />

      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={handleModalClose}
        initialFiles={pendingFiles.length > 0 ? pendingFiles : undefined}
      />
    </CContainer>
  );
}
