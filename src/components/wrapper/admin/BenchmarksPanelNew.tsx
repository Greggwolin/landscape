'use client';

import React, { useEffect, useState } from 'react';
import BenchmarkAccordion from '@/components/benchmarks/BenchmarkAccordion';
import AddBenchmarkModal from '@/components/benchmarks/AddBenchmarkModal';
import GrowthRateCategoryPanel from '@/components/benchmarks/GrowthRateCategoryPanel';
import type { Benchmark, BenchmarkCategory, GrowthRateSet } from '@/types/benchmarks';

const CATEGORIES: BenchmarkCategory[] = [
  { key: 'growth_rate', label: 'Growth Rates', icon: 'TrendingUp', count: 0 },
  { key: 'transaction_cost', label: 'Transaction Costs', icon: 'Receipt', count: 0 },
  { key: 'commission', label: 'Commissions', icon: 'Percent', count: 0 },
  { key: 'contingency', label: 'Contingency Standards', icon: 'Shield', count: 0 },
];

export default function BenchmarksPanelNew() {
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [benchmarks, setBenchmarks] = useState<Record<string, Benchmark[]>>({});
  const [growthRateSets, setGrowthRateSets] = useState<GrowthRateSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingToCategory, setAddingToCategory] = useState<BenchmarkCategory | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [benchmarkRes, saleBenchmarksRes, growthRatesRes] = await Promise.all([
        fetch('/api/benchmarks'),
        fetch('/api/sale-benchmarks/global'),
        fetch('/api/benchmarks/growth-rates'),
      ]);
      if (!benchmarkRes.ok) throw new Error('Failed to fetch benchmark registry');

      const benchmarkData = await benchmarkRes.json();
      const saleBenchmarksData = saleBenchmarksRes.ok
        ? await saleBenchmarksRes.json()
        : { benchmarks: [] };
      const growthRatesData = growthRatesRes.ok ? await growthRatesRes.json() : { sets: [] };

      const benchmarksList = Array.isArray(benchmarkData.benchmarks) ? benchmarkData.benchmarks : [];
      const saleBenchmarksList = Array.isArray(saleBenchmarksData.benchmarks)
        ? saleBenchmarksData.benchmarks
        : [];

      const grouped: Record<string, Benchmark[]> = {};

      benchmarksList.forEach((b: Benchmark) => {
        const category = b.category || 'other';
        if (category === 'commission' || category === 'transaction_cost') return;
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push(b);
      });

      saleBenchmarksList.forEach((b: any) => {
        let category: string | null = null;
        if (b.benchmark_type === 'commission') category = 'commission';
        else if (['closing', 'legal', 'title_insurance'].includes(b.benchmark_type))
          category = 'transaction_cost';
        if (!category) return;
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push({ ...b, category, source_type: 'global_default' });
      });

      setBenchmarks(grouped);
      setGrowthRateSets(growthRatesData.sets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load benchmarks');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const toggleCategory = (cat: BenchmarkCategory) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat.key)) next.delete(cat.key);
      else next.add(cat.key);
      return next;
    });
  };

  const handleAddBenchmark = (cat: BenchmarkCategory) => {
    setAddingToCategory(cat);
    setShowAddModal(true);
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setAddingToCategory(null);
    loadData();
  };

  return (
    <div className="w-dms-admin">
      <div className="w-dms-admin-head">
        <div>
          <div className="w-admin-section-title" style={{ fontSize: 15 }}>Benchmarks</div>
          <div className="w-admin-section-note" style={{ marginBottom: 0 }}>
            Firm-wide benchmark library: growth rates, transaction costs, commissions, and contingency standards
          </div>
        </div>
      </div>

      {error && (
        <div className="w-dms-admin-empty" style={{ color: 'var(--w-danger-text)', borderColor: 'var(--w-danger-text)' }}>
          {error}
        </div>
      )}

      <div className="w-pref-accordion">
        {CATEGORIES.map((category) => {
          const categoryBenchmarks = benchmarks[category.key] || [];
          const displayCount =
            category.key === 'growth_rate' ? growthRateSets.length : categoryBenchmarks.length;
          const categoryWithCount = { ...category, count: displayCount };

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

          return (
            <BenchmarkAccordion
              key={category.key}
              category={categoryWithCount}
              benchmarks={categoryBenchmarks}
              isExpanded={openCategories.has(category.key)}
              onToggle={() => toggleCategory(category)}
              onBenchmarkClick={() => { /* no-op — right pane removed */ }}
              onAddNew={() => handleAddBenchmark(category)}
              onRefresh={loadData}
            />
          );
        })}
      </div>

      {showAddModal && addingToCategory && (
        <AddBenchmarkModal category={addingToCategory} onClose={handleModalClose} />
      )}
    </div>
  );
}
