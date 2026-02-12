'use client';

import React from 'react';
import { CategoryCard } from './CategoryCard';
import { ComplexityTier } from '@/contexts/ComplexityModeContext';

interface CategoryData {
  key: string;
  label: string;
  amount: number;
  percentOfTotal: number;
  isOutlier: boolean;
  varianceFromMarket: number;
}

interface CategoryPanelProps {
  mode: ComplexityTier;
  categories: CategoryData[];
  selectedCategory: string | null;
  onCategorySelect: (categoryKey: string) => void;
}

export function CategoryPanel({
  mode,
  categories,
  selectedCategory,
  onCategorySelect
}: CategoryPanelProps) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Expense Categories</h3>
        <p className="text-xs text-gray-400 mt-1">
          Click a category to filter the detail table below
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {categories.map(category => (
          <CategoryCard
            key={category.key}
            category={category.key}
            label={category.label}
            amount={category.amount}
            percentOfTotal={category.percentOfTotal}
            isOutlier={category.isOutlier}
            varianceFromMarket={category.varianceFromMarket}
            isSelected={selectedCategory === category.key}
            onClick={() => onCategorySelect(category.key)}
          />
        ))}
      </div>

      {selectedCategory && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <button
            onClick={() => onCategorySelect('')}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            ← Clear filter (show all)
          </button>
        </div>
      )}
    </div>
  );
}
