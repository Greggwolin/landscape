/**
 * Scenario Chip Manager Component
 * Feature: SCENARIO-001 - Revised Integration (LX9)
 * Updated: 2025-10-24
 *
 * Project-level scenario switcher with chip-based UI.
 * Integrates with dark theme multifamily architecture.
 * Positioned above tab navigation, below project header.
 */

'use client';

import React, { useState } from 'react';
import { useScenario, Scenario } from '@/contexts/ScenarioContext';

export default function ScenarioChipManager() {
  const {
    activeScenario,
    scenarios,
    loading,
    error,
    activateScenario,
    createScenario,
    cloneScenario,
    deleteScenario
  } = useScenario();

  const [isCreating, setIsCreating] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');

  if (loading) {
    return (
      <div className="scenario-manager bg-surface-card border-b border-line-strong px-6 py-4 text-text-primary">
        <div className="text-text-secondary text-sm">Loading scenarios...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="scenario-manager bg-surface-card border-b border-line-strong px-6 py-4 text-text-primary">
        <div className="text-chip-error text-sm">Failed to load scenarios: {error.message}</div>
      </div>
    );
  }

  const handleCreate = async () => {
    if (!newScenarioName.trim()) return;

    try {
      await createScenario(newScenarioName.trim(), 'custom');
      setNewScenarioName('');
      setIsCreating(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create scenario');
    }
  };

  const handleCloneActive = () => {
    if (!activeScenario) return;

    const newName = prompt(
      `Clone "${activeScenario.scenario_name}" as:`,
      `${activeScenario.scenario_name} - Variation`
    );

    if (newName?.trim()) {
      cloneScenario(activeScenario.scenario_id, newName.trim())
        .catch(error => {
          alert(error instanceof Error ? error.message : 'Failed to clone scenario');
        });
    }
  };

  return (
    <div className="scenario-manager bg-surface-card border-b border-line-strong px-6 py-4 text-text-primary">
      {/* Chip Row */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {scenarios.map((scenario) => (
          <ScenarioChip
            key={scenario.scenario_id}
            scenario={scenario}
            isActive={scenario.is_active}
            onActivate={() => activateScenario(scenario.scenario_id)}
            onClone={() => {
              const newName = prompt(
                `Clone "${scenario.scenario_name}" as:`,
                `${scenario.scenario_name} Copy`
              );
              if (newName?.trim()) {
                cloneScenario(scenario.scenario_id, newName.trim())
                  .catch(error => {
                    alert(error instanceof Error ? error.message : 'Failed to clone scenario');
                  });
              }
            }}
            onDelete={() => {
              if (confirm(`Delete scenario "${scenario.scenario_name}"?`)) {
                deleteScenario(scenario.scenario_id).catch(error => {
                  alert(error instanceof Error ? error.message : 'Failed to delete scenario');
                });
              }
            }}
          />
        ))}

        {/* Add New Scenario */}
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="chip chip-add bg-transparent text-text-secondary border-2 border-dashed border-line-strong hover:border-brand-primary hover:text-brand-primary hover:bg-[var(--hover-overlay)]"
          >
            <span className="text-xl">+</span>
            <span className="ml-1">New Scenario</span>
          </button>
        )}
      </div>

      {/* Create Form (if active) */}
      {isCreating && (
        <div className="create-form bg-surface-tile p-4 rounded-lg mb-3 border border-line-strong">
          <input
            type="text"
            value={newScenarioName}
            onChange={(e) => setNewScenarioName(e.target.value)}
            placeholder="Scenario name..."
            className="form-control bg-surface-card border-line-soft text-text-primary placeholder:text-text-secondary w-full mb-2"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') {
                setIsCreating(false);
                setNewScenarioName('');
              }
            }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="btn btn-primary"
            >
              Create
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setNewScenarioName('');
              }}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          className="text-sm text-brand-primary hover:opacity-80 transition-colors"
          onClick={() => {
            // TODO: Open comparison modal
            alert('Comparison view coming soon');
          }}
        >
          Compare Scenarios
        </button>

        {activeScenario && (
          <button
            className="text-sm text-chip-success hover:opacity-80 transition-colors"
            onClick={handleCloneActive}
          >
            Clone Active
          </button>
        )}

        <button
          className="text-sm text-text-secondary hover:opacity-80 transition-colors"
          onClick={() => {
            // TODO: Open scenario management modal
            alert('Scenario management coming soon');
          }}
        >
          Manage
        </button>
      </div>
    </div>
  );
}

interface ScenarioChipProps {
  scenario: Scenario;
  isActive: boolean;
  onActivate: () => void;
  onClone: () => void;
  onDelete: () => void;
}

function ScenarioChip({
  scenario,
  isActive,
  onActivate,
  onClone,
  onDelete
}: ScenarioChipProps) {
  const [showMenu, setShowMenu] = useState(false);

  const getChipTone = () => {
    const tones: Record<string, string> = {
      base: 'bg-chip-info hover:opacity-90',
      optimistic: 'bg-chip-success hover:opacity-90',
      conservative: 'bg-chip-warning hover:opacity-90',
      stress: 'bg-chip-error hover:opacity-90',
      custom: 'bg-chip-muted hover:opacity-90',
    };
    return tones[scenario.scenario_type] || tones.custom;
  };

  return (
    <div className="relative">
      <button
        onClick={onActivate}
        className={`chip ${getChipTone()} text-text-inverse font-semibold ${
          isActive ? 'ring-2 ring-text-inverse ring-offset-2 ring-offset-surface-bg' : ''
        }`}
      >
        <span className="chip-label">{scenario.scenario_name}</span>
        {scenario.is_locked && (
          <span className="chip-icon" title="Locked">
            🔒
          </span>
        )}
        {isActive && (
          <span className="chip-icon" title="Active">
            ✓
          </span>
        )}

        {/* Menu Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="chip-menu-trigger ml-2 px-1 rounded hover:bg-[var(--hover-overlay)]"
          aria-label="Scenario menu"
        >
          ⋮
        </button>
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="chip-dropdown-menu absolute top-full right-0 mt-2 min-w-[180px] bg-surface-tile border border-line-strong rounded-lg shadow-xl z-20 overflow-hidden">
            <button
              onClick={() => {
                onClone();
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-text-secondary hover:bg-[var(--hover-overlay)] transition-colors"
            >
              Clone Scenario
            </button>
            {scenario.can_delete && (
              <button
                onClick={() => {
                  onDelete();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-chip-error hover:bg-[var(--hover-overlay)] transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
