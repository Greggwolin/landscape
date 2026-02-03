'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import BenchmarkAccordion from '@/components/benchmarks/BenchmarkAccordion';
import AddBenchmarkModal from '@/components/benchmarks/AddBenchmarkModal';
import GrowthRateCategoryPanel from '@/components/benchmarks/GrowthRateCategoryPanel';
import type {
  Benchmark,
  BenchmarkCategory,
  GrowthRateSet
} from '@/types/benchmarks';

// Category definitions
const CATEGORIES: BenchmarkCategory[] = [
  { key: 'growth_rate', label: 'Growth Rates', icon: 'TrendingUp', count: 0 },
  { key: 'transaction_cost', label: 'Transaction Costs', icon: 'Receipt', count: 0 },
  { key: 'commission', label: 'Commissions', icon: 'Percent', count: 0 },
  { key: 'contingency', label: 'Contingency Standards', icon: 'Shield', count: 0 },
];

export default function BenchmarksPanel() {
  // Track multiple open categories instead of single selection
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [benchmarks, setBenchmarks] = useState<Record<string, Benchmark[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingToCategory, setAddingToCategory] = useState<BenchmarkCategory | null>(null);
  const [growthRateSets, setGrowthRateSets] = useState<GrowthRateSet[]>([]);
  const [leftPanelWidth, setLeftPanelWidth] = useState(40); // Adjusted to 40%
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const [benchmarkRes, saleBenchmarksRes, growthRatesRes] = await Promise.all([
        fetch('/api/benchmarks'),
        fetch('/api/sale-benchmarks/global'),
        fetch('/api/benchmarks/growth-rates'),
      ]);

      if (!benchmarkRes.ok) {
        throw new Error('Failed to fetch benchmark registry');
      }

      const benchmarkData = await benchmarkRes.json();
      const saleBenchmarksData = saleBenchmarksRes.ok ? await saleBenchmarksRes.json() : { benchmarks: [] };
      const growthRatesData = growthRatesRes.ok ? await growthRatesRes.json() : { sets: [] };

      // Group benchmarks by category
      const benchmarksList = Array.isArray(benchmarkData.benchmarks) ? benchmarkData.benchmarks : [];
      const saleBenchmarksList = Array.isArray(saleBenchmarksData.benchmarks) ? saleBenchmarksData.benchmarks : [];

      const grouped: Record<string, Benchmark[]> = {};

      // Add regular benchmarks (excluding commission and transaction_cost as they come from sale-benchmarks)
      benchmarksList.forEach((benchmark: Benchmark) => {
        const category = benchmark.category || 'other';
        // Skip commission and transaction_cost from old benchmarks table
        if (category === 'commission' || category === 'transaction_cost') {
          return;
        }
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(benchmark);
      });

      // Add sale benchmarks to appropriate categories
      // Map benchmark_type to category key
      saleBenchmarksList.forEach((benchmark: any) => {
        let category: string | null = null;

        // Map benchmark types to categories
        if (benchmark.benchmark_type === 'commission') {
          category = 'commission';
        } else if (['closing', 'legal', 'title_insurance'].includes(benchmark.benchmark_type)) {
          category = 'transaction_cost';
        }
        // Skip improvement_offset and other types - they're not shown in this panel

        if (category) {
          if (!grouped[category]) {
            grouped[category] = [];
          }
          // Add category field and mark as coming from sale benchmarks
          grouped[category].push({
            ...benchmark,
            category,
            source_type: 'global_default'
          });
        }
      });

      setBenchmarks(grouped);
      setGrowthRateSets(growthRatesData.sets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load benchmarks');
    } finally {
      setLoading(false);
    }
  }

  // Toggle category open/closed (allows multiple open at once)
  const toggleCategory = (category: BenchmarkCategory) => {
    setOpenCategories(prev => {
      const next = new Set(prev);
      if (next.has(category.key)) {
        next.delete(category.key);
      } else {
        next.add(category.key);
      }
      return next;
    });
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
        {error && (
          <div
            style={{
              padding: '0.5rem 1rem',
              margin: '0.75rem 1rem',
              backgroundColor: 'rgba(202, 46, 93, 0.1)',
              color: '#ca2e5d',
              borderRadius: '0.375rem'
            }}
            role="alert"
          >
            {error}
          </div>
        )}
        {CATEGORIES.map((category) => {
          // Get benchmarks for this category
          const categoryBenchmarks = benchmarks[category.key] || [];

          // Update count based on special categories
          let displayCount = categoryBenchmarks.length;
          if (category.key === 'growth_rate') {
            displayCount = growthRateSets.length;
          }

          const categoryWithCount = { ...category, count: displayCount };

          // Growth Rate category uses custom panel in left accordion
          if (category.key === 'growth_rate') {
            return (
              <GrowthRateCategoryPanel
                key={category.key}
                category={categoryWithCount}
                sets={growthRateSets}
                isExpanded={openCategories.has(category.key)}
                loading={loading}
                onToggle={() => toggleCategory(category)}
                onRefresh={loadData}
              />
            );
          }

          // All other categories use BenchmarkAccordion
          return (
            <BenchmarkAccordion
              key={category.key}
              category={categoryWithCount}
              benchmarks={categoryBenchmarks}
              isExpanded={openCategories.has(category.key)}
              onToggle={() => toggleCategory(category)}
              onBenchmarkClick={(benchmark) => console.log('Benchmark clicked:', benchmark)}
              onAddNew={() => handleAddBenchmark(category)}
              onRefresh={loadData}
            />
          );
        })}
      </div>

      {/* Right Panel - Placeholder for future Landscaper integration */}
      <div
        style={{
          width: `${100 - leftPanelWidth}%`,
          overflowY: 'auto',
          backgroundColor: 'var(--cui-tertiary-bg)',
          padding: '1rem'
        }}
      >
        <div className="text-center py-5">
          <p className="text-muted">
            Landscaper panel will be integrated here in a future update.
          </p>
        </div>
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
