'use client';

/**
 * Global Benchmarks Library - Main Page
 * Split-screen layout with accordion (left) and Landscaper panel (right)
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
import BenchmarkAccordion from '@/components/benchmarks/BenchmarkAccordion';
import BenchmarksFlyout, { BenchmarksFlyoutSelection } from '@/components/benchmarks/BenchmarksFlyout';
import AddBenchmarkModal from '@/components/benchmarks/AddBenchmarkModal';
import GrowthRateCategoryPanel from '@/components/benchmarks/GrowthRateCategoryPanel';
import AbsorptionVelocityPanel from '@/components/benchmarks/absorption/AbsorptionVelocityPanel';
import AdminNavBar from '@/app/components/AdminNavBar';
import type {
  Benchmark,
  AISuggestion,
  BenchmarkCategory,
  LandscaperMode,
  GrowthRateSet,
  AbsorptionVelocity
} from '@/types/benchmarks';

// Category definitions - Cost Factors only (no stage links)
const CATEGORIES: BenchmarkCategory[] = [
  { key: 'growth_rate', label: 'Growth Rates', icon: 'TrendingUp', count: 0 },
  { key: 'transaction_cost', label: 'Transaction Costs', icon: 'Receipt', count: 0 },
  { key: 'absorption', label: 'Absorption Velocity', icon: 'Timeline', count: 0 },
  { key: 'contingency', label: 'Contingency Standards', icon: 'Shield', count: 0 },
  { key: 'market_timing', label: 'Market Timing', icon: 'Schedule', count: 0 },
  { key: 'land_use_pricing', label: 'Land Use Pricing', icon: 'Landscape', count: 0 },
  { key: 'commission', label: 'Commission Structures', icon: 'Percent', count: 0 },
  { key: 'op_cost', label: 'Op Costs', icon: 'Business', count: 0 },
  { key: 'capital_stack', label: 'Capital Stack', icon: 'Layers', count: 0 },
  { key: 'debt_standard', label: 'Debt Standards', icon: 'CreditCard', count: 0 },
];

export default function GlobalBenchmarksPage() {
  // State
  const [selectedCategory, setSelectedCategory] = useState<BenchmarkCategory | null>(null);
  const [benchmarks, setBenchmarks] = useState<Record<string, Benchmark[]>>({});
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [landscaperMode, setLandscaperMode] = useState<LandscaperMode>('helpful');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingToCategory, setAddingToCategory] = useState<BenchmarkCategory | null>(null);
  const [growthRateSets, setGrowthRateSets] = useState<GrowthRateSet[]>([]);
  const [absorptionCount, setAbsorptionCount] = useState(0);
  const [totalCostLineItems, setTotalCostLineItems] = useState(0);
  const [leftPanelWidth, setLeftPanelWidth] = useState(33); // Percentage
  const [isDragging, setIsDragging] = useState(false);
  const [selectedTile, setSelectedTile] = useState<BenchmarksFlyoutSelection | null>(null);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    console.log('loadData called - refreshing all benchmark data');
    setLoading(true);
    setError(null);

    try {
      const [benchmarkRes, suggestionsRes, absorptionRes, unitCostTemplatesRes] = await Promise.all([
        fetch('/api/benchmarks'),
        fetch('/api/benchmarks/ai-suggestions'),
        fetch('/api/benchmarks/absorption-velocity'),
        fetch('/api/unit-costs/templates'),
      ]);

      if (!benchmarkRes.ok) {
        throw new Error('Failed to fetch benchmark registry');
      }

      const benchmarkData = await benchmarkRes.json();

      let suggestionsData: { suggestions?: AISuggestion[] } = {};
      if (!suggestionsRes.ok) {
        console.warn('Failed to load AI suggestions:', {
          status: suggestionsRes.status,
          statusText: suggestionsRes.statusText
        });
        suggestionsData = { suggestions: [] };
      } else {
        suggestionsData = await suggestionsRes.json();
      }

      let absorptionData: unknown = [];
      if (!absorptionRes.ok) {
        console.warn('Failed to load absorption velocities:', {
          status: absorptionRes.status,
          statusText: absorptionRes.statusText
        });
      } else {
        absorptionData = await absorptionRes.json();
      }

      // Load total cost line items count
      let templateCount = 0;
      if (!unitCostTemplatesRes.ok) {
        console.warn('Failed to load unit cost templates:', {
          status: unitCostTemplatesRes.status,
          statusText: unitCostTemplatesRes.statusText
        });
      } else {
        const templatesData = await unitCostTemplatesRes.json();
        templateCount = Array.isArray(templatesData.templates) ? templatesData.templates.length : 0;
      }

      const growthRatesData = await fetchGrowthRates();
      setAbsorptionCount(Array.isArray(absorptionData) ? absorptionData.length : 0);
      setTotalCostLineItems(templateCount);
      console.log('admin growth rates data loaded', {
        benchmarkCount: benchmarkData.benchmarks?.length,
        suggestionsCount: suggestionsData.suggestions?.length,
        growthRatesCount: growthRatesData.sets?.length,
        growthRateSets: growthRatesData.sets,
        totalCostLineItems: templateCount
      });

      // Group benchmarks by category
      const grouped: Record<string, Benchmark[]> = {};
      benchmarkData.benchmarks.forEach((b: Benchmark) => {
        if (!grouped[b.category]) {
          grouped[b.category] = [];
        }
        grouped[b.category].push(b);
      });

      setBenchmarks(grouped);
      setAiSuggestions(suggestionsData.suggestions || []);
      setGrowthRateSets(growthRatesData.sets || []);
      console.log('State updated with new data');
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  // Handle resize
  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newWidth = (e.clientX / window.innerWidth) * 100;
      // Constrain between 20% and 80%
      if (newWidth >= 20 && newWidth <= 80) {
        setLeftPanelWidth(newWidth);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleBenchmarkSelect = (category: BenchmarkCategory, benchmark: Benchmark) => {
    setSelectedTile({ kind: 'benchmark', category, benchmark });
  };

  const handleGrowthRateSelect = (set: GrowthRateSet) => {
    setSelectedTile({ kind: 'growth_rate', set });
  };

  const handleAbsorptionSelect = (record: AbsorptionVelocity) => {
    setSelectedTile({ kind: 'absorption', record });
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove as any);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove as any);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  // Update category counts
  const categoriesWithCounts = CATEGORIES.map(cat => {
    let count = benchmarks[cat.key]?.length || 0;
    if (cat.key === 'growth_rate') {
      count = growthRateSets.length;
    } else if (cat.key === 'absorption') {
      count = absorptionCount;
    }
    return { ...cat, count };
  });

  return (
    <div className="admin-benchmarks min-h-screen bg-surface-card text-text-primary">
      <AdminNavBar />
      <div className="p-4 space-y-4">
        <div className="rounded-lg border border-line-soft bg-surface-card shadow-sm overflow-hidden">
          {/* Header */}
        <div className="border-b border-line-soft p-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold whitespace-nowrap">Global Benchmarks</h1>
            <span className="text-xl font-bold leading-none text-text-secondary">·</span>
            <span className="text-sm text-text-secondary">
              Market intelligence: cost factors, rates, and timing standards
            </span>
          </div>
        </div>

        {/* Landscaper and Refresh Controls */}
        <div className="flex items-center justify-end gap-3 border-b border-line-soft bg-surface-card px-6 py-3">
          <div className="flex items-center gap-3">
            {/* Landscaper Mode Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-text-secondary">Landscaper:</label>
              <select
                value={landscaperMode}
                onChange={(e) => setLandscaperMode(e.target.value as LandscaperMode)}
                className="rounded border border-line-soft bg-surface-bg px-3 py-1.5 text-sm text-text-primary transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30 focus:outline-none"
              >
                <option value="silent">Silent Mode</option>
                <option value="helpful">Helpful Mode</option>
                <option value="teaching">Teaching Mode</option>
              </select>
            </div>
            <button
              onClick={loadData}
              className="btn btn-primary text-sm font-medium"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="m-4 rounded border border-chip-error/60 bg-chip-error/10 p-4 text-chip-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Split Panel Layout */}
        <div className="relative flex h-[calc(100vh-200px)]">
          {/* Left Panel - Accordion */}
          <div
            className="overflow-y-auto border-r border-line-soft"
            style={{ width: `${leftPanelWidth}%` }}
          >
            {loading ? (
              <div className="p-8 text-center text-text-secondary">
                Loading benchmarks...
              </div>
            ) : (
              categoriesWithCounts.map(category => {
                if (category.key === 'growth_rate') {
                  return (
                    <GrowthRateCategoryPanel
                      key={category.key}
                      category={category}
                      sets={growthRateSets}
                      isExpanded={selectedCategory?.key === category.key}
                      loading={loading}
                      selectedSetId={selectedTile?.kind === 'growth_rate' ? selectedTile.set.set_id : null}
                      onToggle={() =>
                        setSelectedCategory(
                          selectedCategory?.key === category.key ? null : category
                        )
                      }
                      onRefresh={loadData}
                      onSelectSet={handleGrowthRateSelect}
                    />
                  );
                }

                if (category.key === 'absorption') {
                  const isExpanded = selectedCategory?.key === category.key;
                  return (
                    <div key={category.key} className="border-b border-line-soft">
                      <button
                        onClick={() =>
                          setSelectedCategory(isExpanded ? null : category)
                        }
                        className="flex w-full items-center justify-between px-4 py-3 text-left text-text-primary transition-colors hover:bg-surface-card/80"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown size={20} className="text-text-secondary" />
                          ) : (
                            <ChevronRight size={20} className="text-text-secondary" />
                          )}
                          <span className="font-medium">{category.label}</span>
                        </div>
                        <span className="text-sm text-text-secondary">
                          {category.count}
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="bg-surface-bg">
                          <AbsorptionVelocityPanel
                            onCountUpdate={setAbsorptionCount}
                            onSelect={handleAbsorptionSelect}
                            selectedVelocityId={
                              selectedTile?.kind === 'absorption'
                                ? selectedTile.record.absorption_velocity_id
                                : null
                            }
                          />
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <BenchmarkAccordion
                    key={category.key}
                    category={category}
                    benchmarks={benchmarks[category.key] || []}
                    isExpanded={selectedCategory?.key === category.key}
                    onToggle={() =>
                      setSelectedCategory(
                        selectedCategory?.key === category.key ? null : category
                      )
                    }
                    onBenchmarkClick={(benchmark) => handleBenchmarkSelect(category, benchmark)}
                    onAddNew={() => {
                      setAddingToCategory(category);
                      setShowAddModal(true);
                    }}
                  />
                );
              })
            )}
          </div>

          {/* Resizer */}
          <div
            className={`absolute top-0 bottom-0 w-1 cursor-col-resize transition-colors ${isDragging ? 'bg-brand-primary' : 'bg-line-soft'} hover:bg-line-strong`}
            style={{ left: `${leftPanelWidth}%` }}
            onMouseDown={handleMouseDown}
          >
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-12 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-line-strong" />
          </div>

          {/* Right Panel - Flyout */}
          <div
            className="overflow-y-auto"
            style={{ width: `${100 - leftPanelWidth}%` }}
          >
            <BenchmarksFlyout
              selection={selectedTile}
              aiSuggestions={aiSuggestions}
              mode={landscaperMode}
              onRefresh={loadData}
            />
          </div>
        </div>

        {/* Add Benchmark Modal for non-growth categories */}
        {showAddModal && addingToCategory && (
          <AddBenchmarkModal
            category={addingToCategory.key}
            categoryLabel={addingToCategory.label}
            onClose={() => {
              setShowAddModal(false);
              setAddingToCategory(null);
            }}
            onSuccess={() => {
              loadData(); // Reload benchmarks after creation
            }}
          />
        )}
        </div>
      </div>
    </div>
  );
}

async function fetchGrowthRates(): Promise<{ sets: GrowthRateSet[] }> {
  try {
    console.log('Fetching growth rates from /api/benchmarks/growth-rates');
    const response = await fetch('/api/benchmarks/growth-rates');
    if (!response.ok) {
      const body = await response.text();
      console.warn('Failed to load growth rates:', { status: response.status, body });
      return { sets: [] };
    }
    const data = await response.json();
    console.log('Growth rates fetch response:', data);
    return {
      sets: Array.isArray(data.sets) ? data.sets : []
    };
  } catch (err) {
    console.error('Growth rates request failed:', err);
    return { sets: [] };
  }
}
