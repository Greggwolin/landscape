/**
 * Scenario Comparison Component
 * Feature: SCENARIO-001
 * Created: 2025-10-24
 *
 * Multi-scenario comparison interface for sensitivity analysis.
 */

'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { Scenario, CreateComparisonRequest } from '@/types/scenario';

interface ScenarioComparisonProps {
  projectId: number;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function ScenarioComparison({ projectId }: ScenarioComparisonProps) {
  const { data: scenarios } = useSWR<Scenario[]>(
    `/api/financial/scenarios?project_id=${projectId}`,
    fetcher
  );

  const [selectedScenarios, setSelectedScenarios] = useState<number[]>([]);
  const [comparisonName, setComparisonName] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const toggleScenario = (scenarioId: number) => {
    setSelectedScenarios(prev =>
      prev.includes(scenarioId)
        ? prev.filter(id => id !== scenarioId)
        : [...prev, scenarioId]
    );
  };

  const runComparison = async () => {
    if (selectedScenarios.length < 2) {
      alert('Select at least 2 scenarios to compare');
      return;
    }

    if (!comparisonName.trim()) {
      alert('Please enter a comparison name');
      return;
    }

    setIsRunning(true);

    try {
      const payload: CreateComparisonRequest = {
        project: projectId,
        comparison_name: comparisonName,
        scenario_ids: selectedScenarios,
        comparison_type: 'side_by_side',
      };

      const response = await fetch('/api/financial/scenario-comparisons/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const comparison = await response.json();

        // Trigger calculation
        await fetch(`/api/financial/scenario-comparisons/${comparison.comparison_id}/calculate/`, {
          method: 'POST',
        });

        // TODO: Show comparison results in a modal or new page
        alert('Comparison complete! (Results display TBD)');

        // Reset form
        setSelectedScenarios([]);
        setComparisonName('');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to run comparison');
      }
    } catch (error) {
      console.error('Failed to run comparison:', error);
      alert('An error occurred while running the comparison');
    } finally {
      setIsRunning(false);
    }
  };

  if (!scenarios) return <div>Loading...</div>;

  return (
    <div className="scenario-comparison">
      <h3 className="text-lg font-semibold mb-4">Compare Scenarios</h3>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Comparison Name
        </label>
        <input
          type="text"
          value={comparisonName}
          onChange={(e) => setComparisonName(e.target.value)}
          placeholder="e.g., Q4 2024 Sensitivity Analysis"
          className="form-control w-full"
        />
      </div>

      <div className="scenario-selection mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Scenarios ({selectedScenarios.length} selected)
        </label>
        {scenarios.map(scenario => (
          <label
            key={scenario.scenario_id}
            className="flex items-center gap-2 mb-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedScenarios.includes(scenario.scenario_id)}
              onChange={() => toggleScenario(scenario.scenario_id)}
              className="w-4 h-4"
            />
            <span className="font-medium">{scenario.scenario_name}</span>
            <span className={`text-xs px-2 py-1 rounded text-white ${scenario.color_class}`}>
              {scenario.scenario_type}
            </span>
          </label>
        ))}
      </div>

      <button
        onClick={runComparison}
        disabled={selectedScenarios.length < 2 || !comparisonName.trim() || isRunning}
        className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isRunning ? 'Running Comparison...' : 'Run Comparison'}
      </button>

      {selectedScenarios.length < 2 && (
        <p className="text-sm text-gray-500 mt-2">
          Select at least 2 scenarios to enable comparison
        </p>
      )}
    </div>
  );
}
