'use client';

import React, { useState, useEffect } from 'react';
import {
  LuFamily,
  LotProduct,
  ResSpec,
  ComSpec,
  ProjectTypeSelection,
  FAMILY_COLORS,
} from './LandUsePicker';

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

function unwrapResults<T>(data: T[] | { results: T[] }): T[] {
  if (Array.isArray(data)) return data;
  if (data && 'results' in data) return data.results;
  return [];
}

interface DetailColumnProps {
  typeId: number | null;
  family: LuFamily | null;
  allTypeSelections: ProjectTypeSelection[];
  onToggleProduct: (projectLandUseId: number, productId: number, isActive: boolean) => void;
}

export default function DetailColumn({
  typeId,
  family,
  allTypeSelections,
  onToggleProduct,
}: DetailColumnProps) {
  const [resSpec, setResSpec] = useState<ResSpec | null>(null);
  const [comSpec, setComSpec] = useState<ComSpec | null>(null);
  const [products, setProducts] = useState<LotProduct[]>([]);
  const [loading, setLoading] = useState(false);

  // Load type details when typeId changes
  useEffect(() => {
    if (!typeId) {
      setResSpec(null);
      setComSpec(null);
      setProducts([]);
      return;
    }

    setLoading(true);

    const fetchAll = async () => {
      try {
        const authHeaders = getAuthHeaders();
        // Fetch res spec, com spec, and products in parallel
        const [resSpecRes, comSpecRes, productsRes] = await Promise.all([
          fetch(`${DJANGO}/api/landuse/res-specs/?type_id=${typeId}`, { headers: authHeaders }).then(r => r.json()).catch(() => []),
          fetch(`${DJANGO}/api/landuse/com-specs/?type_id=${typeId}`, { headers: authHeaders }).then(r => r.json()).catch(() => []),
          fetch(`${DJANGO}/api/landuse/products/?type_id=${typeId}`, { headers: authHeaders }).then(r => r.json()).catch(() => []),
        ]);

        const resList = unwrapResults<ResSpec>(resSpecRes);
        const comList = unwrapResults<ComSpec>(comSpecRes);
        const prodList = unwrapResults<LotProduct>(productsRes);

        setResSpec(resList.length > 0 ? resList[0] : null);
        setComSpec(comList.length > 0 ? comList[0] : null);
        setProducts(prodList);
      } catch (err) {
        console.error('Failed to load type details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [typeId]);

  if (!typeId || !family) {
    return (
      <div className="lup-col lup-col-detail">
        <div className="lup-col-header">
          <span className="lup-col-title">Details</span>
        </div>
        <div className="lup-col-empty">
          Select a type to view development standards and products
        </div>
      </div>
    );
  }

  const familyColor = FAMILY_COLORS[family.code] || 'var(--cui-secondary)';
  const isResidential = ['RES', 'MX'].includes(family.code);
  const isCommercial = ['COM', 'IND', 'OFF', 'RET'].includes(family.code);

  // Find project selection for this type
  const typeSel = allTypeSelections.find(t => t.type_id === typeId);
  const isTypeActive = typeSel?.is_active ?? false;

  // Build product selection lookup
  const productSelMap = new Map<number, { pluProductId: number; isActive: boolean }>();
  if (typeSel) {
    for (const ps of typeSel.product_selections) {
      productSelMap.set(ps.product_id, {
        pluProductId: ps.project_land_use_product_id,
        isActive: ps.is_active,
      });
    }
  }

  return (
    <div className="lup-col lup-col-detail">
      <div className="lup-col-header">
        <span className="lup-col-title">
          {typeSel?.type_name || 'Type Details'}
        </span>
        {typeSel && (
          <span
            className="lup-detail-badge"
            style={{ backgroundColor: familyColor }}
          >
            {typeSel.type_code}
          </span>
        )}
      </div>
      <div className="lup-col-body">
        {loading ? (
          <div className="lup-col-loading">Loading details...</div>
        ) : (
          <>
            {/* Development Standards */}
            {(isResidential && resSpec) && (
              <div className="lup-detail-section">
                <h4 className="lup-detail-section-title">Residential Standards</h4>
                <div className="lup-spec-grid">
                  <SpecRow label="Density (DU/AC)" value={formatRange(resSpec.dua_min, resSpec.dua_max)} />
                  <SpecRow label="Min Lot Width" value={formatFt(resSpec.lot_w_min_ft)} />
                  <SpecRow label="Min Lot Depth" value={formatFt(resSpec.lot_d_min_ft)} />
                  <SpecRow label="Min Lot Area" value={formatSf(resSpec.lot_area_min_sf)} />
                  <SpecRow label="Max Height" value={formatFt(resSpec.hgt_max_ft)} />
                  <SpecRow label="Max Coverage" value={formatPct(resSpec.cov_max_pct)} />
                  <SpecRow label="Min Open Space" value={formatPct(resSpec.os_min_pct)} />
                  <SpecRow label="Parking / Unit" value={formatNum(resSpec.pk_per_unit)} />
                  <SpecRow label="Setbacks (F/S/C/R)" value={formatSetbacks(resSpec.sb_front_ft, resSpec.sb_side_ft, resSpec.sb_corner_ft, resSpec.sb_rear_ft)} />
                </div>
              </div>
            )}

            {(isCommercial && comSpec) && (
              <div className="lup-detail-section">
                <h4 className="lup-detail-section-title">Commercial Standards</h4>
                <div className="lup-spec-grid">
                  <SpecRow label="FAR" value={formatRange(comSpec.far_min, comSpec.far_max)} />
                  <SpecRow label="Max Coverage" value={formatPct(comSpec.cov_max_pct)} />
                  <SpecRow label="Max Height" value={formatFt(comSpec.hgt_max_ft)} />
                  <SpecRow label="Parking / KSF" value={formatNum(comSpec.pk_per_ksf)} />
                  <SpecRow label="Min Open Space" value={formatPct(comSpec.os_min_pct)} />
                  <SpecRow label="Setbacks (F/S/C/R)" value={formatSetbacks(comSpec.sb_front_ft, comSpec.sb_side_ft, comSpec.sb_corner_ft, comSpec.sb_rear_ft)} />
                </div>
              </div>
            )}

            {!resSpec && !comSpec && (
              <div className="lup-detail-section">
                <div className="lup-spec-empty">No development standards defined for this type.</div>
              </div>
            )}

            {/* Products */}
            <div className="lup-detail-section">
              <h4 className="lup-detail-section-title">
                Lot Products
                {products.length > 0 && <span className="lup-detail-count">{products.length}</span>}
              </h4>
              {!isTypeActive && products.length > 0 && (
                <div className="lup-products-notice">
                  Activate this type to select products
                </div>
              )}
              {products.length === 0 ? (
                <div className="lup-spec-empty">No lot products defined for this type.</div>
              ) : (
                <div className="lup-product-chips">
                  {products.map(prod => {
                    const sel = productSelMap.get(prod.product_id);
                    const isProductActive = sel?.isActive ?? false;

                    return (
                      <button
                        key={prod.product_id}
                        className={`lup-product-chip${isProductActive ? ' active' : ''}`}
                        disabled={!isTypeActive || !typeSel}
                        onClick={() => {
                          if (!typeSel) return;
                          onToggleProduct(
                            typeSel.project_land_use_id,
                            prod.product_id,
                            !isProductActive
                          );
                        }}
                      >
                        <span className="lup-chip-code">{prod.code}</span>
                        {prod.lot_w_ft && prod.lot_d_ft && (
                          <span className="lup-chip-dims">
                            {prod.lot_w_ft}&apos; x {prod.lot_d_ft}&apos;
                          </span>
                        )}
                        {prod.lot_area_sf && (
                          <span className="lup-chip-area">
                            {Number(prod.lot_area_sf).toLocaleString()} sf
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Formatting Helpers ─────────────────────────── */

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="lup-spec-row">
      <span className="lup-spec-label">{label}</span>
      <span className="lup-spec-value">{value}</span>
    </div>
  );
}

function formatNum(v: number | null): string {
  if (v === null || v === undefined) return '—';
  return v.toLocaleString();
}

function formatFt(v: number | null): string {
  if (v === null || v === undefined) return '—';
  return `${v.toLocaleString()}'`;
}

function formatSf(v: number | null): string {
  if (v === null || v === undefined) return '—';
  return `${v.toLocaleString()} sf`;
}

function formatPct(v: number | null): string {
  if (v === null || v === undefined) return '—';
  return `${v}%`;
}

function formatRange(min: number | null, max: number | null): string {
  if (min === null && max === null) return '—';
  if (min !== null && max !== null) return `${min} – ${max}`;
  if (min !== null) return `${min}+`;
  return `≤ ${max}`;
}

function formatSetbacks(f: number | null, s: number | null, c: number | null, r: number | null): string {
  const parts = [f, s, c, r].map(v => v !== null ? `${v}'` : '—');
  return parts.join(' / ');
}
