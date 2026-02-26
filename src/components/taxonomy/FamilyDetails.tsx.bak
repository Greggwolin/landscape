'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/toast';
import CIcon from '@coreui/icons-react';
import { cilPencil, cilTrash } from '@coreui/icons';

interface Family {
  family_id: number;
  code: string;
  name: string;
  active: boolean;
  notes: string | null;
  type_count: number;
  product_count: number;
}

interface Type {
  type_id: number;
  code: string;
  name: string;
  family_id: number;
  active: boolean;
  product_count: number;
}

interface FamilyDetailsProps {
  family: Family | null;
  selectedType: Type | null;
  onSelectType: (type: Type) => void;
  onRefresh: () => void;
}

export default function FamilyDetails({ family, selectedType, onSelectType, onRefresh }: FamilyDetailsProps) {
  const [types, setTypes] = useState<Type[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<Type | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '', notes: '', color: '#3b82f6' });
  const { showToast } = useToast();

  useEffect(() => {
    if (family) {
      loadTypes(family.family_id);
    }
  }, [family]);

  const loadTypes = async (familyId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/taxonomy/types?family_id=${familyId}`);
      const data = await response.json();
      // Sort by product count (descending), then alphabetically by name
      const sortedData = data.sort((a: Type, b: Type) => {
        if (b.product_count !== a.product_count) {
          return b.product_count - a.product_count;
        }
        return a.name.localeCompare(b.name);
      });
      setTypes(sortedData);
    } catch (error) {
      console.error('Failed to load types:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (code: string) => {
    const icons: Record<string, string> = {
      'RES': '🏘️',
      'COM': '🏢',
      'IND': '🏭',
      'CA': '🌳',
      'INST': '🏛️',
      'MX': '🏙',
      'OS': '🌾',
      'PUB': '🏛️',
      'OTHR': '📦'
    };
    return icons[code] || '📦';
  };

  const getTypeColor = (typeCode: string) => {
    // Generate consistent colors based on type code
    const colors: Record<string, string> = {
      'SFR': '#3b82f6',    // blue
      'SFA': '#8b5cf6',    // purple
      'MF': '#ec4899',     // pink
      'CONDO': '#f59e0b',  // amber
      'TOWN': '#10b981',   // green
      'MIXED': '#06b6d4',  // cyan
      'OTHER': '#6b7280',  // gray
    };
    // Default color rotation for unmapped codes
    const defaultColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#6366f1'];
    return colors[typeCode] || defaultColors[typeCode.length % defaultColors.length];
  };

  const handleEdit = (type: Type) => {
    setEditingType(type);
    setFormData({
      code: type.code,
      name: type.name,
      notes: '',
      color: getTypeColor(type.code)
    });
    setShowModal(true);
  };

  const handleAddNew = () => {
    if (!family) return;
    setEditingType(null);
    setFormData({ code: '', name: '', notes: '', color: '#3b82f6' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!family) return;

    try {
      const url = editingType
        ? `/api/taxonomy/types/${editingType.type_id}`
        : `/api/taxonomy/types`;

      const response = await fetch(url, {
        method: editingType ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          family_id: family.family_id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save type');
      }

      showToast(editingType ? 'Type updated successfully' : 'Type created successfully', 'success');
      setShowModal(false);
      loadTypes(family.family_id);
      onRefresh();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleDelete = async (type: Type) => {
    if (!confirm(`Are you sure you want to delete "${type.name}"?`)) return;

    try {
      const response = await fetch(`/api/taxonomy/types/${type.type_id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete type');
      }

      showToast('Type deleted successfully', 'success');
      if (family) loadTypes(family.family_id);
      onRefresh();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  if (!family) {
    return (
      <div className="content-area">
        <div className="content-empty">
          <div className="empty-icon">📋</div>
          <div className="empty-text">Select a family to view details</div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-area">
      <div className="content-panel">
        {/* Header */}
        <div className="panel-header">
          <div className="family-header-line">
            <span className="family-header-icon">{getIcon(family.code)}</span>
            <span className="family-header-name">{family.name}</span>
            <span className="family-header-dot">·</span>
            <span className="family-header-code">{family.code}</span>
          </div>
        </div>

        {/* Panel Body */}
        <div className="panel-body">
          {/* Types Section */}
          <div className="types-section">
            <div className="section-header">
              <div className="section-title">{family.name} › Property Types ({types.length})</div>
              <div className="section-header-actions">
                {selectedType && (
                  <>
                    <button className="btn-edit" onClick={() => handleEdit(selectedType)} title="Edit Type">
                      <CIcon icon={cilPencil} size="sm" />
                    </button>
                    <button className="btn-edit" onClick={() => handleDelete(selectedType)} title="Delete Type" style={{ marginRight: '8px' }}>
                      <CIcon icon={cilTrash} size="sm" />
                    </button>
                  </>
                )}
                <button className="btn-secondary" onClick={handleAddNew}>+ Add Type</button>
              </div>
            </div>

            {loading ? (
              <div className="loading">Loading types...</div>
            ) : (
              <div className="types-grid">
                {types.map((type) => (
                  <div
                    key={type.type_id}
                    className={`type-card ${selectedType?.type_id === type.type_id ? 'active' : ''}`}
                    onClick={() => onSelectType(type)}
                  >
                    <div className="type-card-content">
                      <span className="type-card-name">{type.name}</span>
                      <span className="type-code" style={{ backgroundColor: getTypeColor(type.code) }}>{type.code}</span>
                      <span className="type-product-count">({type.product_count})</span>
                    </div>
                    <button className="type-expand-btn">→</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit/Add Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--cui-card-bg)',
              color: 'var(--cui-body-color)',
              padding: '24px',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '540px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
              border: `1px solid var(--cui-border-color)`
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '12px', color: 'var(--cui-body-color)' }}>
              {editingType ? 'Edit Type' : 'Add New Type'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, color: 'var(--cui-secondary-color)' }}>Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: `1px solid var(--cui-border-color)`,
                      backgroundColor: 'var(--cui-body-bg)',
                      color: 'var(--cui-body-color)'
                    }}
                    placeholder="e.g., SFD"
                  />
                </div>
                <div style={{ width: '110px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, color: 'var(--cui-secondary-color)' }}>Color</label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '2px',
                      borderRadius: '6px',
                      border: `1px solid var(--cui-border-color)`,
                      backgroundColor: 'var(--cui-body-bg)',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, color: 'var(--cui-secondary-color)' }}>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: `1px solid var(--cui-border-color)`,
                    backgroundColor: 'var(--cui-body-bg)',
                    color: 'var(--cui-body-color)'
                  }}
                  placeholder="e.g., Single Family Detached"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, color: 'var(--cui-secondary-color)' }}>Notes (optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: `1px solid var(--cui-border-color)`,
                    backgroundColor: 'var(--cui-body-bg)',
                    color: 'var(--cui-body-color)',
                    minHeight: '90px'
                  }}
                  placeholder="Optional description"
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: `1px solid var(--cui-border-color)`,
                  backgroundColor: 'transparent',
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
                  borderRadius: '6px',
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
