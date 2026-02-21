'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  CCard,
  CCardHeader,
  CCardBody,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
  CSpinner,
} from '@coreui/react';
import { formatCurrency, formatNumber } from '@/utils/formatNumber';
import { unitTypesAPI, unitsAPI, leasesAPI, UnitType, Unit, Lease } from '@/lib/api/multifamily';
import { SemanticBadge } from '@/components/ui/landscape';

interface FloorPlanMatrixProps {
  projectId: number;
}

interface FloorPlanRow {
  unitTypeId: number;
  unitTypeCode: string;
  unitTypeName: string | null;
  bedrooms: number;
  bathrooms: number;
  avgSqFt: number;
  unitCount: number;
  currentRentMin: number | null;
  currentRentMax: number | null;
  currentRentAvg: number | null;
  currentRentPerSF: number | null;
  monthlyIncome: number | null;
  source: 'rent_roll' | 'unit_type';
}

/**
 * FloorPlanMatrix - Displays unit type summary with current rents
 *
 * Data Source Hierarchy:
 * 1. If rent roll exists (units with active leases) -> aggregate from rent roll (READ-ONLY)
 * 2. If rent roll is empty -> use tbl_multifamily_unit_type directly (EDITABLE)
 */
export default function FloorPlanMatrix({ projectId }: FloorPlanMatrixProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [dataSource, setDataSource] = useState<'rent_roll' | 'unit_type'>('unit_type');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch all data in parallel
        const [unitTypesData, unitsData, leasesData] = await Promise.all([
          unitTypesAPI.list(projectId),
          unitsAPI.list(projectId),
          leasesAPI.list(projectId),
        ]);

        setUnitTypes(unitTypesData);
        setUnits(unitsData);
        setLeases(leasesData);

        // Determine data source based on lease availability
        // Include MONTH_TO_MONTH leases — these are occupied units generating rent
        const occupiedStatuses = ['ACTIVE', 'MONTH_TO_MONTH'];
        const activeLeases = leasesData.filter(l => occupiedStatuses.includes(l.lease_status));
        setDataSource(activeLeases.length > 0 ? 'rent_roll' : 'unit_type');
      } catch (err) {
        console.error('[FloorPlanMatrix] Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [projectId]);

  // Build floor plan rows based on data source
  const floorPlanRows: FloorPlanRow[] = useMemo(() => {
    if (dataSource === 'rent_roll' && units.length > 0) {
      // Aggregate from rent roll - build a map of unit_id to current rent from occupied leases
      const occupiedStatuses = ['ACTIVE', 'MONTH_TO_MONTH'];
      const unitRentMap = new Map<number, number>();
      leases.forEach(lease => {
        if (occupiedStatuses.includes(lease.lease_status) && lease.base_rent_monthly) {
          unitRentMap.set(lease.unit_id, Number(lease.base_rent_monthly));
        }
      });

      // Group units by unit_type
      const unitsByType = new Map<string, Unit[]>();
      units.forEach(unit => {
        const typeKey = unit.unit_type;
        if (!unitsByType.has(typeKey)) {
          unitsByType.set(typeKey, []);
        }
        unitsByType.get(typeKey)!.push(unit);
      });

      // Build aggregated rows
      const rows: FloorPlanRow[] = [];
      unitsByType.forEach((typeUnits, typeCode) => {
        // Find matching unit type for metadata
        const unitType = unitTypes.find(ut => ut.unit_type_code === typeCode);

        // Get current rents for these units
        const rents: number[] = [];
        typeUnits.forEach(unit => {
          const rent = unitRentMap.get(unit.unit_id);
          if (rent && rent > 0) {
            rents.push(rent);
          }
        });

        const avgSqFt = typeUnits.reduce((sum, u) => sum + (u.square_feet || 0), 0) / typeUnits.length;
        const rentMin = rents.length > 0 ? Math.min(...rents) : null;
        const rentMax = rents.length > 0 ? Math.max(...rents) : null;
        const rentAvg = rents.length > 0 ? rents.reduce((a, b) => a + b, 0) / rents.length : null;
        const rentPerSF = rentAvg && avgSqFt > 0 ? rentAvg / avgSqFt : null;
        const monthlyIncome = rentAvg ? rentAvg * rents.length : null;

        rows.push({
          unitTypeId: unitType?.unit_type_id || 0,
          unitTypeCode: typeCode,
          unitTypeName: unitType?.unit_type_name || null,
          bedrooms: typeUnits[0]?.bedrooms || unitType?.bedrooms || 0,
          bathrooms: typeUnits[0]?.bathrooms || unitType?.bathrooms || 0,
          avgSqFt: Math.round(avgSqFt),
          unitCount: typeUnits.length,
          currentRentMin: rentMin,
          currentRentMax: rentMax,
          currentRentAvg: rentAvg ? Math.round(rentAvg) : null,
          currentRentPerSF: rentPerSF ? Math.round(rentPerSF * 100) / 100 : null,
          monthlyIncome: monthlyIncome ? Math.round(monthlyIncome) : null,
          source: 'rent_roll',
        });
      });

      // Sort by bedrooms, then by unit type code
      return rows.sort((a, b) => {
        if (a.bedrooms !== b.bedrooms) return a.bedrooms - b.bedrooms;
        return a.unitTypeCode.localeCompare(b.unitTypeCode);
      });
    } else {
      // Use unit type table directly
      return unitTypes
        .filter(ut => ut.total_units > 0) // Only show types with units
        .map(ut => ({
          unitTypeId: ut.unit_type_id,
          unitTypeCode: ut.unit_type_code,
          unitTypeName: ut.unit_type_name || null,
          bedrooms: Number(ut.bedrooms),
          bathrooms: Number(ut.bathrooms),
          avgSqFt: ut.avg_square_feet,
          unitCount: ut.total_units,
          currentRentMin: Number(ut.current_market_rent),
          currentRentMax: Number(ut.current_market_rent),
          currentRentAvg: Number(ut.current_market_rent),
          currentRentPerSF: ut.avg_square_feet > 0
            ? Math.round((Number(ut.current_market_rent) / ut.avg_square_feet) * 100) / 100
            : null,
          monthlyIncome: Math.round(Number(ut.current_market_rent) * ut.total_units),
          source: 'unit_type' as const,
        }))
        .sort((a, b) => {
          if (a.bedrooms !== b.bedrooms) return a.bedrooms - b.bedrooms;
          return a.unitTypeCode.localeCompare(b.unitTypeCode);
        });
    }
  }, [dataSource, units, unitTypes, leases]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalUnits = floorPlanRows.reduce((sum, row) => sum + row.unitCount, 0);
    const totalMonthlyIncome = floorPlanRows.reduce((sum, row) => sum + (row.monthlyIncome || 0), 0);
    const weightedAvgRent = totalUnits > 0
      ? floorPlanRows.reduce((sum, row) => sum + (row.currentRentAvg || 0) * row.unitCount, 0) / totalUnits
      : 0;
    const weightedAvgSF = totalUnits > 0
      ? floorPlanRows.reduce((sum, row) => sum + row.avgSqFt * row.unitCount, 0) / totalUnits
      : 0;
    const avgRentPerSF = weightedAvgSF > 0 ? weightedAvgRent / weightedAvgSF : 0;

    return {
      totalUnits,
      totalMonthlyIncome,
      weightedAvgRent: Math.round(weightedAvgRent),
      weightedAvgSF: Math.round(weightedAvgSF),
      avgRentPerSF: Math.round(avgRentPerSF * 100) / 100,
    };
  }, [floorPlanRows]);

  // Format rent range
  const formatRentRange = (min: number | null, max: number | null): string => {
    if (min === null && max === null) return '—';
    if (min === max || max === null) return formatCurrency(min || 0);
    return `${formatCurrency(min || 0)} - ${formatCurrency(max)}`;
  };

  if (loading) {
    return (
      <CCard className="studio-card floor-plan-matrix">
        <CCardHeader className="studio-card-header">
          <span className="fw-semibold">Floor Plan Matrix</span>
        </CCardHeader>
        <CCardBody className="studio-card-body d-flex justify-content-center align-items-center py-5">
          <CSpinner size="sm" className="me-2" />
          <span style={{ color: 'var(--studio-text-secondary)' }}>Loading floor plans...</span>
        </CCardBody>
      </CCard>
    );
  }

  if (error) {
    return (
      <CCard className="studio-card floor-plan-matrix">
        <CCardHeader className="studio-card-header">
          <span className="fw-semibold">Floor Plan Matrix</span>
        </CCardHeader>
        <CCardBody className="studio-card-body">
          <div className="studio-text-error">{error}</div>
        </CCardBody>
      </CCard>
    );
  }

  return (
    <CCard className="studio-card floor-plan-matrix">
      <CCardHeader className="studio-card-header d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          <span className="fw-semibold">Floor Plan Matrix</span>
          <SemanticBadge
            intent="category"
            value={dataSource}
            style={{ fontSize: '0.7rem' }}
          >
            {dataSource === 'rent_roll' ? 'From Rent Roll' : 'From Unit Types'}
          </SemanticBadge>
        </div>
        <span style={{ color: 'var(--studio-text-secondary)', fontSize: '0.875rem' }}>
          {totals.totalUnits} units | {formatCurrency(totals.totalMonthlyIncome)}/mo
        </span>
      </CCardHeader>
      <CCardBody className="studio-card-body">
        <div className="table-responsive">
          <CTable hover className="mb-0 studio-table">
            <CTableHead>
              {/* Group header row */}
              <CTableRow>
                <CTableHeaderCell rowSpan={2} style={{ color: 'var(--studio-text-secondary)', verticalAlign: 'bottom' }}>Unit Type</CTableHeaderCell>
                <CTableHeaderCell rowSpan={2} className="text-end" style={{ color: 'var(--studio-text-secondary)', verticalAlign: 'bottom' }}>Units</CTableHeaderCell>
                <CTableHeaderCell rowSpan={2} className="text-end" style={{ color: 'var(--studio-text-secondary)', minWidth: '90px', verticalAlign: 'bottom' }}>Avg SF</CTableHeaderCell>
                <CTableHeaderCell colSpan={3} className="text-center" style={{ color: 'var(--studio-text-secondary)', borderBottom: '1px solid var(--studio-border)' }}>Current Rent</CTableHeaderCell>
                <CTableHeaderCell rowSpan={2} className="text-end" style={{ color: 'var(--studio-text-secondary)', verticalAlign: 'bottom' }}>Monthly Income</CTableHeaderCell>
              </CTableRow>
              {/* Sub-header row for rent columns */}
              <CTableRow>
                <CTableHeaderCell className="text-end" style={{ color: 'var(--studio-text-secondary)' }}>Range</CTableHeaderCell>
                <CTableHeaderCell className="text-end" style={{ color: 'var(--studio-text-secondary)' }}>Avg</CTableHeaderCell>
                <CTableHeaderCell className="text-end" style={{ color: 'var(--studio-text-secondary)' }}>$/SF</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {floorPlanRows.map((row) => (
                <CTableRow key={row.unitTypeId || row.unitTypeCode}>
                  <CTableDataCell style={{ color: 'var(--studio-text)' }}>
                    <span className="fw-medium">{row.unitTypeName || row.unitTypeCode}</span>
                  </CTableDataCell>
                  <CTableDataCell className="text-end studio-tnum" style={{ color: 'var(--studio-text)' }}>
                    {formatNumber(row.unitCount)}
                  </CTableDataCell>
                  <CTableDataCell className="text-end studio-tnum" style={{ color: 'var(--studio-text)' }}>
                    {formatNumber(row.avgSqFt)}
                  </CTableDataCell>
                  <CTableDataCell className="text-end studio-tnum" style={{ color: 'var(--studio-text)' }}>
                    {formatRentRange(row.currentRentMin, row.currentRentMax)}
                  </CTableDataCell>
                  <CTableDataCell className="text-end studio-tnum" style={{ color: 'var(--studio-text)' }}>
                    {row.currentRentAvg !== null ? formatCurrency(row.currentRentAvg) : '—'}
                  </CTableDataCell>
                  <CTableDataCell className="text-end studio-tnum" style={{ color: 'var(--studio-text)' }}>
                    {row.currentRentPerSF !== null ? `$${row.currentRentPerSF.toFixed(2)}` : '—'}
                  </CTableDataCell>
                  <CTableDataCell className="text-end studio-tnum" style={{ color: 'var(--studio-text)' }}>
                    {row.monthlyIncome !== null ? formatCurrency(row.monthlyIncome) : '—'}
                  </CTableDataCell>
                </CTableRow>
              ))}
              {/* Totals Row */}
              <CTableRow style={{ borderTop: '2px solid var(--studio-border-strong)' }}>
                <CTableDataCell style={{ color: 'var(--studio-text)' }}>
                  <span className="fw-semibold">Total / Weighted Avg</span>
                </CTableDataCell>
                <CTableDataCell className="text-end studio-tnum fw-semibold" style={{ color: 'var(--studio-text)' }}>
                  {formatNumber(totals.totalUnits)}
                </CTableDataCell>
                <CTableDataCell className="text-end studio-tnum fw-semibold" style={{ color: 'var(--studio-text)' }}>
                  {formatNumber(totals.weightedAvgSF)}
                </CTableDataCell>
                <CTableDataCell className="text-end" style={{ color: 'var(--studio-text-secondary)' }}>—</CTableDataCell>
                <CTableDataCell className="text-end studio-tnum fw-semibold" style={{ color: 'var(--studio-text)' }}>
                  {formatCurrency(totals.weightedAvgRent)}
                </CTableDataCell>
                <CTableDataCell className="text-end studio-tnum fw-semibold" style={{ color: 'var(--studio-text)' }}>
                  ${totals.avgRentPerSF.toFixed(2)}
                </CTableDataCell>
                <CTableDataCell className="text-end studio-tnum fw-semibold" style={{ color: 'var(--studio-primary)' }}>
                  {formatCurrency(totals.totalMonthlyIncome)}
                </CTableDataCell>
              </CTableRow>
            </CTableBody>
          </CTable>
        </div>
      </CCardBody>
    </CCard>
  );
}
