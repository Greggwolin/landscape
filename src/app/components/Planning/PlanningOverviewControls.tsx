'use client';

import { useState, useEffect, useRef } from 'react';
import { mutate } from 'swr';
import { CFormSwitch } from '@coreui/react';

interface GranularitySettings {
  level1Enabled: boolean;
  level1Label: string;
  level2Enabled: boolean;
  level2Label: string;
  level3Enabled: boolean;
  level3Label: string;
  autoNumber: boolean;
  planningEfficiency: number | null;
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
    autoNumber: false,
    planningEfficiency: null
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [efficiencyInput, setEfficiencyInput] = useState('');
  const efficiencyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (projectId) {
      loadSettings();
    }
  }, [projectId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (efficiencyTimeoutRef.current) {
        clearTimeout(efficiencyTimeoutRef.current);
      }
    };
  }, []);

  const loadSettings = async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/project/granularity-settings?project_id=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        const normalized: GranularitySettings = {
          level1Enabled: true,
          level1Label: data?.level1Label ?? 'Area',
          level2Enabled: true,
          level2Label: data?.level2Label ?? 'Phase',
          level3Enabled: true,
          level3Label: data?.level3Label ?? 'Parcel',
          autoNumber: Boolean(data?.autoNumber),
          planningEfficiency: data?.planningEfficiency != null ? Number(data.planningEfficiency) : null
        };
        setSettings(normalized);
        setEfficiencyInput(
          normalized.planningEfficiency != null ? (normalized.planningEfficiency * 100).toFixed(1) : ''
        );
        setHasChanges(false);
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
        await mutate(`/api/projects/${projectId}`);

        // Don't reload settings - trust our local state to avoid race conditions
        // The mutations above will ensure other components see the updated values

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

  const handleEfficiencyChange = (value: string) => {
    setEfficiencyInput(value);
    const numeric = Number(value);
    const efficiencyValue = Number.isFinite(numeric) ? numeric / 100 : null;

    // Update local state immediately for instant UI feedback
    const updatedSettings = { ...settings, planningEfficiency: efficiencyValue };
    setSettings(updatedSettings);

    // Clear existing timeout
    if (efficiencyTimeoutRef.current) {
      clearTimeout(efficiencyTimeoutRef.current);
    }

    // Debounce save to server (wait 800ms after user stops typing)
    efficiencyTimeoutRef.current = setTimeout(async () => {
      if (!projectId) {
        console.warn('Cannot save efficiency: no projectId');
        return;
      }

      console.log('Saving planning efficiency:', { value, numeric, efficiencyValue, updatedSettings });

      try {
        const response = await fetch(`/api/project/granularity-settings?project_id=${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedSettings)
        });

        if (response.ok) {
          console.log('Planning efficiency saved successfully');
          // Revalidate the project config via SWR to update DUA calculations everywhere
          await mutate(`/api/projects/${projectId}/config`);

          // Show brief success indicator
          const indicator = document.createElement('div');
          indicator.className = 'fixed top-20 right-4 bg-green-500 text-white px-3 py-1.5 rounded shadow-lg z-50 text-sm';
          indicator.textContent = '✓ Efficiency saved';
          document.body.appendChild(indicator);
          setTimeout(() => {
            indicator.style.opacity = '0';
            indicator.style.transition = 'opacity 200ms';
            setTimeout(() => indicator.remove(), 200);
          }, 1500);
        } else {
          console.error('Failed to save efficiency: HTTP', response.status);
          alert('Failed to save planning efficiency. Please try again.');
        }
      } catch (error) {
        console.error('Failed to save planning efficiency:', error);
        alert('Error saving planning efficiency. Check console for details.');
      }
    }, 800);
  };

  if (loading) {
    return (
      <div className="rounded border" style={{ backgroundColor: 'var(--cui-card-bg)', borderColor: 'var(--cui-border-color)' }}>
        <div className="px-3 py-2 border-b" style={{ backgroundColor: 'var(--surface-card-header)', borderColor: 'var(--cui-border-color)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--cui-body-color)' }}>Planning Overview</h2>
        </div>
        <div className="p-6 text-center" style={{ color: 'var(--cui-body-color)' }}>
          Loading...
        </div>
      </div>
    );
  }

  const tileStyle: React.CSSProperties = {
    border: '1px solid var(--cui-border-color)',
    borderRadius: '16px',
    backgroundColor: 'var(--surface-card)',
    boxShadow: '0 1px 3px rgba(15,23,42,0.08)'
  }

  return (
    <div className="rounded border" style={{ backgroundColor: 'var(--cui-card-bg)', borderColor: 'var(--cui-border-color)' }}>
      <div className="px-3 py-2 border-b" style={{ backgroundColor: 'var(--surface-card-header)', borderColor: 'var(--cui-border-color)' }}>
        <h2 className="text-base font-semibold" style={{ color: 'var(--cui-body-color)' }}>Planning Overview</h2>
      </div>

      <div className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
              Configure hierarchy labels, numbering, and efficiency guidance for this project.
            </p>
          </div>
          {hasChanges && (
            <span className="text-xs font-medium" style={{ color: 'var(--cui-warning)' }}>
              Unsaved changes
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Guidance tile */}
          <section className="p-4 space-y-3" style={tileStyle}>
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--cui-secondary-color)' }}>
              Guidance
            </h3>
            <p className="text-sm" style={{ color: 'var(--cui-body-color)' }}>
              Level labels cascade throughout filters, tables, and reports. Keep naming concise and consistent with your project taxonomy.
            </p>
            <ul className="text-xs space-y-1" style={{ color: 'var(--cui-secondary-color)' }}>
              <li>• Level 1: Areas, Villages, Districts</li>
              <li>• Level 2: Phases, Stages, Blocks</li>
              <li>• Level 3: Parcels, Lots, Units</li>
            </ul>
          </section>

          {/* Hierarchy tile */}
          <section className="p-4 space-y-3" style={tileStyle}>
              <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--cui-secondary-color)' }}>
                Hierarchy
              </h3>

            {[1, 2, 3].map((level) => {
              const key = (`level${level}Label`) as keyof GranularitySettings;
              const enabledKey = (`level${level}Enabled`) as keyof GranularitySettings;
              const isLevel3 = level === 3;
              const enabled = isLevel3 ? true : (settings[enabledKey] as boolean);
              const options = LABEL_OPTIONS[`level${level as 1|2|3}`];

              return (
                <div key={level} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => !isLevel3 && updateSetting(enabledKey, e.target.checked)}
                    disabled={isLevel3}
                    className="w-4 h-4 rounded flex-shrink-0"
                    style={{ accentColor: 'var(--cui-primary)', cursor: isLevel3 ? 'not-allowed' : 'pointer' }}
                  />
                  <div className="flex-1 flex items-center gap-2">
                    <label className="text-xs font-medium w-16" style={{ color: 'var(--cui-body-color)' }}>
                      Level {level}{isLevel3 && <span className="text-[10px] text-slate-400"> (req)</span>}
                    </label>
                    <select
                      value={settings[key] as string}
                      onChange={(e) => updateSetting(key, e.target.value)}
                      disabled={!enabled}
                      className="h-10 flex-1 max-w-[220px] rounded border px-2 text-sm"
                      style={{
                        borderColor: 'var(--cui-border-color)',
                        backgroundColor: enabled ? 'var(--cui-body-bg)' : 'rgb(243,244,246)',
                        color: 'var(--cui-body-color)',
                        cursor: enabled ? 'pointer' : 'not-allowed'
                      }}
                    >
                      {options.map((label) => (
                        <option key={label} value={label}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )
            })}
            {hasChanges && (
              <div className="mt-3">
                <button
                  onClick={handleSave}
                  className="w-full px-4 py-2 text-sm font-medium text-white rounded-md transition-colors"
                  style={{
                    backgroundColor: 'var(--cui-primary)',
                    cursor: 'pointer'
                  }}
                >
                  {saving ? 'Applying...' : 'Apply Changes'}
                </button>
              </div>
            )}
          </section>

          {/* Other Parcel Standards tile */}
          <section className="p-4 space-y-4" style={tileStyle}>
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--cui-secondary-color)' }}>
              Other Parcel Standards
            </h3>
            <div className="space-y-3 group">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: 'var(--cui-body-color)' }}>
                  Autonumber Parcels
                </span>
                <div className="scale-125">
                  <CFormSwitch
                    id="auto-number-switch"
                    checked={settings.autoNumber}
                    onChange={(e) => updateSetting('autoNumber', (e.target as HTMLInputElement).checked)}
                  />
                </div>
              </div>
              <p className="text-xs opacity-0 transition-opacity duration-150 group-hover:opacity-100" style={{ color: 'var(--cui-secondary-color)' }}>
                Automatically assign sequential parcel IDs based on your hierarchy selections.
              </p>
              {settings.autoNumber && (
                <p className="text-xs font-medium opacity-0 transition-opacity duration-150 group-hover:opacity-100" style={{ color: 'var(--cui-warning)' }}>
                  Auto-number is coming soon.
                </p>
              )}
            </div>
            <div className="space-y-2 group">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium" style={{ color: 'var(--cui-body-color)' }}>
                  Planning Efficiency
                </label>
                <div className="relative h-10 w-20">
                  <input
                    type="number"
                    min="0"
                    max="150"
                    value={efficiencyInput}
                    onChange={(e) => handleEfficiencyChange(e.target.value)}
                    placeholder="75"
                    className="h-full w-full rounded border px-2 text-sm text-center font-semibold"
                    style={{
                      borderColor: 'var(--cui-border-color)',
                      backgroundColor: 'var(--cui-body-bg)',
                      color: 'var(--cui-body-color)'
                    }}
                  />
                  <span
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold"
                    style={{ color: 'var(--cui-secondary-color)' }}
                  >
                    %
                  </span>
                </div>
              </div>
              <p className="text-xs opacity-0 transition-opacity duration-150 group-hover:opacity-100" style={{ color: 'var(--cui-secondary-color)' }}>
                Accounts for rights-of-way, open space, drainage, and other site constraints when computing density.
              </p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
