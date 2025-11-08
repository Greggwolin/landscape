'use client';

import { useState, useEffect } from 'react';
import { mutate } from 'swr';

interface GranularitySettings {
  level1Enabled: boolean;
  level1Label: string;
  level2Enabled: boolean;
  level2Label: string;
  level3Enabled: boolean;
  level3Label: string;
  autoNumber: boolean;
}

const LABEL_OPTIONS = {
  level1: ['Area', 'Neighborhood', 'Village', 'District', 'Sector'],
  level2: ['Phase', 'Stage', 'Quarter', 'Block', 'Tract'],
  level3: ['Parcel', 'Lot', 'Unit', 'Pad', 'Site']
};

interface Props {
  projectId?: number | null;
}

export default function PlanningOverviewControls({ projectId }: Props) {
  const [settings, setSettings] = useState<GranularitySettings>({
    level1Enabled: true,
    level1Label: 'Area',
    level2Enabled: true,
    level2Label: 'Phase',
    level3Enabled: true,
    level3Label: 'Parcel',
    autoNumber: false
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      loadSettings();
    }
  }, [projectId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/project/granularity-settings?project_id=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to load granularity settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!projectId) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/project/granularity-settings?project_id=${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setHasChanges(false);

        // Revalidate the project config via SWR to update labels everywhere
        await mutate(`/api/projects/${projectId}/config`);
        await mutate(`/api/projects/${projectId}/containers`);

        // Show success message briefly
        const successMsg = document.createElement('div');
        successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded shadow-lg z-50 transition-opacity';
        successMsg.textContent = 'Settings saved! Labels updated.';
        document.body.appendChild(successMsg);
        setTimeout(() => {
          successMsg.style.opacity = '0';
          setTimeout(() => successMsg.remove(), 300);
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof GranularitySettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="rounded border" style={{ backgroundColor: 'var(--cui-card-bg)', borderColor: 'var(--cui-border-color)' }}>
        <div className="px-6 py-4 border-b" style={{ backgroundColor: 'var(--surface-card)', borderColor: 'var(--cui-border-color)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--cui-body-color)' }}>Planning Overview</h2>
        </div>
        <div className="p-6 text-center" style={{ color: 'var(--cui-body-color)' }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="rounded border" style={{ backgroundColor: 'var(--cui-card-bg)', borderColor: 'var(--cui-border-color)' }}>
      <div className="px-4 py-2 border-b" style={{ backgroundColor: 'var(--surface-card)', borderColor: 'var(--cui-border-color)' }}>
        <h2 className="text-base font-semibold" style={{ color: 'var(--cui-body-color)' }}>Planning Overview</h2>
      </div>

      <div className="grid grid-cols-2 divide-x" style={{ borderColor: 'var(--cui-border-color)' }}>
        {/* Left Panel - Explanation */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--cui-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-semibold mb-2" style={{ color: 'var(--cui-body-color)' }}>What This Does</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--cui-secondary-color)' }}>
                The Parcel Detail table is the source of truth for your plan.
                Choose your hierarchy levels to organize your project.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <strong style={{ color: 'var(--cui-body-color)' }}>Level 1:</strong>
              <span style={{ color: 'var(--cui-secondary-color)' }}> Areas, Villages, Neighborhoods, Districts</span>
            </div>
            <div>
              <strong style={{ color: 'var(--cui-body-color)' }}>Level 2:</strong>
              <span style={{ color: 'var(--cui-secondary-color)' }}> Phases, Timing Groups, Development Stages</span>
            </div>
            <div>
              <strong style={{ color: 'var(--cui-body-color)' }}>Level 3:</strong>
              <span style={{ color: 'var(--cui-secondary-color)' }}> Parcels, Lots, Units, Pads (required)</span>
            </div>
          </div>

          <div className="pt-4 border-t" style={{ borderColor: 'var(--cui-border-color)' }}>
            <p className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
              Labels you choose here will appear throughout the app in headers,
              filters, and navigation. Changes apply after clicking "Apply Changes".
            </p>
          </div>
        </div>

        {/* Right Panel - Controls */}
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--cui-body-color)' }}>Project Structure</h3>

            {/* Level 1 */}
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                checked={settings.level1Enabled}
                onChange={(e) => updateSetting('level1Enabled', e.target.checked)}
                className="w-4 h-4 rounded flex-shrink-0"
                style={{ accentColor: 'var(--cui-primary)' }}
              />
              <span className="text-sm font-medium flex-shrink-0" style={{ color: 'var(--cui-body-color)', width: '90px' }}>Level 1:</span>
              <select
                value={settings.level1Label}
                onChange={(e) => updateSetting('level1Label', e.target.value)}
                disabled={!settings.level1Enabled}
                className="px-3 py-1.5 text-sm border rounded-md flex-1"
                style={{
                  backgroundColor: settings.level1Enabled ? 'var(--cui-body-bg)' : 'rgb(243, 244, 246)',
                  borderColor: 'var(--cui-border-color)',
                  color: 'var(--cui-body-color)',
                  cursor: settings.level1Enabled ? 'pointer' : 'not-allowed'
                }}
              >
                {LABEL_OPTIONS.level1.map(label => (
                  <option key={label} value={label}>{label}</option>
                ))}
              </select>
            </div>

            {/* Level 2 */}
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                checked={settings.level2Enabled}
                onChange={(e) => updateSetting('level2Enabled', e.target.checked)}
                className="w-4 h-4 rounded flex-shrink-0"
                style={{ accentColor: 'var(--cui-primary)' }}
              />
              <span className="text-sm font-medium flex-shrink-0" style={{ color: 'var(--cui-body-color)', width: '90px' }}>Level 2:</span>
              <select
                value={settings.level2Label}
                onChange={(e) => updateSetting('level2Label', e.target.value)}
                disabled={!settings.level2Enabled}
                className="px-3 py-1.5 text-sm border rounded-md flex-1"
                style={{
                  backgroundColor: settings.level2Enabled ? 'var(--cui-body-bg)' : 'rgb(243, 244, 246)',
                  borderColor: 'var(--cui-border-color)',
                  color: 'var(--cui-body-color)',
                  cursor: settings.level2Enabled ? 'pointer' : 'not-allowed'
                }}
              >
                {LABEL_OPTIONS.level2.map(label => (
                  <option key={label} value={label}>{label}</option>
                ))}
              </select>
            </div>

            {/* Level 3 - Always enabled */}
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                checked={true}
                disabled={true}
                className="w-4 h-4 rounded cursor-not-allowed flex-shrink-0"
                style={{ accentColor: 'var(--cui-primary)' }}
              />
              <span className="text-sm font-medium flex-shrink-0" style={{ color: 'var(--cui-body-color)', width: '90px' }}>
                Level 3: <span className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>(req)</span>
              </span>
              <select
                value={settings.level3Label}
                onChange={(e) => updateSetting('level3Label', e.target.value)}
                className="px-3 py-1.5 text-sm border rounded-md flex-1"
                style={{
                  backgroundColor: 'var(--cui-body-bg)',
                  borderColor: 'var(--cui-border-color)',
                  color: 'var(--cui-body-color)'
                }}
              >
                {LABEL_OPTIONS.level3.map(label => (
                  <option key={label} value={label}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Numbering Options */}
          <div className="pt-4 border-t" style={{ borderColor: 'var(--cui-border-color)' }}>
            <h3 className="font-semibold mb-3" style={{ color: 'var(--cui-body-color)' }}>Numbering Options</h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoNumber}
                onChange={(e) => updateSetting('autoNumber', e.target.checked)}
                className="w-4 h-4 rounded"
                style={{ accentColor: 'var(--cui-primary)' }}
              />
              <span className="text-sm" style={{ color: 'var(--cui-body-color)' }}>Auto-number parcels</span>
            </label>
            <p className="text-xs mt-2 ml-7" style={{ color: 'var(--cui-secondary-color)' }}>
              Automatically assign sequential parcel IDs based on hierarchy
            </p>
          </div>

          {/* Apply Button */}
          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="w-full px-4 py-2 text-sm font-medium text-white rounded-md transition-colors"
              style={{
                backgroundColor: hasChanges && !saving ? 'var(--cui-primary)' : 'rgb(209, 213, 219)',
                cursor: hasChanges && !saving ? 'pointer' : 'not-allowed',
                opacity: hasChanges && !saving ? 1 : 0.6
              }}
            >
              {saving ? 'Applying...' : 'Apply Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
