'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { ParcelWithSale } from '@/types/sales-absorption';
import { groupParcelsBySaleDate } from '@/utils/sales/salesAggregation';
import FilterSidebar from './FilterSidebar';
import TransactionGrid from './TransactionGrid';

interface SaleTransactionDetailsProps {
  projectId: number;
  parcels: ParcelWithSale[];
}

export default function SaleTransactionDetails({
  projectId,
  parcels,
}: SaleTransactionDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'phase' | 'use'>('all');
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [selectedUseType, setSelectedUseType] = useState<string | null>(null);
  const [saleNames, setSaleNames] = useState<Record<string, string>>({});
  const [isLoadingNames, setIsLoadingNames] = useState(true);

  // Fetch existing sale names when component mounts
  useEffect(() => {
    const fetchSaleNames = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/sales/names`);
        if (response.ok) {
          const data = await response.json();
          setSaleNames(data.saleNames || {});
        }
      } catch (error) {
        console.error('Error fetching sale names:', error);
      } finally {
        setIsLoadingNames(false);
      }
    };

    fetchSaleNames();
  }, [projectId]);

  // Group parcels by sale date
  const salesByDate = useMemo(() => {
    return groupParcelsBySaleDate(parcels, saleNames);
  }, [parcels, saleNames]);

  // Filter sales based on active filter
  const filteredSales = useMemo(() => {
    if (activeFilter === 'all') return salesByDate;

    if (activeFilter === 'phase' && selectedPhase) {
      return salesByDate.filter(sale =>
        sale.parcels.some(p => (p.phase_name || 'Unassigned') === selectedPhase)
      );
    }

    if (activeFilter === 'use' && selectedUseType) {
      return salesByDate.filter(sale =>
        sale.parcels.some(p => p.type_code === selectedUseType)
      );
    }

    return salesByDate;
  }, [salesByDate, activeFilter, selectedPhase, selectedUseType]);

  // Optimistic update for sale name changes
  const handleSaveNameOptimistic = (saleDate: string, newName: string) => {
    setSaleNames(prev => ({
      ...prev,
      [saleDate]: newName,
    }));
  };

  // If no sales with dates, don't render anything
  if (salesByDate.length === 0) {
    return null;
  }

  return (
    <div
      className="sale-transaction-details"
      style={{
        background: 'var(--cui-card-bg)',
        border: '1px solid var(--cui-border-color)',
        borderRadius: '0.375rem',
        marginTop: '1rem',
      }}
    >
      <div
        className="d-flex justify-content-between align-items-center p-3"
        style={{ cursor: 'pointer', borderBottom: isExpanded ? '1px solid var(--cui-border-color)' : 'none' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h5 className="mb-0">
          {isExpanded ? '▼' : '▶'} Sale Transaction Details ({filteredSales.length} sale{filteredSales.length !== 1 ? 's' : ''})
        </h5>
      </div>

      {isExpanded && (
        <div className="p-3">
          {isLoadingNames ? (
            <div className="text-center py-5 text-muted">
              Loading sale transaction data...
            </div>
          ) : (
            <div className="d-flex gap-3">
              {/* Filter Sidebar */}
              <FilterSidebar
                sales={salesByDate}
                activeFilter={activeFilter}
                selectedPhase={selectedPhase}
                selectedUseType={selectedUseType}
                onFilterChange={setActiveFilter}
                onPhaseSelect={setSelectedPhase}
                onUseTypeSelect={setSelectedUseType}
              />

              {/* Transaction Grid */}
              <TransactionGrid
                sales={filteredSales}
                projectId={projectId}
                onSaveNameOptimistic={handleSaveNameOptimistic}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
