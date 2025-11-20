'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, AlertTriangle, ArrowRight, Plus } from 'lucide-react';

interface UnmatchedCode {
  code: string;
  parcel_count: number;
  needs_mapping: true;
}

interface AvailableCode {
  code: string;
  name: string;
  subtype_id: number | null;
  available_for_mapping: true;
}

interface MappingAnalysis {
  analysis: {
    total_parcel_codes: number;
    total_system_codes: number;
    matched_codes: number;
    unmatched_parcel_codes: number;
    unused_system_codes: number;
  };
  unmatched_parcel_codes: UnmatchedCode[];
  unused_system_codes: AvailableCode[];
  matched_codes: Array<{
    code: string;
    parcel_count: string;
    status: string;
  }>;
}

interface LandUseMatchWizardProps {
  projectId?: number;
  onClose: () => void;
  onComplete: () => void;
}

const LandUseMatchWizard: React.FC<LandUseMatchWizardProps> = ({
  projectId,
  onClose,
  onComplete
}) => {
  const [analysis, setAnalysis] = useState<MappingAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [mappings, setMappings] = useState<Record<string, {
    action: 'map' | 'create';
    target?: string;
    newData?: {
      name: string;
      landuse_type: string;
      description: string;
      subtype_id: number | null;
    };
  }>>({});

  useEffect(() => {
    loadAnalysis();
  }, [projectId]);

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      const url = projectId 
        ? `/api/landuse/mapping?action=analyze&project_id=${projectId}`
        : `/api/landuse/mapping?action=analyze`;
      
      const response = await fetch(url);
      const data = await response.json();
      setAnalysis(data);
    } catch (error) {
      console.error('Error loading land use analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMapping = (legacyCode: string, action: 'map' | 'create', target?: string) => {
    setMappings(prev => ({
      ...prev,
      [legacyCode]: {
        action,
        target,
        newData: action === 'create' ? {
          name: legacyCode,
          landuse_type: '',
          description: '',
          subtype_id: null
        } : undefined
      }
    }));
  };

  const updateNewLandUseData = (legacyCode: string, field: string, value: any) => {
    setMappings(prev => ({
      ...prev,
      [legacyCode]: {
        ...prev[legacyCode],
        newData: {
          ...prev[legacyCode].newData!,
          [field]: value
        }
      }
    }));
  };

  const processMapping = async (legacyCode: string) => {
    const mapping = mappings[legacyCode];
    if (!mapping) return false;

    try {
      const response = await fetch('/api/landuse/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legacy_code: legacyCode,
          target_landuse_id: mapping.action === 'map' ? mapping.target : null,
          create_new: mapping.action === 'create',
          new_landuse_data: mapping.newData
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Error processing mapping:', error);
      return false;
    }
  };

  const processAllMappings = async () => {
    if (!analysis) return;

    setLoading(true);
    const results = [];
    
    for (const unmatchedCode of analysis.unmatched_parcel_codes) {
      const success = await processMapping(unmatchedCode.code);
      results.push({ code: unmatchedCode.code, success });
    }

    setLoading(false);
    
    const allSuccessful = results.every(r => r.success);
    if (allSuccessful) {
      onComplete();
    } else {
      // Show error message
      console.error('Some mappings failed:', results);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 w-96">
          <div className="text-center text-white">
            <div className="text-lg mb-2">Analyzing Land Use Codes...</div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 w-96">
          <div className="text-center text-white">
            <AlertTriangle className="mx-auto mb-4 text-yellow-500" size={48} />
            <div className="text-lg mb-2">Failed to Load Analysis</div>
            <button
              onClick={onClose}
              className="btn btn-secondary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If no unmatched codes, show success message
  if (analysis.unmatched_parcel_codes.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 w-96">
          <div className="text-center text-white">
            <Check className="mx-auto mb-4 text-green-500" size={48} />
            <div className="text-lg mb-2">All Land Use Codes Matched!</div>
            <div className="text-sm text-gray-400 mb-4">
              All {analysis.analysis.matched_codes} land use codes from your parcels 
              are already mapped to the land use management system.
            </div>
            <button
              onClick={onClose}
              className="btn btn-success"
            >
              Perfect!
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-white">Land Use Code Mapping Wizard</h2>
            <p className="text-gray-400 text-sm">
              Map legacy parcel codes to your structured land use system
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-sm btn-ghost-secondary"
            aria-label="Close wizard"
          >
            <X size={24} />
          </button>
        </div>

        {/* Analysis Summary */}
        <div className="mb-6 p-4 bg-gray-900 rounded-lg">
          <h3 className="text-lg font-medium text-white mb-3">Analysis Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Total Parcel Codes</div>
              <div className="text-white font-semibold">{analysis.analysis.total_parcel_codes}</div>
            </div>
            <div>
              <div className="text-gray-400">Matched Codes</div>
              <div className="text-green-400 font-semibold">{analysis.analysis.matched_codes}</div>
            </div>
            <div>
              <div className="text-gray-400">Need Mapping</div>
              <div className="text-yellow-400 font-semibold">{analysis.analysis.unmatched_parcel_codes}</div>
            </div>
            <div>
              <div className="text-gray-400">Available in System</div>
              <div className="text-blue-400 font-semibold">{analysis.analysis.unused_system_codes}</div>
            </div>
          </div>
        </div>

        {/* Unmatched Codes */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">Map Unmatched Codes</h3>
          
          {analysis.unmatched_parcel_codes.map((unmatchedCode) => (
            <div key={unmatchedCode.code} className="p-4 bg-gray-900 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-white font-medium">{unmatchedCode.code}</span>
                  <span className="text-gray-400 ml-2">
                    ({unmatchedCode.parcel_count} parcels)
                  </span>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMapping(unmatchedCode.code, 'map')}
                    className={`btn btn-sm ${
                      mappings[unmatchedCode.code]?.action === 'map'
                        ? 'btn-primary'
                        : 'btn-secondary'
                    }`}
                  >
                    Map to Existing
                  </button>
                  <button
                    onClick={() => handleMapping(unmatchedCode.code, 'create')}
                    className={`btn btn-sm ${
                      mappings[unmatchedCode.code]?.action === 'create'
                        ? 'btn-success'
                        : 'btn-secondary'
                    }`}
                  >
                    Create New
                  </button>
                </div>
              </div>

              {/* Mapping Options */}
              {mappings[unmatchedCode.code]?.action === 'map' && (
                <div className="mt-3">
                  <select
                    value={mappings[unmatchedCode.code]?.target || ''}
                    onChange={(e) => handleMapping(unmatchedCode.code, 'map', e.target.value)}
                    className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                  >
                    <option value="">Select existing land use code...</option>
                    {analysis.unused_system_codes.map((code) => (
                      <option key={code.code} value={code.code}>
                        {code.code} - {code.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {mappings[unmatchedCode.code]?.action === 'create' && (
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Display Name"
                      value={mappings[unmatchedCode.code]?.newData?.name || ''}
                      onChange={(e) => updateNewLandUseData(unmatchedCode.code, 'name', e.target.value)}
                      className="p-2 bg-gray-800 border border-gray-600 rounded text-white"
                    />
                    <input
                      type="text"
                      placeholder="Land Use Type"
                      value={mappings[unmatchedCode.code]?.newData?.landuse_type || ''}
                      onChange={(e) => updateNewLandUseData(unmatchedCode.code, 'landuse_type', e.target.value)}
                      className="p-2 bg-gray-800 border border-gray-600 rounded text-white"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={mappings[unmatchedCode.code]?.newData?.description || ''}
                    onChange={(e) => updateNewLandUseData(unmatchedCode.code, 'description', e.target.value)}
                    className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={processAllMappings}
            disabled={Object.keys(mappings).length === 0}
            className="btn btn-primary d-flex align-items-center gap-2"
          >
            <ArrowRight size={16} />
            Apply Mappings
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandUseMatchWizard;