'use client';

import React from 'react';
import type { SaleTransaction } from '@/utils/sales/salesAggregation';
import TransactionColumn from './TransactionColumn';

interface TransactionGridProps {
  sales: SaleTransaction[];
  projectId: number;
  onSaveNameOptimistic: (saleDate: string, newName: string) => void;
}

export default function TransactionGrid({ sales, projectId, onSaveNameOptimistic }: TransactionGridProps) {
  if (sales.length === 0) {
    return (
      <div className="text-center py-5 text-muted">
        No sales match the selected filter.
      </div>
    );
  }

  return (
    <div
      className="transaction-grid"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        width: '100%',
        paddingBottom: '1rem',
      }}
    >
      {sales.map(sale => (
        <TransactionColumn
          key={sale.saleDate}
          sale={sale}
          projectId={projectId}
          onSaveNameOptimistic={onSaveNameOptimistic}
        />
      ))}
    </div>
  );
}
