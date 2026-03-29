'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CFormCheck,
} from '@coreui/react';
import { Columns } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/utils/formatNumber';
import { SemanticBadge } from '@/components/ui/landscape';
import { useDynamicColumns } from '@/hooks/useDynamicColumns';
import { useWorkbench } from '@/contexts/WorkbenchContext';

// Column definitions for visibility toggle
const COLUMNS = [
  { key: 'unitNumber', label: 'Unit', default: true },
  { key: 'unitType', label: 'Type', default: true },
  { key: 'tenant', label: 'Tenant', default: true },
  { key: 'bdBa', label: 'Bd/Ba', default: true },
  { key: 'sqft', label: 'Sq Ft', default: true },
  { key: 'currentRent', label: 'Current Rent', default: true },
  { key: 'rentPerSF', label: 'Rent/SF', default: true },
  { key: 'leaseStart', label: 'Lease Start', default: true },
  { key: 'leaseEnd', label: 'Lease End', default: true },
  { key: 'status', label: 'Status', default: true },
] as const;

type ColumnKey = typeof COLUMNS[number]['key'] | string;
import { unitsAPI, leasesAPI, Unit, Lease } from '@/lib/api/multifamily';

interface RentRollProps {
  projectId: number;
}

interface RentRollRow {
  unitId: number;
  unitNumber: string;
  unitType: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  currentRent: number | null;
  rentPerSF: number | null;
  leaseStart: string | null;
  leaseEnd: string | null;
  residentName: string | null;
  leaseStatus: string;
  occupancyStatus: 'Occupied' | 'Vacant' | 'Notice' | 'Month-to-Month';
}

type SortField = 'unitNumber' | 'unitType' | 'sqft' | 'currentRent' | 'leaseEnd' | 'occupancyStatus';
type SortDirection = 'asc' | 'desc';

/**
 * RentRoll - Displays unit-level detail with current rents
 *
 * Shows individual units with their lease information, focusing on current rents only.
 * Proforma rents are excluded per Studio branch requirements.
 */
export default function RentRoll({ projectId }: RentRollProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [sortField, setSortField] = useState<SortField>('unitNumber');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  // Fetch dynamic columns for multifamily_unit (logical table name, no tbl_ prefix)
  const unitIds = useMemo(() => units.map(u => u.unit_id), [units]);
  const {
    columns: dynamicColumns,
    values: dynamicValues,
  } = useDynamicColumns(projectId, 'multifamily_unit', unitIds.length > 0 ? unitIds : undefined);

  // Build combined column list (static + dynamic)
  const allColumns = useMemo(() => {
    const base: Array<{key: string; label: string; default: boolean}> = COLUMNS.map(c => ({ key: c.key as string, label: c.label as string, default: c.default }));
    for (const dc of dynamicColumns) {
      if (dc.is_active) {
        base.push({ key: `dyn_${dc.column_key}`, label: dc.display_label, default: true });
      }
    }
    return base;
  }, [dynamicColumns]);

  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(
    new Set(COLUMNS.filter(c => c.default).map(c => c.key))
  );

  // Add dynamic columns to visible set when they arrive
  useEffect(() => {
    if (dynamicColumns.length > 0) {
      setVisibleColumns(prev => {
        const newSet = new Set(prev);
        for (const dc of dynamicColumns) {
          if (dc.is_active) newSet.add(`dyn_${dc.column_key}`);
        }
        return newSet;
      });
    }
  }, [dynamicColumns]);

  // Toggle column visibility
  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const isColumnVisible = (key: ColumnKey) => visibleColumns.has(key);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [unitsData, leasesData] = await Promise.all([
        unitsAPI.list(projectId),
        leasesAPI.list(projectId),
      ]);

      setUnits(unitsData);
      setLeases(leasesData);
    } catch (err) {
      console.error('[RentRoll] Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh when workbench commits
  const { lastCommitTimestamp } = useWorkbench();
  useEffect(() => {
    if (lastCommitTimestamp > 0) {
      fetchData();
    }
  }, [lastCommitTimestamp, fetchData]);

  // Build rent roll rows by joining units with their active leases
  const rentRollRows: RentRollRow[] = useMemo(() => {
    // Create a map of unit_id to active lease
    const leaseMap = new Map<number, Lease>();
    leases.forEach(lease => {
      // Prioritize active leases, but also consider notice given and month-to-month
      const existing = leaseMap.get(lease.unit_id);
      if (!existing || lease.lease_status === 'ACTIVE') {
        leaseMap.set(lease.unit_id, lease);
      }
    });

    return units.map(unit => {
      const lease = leaseMap.get(unit.unit_id);
      const currentRent = lease?.base_rent_monthly ? Number(lease.base_rent_monthly) : null;
      const sqft = unit.square_feet || 0;

      // Determine occupancy status: lease > unit field > tenant name inference
      let occupancyStatus: RentRollRow['occupancyStatus'] = 'Vacant';
      if (lease) {
        switch (lease.lease_status) {
          case 'ACTIVE':
            occupancyStatus = 'Occupied';
            break;
          case 'NOTICE_GIVEN':
            occupancyStatus = 'Notice';
            break;
          case 'MONTH_TO_MONTH':
            occupancyStatus = 'Month-to-Month';
            break;
          default:
            occupancyStatus = lease.lease_status === 'EXPIRED' ? 'Vacant' : 'Occupied';
        }
      } else if (unit.occupancy_status) {
        // Use the unit-level occupancy status (set by rent roll import)
        const raw = unit.occupancy_status.toLowerCase();
        if (raw === 'occupied' || raw === 'current') occupancyStatus = 'Occupied';
        else if (raw === 'notice') occupancyStatus = 'Notice';
        else if (raw === 'month-to-month' || raw === 'mtm') occupancyStatus = 'Month-to-Month';
        else if (raw === 'vacant' || raw === 'down') occupancyStatus = 'Vacant';
        else occupancyStatus = 'Occupied'; // non-empty unknown status likely means occupied
      } else if (unit.tenant_name) {
        // If we have a tenant name but no lease/status, infer occupied
        occupancyStatus = 'Occupied';
      }

      return {
        unitId: unit.unit_id,
        unitNumber: unit.unit_number,
        unitType: unit.unit_type,
        bedrooms: Number(unit.bedrooms) || 0,
        bathrooms: Number(unit.bathrooms) || 0,
        sqft,
        currentRent,
        rentPerSF: currentRent && sqft > 0 ? Math.round((currentRent / sqft) * 100) / 100 : null,
        leaseStart: lease?.lease_start_date || unit.current_lease?.lease_start_date || null,
        leaseEnd: lease?.lease_end_date || unit.current_lease?.lease_end_date || null,
        residentName: lease?.resident_name || unit.tenant_name || null,
        leaseStatus: lease?.lease_status || 'VACANT',
        occupancyStatus,
      };
    });
  }, [units, leases]);

  // Filter and sort rows
  const filteredRows = useMemo(() => {
    // Apply sorting
    const sorted = [...rentRollRows].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'unitNumber':
          // Natural sort for unit numbers (e.g., 101, 102, 201, ...)
          comparison = a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true });
          break;
        case 'unitType':
          comparison = a.unitType.localeCompare(b.unitType);
          break;
        case 'sqft':
          comparison = a.sqft - b.sqft;
          break;
        case 'currentRent':
          comparison = (a.currentRent || 0) - (b.currentRent || 0);
          break;
        case 'leaseEnd':
          if (!a.leaseEnd && !b.leaseEnd) comparison = 0;
          else if (!a.leaseEnd) comparison = 1;
          else if (!b.leaseEnd) comparison = -1;
          else comparison = new Date(a.leaseEnd).getTime() - new Date(b.leaseEnd).getTime();
          break;
        case 'occupancyStatus':
          comparison = a.occupancyStatus.localeCompare(b.occupancyStatus);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [rentRollRows, sortField, sortDirection]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const occupied = rentRollRows.filter(r => r.occupancyStatus === 'Occupied' || r.occupancyStatus === 'Month-to-Month');
    const withRent = rentRollRows.filter(r => r.currentRent && r.currentRent > 0);
    const totalRent = withRent.reduce((sum, r) => sum + (r.currentRent || 0), 0);
    const avgRent = withRent.length > 0 ? totalRent / withRent.length : 0;
    const occupancyRate = rentRollRows.length > 0 ? (occupied.length / rentRollRows.length) * 100 : 0;

    return {
      totalUnits: rentRollRows.length,
      occupiedUnits: occupied.length,
      vacantUnits: rentRollRows.length - occupied.length,
      occupancyRate: Math.round(occupancyRate * 10) / 10,
      avgRent: Math.round(avgRent),
      totalMonthlyRent: Math.round(totalRent),
    };
  }, [rentRollRows]);

  // Handle sort click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Format date
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const year = date.toLocaleDateString('en-US', { year: '2-digit' });
      return `${month}-${year}`;
    } catch {
      return dateStr;
    }
  };

  // Render sort indicator
  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return <span className="ms-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  if (loading) {
    return (
      <CCard className="studio-card">
        <CCardHeader className="studio-card-header">
          <span className="fw-semibold">Rent Roll</span>
        </CCardHeader>
        <CCardBody className="studio-card-body d-flex justify-content-center align-items-center" style={{ padding: '8px' }}>
          <CSpinner size="sm" className="me-2" />
          <span style={{ color: 'var(--studio-text-secondary)' }}>Loading rent roll...</span>
        </CCardBody>
      </CCard>
    );
  }

  if (error) {
    return (
      <CCard className="studio-card">
        <CCardHeader className="studio-card-header">
          <span className="fw-semibold">Rent Roll</span>
        </CCardHeader>
        <CCardBody className="studio-card-body">
          <div className="studio-text-error">{error}</div>
        </CCardBody>
      </CCard>
    );
  }

  return (
    <CCard className="studio-card">
      <CCardHeader className="studio-card-header d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-3">
          <span className="fw-semibold">Rent Roll</span>
          <div className="d-flex gap-2" style={{ fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--studio-text-secondary)' }}>
              {stats.occupiedUnits}/{stats.totalUnits} occupied
            </span>
            <span style={{ color: 'var(--studio-success)' }}>
              {stats.occupancyRate}%
            </span>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <CDropdown>
            <CDropdownToggle
              color="secondary"
              variant="ghost"
              size="sm"
              style={{
                padding: '0.25rem 0.5rem',
                border: '1px solid var(--studio-border)',
                background: 'transparent',
              }}
            >
              <Columns size={14} style={{ marginRight: '4px' }} />
              Columns
            </CDropdownToggle>
            <CDropdownMenu
              style={{
                background: 'var(--studio-card-bg)',
                border: '1px solid var(--studio-border)',
                minWidth: '150px',
              }}
            >
              {allColumns.map(col => (
                <div
                  key={col.key}
                  className="px-3 py-1"
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <CFormCheck
                    id={`col-${col.key}`}
                    label={col.label}
                    checked={isColumnVisible(col.key)}
                    onChange={() => toggleColumn(col.key)}
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>
              ))}
            </CDropdownMenu>
          </CDropdown>
        </div>
      </CCardHeader>
      <CCardBody className="studio-card-body" style={{ padding: 0 }}>
        <div className="table-responsive">
          <CTable hover className="mb-0 studio-table">
            <CTableHead>
              <CTableRow>
                {isColumnVisible('unitNumber') && (
                  <CTableHeaderCell
                    onClick={() => handleSort('unitNumber')}
                    style={{ cursor: 'pointer', color: 'var(--studio-text-secondary)' }}
                  >
                    Unit {renderSortIndicator('unitNumber')}
                  </CTableHeaderCell>
                )}
                {isColumnVisible('unitType') && (
                  <CTableHeaderCell
                    onClick={() => handleSort('unitType')}
                    style={{ cursor: 'pointer', color: 'var(--studio-text-secondary)' }}
                  >
                    Type {renderSortIndicator('unitType')}
                  </CTableHeaderCell>
                )}
                {isColumnVisible('tenant') && (
                  <CTableHeaderCell style={{ color: 'var(--studio-text-secondary)' }}>Tenant</CTableHeaderCell>
                )}
                {isColumnVisible('bdBa') && (
                  <CTableHeaderCell style={{ color: 'var(--studio-text-secondary)' }}>Bd/Ba</CTableHeaderCell>
                )}
                {isColumnVisible('sqft') && (
                  <CTableHeaderCell
                    onClick={() => handleSort('sqft')}
                    className="text-end"
                    style={{ cursor: 'pointer', color: 'var(--studio-text-secondary)' }}
                  >
                    Sq Ft {renderSortIndicator('sqft')}
                  </CTableHeaderCell>
                )}
                {isColumnVisible('currentRent') && (
                  <CTableHeaderCell
                    onClick={() => handleSort('currentRent')}
                    className="text-end"
                    style={{ cursor: 'pointer', color: 'var(--studio-text-secondary)' }}
                  >
                    Current Rent {renderSortIndicator('currentRent')}
                  </CTableHeaderCell>
                )}
                {isColumnVisible('rentPerSF') && (
                  <CTableHeaderCell className="text-end" style={{ color: 'var(--studio-text-secondary)' }}>
                    Rent/SF
                  </CTableHeaderCell>
                )}
                {isColumnVisible('leaseStart') && (
                  <CTableHeaderCell style={{ color: 'var(--studio-text-secondary)' }}>Lease Start</CTableHeaderCell>
                )}
                {isColumnVisible('leaseEnd') && (
                  <CTableHeaderCell
                    onClick={() => handleSort('leaseEnd')}
                    style={{ cursor: 'pointer', color: 'var(--studio-text-secondary)' }}
                  >
                    Lease End {renderSortIndicator('leaseEnd')}
                  </CTableHeaderCell>
                )}
                {isColumnVisible('status') && (
                  <CTableHeaderCell
                    onClick={() => handleSort('occupancyStatus')}
                    style={{ cursor: 'pointer', color: 'var(--studio-text-secondary)' }}
                  >
                    Status {renderSortIndicator('occupancyStatus')}
                  </CTableHeaderCell>
                )}
                {dynamicColumns.filter(dc => dc.is_active && isColumnVisible(`dyn_${dc.column_key}`)).map(dc => (
                  <CTableHeaderCell key={dc.column_key} style={{ color: 'var(--studio-text-secondary)' }}>
                    {dc.display_label}
                  </CTableHeaderCell>
                ))}
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {filteredRows.map((row) => (
                <CTableRow
                  key={row.unitId}
                  className={row.occupancyStatus === 'Vacant' ? 'vacancy-row' : ''}
                >
                  {isColumnVisible('unitNumber') && (
                    <CTableDataCell style={{ color: 'var(--studio-text)' }}>
                      <span className="fw-medium">{row.unitNumber}</span>
                    </CTableDataCell>
                  )}
                  {isColumnVisible('unitType') && (
                    <CTableDataCell style={{ color: 'var(--studio-text-secondary)' }}>
                      {row.unitType}
                    </CTableDataCell>
                  )}
                  {isColumnVisible('tenant') && (
                    <CTableDataCell style={{ color: 'var(--studio-text-secondary)' }}>
                      {row.residentName || '—'}
                    </CTableDataCell>
                  )}
                  {isColumnVisible('bdBa') && (
                    <CTableDataCell style={{ color: 'var(--studio-text-secondary)' }}>
                      {row.bedrooms === 0 ? 'Studio' : `${Math.round(row.bedrooms)} / ${row.bathrooms % 1 !== 0 ? row.bathrooms : Math.round(row.bathrooms)}`}
                    </CTableDataCell>
                  )}
                  {isColumnVisible('sqft') && (
                    <CTableDataCell className="text-end studio-tnum" style={{ color: 'var(--studio-text)' }}>
                      {formatNumber(row.sqft)}
                    </CTableDataCell>
                  )}
                  {isColumnVisible('currentRent') && (
                    <CTableDataCell className="text-end studio-tnum" style={{ color: 'var(--studio-text)' }}>
                      {row.currentRent ? formatCurrency(row.currentRent) : '—'}
                    </CTableDataCell>
                  )}
                  {isColumnVisible('rentPerSF') && (
                    <CTableDataCell className="text-end studio-tnum" style={{ color: 'var(--studio-text)' }}>
                      {row.rentPerSF ? `$${row.rentPerSF.toFixed(2)}` : '—'}
                    </CTableDataCell>
                  )}
                  {isColumnVisible('leaseStart') && (
                    <CTableDataCell style={{ color: 'var(--studio-text-secondary)' }}>
                      {formatDate(row.leaseStart)}
                    </CTableDataCell>
                  )}
                  {isColumnVisible('leaseEnd') && (
                    <CTableDataCell style={{ color: 'var(--studio-text-secondary)' }}>
                      {formatDate(row.leaseEnd)}
                    </CTableDataCell>
                  )}
                  {isColumnVisible('status') && (
                    <CTableDataCell>
                      <SemanticBadge
                        intent="status"
                        value={row.occupancyStatus}
                        style={{ fontSize: '0.7rem' }}
                      >
                        {row.occupancyStatus}
                      </SemanticBadge>
                    </CTableDataCell>
                  )}
                  {dynamicColumns.filter(dc => dc.is_active && isColumnVisible(`dyn_${dc.column_key}`)).map(dc => {
                    const rowVals = dynamicValues[String(row.unitId)];
                    const val = rowVals?.[dc.column_key];
                    return (
                      <CTableDataCell key={dc.column_key} style={{ color: 'var(--studio-text-secondary)' }}>
                        {val != null ? String(val) : '—'}
                      </CTableDataCell>
                    );
                  })}
                </CTableRow>
              ))}
              {filteredRows.length === 0 && (
                <CTableRow>
                  <CTableDataCell colSpan={visibleColumns.size} className="text-center py-4" style={{ color: 'var(--studio-text-secondary)' }}>
                    No units found
                  </CTableDataCell>
                </CTableRow>
              )}
            </CTableBody>
          </CTable>
        </div>
      </CCardBody>
    </CCard>
  );
}
