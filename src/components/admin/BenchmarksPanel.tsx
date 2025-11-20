'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import BenchmarkAccordion from '@/components/benchmarks/BenchmarkAccordion';
import BenchmarksFlyout, { BenchmarksFlyoutSelection } from '@/components/benchmarks/BenchmarksFlyout';
import AddBenchmarkModal from '@/components/benchmarks/AddBenchmarkModal';
import GrowthRateCategoryPanel from '@/components/benchmarks/GrowthRateCategoryPanel';
import AbsorptionVelocityPanel from '@/components/benchmarks/absorption/AbsorptionVelocityPanel';
import { LandscapeButton } from '@/components/ui/landscape';
import type {
  Benchmark,
  AISuggestion,
  BenchmarkCategory,
  GrowthRateSet,
  AbsorptionVelocity
} from '@/types/benchmarks';

// Category definitions
const CATEGORIES: BenchmarkCategory[] = [
  { key: 'growth_rate', label: 'Growth Rates', icon: 'TrendingUp', count: 0 },
  { key: 'transaction_cost', label: 'Transaction Costs', icon: 'Receipt', count: 0 },
  { key: 'commission', label: 'Commissions', icon: 'Percent', count: 0 },
  { key: 'absorption', label: 'Absorption Velocity', icon: 'Timeline', count: 0 },
  { key: 'contingency', label: 'Contingency Standards', icon: 'Shield', count: 0 },
  { key: 'market_timing', label: 'Market Timing', icon: 'Schedule', count: 0 },
  { key: 'land_use_pricing', label: 'Land Use Pricing', icon: 'Landscape', count: 0 },
  { key: 'op_cost', label: 'Op Costs', icon: 'Business', count: 0 },
  { key: 'capital_stack', label: 'Capital Stack', icon: 'Layers', count: 0 },
  { key: 'debt_standard', label: 'Debt Standards', icon: 'CreditCard', count: 0 },
];

export default function BenchmarksPanel() {
  const [selectedCategory, setSelectedCategory] = useState<BenchmarkCategory | null>(null);
  const [benchmarks, setBenchmarks] = useState<Record<string, Benchmark[]>>({});
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingToCategory, setAddingToCategory] = useState<BenchmarkCategory | null>(null);
  const [growthRateSets, setGrowthRateSets] = useState<GrowthRateSet[]>([]);
  const [absorptionCount, setAbsorptionCount] = useState(0);
  const [totalCostLineItems, setTotalCostLineItems] = useState(0);
  const [leftPanelWidth, setLeftPanelWidth] = useState(60);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedTile, setSelectedTile] = useState<BenchmarksFlyoutSelection | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const [benchmarkRes, saleBenchmarksRes, suggestionsRes, absorptionRes, unitCostTemplatesRes] = await Promise.all([
        fetch('/api/benchmarks'),
        fetch('/api/sale-benchmarks/global'),
        fetch('/api/benchmarks/ai-suggestions'),
        fetch('/api/benchmarks/absorption-velocity'),
        fetch('/api/unit-costs/templates'),
      ]);

      if (!benchmarkRes.ok) {
        throw new Error('Failed to fetch benchmark registry');
      }

      const benchmarkData = await benchmarkRes.json();
      const saleBenchmarksData = saleBenchmarksRes.ok ? await saleBenchmarksRes.json() : { benchmarks: [] };
      const suggestionsData = suggestionsRes.ok ? await suggestionsRes.json() : { suggestions: [] };
      const absorptionData = absorptionRes.ok ? await absorptionRes.json() : { absorption_velocities: [] };
      const unitCostTemplatesData = unitCostTemplatesRes.ok ? await unitCostTemplatesRes.json() : { templates: [] };

      setBenchmarks(benchmarkData.benchmarks || {});
      setGrowthRateSets(benchmarkData.growth_rate_sets || []);
      setAiSuggestions(suggestionsData.suggestions || []);
      setAbsorptionCount(absorptionData.absorption_velocities?.length || 0);
      setTotalCostLineItems(unitCostTemplatesData.templates?.length || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load benchmarks');
    } finally {
      setLoading(false);
    }
  }

  const handleCategorySelect = (category: BenchmarkCategory) => {
    setSelectedCategory(category);
  };

  const handleAddBenchmark = (category: BenchmarkCategory) => {
    setAddingToCategory(category);
    setShowAddModal(true);
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setAddingToCategory(null);
    loadData();
  };

  return (
    <div className="d-flex" style={{ height: '70vh', overflow: 'hidden' }}>
      {/* Left Panel - Benchmark Categories */}
      <div
        style={{
          width: `${leftPanelWidth}%`,
          overflowY: 'auto',
          borderRight: '1px solid var(--cui-border-color)',
          backgroundColor: 'var(--cui-body-bg)'
        }}
      >
        <BenchmarkAccordion
          categories={CATEGORIES}
          benchmarks={benchmarks}
          growthRateSets={growthRateSets}
          absorptionCount={absorptionCount}
          totalCostLineItems={totalCostLineItems}
          onCategorySelect={handleCategorySelect}
          onAddBenchmark={handleAddBenchmark}
          selectedCategory={selectedCategory}
        />
      </div>

      {/* Right Panel - Details */}
      <div
        style={{
          width: `${100 - leftPanelWidth}%`,
          overflowY: 'auto',
          backgroundColor: 'var(--cui-tertiary-bg)',
          padding: '1rem'
        }}
      >
        {selectedCategory ? (
          selectedCategory.key === 'growth_rate' ? (
            <GrowthRateCategoryPanel
              growthRateSets={growthRateSets}
              onRefresh={loadData}
            />
          ) : selectedCategory.key === 'absorption' ? (
            <AbsorptionVelocityPanel onRefresh={loadData} />
          ) : (
            <div className="text-center py-5">
              <p className="text-muted">
                {selectedCategory.label} panel coming soon.
              </p>
            </div>
          )
        ) : (
          <div className="text-center py-5">
            <p className="text-muted">
              Select a category from the left to view and manage benchmarks.
            </p>
          </div>
        )}
      </div>

      {/* Add Benchmark Modal */}
      {showAddModal && addingToCategory && (
        <AddBenchmarkModal
          category={addingToCategory}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
