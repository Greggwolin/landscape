'use client';

import React, { useState, useEffect } from 'react';
import { ComplexityTier } from '@/contexts/ComplexityModeContext';
import { StepRateTable, StepRow } from './StepRateTable';

interface MarketRatesTabProps {
  mode: ComplexityTier;
  projectId: number;
}

type CardType = 'inflation' | 'growth' | 'absorption';

interface CardConfig {
  id: CardType;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  rateLabel: string;
  rateUnit: string;
  defaultValue: string;
}

export function MarketRatesTab({ mode, projectId }: MarketRatesTabProps) {
  const [prototypeNotes, setPrototypeNotes] = useState<string>('');
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesMessage, setNotesMessage] = useState<string>('');

  // Step data for each card type
  const [inflationSteps, setInflationSteps] = useState<StepRow[]>([]);
  const [growthSteps, setGrowthSteps] = useState<StepRow[]>([]);
  const [absorptionSteps, setAbsorptionSteps] = useState<StepRow[]>([]);

  // Preset selections
  const [inflationPreset, setInflationPreset] = useState<string>('Custom 1');
  const [growthPreset, setGrowthPreset] = useState<string>('Custom 1');
  const [vacancyPreset, setVacancyPreset] = useState<string>('Custom 1');

  // Track which preset is active (base rate or custom)
  const [inflationUseCustom, setInflationUseCustom] = useState<boolean>(true);
  const [growthUseCustom, setGrowthUseCustom] = useState<boolean>(true);
  const [vacancyUseCustom, setVacancyUseCustom] = useState<boolean>(true);

  // Card configurations
  const cards: CardConfig[] = [
    {
      id: 'inflation',
      title: 'Inflation:',
      subtitle: 'OpEx',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      rateLabel: 'Inflation Rate',
      rateUnit: '%',
      defaultValue: '2.75%'
    },
    {
      id: 'growth',
      title: 'Growth:',
      subtitle: 'Rent Rates',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      rateLabel: 'Growth Rate',
      rateUnit: '%',
      defaultValue: '3.8%'
    },
    {
      id: 'absorption',
      title: 'Market Vacancy',
      subtitle: '',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      rateLabel: 'Vacancy Rate',
      rateUnit: '%',
      defaultValue: '6.1%'
    }
  ];

  // Initialize default steps
  useEffect(() => {
    // Default inflation steps
    setInflationSteps([
      { step: 1, fromPeriod: 1, rate: 2.0, periods: 16, thruPeriod: 16 },
      { step: 2, fromPeriod: 17, rate: 3.0, periods: 24, thruPeriod: 40 },
      { step: 3, fromPeriod: 41, rate: 2.5, periods: 20, thruPeriod: 60 },
      { step: 4, fromPeriod: 61, rate: 2.0, periods: null, thruPeriod: 180 }
    ]);

    // Default growth steps
    setGrowthSteps([
      { step: 1, fromPeriod: 1, rate: 4.5, periods: 12, thruPeriod: 12 },
      { step: 2, fromPeriod: 13, rate: 3.8, periods: 24, thruPeriod: 36 },
      { step: 3, fromPeriod: 37, rate: 3.2, periods: 24, thruPeriod: 60 }
    ]);

    // Default vacancy steps (percentages)
    setAbsorptionSteps([
      { step: 1, fromPeriod: 1, rate: 8.0, periods: 24, thruPeriod: 24 },
      { step: 2, fromPeriod: 25, rate: 6.0, periods: 36, thruPeriod: 60 },
      { step: 3, fromPeriod: 61, rate: 5.0, periods: 24, thruPeriod: 84 },
      { step: 4, fromPeriod: 85, rate: 4.5, periods: null, thruPeriod: 180 }
    ]);
  }, []);

  // Load prototype notes
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const response = await fetch('/api/prototypes/notes?prototypeId=multifam-market-rates');
        if (response.ok) {
          const notes = await response.json();
          if (notes.length > 0) {
            setPrototypeNotes(notes[0].note);
          }
        }
      } catch (err) {
        console.error('Failed to load notes:', err);
      }
    };
    loadNotes();
  }, []);

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    setNotesMessage('');
    try {
      const response = await fetch('/api/prototypes/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prototypeId: 'multifam-market-rates',
          note: prototypeNotes
        })
      });

      if (response.ok) {
        setNotesMessage('Notes saved successfully!');
        setTimeout(() => setNotesMessage(''), 3000);
      } else {
        setNotesMessage('Failed to save notes');
      }
    } catch (err) {
      console.error('Failed to save notes:', err);
      setNotesMessage('Error saving notes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Recalculate from/thru periods when rate or periods change
  const recalculateSteps = (steps: StepRow[]): StepRow[] => {
    let cumulativePeriod = 0;

    return steps.map((step, index) => {
      const fromPeriod = index === 0 ? 1 : cumulativePeriod + 1;
      const periods = step.periods;
      const thruPeriod = periods === null ? 180 : fromPeriod + periods - 1; // 180 = end of analysis

      if (periods !== null) {
        cumulativePeriod = thruPeriod;
      }

      return {
        ...step,
        fromPeriod,
        thruPeriod
      };
    });
  };

  const handleUpdateStep = (
    cardType: CardType,
    stepIndex: number,
    field: 'rate' | 'periods',
    value: number | null
  ) => {
    const updateFn = (prevSteps: StepRow[]) => {
      const newSteps = [...prevSteps];
      newSteps[stepIndex] = {
        ...newSteps[stepIndex],
        [field]: value
      };
      return recalculateSteps(newSteps);
    };

    if (cardType === 'inflation') {
      setInflationSteps(updateFn);
    } else if (cardType === 'growth') {
      setGrowthSteps(updateFn);
    } else if (cardType === 'absorption') {
      setAbsorptionSteps(updateFn);
    }
  };

  const renderCard = (config: CardConfig) => {
    const steps = config.id === 'inflation' ? inflationSteps :
                  config.id === 'growth' ? growthSteps :
                  absorptionSteps;

    const preset = config.id === 'inflation' ? inflationPreset :
                   config.id === 'growth' ? growthPreset :
                   vacancyPreset;

    const setPreset = config.id === 'inflation' ? setInflationPreset :
                      config.id === 'growth' ? setGrowthPreset :
                      setVacancyPreset;

    const useCustom = config.id === 'inflation' ? inflationUseCustom :
                      config.id === 'growth' ? growthUseCustom :
                      vacancyUseCustom;

    const setUseCustom = config.id === 'inflation' ? setInflationUseCustom :
                         config.id === 'growth' ? setGrowthUseCustom :
                         setVacancyUseCustom;

    return (
      <div key={config.id} className="bg-gray-800 rounded border border-gray-700 overflow-hidden">
        {/* Card Header */}
        <div className="px-4 py-3 border-b border-gray-700 bg-gray-900">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="text-purple-400">
                {config.icon}
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  {config.title} {config.subtitle && <span className="text-gray-300">{config.subtitle}</span>}
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-purple-400">{config.defaultValue}</span>
              <button
                onClick={() => setUseCustom(!useCustom)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  useCustom
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                {useCustom ? 'Custom' : 'Base'}
              </button>
            </div>
          </div>

          {/* Preset Name (only show when custom is selected) */}
          {useCustom && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400">Name:</label>
                <input
                  type="text"
                  value={preset}
                  onChange={(e) => setPreset(e.target.value)}
                  className="bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-white text-sm w-48"
                />
                <button className="px-3 py-1.5 text-xs font-medium rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                  Save
                </button>
                <button className="px-3 py-1.5 text-xs font-medium rounded bg-red-600 hover:bg-red-700 text-white transition-colors">
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Step Table (only show when custom is selected) */}
        {useCustom && (
          <StepRateTable
            steps={steps}
            onUpdateStep={(stepIndex, field, value) => handleUpdateStep(config.id, stepIndex, field, value)}
            rateUnit={config.rateUnit}
          />
        )}
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4 bg-gray-950 min-h-screen">
      {/* Page Title with Notes Button */}
      <div className="bg-gray-800 rounded border border-gray-700 p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Market Rates - Prototype</h2>
          <button
            onClick={() => setShowNotesModal(true)}
            className={`px-3 py-2 text-white text-sm rounded transition-colors flex items-center gap-2 relative ${
              prototypeNotes
                ? 'bg-blue-700 hover:bg-blue-600'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {prototypeNotes && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
            )}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {prototypeNotes ? 'Edit Notes' : 'Add Notes'}
          </button>
        </div>
      </div>

      {/* Three Card Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {cards.map(card => renderCard(card))}
      </div>

      {/* Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNotesModal(false)}>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Prototype Notes</h3>
              <button
                onClick={() => setShowNotesModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Add notes about this prototype (saved to JSON file for export)
              </label>
              <textarea
                value={prototypeNotes}
                onChange={(e) => setPrototypeNotes(e.target.value)}
                className="w-full h-64 px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your notes here..."
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {notesMessage && (
                  <span className={`text-sm ${notesMessage.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
                    {notesMessage}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNotesModal(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSavingNotes ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
