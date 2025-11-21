'use client';

import React, { useState } from 'react';
import CollapsibleSection from '@/app/components/Planning/CollapsibleSection';
import ComparablesTable, { type ComparableColumn, type ComparableRow } from './ComparablesTable';
import ComparableModal from './ComparableModal';
import { SalesComparisonApproach } from '@/app/projects/[projectId]/valuation/components/SalesComparisonApproach';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/toast';
import { getValuationSummary } from '@/lib/api/valuation';

interface MarketDataContentProps {
  projectId: number;
}

// Column definitions for each comparable type
const LAND_SALES_COLUMNS: ComparableColumn[] = [
  { key: 'id', label: 'ID', type: 'number', width: '80px' },
  { key: 'property_name', label: 'Property Name', type: 'text' },
  { key: 'location', label: 'Location', type: 'text' },
  { key: 'sale_date', label: 'Sale Date', type: 'date', width: '140px' },
  { key: 'acres', label: 'Acres', type: 'number', width: '100px' },
  { key: 'price_per_acre', label: 'Price/Acre', type: 'currency', width: '140px' },
  { key: 'total_price', label: 'Total Price', type: 'currency', width: '160px' },
];

const HOUSING_PRICE_COLUMNS: ComparableColumn[] = [
  { key: 'id', label: 'ID', type: 'number', width: '80px' },
  { key: 'project_name', label: 'Project Name', type: 'text' },
  { key: 'location', label: 'Location', type: 'text' },
  { key: 'product_type', label: 'Product Type', type: 'text', width: '140px' },
  { key: 'avg_price', label: 'Avg Price', type: 'currency', width: '140px' },
  { key: 'price_per_sf', label: 'Price/SF', type: 'currency', width: '120px' },
  { key: 'date_reported', label: 'Date Reported', type: 'date', width: '140px' },
];

const ABSORPTION_RATE_COLUMNS: ComparableColumn[] = [
  { key: 'id', label: 'ID', type: 'number', width: '80px' },
  { key: 'project_name', label: 'Project Name', type: 'text' },
  { key: 'location', label: 'Location', type: 'text' },
  { key: 'product_type', label: 'Product Type', type: 'text', width: '140px' },
  { key: 'monthly_absorption', label: 'Monthly Rate', type: 'number', width: '140px' },
  { key: 'annual_absorption', label: 'Annual Rate', type: 'number', width: '140px' },
  { key: 'date_reported', label: 'Date Reported', type: 'date', width: '140px' },
];

type ComparableType = 'land_sales' | 'housing_prices' | 'absorption_rates';

/**
 * MarketDataContent Component
 *
 * Phase 4: Feasibility/Valuation Tab - Market Data subtab
 *
 * Three collapsible sections:
 * 1. Comparable Land Sales
 * 2. Housing Price Comparables
 * 3. Absorption Rate Comparables
 *
 * Each section uses ComparablesTable component with add/edit/delete functionality.
 */
export default function MarketDataContent({ projectId }: MarketDataContentProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Modal state
  const [modalState, setModalState] = useState<{
    visible: boolean;
    type: ComparableType | null;
    data?: ComparableRow;
  }>({
    visible: false,
    type: null,
  });

  // Fetch valuation summary (includes sales comparables from Django backend)
  // For land projects, this uses the same tbl_sales_comparables table as MF projects
  // The mode='land' prop will show land-appropriate field labels
  const { data: valuationData, isLoading: valuationLoading } = useQuery({
    queryKey: ['valuation-summary', projectId],
    queryFn: async () => {
      try {
        const data = await getValuationSummary(projectId);
        return data;
      } catch (error) {
        console.error('Error fetching valuation summary:', error);
        // Return empty data structure if API call fails
        return {
          project_id: projectId,
          sales_comparables: [],
          sales_comparison_summary: { total_comps: 0, indicated_value_per_unit: null, weighted_average_per_unit: null, total_indicated_value: null },
          cost_approach: null,
          income_approach: null,
          reconciliation: null
        };
      }
    },
  });

  const landSales = valuationData?.sales_comparables || [];

  // Fetch housing price comparables
  const { data: housingPrices = [] } = useQuery({
    queryKey: ['market-data', 'housing-prices', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/market-data/housing-prices`);
      if (!response.ok) throw new Error('Failed to fetch housing prices');
      const data = await response.json();
      return data.comparables || [];
    },
  });

  // Fetch absorption rates
  const { data: absorptionRates = [] } = useQuery({
    queryKey: ['market-data', 'absorption-rates', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/market-data/absorption-rates`);
      if (!response.ok) throw new Error('Failed to fetch absorption rates');
      const data = await response.json();
      return data.comparables || [];
    },
  });

  // Mutations for CRUD operations
  const saveMutation = useMutation({
    mutationFn: async ({ type, data }: { type: ComparableType; data: any }) => {
      const url = data.id
        ? `/api/projects/${projectId}/market-data/${type}/${data.id}`
        : `/api/projects/${projectId}/market-data/${type}`;

      const response = await fetch(url, {
        method: data.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to save comparable');
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['market-data', variables.type, projectId] });
      showToast({
        title: 'Success',
        message: 'Comparable saved successfully',
        type: 'success',
      });
    },
    onError: () => {
      showToast({
        title: 'Error',
        message: 'Failed to save comparable',
        type: 'error',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: ComparableType; id: number }) => {
      const response = await fetch(`/api/projects/${projectId}/market-data/${type}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete comparable');
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['market-data', variables.type, projectId] });
      showToast({
        title: 'Success',
        message: 'Comparable deleted successfully',
        type: 'success',
      });
    },
    onError: () => {
      showToast({
        title: 'Error',
        message: 'Failed to delete comparable',
        type: 'error',
      });
    },
  });

  // Modal handlers
  const handleOpenModal = (type: ComparableType, data?: ComparableRow) => {
    setModalState({ visible: true, type, data });
  };

  const handleCloseModal = () => {
    setModalState({ visible: false, type: null });
  };

  const handleSave = async (data: Record<string, any>) => {
    if (!modalState.type) return;
    await saveMutation.mutateAsync({ type: modalState.type, data });
  };

  const handleDelete = (type: ComparableType, id: number) => {
    deleteMutation.mutate({ type, id });
  };

  // Get current modal configuration
  const getModalConfig = () => {
    switch (modalState.type) {
      case 'land_sales':
        return {
          title: modalState.data ? 'Edit Land Sale' : 'Add Land Sale Comparable',
          columns: LAND_SALES_COLUMNS,
        };
      case 'housing_prices':
        return {
          title: modalState.data ? 'Edit Housing Price' : 'Add Housing Price Comparable',
          columns: HOUSING_PRICE_COLUMNS,
        };
      case 'absorption_rates':
        return {
          title: modalState.data ? 'Edit Absorption Rate' : 'Add Absorption Rate Comparable',
          columns: ABSORPTION_RATE_COLUMNS,
        };
      default:
        return { title: '', columns: [] };
    }
  };

  const modalConfig = getModalConfig();

  return (
    <div
      className="p-4 space-y-4 min-h-screen"
      style={{ backgroundColor: 'var(--cui-body-bg)' }}
    >
      {/* Comparable Land Sales */}
      <CollapsibleSection
        title="Comparable Land Sales"
        itemCount={landSales.length}
        defaultExpanded={true}
      >
        <div className="p-4">
          <SalesComparisonApproach
            projectId={projectId}
            comparables={landSales}
            reconciliation={valuationData?.reconciliation || null}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['valuation-summary', projectId] })}
            mode="land"
          />
        </div>
      </CollapsibleSection>

      {/* Housing Price Comparables */}
      <CollapsibleSection
        title="Housing Price Comparables"
        itemCount={housingPrices.length}
        defaultExpanded={true}
      >
        <div className="p-4">
          <ComparablesTable
            title="Housing Price Comparables"
            columns={HOUSING_PRICE_COLUMNS}
            data={housingPrices}
            onAdd={() => handleOpenModal('housing_prices')}
            onEdit={(row) => handleOpenModal('housing_prices', row)}
            onDelete={(id) => handleDelete('housing_prices', id)}
            emptyMessage="No housing price comparables yet. Click 'Add Comparable' to track market pricing."
          />
        </div>
      </CollapsibleSection>

      {/* Absorption Rate Comparables */}
      <CollapsibleSection
        title="Absorption Rate Comparables"
        itemCount={absorptionRates.length}
        defaultExpanded={true}
      >
        <div className="p-4">
          <ComparablesTable
            title="Absorption Rate Comparables"
            columns={ABSORPTION_RATE_COLUMNS}
            data={absorptionRates}
            onAdd={() => handleOpenModal('absorption_rates')}
            onEdit={(row) => handleOpenModal('absorption_rates', row)}
            onDelete={(id) => handleDelete('absorption_rates', id)}
            emptyMessage="No absorption rate comparables yet. Click 'Add Comparable' to track sales velocity."
          />
        </div>
      </CollapsibleSection>

      {/* Comparable Modal */}
      <ComparableModal
        visible={modalState.visible}
        title={modalConfig.title}
        columns={modalConfig.columns}
        initialData={modalState.data}
        onClose={handleCloseModal}
        onSave={handleSave}
      />
    </div>
  );
}
