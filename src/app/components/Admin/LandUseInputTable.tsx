'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Save, X, Settings, ChevronDown, ChevronRight } from 'lucide-react';

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
  subtype_id: number | null;
  landuse_code: string;
  landuse_type: string;
  name: string;
  description?: string;
  active: boolean;
  has_programming?: boolean;
  has_zoning?: boolean;
}

interface LandUseRow {
  id: string;
  family_id: number | null;
  subtype_id: number | null;
  landuse_code: string | null;
  uom?: string;
  unit_price?: number;
  programming?: any;
  zoning?: any;
  isNew?: boolean;
}

interface SlideOutProps {
  type: 'family' | 'subtype' | 'landuse';
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  parentId?: number;
  families?: Family[];
  subtypes?: Subtype[];
}

// Slide-out form component
const SlideOutForm: React.FC<SlideOutProps> = ({ 
  type, 
  isOpen, 
  onClose, 
  onSave, 
  parentId, 
  families = [],
  subtypes = []
}) => {
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (isOpen) {
      setFormData({});
    }
  }, [isOpen, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  const renderFormFields = () => {
    switch (type) {
      case 'family':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Family Name
              </label>
              <input
                type="text"
                required
                value={String((formData as any).name ?? '')}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Residential, Commercial"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={String((formData as any).notes ?? '')}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Description of this land use family"
              />
            </div>
          </>
        );

      case 'subtype':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Parent Family
              </label>
              <select
                required
                value={String((formData as any).family_id ?? parentId ?? '')}
                onChange={(e) => setFormData(prev => ({ ...prev, family_id: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Family</option>
                {families.map(family => (
                  <option key={family.family_id} value={family.family_id}>
                    {family.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Subtype Code
              </label>
              <input
                type="text"
                required
                value={String((formData as any).code ?? '')}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., LDR, MDR, OFF"
                maxLength={10}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Subtype Name
              </label>
              <input
                type="text"
                required
                value={String((formData as any).name ?? '')}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Low Density Residential"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={String((formData as any).notes ?? '')}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Description and density ranges"
              />
            </div>
          </>
        );

      case 'landuse':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Parent Subtype
              </label>
              <select
                required
                value={String((formData as any).subtype_id ?? parentId ?? '')}
                onChange={(e) => setFormData(prev => ({ ...prev, subtype_id: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Subtype</option>
                {subtypes.map(subtype => (
                  <option key={subtype.subtype_id} value={subtype.subtype_id}>
                    {subtype.code} - {subtype.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Land Use Code
              </label>
              <input
                type="text"
                required
                value={String((formData as any).landuse_code ?? '')}
                onChange={(e) => setFormData(prev => ({ ...prev, landuse_code: e.target.value.toUpperCase() }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., SFD, MF, OFF"
                maxLength={10}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Land Use Name
              </label>
              <input
                type="text"
                required
                value={String((formData as any).name ?? '')}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Single Family Detached"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Land Use Type
              </label>
              <input
                type="text"
                value={String((formData as any).landuse_type ?? '')}
                onChange={(e) => setFormData(prev => ({ ...prev, landuse_type: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Residential, Commercial"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={String((formData as any).description ?? '')}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Detailed description of this land use"
              />
            </div>
          </>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-96 bg-gray-800 border-l border-gray-600 shadow-xl">
        <div className="flex flex-col h-full">
          <div className="px-6 py-4 border-b border-gray-600">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Add New {type.charAt(0).toUpperCase() + type.slice(1)}
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-700 rounded-full"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
            <div className="flex-1 px-6 py-4 overflow-y-auto">
              {renderFormFields()}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-600 bg-gray-900">
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Family-specific field configuration
const getFamilyFields = (familyName: string) => {
  const fieldGroups = {
    'Residential': {
      'Site Controls': ['site_coverage_pct', 'site_far', 'max_stories', 'max_height_ft', 'site_common_area_pct'],
      'Parking': ['parking_ratio_per1000sf', 'parking_stall_sf']
    },
    'Commercial': {
      'Building Parameters': ['rsf_to_gfa_eff', 'employee_density', 'floor_plate_efficiency'],
      'Site Controls': ['site_coverage_pct', 'site_far', 'max_stories', 'max_height_ft'],
      'Parking': ['parking_ratio_per1000sf', 'parking_stall_sf']
    },
    'Industrial': {
      'Building Parameters': ['rsf_to_gfa_eff', 'employee_density', 'clear_height_ft'],
      'Logistics': ['loading_dock_ratio', 'truck_court_depth_ft', 'trailer_parking_ratio'],
      'Site Controls': ['site_coverage_pct', 'site_far'],
      'Parking': ['parking_ratio_per1000sf']
    },
    'Institutional': {
      'Building Parameters': ['employee_density', 'floor_plate_efficiency'],
      'Site Controls': ['site_coverage_pct', 'site_far', 'max_stories', 'max_height_ft', 'site_common_area_pct'],
      'Parking': ['parking_ratio_per1000sf']
    },
    'Mixed Use': {
      'Building Parameters': ['rsf_to_gfa_eff', 'employee_density', 'floor_plate_efficiency'],
      'Site Controls': ['site_coverage_pct', 'site_far', 'max_stories', 'max_height_ft'],
      'Parking': ['parking_ratio_per1000sf']
    },
    'Open Space': {
      'Site Controls': ['site_coverage_pct', 'site_common_area_pct'],
      'Parking': ['parking_ratio_per1000sf', 'parking_stall_sf']
    }
  };
  
  return fieldGroups[familyName as keyof typeof fieldGroups] || {};
};

const fieldLabels: Record<string, string> = {
  'site_coverage_pct': 'Site Coverage %',
  'site_far': 'Floor Area Ratio',
  'max_stories': 'Max Stories',
  'max_height_ft': 'Max Height (ft)',
  'parking_ratio_per1000sf': 'Parking Ratio per 1000sf',
  'parking_stall_sf': 'Parking Stall sf',
  'site_common_area_pct': 'Site Common Area %',
  'rsf_to_gfa_eff': 'RSF to GFA Efficiency',
  'employee_density': 'Employee Density',
  'floor_plate_efficiency': 'Floor Plate Efficiency',
  'clear_height_ft': 'Clear Height (ft)',
  'loading_dock_ratio': 'Loading Dock Ratio',
  'truck_court_depth_ft': 'Truck Court Depth (ft)',
  'trailer_parking_ratio': 'Trailer Parking Ratio'
};

interface DetailsFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  row?: LandUseRow;
  families: Family[];
}

const DetailsFlyout: React.FC<DetailsFlyoutProps> = ({ isOpen, onClose, row, families }) => {
  const [formData, setFormData] = useState<Record<string, any>>({});

  if (!isOpen || !row) return null;

  const family = families.find(f => f.family_id === row.family_id);
  const familyName = family?.name || '';
  const fieldGroups = getFamilyFields(familyName);

  const renderFieldGroup = (groupName: string, fields: string[]) => (
    <div key={groupName} className="mb-6">
      <h4 className="text-sm font-medium text-gray-300 mb-3 border-b border-gray-600 pb-1">
        {groupName}
      </h4>
      <div className="grid grid-cols-1 gap-3">
        {fields.map(fieldKey => (
          <div key={fieldKey}>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              {fieldLabels[fieldKey] || fieldKey}
            </label>
            <input
              type="number"
              step="0.01"
              value={formData[fieldKey] || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, [fieldKey]: e.target.value }))}
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:ring-2 focus:ring-blue-500"
              placeholder="Enter value"
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-96 bg-gray-800 border-l border-gray-600 shadow-xl">
        <div className="flex flex-col h-full">
          <div className="px-6 py-4 border-b border-gray-600">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Land Use Details - {familyName}
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-700 rounded-full"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="text-sm text-gray-400 mt-1">
              Configure programming and zoning parameters
            </div>
          </div>
          
          <div className="flex-1 px-6 py-4 overflow-y-auto">
            {familyName ? (
              Object.entries(fieldGroups).map(([groupName, fields]) => 
                renderFieldGroup(groupName, fields)
              )
            ) : (
              <div className="text-gray-400 text-center py-8">
                <p>Please select a row with an assigned family to view parameters.</p>
                <p className="text-sm mt-2">Assign a family by selecting a subtype in the table.</p>
              </div>
            )}
          </div>
          
          <div className="px-6 py-4 border-t border-gray-600 bg-gray-900">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  // Only validate fields that are visible for the selected family
                  const currentFields = Object.values(fieldGroups).flat();
                  const hasRequiredData = currentFields.some(field => formData[field]);
                  
                  if (hasRequiredData) {
                    // Save logic would go here
                    console.log('Saving family-specific data:', { familyName, formData });
                    onClose();
                  }
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced field configuration with comprehensive family fields
const getComprehensiveFamilyFields = (familyName: string) => {
  const allFieldGroups = {
    'Residential': {
      'Programming Parameters': [
        'dwelling_units_per_acre', 'average_unit_size_sf', 'bedrooms_per_unit', 
        'persons_per_unit', 'vehicles_per_unit'
      ],
      'Site Controls': [
        'site_coverage_pct', 'site_far', 'max_stories', 'max_height_ft', 
        'site_common_area_pct', 'setback_front_ft', 'setback_side_ft', 'setback_rear_ft'
      ],
      'Parking': [
        'parking_ratio_per_unit', 'parking_stall_sf', 'garage_spaces_per_unit'
      ]
    },
    'Commercial': {
      'Building Parameters': [
        'rsf_to_gfa_eff', 'employee_density', 'floor_plate_efficiency', 
        'tenant_improvement_sf', 'common_area_factor'
      ],
      'Site Controls': [
        'site_coverage_pct', 'site_far', 'max_stories', 'max_height_ft',
        'setback_front_ft', 'setback_side_ft', 'setback_rear_ft'
      ],
      'Parking': [
        'parking_ratio_per1000sf', 'parking_stall_sf'
      ]
    },
    'Industrial': {
      'Building Parameters': [
        'rsf_to_gfa_eff', 'employee_density', 'clear_height_ft', 
        'office_percentage', 'warehouse_efficiency'
      ],
      'Logistics': [
        'loading_dock_ratio', 'truck_court_depth_ft', 'trailer_parking_ratio',
        'dock_doors_per_acre'
      ],
      'Site Controls': [
        'site_coverage_pct', 'site_far', 'max_height_ft'
      ],
      'Parking': [
        'parking_ratio_per1000sf', 'truck_parking_spaces'
      ]
    }
  };
  
  return allFieldGroups[familyName as keyof typeof allFieldGroups] || {};
};

const comprehensiveFieldLabels: Record<string, string> = {
  // Residential
  'dwelling_units_per_acre': 'Dwelling Units per Acre',
  'average_unit_size_sf': 'Average Unit Size (SF)',
  'bedrooms_per_unit': 'Bedrooms per Unit',
  'persons_per_unit': 'Persons per Unit',
  'vehicles_per_unit': 'Vehicles per Unit',
  'parking_ratio_per_unit': 'Parking Ratio per Unit',
  'garage_spaces_per_unit': 'Garage Spaces per Unit',
  
  // Commercial
  'rsf_to_gfa_eff': 'RSF to GFA Efficiency',
  'employee_density': 'Employee Density (SF/Employee)',
  'floor_plate_efficiency': 'Floor Plate Efficiency',
  'tenant_improvement_sf': 'Tenant Improvement ($/SF)',
  'common_area_factor': 'Common Area Factor',
  'parking_ratio_per1000sf': 'Parking Ratio per 1000 SF',
  
  // Industrial
  'clear_height_ft': 'Clear Height (ft)',
  'office_percentage': 'Office Percentage (%)',
  'warehouse_efficiency': 'Warehouse Efficiency (%)',
  'loading_dock_ratio': 'Loading Dock Ratio',
  'truck_court_depth_ft': 'Truck Court Depth (ft)',
  'trailer_parking_ratio': 'Trailer Parking Ratio',
  'dock_doors_per_acre': 'Dock Doors per Acre',
  'truck_parking_spaces': 'Truck Parking Spaces',
  
  // Common
  'site_coverage_pct': 'Site Coverage (%)',
  'site_far': 'Floor Area Ratio',
  'max_stories': 'Max Stories',
  'max_height_ft': 'Max Height (ft)',
  'site_common_area_pct': 'Site Common Area (%)',
  'parking_stall_sf': 'Parking Stall Size (SF)',
  'setback_front_ft': 'Front Setback (ft)',
  'setback_side_ft': 'Side Setback (ft)',
  'setback_rear_ft': 'Rear Setback (ft)'
};

// Side Drawer Component
interface SideDrawerProps {
  row?: LandUseRow;
  families: Family[];
  onClose: () => void;
}

const SideDrawer: React.FC<SideDrawerProps> = ({ row, families, onClose }) => {
  const [formData, setFormData] = useState<Record<string, any>>({});

  if (!row) return null;

  const family = families.find(f => f.family_id === row.family_id);
  const familyName = family?.name || '';
  const fieldGroups = getComprehensiveFamilyFields(familyName);

  const renderFieldGroup = (groupName: string, fields: string[]) => (
    <div key={groupName} className="mb-6">
      <div className="bg-slate-700 px-3 py-2 border-b border-slate-600">
        <h4 className="text-sm font-medium text-slate-300">{groupName}</h4>
      </div>
      <div className="p-3 space-y-2">
        {fields.map(fieldKey => {
          const label = comprehensiveFieldLabels[fieldKey] || fieldKey;
          const isPercentage = label.includes('(%)') || label.includes('Percentage') || label.includes('Coverage') || label.includes('Efficiency') || label.includes('Common Area');
          const isFeet = label.includes('(ft)') || label.includes('Height') || label.includes('Depth') || label.includes('Setback');
          
          const formatValue = (value: string) => {
            if (!value) return '';
            const num = parseFloat(value);
            if (isNaN(num)) return value;
            
            if (isPercentage) {
              return `${num.toFixed(2)}%`;
            } else if (isFeet) {
              return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
            }
            return value;
          };
          
          return (
            <div key={fieldKey} className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-300 flex-1 text-left">
                {label}:
              </label>
              <input
                type="number"
                step={isPercentage ? "0.01" : isFeet ? "1" : "0.01"}
                value={formData[fieldKey] || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                onBlur={(e) => {
                  // Format the display value on blur
                  const formatted = formatValue(e.target.value);
                  if (formatted !== e.target.value) {
                    e.target.value = parseFloat(e.target.value || '0').toString();
                  }
                }}
                className="w-16 px-1 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs text-right focus:ring-2 focus:ring-blue-500"
                placeholder={isPercentage ? "0.00" : isFeet ? "0" : "0.00"}
              />
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700 bg-gray-900">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            {familyName || 'Land Use'} Parameters
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="text-sm text-gray-400 mt-1">
          Row ID: {row.id} | Code: {row.landuse_code || 'Not selected'}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {familyName && Object.keys(fieldGroups).length > 0 ? (
          <>
            {Object.entries(fieldGroups).map(([groupName, fields]) =>
              renderFieldGroup(groupName, fields)
            )}
          </>
        ) : (
          <div className="p-4 text-center text-gray-400">
            <p>Please assign a family by selecting a subtype to view parameters.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {familyName && (
        <div className="px-4 py-3 border-t border-gray-700 bg-gray-900">
          <div className="flex gap-2">
            <button
              onClick={() => {
                console.log('Saving comprehensive data:', { familyName, rowId: row.id, formData });
                // Save logic would go here
              }}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Save Parameters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Main component
const LandUseInputTable: React.FC = () => {
  // State
  const [families, setFamilies] = useState<Family[]>([]);
  const [subtypes, setSubtypes] = useState<Subtype[]>([]);
  const [landuses, setLanduses] = useState<LandUse[]>([]);
  const [rows, setRows] = useState<LandUseRow[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Slide-out state
  const [slideOut, setSlideOut] = useState<{
    type: 'family' | 'subtype' | 'landuse' | null;
    isOpen: boolean;
    parentId?: number;
  }>({ type: null, isOpen: false });

  // Remove the details flyout state as it's now handled by selectedRowId

  // Family multi-selection and row selection state
  const [selectedFamilies, setSelectedFamilies] = useState<Set<number>>(new Set());
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [familiesRes, subtypesRes, landusesRes] = await Promise.all([
        fetch('/api/landuse/choices?type=families'),
        fetch('/api/landuse/choices?type=subtypes'),
        fetch('/api/landuse/choices?type=codes')
      ]);

      const familiesData = await familiesRes.json();
      const subtypesData = await subtypesRes.json();
      const landusesData = await landusesRes.json();

      // Convert string IDs to numbers for consistency
      const familiesWithNumberIds = Array.isArray(familiesData) ? familiesData.map(f => ({
        ...f,
        family_id: parseInt(f.family_id)
      })) : [];
      
      const subtypesWithNumberIds = Array.isArray(subtypesData) ? subtypesData.map(s => ({
        ...s,
        subtype_id: parseInt(s.subtype_id),
        family_id: parseInt(s.family_id)
      })) : [];

      setFamilies(familiesWithNumberIds);
      setSubtypes(subtypesWithNumberIds);
      setLanduses(Array.isArray(landusesData) ? landusesData : []);

      // Start with empty rows - user must select families to create rows
      setRows([]);
    } catch (error) {
      console.error('Error loading data:', error);
      setRows([]); // Start empty even on error
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getSubtypeFamily = (subtypeId: number): number | null => {
    const subtype = subtypes.find(s => s.subtype_id === subtypeId);
    return subtype ? subtype.family_id : null;
  };

  const getAvailableSubtypes = (familyId: number | null) => {
    if (!familyId) return [];
    return subtypes.filter(s => s.family_id === familyId && s.active);
  };

  // Get subtypes for all selected families (for dropdown display)
  const getSubtypesForSelectedFamilies = () => {
    if (selectedFamilies.size === 0) {
      // If no families selected, show all subtypes grouped by family
      return subtypes.filter(s => s.active);
    }
    // Show subtypes only for selected families
    return subtypes.filter(s => selectedFamilies.has(s.family_id) && s.active);
  };

  // Group and sort subtypes with Residential first
  const getGroupedSubtypes = () => {
    const availableSubtypes = getSubtypesForSelectedFamilies();
    const grouped: {[key: string]: typeof availableSubtypes} = {};
    
    // Group by family
    availableSubtypes.forEach(subtype => {
      const family = families.find(f => f.family_id === subtype.family_id);
      const familyName = family?.name || 'Unknown';
      if (!grouped[familyName]) grouped[familyName] = [];
      grouped[familyName].push(subtype);
    });
    
    // Sort each group by name
    Object.keys(grouped).forEach(familyName => {
      grouped[familyName].sort((a, b) => a.name.localeCompare(b.name));
    });
    
    // Return with Residential first
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      if (a === 'Residential') return -1;
      if (b === 'Residential') return 1;
      return a.localeCompare(b);
    });
    
    return sortedKeys.map(familyName => ({
      familyName,
      subtypes: grouped[familyName]
    }));
  };

  const getAvailableLandUses = (subtypeId: number | null) => {
    if (!subtypeId) return [];
    return landuses.filter(l => l.subtype_id === subtypeId && l.active);
  };

  // Status calculation functions
  const getProgrammingStatus = (landuseCode: string | null): 'complete' | 'partial' | 'missing' => {
    if (!landuseCode) return 'missing';
    const landuse = landuses.find(l => l.landuse_code === landuseCode);
    if (!landuse) return 'missing';
    
    // For now, use the has_programming flag from the API
    // In the future, this could check individual field completeness
    if (landuse.has_programming) {
      return 'complete'; // Assume complete if programming data exists
    }
    return 'missing';
  };

  const getZoningStatus = (landuseCode: string | null): 'complete' | 'partial' | null => {
    if (!landuseCode) return null;
    const landuse = landuses.find(l => l.landuse_code === landuseCode);
    if (!landuse) return null;
    
    // For now, use the has_zoning flag from the API
    // In the future, this could check individual field completeness
    if (landuse.has_zoning) {
      return 'complete'; // Assume complete if zoning data exists
    }
    return null; // Don't show chip if no zoning data
  };

  const renderStatusChip = (status: 'complete' | 'partial' | null, type: 'programming' | 'zoning') => {
    if (!status) return null; // Don't render chip if no status
    
    const statusConfig = {
      complete: { bg: 'bg-green-900', text: 'text-green-300', label: 'Complete' },
      partial: { bg: 'bg-yellow-900', text: 'text-yellow-300', label: 'Partial' }
    };
    
    const config = statusConfig[status];
    return (
      <span className={`px-2 py-1 rounded text-xs ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  // Remove accordion rendering as we're now using flyout

  // Event handlers
  const handleCellChange = (rowId: string, field: string, value: any) => {
    setRows(prev => prev.map(row => {
      if (row.id !== rowId) return row;
      
      const newRow = { ...row, [field]: value };
      
      // Clear dependent fields when parent changes
      if (field === 'family_id') {
        newRow.subtype_id = null;
        newRow.landuse_code = null;
      } else if (field === 'subtype_id') {
        newRow.landuse_code = null;
      }
      
      return newRow;
    }));
  };

  const addNewRow = () => {
    const newId = `row-${Date.now()}`;
    // If only one family is selected, pre-assign it to new rows
    const preselectedFamily = selectedFamilies.size === 1 ? Array.from(selectedFamilies)[0] : null;
    setRows(prev => [...prev, { 
      id: newId, 
      family_id: preselectedFamily,
      subtype_id: null, 
      landuse_code: null,
      uom: null,
      unit_price: null,
      isNew: true 
    }]);
  };

  const handleSlideOutSave = async (data: any) => {
    try {
      let response;
      switch (slideOut.type) {
        case 'family':
          response = await fetch('/api/landuse/choices?type=families', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          break;
        case 'subtype':
          response = await fetch('/api/landuse/choices?type=subtypes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          break;
        case 'landuse':
          response = await fetch('/api/landuse/choices?type=codes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          break;
      }
      
      if (response?.ok) {
        await loadData(); // Refresh data
      }
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  // Family colors mapping
  const familyColors = {
    'Residential': { bg: 'bg-blue-600', text: 'text-white', dot: 'bg-blue-500' },
    'Commercial': { bg: 'bg-red-600', text: 'text-white', dot: 'bg-red-500' },
    'Industrial': { bg: 'bg-gray-500', text: 'text-white', dot: 'bg-gray-400' },
    'Open Space': { bg: 'bg-green-600', text: 'text-white', dot: 'bg-green-500' },
    'Common Areas': { bg: 'bg-yellow-500', text: 'text-black', dot: 'bg-yellow-400' },
    'Institutional': { bg: 'bg-purple-600', text: 'text-white', dot: 'bg-purple-500' },
    'Mixed Use': { bg: 'bg-indigo-600', text: 'text-white', dot: 'bg-indigo-500' },
    'Utilities': { bg: 'bg-cyan-600', text: 'text-white', dot: 'bg-cyan-500' },
    'Transportation': { bg: 'bg-slate-600', text: 'text-white', dot: 'bg-slate-500' }
  };

  // Handle family chip multi-selection and row management
  const handleFamilyToggle = (familyId: number) => {
    const family = families.find(f => f.family_id === familyId);
    if (!family) return;

    setSelectedFamilies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(familyId)) {
        // Removing family - remove its row
        newSet.delete(familyId);
        setRows(prevRows => prevRows.filter(row => row.family_id !== familyId));
      } else {
        // Adding family - add a new row for it
        newSet.add(familyId);
        const newRow: LandUseRow = {
          id: `family-${familyId}-${Date.now()}`,
          family_id: familyId,
          subtype_id: null,
          landuse_code: null,
          uom: null,
          unit_price: null,
          isNew: true
        };
        setRows(prevRows => [...prevRows, newRow]);
      }
      return newSet;
    });
    setSelectedRowId(null); // Clear row selection when changing family filter
  };

  // Get the selected row for flyout
  const selectedRow = rows.find(row => row.id === selectedRowId);
  
  // Show flyout when row is selected (even if no family assigned yet)
  const shouldShowFlyout = selectedRowId && selectedRow;
  
  // Debug logging
  console.log('Drawer Debug:', { selectedRowId, selectedRow: !!selectedRow, shouldShowFlyout });

  if (loading) {
    return (
      <div className="bg-gray-800 rounded border border-gray-700 p-8 text-center">
        <div className="text-gray-400">Loading land use data...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded border border-gray-700 w-full flex">
      {/* Main Table Area */}
      <div className={`transition-all duration-300 ${shouldShowFlyout ? 'w-4/5' : 'w-full'}`}>
      <div className="px-4 py-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <Settings className="mr-2 w-5 h-5" />
          Project Land Use Schema
        </h3>
          <button 
            onClick={addNewRow}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Row
          </button>
        </div>
        
        {/* Family Multi-Selection Chips */}
        <div className="flex flex-wrap gap-2">
          {families.map(family => {
            const colors = familyColors[family.name as keyof typeof familyColors] || 
              { bg: 'bg-gray-600', text: 'text-white', dot: 'bg-gray-500' };
            return (
              <button
                key={family.family_id}
                onClick={() => handleFamilyToggle(family.family_id)}
                className={`px-3 py-1 rounded text-sm transition-colors border ${
                  selectedFamilies.has(family.family_id)
                    ? `${colors.bg} ${colors.text} border-opacity-50`
                    : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                }`}
              >
                {family.name}
                {selectedFamilies.has(family.family_id) && (
                  <span className="ml-1 text-xs">✓</span>
                )}
              </button>
            );
          })}
          {selectedFamilies.size > 0 && (
            <button
              onClick={() => {
                setSelectedFamilies(new Set());
                setRows([]); // Clear all rows when clearing families
                setSelectedRowId(null);
              }}
              className="px-2 py-1 rounded text-xs bg-red-600 text-white hover:bg-red-700 border border-red-500"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-900">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-300 w-4"></th>
              <th className="text-left px-3 py-2 font-medium text-gray-300 w-48">Subtype</th>
              <th className="text-left px-3 py-2 font-medium text-gray-300 w-40">Zoning</th>
              <th className="text-left px-3 py-2 font-medium text-gray-300 w-32">UOM</th>
              <th className="text-left px-3 py-2 font-medium text-gray-300 w-32">Unit Price</th>
            </tr>
          </thead>
          <tbody>
{rows.filter(row => selectedFamilies.size === 0 || (row.family_id && selectedFamilies.has(row.family_id))).map((row, index) => (
                <tr 
                  key={row.id} 
                  className={`border-b border-gray-700 hover:bg-gray-700 cursor-pointer ${
                    selectedRowId === row.id ? 'bg-blue-900 border-blue-500' : index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'
                  }`}
                  onClick={() => {
                    const newSelectedId = selectedRowId === row.id ? null : row.id;
                    console.log('Row clicked:', { rowId: row.id, newSelectedId });
                    setSelectedRowId(newSelectedId);
                  }}
                >
                  {/* Family Color Dot */}
                  <td className="px-3 py-2 w-4">
                    {row.family_id && (() => {
                      const family = families.find(f => f.family_id === row.family_id);
                      const colors = familyColors[family?.name as keyof typeof familyColors];
                      return colors ? (
                        <div className={`w-3 h-3 rounded-full ${colors.dot}`}></div>
                      ) : null;
                    })()}
                  </td>

                  {/* Subtype DVL */}
                  <td className="px-3 py-2">
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={row.subtype_id || ''}
                        onChange={(e) => {
                          e.stopPropagation(); // Prevent row selection when changing dropdown
                          if (e.target.value === '__ADD_NEW__') {
                            // Use first selected family as parent for new subtype
                            const firstSelectedFamily = selectedFamilies.size > 0 ? Array.from(selectedFamilies)[0] : undefined;
                            setSlideOut({ type: 'subtype', isOpen: true, parentId: firstSelectedFamily });
                          } else {
                            const newSubtypeId = e.target.value ? parseInt(e.target.value) : null;
                            const subtype = newSubtypeId ? subtypes.find(s => s.subtype_id === newSubtypeId) : null;
                            
                            // Update both subtype_id and family_id in a single state change to avoid race conditions
                            setRows(prev => prev.map(r => {
                              if (r.id !== row.id) return r;
                              return {
                                ...r,
                                subtype_id: newSubtypeId,
                                family_id: subtype ? subtype.family_id : r.family_id,
                                landuse_code: null // Clear landuse when subtype changes
                              };
                            }));
                            
                            console.log('Subtype changed:', { rowId: row.id, newSubtypeId, familyId: subtype?.family_id });
                          }
                        }}
                        disabled={selectedFamilies.size === 0 && families.length > 0}
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:ring-2 focus:ring-blue-500 appearance-none pr-8 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Select Subtype</option>
                        {getGroupedSubtypes().map(group => (
                          <optgroup key={group.familyName} label={group.familyName}>
                            {group.subtypes.map(subtype => (
                              <option key={subtype.subtype_id} value={subtype.subtype_id}>
                                {subtype.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                        {selectedFamilies.size > 0 && <option value="__ADD_NEW__">+ Add New Subtype</option>}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </td>

                          {/* Land Use Code DVL */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <div className="relative flex-1">
                        <select
                          value={row.landuse_code || ''}
                          onChange={(e) => {
                            e.stopPropagation(); // Prevent row selection when changing dropdown
                            if (e.target.value === '__ADD_NEW__') {
                              setSlideOut({ type: 'landuse', isOpen: true, parentId: row.subtype_id || undefined });
                            } else {
                              handleCellChange(row.id, 'landuse_code', e.target.value || null);
                            }
                          }}
                          disabled={!row.subtype_id}
                          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:ring-2 focus:ring-blue-500 appearance-none pr-8 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Select Land Use</option>
                          {getAvailableLandUses(row.subtype_id).map(landuse => (
                            <option key={landuse.landuse_code} value={landuse.landuse_code}>
                              {landuse.landuse_code}
                            </option>
                          ))}
                          {row.subtype_id && <option value="__ADD_NEW__">+ Add New Land Use</option>}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                      {renderStatusChip(getZoningStatus(row.landuse_code), 'zoning')}
                    </div>
                  </td>

                  {/* Unit of Measure DVL */}
                  <td className="px-3 py-2">
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={row.uom || ''}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleCellChange(row.id, 'uom', e.target.value || null);
                        }}
                        disabled={!row.landuse_code}
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:ring-2 focus:ring-blue-500 appearance-none pr-8 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Select UOM</option>
                        <option value="$/SF">$/SF</option>
                        <option value="$/Unit">$/Unit</option>
                        <option value="$/Acre">$/Acre</option>
                        <option value="$/FF">$/FF</option>
                        <option value="$/LF">$/LF</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </td>

                  {/* Unit Price Input */}
                  <td className="px-3 py-2">
                    <input
                      onClick={(e) => e.stopPropagation()}
                      type="number"
                      step="0.01"
                      value={row.unit_price || ''}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleCellChange(row.id, 'unit_price', e.target.value ? parseFloat(e.target.value) : null);
                      }}
                      disabled={!row.landuse_code}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="0.00"
                    />
                  </td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>

      </div>

      {/* Collapsible Side Drawer */}
      {shouldShowFlyout && (
        <div className="w-1/5 border-l border-gray-700 bg-gray-800 transition-all duration-300">
          <SideDrawer
            row={selectedRow}
            families={families}
            onClose={() => setSelectedRowId(null)}
          />
        </div>
      )}

      {/* Slide-out form */}
      <SlideOutForm
        type={slideOut.type!}
        isOpen={slideOut.isOpen}
        onClose={() => setSlideOut({ type: null, isOpen: false })}
        onSave={handleSlideOutSave}
        parentId={slideOut.parentId}
        families={families}
        subtypes={subtypes}
      />
    </div>
  );
};

export default LandUseInputTable;
