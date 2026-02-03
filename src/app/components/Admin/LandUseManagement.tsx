'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Save, ChevronRight, ChevronDown, Settings } from 'lucide-react';
import { SemanticButton } from '@/components/ui/landscape';

// Type definitions
interface Family {
  family_id: number;
  name: string;
  ord: number;
  active: boolean;
  notes?: string;
}

interface Subtype {
  subtype_id: number;
  family_id: number;
  code: string;
  name: string;
  ord: number;
  active: boolean;
  notes?: string;
}

interface LandUse {
  landuse_id: number;
  subtype_id: number;
  landuse_code: string;
  landuse_type: string;
  name: string;
  description?: string;
  active: boolean;
  has_programming?: boolean;
  has_zoning?: boolean;
}

interface Programming {
  landuse_code: string;
  rsf_to_gfa_eff?: number;
  employee_density?: number;
  floor_plate_efficiency?: number;
  clear_height_ft?: number;
  loading_dock_ratio?: number;
  truck_court_depth_ft?: number;
  trailer_parking_ratio?: number;
  dwelling_units_per_acre?: number;
  average_unit_size_sf?: number;
}

interface ZoningControl {
  landuse_code: string;
  site_coverage_pct?: number;
  site_far?: number;
  max_stories?: number;
  max_height_ft?: number;
  parking_ratio_per1000sf?: number;
  parking_stall_sf?: number;
  site_common_area_pct?: number;
  setback_front_ft?: number;
  setback_side_ft?: number;
  setback_rear_ft?: number;
}

const LandUseManagement: React.FC = () => {
  // State management
  const [families, setFamilies] = useState<Family[]>([]);
  const [subtypes, setSubtypes] = useState<Subtype[]>([]);
  const [landuses, setLanduses] = useState<LandUse[]>([]);
  const [programming, setProgramming] = useState<Programming | null>(null);
  const [zoningControl, setZoningControl] = useState<ZoningControl | null>(null);
  
  const [selectedFamily, setSelectedFamily] = useState<number | null>(null);
  const [selectedSubtype, setSelectedSubtype] = useState<number | null>(null);
  const [selectedLandUse, setSelectedLandUse] = useState<string | null>(null);
  const [expandedFamilies, setExpandedFamilies] = useState<Set<number>>(new Set());
  
  const [activeTab, setActiveTab] = useState<'programming' | 'zoning' | 'notes'>('programming');
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [needsInitialization, setNeedsInitialization] = useState(false);

  // Load initial data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [familiesRes, subtypesRes, landusesRes] = await Promise.all([
        fetch('/api/landuse/choices?type=families'),
        fetch('/api/landuse/choices?type=subtypes'),
        fetch('/api/landuse/choices?type=codes')
      ]);
      
      const familiesData = familiesRes.ok ? await familiesRes.json() : [];
      const subtypesData = subtypesRes.ok ? await subtypesRes.json() : [];
      const landusesData = landusesRes.ok ? await landusesRes.json() : [];
      
      // Ensure data is arrays
      setFamilies(Array.isArray(familiesData) ? familiesData : []);
      setSubtypes(Array.isArray(subtypesData) ? subtypesData : []);
      setLanduses(Array.isArray(landusesData) ? landusesData : []);
      
      // Auto-expand first family
      if (Array.isArray(familiesData) && familiesData.length > 0) {
        setExpandedFamilies(new Set([familiesData[0].family_id]));
      }
    } catch (error) {
      console.error('Error loading land use data:', error);
      // Set empty arrays on error
      setFamilies([]);
      setSubtypes([]);
      setLanduses([]);
      setNeedsInitialization(true);
    } finally {
      setLoading(false);
    }
  };

  // Initialize the land use system
  const initializeSystem = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/landuse/seed', { method: 'POST' });
      if (response.ok) {
        setNeedsInitialization(false);
        await loadAllData();
      } else {
        console.error('Failed to initialize land use system');
      }
    } catch (error) {
      console.error('Error initializing system:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load programming and zoning data for selected land use
  useEffect(() => {
    if (selectedLandUse) {
      loadDetailsForLandUse(selectedLandUse);
    }
  }, [selectedLandUse]);

  const loadDetailsForLandUse = async (landUseCode: string) => {
    try {
      const [progRes, zoningRes] = await Promise.all([
        fetch(`/api/landuse/programming?code=${landUseCode}`),
        fetch(`/api/landuse/zoning?code=${landUseCode}`)
      ]);
      
      const progData = progRes.ok ? await progRes.json() : null;
      const zoningData = zoningRes.ok ? await zoningRes.json() : null;
      
      setProgramming(progData);
      setZoningControl(zoningData);
    } catch (error) {
      console.error('Error loading land use details:', error);
    }
  };

  // Handlers
  const toggleFamily = (familyId: number) => {
    const newExpanded = new Set(expandedFamilies);
    if (newExpanded.has(familyId)) {
      newExpanded.delete(familyId);
    } else {
      newExpanded.add(familyId);
    }
    setExpandedFamilies(newExpanded);
  };

  const selectSubtype = (subtypeId: number) => {
    setSelectedSubtype(subtypeId);
    setSelectedLandUse(null);
    setProgramming(null);
    setZoningControl(null);
  };

  const selectLandUse = (landUseCode: string) => {
    setSelectedLandUse(landUseCode);
    setActiveTab('programming');
  };

  const getSubtypesForFamily = (familyId: number) => {
    return subtypes.filter(s => s.family_id === familyId && s.active);
  };

  const getLandUsesForSubtype = (subtypeId: number) => {
    return landuses.filter(l => l.subtype_id === subtypeId && l.active);
  };

  const getCompletionStatus = (landuse: LandUse) => {
    const hasProgram = landuse.has_programming;
    const hasZoning = landuse.has_zoning;
    
    if (hasProgram && hasZoning) return 'complete';
    if (hasProgram || hasZoning) return 'partial';
    return 'incomplete';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'bg-green-900 text-green-300';
      case 'partial': return 'bg-yellow-900 text-yellow-300';
      case 'incomplete': return 'bg-red-900 text-red-300';
      default: return 'bg-gray-700 text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded border border-gray-700 h-96 flex items-center justify-center">
        <div className="text-gray-400">Loading land use management...</div>
      </div>
    );
  }

  if (needsInitialization || families.length === 0) {
    return (
      <div className="bg-gray-800 rounded border border-gray-700">
        <div className="px-4 py-3 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Settings className="mr-2 w-5 h-5" />
            Land Use Management
          </h3>
        </div>
        <div className="p-8 text-center">
          <div className="text-gray-300 mb-4">
            Land Use Management system is not initialized yet.
          </div>
          <div className="text-sm text-gray-400 mb-6">
            This will create the database tables and populate them with default residential, 
            commercial, and industrial land use types with programming and zoning parameters.
          </div>
          <SemanticButton
            intent="primary-action"
            onClick={initializeSystem}
            disabled={loading}
          >
            {loading ? 'Initializing...' : 'Initialize Land Use System'}
          </SemanticButton>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded border border-gray-700">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <Settings className="mr-2 w-5 h-5" />
          Land Use Management
        </h3>
        <div className="flex gap-2">
          <SemanticButton intent="primary-action" size="sm" className="flex items-center">
            <Plus className="w-4 h-4 mr-1" />
            Import
          </SemanticButton>
          <SemanticButton intent="secondary-action" size="sm">
            Export
          </SemanticButton>
        </div>
      </div>

      <div className="flex h-96">
        {/* Panel 1: Family/Subtype Tree (30%) */}
        <div className="w-[30%] border-r border-gray-700 p-4 overflow-y-auto">
          <div className="mb-3 flex justify-between items-center">
            <h4 className="font-medium text-white text-sm">Hierarchy</h4>
            <button className="p-1 hover:bg-gray-700 rounded">
              <Plus className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          
          <div className="space-y-1">
            {families.map(family => (
              <div key={family.family_id}>
                <div 
                  className="flex items-center py-1 px-2 hover:bg-gray-700 rounded cursor-pointer"
                  onClick={() => toggleFamily(family.family_id)}
                >
                  {expandedFamilies.has(family.family_id) ? 
                    <ChevronDown className="w-4 h-4 text-gray-400 mr-1" /> :
                    <ChevronRight className="w-4 h-4 text-gray-400 mr-1" />
                  }
                  <span className="text-sm text-white font-medium">{family.name}</span>
                </div>
                
                {expandedFamilies.has(family.family_id) && (
                  <div className="ml-5 space-y-1">
                    {getSubtypesForFamily(family.family_id).map(subtype => (
                      <div
                        key={subtype.subtype_id}
                        className={`flex items-center py-1 px-2 rounded cursor-pointer text-sm ${
                          selectedSubtype === subtype.subtype_id 
                            ? 'bg-blue-900 text-blue-300' 
                            : 'hover:bg-gray-700 text-gray-300'
                        }`}
                        onClick={() => selectSubtype(subtype.subtype_id)}
                      >
                        <span className="font-medium mr-2">{subtype.code}</span>
                        <span>{subtype.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Panel 2: Land Use Codes (40%) */}
        <div className="w-[40%] border-r border-gray-700 p-4 overflow-y-auto">
          <div className="mb-3 flex justify-between items-center">
            <h4 className="font-medium text-white text-sm">Land Use Codes</h4>
            <button 
              className="p-1 hover:bg-gray-700 rounded"
              disabled={!selectedSubtype}
            >
              <Plus className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {selectedSubtype ? (
            <div className="space-y-1">
              {getLandUsesForSubtype(selectedSubtype).map(landuse => {
                const status = getCompletionStatus(landuse);
                return (
                  <div
                    key={landuse.landuse_code}
                    className={`p-2 border rounded cursor-pointer ${
                      selectedLandUse === landuse.landuse_code
                        ? 'border-blue-500 bg-blue-900/20'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                    onClick={() => selectLandUse(landuse.landuse_code)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-white text-sm">
                        {landuse.landuse_code}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(status)}`}>
                        {status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-300">{landuse.name}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {landuse.description}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-gray-400 text-center mt-8">
              Select a subtype to view land use codes
            </div>
          )}
        </div>

        {/* Panel 3: Programming Details (30%) */}
        <div className="w-[30%] p-4 overflow-y-auto">
          {selectedLandUse ? (
            <>
              <div className="mb-3">
                <h4 className="font-medium text-white text-sm mb-2">
                  Details: {selectedLandUse}
                </h4>
                <div className="flex space-x-1">
                  {(['programming', 'zoning', 'notes'] as const).map(tab => (
                    <button
                      key={tab}
                      className={`px-2 py-1 text-xs rounded ${
                        activeTab === tab
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {activeTab === 'programming' && (
                  <ProgrammingTab 
                    programming={programming} 
                    landUseCode={selectedLandUse}
                    onUpdate={loadDetailsForLandUse}
                  />
                )}
                
                {activeTab === 'zoning' && (
                  <ZoningTab 
                    zoning={zoningControl} 
                    landUseCode={selectedLandUse}
                    onUpdate={loadDetailsForLandUse}
                  />
                )}
                
                {activeTab === 'notes' && (
                  <NotesTab landUseCode={selectedLandUse} />
                )}
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-400 text-center mt-8">
              Select a land use code to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Programming Tab Component
const ProgrammingTab: React.FC<{
  programming: Programming | null;
  landUseCode: string;
  onUpdate: (code: string) => void;
}> = ({ programming, landUseCode, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Programming>>({});

  useEffect(() => {
    setFormData(programming || {});
    setIsEditing(false);
  }, [programming]);

  const handleSave = async () => {
    try {
      await fetch('/api/landuse/programming', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, landuse_code: landUseCode })
      });
      onUpdate(landUseCode);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving programming data:', error);
    }
  };

  const fields = [
    { key: 'rsf_to_gfa_eff', label: 'RSF to GFA Efficiency', suffix: '' },
    { key: 'employee_density', label: 'Employee Density', suffix: 'SF/emp' },
    { key: 'floor_plate_efficiency', label: 'Floor Plate Efficiency', suffix: '' },
    { key: 'clear_height_ft', label: 'Clear Height', suffix: 'ft' },
    { key: 'dwelling_units_per_acre', label: 'DU/Acre', suffix: 'DU/ac' },
    { key: 'average_unit_size_sf', label: 'Avg Unit Size', suffix: 'SF' },
    { key: 'loading_dock_ratio', label: 'Loading Dock Ratio', suffix: '/1000SF' },
    { key: 'truck_court_depth_ft', label: 'Truck Court Depth', suffix: 'ft' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-medium text-white">Programming</span>
        <button
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          className="p-1 hover:bg-gray-700 rounded"
        >
          {isEditing ? <Save className="w-4 h-4 text-green-400" /> : <Edit2 className="w-4 h-4 text-gray-400" />}
        </button>
      </div>

      <div className="space-y-2">
        {fields.map(field => (
          <div key={field.key}>
            <label className="text-xs text-gray-400 block mb-1">
              {field.label}
            </label>
            {isEditing ? (
              <input
                type="number"
                step="any"
                value={formData[field.key as keyof Programming] || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  [field.key]: e.target.value ? parseFloat(e.target.value) : null
                }))}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                placeholder={field.suffix}
              />
            ) : (
              <div className="px-2 py-1 bg-gray-900 border border-gray-600 rounded text-sm text-gray-300">
                {formData[field.key as keyof Programming] || '—'} {field.suffix}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Zoning Tab Component
const ZoningTab: React.FC<{
  zoning: ZoningControl | null;
  landUseCode: string;
  onUpdate: (code: string) => void;
}> = ({ zoning, landUseCode, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<ZoningControl>>({});

  useEffect(() => {
    setFormData(zoning || {});
    setIsEditing(false);
  }, [zoning]);

  const handleSave = async () => {
    try {
      await fetch('/api/landuse/zoning', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, landuse_code: landUseCode })
      });
      onUpdate(landUseCode);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving zoning data:', error);
    }
  };

  const fields = [
    { key: 'site_coverage_pct', label: 'Site Coverage', suffix: '%' },
    { key: 'site_far', label: 'Floor Area Ratio', suffix: '' },
    { key: 'max_stories', label: 'Max Stories', suffix: 'floors' },
    { key: 'max_height_ft', label: 'Max Height', suffix: 'ft' },
    { key: 'parking_ratio_per1000sf', label: 'Parking Ratio', suffix: '/1000SF' },
    { key: 'parking_stall_sf', label: 'Parking Stall Size', suffix: 'SF' },
    { key: 'site_common_area_pct', label: 'Common Area', suffix: '%' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-medium text-white">Zoning Controls</span>
        <button
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          className="p-1 hover:bg-gray-700 rounded"
        >
          {isEditing ? <Save className="w-4 h-4 text-green-400" /> : <Edit2 className="w-4 h-4 text-gray-400" />}
        </button>
      </div>

      <div className="space-y-2">
        {fields.map(field => (
          <div key={field.key}>
            <label className="text-xs text-gray-400 block mb-1">
              {field.label}
            </label>
            {isEditing ? (
              <input
                type="number"
                step="any"
                value={formData[field.key as keyof ZoningControl] || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  [field.key]: e.target.value ? parseFloat(e.target.value) : null
                }))}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                placeholder={field.suffix}
              />
            ) : (
              <div className="px-2 py-1 bg-gray-900 border border-gray-600 rounded text-sm text-gray-300">
                {formData[field.key as keyof ZoningControl] || '—'} {field.suffix}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Notes Tab Component
const NotesTab: React.FC<{ landUseCode: string }> = ({ landUseCode }) => {
  const [notes, setNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-medium text-white">Notes</span>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="p-1 hover:bg-gray-700 rounded"
        >
          <Edit2 className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {isEditing ? (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full h-32 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white resize-none"
          placeholder="Add notes for this land use..."
        />
      ) : (
        <div className="h-32 px-2 py-1 bg-gray-900 border border-gray-600 rounded text-sm text-gray-300 overflow-y-auto">
          {notes || 'No notes added.'}
        </div>
      )}
    </div>
  );
};

export default LandUseManagement;
