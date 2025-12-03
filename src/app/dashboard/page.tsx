'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CContainer, CCard, CCardHeader, CCardBody, CBadge } from '@coreui/react';
import { useProjectContext } from '@/app/components/ProjectProvider';
import NewProjectModal from '@/app/components/NewProjectModal';
import UserTile from '@/app/components/dashboard/UserTile';
import DashboardMap from '@/app/components/dashboard/DashboardMap';
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
  COMMERCIAL: 'Commercial',
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
  COMMERCIAL: 'info',
  OFFICE: 'warning',
  RETAIL: 'danger',
  INDUSTRIAL: 'secondary',
  HOTEL: 'dark',
  MIXED_USE: 'primary',
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
  COMMERCIAL: '#0dcaf0',
  OFFICE: '#ffc107',
  RETAIL: '#dc3545',
  INDUSTRIAL: '#6c757d',
  HOTEL: '#212529',
  MIXED_USE: '#0d6efd',
  SUBDIVISION: '#0dcaf0'
};

const PROPERTY_FILTERS: Array<{ key: PropertyFilterKey; label: string; codes: string[] }> = [
  { key: 'ALL', label: 'All Projects', codes: [] },
  { key: 'LAND', label: 'Land Development', codes: ['LAND', 'MPC', 'SUBDIVISION'] },
  { key: 'MF', label: 'Multifamily', codes: ['MF', 'MULTIFAMILY'] },
  { key: 'COMMERCIAL', label: 'Commercial', codes: ['COMMERCIAL', 'MXU', 'HTL'] },
  { key: 'RET', label: 'Retail', codes: ['RET'] },
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
  onProjectClick
}: {
  projects: ProjectSummary[];
  selectedProjectId: number | null;
  onProjectClick: (project: ProjectSummary) => void;
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
          <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--cui-secondary-color)' }}>
            Units
          </span>
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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
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
          <CCard
            key={filter.key}
          className="cursor-pointer transition-all"
          onClick={() => onFilterChange(filter.key)}
          style={{
            borderColor: isActive ? varColor : hexColor,
            boxShadow: isActive ? `0 0 0 2px ${hexColor}` : undefined,
            backgroundColor: isActive ? hexColor : inactiveBg,
            color: textColor
          }}
        >
            <CCardBody className="text-center py-3" style={{ backgroundColor: 'transparent', color: textColor }}>
              <div className="text-2xl font-semibold" style={{ color: textColor }}>
                {count}
              </div>
              <div className="text-xs mt-1" style={{ color: isActive ? '#f8f9fa' : 'var(--cui-secondary-color)' }}>
                {filter.label}
              </div>
            </CCardBody>
          </CCard>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const { projects, selectProject } = useProjectContext();
  const router = useRouter();
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<PropertyFilterKey>('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

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

  const handleLandscaperMessage = (message: string) => {
    // TODO: Implement AI integration with Landscaper
    console.log('Message to Landscaper:', message);
  };

  const handleFilterChange = (filter: PropertyFilterKey) => {
    if (filter === 'ALL') {
      setActiveFilter('ALL');
      return;
    }
    setActiveFilter((prev) => (prev === filter ? 'ALL' : filter));
  };

  return (
    <CContainer fluid className="p-4 space-y-2">
      <div className="sticky top-0 z-30 pb-1" style={{ backgroundColor: 'transparent' }}>
        <CCard className="shadow-sm" style={{ borderRadius: 12 }}>
          <CCardHeader style={{ backgroundColor: 'var(--cui-tertiary-bg)', borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-lg font-semibold">Projects / Project Locations</div>
              <LandscapeButton color="primary" size="sm" onClick={() => setIsNewProjectModalOpen(true)}>
                + New Project
              </LandscapeButton>
            </div>
          </CCardHeader>
          <CCardBody className="space-y-2">
            <ProjectCountTiles
              projects={projects}
              activeFilter={activeFilter}
              onFilterChange={handleFilterChange}
            />
          </CCardBody>
        </CCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(420px,520px)_1fr]">
        <div className="space-y-3">
          <ProjectAccordion
            projects={filteredProjects}
            selectedProjectId={selectedProjectId}
            onProjectClick={(project) => {
              setSelectedProjectId(project.project_id);
              handleProjectClick(project.project_id);
            }}
          />
          <UserTile username="Gregg" onSubmit={handleLandscaperMessage} />
        </div>

        <CCard className="h-full">
          <CCardHeader style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
            <span className="text-base font-semibold">Project Locations</span>
          </CCardHeader>
          <CCardBody style={{ height: '100%', minHeight: '620px' }}>
            <DashboardMap
              projects={filteredProjects}
              selectedProjectId={selectedProjectId}
              onProjectSelect={handleProjectSelect}
            />
          </CCardBody>
        </CCard>
      </div>

      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
      />
    </CContainer>
  );
}
