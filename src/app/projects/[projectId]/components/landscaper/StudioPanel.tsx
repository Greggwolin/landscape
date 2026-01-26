'use client';

import React, { useState } from 'react';
import CIcon from '@coreui/icons-react';
import {
  cilChevronRight,
  cilChevronLeft,
  cilChevronBottom,
  cilNotes,
  cilLibrary,
  cilLayers,
  cilPencil,
  cilChartLine,
  cilMap,
  cilFolder,
  cilBook,
  cilDescription,
} from '@coreui/icons';
import { AgentModal } from './AgentModal';
import DMSView from '@/components/dms/DMSView';
import { useProjectContext } from '@/app/components/ProjectProvider';

interface StudioPanelProps {
  projectId: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface StudioTile {
  id: string;
  label: string;
  icon: string[];
  bgColor: string;
  description: string;
}

const studioTiles: StudioTile[] = [
  {
    id: 'input-detail',
    label: 'Input Detail',
    icon: cilPencil,
    bgColor: 'bg-blue-50 hover:bg-blue-100',
    description: 'Assumptions and inputs for active agent',
  },
  {
    id: 'graphics',
    label: 'Graphics',
    icon: cilChartLine,
    bgColor: 'bg-green-50 hover:bg-green-100',
    description: 'Charts and visualizations',
  },
  {
    id: 'gis-maps',
    label: 'GIS / Maps',
    icon: cilMap,
    bgColor: 'bg-orange-50 hover:bg-orange-100',
    description: 'MapLibre map views',
  },
  {
    id: 'dms',
    label: 'DMS',
    icon: cilFolder,
    bgColor: 'bg-purple-50 hover:bg-purple-100',
    description: 'Document management',
  },
  {
    id: 'notebook',
    label: 'Notebook',
    icon: cilBook,
    bgColor: 'bg-yellow-50 hover:bg-yellow-100',
    description: 'Project knowledge log',
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: cilDescription,
    bgColor: 'bg-pink-50 hover:bg-pink-100',
    description: 'Report generator',
  },
];

export function StudioPanel({ projectId, isCollapsed = false, onToggleCollapse }: StudioPanelProps) {
  const [notesExpanded, setNotesExpanded] = useState(true);
  const [sourcesExpanded, setSourcesExpanded] = useState(true);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const { projects } = useProjectContext();
  const projectIdNumber = Number(projectId);
  const project = projects.find((p) => p.project_id === projectIdNumber);

  if (isCollapsed) {
    return (
      <aside
        className="h-full flex flex-col items-center py-3 cursor-pointer hover:bg-hover-overlay transition-colors"
        onClick={onToggleCollapse}
        style={{
          backgroundColor: 'var(--surface-card)',
          borderTopLeftRadius: 'var(--cui-card-border-radius)',
          borderBottomLeftRadius: 'var(--cui-card-border-radius)',
          borderLeft: '1px solid var(--line-soft)',
          width: '48px',
          minWidth: '48px',
          boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <CIcon icon={cilLayers} size="lg" className="text-muted" />
      </aside>
    );
  }

  const activeTile = studioTiles.find((t) => t.id === activeModal);

  return (
    <>
      <aside
        className="h-full flex flex-col overflow-hidden"
        style={{
          backgroundColor: 'var(--surface-card)',
          borderRadius: 'var(--cui-card-border-radius)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          flex: 1.5,
          minWidth: '250px',
          maxWidth: '350px',
        }}
      >
        {/* Header with collapse button - sticky */}
        <div
          className="flex items-center justify-between px-3 py-2 border-b border-border sticky top-0 z-10"
          style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}
        >
          <span className="text-sm font-semibold text-foreground">Studio</span>
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded hover:bg-hover-overlay text-muted hover:text-foreground transition-colors"
            aria-label="Collapse Studio panel"
          >
            <CIcon icon={cilChevronRight} size="sm" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Tiles Grid - Always visible */}
          <div className="p-3">
            <div className="grid grid-cols-2 gap-2">
              {studioTiles.map((tile) => (
                <button
                  key={tile.id}
                  onClick={() => setActiveModal(tile.id)}
                  className={`
                    p-3 rounded-lg text-left flex flex-col gap-1.5
                    transition-all shadow-sm hover:shadow-md
                    ${tile.bgColor}
                  `}
                >
                  <CIcon icon={tile.icon} size="lg" className="text-gray-700" />
                  <span className="font-medium text-sm text-gray-800">{tile.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes Accordion */}
          <div className="border-t border-border">
            <button
              onClick={() => setNotesExpanded(!notesExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-hover-overlay transition-colors"
            >
              <div className="flex items-center gap-2">
                <CIcon icon={cilNotes} size="sm" className="text-muted" />
                <span className="text-sm font-medium text-foreground">Notes</span>
              </div>
              <CIcon
                icon={cilChevronBottom}
                size="sm"
                className={`text-muted transition-transform ${notesExpanded ? '' : '-rotate-90'}`}
              />
            </button>
            {notesExpanded && (
              <div className="px-3 pb-3">
                <div className="border border-dashed border-border rounded-lg p-3 text-center text-muted text-xs">
                  <p>No notes yet</p>
                  <p className="mt-1 opacity-70">Notes will appear as you work</p>
                </div>
              </div>
            )}
          </div>

          {/* Sources Accordion */}
          <div className="border-t border-border">
            <button
              onClick={() => setSourcesExpanded(!sourcesExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-hover-overlay transition-colors"
            >
              <div className="flex items-center gap-2">
                <CIcon icon={cilLibrary} size="sm" className="text-muted" />
                <span className="text-sm font-medium text-foreground">Sources</span>
              </div>
              <CIcon
                icon={cilChevronBottom}
                size="sm"
                className={`text-muted transition-transform ${sourcesExpanded ? '' : '-rotate-90'}`}
              />
            </button>
            {sourcesExpanded && (
              <div className="px-3 pb-3">
                <div className="border border-dashed border-border rounded-lg p-3 text-center text-muted text-xs">
                  <p>No sources cited</p>
                  <p className="mt-1 opacity-70">Sources will appear as Landscaper references documents</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Modal for tiles */}
      {activeModal && activeTile && (
        <AgentModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title={activeTile.label}
          subtitle={activeTile.description}
        >
          {activeTile.id === 'dms' ? (
            project ? (
              <DMSView
                projectId={project.project_id}
                projectName={project.project_name}
                projectType={project.project_type ?? null}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted">
                <div className="text-center">
                  <p className="text-lg font-medium">Project not found</p>
                  <p className="text-sm mt-1">Unable to load DMS for project {projectId}</p>
                </div>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-64 text-muted">
              <div className="text-center">
                <CIcon icon={activeTile.icon} size="3xl" className="mb-4 opacity-30" />
                <p className="text-lg font-medium">{activeTile.label}</p>
                <p className="text-sm mt-2">{activeTile.description}</p>
                <p className="text-xs mt-4 opacity-60">Content coming soon</p>
              </div>
            </div>
          )}
        </AgentModal>
      )}
    </>
  );
}
