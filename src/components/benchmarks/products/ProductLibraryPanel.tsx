'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { LotProduct } from '@/types/landuse';

interface PlanningStandard {
  standard_id: number;
  standard_name: string;
  default_planning_efficiency: number;
  default_street_row_pct?: number | null;
  default_park_dedication_pct?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface LotTypeOption {
  type_id: number;
  name: string;
}

type ProductModalState =
  | { mode: 'create' }
  | { mode: 'edit'; product: LotProduct };

interface ProductFormState {
  code: string;
  lot_w_ft: string;
  lot_d_ft: string;
  type_id: number | null;
  is_active: boolean;
}

const DEFAULT_PRODUCT_FORM: ProductFormState = {
  code: '',
  lot_w_ft: '',
  lot_d_ft: '',
  type_id: null,
  is_active: true
};

function toNumber(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchJSON<T = any>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const text = await response.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && (payload.error || payload.detail)) ||
      response.statusText;
    throw new Error(typeof message === 'string' ? message : 'Request failed');
  }
  return payload;
}

export default function ProductLibraryPanel() {
  const [products, setProducts] = useState<LotProduct[]>([]);
  const [types, setTypes] = useState<LotTypeOption[]>([]);
  const [planningStandard, setPlanningStandard] = useState<PlanningStandard | null>(null);
  const [planningForm, setPlanningForm] = useState({
    default_planning_efficiency: '',
    default_street_row_pct: '',
    default_park_dedication_pct: ''
  });
  const [productModal, setProductModal] = useState<ProductModalState | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState>(DEFAULT_PRODUCT_FORM);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingPlanning, setSavingPlanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planningError, setPlanningError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [productData, typeData, planningData] = await Promise.all([
          fetchJSON<LotProduct[]>('/api/products?active_only=false'),
          fetchJSON<any[]>('/api/land-use/types'),
          fetchJSON<{ standard: PlanningStandard | null }>('/api/planning-standards')
        ]);

        setProducts(productData ?? []);

        const typeOptions: LotTypeOption[] = (typeData ?? []).map((type) => ({
          type_id: type.type_id,
          name: type.name || type.code || `Type ${type.type_id}`
        }));
        setTypes(typeOptions);

        const standard = planningData?.standard ?? null;
        if (standard) {
          setPlanningStandard(standard);
          setPlanningForm({
            default_planning_efficiency: standard.default_planning_efficiency?.toString() ?? '',
            default_street_row_pct: standard.default_street_row_pct?.toString() ?? '',
            default_park_dedication_pct: standard.default_park_dedication_pct?.toString() ?? ''
          });
        }
      } catch (err) {
        console.error('Failed to load product library data', err);
        setError(err instanceof Error ? err.message : 'Failed to load product library data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredProducts = useMemo(() => {
    let list = products;
    if (activeOnly) {
      list = list.filter((product) => product.is_active);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter((product) =>
        [product.code, product.type_name]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(term))
      );
    }
    return list.sort((a, b) => a.code.localeCompare(b.code));
  }, [products, activeOnly, searchTerm]);

  function openCreateModal() {
    setProductForm(DEFAULT_PRODUCT_FORM);
    setProductModal({ mode: 'create' });
  }

  function openEditModal(product: LotProduct) {
    setProductForm({
      code: product.code,
      lot_w_ft: product.lot_w_ft?.toString() ?? '',
      lot_d_ft: product.lot_d_ft?.toString() ?? '',
      type_id: product.type_id ?? null,
      is_active: product.is_active
    });
    setProductModal({ mode: 'edit', product });
  }

  function closeProductModal() {
    setProductModal(null);
    setProductForm(DEFAULT_PRODUCT_FORM);
  }

  async function refreshProducts() {
    try {
      const refreshed = await fetchJSON<LotProduct[]>('/api/products?active_only=false');
      setProducts(refreshed ?? []);
    } catch (err) {
      console.error('Failed to refresh product list', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh product list');
    }
  }

  async function handleSaveProduct() {
    if (!productForm.code.trim()) {
      setError('Product code is required.');
      return;
    }
    if (!productForm.lot_w_ft || !productForm.lot_d_ft) {
      setError('Lot width and depth are required.');
      return;
    }

    const payload: Record<string, any> = {
      code: productForm.code.trim(),
      lot_w_ft: Number(productForm.lot_w_ft),
      lot_d_ft: Number(productForm.lot_d_ft),
      type_id: productForm.type_id,
      is_active: productForm.is_active
    };

    setSavingProduct(true);
    try {
      if (productModal?.mode === 'edit') {
        await fetchJSON(`/api/products/${productModal.product.product_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        await fetchJSON('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      await refreshProducts();
      closeProductModal();
    } catch (err) {
      console.error('Failed to save product', err);
      setError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setSavingProduct(false);
    }
  }

  async function handleDeleteProduct(product: LotProduct) {
    if (!confirm(`Archive product ${product.code}?`)) return;
    try {
      await fetchJSON(`/api/products/${product.product_id}`, { method: 'DELETE' });
      await refreshProducts();
    } catch (err) {
      console.error('Failed to delete product', err);
      setError(err instanceof Error ? err.message : 'Failed to delete product');
    }
  }

  async function handleSavePlanning() {
    if (!planningStandard) return;
    const efficiency = toNumber(planningForm.default_planning_efficiency);
    if (efficiency === null || efficiency <= 0 || efficiency > 1.5) {
      setPlanningError('Planning efficiency must be between 0 and 1.5.');
      return;
    }

    const payload = {
      default_planning_efficiency: efficiency,
      default_street_row_pct: toNumber(planningForm.default_street_row_pct),
      default_park_dedication_pct: toNumber(planningForm.default_park_dedication_pct)
    };

    setPlanningError(null);
    setSavingPlanning(true);
    try {
      const updated = await fetchJSON<{ standard: PlanningStandard }>('/api/planning-standards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (updated.standard) {
        setPlanningStandard(updated.standard);
        setPlanningForm({
          default_planning_efficiency:
            updated.standard.default_planning_efficiency?.toString() ?? '',
          default_street_row_pct: updated.standard.default_street_row_pct?.toString() ?? '',
          default_park_dedication_pct: updated.standard.default_park_dedication_pct?.toString() ?? ''
        });
      }
    } catch (err) {
      console.error('Failed to update planning standards', err);
      setPlanningError(err instanceof Error ? err.message : 'Failed to update planning standards');
    } finally {
      setSavingPlanning(false);
    }
  }

  return (
    <div style={{ color: 'var(--cui-body-color)' }}>
      {/* Breadcrumb Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b" style={{ borderColor: 'var(--cui-border-color)', backgroundColor: 'var(--cui-card-bg)' }}>
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
          <a href="/preferences" style={{ color: 'var(--cui-primary)', textDecoration: 'none' }}>Global Preferences</a>
          <span style={{ color: 'var(--cui-border-color)' }}>/</span>
          <span>Product Library</span>
        </div>
      </div>

      {/* Title Header */}
      <header className="border-b px-6 py-4" style={{ borderColor: 'var(--cui-border-color)', backgroundColor: 'var(--cui-card-bg)' }}>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--cui-body-color)' }}>Product Library & Planning Standards</h1>
      </header>

      <main className="grid gap-6 px-6 py-6 lg:grid-cols-[2fr_1fr]" style={{ backgroundColor: 'var(--cui-card-bg)' }}>
        <section className="rounded-lg border" style={{ borderColor: 'var(--cui-border-color)', backgroundColor: 'var(--cui-body-bg)' }}>
          <header className="flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4" style={{ borderColor: 'var(--cui-border-color)' }}>
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--cui-body-color)' }}>Lot Products</h2>
              <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={activeOnly}
                    onChange={(event) => setActiveOnly(event.target.checked)}
                    className="h-4 w-4 rounded border focus:ring-emerald-400"
                    style={{ borderColor: 'var(--cui-border-color)', backgroundColor: 'var(--cui-body-bg)' }}
                  />
                  Show active only
                </label>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search products…"
                  className="w-48 rounded border px-3 py-1.5 text-xs focus:outline-none focus:ring-1"
                  style={{
                    borderColor: 'var(--cui-border-color)',
                    backgroundColor: 'var(--cui-body-bg)',
                    color: 'var(--cui-body-color)'
                  }}
                />
              </div>
            </div>
            <button
              onClick={openCreateModal}
              className="rounded px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2"
              style={{ backgroundColor: 'var(--cui-primary)', color: 'white' }}
            >
              Add Product
            </button>
          </header>

          {error && (
            <div className="mx-5 mt-4 rounded border px-4 py-2 text-sm" style={{ borderColor: 'var(--cui-danger)', backgroundColor: 'var(--cui-danger-bg)', color: 'var(--cui-danger)' }}>
              {error}
            </div>
          )}

          <div className="overflow-x-auto px-5 py-4">
            {loading ? (
              <div className="py-6 text-center text-sm text-text-secondary">Loading products…</div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded border border-dashed border-line-strong px-4 py-8 text-center text-sm text-text-secondary">
                No products match your filters. Add a new product to get started.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
                <thead className="bg-surface-card/70 text-xs uppercase tracking-wide text-text-secondary">
                  <tr>
                    <th className="px-3 py-2 font-medium">Code</th>
                    <th className="px-3 py-2 font-medium">Width (ft)</th>
                    <th className="px-3 py-2 font-medium">Depth (ft)</th>
                    <th className="px-3 py-2 font-medium">Area (sf)</th>
                    <th className="px-3 py-2 font-medium">Density / Acre</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredProducts.map((product) => (
                    <tr key={product.product_id} className="hover:bg-surface-card/70">
                      <td className="px-3 py-2 font-medium text-white">{product.code}</td>
                      <td className="px-3 py-2 text-text-inverse">{product.lot_w_ft ?? '—'}</td>
                      <td className="px-3 py-2 text-text-inverse">{product.lot_d_ft ?? '—'}</td>
                      <td className="px-3 py-2 text-text-inverse">{product.lot_area_sf ?? '—'}</td>
                      <td className="px-3 py-2 text-text-inverse">
                        {product.density_per_acre ? `${product.density_per_acre}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-text-secondary">{product.type_name ?? '—'}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                            product.is_active
                              ? 'bg-brand-accent/20 text-emerald-300'
                              : 'bg-surface-card text-text-secondary'
                          }`}
                        >
                          {product.is_active ? 'Active' : 'Archived'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(product)}
                            className="rounded border border-line-strong px-3 py-1 text-xs font-medium text-text-inverse hover:bg-surface-card focus:outline-none focus:ring-1 focus:ring-emerald-400"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product)}
                            className="rounded border border-red-500 px-3 py-1 text-xs font-medium text-red-300 hover:bg-chip-error/10 focus:outline-none focus:ring-1 focus:ring-red-400"
                          >
                            Archive
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-lg border border-line-strong bg-surface-card/60 px-5 py-4">
            <h2 className="text-lg font-semibold text-white">Planning Standards</h2>
            <p className="mb-4 text-xs text-text-secondary">
              Global defaults for density calculations and ROW / park allocations.
            </p>

            {planningError && (
              <div className="mb-3 rounded border border-red-500 bg-red-900/40 px-3 py-2 text-xs text-red-200">
                {planningError}
              </div>
            )}

            <div className="space-y-3 text-sm text-text-inverse">
              <label className="flex flex-col gap-1">
                Planning Efficiency
                <input
                  type="number"
                  step="0.01"
                  value={planningForm.default_planning_efficiency}
                  onChange={(event) =>
                    setPlanningForm((prev) => ({
                      ...prev,
                      default_planning_efficiency: event.target.value
                    }))
                  }
                  className="rounded border border-line-strong bg-surface-card px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
              </label>
              <label className="flex flex-col gap-1">
                Street ROW %
                <input
                  type="number"
                  step="0.01"
                  value={planningForm.default_street_row_pct}
                  onChange={(event) =>
                    setPlanningForm((prev) => ({
                      ...prev,
                      default_street_row_pct: event.target.value
                    }))
                  }
                  className="rounded border border-line-strong bg-surface-card px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
              </label>
              <label className="flex flex-col gap-1">
                Park Dedication %
                <input
                  type="number"
                  step="0.01"
                  value={planningForm.default_park_dedication_pct}
                  onChange={(event) =>
                    setPlanningForm((prev) => ({
                      ...prev,
                      default_park_dedication_pct: event.target.value
                    }))
                  }
                  className="rounded border border-line-strong bg-surface-card px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
              </label>
            </div>

            <button
              onClick={handleSavePlanning}
              disabled={savingPlanning}
              className="mt-4 w-full rounded bg-brand-accent px-4 py-2 text-sm font-semibold text-text-primary hover:bg-brand-accent/85 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 disabled:cursor-not-allowed disabled:bg-brand-accent/60"
            >
              {savingPlanning ? 'Saving…' : 'Save Planning Defaults'}
            </button>
            {planningStandard && (
              <p className="mt-3 text-xs text-text-secondary">
                Last updated: {new Date(planningStandard.updated_at).toLocaleString()}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-line-strong bg-surface-card/60 px-5 py-4">
            <h2 className="text-lg font-semibold text-white">Density Guidance</h2>
            <p className="text-sm text-text-secondary">
              Density per acre is calculated with the global planning efficiency:
            </p>
            <p className="mt-3 rounded border border-line-strong bg-surface-card px-3 py-2 text-sm text-text-inverse">
              <span className="font-medium text-white">Density/Acre</span> = (43,560 / Lot SF) ×
              Planning Efficiency
            </p>
            <p className="mt-2 text-xs text-text-secondary">
              Update the global defaults to instantly refresh project density assumptions.
            </p>
          </div>
        </section>
      </main>

      {productModal && (
        <ProductModal
          mode={productModal.mode}
          product={productModal.mode === 'edit' ? productModal.product : undefined}
          form={productForm}
          setForm={setProductForm}
          types={types}
          onClose={closeProductModal}
          onSave={handleSaveProduct}
          saving={savingProduct}
        />
      )}
    </div>
  );
}

interface ProductModalProps {
  mode: 'create' | 'edit';
  product?: LotProduct;
  form: ProductFormState;
  setForm: React.Dispatch<React.SetStateAction<ProductFormState>>;
  types: LotTypeOption[];
  onClose: () => void;
  onSave: () => Promise<void>;
  saving: boolean;
}

function ProductModal({
  mode,
  product,
  form,
  setForm,
  types,
  onClose,
  onSave,
  saving
}: ProductModalProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-surface-card/80 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-lg border border-line-strong bg-surface-card shadow-xl">
        <header className="flex items-center justify-between border-b border-line-strong px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {mode === 'create' ? 'Add Lot Product' : `Edit ${product?.code}`}
            </h2>
            <p className="text-xs text-text-secondary">
              Lot dimensions feed density calculations and planning defaults.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-sm text-text-secondary hover:text-white focus:outline-none"
          >
            Close
          </button>
        </header>

        <div className="px-6 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              Product Code
              <input
                value={form.code}
                onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                className="rounded border border-line-strong bg-surface-card px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              Type
              <select
                value={form.type_id ?? ''}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    type_id: event.target.value ? Number(event.target.value) : null
                  }))
                }
                className="rounded border border-line-strong bg-surface-card px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
              >
                <option value="">None</option>
                {types.map((type) => (
                  <option key={type.type_id} value={type.type_id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              Lot Width (ft)
              <input
                type="number"
                value={form.lot_w_ft}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, lot_w_ft: event.target.value }))
                }
                className="rounded border border-line-strong bg-surface-card px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                min={0}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              Lot Depth (ft)
              <input
                type="number"
                value={form.lot_d_ft}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, lot_d_ft: event.target.value }))
                }
                className="rounded border border-line-strong bg-surface-card px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                min={0}
              />
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm text-text-secondary sm:col-span-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, is_active: event.target.checked }))
                }
                className="h-4 w-4 rounded border-line-strong bg-surface-card text-emerald-500 focus:ring-emerald-400"
              />
              Active in library
            </label>
          </div>
        </div>

        <footer className="flex items-center justify-between border-t border-line-strong px-6 py-4">
          <span className="text-xs text-text-secondary">
            Lot area is calculated automatically from width × depth.
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded border border-line-strong px-4 py-2 text-sm text-text-inverse hover:bg-surface-card focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="rounded bg-brand-accent px-4 py-2 text-sm font-semibold text-text-primary hover:bg-brand-accent/85 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 disabled:cursor-not-allowed disabled:bg-brand-accent/60"
            >
              {saving ? 'Saving…' : mode === 'create' ? 'Create Product' : 'Save Changes'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
