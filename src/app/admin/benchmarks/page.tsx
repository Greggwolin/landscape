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
import AdminNavBar from '@/app/components/AdminNavBar';
import type {
  Benchmark,
  AISuggestion,
  BenchmarkCategory,
  LandscaperMode,
  GrowthRateSet
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
    <div className="min-h-screen" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
      <AdminNavBar />
      <div className="p-4 space-y-4">
        <div style={{ backgroundColor: 'var(--cui-card-bg)', borderColor: 'var(--cui-border-color)' }} className="rounded-lg shadow-sm border overflow-hidden">
          {/* Header */}
        <div className="p-6" style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold whitespace-nowrap" style={{ color: 'var(--cui-body-color)' }}>Global Benchmarks</h1>
            <span style={{ color: 'var(--cui-body-color)', fontSize: '1.5rem', fontWeight: 'bold', lineHeight: 1 }}>·</span>
            <span className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
              Market intelligence: cost factors, rates, and timing standards
            </span>
          </div>
        </div>

        {/* Landscaper and Refresh Controls */}
        <div className="px-6 py-3 flex items-center justify-end gap-3" style={{ borderBottom: '1px solid var(--cui-border-color)', backgroundColor: 'var(--cui-tertiary-bg)' }}>
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

        {/* Cost Library Card - Prominent Link */}
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--cui-border-color)', backgroundColor: 'var(--cui-tertiary-bg)' }}>
          <Link
            href="/admin/benchmarks/cost-library"
            className="block rounded-lg border-2 p-4 transition-all hover:shadow-lg"
            style={{
              borderColor: 'var(--cui-primary)',
              backgroundColor: 'var(--cui-card-bg)',
              textDecoration: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--cui-primary)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--cui-primary)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg p-2" style={{ backgroundColor: 'var(--cui-primary-bg)' }}>
                  <svg className="w-6 h-6" style={{ color: 'var(--cui-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--cui-body-color)' }}>
                    Cost Line Item Library →
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
                    View and manage cost benchmark database ({totalCostLineItems.toLocaleString()} line items)
                  </p>
                </div>
              </div>
              <ChevronRight size={24} style={{ color: 'var(--cui-primary)' }} />
            </div>
          </Link>
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
