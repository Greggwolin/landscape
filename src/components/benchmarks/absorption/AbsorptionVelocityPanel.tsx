'use client';

import React, { useEffect, useState } from 'react';
import type { AbsorptionVelocity, ProjectScale } from '@/types/benchmarks';

interface AbsorptionVelocityPanelProps {
  onCountUpdate?: (count: number) => void;
}

export default function AbsorptionVelocityPanel({ onCountUpdate }: AbsorptionVelocityPanelProps) {
  const [velocities, setVelocities] = useState<AbsorptionVelocity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [isAdding, setIsAdding] = useState(false);
  const [newVelocity, setNewVelocity] = useState('');
  const [newMarketGeography, setNewMarketGeography] = useState('');
  const [newProjectScale, setNewProjectScale] = useState<ProjectScale | ''>('');
  const [savingNew, setSavingNew] = useState(false);

  useEffect(() => {
    loadVelocities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadVelocities() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/benchmarks/absorption-velocity', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load absorption velocities');
      const data: AbsorptionVelocity[] = await response.json();
      setVelocities(data);
      onCountUpdate?.(data.length);
    } catch (err) {
      console.error('Error loading absorption velocities:', err);
      setError(err instanceof Error ? err.message : 'Failed to load absorption velocities');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(id: number) {
    try {
      const response = await fetch(`/api/benchmarks/absorption-velocity/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ velocity_annual: editValue }),
      });

      if (!response.ok) throw new Error('Failed to save absorption velocity');

      await loadVelocities();
      setEditingId(null);
    } catch (err) {
      console.error('Error saving absorption velocity:', err);
      setError(err instanceof Error ? err.message : 'Failed to save absorption velocity');
    }
  }

  async function handleDelete(id: number) {
    if (typeof window !== 'undefined' && !window.confirm('Delete this velocity benchmark?')) {
      return;
    }

    try {
      const response = await fetch(`/api/benchmarks/absorption-velocity/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete absorption velocity');

      await loadVelocities();
    } catch (err) {
      console.error('Error deleting absorption velocity:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete absorption velocity');
    }
  }

  function startEditing(velocity: AbsorptionVelocity) {
    setEditingId(velocity.absorption_velocity_id);
    setEditValue(velocity.velocity_annual);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditValue(0);
  }

  function resetAddForm() {
    setNewVelocity('');
    setNewMarketGeography('');
    setNewProjectScale('');
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const velocityValue = parseInt(newVelocity, 10);
    if (!Number.isFinite(velocityValue) || velocityValue <= 0) {
      setError('Enter a positive annual velocity value.');
      return;
    }

    setSavingNew(true);
    setError(null);

    try {
      const response = await fetch('/api/benchmarks/absorption-velocity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          velocity_annual: velocityValue,
          market_geography: newMarketGeography || undefined,
          project_scale: newProjectScale || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create absorption velocity');
      }

      resetAddForm();
      setIsAdding(false);
      await loadVelocities();
    } catch (err) {
      console.error('Error creating absorption velocity:', err);
      setError(err instanceof Error ? err.message : 'Failed to create absorption velocity');
    } finally {
      setSavingNew(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        Loading absorption velocities...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Absorption Velocity</h3>
          <p className="text-xs text-slate-400">
            Global MPC velocity defaults for project-level assumptions
          </p>
        </div>
        <button
          onClick={() => {
            if (isAdding) {
              resetAddForm();
            }
            setIsAdding((prev) => !prev);
          }}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm hover:bg-blue-700"
        >
          {isAdding ? 'Close' : '+ Add Velocity'}
        </button>
      </div>

      {isAdding && (
        <form
          onSubmit={handleCreate}
          className="mb-4 space-y-3 rounded border border-slate-700 bg-slate-900/40 p-4"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Annual velocity <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min={1}
                required
                value={newVelocity}
                onChange={(event) => setNewVelocity(event.target.value)}
                className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="250"
              />
              <p className="mt-1 text-xs text-slate-500">Units per year</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Market geography</label>
              <input
                type="text"
                value={newMarketGeography}
                onChange={(event) => setNewMarketGeography(event.target.value)}
                className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Phoenix Metro"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Project scale</label>
              <select
                value={newProjectScale}
                onChange={(event) => setNewProjectScale(event.target.value as ProjectScale | '')}
                className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">-- Optional --</option>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                resetAddForm();
                setIsAdding(false);
              }}
              className="rounded bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingNew}
              className="rounded bg-green-600 px-3 py-1.5 text-sm hover:bg-green-700 disabled:opacity-70"
            >
              {savingNew ? 'Saving...' : 'Save Velocity'}
            </button>
          </div>
        </form>
      )}

      {velocities.length === 0 ? (
        <div className="py-8 text-center text-slate-400">
          No velocity benchmarks defined. Add one to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {velocities.map((velocity) => (
            <div
              key={velocity.absorption_velocity_id}
              className="rounded border border-slate-700 bg-slate-800 p-3"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  {editingId === velocity.absorption_velocity_id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={Number.isFinite(editValue) ? editValue : 0}
                        onChange={(event) => setEditValue(Number(event.target.value))}
                        className="w-28 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm"
                        autoFocus
                      />
                      <span className="text-sm text-slate-300">units/year</span>
                    </div>
                  ) : (
                    <div>
                      <div className="font-medium">
                        {velocity.velocity_annual.toLocaleString()} units/year
                      </div>
                      {velocity.market_geography && (
                        <div className="text-sm text-slate-400">
                          {velocity.market_geography}
                        </div>
                      )}
                      <div className="mt-1 text-xs text-slate-500">
                        {velocity.detail_count} supporting records • Sources:{' '}
                        {velocity.data_sources.length > 0
                          ? velocity.data_sources.join(', ')
                          : 'n/a'}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Updated {new Date(velocity.last_updated).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {editingId === velocity.absorption_velocity_id ? (
                    <>
                      <button
                        onClick={() => handleSave(velocity.absorption_velocity_id)}
                        className="rounded bg-green-600 px-3 py-1 text-sm hover:bg-green-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="rounded bg-slate-600 px-3 py-1 text-sm hover:bg-slate-500"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEditing(velocity)}
                        className="rounded bg-slate-700 px-3 py-1 text-sm hover:bg-slate-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(velocity.absorption_velocity_id)}
                        className="rounded bg-red-600/20 px-3 py-1 text-sm text-red-400 hover:bg-red-600/30"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
