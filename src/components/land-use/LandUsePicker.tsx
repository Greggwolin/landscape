'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import FamilyColumn from './FamilyColumn';
import TypeColumn from './TypeColumn';
import DetailColumn from './DetailColumn';
import SummaryBar from './SummaryBar';
import './land-use-picker.css';

/* ─── Types ─────────────────────────────────────────── */

export interface LuFamily {
  family_id: number;
  code: string;
  name: string;
  active: boolean;
  type_count: number;
}

export interface LuType {
  type_id: number;
  family_id: number;
  code: string;
  name: string;
  ord: number | null;
  active: boolean;
  product_count: number;
}

export interface ProductSelection {
  project_land_use_product_id: number;
  product_id: number;
  product_code: string;
  lot_w_ft: number | null;
  lot_d_ft: number | null;
  lot_area_sf: number | null;
  is_active: boolean;
}

export interface ProjectTypeSelection {
  project_land_use_id: number;
  project_id: number;
  family_id: number;
  family_name: string;
  family_code: string;
  type_id: number;
  type_name: string;
  type_code: string;
  is_active: boolean;
  parcel_count?: number;
  product_selections: ProductSelection[];
}

export interface ProjectSelectionsResponse {
  project_id: number;
  families: {
    family_id: number;
    family_name: string;
    family_code: string;
    types: ProjectTypeSelection[];
  }[];
  total_types: number;
  parcel_counts: Record<string, number>;
}

export interface LotProduct {
  product_id: number;
  code: string;
  lot_w_ft: number | null;
  lot_d_ft: number | null;
  lot_area_sf: number | null;
  type_id: number | null;
  is_active: boolean;
}

export interface ResSpec {
  res_spec_id: number;
  type_id: number;
  dua_min: number | null;
  dua_max: number | null;
  lot_w_min_ft: number | null;
  lot_d_min_ft: number | null;
  lot_area_min_sf: number | null;
  sb_front_ft: number | null;
  sb_side_ft: number | null;
  sb_corner_ft: number | null;
  sb_rear_ft: number | null;
  hgt_max_ft: number | null;
  cov_max_pct: number | null;
  os_min_pct: number | null;
  pk_per_unit: number | null;
}

export interface ComSpec {
  com_spec_id: number;
  type_id: number;
  far_min: number | null;
  far_max: number | null;
  cov_max_pct: number | null;
  pk_per_ksf: number | null;
  hgt_max_ft: number | null;
  sb_front_ft: number | null;
  sb_side_ft: number | null;
  sb_corner_ft: number | null;
  sb_rear_ft: number | null;
  os_min_pct: number | null;
}

/* ─── Family Color Map ──────────────────────────────── */

export const FAMILY_COLORS: Record<string, string> = {
  RES:  'var(--cui-primary)',       // blue
  COM:  'var(--cui-purple, #7c3aed)',
  IND:  'var(--cui-warning)',       // amber
  CA:   'var(--cui-info)',          // teal
  PUB:  'var(--cui-danger)',        // red
  OS:   'var(--cui-success)',       // green
  MX:   'var(--cui-pink, #ec4899)',
  INST: 'var(--cui-secondary)',     // slate
  OTHR: 'var(--cui-dark)',          // dark gray
  TST2: 'var(--cui-dark)',
};

/* ─── API Helpers ───────────────────────────────────── */

const DJANGO = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('auth_tokens');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.access) headers.Authorization = `Bearer ${parsed.access}`;
      }
    } catch { /* ignore */ }
  }
  return headers;
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${DJANGO}${path}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json();
}

async function apiPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${DJANGO}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API POST ${path}: ${res.status}`);
  return res.json();
}

/** Unwrap DRF paginated response { count, results } or return raw array. */
function unwrapResults<T>(data: T[] | { results: T[] }): T[] {
  if (Array.isArray(data)) return data;
  if (data && 'results' in data) return data.results;
  return [];
}

/* ─── Main Component ────────────────────────────────── */

interface Props {
  projectId: number;
}

export default function LandUsePicker({ projectId }: Props) {
  // Data state
  const [families, setFamilies] = useState<LuFamily[]>([]);
  const [projectSelections, setProjectSelections] = useState<ProjectSelectionsResponse | null>(null);
  const [parcelCounts, setParcelCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // UI state
  const [selectedFamilyId, setSelectedFamilyId] = useState<number | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);

  // Load families
  useEffect(() => {
    apiFetch<LuFamily[] | { results: LuFamily[] }>('/api/landuse/families/')
      .then(data => {
        const list = unwrapResults(data);
        setFamilies(list);
        if (list.length > 0 && !selectedFamilyId) {
          setSelectedFamilyId(list[0].family_id);
        }
      })
      .catch(err => console.error('Failed to load families:', err))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load project selections
  const loadProjectSelections = useCallback(() => {
    apiFetch<ProjectSelectionsResponse>(`/api/landuse/project-land-use/by_project/${projectId}/`)
      .then(data => {
        setProjectSelections(data);
        setParcelCounts(data.parcel_counts || {});
      })
      .catch(err => console.error('Failed to load project selections:', err));
  }, [projectId]);

  useEffect(() => { loadProjectSelections(); }, [loadProjectSelections]);

  // Compute selection counts per family
  const familySelectionCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    if (!projectSelections) return counts;
    for (const fam of projectSelections.families) {
      counts[fam.family_id] = fam.types.filter(t => t.is_active).length;
    }
    return counts;
  }, [projectSelections]);

  // All project type selections flat
  const allTypeSelections = useMemo(() => {
    if (!projectSelections) return [];
    return projectSelections.families.flatMap(f => f.types);
  }, [projectSelections]);

  // Toggle type on/off
  const handleToggleType = useCallback(async (typeId: number, familyId: number, isActive: boolean) => {
    try {
      await apiPost('/api/landuse/project-land-use/toggle/', {
        project_id: projectId,
        type_id: typeId,
        family_id: familyId,
        is_active: isActive,
      });
      loadProjectSelections();
    } catch (err) {
      console.error('Failed to toggle type:', err);
    }
  }, [projectId, loadProjectSelections]);

  // Toggle product on/off
  const handleToggleProduct = useCallback(async (projectLandUseId: number, productId: number, isActive: boolean) => {
    try {
      await apiPost('/api/landuse/project-land-use/toggle-product/', {
        project_land_use_id: projectLandUseId,
        product_id: productId,
        is_active: isActive,
      });
      loadProjectSelections();
    } catch (err) {
      console.error('Failed to toggle product:', err);
    }
  }, [loadProjectSelections]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const selectedTypes = allTypeSelections.filter(t => t.is_active).length;
    const selectedProducts = allTypeSelections
      .filter(t => t.is_active)
      .reduce((sum, t) => sum + t.product_selections.filter(p => p.is_active).length, 0);
    const totalParcels = Object.values(parcelCounts).reduce((a, b) => a + b, 0);
    const coveredParcels = allTypeSelections
      .filter(t => t.is_active)
      .reduce((sum, t) => sum + (parcelCounts[t.type_code] || 0), 0);
    return { selectedTypes, selectedProducts, totalParcels, coveredParcels };
  }, [allTypeSelections, parcelCounts]);

  // Flat list of selected products with type context
  const selectedProductsList = useMemo(() => {
    const list: { typeName: string; typeCode: string; familyCode: string; product: ProductSelection }[] = [];
    for (const t of allTypeSelections) {
      if (!t.is_active) continue;
      for (const p of t.product_selections) {
        if (!p.is_active) continue;
        list.push({ typeName: t.type_name, typeCode: t.type_code, familyCode: t.family_code, product: p });
      }
    }
    return list.sort((a, b) => {
      if (a.typeCode !== b.typeCode) return a.typeCode.localeCompare(b.typeCode);
      return (parseFloat(String(a.product.lot_area_sf ?? 0))) - (parseFloat(String(b.product.lot_area_sf ?? 0)));
    });
  }, [allTypeSelections]);

  const selectedFamily = families.find(f => f.family_id === selectedFamilyId) || null;

  if (loading) {
    return (
      <div className="land-use-picker">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: 'var(--cui-secondary-color)' }}>
          Loading taxonomy...
        </div>
      </div>
    );
  }

  return (
    <div className="land-use-picker">
      {/* Header */}
      <div className="land-use-picker-header">
        <div>
          <h3 className="land-use-picker-title">Project Land Uses</h3>
          <span className="land-use-picker-subtitle">
            Select the land uses and products that apply to this project. These selections populate the dropdowns in the Parcels tab.
          </span>
        </div>
        <a
          href="/settings/taxonomy"
          className="land-use-edit-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          Edit Global Taxonomy
        </a>
      </div>

      {/* Coming soon banner */}
      <div className="land-use-banner">
        <strong>Coming Soon:</strong> Upload a PAD, zoning code, or development agreement and Landscaper
        will automatically identify permitted land uses and match them to the taxonomy.
      </div>

      {/* Three columns */}
      <div className="land-use-picker-columns">
        <FamilyColumn
          families={families}
          selectedFamilyId={selectedFamilyId}
          onSelectFamily={(id) => { setSelectedFamilyId(id); setSelectedTypeId(null); }}
          familySelectionCounts={familySelectionCounts}
        />
        <TypeColumn
          family={selectedFamily}
          selectedTypeId={selectedTypeId}
          onSelectType={setSelectedTypeId}
          allTypeSelections={allTypeSelections}
          parcelCounts={parcelCounts}
          onToggleType={handleToggleType}
        />
        <DetailColumn
          typeId={selectedTypeId}
          family={selectedFamily}
          allTypeSelections={allTypeSelections}
          onToggleProduct={handleToggleProduct}
        />
      </div>

      {/* Summary bar */}
      <SummaryBar
        selectedTypes={summaryStats.selectedTypes}
        selectedProducts={summaryStats.selectedProducts}
        coveredParcels={summaryStats.coveredParcels}
        totalParcels={summaryStats.totalParcels}
        productsList={selectedProductsList}
      />
    </div>
  );
}
