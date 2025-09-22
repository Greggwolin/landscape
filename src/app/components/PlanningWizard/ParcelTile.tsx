'use client'

import React, { useState } from 'react'
import { Parcel, LandUseType } from './PlanningWizard'
import SimpleTaxonomySelector from '../LandUse/SimpleTaxonomySelector'

interface ParcelTileProps {
  parcel: Parcel
  mode: 'view' | 'edit'
  onUpdate?: (updatedParcel: Partial<Parcel>) => void
  onClick?: () => void
}

// Field visibility logic based on family name
const getVisibleFields = (familyName?: string) => {
  switch(familyName) {
    case "Residential":
      return ["type", "product", "units", "density", "lotArea"];
    case "Commercial":
    case "Industrial":
      return ["type", "product", "siteCoverage", "setbacks", "buildingSF", "intensity"];
    case "Common Areas":
    case "Public":
    case "Mixed Use":
    case "Institutional":
    case "Open Space":
    case "Other":
      return ["type"];
    default:
      return ["type"]; // fallback
  }
};

// Calculate FAR for commercial/industrial
const calculateFAR = (buildingSF: number, acresGross: number): number => {
  if (!buildingSF || !acresGross) return 0;
  return buildingSF / (acresGross * 43560);
};

// Get combined setbacks display
const getCombinedSetbacks = (parcel: Parcel): string => {
  const front = (parcel as any).setback_front_ft || 0;
  const side = (parcel as any).setback_side_ft || 0;
  const rear = (parcel as any).setback_rear_ft || 0;

  if (front || side || rear) {
    return `F:${front}' S:${side}' R:${rear}'`;
  }
  return '';
};

const getLandUseColor = (landUse: LandUseType) => {
  switch (landUse) {
    case 'LDR': return 'bg-emerald-600'
    case 'MDR': return 'bg-green-600'
    case 'HDR': return 'bg-teal-600'
    case 'MHDR': return 'bg-cyan-600'
    case 'C': return 'bg-orange-600'
    case 'MU': return 'bg-amber-600'
    case 'OS': return 'bg-blue-600'
    default: return 'bg-slate-600'
  }
}

const getLandUseBorderColor = (landUse: LandUseType) => {
  switch (landUse) {
    case 'LDR': return 'border-emerald-500'
    case 'MDR': return 'border-green-500'
    case 'HDR': return 'border-teal-500'
    case 'MHDR': return 'border-cyan-500'
    case 'C': return 'border-orange-500'
    case 'MU': return 'border-amber-500'
    case 'OS': return 'border-blue-500'
    default: return 'border-slate-500'
  }
}

const ParcelTile: React.FC<ParcelTileProps> = ({
  parcel,
  mode,
  onUpdate,
  onClick
}) => {
  const [editData, setEditData] = useState<Partial<Parcel>>(parcel);
  const familyName = (parcel as any).family_name || parcel.familyName;
  const visibleFields = getVisibleFields(familyName);

  const buildingSF = (parcel as any).building_sf || 0;
  const far = calculateFAR(buildingSF, parcel.acres);
  const siteCoverage = (parcel as any).site_coverage_pct || 0;
  const setbacks = getCombinedSetbacks(parcel);

  const handleFieldChange = (field: string, value: any) => {
    const updatedData = { ...editData, [field]: value };
    setEditData(updatedData);
    onUpdate?.(updatedData);
  };

  const renderViewMode = () => (
    <div
      className={`${getLandUseColor(parcel.landUse)} ${getLandUseBorderColor(parcel.landUse)} text-white border-2 rounded-lg p-3 cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-white transition-all duration-200 h-fit`}
      onClick={onClick}
    >
      <div className="text-center mb-2">
        <div className="font-bold text-sm mb-1 leading-tight">
          Parcel {parcel.name.replace('Parcel: ', '')}
        </div>
        {parcel.description && (
          <p className="text-xs text-gray-100 opacity-90 mb-2">{parcel.description}</p>
        )}
        {parcel.notes && (
          <p className="text-xs text-gray-200 opacity-80 italic">{parcel.notes}</p>
        )}
      </div>

      <table className="w-full text-xs">
        <tbody>
          {/* Always show Land Use and Acres */}
          <tr>
            <td className="opacity-90 align-top pr-2 w-16">Use:</td>
            <td className="font-semibold w-20">{familyName || parcel.landUse}</td>
          </tr>
          <tr>
            <td className="opacity-90 align-top pr-2">Acres:</td>
            <td className="font-semibold">{parcel.acres}</td>
          </tr>

          {/* Residential fields */}
          {familyName === "Residential" && (
            <>
              {visibleFields.includes("type") && (parcel as any).type_code && (
                <tr>
                  <td className="opacity-90 align-top pr-2">Type:</td>
                  <td className="font-semibold">{(parcel as any).type_code}</td>
                </tr>
              )}
              {visibleFields.includes("product") && (parcel as any).product_code && (
                <tr>
                  <td className="opacity-90 align-top pr-2">Product:</td>
                  <td className="font-semibold">{(parcel as any).product_code}</td>
                </tr>
              )}
              {visibleFields.includes("units") && parcel.units > 0 && (
                <tr>
                  <td className="opacity-90 align-top pr-2">Units:</td>
                  <td className="font-semibold">{parcel.units}</td>
                </tr>
              )}
              {visibleFields.includes("density") && (parcel.density_gross ?? 0) > 0 && (
                <tr>
                  <td className="opacity-90 align-top pr-2">Density:</td>
                  <td className="font-semibold">{parcel.density_gross?.toFixed(1)} u/ac</td>
                </tr>
              )}
            </>
          )}

          {/* Commercial/Industrial fields */}
          {(familyName === "Commercial" || familyName === "Industrial") && (
            <>
              {visibleFields.includes("type") && (parcel as any).type_code && (
                <tr>
                  <td className="opacity-90 align-top pr-2">Type:</td>
                  <td className="font-semibold">{(parcel as any).type_code}</td>
                </tr>
              )}
              {visibleFields.includes("product") && (parcel as any).product_code && (
                <tr>
                  <td className="opacity-90 align-top pr-2">Product:</td>
                  <td className="font-semibold">{(parcel as any).product_code}</td>
                </tr>
              )}
              {visibleFields.includes("siteCoverage") && siteCoverage > 0 && (
                <tr>
                  <td className="opacity-90 align-top pr-2">Coverage:</td>
                  <td className="font-semibold">{siteCoverage}%</td>
                </tr>
              )}
              {visibleFields.includes("setbacks") && setbacks && (
                <tr>
                  <td className="opacity-90 align-top pr-2">Setbacks:</td>
                  <td className="font-semibold text-xs">{setbacks}</td>
                </tr>
              )}
              {visibleFields.includes("buildingSF") && buildingSF > 0 && (
                <tr>
                  <td className="opacity-90 align-top pr-2">Bldg SF:</td>
                  <td className="font-semibold">{buildingSF.toLocaleString()}</td>
                </tr>
              )}
              {visibleFields.includes("intensity") && far > 0 && (
                <tr>
                  <td className="opacity-90 align-top pr-2">FAR:</td>
                  <td className="font-semibold">{far.toFixed(2)}</td>
                </tr>
              )}
            </>
          )}

          {/* Simple land uses - just type */}
          {["Common Areas", "Public", "Mixed Use", "Institutional", "Open Space", "Other"].includes(familyName) && (
            <>
              {(parcel as any).type_code && (
                <tr>
                  <td className="opacity-90 align-top pr-2">Type:</td>
                  <td className="font-semibold">{(parcel as any).type_code}</td>
                </tr>
              )}
            </>
          )}

          {/* Common fields for all */}
          {parcel.status && (
            <tr>
              <td className="opacity-90 align-top pr-2">Status:</td>
              <td className="font-semibold">{parcel.status}</td>
            </tr>
          )}
          {(parcel.efficiency ?? 0) > 0 && (
            <tr>
              <td className="opacity-90 align-top pr-2">Efficiency:</td>
              <td className="font-semibold">{(parcel.efficiency * 100).toFixed(0)}%</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderEditMode = () => (
    <div className={`${getLandUseColor(parcel.landUse)} ${getLandUseBorderColor(parcel.landUse)} text-white border-2 rounded-lg p-3 h-fit`}>
      <div className="text-center mb-2">
        <div className="font-bold text-sm mb-1 leading-tight">
          Editing: Parcel {parcel.name.replace('Parcel: ', '')}
        </div>
      </div>

      <div className="space-y-2 text-xs">
        {/* Land Use Taxonomy Selector */}
        <div>
          <SimpleTaxonomySelector
            value={{
              family_name: (parcel as any).family_name,
              density_code: (parcel as any).density_code,
              type_code: (parcel as any).type_code,
              product_code: (parcel as any).product_code,
            }}
            onChange={(values) => {
              Object.entries(values).forEach(([key, value]) => {
                if (value !== undefined) {
                  handleFieldChange(key, value);
                }
              });
            }}
          />
        </div>

        <div>
          <label className="block opacity-90 mb-1">Acres:</label>
          <input
            type="number"
            step="0.1"
            value={editData.acres || parcel.acres}
            onChange={(e) => handleFieldChange('acres', parseFloat(e.target.value))}
            className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs"
          />
        </div>

        {/* Residential edit fields */}
        {familyName === "Residential" && (
          <>
            {visibleFields.includes("units") && (
              <div>
                <label className="block opacity-90 mb-1">Units:</label>
                <input
                  type="number"
                  value={editData.units || parcel.units}
                  onChange={(e) => handleFieldChange('units', parseInt(e.target.value))}
                  className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs"
                />
              </div>
            )}
          </>
        )}

        {/* Commercial/Industrial edit fields */}
        {(familyName === "Commercial" || familyName === "Industrial") && (
          <>
            {visibleFields.includes("buildingSF") && (
              <div>
                <label className="block opacity-90 mb-1">Building SF:</label>
                <input
                  type="number"
                  value={(editData as any).building_sf || buildingSF}
                  onChange={(e) => handleFieldChange('building_sf', parseInt(e.target.value))}
                  className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs"
                />
              </div>
            )}
            {visibleFields.includes("siteCoverage") && (
              <div>
                <label className="block opacity-90 mb-1">Site Coverage %:</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={(editData as any).site_coverage_pct || siteCoverage}
                  onChange={(e) => handleFieldChange('site_coverage_pct', parseInt(e.target.value))}
                  className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs"
                />
              </div>
            )}
            {visibleFields.includes("setbacks") && (
              <>
                <div>
                  <label className="block opacity-90 mb-1">Front Setback (ft):</label>
                  <input
                    type="number"
                    value={(editData as any).setback_front_ft || (parcel as any).setback_front_ft || ''}
                    onChange={(e) => handleFieldChange('setback_front_ft', parseInt(e.target.value))}
                    className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block opacity-90 mb-1">Side Setback (ft):</label>
                  <input
                    type="number"
                    value={(editData as any).setback_side_ft || (parcel as any).setback_side_ft || ''}
                    onChange={(e) => handleFieldChange('setback_side_ft', parseInt(e.target.value))}
                    className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block opacity-90 mb-1">Rear Setback (ft):</label>
                  <input
                    type="number"
                    value={(editData as any).setback_rear_ft || (parcel as any).setback_rear_ft || ''}
                    onChange={(e) => handleFieldChange('setback_rear_ft', parseInt(e.target.value))}
                    className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs"
                  />
                </div>
              </>
            )}
            {visibleFields.includes("intensity") && far > 0 && (
              <div>
                <label className="block opacity-90 mb-1">FAR (calculated):</label>
                <input
                  type="text"
                  value={calculateFAR((editData as any).building_sf || buildingSF, editData.acres || parcel.acres).toFixed(2)}
                  className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs"
                  readOnly
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  return mode === 'edit' ? renderEditMode() : renderViewMode();
};

export default ParcelTile;