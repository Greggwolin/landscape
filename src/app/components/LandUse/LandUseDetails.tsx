'use client';

import React, { useState, useEffect } from 'react';
import { X, Edit, Plus, Building, Home, Map } from 'lucide-react';
import { LandscapeButton } from '@/components/ui/landscape';

interface ResSpec {
  res_spec_id: number;
  subtype_id: number;
  dua_min?: number;
  dua_max?: number;
  lot_w_min_ft?: number;
  lot_d_min_ft?: number;
  lot_area_min_sf?: number;
  sb_front_ft?: number;
  sb_side_ft?: number;
  sb_corner_ft?: number;
  sb_rear_ft?: number;
  hgt_max_ft?: number;
  cov_max_pct?: number;
  os_min_pct?: number;
  pk_per_unit?: number;
  notes?: string;
  eff_date?: string;
}

interface ComSpec {
  com_spec_id: number;
  subtype_id: number;
  far_min?: number;
  far_max?: number;
  cov_max_pct?: number;
  pk_per_ksf?: number;
  hgt_max_ft?: number;
  sb_front_ft?: number;
  sb_side_ft?: number;
  sb_corner_ft?: number;
  sb_rear_ft?: number;
  os_min_pct?: number;
  notes?: string;
  eff_date?: string;
}

interface LotProduct {
  product_id: number;
  code: string;
  lot_w_ft: number;
  lot_d_ft: number;
  lot_area_sf?: number;
  subtype_id?: number;
  subtype_name?: string;
  subtype_code?: string;
  family_name?: string;
}

interface LandUse {
  landuse_id: number;
  subtype_id: number | null;
  landuse_code: string;
  landuse_type: string;
  name: string;
  description?: string;
  active: boolean;
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

interface LandUseDetailsProps {
  subtype: Subtype;
  onClose: () => void;
}

const LandUseDetails: React.FC<LandUseDetailsProps> = ({ subtype, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('specs');
  const [resSpecs, setResSpecs] = useState<ResSpec[]>([]);
  const [comSpecs, setComSpecs] = useState<ComSpec[]>([]);
  const [lotProducts, setLotProducts] = useState<LotProduct[]>([]);
  const [landuses, setLanduses] = useState<LandUse[]>([]);

  useEffect(() => {
    loadSubtypeData();
  }, [subtype.subtype_id]);

  const loadSubtypeData = async () => {
    try {
      setLoading(true);
      
      const [specsRes, productsRes, landusesRes] = await Promise.all([
        fetch(`/api/landuse/specs?subtype_id=${subtype.subtype_id}`),
        fetch(`/api/landuse/products?subtype_id=${subtype.subtype_id}`),
        fetch('/api/landuse/codes')
      ]);

      const specsData = await specsRes.json();
      const productsData = await productsRes.json();
      const landusesData = await landusesRes.json();

      setResSpecs(specsData.residential || []);
      setComSpecs(specsData.commercial || []);
      setLotProducts(Array.isArray(productsData) ? productsData : []);
      
      // Show land uses for this subtype AND general/unassigned codes
      const subtypeLandUses = Array.isArray(landusesData) 
        ? landusesData.filter((lu: LandUse) => 
            (lu.subtype_id === subtype.subtype_id || lu.subtype_id == null || lu.subtype_id === 0) 
            && lu.active
          )
        : [];
      setLanduses(subtypeLandUses);

    } catch (error) {
      console.error('Error loading subtype data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (value?: number | null, suffix = '') => {
    if (value == null || value === 0) return '—';
    return `${value.toLocaleString()}${suffix}`;
  };

  const formatRange = (min?: number | null, max?: number | null, suffix = '') => {
    if (min != null && max != null) {
      return `${min.toLocaleString()} - ${max.toLocaleString()}${suffix}`;
    } else if (min != null) {
      return `${min.toLocaleString()}+ ${suffix}`;
    } else if (max != null) {
      return `≤ ${max.toLocaleString()}${suffix}`;
    }
    return '—';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-2/3 bg-gray-800 border-l border-gray-600 shadow-xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-600 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {subtype.code} - {subtype.name}
            </h2>
            <p className="text-sm text-gray-400">Development Standards & Products</p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-sm btn-ghost-secondary"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-600">
          {[
            { id: 'specs', label: 'Development Standards', icon: Building },
            { id: 'products', label: 'Lot Products', icon: Home },
            { id: 'codes', label: 'Land Use Codes', icon: Map }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-400">Loading subtype details...</div>
            </div>
          ) : (
            <div>
              {activeTab === 'specs' && (
                <div className="space-y-6">
                  {/* Residential Specifications */}
                  {resSpecs.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                          <Home className="w-5 h-5" />
                          Residential Standards
                        </h3>
                        <button className="btn btn-primary btn-sm d-inline-flex align-items-center">
                          <Plus className="w-4 h-4 me-1" />
                          Add Standard
                        </button>
                      </div>
                      
                      {resSpecs.map(spec => (
                        <div key={spec.res_spec_id} className="bg-gray-700 rounded-lg p-4 mb-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <h4 className="text-sm font-medium text-gray-300 mb-2">Density</h4>
                              <div className="text-white">
                                <div>DUA: {formatRange(spec.dua_min, spec.dua_max, ' units/ac')}</div>
                                <div>Min Lot: {formatNumber(spec.lot_area_min_sf, ' sf')}</div>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="text-sm font-medium text-gray-300 mb-2">Lot Dimensions</h4>
                              <div className="text-white">
                                <div>Min Width: {formatNumber(spec.lot_w_min_ft, ' ft')}</div>
                                <div>Min Depth: {formatNumber(spec.lot_d_min_ft, ' ft')}</div>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="text-sm font-medium text-gray-300 mb-2">Building</h4>
                              <div className="text-white">
                                <div>Max Height: {formatNumber(spec.hgt_max_ft, ' ft')}</div>
                                <div>Max Coverage: {formatNumber(spec.cov_max_pct, '%')}</div>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="text-sm font-medium text-gray-300 mb-2">Setbacks (ft)</h4>
                              <div className="text-white text-sm">
                                <div>Front: {formatNumber(spec.sb_front_ft)}</div>
                                <div>Side: {formatNumber(spec.sb_side_ft)}</div>
                                <div>Rear: {formatNumber(spec.sb_rear_ft)}</div>
                                <div>Corner: {formatNumber(spec.sb_corner_ft)}</div>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="text-sm font-medium text-gray-300 mb-2">Requirements</h4>
                              <div className="text-white text-sm">
                                <div>Min Open Space: {formatNumber(spec.os_min_pct, '%')}</div>
                                <div>Parking: {formatNumber(spec.pk_per_unit, ' /unit')}</div>
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex items-center justify-between">
                                <div>
                                  {spec.eff_date && (
                                    <div className="text-xs text-gray-400">
                                      Effective: {new Date(spec.eff_date).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                                <button
                                  className="btn btn-sm btn-ghost-primary"
                                  aria-label="Edit residential standard"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          {spec.notes && (
                            <div className="mt-3 pt-3 border-t border-gray-600">
                              <p className="text-sm text-gray-300">{spec.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Commercial Specifications */}
                  {comSpecs.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                          <Building className="w-5 h-5" />
                          Commercial Standards
                        </h3>
                        <button className="btn btn-primary btn-sm d-inline-flex align-items-center">
                          <Plus className="w-4 h-4 me-1" />
                          Add Standard
                        </button>
                      </div>
                      
                      {comSpecs.map(spec => (
                        <div key={spec.com_spec_id} className="bg-gray-700 rounded-lg p-4 mb-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <h4 className="text-sm font-medium text-gray-300 mb-2">Intensity</h4>
                              <div className="text-white">
                                <div>FAR: {formatRange(spec.far_min, spec.far_max)}</div>
                                <div>Max Coverage: {formatNumber(spec.cov_max_pct, '%')}</div>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="text-sm font-medium text-gray-300 mb-2">Building</h4>
                              <div className="text-white">
                                <div>Max Height: {formatNumber(spec.hgt_max_ft, ' ft')}</div>
                                <div>Min Open Space: {formatNumber(spec.os_min_pct, '%')}</div>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="text-sm font-medium text-gray-300 mb-2">Parking</h4>
                              <div className="text-white">
                                <div>Ratio: {formatNumber(spec.pk_per_ksf, ' /1000sf')}</div>
                              </div>
                            </div>
                            
                            <div className="col-span-2">
                              <h4 className="text-sm font-medium text-gray-300 mb-2">Setbacks (ft)</h4>
                              <div className="text-white text-sm grid grid-cols-4 gap-2">
                                <div>Front: {formatNumber(spec.sb_front_ft)}</div>
                                <div>Side: {formatNumber(spec.sb_side_ft)}</div>
                                <div>Rear: {formatNumber(spec.sb_rear_ft)}</div>
                                <div>Corner: {formatNumber(spec.sb_corner_ft)}</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-end">
                              <button
                                className="btn btn-sm btn-ghost-primary"
                                aria-label="Edit commercial standard"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          {spec.notes && (
                            <div className="mt-3 pt-3 border-t border-gray-600">
                              <p className="text-sm text-gray-300">{spec.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* No specifications */}
                  {resSpecs.length === 0 && comSpecs.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <Building className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <div className="text-lg mb-2">No Development Standards</div>
                      <div className="text-sm mb-4">Add development standards to define density, setbacks, and building requirements</div>
                      <button className="btn btn-primary">
                        Add Development Standard
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'products' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Lot Products</h3>
                    <button className="btn btn-primary btn-sm d-inline-flex align-items-center">
                      <Plus className="w-4 h-4 me-1" />
                      Add Product
                    </button>
                  </div>
                  
                  {lotProducts.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {lotProducts.map(product => (
                        <div key={product.product_id} className="bg-gray-700 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-white">{product.code}</h4>
                            <button
                              className="btn btn-sm btn-ghost-primary"
                              aria-label="Edit lot product"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="space-y-1 text-sm">
                            <div className="text-gray-300">
                              Lot Size: {product.lot_w_ft}' × {product.lot_d_ft}'
                            </div>
                            <div className="text-gray-300">
                              Area: {formatNumber(product.lot_area_sf, ' sf')}
                            </div>
                            <div className="text-gray-300">
                              Acres: {product.lot_area_sf ? (product.lot_area_sf / 43560).toFixed(3) : '—'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Home className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <div className="text-lg mb-2">No Lot Products</div>
                      <div className="text-sm mb-4">Add lot products to define standard lot sizes and configurations</div>
                      <button className="btn btn-primary">
                        Add Lot Product
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'codes' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Land Use Codes</h3>
                    <button className="btn btn-primary btn-sm d-inline-flex align-items-center">
                      <Plus className="w-4 h-4 me-1" />
                      Add Code
                    </button>
                  </div>
                  
                  {landuses.length > 0 ? (
                    <div className="space-y-3">
                      {landuses.map(landuse => {
                        const isSpecific = landuse.subtype_id === subtype.subtype_id;
                        const isGeneral = !landuse.subtype_id || landuse.subtype_id === 0;
                        
                        return (
                          <div key={landuse.landuse_id} className="bg-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-white">{landuse.landuse_code}</h4>
                                {isSpecific && (
                                  <span className="px-2 py-1 bg-blue-600 text-xs text-white rounded">
                                    Specific
                                  </span>
                                )}
                                {isGeneral && (
                                  <span className="px-2 py-1 bg-gray-600 text-xs text-gray-300 rounded">
                                    General
                                  </span>
                                )}
                                <div className="text-sm text-gray-400">({landuse.landuse_type})</div>
                              </div>
                              <button
                                className="btn btn-sm btn-ghost-primary"
                                aria-label="Edit land use code"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <div className="text-sm text-gray-300">
                              <div className="font-medium">{landuse.name}</div>
                              {landuse.description && landuse.description !== landuse.name && (
                                <div className="mt-1 text-gray-400">{landuse.description}</div>
                              )}
                              {isGeneral && (
                                <div className="mt-1 text-xs text-gray-500">
                                  Available to all subtypes • Click to assign specifically
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Map className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <div className="text-lg mb-2">No Land Use Codes</div>
                      <div className="text-sm mb-4">Add land use codes to define specific uses allowed within this subtype</div>
                      <button className="btn btn-primary">
                        Add Land Use Code
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LandUseDetails;