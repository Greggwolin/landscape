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
      <div className="scenario-manager bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="text-gray-400 text-sm">Loading scenarios...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="scenario-manager bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="text-red-400 text-sm">Failed to load scenarios: {error.message}</div>
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
    <div className="scenario-manager bg-gray-800 border-b border-gray-700 px-6 py-4">
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
            className="chip chip-add bg-transparent text-gray-400 border-2 border-dashed border-gray-600 hover:border-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
          >
            <span className="text-xl">+</span>
            <span className="ml-1">New Scenario</span>
          </button>
        )}
      </div>

      {/* Create Form (if active) */}
      {isCreating && (
        <div className="create-form bg-gray-900 p-4 rounded-lg mb-3 border border-gray-700">
          <input
            type="text"
            value={newScenarioName}
            onChange={(e) => setNewScenarioName(e.target.value)}
            placeholder="Scenario name..."
            className="form-control bg-gray-800 border-gray-600 text-white placeholder-gray-500 w-full mb-2"
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
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          onClick={() => {
            // TODO: Open comparison modal
            alert('Comparison view coming soon');
          }}
        >
          Compare Scenarios
        </button>

        {activeScenario && (
          <button
            className="text-sm text-green-400 hover:text-green-300 transition-colors"
            onClick={handleCloneActive}
          >
            Clone Active
          </button>
        )}

        <button
          className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
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

  const getChipColor = () => {
    const colors: Record<string, string> = {
      base: 'bg-blue-600 hover:bg-blue-500',
      optimistic: 'bg-green-600 hover:bg-green-500',
      conservative: 'bg-yellow-600 hover:bg-yellow-500',
      stress: 'bg-red-600 hover:bg-red-500',
      custom: 'bg-gray-600 hover:bg-gray-500',
    };
    return colors[scenario.scenario_type] || colors.custom;
  };

  return (
    <div className="relative">
      <button
        onClick={onActivate}
        className={`chip ${getChipColor()} text-white font-semibold ${
          isActive ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800' : ''
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
          className="chip-menu-trigger ml-2 px-1 rounded hover:bg-white/20"
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
          <div className="chip-dropdown-menu absolute top-full right-0 mt-2 min-w-[180px] bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-20 overflow-hidden">
            <button
              onClick={() => {
                onClone();
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 transition-colors"
            >
              Clone Scenario
            </button>
            {scenario.can_delete && (
              <button
                onClick={() => {
                  onDelete();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-800 transition-colors"
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
