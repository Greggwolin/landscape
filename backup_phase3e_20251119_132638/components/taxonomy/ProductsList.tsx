'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/toast';
import CIcon from '@coreui/icons-react';
import { cilPencil, cilTrash } from '@coreui/icons';

interface Type {
  type_id: number;
  code: string;
  name: string;
  family_id: number;
  active: boolean;
  product_count: number;
}

interface Product {
  product_id: number;
  code: string;
  lot_w_ft: number;
  lot_d_ft: number;
  lot_area_sf: number;
}

interface ProductsListProps {
  type: Type;
  onClose: () => void;
}

export default function ProductsList({ type, onClose }: ProductsListProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [efficiencyLoading, setEfficiencyLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ code: '', lot_w_ft: '', lot_d_ft: '' });
  const [planningEfficiency, setPlanningEfficiency] = useState<number | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadProducts(type.type_id);
  }, [type]);

  useEffect(() => {
    const loadEfficiency = async () => {
      setEfficiencyLoading(true);
      try {
        const response = await fetch('/api/planning-standards');
        if (response.ok) {
          const data = await response.json();
          const value = data?.standard?.default_planning_efficiency;
          if (typeof value === 'number') {
            setPlanningEfficiency(value);
          } else {
            setPlanningEfficiency(0.75);
          }
        } else {
          setPlanningEfficiency(0.75);
        }
      } catch (error) {
        console.error('Failed to load planning efficiency', error);
        setPlanningEfficiency(0.75);
      } finally {
        setEfficiencyLoading(false);
      }
    };

    void loadEfficiency();
  }, []);

  const loadProducts = async (typeId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/taxonomy/products?type_id=${typeId}`);
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      code: product.code,
      lot_w_ft: product.lot_w_ft.toString(),
      lot_d_ft: product.lot_d_ft.toString()
    });
    setShowModal(true);
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setFormData({ code: '', lot_w_ft: '', lot_d_ft: '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const url = editingProduct
        ? `/api/taxonomy/products/${editingProduct.product_id}`
        : `/api/taxonomy/products`;

      const response = await fetch(url, {
        method: editingProduct ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formData.code,
          lot_w_ft: parseInt(formData.lot_w_ft),
          lot_d_ft: parseInt(formData.lot_d_ft),
          linked_type_ids: [type.type_id]
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save product');
      }

      showToast(editingProduct ? 'Product updated successfully' : 'Product created successfully', 'success');
      setShowModal(false);
      loadProducts(type.type_id);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete "${product.code}"?`)) return;

    try {
      const response = await fetch(`/api/taxonomy/products/${product.product_id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete product');
      }

      showToast('Product deleted successfully', 'success');
      loadProducts(type.type_id);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const computeDensity = (product: { lot_area_sf: number }, efficiency: number | null) => {
    if (!efficiency || !product.lot_area_sf || product.lot_area_sf <= 0) return null;
    const density = (43560 / product.lot_area_sf) * efficiency;
    if (!Number.isFinite(density)) return null;
    return Math.round(density * 100) / 100;
  };

  return (
    <div className="products-panel">
      {/* Header */}
      <div className="products-header">
        <div>
          <div className="products-title">Products ({products.length})</div>
          <div className="products-subtitle">{type.name}</div>
        </div>
        <button className="btn-icon" onClick={onClose}>×</button>
      </div>

      {/* Add Product Button */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--cui-border-color)' }}>
        <button
          onClick={handleAddNew}
          style={{
            width: '100%',
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'var(--cui-primary)',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          + Add Product
        </button>
      </div>

      {/* Products List */}
      <div className="products-list">
        {loading ? (
          <div className="loading">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <div className="empty-state-text">No products defined for this type</div>
            <button
              onClick={handleAddNew}
              style={{
                marginTop: '12px',
                padding: '8px 16px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: 'var(--cui-primary)',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              + Add Product
            </button>
          </div>
        ) : (
          products.map((product) => {
            const density = computeDensity(product, planningEfficiency);
            return (
              <div key={product.product_id} className="product-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div>
                    <span className="product-code">{product.code}</span>
                    <span className="product-size" style={{ marginLeft: '8px', color: 'var(--cui-secondary-color)' }}>
                      {product.lot_area_sf.toLocaleString()} SF
                    </span>
                  </div>
                  <div className="text-xs" style={{ color: 'var(--cui-secondary-color)', marginTop: '4px' }}>
                    Density:{' '}
                    {efficiencyLoading
                      ? 'Loading…'
                      : density != null
                        ? `${density} u/ac`
                        : '—'}{' '}
                    {planningEfficiency != null && !efficiencyLoading && (
                      <span style={{ color: 'var(--cui-body-color)' }}>
                        (eff {Math.round(planningEfficiency * 100)}%)
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => handleEdit(product)} title="Edit" className="btn-edit">
                    <CIcon icon={cilPencil} size="sm" />
                  </button>
                  <button onClick={() => handleDelete(product)} title="Delete" className="btn-edit">
                    <CIcon icon={cilTrash} size="sm" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Edit/Add Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100
        }}>
          <div style={{
            backgroundColor: 'var(--cui-card-bg)',
            padding: '24px',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '500px'
          }}>
            <h3 style={{ marginTop: 0, color: 'var(--cui-body-color)' }}>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, color: 'var(--cui-secondary-color)' }}>Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid var(--cui-border-color)',
                    backgroundColor: 'var(--cui-body-bg)',
                    color: 'var(--cui-body-color)'
                  }}
                  placeholder="e.g., 50x100"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, color: 'var(--cui-secondary-color)' }}>Width (ft)</label>
                <input
                  type="number"
                  value={formData.lot_w_ft}
                  onChange={(e) => setFormData({ ...formData, lot_w_ft: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid var(--cui-border-color)',
                    backgroundColor: 'var(--cui-body-bg)',
                    color: 'var(--cui-body-color)'
                  }}
                  placeholder="e.g., 50"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, color: 'var(--cui-secondary-color)' }}>Depth (ft)</label>
                <input
                  type="number"
                  value={formData.lot_d_ft}
                  onChange={(e) => setFormData({ ...formData, lot_d_ft: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid var(--cui-border-color)',
                    backgroundColor: 'var(--cui-body-bg)',
                    color: 'var(--cui-body-color)'
                  }}
                  placeholder="e.g., 100"
                />
              </div>
              {formData.lot_w_ft && formData.lot_d_ft && (() => {
                const width = Number(formData.lot_w_ft)
                const depth = Number(formData.lot_d_ft)
                const area = Number.isFinite(width) && Number.isFinite(depth) && width > 0 && depth > 0
                  ? width * depth
                  : null
                if (!area) return null
                const projectedDensity = planningEfficiency != null
                  ? (() => {
                      const density = (43560 / area) * planningEfficiency
                      return Number.isFinite(density) ? Math.round(density * 100) / 100 : null
                    })()
                  : null

                return (
                  <div style={{
                    padding: '12px',
                    backgroundColor: 'var(--cui-tertiary-bg)',
                    borderRadius: '4px',
                    fontSize: '14px',
                    color: 'var(--cui-body-color)'
                  }}>
                    <div>
                      <strong>Calculated Area:</strong> {area.toLocaleString()} SF
                    </div>
                    <div style={{ marginTop: '6px' }}>
                      <strong>Projected Density:</strong> {projectedDensity != null ? `${projectedDensity} u/ac` : '—'}
                    </div>
                  </div>
                )
              })()}
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: '1px solid var(--cui-border-color)',
                  backgroundColor: 'var(--cui-body-bg)',
                  color: 'var(--cui-body-color)',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: 'var(--cui-primary)',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
