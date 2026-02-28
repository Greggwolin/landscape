'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CContainer, CCard, CCardHeader, CCardBody } from '@coreui/react';
import { useProjectContext } from '@/app/components/ProjectProvider';
import NewProjectModal from '@/app/components/NewProjectModal';
import DashboardMap from '@/app/components/dashboard/DashboardMap';
import TriageModal from '@/app/components/dashboard/TriageModal';
import { ActivityFeed } from '@/components/landscaper/ActivityFeed';
import { LandscaperChat } from '@/components/landscaper/LandscaperChat';
import { LandscapeButton, PropertyTypeBadge } from '@/components/ui/landscape';
import type { ProjectSummary } from '@/app/components/ProjectProvider';
import { CollapsedLandscaperStrip } from '@/components/landscaper/CollapsedLandscaperStrip';
import DeleteProjectDialog from '@/components/projects/DeleteProjectDialog';
import type { DeleteProjectResult } from '@/hooks/useDeleteProject';
import {
  type CanonicalPropertyTypeCode,
  getPropertyTypeLabel,
  getPropertyTypeTokenRef,
  resolveCanonicalPropertyTypeCode,
} from '@/config/propertyTypeTokens';

type PropertyFilterKey = 'ALL' | 'LAND' | 'MF' | 'COMMERCIAL' | 'RET' | 'OFF' | 'IND';

const PROPERTY_FILTERS: Array<{ key: PropertyFilterKey; label: string; codes: string[] }> = [
  { key: 'ALL', label: 'All Projects', codes: [] },
  { key: 'LAND', label: 'Land Development', codes: ['LAND', 'MPC', 'SUBDIVISION'] },
  { key: 'MF', label: 'Multifamily', codes: ['MF', 'MULTIFAMILY'] },
  { key: 'COMMERCIAL', label: 'Commercial', codes: ['MXU', 'HTL', 'MIXED_USE', 'HOTEL'] },
  { key: 'RET', label: 'Retail', codes: ['RET', 'RETAIL'] },
  { key: 'OFF', label: 'Office', codes: ['OFF', 'OFFICE'] },
  { key: 'IND', label: 'Industrial', codes: ['IND', 'INDUSTRIAL'] }
];

const FILTER_COLOR_BY_KEY: Record<Exclude<PropertyFilterKey, 'ALL'>, CanonicalPropertyTypeCode> = {
  LAND: 'LAND',
  MF: 'MF',
  COMMERCIAL: 'MXU',
  RET: 'RET',
  OFF: 'OFF',
  IND: 'IND',
};

const getFilterColors = (filterKey: PropertyFilterKey) => {
  if (filterKey === 'ALL') {
    return { bgVar: 'var(--cui-primary)', textVar: 'var(--text-inverse)' };
  }
  const tokenRef = getPropertyTypeTokenRef(FILTER_COLOR_BY_KEY[filterKey]);
  return {
    bgVar: tokenRef?.bgVar || 'var(--cui-primary)',
    textVar: tokenRef?.textVar || 'var(--text-inverse)',
  };
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
  const toNumber = (value: unknown) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };
  const countTypes = new Set(['units', 'lots', 'suites', 'keys', 'pads', 'rooms', 'other']);

  const canonicalCode = resolveCanonicalPropertyTypeCode(toTypeCode(project));
  const primaryCountType = project.primary_count_type?.toLowerCase() ?? '';
  const primaryCountRaw = toNumber(project.primary_count);
  const primaryCount = countTypes.has(primaryCountType) ? primaryCountRaw : null;
  const units = toNumber(project.total_residential_units) ?? primaryCount;
  const primaryArea = toNumber(project.primary_area);
  const primaryAreaType = project.primary_area_type?.toLowerCase() ?? null;
  const commercialSqft =
    toNumber(project.total_commercial_sqft) ??
    (primaryAreaType?.includes('sf') ? primaryArea : null) ??
    toNumber(project.gross_sf) ??
    null;

  if (canonicalCode === 'LAND') {
    const acreage =
      toNumber(project.acreage) ??
      toNumber(project.acres_gross) ??
      (primaryAreaType?.includes('acre') ? primaryArea : null);
    if (acreage && acreage > 0) {
      return `${acreage.toLocaleString(undefined, { maximumFractionDigits: 2 })} AC`;
    }
    return 'TBD';
  }

  if (canonicalCode === 'MF') {
    const mfUnits = units ?? primaryCountRaw;
    if (mfUnits && mfUnits > 0) return `${mfUnits.toLocaleString()} Units`;
  }

  if (canonicalCode && ['MXU', 'RET', 'OFF', 'IND', 'HTL'].includes(canonicalCode)) {
    if (commercialSqft && commercialSqft > 0) return `${commercialSqft.toLocaleString()} SF`;
  }

  if (commercialSqft && commercialSqft > 0) return `${commercialSqft.toLocaleString()} SF`;
  if (units && units > 0) return `${units.toLocaleString()} Units`;

  return 'TBD';
};

const matchesFilter = (project: ProjectSummary, filterKey: PropertyFilterKey) => {
  if (filterKey === 'ALL') return true;
  const code = toTypeCode(project);
  const filter = PROPERTY_FILTERS.find((f) => f.key === filterKey);
  return filter ? filter.codes.includes(code ?? '') : true;
};

const getTypeLabel = (project: ProjectSummary) => {
  return getPropertyTypeLabel(toTypeCode(project));
};

function ProjectAccordion({
  projects,
  selectedProjectId,
  onProjectClick,
  onNewProject,
  onDeleteProject,
  isLandscaperCollapsed,
  onToggleLandscaper,
}: {
  projects: ProjectSummary[];
  selectedProjectId: number | null;
  onProjectClick: (project: ProjectSummary) => void;
  onNewProject: () => void;
  onDeleteProject: (project: ProjectSummary) => void;
  isLandscaperCollapsed: boolean;
  onToggleLandscaper: () => void;
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
        <div className="d-flex align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              onClick={onToggleLandscaper}
              className="rounded-pill px-2 py-1 fw-semibold"
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--cui-body-color)',
                fontSize: '0.75rem',
                letterSpacing: '0.03em',
              }}
              aria-label="Toggle Landscaper panel"
            >
              {isLandscaperCollapsed ? '>>' : '<<'}
            </button>
            <span>Projects</span>
          </div>
          <LandscapeButton color="primary" size="sm" onClick={onNewProject}>
            + New Project
          </LandscapeButton>
        </div>
      </CCardHeader>
      <CCardBody className="p-0">
        <div>
          {projects.map((project) => {
            const isSelected = selectedProjectId === project.project_id;
            const isHovered = hoveredId === project.project_id;
            return (
              <div
                key={project.project_id}
                role="button"
                tabIndex={0}
                ref={(node) => node && itemRefs.current.set(project.project_id, node)}
                onClick={() => onProjectClick(project)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onProjectClick(project); } }}
                onMouseEnter={() => setHoveredId(project.project_id)}
                onMouseLeave={() => setHoveredId(null)}
                className="w-100 text-start"
                style={{
                  padding: '12px 16px',
                  transition: 'background-color 150ms ease',
                  backgroundColor: isSelected
                    ? 'var(--cui-tertiary-bg)'
                    : isHovered
                      ? 'var(--cui-card-cap-bg)'
                      : 'transparent',
                  borderLeft: isSelected ? '3px solid var(--cui-primary)' : '3px solid transparent',
                  borderTop: project === projects[0] ? 'none' : '1px solid var(--cui-border-color)',
                }}
              >
                <div className="d-flex align-items-start justify-content-between gap-3">
                  <div>
                    <div className="fw-semibold lh-sm">{project.project_name}</div>
                    <div className="d-flex flex-wrap align-items-center gap-2 mt-1 small">
                      <PropertyTypeBadge typeCode={toTypeCode(project)} label={getTypeLabel(project)} />
                      <span style={{ color: 'var(--cui-secondary-color)' }}>
                        {formatLocation(project)}
                      </span>
                    </div>
                  </div>
                  <div className="d-flex align-items-start gap-2">
                    <div className="text-end">
                      <div className="fw-semibold" style={{ fontSize: '1rem' }}>{formatUnits(project)}</div>
                    </div>
                    {isHovered && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteProject(project);
                        }}
                        title="Delete project"
                        style={{
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          borderRadius: '4px',
                          color: 'var(--cui-secondary-color)',
                          fontSize: '0.875rem',
                          lineHeight: 1,
                          transition: 'color 150ms ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--cui-danger)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--cui-secondary-color)')}
                      >
                        &#x1F5D1;
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {projects.length === 0 && (
          <div className="text-center py-4">
            <p className="small mb-0" style={{ color: 'var(--cui-secondary-color)' }}>
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
    <div
      className="w-100"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: '0.375rem',
      }}
    >
      {PROPERTY_FILTERS.map((filter) => {
        const isActive = activeFilter === filter.key || (filter.key === 'ALL' && activeFilter === 'ALL');
        const count =
          filter.key === 'ALL'
            ? projects.length
            : projects.filter((project) => matchesFilter(project, filter.key)).length;
        const { bgVar, textVar } = getFilterColors(filter.key);

        return (
          <button
            key={filter.key}
            type="button"
            className="rounded px-2 py-1 text-center w-100"
            onClick={() => onFilterChange(filter.key)}
            style={{
              cursor: 'pointer',
              transition: 'all 150ms ease',
              border: isActive
                ? `1px solid ${bgVar}`
                : `1px solid color-mix(in srgb, ${bgVar} 70%, var(--cui-border-color))`,
              boxShadow: isActive ? `0 0 0 1px ${bgVar}` : undefined,
              background: isActive
                ? bgVar
                : `color-mix(in srgb, ${bgVar} 14%, transparent)`,
              color: isActive ? textVar : bgVar
            }}
          >
            <div className="d-flex align-items-center justify-content-center" style={{ gap: '0.375rem' }}>
              <span className="small fw-semibold" style={{ color: isActive ? textVar : bgVar }}>
                {count}
              </span>
              <span
                className="small text-truncate d-inline-block"
                style={{
                  color: isActive ? textVar : 'var(--cui-secondary-color)',
                  fontSize: '0.75rem',
                  maxWidth: '120px'
                }}
              >
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
  const { projects, selectProject, refreshProjects } = useProjectContext();
  const router = useRouter();
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isTriageModalOpen, setIsTriageModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<PropertyFilterKey>('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<ProjectSummary | null>(null);

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

  const handleDeleteProject = (project: ProjectSummary) => {
    setDeleteTarget(project);
  };

  const handleProjectDeleted = (_result: DeleteProjectResult) => {
    setDeleteTarget(null);
    setSelectedProjectId(null);
    // Refresh the project list
    if (typeof refreshProjects === 'function') {
      refreshProjects();
    }
  };

  const [isActivityExpanded, setActivityExpanded] = useState(true);
  const [isLandscaperCollapsed, setLandscaperCollapsed] = useState(false);

  const toggleLandscaperCollapsed = () => setLandscaperCollapsed((prev) => !prev);

  return (
    <CContainer
      fluid
      className="d-flex flex-column"
      style={{ padding: '0.25rem 0.5rem 0.5rem 0.25rem', gap: '0.5rem' }}
    >
      {/* Three-column layout: Activity+Landscaper | Projects | Map with Filters */}
      <div className="d-flex flex-grow-1 gap-2" style={{ alignItems: 'flex-start', minHeight: 0 }}>
        {/* Left Column: Activity Feed (top) + Landscaper Chat (bottom) */}
        <div
          className="flex-shrink-0 position-sticky top-0 d-flex flex-column gap-1"
          style={{
            width: isLandscaperCollapsed ? '64px' : '30%',
            minWidth: isLandscaperCollapsed ? '64px' : '350px',
            maxWidth: isLandscaperCollapsed ? '64px' : '450px',
            height: 'calc(100vh - 100px)',
          }}
        >
          {isLandscaperCollapsed ? (
            <CollapsedLandscaperStrip onExpand={toggleLandscaperCollapsed} />
          ) : (
            <>
              {/* Landscaper Chat - Top */}
              <CCard
                className="flex-grow-1 shadow overflow-hidden"
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
                className="shadow overflow-hidden"
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
            </>
          )}
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
            onDeleteProject={handleDeleteProject}
            isLandscaperCollapsed={isLandscaperCollapsed}
            onToggleLandscaper={toggleLandscaperCollapsed}
          />
        </div>

        {/* Right Column: Project Locations */}
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <CCard>
            <CCardHeader style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
              <span>Project Locations</span>
            </CCardHeader>
            <CCardBody className="d-flex flex-column gap-2" style={{ padding: '0.5rem' }}>
              <ProjectCountTiles
                projects={projects}
                activeFilter={activeFilter}
                onFilterChange={handleFilterChange}
              />

              <div style={{ height: 'calc(100vh - 230px)', minHeight: '400px' }}>
                <DashboardMap
                  projects={filteredProjects}
                  selectedProjectId={selectedProjectId}
                  onProjectSelect={handleProjectSelect}
                />
              </div>
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

      {deleteTarget && (
        <DeleteProjectDialog
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          projectId={deleteTarget.project_id}
          projectName={deleteTarget.project_name}
          onDeleted={handleProjectDeleted}
        />
      )}
    </CContainer>
  );
}
