'use client';

import { useState, useMemo, useEffect } from 'react';
import { unitTypesAPI, unitsAPI, leasesAPI } from '@/lib/api/multifamily';
import ProjectTabMap from '@/components/map/ProjectTabMap';
import { PhysicalDescription } from '../property';
import { formatNumber, formatCurrency, formatDecimal } from '@/utils/formatNumber';
import { ChevronDown, ChevronRight, MapPin, Building2, Calendar } from 'lucide-react';
import { CAccordion, CAccordionItem, CAccordionHeader, CAccordionBody } from '@coreui/react';
import { CompetitiveMarketCharts, PropertyColorMap } from '@/components/property/CompetitiveMarketCharts';
import { useCallback, useRef } from 'react';
import { isIncomeProperty } from '@/components/projects/tiles/tileConfig';

interface Project {
  project_id: number;
  project_name: string;
  project_type_code?: string;
  project_type?: string;
  property_subtype?: string;
}

interface PropertyTabProps {
  project: Project;
  activeTab?: string;
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
  status: 'Occupied' | 'Vacant' | 'Notice' | 'Renewal' | 'Unknown';
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

const isEmptyColumnValue = (value: unknown) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'number') return !Number.isFinite(value) || value === 0;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) return true;
    return trimmed.toLowerCase() === 'unknown';
  }
  return false;
};

const getUnitValueForColumn = (unit: Unit, columnId: string) => {
  switch (columnId) {
    case 'unitNumber':
      return unit.unitNumber;
    case 'floorPlan':
      return unit.floorPlan;
    case 'bedrooms':
      return unit.bedrooms;
    case 'bathrooms':
      return unit.bathrooms;
    case 'sqft':
      return unit.sqft;
    case 'tenantName':
      return unit.tenantName;
    case 'status':
      return unit.status;
    case 'leaseStart':
      return unit.leaseStart;
    case 'leaseEnd':
      return unit.leaseEnd;
    case 'deposit':
      return unit.deposit;
    case 'currentRent':
      return unit.currentRent;
    case 'marketRent':
      return unit.marketRent;
    case 'proformaRent':
      return unit.proformaRent;
    case 'monthlyIncome':
      return unit.monthlyIncome;
    case 'rentPerSF':
      return unit.rentPerSF;
    case 'proformaRentPerSF':
      return unit.proformaRentPerSF;
    case 'notes':
      return unit.notes;
    default:
      return null;
  }
};

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

// Landscaper Insights Component - dynamically generates insights from comparables
interface LandscaperInsightsProps {
  floorPlans: FloorPlan[];
  comparables: RentalComparable[];
  comparablesByProperty: Array<{
    propertyName: string;
    distance?: number;
    yearBuilt?: number;
    totalUnits?: number;
    unitTypes: RentalComparable[];
    rentRange: { min: number; max: number };
  }>;
}

function LandscaperInsights({ floorPlans, comparables, comparablesByProperty }: LandscaperInsightsProps) {
  // Filter to only comparables with valid asking_rent (catches NaN, null, undefined, 0, Infinity)
  // Note: DB may return numbers as strings, so convert first
  const validComparables = comparables.filter(c => {
    const rent = Number(c.asking_rent);
    return Number.isFinite(rent) && rent > 0;
  });

  // If no comparable data, show a helpful message
  if (validComparables.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
        No rental comparables available. Use Landscaper to extract comp data from your OM or add comparables manually.
      </p>
    );
  }

  // Calculate market stats directly from comparables (works even without floor plans)
  // Use Number() to handle string values from DB
  const avgCompRent = Math.round(validComparables.reduce((sum, c) => sum + Number(c.asking_rent), 0) / validComparables.length);
  const minRent = Math.min(...validComparables.map(c => Number(c.asking_rent)));
  const maxRent = Math.max(...validComparables.map(c => Number(c.asking_rent)));

  // Group by bedroom count for insights (using validComparables)
  const byBedroom = new Map<number, { count: number; avgRent: number; minRent: number; maxRent: number }>();
  validComparables.forEach(c => {
    const rent = Number(c.asking_rent);
    const existing = byBedroom.get(c.bedrooms);
    if (!existing) {
      byBedroom.set(c.bedrooms, { count: 1, avgRent: rent, minRent: rent, maxRent: rent });
    } else {
      existing.count += 1;
      existing.avgRent = ((existing.avgRent * (existing.count - 1)) + rent) / existing.count;
      existing.minRent = Math.min(existing.minRent, rent);
      existing.maxRent = Math.max(existing.maxRent, rent);
    }
  });

  // Calculate avg $/SF if we have sqft data
  const compsWithSqft = validComparables.filter(c => Number(c.avg_sqft) > 0);
  const avgRentPerSqft = compsWithSqft.length > 0
    ? compsWithSqft.reduce((sum, c) => sum + (Number(c.asking_rent) / Number(c.avg_sqft)), 0) / compsWithSqft.length
    : 0;

  // Get nearest comp
  const nearestComp = comparablesByProperty.find(p => p.distance && p.distance > 0);

  // Check if we have floor plan data to compare against
  const plansWithComps = floorPlans.filter((p: FloorPlan & { matchType?: string; compCount?: number }) =>
    (p.matchType && p.matchType !== 'none') || (p.aiEstimate !== p.marketRent)
  );
  const hasFloorPlanComparison = plansWithComps.length > 0;

  // If we have floor plan comparison data, calculate gap metrics
  let marketGapText = '';
  if (hasFloorPlanComparison) {
    const totalCurrentRent = plansWithComps.reduce((sum, p) => sum + (p.currentRent * p.unitCount), 0);
    const totalAIRent = plansWithComps.reduce((sum, p) => sum + (p.aiEstimate * p.unitCount), 0);
    const totalUnits = plansWithComps.reduce((sum, p) => sum + p.unitCount, 0);
    const avgCurrentRent = totalUnits > 0 ? Math.round(totalCurrentRent / totalUnits) : 0;
    const avgAIRent = totalUnits > 0 ? Math.round(totalAIRent / totalUnits) : 0;
    const marketGap = avgCurrentRent > 0 ? ((avgAIRent - avgCurrentRent) / avgCurrentRent * 100) : 0;

    if (Math.abs(marketGap) > 1) {
      marketGapText = marketGap > 0
        ? `Your current rents appear to be ${marketGap.toFixed(0)}% below market.`
        : `Your current rents are ${Math.abs(marketGap).toFixed(0)}% above market.`;
    }
  }

  return (
    <div className="space-y-2 text-sm" style={{ color: 'var(--cui-body-color)' }}>
      <p>
        <span className="font-semibold" style={{ color: 'var(--cui-primary)' }}>Market Summary:</span>{' '}
        Analyzed {validComparables.length} unit types across {comparablesByProperty.length} properties.
        Average asking rent is <span className="font-semibold">{formatCurrency(avgCompRent)}/mo</span> (range: {formatCurrency(minRent)}-{formatCurrency(maxRent)}).
        {avgRentPerSqft > 0 && <> Average rent per SF: <span className="font-semibold">${avgRentPerSqft.toFixed(2)}/SF</span>.</>}
      </p>

      <p>
        <span className="font-semibold" style={{ color: 'var(--cui-primary)' }}>By Unit Type:</span>{' '}
        {Array.from(byBedroom.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([beds, data]) => (
            <span key={beds}>
              {beds === 0 ? 'Studio' : `${beds}BR`}: {formatCurrency(Math.round(data.avgRent))} avg ({data.count} units){beds < Math.max(...Array.from(byBedroom.keys())) ? ' · ' : ''}
            </span>
          ))
        }
      </p>

      {nearestComp && (
        <p>
          <span className="font-semibold" style={{ color: 'var(--cui-primary)' }}>Nearest Comp:</span>{' '}
          {nearestComp.propertyName} ({nearestComp.distance} mi) — {formatCurrency(nearestComp.rentRange.min)}-{formatCurrency(nearestComp.rentRange.max)}/mo
          {nearestComp.yearBuilt && `, built ${nearestComp.yearBuilt}`}
          {nearestComp.totalUnits && `, ${nearestComp.totalUnits} units`}.
        </p>
      )}

      {marketGapText && (
        <p>
          <span className="font-semibold" style={{ color: 'var(--cui-primary)' }}>Position:</span>{' '}
          {marketGapText}
        </p>
      )}
    </div>
  );
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

export default function PropertyTab({ project, activeTab = 'details' }: PropertyTabProps) {
  const projectId = project.project_id;
  // Use property_subtype (most specific) → project_type → project_type_code (fallback)
  const effectiveProjectType = project.property_subtype
    || project.project_type
    || project.project_type_code;
  const projectType = project.project_type_code; // Keep for display purposes

  // Check if this is an income property (multifamily, office, retail, etc.)
  // Uses the same logic as folderTabConfig for consistency
  const isMultifamily = isIncomeProperty(effectiveProjectType);

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
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());
  const [hasCustomizedColumns, setHasCustomizedColumns] = useState(false);
  const [propertyColors, setPropertyColors] = useState<PropertyColorMap>({});
  const [highlightedProperty, setHighlightedProperty] = useState<string | null>(null);
  const propertyListRef = useRef<HTMLDivElement>(null);

  // Calculate AI market rent estimates from comparable data
  // Groups comparables by bed/bath and by bedroom only (for fuzzy matching)
  const aiEstimatesByBedBath = useMemo(() => {
    const estimates = new Map<string, { totalRent: number; totalSqft: number; count: number; avgRent: number; avgRentPerSqft: number }>();
    // Also track by bedroom only for fuzzy matching when exact bed/bath doesn't match
    const byBedroomOnly = new Map<number, { totalRent: number; totalSqft: number; count: number; avgRent: number; avgRentPerSqft: number }>();

    // Only include comparables with valid rent values (handle string/number)
    comparables.filter(c => {
      const rent = Number(c.asking_rent);
      return Number.isFinite(rent) && rent > 0;
    }).forEach(comp => {
      const rent = Number(comp.asking_rent);
      const sqft = Number(comp.avg_sqft) || 0;

      // Exact bed/bath key
      const key = `${comp.bedrooms}/${comp.bathrooms}`;
      if (!estimates.has(key)) {
        estimates.set(key, { totalRent: 0, totalSqft: 0, count: 0, avgRent: 0, avgRentPerSqft: 0 });
      }
      const entry = estimates.get(key)!;
      entry.totalRent += rent;
      entry.totalSqft += sqft;
      entry.count += 1;

      // Also group by bedroom only
      if (!byBedroomOnly.has(comp.bedrooms)) {
        byBedroomOnly.set(comp.bedrooms, { totalRent: 0, totalSqft: 0, count: 0, avgRent: 0, avgRentPerSqft: 0 });
      }
      const bedEntry = byBedroomOnly.get(comp.bedrooms)!;
      bedEntry.totalRent += rent;
      bedEntry.totalSqft += sqft;
      bedEntry.count += 1;
    });

    // Calculate averages for exact matches
    estimates.forEach((entry) => {
      entry.avgRent = Math.round(entry.totalRent / entry.count);
      entry.avgRentPerSqft = entry.totalSqft > 0 ? entry.totalRent / entry.totalSqft : 0;
    });

    // Calculate averages for bedroom-only matches
    byBedroomOnly.forEach((entry) => {
      entry.avgRent = Math.round(entry.totalRent / entry.count);
      entry.avgRentPerSqft = entry.totalSqft > 0 ? entry.totalRent / entry.totalSqft : 0;
    });

    // Store bedroom-only estimates with special key format "Xbd"
    byBedroomOnly.forEach((entry, bedrooms) => {
      estimates.set(`${bedrooms}bd`, entry);
    });

    return estimates;
  }, [comparables]);

  // Floor plans with AI estimates populated from comparable data
  // Uses fuzzy matching: exact bed/bath -> rounded bath -> bedroom only
  const floorPlansWithAI = useMemo(() => {
    return floorPlans.map(plan => {
      // Try exact bed/bath match first
      const exactKey = `${plan.bedrooms}/${plan.bathrooms}`;
      let estimate = aiEstimatesByBedBath.get(exactKey);
      let matchType: 'exact' | 'rounded' | 'bedroom' | 'none' = 'none';

      if (estimate && estimate.count > 0) {
        matchType = 'exact';
      } else {
        // Try rounded bathroom (1.75 -> 2, 1.5 -> 2, 1.25 -> 1)
        const roundedBath = Math.round(plan.bathrooms);
        const roundedKey = `${plan.bedrooms}/${roundedBath}`;
        estimate = aiEstimatesByBedBath.get(roundedKey);

        if (estimate && estimate.count > 0) {
          matchType = 'rounded';
        } else {
          // Fall back to bedroom-only matching
          const bedroomKey = `${plan.bedrooms}bd`;
          estimate = aiEstimatesByBedBath.get(bedroomKey);
          if (estimate && estimate.count > 0) {
            matchType = 'bedroom';
          }
        }
      }

      if (estimate && estimate.count > 0) {
        // Use comparable average rent, or fall back to $/SF calculation if sqft differs significantly
        let aiEstimate = estimate.avgRent;

        // If the floor plan sqft differs from comparable average by >15%, adjust using $/SF
        if (estimate.avgRentPerSqft > 0 && plan.sqft > 0) {
          const avgCompSqft = estimate.totalSqft / estimate.count;
          const sqftDiff = Math.abs(plan.sqft - avgCompSqft) / avgCompSqft;
          if (sqftDiff > 0.15) {
            // Adjust rent based on floor plan's actual sqft
            aiEstimate = Math.round(estimate.avgRentPerSqft * plan.sqft);
          }
        }

        return { ...plan, aiEstimate, matchType, compCount: estimate.count };
      }

      // No matching comparables - fall back to current market rent
      return { ...plan, aiEstimate: plan.marketRent, matchType: 'none' as const, compCount: 0 };
    });
  }, [floorPlans, aiEstimatesByBedBath]);

  // Group comparables by property name for collapsible display
  const comparablesByProperty = useMemo(() => {
    const grouped = new Map<string, RentalComparable[]>();
    comparables.forEach(comp => {
      const key = comp.property_name;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(comp);
    });
    // Sort each group by bedrooms
    grouped.forEach(comps => {
      comps.sort((a, b) => a.bedrooms - b.bedrooms);
    });
    // Convert to array sorted by distance
    return Array.from(grouped.entries())
      .map(([name, comps]) => {
        // Filter for valid rents when calculating stats (handle string/number)
        const validRentComps = comps.filter(c => {
          const rent = Number(c.asking_rent);
          return Number.isFinite(rent) && rent > 0;
        });
        const avgRent = validRentComps.length > 0
          ? Math.round(validRentComps.reduce((sum, c) => sum + Number(c.asking_rent), 0) / validRentComps.length)
          : 0;
        const rentRange = validRentComps.length > 0
          ? {
              min: Math.min(...validRentComps.map(c => Number(c.asking_rent))),
              max: Math.max(...validRentComps.map(c => Number(c.asking_rent)))
            }
          : { min: 0, max: 0 };

        return {
          propertyName: name,
          address: comps[0]?.address,
          distance: comps[0]?.distance_miles,
          yearBuilt: comps[0]?.year_built,
          totalUnits: comps[0]?.total_units,
          latitude: comps[0]?.latitude,
          longitude: comps[0]?.longitude,
          unitTypes: comps,
          avgRent,
          rentRange
        };
      })
      .sort((a, b) => (a.distance || 999) - (b.distance || 999));
  }, [comparables]);

  // Toggle property expansion
  const toggleProperty = (propertyName: string) => {
    setExpandedProperties(prev => {
      const next = new Set(prev);
      if (next.has(propertyName)) {
        next.delete(propertyName);
      } else {
        next.add(propertyName);
      }
      return next;
    });
  };

  // Expand all properties
  const expandAll = () => {
    setExpandedProperties(new Set(comparablesByProperty.map(p => p.propertyName)));
  };

  // Collapse all properties
  const collapseAll = () => {
    setExpandedProperties(new Set());
  };

  // Handle click from chart - scroll to property in listing
  const handlePropertyClick = useCallback((propertyName: string) => {
    // First expand the property
    setExpandedProperties(prev => new Set(prev).add(propertyName));

    // Set highlight effect
    setHighlightedProperty(propertyName);
    setTimeout(() => setHighlightedProperty(null), 2000);

    // Scroll to property after a brief delay for DOM update
    setTimeout(() => {
      const element = document.getElementById(`property-${propertyName.replace(/\s+/g, '-')}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }, []);

  // Handle color assignments from chart
  const handleColorsAssigned = useCallback((colors: PropertyColorMap) => {
    setPropertyColors(colors);
  }, []);

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
          aiEstimate: 0 // Will be populated from comparables
        }));

        // Fetch units
        const unitsData = await unitsAPI.list(projectId);

        // Fetch leases to get tenant info
        const leasesData = await leasesAPI.list(projectId);
        const leasesByUnit = new Map(leasesData.map(l => [l.unit_id, l]));

        const normalizeStatus = (status?: string | null): Unit['status'] => {
          if (!status) return 'Unknown';
          const normalized = status.toLowerCase();
          if (normalized === 'occupied') return 'Occupied';
          if (normalized === 'vacant') return 'Vacant';
          if (normalized === 'notice') return 'Notice';
          if (normalized === 'renewal') return 'Renewal';
          return 'Unknown';
        };

        const transformedUnits: Unit[] = unitsData.map(u => {
          const lease = leasesByUnit.get(u.unit_id);
          const unitRent = Math.round(u.current_rent ?? 0);
          const baseRent = unitRent > 0 ? unitRent : Math.round(lease?.base_rent_monthly || 0);
          const marketRent = Math.round(u.market_rent || 0);
          const unitStatus = normalizeStatus(u.occupancy_status);
          const leaseStatus = lease?.lease_status === 'ACTIVE' ? 'Occupied' : lease ? 'Vacant' : 'Unknown';
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
            status: unitStatus !== 'Unknown' ? unitStatus : leaseStatus,
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

  useEffect(() => {
    if (!units.length || hasCustomizedColumns) return;
    setColumns((prev) =>
      prev.map((col) => {
        if (!col.visible) return col;
        const hasAnyValue = units.some((unit) => !isEmptyColumnValue(getUnitValueForColumn(unit, col.id)));
        return hasAnyValue ? col : { ...col, visible: false };
      })
    );
  }, [units, hasCustomizedColumns]);

  // Get visible columns
  const visibleColumns = useMemo(() => {
    return columns.filter(col => col.visible);
  }, [columns]);

  // Render table cell content based on column
  const renderCellContent = (unit: Unit, columnId: string) => {
    const isEdit = isEditing(unit.id);

    switch (columnId) {
      case 'unitNumber':
        return <span className="font-semibold" style={{ color: 'var(--cui-body-color)' }}>{unit.unitNumber}</span>;
      case 'floorPlan':
        return <span style={{ color: 'var(--cui-secondary-color)' }}>{unit.floorPlan}</span>;
      case 'bedrooms':
        return <span style={{ color: 'var(--cui-secondary-color)' }}>{formatNumber(unit.bedrooms)}</span>;
      case 'bathrooms':
        return <span style={{ color: 'var(--cui-secondary-color)' }}>{formatNumber(unit.bathrooms)}</span>;
      case 'sqft':
        return <span style={{ color: 'var(--cui-secondary-color)' }}>{formatNumber(unit.sqft)}</span>;
      case 'currentRent':
        return isEdit ? (
          <input
            type="number"
            className="w-24 rounded px-2 py-1 text-center"
            style={{ backgroundColor: 'var(--cui-tertiary-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
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
            className="w-24 rounded px-2 py-1 text-center"
            style={{ backgroundColor: 'var(--cui-tertiary-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
            value={editDraft?.marketRent || 0}
            onChange={(e) => setEditDraft(prev => prev ? { ...prev, marketRent: Number(e.target.value) } : null)}
          />
        ) : (
          <span className="font-medium" style={{ color: 'var(--cui-body-color)' }}>{formatCurrency(unit.marketRent)}</span>
        );
      case 'proformaRent':
        return isEdit ? (
          <input
            type="number"
            className="w-24 rounded px-2 py-1 text-center"
            style={{ backgroundColor: 'var(--cui-tertiary-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
            value={editDraft?.proformaRent || 0}
            onChange={(e) => setEditDraft(prev => prev ? { ...prev, proformaRent: Number(e.target.value) } : null)}
          />
        ) : (
          <span style={{ color: 'var(--cui-secondary-color)' }}>{formatCurrency(unit.proformaRent)}</span>
        );
      case 'status':
        return isEdit ? (
          <select
            className="rounded px-2 py-1 text-xs"
            style={{ backgroundColor: 'var(--cui-tertiary-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
            value={editDraft?.status || 'Unknown'}
            onChange={(e) => setEditDraft(prev => prev ? { ...prev, status: e.target.value as Unit['status'] } : null)}
          >
            <option value="Occupied">Occupied</option>
            <option value="Vacant">Vacant</option>
            <option value="Notice">Notice</option>
            <option value="Renewal">Renewal</option>
            <option value="Unknown">Unknown</option>
          </select>
        ) : (
          <span className="px-2 py-0.5 rounded text-xs font-medium border" style={getStatusBadge(unit.status)}>{unit.status}</span>
        );
      case 'tenantName':
        return isEdit ? (
          <input
            type="text"
            className="w-full rounded px-2 py-1"
            style={{ backgroundColor: 'var(--cui-tertiary-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
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
            className="rounded px-2 py-1 text-xs"
            style={{ backgroundColor: 'var(--cui-tertiary-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
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
            className="rounded px-2 py-1 text-xs"
            style={{ backgroundColor: 'var(--cui-tertiary-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
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
            className="w-24 rounded px-2 py-1 text-center"
            style={{ backgroundColor: 'var(--cui-tertiary-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
            value={editDraft?.deposit || 0}
            onChange={(e) => setEditDraft(prev => prev ? { ...prev, deposit: Number(e.target.value) } : null)}
          />
        ) : (
          formatCurrency(unit.deposit)
        );
      case 'monthlyIncome':
        return <span style={{ color: 'var(--cui-secondary-color)' }}>{formatCurrency(unit.monthlyIncome)}</span>;
      case 'rentPerSF':
        return <span style={{ color: 'var(--cui-secondary-color)' }}>{unit.rentPerSF ? `$${formatDecimal(unit.rentPerSF)}` : '—'}</span>;
      case 'proformaRentPerSF':
        return <span style={{ color: 'var(--cui-secondary-color)' }}>{unit.proformaRentPerSF ? `$${formatDecimal(unit.proformaRentPerSF)}` : '—'}</span>;
      case 'notes':
        return isEdit ? (
          <input
            type="text"
            className="w-full rounded px-2 py-1 text-xs"
            style={{ backgroundColor: 'var(--cui-tertiary-bg)', borderColor: 'var(--cui-border-color)', color: 'var(--cui-body-color)' }}
            value={editDraft?.notes || ''}
            onChange={(e) => setEditDraft(prev => prev ? { ...prev, notes: e.target.value } : null)}
          />
        ) : (
          <span className="text-xs" style={{ color: 'var(--cui-tertiary-color)' }}>{unit.notes || '—'}</span>
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

  // Status badge styles - using semantic CoreUI colors
  const getStatusBadge = (status: Unit['status']) => {
    const styles: Record<Unit['status'], React.CSSProperties> = {
      'Occupied': { backgroundColor: 'var(--cui-success-bg)', color: 'var(--cui-success)', borderColor: 'var(--cui-success)' },
      'Vacant': { backgroundColor: 'var(--cui-danger-bg)', color: 'var(--cui-danger)', borderColor: 'var(--cui-danger)' },
      'Notice': { backgroundColor: 'var(--cui-warning-bg)', color: 'var(--cui-warning)', borderColor: 'var(--cui-warning)' },
      'Renewal': { backgroundColor: 'var(--cui-info-bg)', color: 'var(--cui-info)', borderColor: 'var(--cui-info)' },
      'Unknown': { backgroundColor: 'var(--cui-secondary-bg)', color: 'var(--cui-secondary-color)', borderColor: 'var(--cui-border-color)' }
    };
    return styles[status];
  };

  // AI estimate indicator - shows if market rent differs from AI estimate based on comparables
  const getAIIndicator = (marketRent: number, aiEstimate: number, compCount: number, matchType: string) => {
    // If no comparable data or no difference, don't show any indicator
    if (compCount === 0 || matchType === 'none' || aiEstimate === 0 || aiEstimate === marketRent) {
      return null;
    }

    const diff = marketRent - aiEstimate;
    const percentDiff = Math.abs((diff / aiEstimate) * 100);

    if (percentDiff < 2) return null; // Within 2% - no indicator

    const matchLabel = matchType === 'exact' ? '' : matchType === 'rounded' ? ' (rounded bath)' : ' (by bedroom)';
    const tooltip = `Landscaper suggests ${formatCurrency(aiEstimate)} based on ${compCount} comparable unit${compCount > 1 ? 's' : ''}${matchLabel} (${percentDiff.toFixed(1)}% ${diff > 0 ? 'above' : 'below'} market)`;

    if (diff > 0) {
      return (
        <span className="ml-1 text-xs text-green-400 cursor-help" title={tooltip}>
          ↑
        </span>
      );
    } else {
      return (
        <span className="ml-1 text-xs text-amber-400 cursor-help" title={tooltip}>
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
        <div className="shadow-lg p-12 text-center max-w-2xl" style={{ backgroundColor: 'var(--cui-card-bg)', border: '1px solid var(--cui-border-color)' }}>
          <div className="mb-6">
            <svg className="w-24 h-24 mx-auto" style={{ color: 'var(--cui-secondary-color)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold mb-3" style={{ color: 'var(--cui-body-color)' }}>
            {projectTypeLabels[projectType || ''] || 'Commercial'} Property Tab Coming Soon
          </h2>
          <p className="mb-2" style={{ color: 'var(--cui-secondary-color)' }}>
            This project is a <strong style={{ color: 'var(--cui-body-color)' }}>{projectTypeLabels[projectType || ''] || projectType}</strong> asset type.
          </p>
          <p className="mb-6" style={{ color: 'var(--cui-secondary-color)' }}>
            The Property tab is currently designed for multifamily projects only.
            A dedicated template for {projectTypeLabels[projectType || '']?.toLowerCase() || 'this asset type'} properties is under development.
          </p>
          <div className="rounded-lg p-4 text-left" style={{ backgroundColor: 'var(--cui-info-bg)', border: '1px solid var(--cui-info)' }}>
            <p className="text-sm mb-2" style={{ color: 'var(--cui-info)' }}>
              <strong>For now, use these alternatives:</strong>
            </p>
            <ul className="text-sm space-y-1 ml-4 list-disc" style={{ color: 'var(--cui-secondary-color)' }}>
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
        <div className="shadow-lg p-12 text-center max-w-2xl" style={{ backgroundColor: 'var(--cui-card-bg)', border: '1px solid var(--cui-border-color)' }}>
          <div className="mb-6">
            <svg className="w-24 h-24 mx-auto" style={{ color: 'var(--cui-secondary-color)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold mb-3" style={{ color: 'var(--cui-body-color)' }}>
            No Rent Roll Data Yet
          </h2>
          <p className="mb-6" style={{ color: 'var(--cui-secondary-color)' }}>
            This multifamily project doesn't have any unit or floorplan data yet.
            Upload a rent roll or manually add unit information to get started.
          </p>
          <div className="rounded-lg p-4 text-left" style={{ backgroundColor: 'var(--cui-info-bg)', border: '1px solid var(--cui-info)' }}>
            <p className="text-sm mb-2" style={{ color: 'var(--cui-info)' }}>
              <strong>To add data:</strong>
            </p>
            <ul className="text-sm space-y-1 ml-4 list-disc" style={{ color: 'var(--cui-secondary-color)' }}>
              <li>Navigate to the Rent Roll page to upload a rent roll spreadsheet</li>
              <li>Use the Django admin panel to manually add unit types and units</li>
              <li>Import data via the API endpoints</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Render content based on activeTab (controlled by folder tabs)
  const renderDetailsContent = () => (
    <div>
      {/* Two-column layout: Physical Description (40%) + Floor Plan Matrix & Landscaper (60%) */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Left Column - Physical Description */}
        <div className="w-full lg:w-[32%] flex-shrink-0">
          <div
            className="shadow-lg"
            style={{
              backgroundColor: 'var(--cui-card-bg)',
              border: '1px solid var(--cui-border-color)',
              borderRadius: 'var(--cui-border-radius, 0.375rem)',
            }}
          >
            <div
              className="border-b px-3 py-2"
              style={{ backgroundColor: 'var(--surface-card-header)', borderColor: 'var(--cui-border-color)' }}
            >
              <h3 className="font-semibold text-sm" style={{ color: 'var(--cui-body-color)' }}>
                Physical Description
              </h3>
            </div>
            <div>
              <PhysicalDescription projectId={projectId} compact />
            </div>
          </div>
        </div>

        {/* Right Column - Floor Plan Matrix + Landscaper Analysis */}
        <div className="w-full lg:w-3/5 space-y-4">
          {/* Floor Plan Matrix */}
          <div
            className="shadow-lg overflow-hidden"
            style={{
              backgroundColor: 'var(--cui-card-bg)',
              border: '1px solid var(--cui-border-color)',
              borderRadius: 'var(--cui-border-radius, 0.375rem)',
            }}
          >
            <div
              className="border-b px-3 py-2"
              style={{ backgroundColor: 'var(--surface-card-header)', borderColor: 'var(--cui-border-color)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--cui-body-color)' }}>
                    Floor Plan Matrix
                  </h3>
                  <div
                    className="flex items-center gap-2"
                    style={{
                      padding: '0.2rem 0.9rem',
                      borderRadius: '999px',
                      border: '1px solid var(--cui-primary)',
                      backgroundColor: 'var(--cui-primary-bg)',
                    }}
                  >
                    <span
                      className="font-semibold"
                      style={{
                        color: 'var(--cui-primary)',
                        fontSize: '0.65rem',
                        letterSpacing: '0.02em',
                      }}
                    >
                      Aggregates from Units
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span style={{ color: 'var(--cui-secondary-color)' }}>
                    Total: <span style={{ color: 'var(--cui-body-color)', fontWeight: 600 }}>{formatNumber(totalUnits)}</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="p-3">
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: 'var(--surface-card-header)' }}>
                  <tr style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
                    <th className="text-left px-2 py-2 font-medium whitespace-nowrap" style={{ color: 'var(--cui-secondary-color)' }}>Plan</th>
                    <th className="text-center px-2 py-2 font-medium whitespace-nowrap" style={{ color: 'var(--cui-secondary-color)' }}>Bed</th>
                    <th className="text-center px-2 py-2 font-medium whitespace-nowrap" style={{ color: 'var(--cui-secondary-color)' }}>Bath</th>
                    <th className="text-center px-2 py-2 font-medium whitespace-nowrap" style={{ color: 'var(--cui-secondary-color)' }}>SF</th>
                    <th className="text-center px-2 py-2 font-medium whitespace-nowrap" style={{ color: 'var(--cui-secondary-color)' }}>Units</th>
                    <th className="text-center px-2 py-2 font-medium whitespace-nowrap" style={{ color: 'var(--cui-secondary-color)' }}>Current</th>
                    <th className="text-center px-2 py-2 font-medium whitespace-nowrap" style={{ color: 'var(--cui-secondary-color)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {floorPlansWithAI.map((plan, index) => {
                    const editing = isPlanEditing(plan.id);
                    const draft = editing ? planEditDraft! : plan;

                    return (
                      <tr key={plan.id} style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
                        <td className="px-2 py-2">
                          {editing ? (
                            <input
                              type="text"
                              className="w-16 rounded px-2 py-1 text-sm"
                              style={{ backgroundColor: 'var(--cui-tertiary-bg)', border: '1px solid var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                              value={draft.name}
                              onChange={(e) => setPlanEditDraft(d => d ? {...d, name: e.target.value} : null)}
                            />
                          ) : (
                            <span style={{ color: 'var(--cui-body-color)', fontWeight: 600 }}>{plan.name}</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {editing ? (
                            <input
                              type="number"
                              className="w-12 rounded px-1 py-1 text-center text-sm"
                              style={{ backgroundColor: 'var(--cui-tertiary-bg)', border: '1px solid var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                              value={draft.bedrooms}
                              onChange={(e) => setPlanEditDraft(d => d ? {...d, bedrooms: Number(e.target.value)} : null)}
                            />
                          ) : (
                            <span style={{ color: 'var(--cui-secondary-color)' }}>{formatNumber(plan.bedrooms)}</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {editing ? (
                            <input
                              type="number"
                              step="0.5"
                              className="w-12 rounded px-1 py-1 text-center text-sm"
                              style={{ backgroundColor: 'var(--cui-tertiary-bg)', border: '1px solid var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                              value={draft.bathrooms}
                              onChange={(e) => setPlanEditDraft(d => d ? {...d, bathrooms: Number(e.target.value)} : null)}
                            />
                          ) : (
                            <span style={{ color: 'var(--cui-secondary-color)' }}>{formatNumber(plan.bathrooms)}</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {editing ? (
                            <input
                              type="number"
                              className="w-16 rounded px-1 py-1 text-center text-sm"
                              style={{ backgroundColor: 'var(--cui-tertiary-bg)', border: '1px solid var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                              value={draft.sqft}
                              onChange={(e) => setPlanEditDraft(d => d ? {...d, sqft: Number(e.target.value)} : null)}
                            />
                          ) : (
                            <span style={{ color: 'var(--cui-secondary-color)' }}>{formatNumber(plan.sqft)}</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {editing ? (
                            <input
                              type="number"
                              className="w-14 rounded px-1 py-1 text-center text-sm"
                              style={{ backgroundColor: 'var(--cui-tertiary-bg)', border: '1px solid var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                              value={draft.unitCount}
                              onChange={(e) => setPlanEditDraft(d => d ? {...d, unitCount: Number(e.target.value)} : null)}
                            />
                          ) : (
                            <span style={{ color: 'var(--cui-secondary-color)' }}>{formatNumber(plan.unitCount)}</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {editing ? (
                            <input
                              type="number"
                              className="w-20 rounded px-1 py-1 text-center text-sm"
                              style={{ backgroundColor: 'var(--cui-tertiary-bg)', border: '1px solid var(--cui-border-color)', color: 'var(--cui-body-color)' }}
                              value={draft.currentRent}
                              onChange={(e) => setPlanEditDraft(d => d ? {...d, currentRent: Number(e.target.value)} : null)}
                            />
                          ) : (
                            <span style={{ color: 'var(--cui-body-color)', fontWeight: 500 }}>{formatCurrency(plan.currentRent)}</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {editing ? (
                            <div className="flex items-center gap-1 justify-center">
                              <button
                                className="px-2 py-1 text-xs rounded"
                                style={{ backgroundColor: 'var(--cui-primary)', color: 'var(--cui-white)' }}
                                onClick={handlePlanEditSave}
                              >
                                Save
                              </button>
                              <button
                                className="px-2 py-1 text-xs rounded"
                                style={{ backgroundColor: 'var(--cui-tertiary-bg)', color: 'var(--cui-secondary-color)' }}
                                onClick={handlePlanEditCancel}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              className="px-2 py-1 text-xs rounded"
                              style={{ backgroundColor: 'var(--cui-tertiary-bg)', color: 'var(--cui-secondary-color)' }}
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
          </div>

          {/* Landscaper Analysis - Below Floor Plan Matrix in right column */}
          <div
            className="rounded-lg p-4"
            style={{ backgroundColor: 'var(--cui-tertiary-bg)', border: '1px solid var(--cui-border-color)' }}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5" style={{ color: 'var(--cui-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-sm font-semibold" style={{ color: 'var(--cui-body-color)' }}>Landscaper Analysis</h4>
                  <span className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
                    {comparables.length > 0 ? `Based on ${comparables.length} comp units` : ''}
                  </span>
                </div>
                <LandscaperInsights
                  floorPlans={floorPlansWithAI}
                  comparables={comparables}
                  comparablesByProperty={comparablesByProperty}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMarketContent = () => (
    <div className="space-y-4">
      {/* Competitive Market Rentals Chart - Full Width */}
      {comparables.length > 0 && (
        <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: 'var(--cui-card-bg)', borderRadius: '8px', width: '100%' }}>
          <h4 style={{ color: 'var(--cui-body-color)', marginBottom: '12px' }}>Competitive Market Rentals</h4>
          <CompetitiveMarketCharts
            comparables={comparables}
            floorPlans={floorPlans}
            subjectPropertyName={project.project_name}
            onPropertyClick={handlePropertyClick}
            onColorsAssigned={handleColorsAssigned}
            selectedProperty={highlightedProperty}
          />
        </div>
      )}

      {/* Comparable Rentals with Map */}
      <div className="shadow-lg overflow-hidden" style={{ backgroundColor: 'var(--cui-card-bg)' }}>
        <div className="border-b flex items-center justify-between" style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--surface-card-header)', borderColor: 'var(--cui-border-color)' }}>
            <div className="flex items-center gap-3">
              <h3 className="font-semibold" style={{ color: 'var(--cui-body-color)', fontSize: '1rem' }}>Comparable Rentals</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-300 border border-blue-700/40">
                {comparablesByProperty.length} properties • {comparables.length} unit types
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={expandAll}
                className="text-xs px-2 py-1 rounded transition-colors"
                style={{ color: 'var(--cui-secondary-color)' }}
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="text-xs px-2 py-1 rounded transition-colors"
                style={{ color: 'var(--cui-secondary-color)' }}
              >
                Collapse All
              </button>
            </div>
          </div>
          <div className="d-flex" style={{ backgroundColor: 'var(--cui-card-bg)', gap: '1rem', padding: '1rem' }}>
            {/* Left: Collapsible Property Groups */}
            <div className="space-y-1 pr-1 overflow-y-auto" style={{ flex: '0 0 50%', maxHeight: '500px' }}>
              {comparablesByProperty.length === 0 ? (
                <div className="text-center py-8 text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
                  <p>No rental comparables available.</p>
                  <p className="text-xs mt-1">Ask Landscaper to extract comps from your OM.</p>
                </div>
              ) : (
                comparablesByProperty.map((property, propIdx) => {
                  const isExpanded = expandedProperties.has(property.propertyName);
                  const isHighlighted = highlightedProperty === property.propertyName;
                  const propertyColor = propertyColors[property.propertyName];
                  return (
                    <div
                      key={property.propertyName}
                      id={`property-${property.propertyName.replace(/\s+/g, '-')}`}
                      className="border rounded-lg overflow-hidden transition-all duration-300"
                      style={{
                        borderColor: isHighlighted ? propertyColor || '#3b82f6' : '#374151',
                        boxShadow: isHighlighted ? `0 0 0 2px ${propertyColor || '#3b82f6'}40` : 'none',
                      }}
                    >
                      {/* Property Header - Clickable */}
                      <button
                        onClick={() => toggleProperty(property.propertyName)}
                        className="w-full flex items-center justify-between px-3 py-2 transition-colors text-left"
                        style={{ backgroundColor: propIdx % 2 === 0 ? 'var(--cui-card-bg)' : 'var(--cui-tertiary-bg)' }}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--cui-secondary-color)' }} />
                          ) : (
                            <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--cui-secondary-color)' }} />
                          )}
                          {/* Color dot */}
                          {propertyColor && (
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: propertyColor }}
                            />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate" style={{ color: 'var(--cui-body-color)' }}>{property.propertyName}</span>
                              <span className="text-xs" style={{ color: 'var(--cui-tertiary-color)' }}>({property.unitTypes.length} types)</span>
                            </div>
                            {property.address && (
                              <div className="flex items-center gap-1 text-xs truncate" style={{ color: 'var(--cui-secondary-color)' }}>
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{property.address}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 text-xs">
                          {property.distance && (
                            <span className="text-blue-400 font-medium">{property.distance} mi</span>
                          )}
                          {property.yearBuilt && (
                            <span className="flex items-center gap-1" style={{ color: 'var(--cui-secondary-color)' }}>
                              <Calendar className="w-3 h-3" />
                              {property.yearBuilt}
                            </span>
                          )}
                          {property.totalUnits && (
                            <span className="flex items-center gap-1" style={{ color: 'var(--cui-secondary-color)' }}>
                              <Building2 className="w-3 h-3" />
                              {property.totalUnits}
                            </span>
                          )}
                          <span className="text-green-400 font-medium">
                            {property.rentRange.min === property.rentRange.max
                              ? formatCurrency(property.rentRange.min)
                              : `${formatCurrency(property.rentRange.min)} - ${formatCurrency(property.rentRange.max)}`
                            }
                          </span>
                        </div>
                      </button>

                      {/* Expanded Unit Types */}
                      {isExpanded && (
                        <div style={{ backgroundColor: 'var(--cui-tertiary-bg)', borderTop: '1px solid var(--cui-border-color)' }}>
                          <table className="w-full text-xs">
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
                                <th className="text-left px-3 py-1.5 font-medium" style={{ color: 'var(--cui-secondary-color)', minWidth: '140px' }}>Unit Type</th>
                                <th className="text-center px-2 py-1.5 font-medium" style={{ color: 'var(--cui-secondary-color)' }}>Bed</th>
                                <th className="text-center px-2 py-1.5 font-medium" style={{ color: 'var(--cui-secondary-color)' }}>Bath</th>
                                <th className="text-center px-2 py-1.5 font-medium" style={{ color: 'var(--cui-secondary-color)' }}>SF</th>
                                <th className="text-right px-3 py-1.5 font-medium" style={{ color: 'var(--cui-secondary-color)' }}>Rent</th>
                                <th className="text-right px-3 py-1.5 font-medium" style={{ color: 'var(--cui-secondary-color)' }}>$/SF</th>
                              </tr>
                            </thead>
                            <tbody>
                              {property.unitTypes.map((unit, idx) => (
                                <tr
                                  key={unit.comparable_id}
                                  className="last:border-b-0"
                                  style={{ borderBottom: '1px solid var(--cui-border-color-translucent)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}
                                >
                                  <td className="px-3 py-1.5" style={{ color: 'var(--cui-body-color)' }}>{unit.unit_type || `${unit.bedrooms}BR/${unit.bathrooms}BA`}</td>
                                  <td className="px-2 py-1.5 text-center" style={{ color: 'var(--cui-secondary-color)' }}>{formatNumber(unit.bedrooms)}</td>
                                  <td className="px-2 py-1.5 text-center" style={{ color: 'var(--cui-secondary-color)' }}>{formatNumber(unit.bathrooms)}</td>
                                  <td className="px-2 py-1.5 text-center" style={{ color: 'var(--cui-secondary-color)' }}>{formatNumber(unit.avg_sqft)}</td>
                                  <td className="px-3 py-1.5 text-right font-medium" style={{ color: 'var(--cui-success)' }}>{formatCurrency(unit.asking_rent)}</td>
                                  <td className="px-3 py-1.5 text-right" style={{ color: 'var(--cui-secondary-color)' }}>
                                    {unit.avg_sqft > 0 ? `$${(unit.asking_rent / unit.avg_sqft).toFixed(2)}` : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Right: Map */}
            <div className="rounded-lg overflow-hidden" style={{ flex: '1 1 auto', minHeight: '500px' }}>
              <ProjectTabMap
                projectId={projectId.toString()}
                styleUrl={process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'aerial'}
                tabId="property"
                rentalComparables={comparables}
                comparableColors={propertyColors}
                onMarkerClick={handlePropertyClick}
              />
            </div>
          </div>
        </div>
      </div>
  );

  const renderRentRollContent = () => (
    <div className="space-y-4">
      {/* Detailed Rent Roll Table */}
      <div className="shadow-lg overflow-hidden" style={{ backgroundColor: 'var(--cui-card-bg)' }}>

        {/* KPI Tiles */}
        <div className="px-4 py-3 grid grid-cols-6 gap-3 border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
          {/* Occupancy Rate */}
          <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--cui-tertiary-bg)', border: '1px solid var(--cui-border-color)' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>Occupancy</span>
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--cui-body-color)' }}>{occupancyRate}%</div>
            <div className="text-xs mt-1" style={{ color: 'var(--cui-tertiary-color)' }}>{occupiedUnits} / {units.length} units</div>
          </div>

          {/* Avg Current Rent */}
          <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--cui-tertiary-bg)', border: '1px solid var(--cui-border-color)' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>Avg Current Rent</span>
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--cui-body-color)' }}>{formatCurrency(avgCurrentRent)}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--cui-tertiary-color)' }}>Per unit/month</div>
          </div>

          {/* Avg Market Rent */}
          <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--cui-tertiary-bg)', border: '1px solid var(--cui-border-color)' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>Avg Market Rent</span>
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--cui-body-color)' }}>{formatCurrency(avgMarketRent)}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--cui-tertiary-color)' }}>Per unit/month</div>
          </div>

          {/* Rent Growth Potential */}
          <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--cui-tertiary-bg)', border: '1px solid var(--cui-border-color)' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>Growth Potential</span>
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-green-400">{rentGrowthPotential !== '0.0' && rentGrowthPotential !== 0 ? `+${rentGrowthPotential}%` : '—'}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--cui-tertiary-color)' }}>To market rate</div>
          </div>

          {/* Total Monthly Income */}
          <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--cui-tertiary-bg)', border: '1px solid var(--cui-border-color)' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>Monthly Income</span>
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--cui-body-color)' }}>{totalMonthlyIncome === 0 ? '—' : `$${(totalMonthlyIncome / 1000).toFixed(1)}k`}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--cui-tertiary-color)' }}>Current total</div>
          </div>

          {/* Avg Rent per SF */}
          <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--cui-tertiary-bg)', border: '1px solid var(--cui-border-color)' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>Rent/SF</span>
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--cui-body-color)' }}>{avgRentPerSF === '0.00' || Number(avgRentPerSF) === 0 ? '—' : `$${avgRentPerSF}`}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--cui-tertiary-color)' }}>Average rate</div>
          </div>
        </div>

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
            <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
              <span>Occupancy: <span className="font-medium" style={{ color: 'var(--cui-body-color)' }}>{occupancyRate}%</span></span>
              <span>Units: <span className="font-medium" style={{ color: 'var(--cui-body-color)' }}>{units.length} / {totalUnits}</span></span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFieldChooser(true)}
              className="px-3 py-1.5 text-sm rounded transition-colors flex items-center gap-1.5"
              style={{ backgroundColor: 'var(--cui-tertiary-bg)', color: 'var(--cui-body-color)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Configure Columns
            </button>
            <button
              className="px-3 py-1.5 text-sm rounded transition-colors"
              style={{ backgroundColor: 'var(--cui-primary)', color: 'var(--cui-white)' }}
            >
              + Add Unit
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: 'var(--cui-dark-bg)' }}>
              <tr style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
                {visibleColumns.map(col => (
                  <th key={col.id} className={`px-3 py-2 font-medium ${getColumnAlign(col.id)}`} style={{ color: 'var(--cui-secondary-color)' }}>
                    {col.label}
                  </th>
                ))}
                <th className="text-center px-3 py-2 font-medium" style={{ color: 'var(--cui-secondary-color)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit, index) => (
                <tr key={unit.id} style={{ borderBottom: '1px solid var(--cui-border-color)', backgroundColor: index % 2 === 0 ? 'var(--cui-card-bg)' : 'var(--cui-tertiary-bg)' }}>
                  {visibleColumns.map(col => (
                    <td key={col.id} className={`px-3 py-2 ${getColumnAlign(col.id)}`}>
                      {renderCellContent(unit, col.id)}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center">
                    {isEditing(unit.id) ? (
                      <div className="flex items-center gap-2 justify-center">
                        <button
                          className="px-2 py-1 text-xs rounded"
                          style={{ backgroundColor: 'var(--cui-primary)', color: 'var(--cui-white)' }}
                          onClick={handleEditSave}
                        >
                          Save
                        </button>
                        <button
                          className="px-2 py-1 text-xs rounded"
                          style={{ backgroundColor: 'var(--cui-tertiary-bg)', color: 'var(--cui-secondary-color)' }}
                          onClick={handleEditCancel}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className="px-2 py-1 text-xs rounded"
                        style={{ backgroundColor: 'var(--cui-tertiary-bg)', color: 'var(--cui-secondary-color)' }}
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
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div
            className="rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
            style={{ backgroundColor: 'var(--cui-card-bg)', border: '1px solid var(--cui-border-color)' }}
          >
            {/* Modal Header */}
            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--cui-border-color)' }}
            >
              <h3 className="text-lg font-semibold" style={{ color: 'var(--cui-body-color)' }}>Configure Columns</h3>
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

            {/* Modal Body */}
            <div className="px-6 py-2 overflow-y-auto flex-1">
              <div className="mb-2 pb-1.5" style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="px-1.5 py-0.5 rounded font-medium text-[10px]"
                      style={{ backgroundColor: 'var(--cui-info-bg-subtle, rgba(59, 130, 246, 0.15))', border: '1px solid var(--cui-info, #3b82f6)', color: 'var(--cui-info, #3b82f6)' }}
                    >
                      Input
                    </span>
                    <span style={{ color: 'var(--cui-secondary-color)' }}>User-editable</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="px-1.5 py-0.5 rounded font-medium text-[10px]"
                      style={{ backgroundColor: 'rgba(147, 51, 234, 0.15)', border: '1px solid #9333ea', color: '#9333ea' }}
                    >
                      Calc
                    </span>
                    <span style={{ color: 'var(--cui-secondary-color)' }}>Auto-calculated</span>
                  </div>
                </div>
              </div>

              {/* Column categories */}
              {['unit', 'floorplan', 'tenant', 'lease', 'financial'].map(category => (
                <div key={category} className="mb-3">
                  <h4 className="text-xs font-semibold mb-1 capitalize" style={{ color: 'var(--cui-info, #3b82f6)' }}>{category} Info</h4>
                  <div className="space-y-0.5 ml-5">
                    {columns.filter(col => col.category === category).map(col => (
                      <label
                        key={col.id}
                        htmlFor={`field-${col.id}`}
                        className="flex items-center gap-2.5 cursor-pointer px-2 py-1 rounded text-xs group"
                        style={{ backgroundColor: col.visible ? 'var(--cui-tertiary-bg)' : 'transparent' }}
                      >
                        <input
                          type="checkbox"
                          id={`field-${col.id}`}
                          checked={col.visible}
                          onChange={(e) => {
                            setHasCustomizedColumns(true);
                            setColumns(prev => prev.map(c =>
                              c.id === col.id ? { ...c, visible: e.target.checked } : c
                            ));
                          }}
                          className="rounded flex-shrink-0"
                          style={{ accentColor: 'var(--cui-primary)' }}
                        />
                        <span
                          className="px-1.5 py-0.5 text-[10px] rounded font-medium flex-shrink-0"
                          style={col.type === 'input'
                            ? { backgroundColor: 'var(--cui-info-bg-subtle, rgba(59, 130, 246, 0.15))', border: '1px solid var(--cui-info, #3b82f6)', color: 'var(--cui-info, #3b82f6)' }
                            : { backgroundColor: 'rgba(147, 51, 234, 0.15)', border: '1px solid #9333ea', color: '#9333ea' }
                          }
                        >
                          {col.type === 'input' ? 'Input' : 'Calc'}
                        </span>
                        <span className="font-medium w-28 flex-shrink-0" style={{ color: 'var(--cui-body-color)' }}>{col.label}</span>
                        <span className="flex-1" style={{ color: 'var(--cui-secondary-color)' }}>{col.description}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div
              className="px-6 py-3 flex items-center justify-between"
              style={{ borderTop: '1px solid var(--cui-border-color)' }}
            >
              <button
                onClick={() => {
                  setHasCustomizedColumns(false);
                  setColumns(defaultColumns);
                }}
                className="px-3 py-1.5 text-xs rounded transition-colors"
                style={{ backgroundColor: 'var(--cui-secondary-bg)', color: 'var(--cui-body-color)' }}
              >
                Reset to Defaults
              </button>
              <button
                onClick={() => setShowFieldChooser(false)}
                className="px-4 py-1.5 text-xs rounded transition-colors"
                style={{ backgroundColor: 'var(--cui-primary)', color: 'var(--cui-white)' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Main return - render content based on activeTab
  return (
    <>
      {activeTab === 'details' && renderDetailsContent()}
      {activeTab === 'market' && renderMarketContent()}
      {activeTab === 'rent-roll' && renderRentRollContent()}
    </>
  );
}
