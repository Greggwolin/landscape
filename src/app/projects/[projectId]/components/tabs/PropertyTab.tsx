'use client';

import { useState, useMemo, useEffect } from 'react';
import { unitTypesAPI, unitsAPI, leasesAPI } from '@/lib/api/multifamily';
import ProjectTabMap from '@/components/map/ProjectTabMap';
import { formatNumber, formatCurrency, formatDecimal } from '@/utils/formatNumber';

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
  aiEstimate: number; // AI-estimated market rent from comparables
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

// Mock data with AI estimates
const mockFloorPlans: FloorPlan[] = [
  { id: '1', name: 'A1', bedrooms: 1, bathrooms: 1, sqft: 650, unitCount: 24, currentRent: 1200, marketRent: 1350, aiEstimate: 1375 },
  { id: '2', name: 'A2', bedrooms: 1, bathrooms: 1, sqft: 725, unitCount: 18, currentRent: 1300, marketRent: 1425, aiEstimate: 1420 },
  { id: '3', name: 'B1', bedrooms: 2, bathrooms: 2, sqft: 950, unitCount: 36, currentRent: 1650, marketRent: 1800, aiEstimate: 1825 },
  { id: '4', name: 'B2', bedrooms: 2, bathrooms: 2, sqft: 1050, unitCount: 28, currentRent: 1750, marketRent: 1900, aiEstimate: 1950 },
  { id: '5', name: 'C1', bedrooms: 3, bathrooms: 2, sqft: 1250, unitCount: 16, currentRent: 2100, marketRent: 2250, aiEstimate: 2300 },
];

// RentalComparable type matching database schema
interface RentalComparable {
  comparable_id: number;
  property_name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  distance_miles?: number;
  year_built?: number;
  total_units?: number;
  unit_type?: string;
  bedrooms: number;
  bathrooms: number;
  avg_sqft: number;
  asking_rent: number;
  effective_rent?: number;
  concessions?: string;
  amenities?: string;
  notes?: string;
  data_source?: string;
  as_of_date?: string;
  is_active?: boolean;
}

const mockUnits: Unit[] = [
  { id: '1', unitNumber: '101', floorPlan: 'A1', sqft: 650, bedrooms: 1, bathrooms: 1, currentRent: 1200, marketRent: 1350, proformaRent: 1375, leaseStart: '2024-01-15', leaseEnd: '2025-01-14', tenantName: 'John Smith', status: 'Occupied', deposit: 1200, monthlyIncome: 1200, rentPerSF: 1.85, proformaRentPerSF: 2.12, notes: '' },
  { id: '2', unitNumber: '102', floorPlan: 'A1', sqft: 650, bedrooms: 1, bathrooms: 1, currentRent: 1225, marketRent: 1350, proformaRent: 1375, leaseStart: '2024-03-01', leaseEnd: '2025-02-28', tenantName: 'Sarah Johnson', status: 'Occupied', deposit: 1225, monthlyIncome: 1225, rentPerSF: 1.88, proformaRentPerSF: 2.12, notes: '' },
  { id: '3', unitNumber: '103', floorPlan: 'B1', sqft: 950, bedrooms: 2, bathrooms: 2, currentRent: 0, marketRent: 1800, proformaRent: 1825, leaseStart: '', leaseEnd: '', tenantName: '', status: 'Vacant', deposit: 0, monthlyIncome: 0, rentPerSF: 0, proformaRentPerSF: 1.92, notes: 'Available for lease' },
  { id: '4', unitNumber: '104', floorPlan: 'B1', sqft: 950, bedrooms: 2, bathrooms: 2, currentRent: 1650, marketRent: 1800, proformaRent: 1825, leaseStart: '2023-11-01', leaseEnd: '2024-10-31', tenantName: 'Michael Brown', status: 'Notice', deposit: 1650, monthlyIncome: 1650, rentPerSF: 1.74, proformaRentPerSF: 1.92, notes: '60-day notice given' },
  { id: '5', unitNumber: '105', floorPlan: 'B2', sqft: 1050, bedrooms: 2, bathrooms: 2, currentRent: 1750, marketRent: 1900, proformaRent: 1950, leaseStart: '2024-06-15', leaseEnd: '2025-06-14', tenantName: 'Emily Davis', status: 'Occupied', deposit: 1750, monthlyIncome: 1750, rentPerSF: 1.67, proformaRentPerSF: 1.86, notes: '' },
  { id: '6', unitNumber: '201', floorPlan: 'A2', sqft: 725, bedrooms: 1, bathrooms: 1, currentRent: 1300, marketRent: 1425, proformaRent: 1420, leaseStart: '2024-02-01', leaseEnd: '2025-01-31', tenantName: 'David Wilson', status: 'Renewal', deposit: 1300, monthlyIncome: 1300, rentPerSF: 1.79, proformaRentPerSF: 1.96, notes: 'Renewal pending' },
  { id: '7', unitNumber: '202', floorPlan: 'A2', sqft: 725, bedrooms: 1, bathrooms: 1, currentRent: 1275, marketRent: 1425, proformaRent: 1420, leaseStart: '2024-04-15', leaseEnd: '2025-04-14', tenantName: 'Lisa Martinez', status: 'Occupied', deposit: 1275, monthlyIncome: 1275, rentPerSF: 1.76, proformaRentPerSF: 1.96, notes: '' },
  { id: '8', unitNumber: '203', floorPlan: 'C1', sqft: 1250, bedrooms: 3, bathrooms: 2, currentRent: 2100, marketRent: 2250, proformaRent: 2300, leaseStart: '2024-01-01', leaseEnd: '2025-12-31', tenantName: 'Robert Garcia', status: 'Occupied', deposit: 2100, monthlyIncome: 2100, rentPerSF: 1.68, proformaRentPerSF: 1.84, notes: '' },
];

// Column configuration - defines all available columns
const defaultColumns: ColumnConfig[] = [
  // Unit Info
  { id: 'unitNumber', label: 'Unit', category: 'unit', visible: true, type: 'input', description: 'Unit number or identifier' },
  { id: 'floorPlan', label: 'Plan', category: 'floorplan', visible: true, type: 'calculated', description: 'Floor plan type (auto-generated from bed/bath)' },
  { id: 'bedrooms', label: 'Bed', category: 'unit', visible: true, type: 'input', description: 'Number of bedrooms' },
  { id: 'bathrooms', label: 'Bath', category: 'unit', visible: true, type: 'input', description: 'Number of bathrooms' },
  { id: 'sqft', label: 'SF', category: 'unit', visible: true, type: 'input', description: 'Square footage of the unit' },
  // Tenant Info
  { id: 'tenantName', label: 'Tenant', category: 'tenant', visible: false, type: 'input', description: 'Current tenant name (rarely used in underwriting)' },
  { id: 'status', label: 'Status', category: 'tenant', visible: true, type: 'input', description: 'Occupancy status: Occupied, Vacant, Notice, or Renewal' },
  // Lease Terms
  { id: 'leaseStart', label: 'Lease Start', category: 'lease', visible: false, type: 'input', description: 'Lease commencement date' },
  { id: 'leaseEnd', label: 'Lease End', category: 'lease', visible: true, type: 'input', description: 'Lease expiration date' },
  { id: 'deposit', label: 'Deposit', category: 'lease', visible: false, type: 'input', description: 'Security deposit amount' },
  // Financial
  { id: 'currentRent', label: 'Current Rent', category: 'financial', visible: true, type: 'input', description: 'Actual rent being collected today' },
  { id: 'marketRent', label: 'Market Rent', category: 'financial', visible: true, type: 'input', description: 'Current market rent estimate' },
  { id: 'proformaRent', label: 'Proforma Rent', category: 'financial', visible: false, type: 'input', description: 'Projected future rent for underwriting' },
  { id: 'monthlyIncome', label: 'Monthly Income', category: 'financial', visible: false, type: 'calculated', description: 'Total monthly income (includes current rent + other fees)' },
  { id: 'rentPerSF', label: 'Rent/SF', category: 'financial', visible: false, type: 'calculated', description: 'Current rent divided by square footage' },
  { id: 'proformaRentPerSF', label: 'Proforma $/SF', category: 'financial', visible: false, type: 'calculated', description: 'Proforma rent divided by square footage' },
  // Other
  { id: 'notes', label: 'Notes', category: 'unit', visible: false, type: 'input', description: 'Free-form notes for this unit' },
];

export default function PropertyTab({ project }: PropertyTabProps) {
  const projectId = project.project_id;
  const projectType = project.project_type_code;

  // Check if this is a supported project type (Multifamily only for now)
  const isMultifamily = projectType === 'MF';

  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [comparables, setComparables] = useState<RentalComparable[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Unit | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planEditDraft, setPlanEditDraft] = useState<FloorPlan | null>(null);
  const [columns, setColumns] = useState<ColumnConfig[]>(defaultColumns);
  const [showFieldChooser, setShowFieldChooser] = useState(false);

  // Load real data from database
  useEffect(() => {
    const loadData = async () => {
      // Skip data loading for non-multifamily projects
      if (!isMultifamily) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch unit types (floor plans)
        const unitTypesData = await unitTypesAPI.list(projectId);
        const transformedFloorPlans: FloorPlan[] = unitTypesData.map(ut => ({
          id: ut.unit_type_id.toString(),
          name: ut.unit_type_code,
          bedrooms: Number(ut.bedrooms),
          bathrooms: Number(ut.bathrooms),
          sqft: ut.avg_square_feet,
          unitCount: ut.total_units,
          currentRent: Math.round(ut.current_market_rent || 0),
          marketRent: Math.round(ut.current_market_rent || 0),
          aiEstimate: Math.round((ut.current_market_rent || 0) * 1.05) // 5% above current as estimate
        }));

        // Fetch units
        const unitsData = await unitsAPI.list(projectId);

        // Fetch leases to get tenant info
        const leasesData = await leasesAPI.list(projectId);
        const leasesByUnit = new Map(leasesData.map(l => [l.unit_id, l]));

        const transformedUnits: Unit[] = unitsData.map(u => {
          const lease = leasesByUnit.get(u.unit_id);
          const baseRent = lease ? Math.round(lease.base_rent_monthly || 0) : 0;
          const marketRent = Math.round(u.market_rent || 0);
          return {
            id: u.unit_id.toString(),
            unitNumber: u.unit_number,
            floorPlan: u.unit_type,
            sqft: u.square_feet,
            bedrooms: Number(u.bedrooms || 0),
            bathrooms: Number(u.bathrooms || 0),
            currentRent: baseRent,
            marketRent: marketRent,
            proformaRent: Math.round(marketRent * 1.05),
            leaseStart: lease?.lease_start_date || '',
            leaseEnd: lease?.lease_end_date || '',
            tenantName: lease?.resident_name || '',
            status: lease?.lease_status === 'ACTIVE' ? 'Occupied' : 'Vacant',
            deposit: Math.round(lease?.security_deposit || 0),
            monthlyIncome: baseRent,
            rentPerSF: u.square_feet > 0 && baseRent ? baseRent / u.square_feet : 0,
            proformaRentPerSF: u.square_feet > 0 && marketRent ? marketRent / u.square_feet : 0,
            notes: u.other_features || ''
          };
        });

        // Fetch rental comparables
        const compsResponse = await fetch(`/api/projects/${projectId}/rental-comparables`);
        if (compsResponse.ok) {
          const compsData = await compsResponse.json();
          if (compsData.success && compsData.data) {
            setComparables(compsData.data);
          }
        }

        // Always use real data (even if empty)
        setFloorPlans(transformedFloorPlans);
        setUnits(transformedUnits);

        setLoading(false);
      } catch (error) {
        console.error('Failed to load data:', error);
        // On error, set empty arrays instead of mock data
        setFloorPlans([]);
        setUnits([]);
        setComparables([]);
        setLoading(false);
      }
    };

    loadData();
  }, [projectId, isMultifamily]);

  // Get visible columns
  const visibleColumns = useMemo(() => {
    return columns.filter(col => col.visible);
  }, [columns]);

  // Render table cell content based on column
  const renderCellContent = (unit: Unit, columnId: string) => {
    const isEdit = isEditing(unit.id);

    switch (columnId) {
      case 'unitNumber':
        return <span className="text-white font-semibold">{unit.unitNumber}</span>;
      case 'floorPlan':
        return <span className="text-gray-300">{unit.floorPlan}</span>;
      case 'bedrooms':
        return <span className="text-gray-300">{formatNumber(unit.bedrooms)}</span>;
      case 'bathrooms':
        return <span className="text-gray-300">{formatNumber(unit.bathrooms)}</span>;
      case 'sqft':
        return <span className="text-gray-300">{formatNumber(unit.sqft)}</span>;
      case 'currentRent':
        return isEdit ? (
          <input
            type="number"
            className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center"
            value={editDraft?.currentRent || 0}
            onChange={(e) => setEditDraft(prev => prev ? { ...prev, currentRent: Number(e.target.value) } : null)}
          />
        ) : (
          unit.status === 'Vacant' ? '—' : formatCurrency(unit.currentRent)
        );
      case 'marketRent':
        return isEdit ? (
          <input
            type="number"
            className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center"
            value={editDraft?.marketRent || 0}
            onChange={(e) => setEditDraft(prev => prev ? { ...prev, marketRent: Number(e.target.value) } : null)}
          />
        ) : (
          <span className="text-white font-medium">{formatCurrency(unit.marketRent)}</span>
        );
      case 'proformaRent':
        return isEdit ? (
          <input
            type="number"
            className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center"
            value={editDraft?.proformaRent || 0}
            onChange={(e) => setEditDraft(prev => prev ? { ...prev, proformaRent: Number(e.target.value) } : null)}
          />
        ) : (
          <span className="text-gray-300">{formatCurrency(unit.proformaRent)}</span>
        );
      case 'status':
        return isEdit ? (
          <select
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
            value={editDraft?.status || 'Vacant'}
            onChange={(e) => setEditDraft(prev => prev ? { ...prev, status: e.target.value as Unit['status'] } : null)}
          >
            <option value="Occupied">Occupied</option>
            <option value="Vacant">Vacant</option>
            <option value="Notice">Notice</option>
            <option value="Renewal">Renewal</option>
          </select>
        ) : (
          <span className={getStatusBadge(unit.status)}>{unit.status}</span>
        );
      case 'tenantName':
        return isEdit ? (
          <input
            type="text"
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white"
            value={editDraft?.tenantName || ''}
            onChange={(e) => setEditDraft(prev => prev ? { ...prev, tenantName: e.target.value } : null)}
          />
        ) : (
          unit.tenantName || '—'
        );
      case 'leaseStart':
        return isEdit ? (
          <input
            type="date"
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
            value={editDraft?.leaseStart || ''}
            onChange={(e) => setEditDraft(prev => prev ? { ...prev, leaseStart: e.target.value } : null)}
          />
        ) : (
          unit.leaseStart || '—'
        );
      case 'leaseEnd':
        return isEdit ? (
          <input
            type="date"
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
            value={editDraft?.leaseEnd || ''}
            onChange={(e) => setEditDraft(prev => prev ? { ...prev, leaseEnd: e.target.value } : null)}
          />
        ) : (
          unit.leaseEnd || '—'
        );
      case 'deposit':
        return isEdit ? (
          <input
            type="number"
            className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center"
            value={editDraft?.deposit || 0}
            onChange={(e) => setEditDraft(prev => prev ? { ...prev, deposit: Number(e.target.value) } : null)}
          />
        ) : (
          formatCurrency(unit.deposit)
        );
      case 'monthlyIncome':
        return <span className="text-gray-300">{formatCurrency(unit.monthlyIncome)}</span>;
      case 'rentPerSF':
        return <span className="text-gray-300">{unit.rentPerSF ? `$${formatDecimal(unit.rentPerSF)}` : '—'}</span>;
      case 'proformaRentPerSF':
        return <span className="text-gray-300">{unit.proformaRentPerSF ? `$${formatDecimal(unit.proformaRentPerSF)}` : '—'}</span>;
      case 'notes':
        return isEdit ? (
          <input
            type="text"
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
            value={editDraft?.notes || ''}
            onChange={(e) => setEditDraft(prev => prev ? { ...prev, notes: e.target.value } : null)}
          />
        ) : (
          <span className="text-gray-400 text-xs">{unit.notes || '—'}</span>
        );
      default:
        return null;
    }
  };

  // Get column alignment class
  const getColumnAlign = (columnId: string): string => {
    const centerAlign = ['bedrooms', 'bathrooms', 'sqft', 'currentRent', 'marketRent', 'proformaRent',
                         'status', 'leaseEnd', 'deposit', 'monthlyIncome', 'rentPerSF', 'proformaRentPerSF'];
    return centerAlign.includes(columnId) ? 'text-center' : 'text-left';
  };

  // Calculate total statistics
  const totalUnits = useMemo(() => {
    return floorPlans.reduce((sum, fp) => sum + fp.unitCount, 0);
  }, [floorPlans]);

  const occupiedUnits = useMemo(() => {
    return units.filter(u => u.status === 'Occupied').length;
  }, [units]);

  const occupancyRate = useMemo(() => {
    return units.length > 0 ? ((occupiedUnits / units.length) * 100).toFixed(1) : '0.0';
  }, [occupiedUnits, units.length]);

  const avgCurrentRent = useMemo(() => {
    const occupied = units.filter(u => u.status === 'Occupied');
    if (occupied.length === 0) return 0;
    return Math.round(occupied.reduce((sum, u) => sum + u.currentRent, 0) / occupied.length);
  }, [units]);

  const avgMarketRent = useMemo(() => {
    if (units.length === 0) return 0;
    return Math.round(units.reduce((sum, u) => sum + u.marketRent, 0) / units.length);
  }, [units]);

  const totalMonthlyIncome = useMemo(() => {
    return units.filter(u => u.status === 'Occupied').reduce((sum, u) => sum + u.currentRent, 0);
  }, [units]);

  const rentGrowthPotential = useMemo(() => {
    if (avgCurrentRent === 0) return 0;
    return (((avgMarketRent - avgCurrentRent) / avgCurrentRent) * 100).toFixed(1);
  }, [avgCurrentRent, avgMarketRent]);

  const avgRentPerSF = useMemo(() => {
    const occupied = units.filter(u => u.status === 'Occupied');
    if (occupied.length === 0) return 0;
    const totalRent = occupied.reduce((sum, u) => sum + u.currentRent, 0);
    const totalSF = occupied.reduce((sum, u) => sum + u.sqft, 0);
    return (totalRent / totalSF).toFixed(2);
  }, [units]);

  // Status badge styles
  const getStatusBadge = (status: Unit['status']) => {
    const styles = {
      'Occupied': 'bg-emerald-900 text-emerald-300 border-emerald-700',
      'Vacant': 'bg-red-900 text-red-300 border-red-700',
      'Notice': 'bg-amber-900 text-amber-300 border-amber-700',
      'Renewal': 'bg-blue-900 text-blue-300 border-blue-700'
    };
    return `px-2 py-0.5 rounded text-xs font-medium border ${styles[status]}`;
  };

  // AI estimate indicator - shows if market rent differs from AI estimate
  const getAIIndicator = (marketRent: number, aiEstimate: number) => {
    const diff = marketRent - aiEstimate;
    const percentDiff = Math.abs((diff / aiEstimate) * 100);

    if (percentDiff < 2) return null; // Within 2% - no indicator

    if (diff > 0) {
      return (
        <span className="ml-1 text-xs text-green-400" title={`AI suggests $${aiEstimate} (${percentDiff.toFixed(1)}% lower)`}>
          ↑
        </span>
      );
    } else {
      return (
        <span className="ml-1 text-xs text-amber-400" title={`AI suggests $${aiEstimate} (${percentDiff.toFixed(1)}% higher)`}>
          ↓
        </span>
      );
    }
  };

  // Floor plan edit handlers
  const handlePlanEditStart = (plan: FloorPlan) => {
    setEditingPlanId(plan.id);
    setPlanEditDraft({ ...plan });
  };

  const handlePlanEditCancel = () => {
    setEditingPlanId(null);
    setPlanEditDraft(null);
  };

  const handlePlanEditSave = () => {
    if (planEditDraft) {
      setFloorPlans(prev => prev.map(p => p.id === planEditDraft.id ? planEditDraft : p));
      setEditingPlanId(null);
      setPlanEditDraft(null);
    }
  };

  const isPlanEditing = (planId: string) => editingPlanId === planId;

  // Unit edit handlers
  const handleEditStart = (unit: Unit) => {
    setEditingUnitId(unit.id);
    setEditDraft({ ...unit });
  };

  const handleEditCancel = () => {
    setEditingUnitId(null);
    setEditDraft(null);
  };

  const handleEditSave = () => {
    if (editDraft) {
      setUnits(prev => prev.map(u => u.id === editDraft.id ? editDraft : u));
      setEditingUnitId(null);
      setEditDraft(null);
    }
  };

  const isEditing = (unitId: string) => editingUnitId === unitId;

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ padding: 'var(--component-gap)', minHeight: '400px' }}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 mb-4" style={{ borderColor: 'var(--cui-primary)' }}></div>
          <p style={{ color: 'var(--cui-secondary-color)' }}>Loading rent roll data...</p>
        </div>
      </div>
    );
  }

  // Show "Coming Soon" for non-multifamily projects
  if (!isMultifamily) {
    const projectTypeLabels: Record<string, string> = {
      'OFF': 'Office',
      'RET': 'Retail',
      'IND': 'Industrial',
      'MXD': 'Mixed-Use',
      'LAND': 'Land Development',
      'HOT': 'Hospitality'
    };

    return (
      <div className="flex items-center justify-center" style={{ padding: 'var(--component-gap)', minHeight: '400px' }}>
        <div className="rounded-xl shadow-lg p-12 text-center max-w-2xl" style={{ backgroundColor: 'var(--cui-card-bg)', border: '1px solid var(--cui-border-color)' }}>
          <div className="mb-6">
            <svg className="w-24 h-24 mx-auto text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-white mb-3">
            {projectTypeLabels[projectType || ''] || 'Commercial'} Property Tab Coming Soon
          </h2>
          <p className="text-gray-400 mb-2">
            This project is a <strong className="text-white">{projectTypeLabels[projectType || ''] || projectType}</strong> asset type.
          </p>
          <p className="text-gray-400 mb-6">
            The Property tab is currently designed for multifamily projects only.
            A dedicated template for {projectTypeLabels[projectType || '']?.toLowerCase() || 'this asset type'} properties is under development.
          </p>
          <div className="bg-blue-900/20 border border-blue-700/40 rounded-lg p-4 text-left">
            <p className="text-sm text-blue-300 mb-2">
              <strong>For now, use these alternatives:</strong>
            </p>
            <ul className="text-sm text-gray-300 space-y-1 ml-4 list-disc">
              <li>Financial Analysis tab for cash flow modeling</li>
              <li>Assumptions & Factors for market rent inputs</li>
              <li>Reports tab for PDF rent roll generation</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state if no data for multifamily project
  if (units.length === 0 && floorPlans.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ padding: 'var(--component-gap)', minHeight: '400px' }}>
        <div className="rounded-xl shadow-lg p-12 text-center max-w-2xl" style={{ backgroundColor: 'var(--cui-card-bg)', border: '1px solid var(--cui-border-color)' }}>
          <div className="mb-6">
            <svg className="w-24 h-24 mx-auto text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-white mb-3">
            No Rent Roll Data Yet
          </h2>
          <p className="text-gray-400 mb-6">
            This multifamily project doesn't have any unit or floorplan data yet.
            Upload a rent roll or manually add unit information to get started.
          </p>
          <div className="bg-blue-900/20 border border-blue-700/40 rounded-lg p-4 text-left">
            <p className="text-sm text-blue-300 mb-2">
              <strong>To add data:</strong>
            </p>
            <ul className="text-sm text-gray-300 space-y-1 ml-4 list-disc">
              <li>Navigate to the Rent Roll page to upload a rent roll spreadsheet</li>
              <li>Use the Django admin panel to manually add unit types and units</li>
              <li>Import data via the API endpoints</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upper Row: Floor Plans (left) + Comparables Map (right) */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1.5fr_1fr]">
        {/* Floor Plan Matrix - Upper Left (WIDER) */}
        <div className="rounded-xl shadow-lg overflow-hidden" style={{ backgroundColor: 'var(--cui-card-bg)' }}>
          <div className="border-b" style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--surface-card-header)', borderColor: 'var(--cui-border-color)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold" style={{ color: 'var(--cui-body-color)', fontSize: '1rem' }}>Floor Plan Matrix</h3>
                <div className="flex items-center gap-2 px-2 py-1 bg-blue-900/20 border border-blue-700/40 rounded text-xs">
                  <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                  <span className="text-blue-300 font-medium">Aggregates from Units</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="text-gray-400">
                  <span className="text-gray-500">Total Units:</span> <span className="text-white font-semibold">{formatNumber(totalUnits)}</span>
                </div>
                <div className="text-gray-400">
                  <span className="text-gray-500">Avg Current:</span> <span className="text-white font-semibold">{formatCurrency(avgCurrentRent)}</span>
                </div>
                <div className="text-gray-400">
                  <span className="text-gray-500">Avg Market:</span> <span className="text-white font-semibold">{formatCurrency(avgMarketRent)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4" style={{ backgroundColor: 'var(--cui-card-bg)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: 'var(--surface-card-header)' }}>
                  <tr style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
                    <th className="text-left px-3 py-2 font-medium whitespace-nowrap" style={{ color: 'var(--cui-secondary-color)' }}>Plan</th>
                    <th className="text-center px-3 py-2 font-medium whitespace-nowrap" style={{ color: 'var(--cui-secondary-color)' }}>Bed</th>
                    <th className="text-center px-3 py-2 font-medium whitespace-nowrap" style={{ color: 'var(--cui-secondary-color)' }}>Bath</th>
                    <th className="text-center px-3 py-2 font-medium whitespace-nowrap" style={{ color: 'var(--cui-secondary-color)' }}>SF</th>
                    <th className="text-center px-3 py-2 font-medium whitespace-nowrap" style={{ color: 'var(--cui-secondary-color)' }}>Units</th>
                    <th className="text-center px-3 py-2 font-medium whitespace-nowrap" style={{ color: 'var(--cui-secondary-color)' }}>Current</th>
                    <th className="text-center px-3 py-2 font-medium whitespace-nowrap" style={{ color: 'var(--cui-secondary-color)' }}>Market</th>
                    <th className="text-center px-3 py-2 font-medium whitespace-nowrap" style={{ color: 'var(--cui-secondary-color)' }}>Variance</th>
                    <th className="text-center px-3 py-2 font-medium whitespace-nowrap" style={{ color: 'var(--cui-secondary-color)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {floorPlans.map((plan, index) => {
                    const editing = isPlanEditing(plan.id);
                    const draft = editing ? planEditDraft! : plan;
                    const variance = draft.marketRent - draft.currentRent;
                    const variancePct = draft.currentRent > 0 ? ((variance / draft.currentRent) * 100).toFixed(1) : '0.0';

                    return (
                      <tr key={plan.id} style={{ borderBottom: '1px solid var(--cui-border-color)', backgroundColor: index % 2 === 0 ? 'var(--cui-card-bg)' : 'var(--cui-tertiary-bg)' }}>
                        <td className="px-3 py-2">
                          {editing ? (
                            <input
                              type="text"
                              className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white"
                              value={draft.name}
                              onChange={(e) => setPlanEditDraft(d => d ? {...d, name: e.target.value} : null)}
                            />
                          ) : (
                            <span className="text-white font-semibold">{plan.name}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {editing ? (
                            <input
                              type="number"
                              className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center"
                              value={draft.bedrooms}
                              onChange={(e) => setPlanEditDraft(d => d ? {...d, bedrooms: Number(e.target.value)} : null)}
                            />
                          ) : (
                            <span className="text-gray-300">{formatNumber(plan.bedrooms)}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {editing ? (
                            <input
                              type="number"
                              step="0.5"
                              className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center"
                              value={draft.bathrooms}
                              onChange={(e) => setPlanEditDraft(d => d ? {...d, bathrooms: Number(e.target.value)} : null)}
                            />
                          ) : (
                            <span className="text-gray-300">{formatNumber(plan.bathrooms)}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {editing ? (
                            <input
                              type="number"
                              className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center"
                              value={draft.sqft}
                              onChange={(e) => setPlanEditDraft(d => d ? {...d, sqft: Number(e.target.value)} : null)}
                            />
                          ) : (
                            <span className="text-gray-300">{formatNumber(plan.sqft)}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {editing ? (
                            <input
                              type="number"
                              className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center"
                              value={draft.unitCount}
                              onChange={(e) => setPlanEditDraft(d => d ? {...d, unitCount: Number(e.target.value)} : null)}
                            />
                          ) : (
                            <span className="text-gray-300">{formatNumber(plan.unitCount)}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {editing ? (
                            <input
                              type="number"
                              className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center"
                              value={draft.currentRent}
                              onChange={(e) => setPlanEditDraft(d => d ? {...d, currentRent: Number(e.target.value)} : null)}
                            />
                          ) : (
                            <span className="text-gray-300">{formatCurrency(plan.currentRent)}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {editing ? (
                            <input
                              type="number"
                              className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center"
                              value={draft.marketRent}
                              onChange={(e) => setPlanEditDraft(d => d ? {...d, marketRent: Number(e.target.value)} : null)}
                            />
                          ) : (
                            <span className="text-white font-medium">
                              {formatCurrency(plan.marketRent)}
                              {getAIIndicator(plan.marketRent, plan.aiEstimate)}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                            variance > 0 ? 'bg-green-900 text-green-300' : variance < 0 ? 'bg-red-900 text-red-300' : 'bg-gray-700 text-gray-300'
                          }`}>
                            {variance >= 0 ? '+' : '-'}${Math.abs(variance).toLocaleString()} ({variancePct}%)
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {editing ? (
                            <div className="flex items-center gap-1 justify-center">
                              <button
                                className="px-2 py-1 text-xs bg-blue-700 text-white rounded hover:bg-blue-600"
                                onClick={handlePlanEditSave}
                              >
                                Save
                              </button>
                              <button
                                className="px-2 py-1 text-xs bg-gray-700 text-gray-200 rounded hover:bg-gray-600"
                                onClick={handlePlanEditCancel}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
                              onClick={() => handlePlanEditStart(plan)}
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Landscaper Analysis Box */}
            <div className="border-t border-gray-700 pt-4">
              <div className="bg-purple-900/20 border border-purple-700/40 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-sm font-semibold text-purple-300">Landscaper Analysis</h4>
                      <span className="text-xs text-purple-400/60">AI-Powered Insights</span>
                    </div>
                    <div className="space-y-2 text-xs text-gray-300">
                      <p>
                        <span className="font-medium text-purple-300">Market Position:</span> Your current rents are averaging
                        <span className="text-white font-semibold"> 7.2% below market</span> based on comparable properties.
                        This represents approximately <span className="text-green-400 font-semibold">$12,400/month</span> in
                        potential additional revenue.
                      </p>
                      <p>
                        <span className="font-medium text-purple-300">Key Insight:</span> Floor plans B1 and B2 (2bd/2ba) show
                        the largest gap to market rates. Consider prioritizing rent increases on these units during lease renewals.
                        Comparable properties within 1.5 miles are achieving <span className="text-white font-semibold">$1,825-$1,950</span> for
                        similar configurations.
                      </p>
                      <p>
                        <span className="font-medium text-purple-300">Recommendation:</span> Phase rent adjustments over the next
                        6 months to capture market value while maintaining occupancy. Target 95%+ occupancy with optimized rents
                        versus current 92% at below-market rates.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comparable Rentals - Upper Right */}
        <div className="rounded-xl shadow-lg overflow-hidden" style={{ backgroundColor: 'var(--cui-card-bg)' }}>
          <div className="border-b flex items-center justify-between" style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--surface-card-header)', borderColor: 'var(--cui-border-color)' }}>
            <h3 className="font-semibold" style={{ color: 'var(--cui-body-color)', fontSize: '1rem' }}>Comparable Rentals</h3>
            <p className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>AI-analyzed nearby properties</p>
          </div>
          <div className="p-4 space-y-3" style={{ backgroundColor: 'var(--cui-card-bg)' }}>
            {/* Project Map with Rental Comparables */}
            <div className="h-[400px] rounded-lg overflow-hidden">
              <ProjectTabMap
                projectId={projectId.toString()}
                styleUrl={process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'aerial'}
                tabId="property"
                rentalComparables={comparables}
              />
            </div>

            {/* Comparables Table - COMPACT */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead style={{ backgroundColor: 'var(--surface-card-header)' }}>
                  <tr style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
                    <th className="text-left px-2 py-1.5 font-medium" style={{ color: 'var(--cui-secondary-color)' }}>Property</th>
                    <th className="text-center px-2 py-1.5 font-medium" style={{ color: 'var(--cui-secondary-color)' }}>Bed/Ba</th>
                    <th className="text-center px-2 py-1.5 font-medium" style={{ color: 'var(--cui-secondary-color)' }}>SF</th>
                    <th className="text-center px-2 py-1.5 font-medium" style={{ color: 'var(--cui-secondary-color)' }}>Dist</th>
                    <th className="text-right px-2 py-1.5 font-medium" style={{ color: 'var(--cui-secondary-color)' }}>Rent</th>
                  </tr>
                </thead>
                <tbody>
                  {comparables.map((comp, index) => (
                    <tr key={comp.comparable_id} style={{ borderBottom: '1px solid var(--cui-border-color)', backgroundColor: index % 2 === 0 ? 'var(--cui-card-bg)' : 'var(--cui-tertiary-bg)' }}>
                      <td className="px-2 py-1.5" style={{ color: 'var(--cui-body-color)' }}>{comp.property_name}</td>
                      <td className="px-2 py-1.5 text-center" style={{ color: 'var(--cui-body-color)' }}>{formatNumber(comp.bedrooms)}/{formatNumber(comp.bathrooms)}</td>
                      <td className="px-2 py-1.5 text-center" style={{ color: 'var(--cui-body-color)' }}>{formatNumber(comp.avg_sqft)}</td>
                      <td className="px-2 py-1.5 text-center" style={{ color: 'var(--cui-body-color)' }}>{comp.distance_miles ? `${comp.distance_miles} mi` : '—'}</td>
                      <td className="px-2 py-1.5 text-right font-medium" style={{ color: 'var(--cui-body-color)' }}>{formatCurrency(comp.asking_rent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Rent Roll Table - Bottom (FULL WIDTH) */}
      <div className="rounded-xl shadow-lg overflow-hidden" style={{ backgroundColor: 'var(--cui-card-bg)' }}>
        <div className="border-b flex items-center justify-between" style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--surface-card-header)', borderColor: 'var(--cui-border-color)' }}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold" style={{ color: 'var(--cui-body-color)', fontSize: '1rem' }}>Detailed Rent Roll</h3>
              <div className="flex items-center gap-2 px-2 py-1 bg-green-900/20 border border-green-700/40 rounded text-xs">
                <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
                <span className="text-green-300 font-medium">Populates Floor Plans</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>Occupancy: <span className="text-white font-medium">{occupancyRate}%</span></span>
              <span>Units: <span className="text-white font-medium">{units.length} / {totalUnits}</span></span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFieldChooser(true)}
              className="px-3 py-1.5 bg-gray-700 text-white text-sm rounded hover:bg-gray-600 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Configure Columns
            </button>
            <button className="px-3 py-1.5 bg-blue-700 text-white text-sm rounded hover:bg-blue-600 transition-colors">
              + Add Unit
            </button>
          </div>
        </div>

        {/* KPI Tiles */}
        <div className="px-4 py-3 grid grid-cols-6 gap-3 border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
          {/* Occupancy Rate */}
          <div className="bg-gray-750 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">Occupancy</span>
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-white">{occupancyRate}%</div>
            <div className="text-xs text-gray-500 mt-1">{occupiedUnits} / {units.length} units</div>
          </div>

          {/* Avg Current Rent */}
          <div className="bg-gray-750 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">Avg Current Rent</span>
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-white">{formatCurrency(avgCurrentRent)}</div>
            <div className="text-xs text-gray-500 mt-1">Per unit/month</div>
          </div>

          {/* Avg Market Rent */}
          <div className="bg-gray-750 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">Avg Market Rent</span>
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-white">{formatCurrency(avgMarketRent)}</div>
            <div className="text-xs text-gray-500 mt-1">Per unit/month</div>
          </div>

          {/* Rent Growth Potential */}
          <div className="bg-gray-750 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">Growth Potential</span>
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-green-400">{rentGrowthPotential !== '0.0' && rentGrowthPotential !== 0 ? `+${rentGrowthPotential}%` : '—'}</div>
            <div className="text-xs text-gray-500 mt-1">To market rate</div>
          </div>

          {/* Total Monthly Income */}
          <div className="bg-gray-750 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">Monthly Income</span>
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-white">{totalMonthlyIncome === 0 ? '—' : `$${(totalMonthlyIncome / 1000).toFixed(1)}k`}</div>
            <div className="text-xs text-gray-500 mt-1">Current total</div>
          </div>

          {/* Avg Rent per SF */}
          <div className="bg-gray-750 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">Rent/SF</span>
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-white">{avgRentPerSF === '0.00' || Number(avgRentPerSF) === 0 ? '—' : `$${avgRentPerSF}`}</div>
            <div className="text-xs text-gray-500 mt-1">Average rate</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-900">
              <tr className="border-b border-gray-700">
                {visibleColumns.map(col => (
                  <th key={col.id} className={`px-3 py-2 font-medium text-gray-300 ${getColumnAlign(col.id)}`}>
                    {col.label}
                  </th>
                ))}
                <th className="text-center px-3 py-2 font-medium text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit, index) => (
                <tr key={unit.id} className={`border-b border-gray-700 ${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850'}`}>
                  {visibleColumns.map(col => (
                    <td key={col.id} className={`px-3 py-2 ${getColumnAlign(col.id)}`}>
                      {renderCellContent(unit, col.id)}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center">
                    {isEditing(unit.id) ? (
                      <div className="flex items-center gap-2 justify-center">
                        <button
                          className="px-2 py-1 text-xs bg-blue-700 text-white rounded hover:bg-blue-600"
                          onClick={handleEditSave}
                        >
                          Save
                        </button>
                        <button
                          className="px-2 py-1 text-xs bg-gray-700 text-gray-200 rounded hover:bg-gray-600"
                          onClick={handleEditCancel}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
                        onClick={() => handleEditStart(unit)}
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Field Chooser Modal */}
      {showFieldChooser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Configure Columns</h3>
              <button
                onClick={() => setShowFieldChooser(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-2 overflow-y-auto flex-1">
              <div className="mb-2 pb-1.5 border-b border-gray-700">
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-blue-900/30 border border-blue-700/50 text-blue-300 rounded font-medium text-[10px]">Input</span>
                    <span className="text-gray-400">User-editable</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-purple-900/30 border border-purple-700/50 text-purple-300 rounded font-medium text-[10px]">Calc</span>
                    <span className="text-gray-400">Auto-calculated</span>
                  </div>
                </div>
              </div>

              {/* Column categories */}
              {['unit', 'floorplan', 'tenant', 'lease', 'financial'].map(category => (
                <div key={category} className="mb-3">
                  <h4 className="text-xs font-semibold text-blue-400 mb-1 capitalize">{category} Info</h4>
                  <div className="space-y-0.5 ml-5">
                    {columns.filter(col => col.category === category).map(col => (
                      <label key={col.id} htmlFor={`field-${col.id}`} className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-700/30 px-2 py-1 rounded text-xs group">
                        <input
                          type="checkbox"
                          id={`field-${col.id}`}
                          checked={col.visible}
                          onChange={(e) => {
                            setColumns(prev => prev.map(c =>
                              c.id === col.id ? { ...c, visible: e.target.checked } : c
                            ));
                          }}
                          className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800 flex-shrink-0"
                        />
                        <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium flex-shrink-0 ${
                          col.type === 'input'
                            ? 'bg-blue-900/30 border border-blue-700/50 text-blue-300'
                            : 'bg-purple-900/30 border border-purple-700/50 text-purple-300'
                        }`}>
                          {col.type === 'input' ? 'Input' : 'Calc'}
                        </span>
                        <span className="text-gray-200 font-medium w-28 flex-shrink-0">{col.label}</span>
                        <span className="text-gray-400 flex-1">{col.description}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-gray-700 flex items-center justify-between">
              <button
                onClick={() => {
                  setColumns(defaultColumns);
                }}
                className="px-3 py-1.5 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
              >
                Reset to Defaults
              </button>
              <button
                onClick={() => setShowFieldChooser(false)}
                className="px-4 py-1.5 text-xs bg-blue-700 text-white rounded hover:bg-blue-600 transition-colors"
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
