/**
 * BasicBudgetTable - Ultra-Simple Budget Table
 *
 * No external dependencies, just a clean HTML table showing budget structure.
 * This is a minimal MVP to validate the API and database schema.
 */

'use client';

import React, { useEffect, useState } from 'react';
import './BasicBudgetTable.css';

interface BudgetItem {
  fact_id: number;
  category_detail: string;
  category_code: string;
  qty: number;
  uom_code: string;
  rate: number;
  amount: number;
  start_date: string;
  end_date: string;
  escalation_rate: number;
  contingency_pct: number;
  parent_category_id: number | null;
  scope: string;
}

interface BasicBudgetTableProps {
  projectId: string | number;
  scope?: string;
  level?: string;
  entityId?: string | number;
}

export default function BasicBudgetTable({
  projectId,
  scope,
  level = 'project',
  entityId,
}: BasicBudgetTableProps) {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          projectId: String(projectId),
          ...(scope && { scope }),
          ...(level && { level }),
          ...(entityId && { entityId: String(entityId) }),
        });

        const response = await fetch(`/api/budget/gantt?${params}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        const data = await response.json();
        setItems(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [projectId, scope, level, entityId]);

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number | null | undefined, decimals = 2) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="basic-budget-loading">
        <div className="spinner" />
        <p>Loading budget data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="basic-budget-error">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="basic-budget-empty">
        <p>No budget items found for this project.</p>
        <p className="text-sm text-gray-500">
          Try creating budget items in the database first.
        </p>
      </div>
    );
  }

  return (
    <div className="basic-budget-table-container">
      <table className="basic-budget-table">
        <thead>
          <tr>
            <th>Budget Item</th>
            <th>Code</th>
            <th>Qty</th>
            <th>UOM</th>
            <th>Rate</th>
            <th>Amount</th>
            <th>Start</th>
            <th>End</th>
            <th>Escalation %</th>
            <th>Contingency %</th>
            <th>Scope</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isParent = !item.parent_category_id;
            const calculated = item.qty && item.rate ? item.qty * item.rate : item.amount;

            return (
              <tr key={item.fact_id} className={isParent ? 'parent-row' : 'child-row'}>
                <td className="text-left">
                  <span style={{ paddingLeft: isParent ? '0' : '24px' }}>
                    {item.category_detail || 'Unnamed'}
                  </span>
                </td>
                <td>{item.category_code || '-'}</td>
                <td className="numeric">{isParent ? '' : formatNumber(item.qty, 2)}</td>
                <td className="text-center">{isParent ? '' : item.uom_code || '-'}</td>
                <td className="numeric">{isParent ? '' : formatCurrency(item.rate)}</td>
                <td className={`numeric ${isParent ? 'parent-amount' : 'calculated-amount'}`}>
                  {formatCurrency(calculated)}
                </td>
                <td className="text-center">{formatDate(item.start_date)}</td>
                <td className="text-center">{formatDate(item.end_date)}</td>
                <td className="numeric">{isParent ? '' : formatNumber(item.escalation_rate, 2)}%</td>
                <td className="numeric">{isParent ? '' : formatNumber(item.contingency_pct, 2)}%</td>
                <td className="text-center">{item.scope || '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
