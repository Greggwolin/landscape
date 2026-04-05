/**
 * AppraisalTopbar
 *
 * Top bar with hamburger toggle, project selector dropdown, property type pill,
 * approach tabs, and avatar. Uses CoreUI icons.
 *
 * @version 2.1
 * @created 2026-04-04
 * @updated 2026-04-05 — CoreUI icons, font bump
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import CIcon from '@coreui/icons-react';
import { cilMenu } from '@coreui/icons';
import { useProjectContext } from '@/app/components/ProjectProvider';
import { getPropertyTypeTokenRef, getPropertyTypeLabel } from '@/config/propertyTypeTokens';
import type { ApproachId } from './appraisal.types';
import type { Project } from './appraisal.types';
import { ApproachTabs } from './approach/ApproachTabs';

interface AppraisalTopbarProps {
  project: Project;
  activeApproach: ApproachId;
  onApproachChange: (id: ApproachId) => void;
  onToggleLeft: () => void;
}

export function AppraisalTopbar({
  project,
  activeApproach,
  onApproachChange,
  onToggleLeft,
}: AppraisalTopbarProps) {
  const router = useRouter();
  const { projects, selectProject } = useProjectContext();

  const handleProjectChange = (newProjectId: number) => {
    selectProject(newProjectId);
    router.push(`/projects/${newProjectId}?ui=appraisal`);
  };

  // Resolve property type pill
  const ptCandidates = [project?.project_type, project?.project_type_code, project?.property_subtype];
  const ptMatch = ptCandidates.find((v) => v && getPropertyTypeTokenRef(v));
  const ptTokenRef = getPropertyTypeTokenRef(ptMatch);
  const ptLabelSource = ptCandidates.find((v) => !!v) || ptMatch;
  const ptLabel = getPropertyTypeLabel(ptLabelSource);

  return (
    <div className="appraisal-topbar">
      <button className="appraisal-tb-toggle" onClick={onToggleLeft} aria-label="Toggle left panel">
        <CIcon icon={cilMenu} size="sm" />
      </button>

      {/* Project selector dropdown */}
      <select
        value={project?.project_id || ''}
        onChange={(e) => handleProjectChange(Number(e.target.value))}
        className="appraisal-tb-select"
      >
        {projects.map((proj) => (
          <option key={proj.project_id} value={proj.project_id}>
            {proj.project_name}
          </option>
        ))}
      </select>

      {/* Property type pill */}
      {ptTokenRef && ptLabel && (
        <span
          className="appraisal-tb-pill"
          style={{
            backgroundColor: ptTokenRef.bgVar,
            color: ptTokenRef.textVar,
          }}
        >
          {ptLabel}
        </span>
      )}

      <div className="appraisal-tb-sep" />
      <ApproachTabs activeApproach={activeApproach} onApproachChange={onApproachChange} />
      <div className="appraisal-tb-spacer" />
      <div className="appraisal-tb-avatar">GW</div>
    </div>
  );
}
