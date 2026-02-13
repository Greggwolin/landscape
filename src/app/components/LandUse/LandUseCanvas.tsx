'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Settings } from 'lucide-react';
import LandUseDetails from './LandUseDetails';

// Type definitions matching the existing structure
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

interface Project {
 project_id: number;
 project_name: string;
 acres_gross: number;
 location_lat?: number;
 location_lon?: number;
 start_date: string;
 jurisdiction_city?: string;
 jurisdiction_county?: string;
 jurisdiction_state?: string;
}

interface LandUseCanvasProps {
 selectedFamilyIds?: Set<number>;
 projectData?: Project | null;
 onAddFamily?: () => void;
 onAddSubtype?: (familyId: number) => void;
 onAddLandUse?: (subtypeId: number) => void;
 onOpenFamily?: (familyId: number) => void;
 onOpenSubtype?: (familyId: number, subtypeId: number) => void;
 onOpenLandUse?: (familyId: number, subtypeId: number, landUseId: number) => void;
}

const LandUseCanvas: React.FC<LandUseCanvasProps> = ({
 selectedFamilyIds,
 projectData,
 onAddFamily,
 onAddSubtype,
 onAddLandUse,
 onOpenFamily,
 onOpenSubtype,
 onOpenLandUse
}) => {
 const [families, setFamilies] = useState<Family[]>([]);
 const [subtypes, setSubtypes] = useState<Subtype[]>([]);
 const [landuses, setLanduses] = useState<LandUse[]>([]);
 const [loading, setLoading] = useState(true);
 const [showDetailModal, setShowDetailModal] = useState(false);
 const [selectedSubtype, setSelectedSubtype] = useState<Subtype | null>(null);

 useEffect(() => {
 loadData();
 }, [projectData, selectedFamilyIds]);

 const loadData = async () => {
 try {
 setLoading(true);
  // Temporarily disable jurisdiction filtering to get page working
 // TODO: Re-enable once schema issues are resolved
 const jurisdictionParam = '';
  const [familiesRes, subtypesRes, landusesRes] = await Promise.all([
 fetch(`/api/landuse/choices?type=families${jurisdictionParam}`),
 fetch(`/api/landuse/choices?type=subtypes${jurisdictionParam}`),
 fetch(`/api/landuse/choices?type=codes${jurisdictionParam}`)
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
 } catch (error) {
 console.error('Error loading data:', error);
 } finally {
 setLoading(false);
 }
 };

 // Family colors mapping (matching the existing pattern)
 const familyColors = {
 'Residential': { bg: 'bg-blue-600', text: 'text-body', border: 'border-blue-500' },
 'Commercial': { bg: 'bg-red-600', text: 'text-body', border: 'border-red-500' },
 'Industrial': { bg: 'bg-body', text: 'text-body', border: 'border' },
 'Open Space': { bg: 'bg-green-600', text: 'text-body', border: 'border-green-500' },
 'Common Areas': { bg: 'bg-yellow-600', text: 'text-body', border: 'border-yellow-500' },
 'Institutional': { bg: 'bg-purple-600', text: 'text-body', border: 'border-purple-500' },
 'Mixed Use': { bg: 'bg-indigo-600', text: 'text-body', border: 'border-indigo-500' },
 'Utilities': { bg: 'bg-cyan-600', text: 'text-body', border: 'border-cyan-500' },
 'Transportation': { bg: 'bg-body', text: 'text-body', border: 'border' }
 };

 const getFamilyColor = (familyName: string) => {
 return familyColors[familyName as keyof typeof familyColors] ||  { bg: 'bg-body', text: 'text-body', border: 'border' };
 };

 const getSubtypesForFamily = (familyId: number) => {
 return subtypes.filter(s => s.family_id === familyId && s.active);
 };


 const getLandUsesForSubtype = (subtypeId: number) => {
 return landuses.filter(l => l.subtype_id === subtypeId && l.active);
 };

 // Get land uses directly associated with a family (no subtype)
 const getDirectFamilyLandUses = (familyName: string) => {
 // For land uses without subtype_id, we need to match by family name or pattern
 // This is a temporary solution - ideally land uses should have family_id
 const familyPatterns = {
 'Open Space': ['OS', 'GOLF', 'PARK', 'REC'],
 'Commercial': ['C', 'RET', 'OFF'],  'Residential': ['SFD', 'MF', 'HDR', 'MDR', 'MHDR', 'MLDR'],
 'Mixed Use': ['MU']
 };
  const patterns = familyPatterns[familyName as keyof typeof familyPatterns] || [];
 return landuses.filter(l =>  l.subtype_id === null &&  l.active &&  patterns.includes(l.landuse_code)
 );
 };

 const getStatusColor = (hasData?: boolean) => {
 if (hasData === undefined) return 'bg-body';
 return hasData ? 'bg-green-600' : 'bg-yellow-600';
 };

 const getStatusText = (hasData?: boolean) => {
 if (hasData === undefined) return 'Not Set';
 return hasData ? 'Complete' : 'Pending';
 };

 if (loading) {
 return (
 <div className="min-h-screen bg-body flex items-center justify-center">
 <div className="text-body-tertiary">Loading land use data...</div>
 </div>
 );
 }

 return (
 <div className="flex h-full">
 <div className="flex-1 p-6 bg-body">
 <div className="bg-body border border rounded-lg h-full">
 {/* Canvas Area - no header */}
 <div className="p-6 h-full overflow-y-auto">
 <div className="grid grid-cols-3 gap-6">
 {families.filter(f => f.active && (!selectedFamilyIds || selectedFamilyIds.size === 0 || selectedFamilyIds.has(f.family_id))).map((family) => {
 const familySubtypes = getSubtypesForFamily(family.family_id);
 const colors = getFamilyColor(family.name);
  return (
 <div key={family.family_id} className="min-h-200">
 <div  className="min-h-full rounded-lg bg-body cursor-pointer border-2 border border-solid transition-all duration-200 group overflow-hidden"
 onClick={(e) => {
 e.stopPropagation();
 onOpenFamily?.(family.family_id);
 }}
 >
 {/* Colored Header */}
 <div className={`${colors.bg} p-4 text-center`}>
 <h3 className={`font-semibold ${colors.text}`}>{family.name}</h3>
 {family.notes && (
 <p className={`text-xs ${colors.text} opacity-90 mt-1`}>{family.notes}</p>
 )}
 </div>
  {/* Grey Content Area */}
 <div className="p-4">
  {familySubtypes.length === 0 ? (
 <div>
 {(() => {
 const directLandUses = getDirectFamilyLandUses(family.name);
 return directLandUses.length > 0 ? (
 <div className="space-y-2">
 <div className="text-xs text-body-tertiary mb-2">Direct Land Uses:</div>
 {directLandUses.map((landuse) => (
 <div  key={landuse.landuse_id}
 className="bg-body rounded p-2 border border"
 >
 <div className="text-sm text-body font-medium">
 {landuse.landuse_code} - {landuse.name}
 </div>
 {landuse.description && (
 <div className="text-xs text-body-tertiary mt-1">{landuse.description}</div>
 )}
 </div>
 ))}
 </div>
 ) : (
 <div className="text-center">
 <button
 onClick={(e) => {
 e.stopPropagation();
 onAddSubtype?.(family.family_id);
 }}
 className="px-4 py-2 bg-body border-2 border-solid border text-body rounded-lg font-medium hover:outline hover:outline-2 transition-all duration-200"
 style={{outlineColor: 'rgb(33,88,226)'}}
 >
 Add Subtype
 </button>
 </div>
 );
 })()}
 </div>
 ) : (
 <div className="flex flex-col flex-1">
 <div className="flex flex-col gap-2">
 {familySubtypes.map((subtype) => {
 const subtypeLandUses = getLandUsesForSubtype(subtype.subtype_id);
  return (
 <div
 key={subtype.subtype_id}
 onClick={(e) => {
 e.stopPropagation();
 setSelectedSubtype(subtype);
 setShowDetailModal(true);
 }}
 className="bg-body rounded p-3 cursor-pointer border-2 border-solid border hover:border-blue-400 transition-all duration-200"
 >
 <div className="mb-2">
 <div className="font-medium text-sm text-body">
 {subtype.code} - {subtype.name}
 </div>
 {subtype.notes && (
 <p className="text-xs text-body-tertiary text-left mt-1">{subtype.notes}</p>
 )}
 </div>
  {subtypeLandUses.length > 0 && (
 <div className="text-xs text-body-tertiary">
 {subtypeLandUses.length} land use code{subtypeLandUses.length === 1 ? '' : 's'}
 </div>
 )}
 </div>
 );
 })}
 </div>
  {/* Family Action Chips */}
 <div className="flex gap-3 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
 <button
 onClick={(e) => {
 e.stopPropagation();
 onAddSubtype?.(family.family_id);
 }}
 className="px-3 py-2 bg-body hover:bg-body text-body rounded text-sm font-medium transition-all duration-200"
 >
 + Add Subtype
 </button>
 <button
 onClick={(e) => {
 e.stopPropagation();
 // Navigate to most recent subtype or create one if none exist
 if (familySubtypes.length > 0) {
 const lastSubtype = familySubtypes[familySubtypes.length - 1];
 setSelectedSubtype(lastSubtype);
 setShowDetailModal(true);
 } else {
 onAddSubtype?.(family.family_id);
 }
 }}
 className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-body rounded text-sm font-medium transition-all duration-200"
 >
 + Add / Manage Land Uses
 </button>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 </div>
  {/* Detail Modal */}
 {showDetailModal && selectedSubtype && (
 <LandUseDetails
 subtype={selectedSubtype}
 onClose={() => {
 setShowDetailModal(false);
 setSelectedSubtype(null);
 }}
 />
 )}
 </div>
 );
};

export default LandUseCanvas;