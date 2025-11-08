'use client';

/**
 * Global Benchmarks Library - Main Page
 * Split-screen layout with accordion (left) and Landscaper panel (right)
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
import BenchmarkAccordion from '@/components/benchmarks/BenchmarkAccordion';
import LandscaperPanel from '@/components/benchmarks/LandscaperPanel';
import AddBenchmarkModal from '@/components/benchmarks/AddBenchmarkModal';
import GrowthRateCategoryPanel from '@/components/benchmarks/GrowthRateCategoryPanel';
import AbsorptionVelocityPanel from '@/components/benchmarks/absorption/AbsorptionVelocityPanel';
import type {
  Benchmark,
  AISuggestion,
  BenchmarkCategory,
  LandscaperMode,
  GrowthRateSet
} from '@/types/benchmarks';

// Category definitions
const CATEGORIES: BenchmarkCategory[] = [
  { key: 'growth_rate', label: 'Growth Rates', icon: 'TrendingUp', count: 0 },
  { key: 'transaction_cost', label: 'Transaction Costs', icon: 'Receipt', count: 0 },
  { key: 'unit_cost_stage1', label: 'Stage 1 - Entitlements', icon: 'FileText', count: 0 },
  { key: 'unit_cost_stage2', label: 'Stage 2 - Engineering', icon: 'Ruler', count: 0 },
  { key: 'unit_cost_stage3', label: 'Stage 3 - Development', icon: 'Construction', count: 0 },
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
  const [unitCostStageCounts, setUnitCostStageCounts] = useState({
    stage1_entitlements: 0,
    stage2_engineering: 0,
    stage3_development: 0
  });
  const [leftPanelWidth, setLeftPanelWidth] = useState(33); // Percentage
  const [isDragging, setIsDragging] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    console.log('loadData called - refreshing all benchmark data');
    setLoading(true);
    setError(null);

    try {
      const [benchmarkRes, suggestionsRes, absorptionRes, unitCostCategoriesRes] = await Promise.all([
        fetch('/api/benchmarks'),
        fetch('/api/benchmarks/ai-suggestions'),
        fetch('/api/benchmarks/absorption-velocity'),
        fetch('/api/unit-costs/categories-by-stage'),
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

      // Load unit cost stage counts
      let unitCostData: any = {
        stage1_entitlements: [],
        stage2_engineering: [],
        stage3_development: []
      };
      if (!unitCostCategoriesRes.ok) {
        console.warn('Failed to load unit cost categories:', {
          status: unitCostCategoriesRes.status,
          statusText: unitCostCategoriesRes.statusText
        });
      } else {
        unitCostData = await unitCostCategoriesRes.json();
      }

      // Calculate template counts per stage
      const stageCounts = {
        stage1_entitlements: unitCostData.stage1_entitlements?.reduce((sum: number, cat: any) => sum + (cat.template_count || 0), 0) || 0,
        stage2_engineering: unitCostData.stage2_engineering?.reduce((sum: number, cat: any) => sum + (cat.template_count || 0), 0) || 0,
        stage3_development: unitCostData.stage3_development?.reduce((sum: number, cat: any) => sum + (cat.template_count || 0), 0) || 0
      };

      const growthRatesData = await fetchGrowthRates();
      setAbsorptionCount(Array.isArray(absorptionData) ? absorptionData.length : 0);
      setUnitCostStageCounts(stageCounts);
      console.log('admin growth rates data loaded', {
        benchmarkCount: benchmarkData.benchmarks?.length,
        suggestionsCount: suggestionsData.suggestions?.length,
        growthRatesCount: growthRatesData.sets?.length,
        growthRateSets: growthRatesData.sets,
        unitCostStageCounts: stageCounts
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
    } else if (cat.key === 'unit_cost_stage1') {
      count = unitCostStageCounts.stage1_entitlements;
    } else if (cat.key === 'unit_cost_stage2') {
      count = unitCostStageCounts.stage2_engineering;
    } else if (cat.key === 'unit_cost_stage3') {
      count = unitCostStageCounts.stage3_development;
    }
    return { ...cat, count };
  });

  return (
    <div className="p-4 space-y-4 min-h-screen" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
      <div style={{ backgroundColor: 'var(--cui-card-bg)', borderColor: 'var(--cui-border-color)' }} className="rounded-lg shadow-sm border overflow-hidden">
        {/* Breadcrumb Header */}
        <div className="flex justify-between items-center px-6 py-4" style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
            <a href="/preferences" style={{ color: 'var(--cui-primary)', textDecoration: 'none' }}>Global Preferences</a>
            <span style={{ color: 'var(--cui-border-color)' }}>/</span>
            <span>Benchmarks</span>
          </div>
        </div>

        {/* Header */}
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--cui-body-color)' }}>Global Benchmarks</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Landscaper Mode Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>Landscaper:</label>
              <select
                value={landscaperMode}
                onChange={(e) => setLandscaperMode(e.target.value as LandscaperMode)}
                className="border rounded px-3 py-1.5 text-sm"
                style={{
                  backgroundColor: 'var(--cui-body-bg)',
                  borderColor: 'var(--cui-border-color)',
                  color: 'var(--cui-body-color)'
                }}
              >
                <option value="silent">Silent Mode</option>
                <option value="helpful">Helpful Mode</option>
                <option value="teaching">Teaching Mode</option>
              </select>
            </div>
            <button
              onClick={loadData}
              className="px-4 py-2 rounded text-sm font-medium"
              style={{
                backgroundColor: 'var(--cui-primary)',
                color: 'white'
              }}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--cui-border-color)', backgroundColor: 'var(--cui-tertiary-bg)' }}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--cui-secondary-color)' }}>
              Benchmarks Admin
            </span>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/preferences?tab=unit-costs"
                className="rounded border px-3 py-1.5 text-xs font-medium transition"
                style={{
                  borderColor: 'var(--cui-success)',
                  backgroundColor: 'var(--cui-success-bg)',
                  color: 'var(--cui-success)'
                }}
              >
                Unit Cost Templates
              </Link>
              <Link
                href="/preferences?tab=products"
                className="rounded border px-3 py-1.5 text-xs font-medium transition"
                style={{
                  borderColor: 'var(--cui-info)',
                  backgroundColor: 'var(--cui-info-bg)',
                  color: 'var(--cui-info)'
                }}
              >
                Product Library & Standards
              </Link>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="m-4 p-4 border rounded" style={{ backgroundColor: 'var(--cui-danger-bg)', borderColor: 'var(--cui-danger)', color: 'var(--cui-danger)' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Split Panel Layout */}
        <div className="flex h-[calc(100vh-200px)] relative">
          {/* Left Panel - Accordion */}
          <div
            className="overflow-y-auto"
            style={{
              width: `${leftPanelWidth}%`,
              borderRight: '1px solid var(--cui-border-color)'
            }}
          >
            {loading ? (
              <div className="p-8 text-center" style={{ color: 'var(--cui-secondary-color)' }}>
                Loading benchmarks...
              </div>
            ) : (
              categoriesWithCounts.map(category => {
                // Handle unit cost stage tiles as navigation links
                if (category.key.startsWith('unit_cost_stage')) {
                  const stageMap: Record<string, string> = {
                    'unit_cost_stage1': 'stage1_entitlements',
                    'unit_cost_stage2': 'stage2_engineering',
                    'unit_cost_stage3': 'stage3_development'
                  };
                  const stage = stageMap[category.key];

                  return (
                    <div key={category.key} style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
                      <Link
                        href={`/benchmarks/unit-costs?stage=${stage}`}
                        className="flex w-full items-center justify-between px-4 py-3 transition-colors"
                        style={{
                          color: 'var(--cui-body-color)',
                          backgroundColor: 'transparent',
                          textDecoration: 'none'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--cui-tertiary-bg)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <ChevronRight size={20} style={{ color: 'var(--cui-secondary-color)' }} />
                          <span className="font-medium">{category.label}</span>
                        </div>
                        <span className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
                          {category.count} templates
                        </span>
                      </Link>
                    </div>
                  );
                }

                if (category.key === 'growth_rate') {
                  return (
                    <GrowthRateCategoryPanel
                      key={category.key}
                      category={category}
                      sets={growthRateSets}
                      isExpanded={selectedCategory?.key === category.key}
                      loading={loading}
                      onToggle={() =>
                        setSelectedCategory(
                          selectedCategory?.key === category.key ? null : category
                        )
                      }
                      onRefresh={loadData}
                    />
                  );
                }

                if (category.key === 'absorption') {
                  const isExpanded = selectedCategory?.key === category.key;
                  return (
                    <div key={category.key} style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
                      <button
                        onClick={() =>
                          setSelectedCategory(isExpanded ? null : category)
                        }
                        className="flex w-full items-center justify-between px-4 py-3 transition-colors"
                        style={{
                          color: 'var(--cui-body-color)',
                          backgroundColor: 'transparent'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--cui-tertiary-bg)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown size={20} style={{ color: 'var(--cui-secondary-color)' }} />
                          ) : (
                            <ChevronRight size={20} style={{ color: 'var(--cui-secondary-color)' }} />
                          )}
                          <span className="font-medium">{category.label}</span>
                        </div>
                        <span className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
                          {category.count}
                        </span>
                      </button>
                      {isExpanded && (
                        <div style={{ backgroundColor: 'var(--cui-body-bg)' }}>
                          <AbsorptionVelocityPanel onCountUpdate={setAbsorptionCount} />
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
                    onBenchmarkClick={() => {
                      // Inline editing now - no modal needed
                    }}
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
            className="absolute top-0 bottom-0 w-1 cursor-col-resize transition-colors"
            style={{
              left: `${leftPanelWidth}%`,
              backgroundColor: isDragging ? 'var(--cui-primary)' : 'var(--cui-border-color)'
            }}
            onMouseDown={handleMouseDown}
            onMouseEnter={(e) => !isDragging && (e.currentTarget.style.backgroundColor = 'var(--cui-secondary-color)')}
            onMouseLeave={(e) => !isDragging && (e.currentTarget.style.backgroundColor = 'var(--cui-border-color)')}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-12 rounded-full pointer-events-none" style={{ backgroundColor: 'var(--cui-secondary-color)' }} />
          </div>

          {/* Right Panel - Landscaper Assistant */}
          <div
            className="overflow-y-auto"
            style={{ width: `${100 - leftPanelWidth}%` }}
          >
            <LandscaperPanel
              selectedCategory={selectedCategory}
              aiSuggestions={aiSuggestions.filter(s =>
                !selectedCategory || s.category === selectedCategory.key
              )}
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
