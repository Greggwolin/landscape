import React, { useMemo, useState } from 'react';
import type { PropertyData, UnitType, PropertyValidationErrors } from '../types';

interface PropertyDetailsProps {
  data: PropertyData;
  errors: PropertyValidationErrors;
  onUpdate: (section: keyof PropertyData, field: string, value: unknown) => void;
}

// Number formatting utilities
const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined || num === 0) return '';
  return num.toLocaleString('en-US');
};

const parseFormattedNumber = (str: string): number => {
  const cleaned = str.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

const PropertyDetails: React.FC<PropertyDetailsProps> = ({ data, errors, onUpdate }) => {
  // Calculate key metrics from unit mix
  const metrics = useMemo(() => {
    if (!data.unitMix || data.unitMix.length === 0) {
      return {
        totalUnits: 0,
        avgSize: 0,
        avgRent: 0,
        avgRentPerSF: 0,
        annualPGI: 0,
        annualLossToLease: 0
      };
    }

    const totalUnits = data.unitMix.reduce((sum, u) => sum + u.count, 0);
    const totalSF = data.unitMix.reduce((sum, u) => sum + (u.sqft * u.count), 0);
    const totalRent = data.unitMix.reduce((sum, u) => sum + (u.avgRent * u.count), 0);
    const totalLossToLease = data.unitMix.reduce((sum, u) => sum + ((u.marketRent - u.avgRent) * u.count), 0);
    const avgSize = totalUnits > 0 ? totalSF / totalUnits : 0;
    const avgRent = totalUnits > 0 ? totalRent / totalUnits : 0;
    const avgRentPerSF = avgSize > 0 ? avgRent / avgSize : 0;
    const annualPGI = totalRent * 12;
    const annualLossToLease = totalLossToLease * 12;

    return {
      totalUnits,
      avgSize: Math.round(avgSize),
      avgRent: Math.round(avgRent),
      avgRentPerSF: avgRentPerSF,
      annualPGI: Math.round(annualPGI),
      annualLossToLease: Math.round(annualLossToLease)
    };
  }, [data.unitMix]);

  const handleUnitMixUpdate = (index: number, field: keyof UnitType, value: any) => {
    const updatedUnitMix = [...(data.unitMix || [])];
    updatedUnitMix[index] = {
      ...updatedUnitMix[index],
      [field]: value
    };
    onUpdate('unitMix', 'unitMix', updatedUnitMix);
  };

  const handleAddUnit = () => {
    const newUnit: UnitType = {
      bed: 0,
      bath: 0,
      den: '',
      count: 0,
      sqft: 0,
      avgRent: 0,
      marketRent: 0
    };
    const updatedUnitMix = [...(data.unitMix || []), newUnit];
    onUpdate('unitMix', 'unitMix', updatedUnitMix);
  };

  const handleRemoveUnit = (index: number) => {
    const updatedUnitMix = (data.unitMix || []).filter((_, i) => i !== index);
    onUpdate('unitMix', 'unitMix', updatedUnitMix);
  };

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="property-details-content">
      {/* Key Metrics Cards */}
      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-value">{metrics.totalUnits}</div>
          <div className="metric-label">Units</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{metrics.avgSize} sf</div>
          <div className="metric-label">Avg Size</div>
        </div>
        <div className="metric-card metric-card-split">
          <div className="metric-split-row">
            <div className="metric-split-item">
              <div className="metric-value">{formatCurrency(metrics.avgRent)}</div>
              <div className="metric-label">Avg Rent</div>
            </div>
            <div className="metric-split-divider"></div>
            <div className="metric-split-item">
              <div className="metric-value">${metrics.avgRentPerSF.toFixed(2)}</div>
              <div className="metric-label">Per SF</div>
            </div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{formatCurrency(metrics.annualPGI)}</div>
          <div className="metric-label">Annual PGI</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{formatCurrency(metrics.annualLossToLease)}</div>
          <div className="metric-label">Annual Loss to Lease</div>
        </div>
      </div>

      {/* Two Column Layout: Unit Mix (left) and Property Specs (right) */}
      <div className="two-column-layout">
        {/* Left Column: Unit Mix Table */}
        <div className="unit-mix-section">
          <div className="section-header">
            <h3>Unit Mix</h3>
            <button onClick={handleAddUnit} className="btn-add">+ Add Unit Type</button>
          </div>

          <table className="data-table unit-mix-table">
            <thead>
              <tr>
                <th className="text-center">Bed</th>
                <th className="text-center">Bath</th>
                <th className="text-center" title="Den or other useable area">Other</th>
                <th className="text-center">Count</th>
                <th className="text-center">Size</th>
                <th className="text-center multiline-header">Current<br/>Rent / Mo</th>
                <th className="text-center multiline-header">Annual<br/>Rent</th>
                <th className="text-center multiline-header">Market<br/>Rent / Mo</th>
                <th className="text-center multiline-header">Loss to<br/>Lease</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(data.unitMix || []).map((unit, index) => {
                const annualRent = (unit.avgRent || 0) * (unit.count || 0) * 12;
                const lossToLease = ((unit.marketRent || 0) - (unit.avgRent || 0)) * (unit.count || 0) * 12;

                return (
                  <tr key={index}>
                    <td className="text-center">
                      <input
                        type="text"
                        className="integer"
                        value={formatNumber(unit.bed)}
                        onChange={(e) => handleUnitMixUpdate(index, 'bed', parseFormattedNumber(e.target.value))}
                        style={{ width: '50px', textAlign: 'center' }}
                      />
                    </td>
                    <td className="text-center">
                      <input
                        type="text"
                        className="integer"
                        value={formatNumber(unit.bath)}
                        onChange={(e) => handleUnitMixUpdate(index, 'bath', parseFormattedNumber(e.target.value))}
                        style={{ width: '50px', textAlign: 'center' }}
                      />
                    </td>
                    <td className="text-center">
                      <input
                        type="text"
                        value={unit.den || ''}
                        onChange={(e) => handleUnitMixUpdate(index, 'den', e.target.value)}
                        style={{ width: '80px', textAlign: 'left' }}
                        placeholder="Den"
                      />
                    </td>
                    <td className="text-center">
                      <input
                        type="text"
                        className="integer"
                        value={formatNumber(unit.count)}
                        onChange={(e) => handleUnitMixUpdate(index, 'count', parseFormattedNumber(e.target.value))}
                        style={{ width: '50px', textAlign: 'center' }}
                      />
                    </td>
                    <td className="text-center">
                      <input
                        type="text"
                        className="integer"
                        value={formatNumber(unit.sqft)}
                        onChange={(e) => handleUnitMixUpdate(index, 'sqft', parseFormattedNumber(e.target.value))}
                        style={{ width: '60px', textAlign: 'center' }}
                      />
                    </td>
                    <td className="text-right">
                      <input
                        type="text"
                        className="currency"
                        value={formatNumber(unit.avgRent)}
                        onChange={(e) => handleUnitMixUpdate(index, 'avgRent', parseFormattedNumber(e.target.value))}
                        style={{ width: '80px' }}
                      />
                    </td>
                    <td className="text-right">
                      <span className="calculated-value">{formatNumber(annualRent)}</span>
                    </td>
                    <td className="text-right">
                      <input
                        type="text"
                        className="currency"
                        value={formatNumber(unit.marketRent)}
                        onChange={(e) => handleUnitMixUpdate(index, 'marketRent', parseFormattedNumber(e.target.value))}
                        style={{ width: '80px' }}
                      />
                    </td>
                    <td className="text-right">
                      <span className="calculated-value">{formatNumber(lossToLease)}</span>
                    </td>
                    <td>
                      <button onClick={() => handleRemoveUnit(index)} className="btn-remove">×</button>
                    </td>
                  </tr>
                );
              })}
              {(!data.unitMix || data.unitMix.length === 0) && (
                <tr>
                  <td colSpan={10} className="empty-state">
                    <p className="helper-text">No units defined. Click "Add Unit Type" to get started.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Right Column: Property Specifications */}
        <div className="property-sections">
          <div className="section-header">
            <h3>Property Specifications</h3>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label>Total SF</label>
              <input
                type="text"
                className="integer property-spec-input"
                value={formatNumber(data.totalSF)}
                onChange={(e) => onUpdate('totalSF' as any, 'totalSF', parseFormattedNumber(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Stories</label>
              <input
                type="text"
                className="integer property-spec-input"
                value={formatNumber(data.stories)}
                onChange={(e) => onUpdate('stories' as any, 'stories', parseFormattedNumber(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Parking</label>
              <input
                type="text"
                className="integer property-spec-input"
                value={formatNumber(data.parkingSpaces)}
                onChange={(e) => onUpdate('parkingSpaces' as any, 'parkingSpaces', parseFormattedNumber(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Age</label>
              <input
                type="text"
                className="property-spec-input"
                value={data.yearBuilt || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  onUpdate('yearBuilt' as any, 'yearBuilt', value ? parseInt(value, 10) : 0);
                }}
                maxLength={4}
                placeholder="YYYY"
              />
            </div>
            <div className="form-group">
              <label>Acres</label>
              <input
                type="text"
                className="property-spec-input"
                value={data.acres || ''}
                onChange={(e) => onUpdate('acres' as any, 'acres', parseFormattedNumber(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Zoning</label>
              <input
                type="text"
                className="property-spec-input"
                value={data.zoning || ''}
                onChange={(e) => onUpdate('zoning' as any, 'zoning', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetails;
