// PhaseCell - Editable dropdown for selecting project phases
// v1.1 · 2025-11-10 · Added project taxonomy label support (Village/Phase/etc.)

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useContainers } from '@/hooks/useContainers';
import { useProjectConfig } from '@/hooks/useProjectConfig';
import type { BudgetItem } from '../ColumnDefinitions';

interface PhaseCellProps {
  row: {
    original: BudgetItem;
  };
  onCommit?: (value: number | null) => void | Promise<void>;
  projectId?: number;
}

export default function PhaseCell({ row, onCommit, projectId }: PhaseCellProps) {
  const item = row.original;
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState<number | null>(item.container_id ?? null);
  const selectRef = useRef<HTMLSelectElement>(null);

  const pid = projectId || item.project_id || 0;

  // Fetch container hierarchy
  const containersResult = useContainers({
    projectId: pid,
    includeCosts: false,
  });

  // Fetch project config for custom labels
  const { labels } = useProjectConfig(pid);
  const level1Label = labels?.level1Label || 'Area';
  const level2Label = labels?.level2Label || 'Phase';

  const areas = containersResult?.areas || [];
  const phases = containersResult?.phases || [];

  // Sync local state with prop changes only when not editing
  // This prevents the state from being overwritten while user is selecting
  useEffect(() => {
    if (!isEditing) {
      setValue(item.container_id ?? null);
    }
  }, [item.container_id, isEditing]);

  // Build options list: Project-Level + Areas + Phases
  const options: { value: number | null; label: string }[] = [
    { value: null, label: 'Project-Level' },
  ];

  // Add all areas (Level 1)
  if (areas && areas.length > 0) {
    areas.forEach((area) => {
      // If display_name is just a number, prefix with level1 label (e.g., "Village")
      const isNumeric = /^\d+$/.test(area.name);
      const label = isNumeric ? `${level1Label} ${area.name}` : area.name;
      options.push({
        value: area.container_id,
        label: label || `${level1Label} ${area.container_id}`
      });
    });
  }

  // Add all phases (Level 2)
  if (phases && phases.length > 0) {
    phases.forEach((phase) => {
      // Build phase name using level2 label (e.g., "Phase")
      const phaseDisplayName = phase.name || String(phase.container_id);
      const isPhaseNumeric = /^\d+(\.\d+)?$/.test(phaseDisplayName);
      const label = isPhaseNumeric ? `${level2Label} ${phaseDisplayName}` : phaseDisplayName;

      options.push({ value: phase.container_id, label });
    });
  }

  useEffect(() => {
    if (isEditing && selectRef.current) {
      selectRef.current.focus();
    }
  }, [isEditing]);

  const handleClick = () => {
    setIsEditing(true);
  };

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value === '' ? null : Number(e.target.value);
    setValue(newValue);

    if (onCommit) {
      await onCommit(newValue);
    }

    setIsEditing(false);
  };

  const handleBlur = () => {
    setIsEditing(false);
    setValue(item.container_id ?? null); // Reset to original value
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditing(false);
      setValue(item.container_id ?? null);
    }
  };

  // Build display value from current container_id
  // Use local state 'value' instead of item.container_id to reflect immediate changes
  const getDisplayValue = () => {
    const containerId = value ?? item.container_id;

    if (!containerId) return 'Project-Level';

    // If containers are still loading, show loading state
    if (containersResult?.isLoading) {
      return 'Loading...';
    }

    // Check if it's an area (Level 1)
    const area = areas.find(a => a.container_id === containerId);
    if (area) {
      const isNumeric = /^\d+$/.test(area.name);
      return isNumeric ? `${level1Label} ${area.name}` : area.name;
    }

    // Check if it's a phase (Level 2)
    const phase = phases.find(p => p.container_id === containerId);
    if (phase) {
      // Build phase name using level2 label (e.g., "Phase")
      const phaseDisplayName = phase.name || String(phase.container_id);
      const isPhaseNumeric = /^\d+(\.\d+)?$/.test(phaseDisplayName);
      return isPhaseNumeric ? `${level2Label} ${phaseDisplayName}` : phaseDisplayName;
    }

    // Fallback: Container exists but isn't in this project's hierarchy
    // This can happen if data was copied from another project or migrated
    return `Invalid (ID: ${containerId})`;
  };

  const displayValue = getDisplayValue();

  if (isEditing) {
    return (
      <select
        ref={selectRef}
        className="form-select form-select-sm"
        value={value === null ? '' : value}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={{
          fontSize: '0.875rem',
          padding: '0.25rem 0.5rem',
          minWidth: '150px',
        }}
      >
        {options.map((opt) => (
          <option key={opt.value ?? 'null'} value={opt.value ?? ''}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div
      role="button"
      className="text-truncate"
      style={{
        cursor: 'pointer',
        padding: '0.25rem 0.5rem',
        minHeight: '1.5rem',
      }}
      onClick={handleClick}
      title={displayValue}
    >
      {displayValue}
    </div>
  );
}
