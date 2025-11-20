'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/toast';

interface Family {
  family_id: number;
  code: string;
  name: string;
  active: boolean;
  notes: string | null;
  type_count: number;
  product_count: number;
}

interface FamilyTreeProps {
  families: Family[];
  selectedFamily: Family | null;
  onSelectFamily: (family: Family) => void;
  onRefresh: () => void;
}

export default function FamilyTree({ families, selectedFamily, onSelectFamily, onRefresh }: FamilyTreeProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '', notes: '' });
  const { showToast } = useToast();

  const filteredFamilies = families.filter(f =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handleEdit = (family: Family) => {
    setEditingFamily(family);
    setFormData({ code: family.code, name: family.name, notes: family.notes || '' });
    setShowModal(true);
  };

  const handleAddNew = () => {
    setEditingFamily(null);
    setFormData({ code: '', name: '', notes: '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const url = editingFamily
        ? `/api/taxonomy/families/${editingFamily.family_id}`
        : `/api/taxonomy/families`;

      const response = await fetch(url, {
        method: editingFamily ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save family');
      }

      showToast(editingFamily ? 'Family updated successfully' : 'Family created successfully', 'success');
      setShowModal(false);
      onRefresh();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleDelete = async (family: Family) => {
    if (!confirm(`Are you sure you want to delete "${family.name}"?`)) return;

    try {
      const response = await fetch(`/api/taxonomy/families/${family.family_id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete family');
      }

      showToast('Family deleted successfully', 'success');
      onRefresh();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  return (
    <div className="taxonomy-sidebar">
      {/* Search */}
      <div className="sidebar-header">
        <input
          type="text"
          className="search-box"
          placeholder="🔍 Search families..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Family List */}
      <div className="tree-container">
        <div className="tree-section-header">
          <span>Families ({filteredFamilies.length})</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {selectedFamily && (
              <>
                <button className="edit-button" onClick={() => handleEdit(selectedFamily)} title="Edit Family">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button className="edit-button" onClick={() => handleDelete(selectedFamily)} title="Delete Family">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </>
            )}
            <button className="edit-button" onClick={handleAddNew} title="Add Family">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
        <div className="tree-items">
          {filteredFamilies.map((family) => (
            <div
              key={family.family_id}
              className={`tree-item ${selectedFamily?.family_id === family.family_id ? 'active' : ''}`}
              onClick={() => onSelectFamily(family)}
            >
              <div className="tree-item-content">
                <div className="tree-item-label">
                  <span className="tree-item-name">{family.name}</span> · {family.code} · {family.type_count} types
                </div>
              </div>
            </div>
          ))}
        </div>
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
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '500px'
          }}>
            <h3 style={{ marginTop: 0 }}>{editingFamily ? 'Edit Family' : 'Add New Family'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  placeholder="e.g., RES"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  placeholder="e.g., Residential"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Notes (optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minHeight: '80px' }}
                  placeholder="Optional description"
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer' }}
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
