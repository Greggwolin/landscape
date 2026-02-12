'use client';

import React from 'react';

interface CategoryCardProps {
  category: string;
  label: string;
  amount: number;
  percentOfTotal: number;
  isOutlier: boolean;
  varianceFromMarket: number;
  isSelected: boolean;
  onClick: () => void;
}

export function CategoryCard({
  category,
  label,
  amount,
  percentOfTotal,
  isOutlier,
  varianceFromMarket,
  isSelected,
  onClick
}: CategoryCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        p-4 rounded-lg border cursor-pointer transition-all duration-200
        ${isSelected
          ? 'bg-gray-700 border-blue-500 ring-2 ring-blue-500/50'
          : 'bg-gray-800 border-gray-700 hover:border-gray-600 hover:bg-gray-750'
        }
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-200">{label}</h3>
        {isOutlier && (
          <span className="text-orange-400" title="Above market median">⚠️</span>
        )}
      </div>

      <div className="text-2xl font-bold text-white mb-1">
        ${amount.toLocaleString()}
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">{percentOfTotal}% of total</span>
        {varianceFromMarket !== 0 && (
          <span className={varianceFromMarket > 0 ? 'text-orange-400' : 'text-green-400'}>
            {varianceFromMarket > 0 ? '+' : ''}{varianceFromMarket}% vs market
          </span>
        )}
      </div>
    </div>
  );
}
