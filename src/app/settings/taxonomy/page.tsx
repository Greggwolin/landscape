'use client';

import { useState, useEffect } from 'react';
import FamilyTree from '@/components/taxonomy/FamilyTree';
import FamilyDetails from '@/components/taxonomy/FamilyDetails';
import ProductsList from '@/components/taxonomy/ProductsList';
import { ToastProvider } from '@/components/ui/toast';
import './taxonomy.css';

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

export default function TaxonomyManagerPage() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const [selectedType, setSelectedType] = useState<Type | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFamilies();
  }, []);

  const loadFamilies = async () => {
    try {
      const response = await fetch('/api/taxonomy/families');
      const data = await response.json();
      setFamilies(data);

      // Auto-select first family (Residential)
      if (data.length > 0) {
        setSelectedFamily(data[0]);
      }
    } catch (error) {
      console.error('Failed to load families:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshFamilies = () => {
    loadFamilies();
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4 min-h-screen" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
        <div className="taxonomy-manager">
          <div className="loading-state">Loading taxonomy...</div>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="p-4 space-y-4 min-h-screen" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
        <div className="taxonomy-manager">
          {/* Header */}
          <div className="taxonomy-header">
            <div className="breadcrumb">
              <a href="/settings">Settings</a>
              <span className="breadcrumb-separator">/</span>
              <span>Land Use Taxonomy</span>
            </div>
            <div className="header-actions">
              <button className="btn-secondary" disabled>📥 Import</button>
              <button className="btn-secondary" disabled>📤 Export</button>
            </div>
          </div>

          {/* Three-column layout */}
          <div className="main-container">
            {/* Left: Family Tree */}
            <FamilyTree
              families={families}
              selectedFamily={selectedFamily}
              onSelectFamily={(family) => {
                setSelectedFamily(family);
                setSelectedType(null); // Clear type selection when family changes
              }}
              onRefresh={refreshFamilies}
            />

            {/* Center: Family Details + Types */}
            <FamilyDetails
              family={selectedFamily}
              selectedType={selectedType}
              onSelectType={setSelectedType}
              onRefresh={refreshFamilies}
            />

            {/* Right: Products List (appears when type selected) */}
            {selectedType && (
              <ProductsList
                type={selectedType}
                onClose={() => setSelectedType(null)}
              />
            )}
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
