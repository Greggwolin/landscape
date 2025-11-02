'use client';

import React, { useState, useMemo, useEffect, memo } from 'react';
import { CCard, CCardHeader, CCardBody } from '@coreui/react';
import { unitTypesAPI, unitsAPI, leasesAPI } from '@/lib/api/multifamily';
import ProjectTabMap from '@/components/map/ProjectTabMap';

interface Project {
  project_id: number;
  project_name: string;
  project_type_code?: string;
}

interface PropertyTabProps {
  project: Project;
}

// Mock data types
interface FloorPlan {
  id: string;
  name: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  unitCount: number;
  currentRent: number;
  marketRent: number;
  aiEstimate: number;
}

interface Unit {
  id: string;
  unitNumber: string;
  floorPlan: string;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  currentRent: number;
  marketRent: number;
  lossToLease: number;
  proformaRent: number;
  leaseStart: string;
  leaseEnd: string;
  tenantName: string;
  status: 'Occupied' | 'Vacant' | 'Notice' | 'Renewal';
  deposit: number;
  monthlyIncome: number;
  rentPerSF: number;
  proformaRentPerSF: number;
  notes: string;
}

interface ColumnConfig {
  id: string;
  label: string;
  category: 'unit' | 'tenant' | 'lease' | 'financial' | 'floorplan';
  visible: boolean;
  type: 'input' | 'calculated';
  description?: string;
}

// Column configuration for rent roll
const defaultColumns: ColumnConfig[] = [
  { id: 'unitNumber', label: 'Unit', category: 'unit', visible: true, type: 'input' },
  { id: 'floorPlan', label: 'Plan', category: 'floorplan', visible: true, type: 'calculated' },
  { id: 'bedrooms', label: 'Bed', category: 'unit', visible: true, type: 'input' },
  { id: 'bathrooms', label: 'Bath', category: 'unit', visible: true, type: 'input' },
  { id: 'sqft', label: 'SF', category: 'unit', visible: true, type: 'input' },
  { id: 'status', label: 'Status', category: 'tenant', visible: true, type: 'input' },
  { id: 'leaseEnd', label: 'Lease End', category: 'lease', visible: true, type: 'input' },
  { id: 'currentRent', label: 'Current Rent', category: 'financial', visible: true, type: 'input' },
  { id: 'marketRent', label: 'Market Rent', category: 'financial', visible: true, type: 'input' },
  { id: 'lossToLease', label: 'Loss to Lease', category: 'financial', visible: true, type: 'calculated', description: 'Difference between market rent and current rent' },
];

// Mock floor plans data
const mockFloorPlans: FloorPlan[] = [
  { id: '1', name: 'A1', bedrooms: 1, bathrooms: 1, sqft: 650, unitCount: 24, currentRent: 1200, marketRent: 1350, aiEstimate: 1375 },
  { id: '2', name: 'A2', bedrooms: 1, bathrooms: 1, sqft: 725, unitCount: 18, currentRent: 1300, marketRent: 1425, aiEstimate: 1420 },
  { id: '3', name: 'B1', bedrooms: 2, bathrooms: 2, sqft: 950, unitCount: 36, currentRent: 1650, marketRent: 1800, aiEstimate: 1825 },
  { id: '4', name: 'B2', bedrooms: 2, bathrooms: 2, sqft: 1050, unitCount: 28, currentRent: 1750, marketRent: 1900, aiEstimate: 1950 },
  { id: '5', name: 'C1', bedrooms: 3, bathrooms: 2, sqft: 1250, unitCount: 16, currentRent: 2100, marketRent: 2250, aiEstimate: 2300 },
];

function PropertyTab({ project }: PropertyTabProps) {
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<ColumnConfig[]>(defaultColumns);
  const [showFieldChooser, setShowFieldChooser] = useState(false);

  const projectId = project.project_id;

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        console.log('[PropertyTab] Loading data for project:', projectId);
        console.log('[PropertyTab] NEXT_PUBLIC_DJANGO_API_URL:', process.env.NEXT_PUBLIC_DJANGO_API_URL);

        // Fetch all data in parallel for better performance
        const [unitTypesData, unitsData, leasesData] = await Promise.all([
          unitTypesAPI.list(projectId),
          unitsAPI.list(projectId),
          leasesAPI.list(projectId)
        ]);

        // Transform floor plans
        const transformedFloorPlans: FloorPlan[] = unitTypesData.map(ut => ({
          id: ut.unit_type_id.toString(),
          name: ut.unit_type_code,
          bedrooms: Number(ut.bedrooms),
          bathrooms: Number(ut.bathrooms),
          sqft: ut.avg_square_feet,
          unitCount: ut.total_units,
          currentRent: Number(ut.current_market_rent) || 0,
          marketRent: Number(ut.current_market_rent) || 0,
          aiEstimate: (Number(ut.current_market_rent) || 0) * 1.05
        }));

        // Create lease lookup map
        const leasesByUnit = new Map(leasesData.map(l => [l.unit_id, l]));

        const transformedUnits: Unit[] = unitsData.map(u => {
          const lease = leasesByUnit.get(u.unit_id);
          const currentRent = lease ? Number(lease.base_rent_monthly) || 0 : 0;
          const marketRent = Number(u.market_rent) || 0;
          const lossToLease = marketRent - currentRent;

          return {
            id: u.unit_id.toString(),
            unitNumber: u.unit_number,
            floorPlan: u.unit_type,
            sqft: u.square_feet,
            bedrooms: Number(u.bedrooms || 0),
            bathrooms: Number(u.bathrooms || 0),
            currentRent,
            marketRent,
            lossToLease,
            proformaRent: marketRent * 1.05,
            leaseStart: lease?.lease_start_date || '',
            leaseEnd: lease?.lease_end_date || '',
            tenantName: lease?.resident_name || '',
            status: lease?.lease_status === 'ACTIVE' ? 'Occupied' : 'Vacant',
            deposit: Number(lease?.security_deposit) || 0,
            monthlyIncome: currentRent,
            rentPerSF: u.square_feet > 0 && lease ? currentRent / u.square_feet : 0,
            proformaRentPerSF: u.square_feet > 0 && u.market_rent ? marketRent / u.square_feet : 0,
            notes: u.other_features || ''
          };
        });

        // Always set units if we have any, regardless of floor plans
        if (transformedUnits.length > 0) {
          setUnits(transformedUnits);
        }

        // Use mock floor plans as fallback if none exist
        if (transformedFloorPlans.length === 0) {
          setFloorPlans(mockFloorPlans);
        } else {
          setFloorPlans(transformedFloorPlans);
        }

        setLoading(false);
      } catch (error) {
        console.error('Failed to load data:', error);
        // On error, show mock floor plans but keep units empty
        setFloorPlans(mockFloorPlans);
        setLoading(false);
      }
    };

    loadData();
  }, [projectId]);

  const visibleColumns = useMemo(() => {
    return columns.filter(col => col.visible);
  }, [columns]);

  const handleToggleColumn = (columnId: string) => {
    setColumns(prev => prev.map(col =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg" style={{ color: 'var(--cui-secondary-color)' }}>
          Loading property data...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Floor Plans / Unit Mix Section with Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unit Mix Table */}
        <CCard>
          <CCardHeader style={{ backgroundColor: 'rgb(241, 242, 246)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--cui-body-color)' }}>
              Unit Mix
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--cui-secondary-color)' }}>
              {floorPlans.length} Plans, {floorPlans.reduce((sum, fp) => sum + fp.unitCount, 0)} Units
            </p>
          </CCardHeader>

          <CCardBody className="p-0">
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: '#f8f8f8' }}>
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium" style={{ color: 'var(--cui-body-color)' }}>Plan</th>
                  <th className="px-2 py-2 text-center text-sm font-medium" style={{ color: 'var(--cui-body-color)', width: '60px' }}>Bed</th>
                  <th className="px-2 py-2 text-center text-sm font-medium" style={{ color: 'var(--cui-body-color)', width: '60px' }}>Bath</th>
                  <th className="px-2 py-2 text-right text-sm font-medium" style={{ color: 'var(--cui-body-color)', width: '80px' }}>SF</th>
                  <th className="px-2 py-2 text-right text-sm font-medium" style={{ color: 'var(--cui-body-color)', width: '60px' }}>Units</th>
                  <th className="px-4 py-2 text-right text-sm font-medium" style={{ color: 'var(--cui-body-color)' }}>Current Rent</th>
                </tr>
              </thead>
              <tbody>
                {floorPlans.map((plan) => (
                  <tr
                    key={plan.id}
                    className="border-t hover:bg-opacity-50"
                    style={{
                      borderColor: 'var(--cui-border-color)',
                      backgroundColor: 'transparent'
                    }}
                  >
                    <td className="px-4 py-2" style={{ color: 'var(--cui-body-color)' }}>
                      <span className="font-medium">{plan.name || '-'}</span>
                    </td>
                    <td className="px-2 py-2 text-center" style={{ color: 'var(--cui-body-color)' }}>
                      {plan.bedrooms || '-'}
                    </td>
                    <td className="px-2 py-2 text-center" style={{ color: 'var(--cui-body-color)' }}>
                      {plan.bathrooms || '-'}
                    </td>
                    <td className="px-2 py-2 text-right" style={{ color: 'var(--cui-body-color)' }}>
                      {plan.sqft ? plan.sqft.toLocaleString() : '-'}
                    </td>
                    <td className="px-2 py-2 text-right font-medium" style={{ color: 'var(--cui-body-color)' }}>
                      {plan.unitCount || '-'}
                    </td>
                    <td className="px-4 py-2 text-right" style={{ color: 'var(--cui-body-color)' }}>
                      {plan.currentRent ? `$${Math.round(plan.currentRent).toLocaleString()}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </CCardBody>
        </CCard>

        {/* Map */}
        <div>
          <ProjectTabMap
            projectId={projectId.toString()}
            styleUrl={process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'aerial'}
            tabId="property"
          />
        </div>
      </div>

      {/* Rent Roll Section */}
      {units.length > 0 && (
        <CCard>
          <CCardHeader style={{ backgroundColor: 'rgb(241, 242, 246)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--cui-body-color)' }}>
                  Rent Roll
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--cui-secondary-color)' }}>
                  {units.length} units loaded
                </p>
              </div>
              <button
                onClick={() => setShowFieldChooser(true)}
                className="px-4 py-2 rounded transition-colors"
                style={{
                  backgroundColor: 'var(--cui-primary)',
                  color: 'white'
                }}
              >
                Configure Columns
              </button>
            </div>
          </CCardHeader>

          <CCardBody className="p-0">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: '#f8f8f8' }}>
                <tr>
                  {visibleColumns.map(col => {
                    const isNumeric = ['sqft', 'currentRent', 'marketRent', 'lossToLease'].includes(col.id);
                    const isCentered = ['bedrooms', 'bathrooms'].includes(col.id);
                    return (
                      <th
                        key={col.id}
                        className={`px-4 py-3 font-medium ${
                          isNumeric ? 'text-right' :
                          isCentered ? 'text-center' :
                          'text-left'
                        }`}
                        style={{ color: 'var(--cui-body-color)' }}
                      >
                        {col.label}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {units.map((unit) => (
                  <tr
                    key={unit.id}
                    className="border-t"
                    style={{ borderColor: 'var(--cui-border-color)' }}
                  >
                    {visibleColumns.map(col => {
                      const value = unit[col.id as keyof Unit];
                      let displayValue: string;
                      let textColor = 'var(--cui-body-color)';

                      // Format rent values
                      if (col.id === 'currentRent' || col.id === 'marketRent') {
                        const numValue = typeof value === 'number' ? value : 0;
                        displayValue = numValue > 0 ? `$${Math.round(numValue).toLocaleString()}` : '-';
                      }
                      // Format loss to lease (can be positive or negative)
                      else if (col.id === 'lossToLease') {
                        const numValue = typeof value === 'number' ? value : 0;
                        if (numValue === 0) {
                          displayValue = '-';
                        } else if (numValue > 0) {
                          displayValue = `$${Math.round(numValue).toLocaleString()}`;
                          textColor = '#dc2626'; // red for loss
                        } else {
                          displayValue = `-$${Math.round(Math.abs(numValue)).toLocaleString()}`;
                          textColor = '#16a34a'; // green for gain
                        }
                      }
                      // Format SF values
                      else if (col.id === 'sqft') {
                        const numValue = typeof value === 'number' ? value : 0;
                        displayValue = numValue > 0 ? numValue.toLocaleString() : '-';
                      }
                      // Format bed/bath
                      else if (col.id === 'bedrooms' || col.id === 'bathrooms') {
                        displayValue = value ? value.toString() : '-';
                      }
                      // All other values
                      else {
                        displayValue = value ? value.toString() : '-';
                      }

                      const isNumeric = ['sqft', 'currentRent', 'marketRent', 'lossToLease'].includes(col.id);
                      const isCentered = ['bedrooms', 'bathrooms'].includes(col.id);

                      return (
                        <td
                          key={col.id}
                          className={`px-4 py-2 ${
                            isNumeric ? 'text-right' :
                            isCentered ? 'text-center' :
                            'text-left'
                          }`}
                          style={{ color: textColor }}
                        >
                          {displayValue}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </CCardBody>
        </CCard>
      )}

      {/* Field Chooser Modal */}
      {showFieldChooser && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setShowFieldChooser(false)}
        >
          <div
            className="rounded-lg p-6 max-w-2xl w-full mx-4 border"
            style={{
              backgroundColor: 'var(--cui-body-bg)',
              borderColor: 'var(--cui-border-color)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold" style={{ color: 'var(--cui-body-color)' }}>
                Configure Columns
              </h3>
              <button
                onClick={() => setShowFieldChooser(false)}
                className="transition-colors"
                style={{ color: 'var(--cui-secondary-color)' }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-2 mb-4">
              {columns.map(col => (
                <label
                  key={col.id}
                  className="flex items-start gap-3 p-3 rounded cursor-pointer transition-colors"
                  style={{
                    backgroundColor: 'var(--cui-tertiary-bg)',
                    border: '1px solid var(--cui-border-color)'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={col.visible}
                    onChange={() => handleToggleColumn(col.id)}
                    className="mt-1 cursor-pointer"
                    style={{
                      width: '20px',
                      height: '20px',
                      accentColor: 'var(--cui-primary)',
                      cursor: 'pointer'
                    }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium" style={{ color: 'var(--cui-body-color)' }}>
                        {col.label}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: 'var(--cui-secondary-bg)',
                          color: 'var(--cui-secondary-color)'
                        }}
                      >
                        {col.category}
                      </span>
                    </div>
                    {col.description && (
                      <p className="text-xs mt-1" style={{ color: 'var(--cui-secondary-color)' }}>
                        {col.description}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowFieldChooser(false)}
                className="px-4 py-2 rounded transition-colors"
                style={{
                  backgroundColor: 'var(--cui-primary)',
                  color: 'white'
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export memoized version to prevent unnecessary re-renders
export default memo(PropertyTab);
