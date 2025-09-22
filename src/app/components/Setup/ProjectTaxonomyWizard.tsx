'use client';

import React, { useState, useEffect } from 'react';
import { DensityClassification } from '../../../types/landuse';

interface ProjectTaxonomyWizardProps {
  projectId: number;
  onComplete: () => void;
  onCancel: () => void;
}

interface WizardStep {
  id: string;
  title: string;
  description: string;
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'choose-taxonomy',
    title: 'Choose Taxonomy',
    description: 'Select between global standard taxonomy or create a custom taxonomy'
  },
  {
    id: 'density-standards',
    title: 'Density Standards',
    description: 'Configure density classifications (VLDR, LDR, MDR, HDR)'
  },
  {
    id: 'jurisdiction-integration',
    title: 'Jurisdiction Integration',
    description: 'AI-powered mapping to local jurisdictional requirements (future feature)'
  },
  {
    id: 'review-apply',
    title: 'Review & Apply',
    description: 'Review configuration and apply to project'
  }
];

const ProjectTaxonomyWizard: React.FC<ProjectTaxonomyWizardProps> = ({
  projectId,
  onComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [taxonomyType, setTaxonomyType] = useState<'global' | 'custom'>('global');
  const [densityClassifications, setDensityClassifications] = useState<DensityClassification[]>([]);
  const [customDensities, setCustomDensities] = useState<Partial<DensityClassification>[]>([]);
  const [loading, setLoading] = useState(false);

  // Load default density classifications
  useEffect(() => {
    loadDensityClassifications();
  }, []);

  const loadDensityClassifications = async () => {
    try {
      const response = await fetch('/api/density-classifications?active=true');
      if (response.ok) {
        const data = await response.json();
        setDensityClassifications(data);
        // Initialize custom densities with existing ones
        setCustomDensities(data.map((d: DensityClassification) => ({ ...d })));
      }
    } catch (error) {
      console.error('Failed to load density classifications:', error);
    }
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Save project taxonomy configuration
      const configData = {
        projectId,
        taxonomyType,
        densityClassifications: taxonomyType === 'custom' ? customDensities : densityClassifications
      };

      // Note: This would need a proper API endpoint to save project taxonomy config
      console.log('Project taxonomy configuration:', configData);

      // For now, just complete the wizard
      onComplete();
    } catch (error) {
      console.error('Failed to save taxonomy configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const addCustomDensity = () => {
    setCustomDensities([
      ...customDensities,
      {
        code: '',
        name: '',
        description: '',
        min_density: 0,
        max_density: 0,
        units: 'units/acre',
        active: true
      }
    ]);
  };

  const updateCustomDensity = (index: number, field: string, value: any) => {
    const updated = [...customDensities];
    updated[index] = { ...updated[index], [field]: value };
    setCustomDensities(updated);
  };

  const removeCustomDensity = (index: number) => {
    setCustomDensities(customDensities.filter((_, i) => i !== index));
  };

  const renderStepContent = () => {
    switch (WIZARD_STEPS[currentStep].id) {
      case 'choose-taxonomy':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-4">
                Choose Your Land Use Taxonomy Approach
              </h3>
              <div className="space-y-4">
                <label className="flex items-start space-x-3 p-4 border border-gray-600 rounded-lg cursor-pointer hover:border-blue-500">
                  <input
                    type="radio"
                    name="taxonomy-type"
                    value="global"
                    checked={taxonomyType === 'global'}
                    onChange={(e) => setTaxonomyType(e.target.value as 'global')}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-white">Global Standard Taxonomy</div>
                    <div className="text-sm text-gray-400">
                      Use industry-standard land use classifications with predefined density ranges.
                      Best for projects following conventional development patterns.
                    </div>
                  </div>
                </label>

                <label className="flex items-start space-x-3 p-4 border border-gray-600 rounded-lg cursor-pointer hover:border-blue-500">
                  <input
                    type="radio"
                    name="taxonomy-type"
                    value="custom"
                    checked={taxonomyType === 'custom'}
                    onChange={(e) => setTaxonomyType(e.target.value as 'custom')}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-white">Custom Taxonomy</div>
                    <div className="text-sm text-gray-400">
                      Create project-specific classifications tailored to your development requirements
                      and local market conditions.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        );

      case 'density-standards':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-4">
                {taxonomyType === 'global' ? 'Review' : 'Configure'} Density Standards
              </h3>

              {taxonomyType === 'global' && (
                <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
                  <p className="text-sm text-blue-300">
                    These are the standard density classifications that will be used for your project.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {(taxonomyType === 'global' ? densityClassifications : customDensities).map((density, index) => (
                  <div key={index} className="border border-gray-600 rounded-lg p-4">
                    {taxonomyType === 'custom' ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Code
                          </label>
                          <input
                            type="text"
                            value={density.code || ''}
                            onChange={(e) => updateCustomDensity(index, 'code', e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                            placeholder="e.g., LDR"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Name
                          </label>
                          <input
                            type="text"
                            value={density.name || ''}
                            onChange={(e) => updateCustomDensity(index, 'name', e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                            placeholder="e.g., Low Density Residential"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Min Density
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={density.min_density || ''}
                            onChange={(e) => updateCustomDensity(index, 'min_density', parseFloat(e.target.value) || 0)}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Max Density
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={density.max_density || ''}
                            onChange={(e) => updateCustomDensity(index, 'max_density', parseFloat(e.target.value) || 0)}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Description
                          </label>
                          <input
                            type="text"
                            value={density.description || ''}
                            onChange={(e) => updateCustomDensity(index, 'description', e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                            placeholder="Optional description"
                          />
                        </div>
                        <div className="col-span-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeCustomDensity(index)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-white">
                            {density.name} ({density.code})
                          </div>
                          <div className="text-sm text-gray-400">
                            {density.min_density} - {density.max_density} {density.units}
                          </div>
                          {density.description && (
                            <div className="text-xs text-gray-500 mt-1">
                              {density.description}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {taxonomyType === 'custom' && (
                  <button
                    type="button"
                    onClick={addCustomDensity}
                    className="w-full border-2 border-dashed border-gray-600 rounded-lg p-4 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                  >
                    + Add Density Classification
                  </button>
                )}
              </div>
            </div>
          </div>
        );

      case 'jurisdiction-integration':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-4">
                Jurisdiction Integration
              </h3>

              <div className="p-6 bg-gray-700 border border-gray-600 rounded-lg text-center">
                <div className="text-gray-400 mb-2">🚧 Coming Soon</div>
                <div className="text-lg font-medium text-white mb-2">
                  AI-Powered Jurisdictional Mapping
                </div>
                <div className="text-sm text-gray-400">
                  This feature will automatically map your land use taxonomy to local jurisdictional
                  requirements and zoning codes using AI-powered analysis.
                </div>
              </div>
            </div>
          </div>
        );

      case 'review-apply':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-4">
                Review & Apply Configuration
              </h3>

              <div className="space-y-4">
                <div className="bg-gray-700 border border-gray-600 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-2">Configuration Summary</h4>
                  <div className="text-sm text-gray-300 space-y-1">
                    <div>Project ID: {projectId}</div>
                    <div>Taxonomy Type: {taxonomyType === 'global' ? 'Global Standard' : 'Custom'}</div>
                    <div>
                      Density Classifications: {
                        (taxonomyType === 'global' ? densityClassifications : customDensities).length
                      } configured
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <div className="text-yellow-400 text-sm">⚠️</div>
                    <div className="text-sm text-yellow-300">
                      <div className="font-medium mb-1">Important:</div>
                      <div>
                        Applying this configuration will update your project's land use taxonomy system.
                        Existing parcels may need to be migrated to the new structure.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-[800px] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-700 px-6 py-4">
          <h2 className="text-xl font-semibold text-white">Project Taxonomy Setup</h2>
          <p className="text-sm text-gray-400 mt-1">
            Configure land use taxonomy for your development project
          </p>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex items-center space-x-4">
            {WIZARD_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index === currentStep
                      ? 'bg-blue-600 text-white'
                      : index < currentStep
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-600 text-gray-300'
                  }`}
                >
                  {index < currentStep ? '✓' : index + 1}
                </div>
                {index < WIZARD_STEPS.length - 1 && (
                  <div
                    className={`w-12 h-0.5 ${
                      index < currentStep ? 'bg-green-600' : 'bg-gray-600'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2">
            <div className="font-medium text-white">{WIZARD_STEPS[currentStep].title}</div>
            <div className="text-sm text-gray-400">{WIZARD_STEPS[currentStep].description}</div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {renderStepContent()}
        </div>

        {/* Actions */}
        <div className="border-t border-gray-700 px-6 py-4 flex justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600"
          >
            Cancel
          </button>

          <div className="flex space-x-3">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrevious}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600"
              >
                Previous
              </button>
            )}

            {currentStep < WIZARD_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Applying...' : 'Apply Configuration'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectTaxonomyWizard;