'use client';

/**
 * DirectCapView Component
 *
 * Right panel (70% width) showing the Year 1 Pro Forma P&L table,
 * valuation calculation, key metrics, and sensitivity matrix.
 *
 * Session: QK-11 (original), QK-30 (3-column P&L)
 */

import React, { useState } from 'react';
import type { DirectCapViewProps, OpExItem, NOIBasis, ValueTile } from '@/types/income-approach';
import {
  formatCurrency,
  formatPercent,
  formatPerSF,
  formatMultiple,
  formatCurrencyCompact,
  NOI_BASIS_LABELS,
  TILE_COLORS,
} from '@/types/income-approach';
import SensitivityMatrix from './SensitivityMatrix';

export function DirectCapView({
  calculation,
  value,
  capRate,
  propertySummary,
  rentRollItems,
  opexItems,
  sensitivityMatrix,
  keyMetrics,
  selectedBasis,
  allTiles,
}: DirectCapViewProps) {
  const { unit_count: unitCount, total_sf: totalSf } = propertySummary;
  // Use these for single-column display fallback
  void rentRollItems; // Used by single-column table (not multi-column)

  // Column visibility state - default to showing all 3 columns
  const [visibleColumns, setVisibleColumns] = useState<Record<NOIBasis, boolean>>({
    f12_current: true,
    f12_market: true,
    stabilized: true,
  });

  // Toggle a column's visibility
  const toggleColumn = (basis: NOIBasis) => {
    setVisibleColumns((prev) => {
      // Ensure at least one column is always visible
      const newState = { ...prev, [basis]: !prev[basis] };
      const visibleCount = Object.values(newState).filter(Boolean).length;
      if (visibleCount === 0) return prev; // Don't allow hiding all columns
      return newState;
    });
  };

  // Get visible tiles in order
  const orderedBases: NOIBasis[] = ['f12_current', 'f12_market', 'stabilized'];
  const visibleTiles = allTiles
    ? orderedBases.filter((b) => visibleColumns[b]).map((b) => allTiles.find((t) => t.id === b)).filter(Boolean) as ValueTile[]
    : [];

  // Use multi-column view if allTiles provided and at least 2 visible
  const useMultiColumn = allTiles && visibleTiles.length > 0;

  return (
    <div className="space-y-6">
      {/* Method Toggle (placeholder for DCF in Phase 2) */}
      <div className="flex items-center gap-2">
        <button
          className="px-4 py-2 text-sm font-medium rounded-lg"
          style={{
            backgroundColor: 'var(--cui-primary)',
            color: 'white',
          }}
        >
          Direct Capitalization
        </button>
        <button
          className="px-4 py-2 text-sm font-medium rounded-lg opacity-50 cursor-not-allowed"
          style={{
            backgroundColor: 'var(--cui-tertiary-bg)',
            color: 'var(--cui-secondary-color)',
            border: '1px solid var(--cui-border-color)',
          }}
          disabled
          title="Coming in Phase 2"
        >
          DCF Analysis
        </button>
        <span
          className="ml-2 text-xs px-2 py-1 rounded"
          style={{
            backgroundColor: 'var(--cui-warning-bg)',
            color: 'var(--cui-warning)',
          }}
        >
          {NOI_BASIS_LABELS[selectedBasis]} Basis
        </span>
      </div>

      {/* Pro Forma P&L Table */}
      <div
        className="rounded-lg overflow-hidden"
        style={{
          backgroundColor: 'var(--cui-card-bg)',
          border: '1px solid var(--cui-border-color)',
        }}
      >
        <div
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--cui-border-color)' }}
        >
          <h3
            className="text-sm font-semibold uppercase tracking-wider"
            style={{ color: 'var(--cui-body-color)' }}
          >
            Year 1 Pro Forma P&L
          </h3>

          {/* Column Toggle Buttons */}
          {allTiles && (
            <div className="flex items-center gap-2">
              <span className="text-xs mr-2" style={{ color: 'var(--cui-secondary-color)' }}>
                Columns:
              </span>
              {orderedBases.map((basis) => {
                const colors = TILE_COLORS[basis];
                const isVisible = visibleColumns[basis];
                return (
                  <button
                    key={basis}
                    onClick={() => toggleColumn(basis)}
                    className="px-2 py-1 text-xs rounded transition-all"
                    style={{
                      backgroundColor: isVisible ? colors.bg : 'transparent',
                      border: `1px solid ${isVisible ? colors.border : 'var(--cui-border-color)'}`,
                      color: isVisible ? colors.text : 'var(--cui-secondary-color)',
                      opacity: isVisible ? 1 : 0.5,
                    }}
                  >
                    {NOI_BASIS_LABELS[basis]}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 overflow-x-auto">
          {useMultiColumn ? (
            <MultiColumnPLTable
              tiles={visibleTiles}
              opexItems={opexItems}
              unitCount={unitCount}
              totalSf={totalSf}
              selectedBasis={selectedBasis}
            />
          ) : (
            <table className="w-full text-sm" style={{ fontFamily: 'monospace' }}>
              <thead>
                <tr style={{ color: 'var(--cui-secondary-color)' }}>
                  <th className="text-left py-2 w-1/2"></th>
                  <th className="text-right py-2 w-1/6">Amount</th>
                  <th className="text-right py-2 w-1/6">$/Unit</th>
                  <th className="text-right py-2 w-1/6">$/SF</th>
                </tr>
              </thead>
              <tbody>
                {/* REVENUE SECTION */}
                <tr>
                  <td
                    colSpan={4}
                    className="pt-4 pb-2 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--cui-primary)' }}
                  >
                    Revenue
                  </td>
                </tr>

                <TableRow
                  label="Gross Potential Rent"
                  amount={calculation.gpr}
                  unitCount={unitCount}
                  totalSf={totalSf}
                />
                <TableRow
                  label={`Less: Vacancy (${formatPercent(calculation.vacancy_rate, 1)})`}
                  amount={-calculation.vacancy_loss}
                  unitCount={unitCount}
                  totalSf={totalSf}
                  isNegative
                />
                <TableRow
                  label={`Less: Credit Loss (${formatPercent(calculation.credit_loss_rate, 1)})`}
                  amount={-calculation.credit_loss}
                  unitCount={unitCount}
                  totalSf={totalSf}
                  isNegative
                />
                {calculation.other_income > 0 && (
                  <TableRow
                    label="Plus: Other Income"
                    amount={calculation.other_income}
                    unitCount={unitCount}
                    totalSf={totalSf}
                  />
                )}

                <SubtotalRow
                  label="Effective Gross Income"
                  amount={calculation.egi}
                  unitCount={unitCount}
                  totalSf={totalSf}
                />

                {/* OPERATING EXPENSES SECTION */}
                <tr>
                  <td
                    colSpan={4}
                    className="pt-6 pb-2 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--cui-primary)' }}
                  >
                    Operating Expenses
                  </td>
                </tr>

                {opexItems.map((item, idx) => (
                  <TableRow
                    key={idx}
                    label={item.category || item.expense_type}
                    amount={item.annual_amount}
                    unitCount={unitCount}
                    totalSf={totalSf}
                  />
                ))}

                <TableRow
                  label={`Management Fee (${formatPercent(calculation.management_fee_pct, 1)})`}
                  amount={calculation.management_fee}
                  unitCount={unitCount}
                  totalSf={totalSf}
                />
                <TableRow
                  label="Replacement Reserves"
                  amount={calculation.replacement_reserves}
                  unitCount={unitCount}
                  totalSf={totalSf}
                />

                <SubtotalRow
                  label="Total Operating Expenses"
                  amount={calculation.total_opex}
                  unitCount={unitCount}
                  totalSf={totalSf}
                />

                {/* Expense Ratio */}
                <tr style={{ color: 'var(--cui-secondary-color)' }}>
                  <td className="py-1 text-xs">Expense Ratio</td>
                  <td className="text-right py-1 text-xs" colSpan={3}>
                    {formatPercent(calculation.expense_ratio, 1)}
                  </td>
                </tr>

                {/* NOI */}
                <TotalRow
                  label="NET OPERATING INCOME"
                  amount={calculation.noi}
                  unitCount={unitCount}
                  totalSf={totalSf}
                />
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Valuation Section */}
      <div
        className="rounded-lg overflow-hidden"
        style={{
          backgroundColor: 'var(--cui-card-bg)',
          border: '1px solid var(--cui-border-color)',
        }}
      >
        <div
          className="px-4 py-3 border-b"
          style={{ borderColor: 'var(--cui-border-color)' }}
        >
          <h3
            className="text-sm font-semibold uppercase tracking-wider"
            style={{ color: 'var(--cui-body-color)' }}
          >
            Valuation ({NOI_BASIS_LABELS[selectedBasis]} Basis)
          </h3>
        </div>

        <div className="p-4">
          <table className="w-full text-sm" style={{ fontFamily: 'monospace' }}>
            <tbody>
              <tr style={{ color: 'var(--cui-body-color)' }}>
                <td className="py-2">NOI to Capitalize</td>
                <td className="text-right py-2">{formatCurrency(calculation.noi)}</td>
              </tr>
              <tr style={{ color: 'var(--cui-body-color)' }}>
                <td className="py-2">Capitalization Rate</td>
                <td className="text-right py-2">{formatPercent(capRate)}</td>
              </tr>
              <tr
                className="border-t-2"
                style={{
                  borderColor: 'var(--cui-primary)',
                  color: 'var(--cui-body-color)',
                }}
              >
                <td className="py-3 font-bold text-lg">INDICATED VALUE</td>
                <td
                  className="text-right py-3 font-bold text-lg"
                  style={{ color: 'var(--cui-success)' }}
                >
                  {value ? formatCurrency(value) : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Metrics */}
      <div
        className="rounded-lg p-4"
        style={{
          backgroundColor: 'var(--cui-card-bg)',
          border: '1px solid var(--cui-border-color)',
        }}
      >
        <h3
          className="text-sm font-semibold uppercase tracking-wider mb-4"
          style={{ color: 'var(--cui-body-color)' }}
        >
          Key Metrics
        </h3>

        <div className="grid grid-cols-3 gap-4">
          <MetricCard label="Price per Unit" value={formatCurrency(keyMetrics.price_per_unit)} />
          <MetricCard label="Price per SF" value={formatPerSF(keyMetrics.price_per_sf)} />
          <MetricCard label="Gross Rent Multiplier" value={formatMultiple(keyMetrics.grm)} />
          <MetricCard label="Expense Ratio" value={formatPercent(keyMetrics.expense_ratio, 1)} />
          <MetricCard label="OpEx per Unit" value={formatCurrency(keyMetrics.opex_per_unit)} />
          <MetricCard
            label="Break-even Occupancy"
            value={formatPercent(keyMetrics.break_even_occupancy, 1)}
          />
        </div>
      </div>

      {/* Sensitivity Matrix */}
      <SensitivityMatrix
        data={sensitivityMatrix}
        selectedCapRate={capRate}
        unitCount={unitCount}
      />
    </div>
  );
}

// ============================================================================
// TABLE COMPONENTS
// ============================================================================

interface TableRowProps {
  label: string;
  amount: number;
  unitCount: number;
  totalSf: number;
  isNegative?: boolean;
}

function TableRow({ label, amount, unitCount, totalSf, isNegative }: TableRowProps) {
  const perUnit = unitCount > 0 ? amount / unitCount : 0;
  const perSf = totalSf > 0 ? amount / totalSf : 0;

  return (
    <tr
      style={{
        color: isNegative ? 'var(--cui-danger)' : 'var(--cui-body-color)',
      }}
    >
      <td className="py-1.5 pl-4">{label}</td>
      <td className="text-right py-1.5">
        {isNegative ? `(${formatCurrency(Math.abs(amount))})` : formatCurrency(amount)}
      </td>
      <td className="text-right py-1.5">
        {isNegative ? `(${formatCurrency(Math.abs(perUnit))})` : formatCurrency(perUnit)}
      </td>
      <td className="text-right py-1.5">${perSf.toFixed(2)}</td>
    </tr>
  );
}

interface SubtotalRowProps {
  label: string;
  amount: number;
  unitCount: number;
  totalSf: number;
}

function SubtotalRow({ label, amount, unitCount, totalSf }: SubtotalRowProps) {
  const perUnit = unitCount > 0 ? amount / unitCount : 0;
  const perSf = totalSf > 0 ? amount / totalSf : 0;

  return (
    <tr
      className="border-t"
      style={{
        borderColor: 'var(--cui-border-color)',
        color: 'var(--cui-body-color)',
      }}
    >
      <td className="py-2 font-medium">{label}</td>
      <td className="text-right py-2 font-medium">{formatCurrency(amount)}</td>
      <td className="text-right py-2 font-medium">{formatCurrency(perUnit)}</td>
      <td className="text-right py-2 font-medium">${perSf.toFixed(2)}</td>
    </tr>
  );
}

interface TotalRowProps {
  label: string;
  amount: number;
  unitCount: number;
  totalSf: number;
}

function TotalRow({ label, amount, unitCount, totalSf }: TotalRowProps) {
  const perUnit = unitCount > 0 ? amount / unitCount : 0;
  const perSf = totalSf > 0 ? amount / totalSf : 0;

  return (
    <tr
      className="border-t-2 border-b-2"
      style={{
        borderColor: 'var(--cui-primary)',
        backgroundColor: 'var(--cui-tertiary-bg)',
      }}
    >
      <td
        className="py-3 font-bold"
        style={{ color: 'var(--cui-body-color)' }}
      >
        {label}
      </td>
      <td
        className="text-right py-3 font-bold"
        style={{ color: 'var(--cui-success)' }}
      >
        {formatCurrency(amount)}
      </td>
      <td
        className="text-right py-3 font-bold"
        style={{ color: 'var(--cui-success)' }}
      >
        {formatCurrency(perUnit)}
      </td>
      <td
        className="text-right py-3 font-bold"
        style={{ color: 'var(--cui-success)' }}
      >
        ${perSf.toFixed(2)}
      </td>
    </tr>
  );
}

// ============================================================================
// METRIC CARD
// ============================================================================

interface MetricCardProps {
  label: string;
  value: string;
}

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div
      className="p-3 rounded"
      style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}
    >
      <div
        className="text-xs mb-1"
        style={{ color: 'var(--cui-secondary-color)' }}
      >
        {label}
      </div>
      <div
        className="text-lg font-semibold"
        style={{ color: 'var(--cui-body-color)' }}
      >
        {value}
      </div>
    </div>
  );
}

// ============================================================================
// MULTI-COLUMN P&L TABLE (3-column view)
// ============================================================================

interface MultiColumnPLTableProps {
  tiles: ValueTile[];
  opexItems: OpExItem[];
  unitCount: number;
  totalSf: number;
  selectedBasis: NOIBasis;
}

function MultiColumnPLTable({
  tiles,
  opexItems,
  unitCount,
  totalSf,
  selectedBasis,
}: MultiColumnPLTableProps) {
  const colCount = tiles.length;

  return (
    <table className="w-full text-sm" style={{ fontFamily: 'monospace' }}>
      <thead>
        <tr style={{ color: 'var(--cui-secondary-color)' }}>
          <th className="text-left py-2" style={{ width: '40%' }}></th>
          {tiles.map((tile) => {
            const colors = TILE_COLORS[tile.id];
            const isSelected = tile.id === selectedBasis;
            return (
              <th
                key={tile.id}
                className="text-right py-2 px-2"
                style={{
                  color: colors.text,
                  fontWeight: isSelected ? 'bold' : 'normal',
                  borderBottom: isSelected ? `2px solid ${colors.border}` : undefined,
                }}
              >
                {NOI_BASIS_LABELS[tile.id]}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {/* REVENUE SECTION */}
        <tr>
          <td
            colSpan={colCount + 1}
            className="pt-4 pb-2 text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--cui-primary)' }}
          >
            Revenue
          </td>
        </tr>

        <MultiColRow
          label="Gross Potential Rent"
          values={tiles.map((t) => t.calculation.gpr)}
          tileIds={tiles.map((t) => t.id)}
          selectedBasis={selectedBasis}
        />
        <MultiColRow
          label={`Less: Vacancy`}
          values={tiles.map((t) => -t.calculation.vacancy_loss)}
          rates={tiles.map((t) => t.calculation.vacancy_rate)}
          tileIds={tiles.map((t) => t.id)}
          selectedBasis={selectedBasis}
          isNegative
        />
        <MultiColRow
          label={`Less: Credit Loss`}
          values={tiles.map((t) => -t.calculation.credit_loss)}
          rates={tiles.map((t) => t.calculation.credit_loss_rate)}
          tileIds={tiles.map((t) => t.id)}
          selectedBasis={selectedBasis}
          isNegative
        />
        {tiles.some((t) => t.calculation.other_income > 0) && (
          <MultiColRow
            label="Plus: Other Income"
            values={tiles.map((t) => t.calculation.other_income)}
            tileIds={tiles.map((t) => t.id)}
            selectedBasis={selectedBasis}
          />
        )}

        <MultiColSubtotalRow
          label="Effective Gross Income"
          values={tiles.map((t) => t.calculation.egi)}
          tileIds={tiles.map((t) => t.id)}
          selectedBasis={selectedBasis}
        />

        {/* OPERATING EXPENSES SECTION */}
        <tr>
          <td
            colSpan={colCount + 1}
            className="pt-6 pb-2 text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--cui-primary)' }}
          >
            Operating Expenses
          </td>
        </tr>

        {opexItems.map((item, idx) => (
          <MultiColRow
            key={idx}
            label={item.category || item.expense_type}
            values={tiles.map(() => item.annual_amount)}
            tileIds={tiles.map((t) => t.id)}
            selectedBasis={selectedBasis}
          />
        ))}

        <MultiColRow
          label="Management Fee"
          values={tiles.map((t) => t.calculation.management_fee)}
          rates={tiles.map((t) => t.calculation.management_fee_pct)}
          tileIds={tiles.map((t) => t.id)}
          selectedBasis={selectedBasis}
        />
        <MultiColRow
          label="Replacement Reserves"
          values={tiles.map((t) => t.calculation.replacement_reserves)}
          tileIds={tiles.map((t) => t.id)}
          selectedBasis={selectedBasis}
        />

        <MultiColSubtotalRow
          label="Total Operating Expenses"
          values={tiles.map((t) => t.calculation.total_opex)}
          tileIds={tiles.map((t) => t.id)}
          selectedBasis={selectedBasis}
        />

        {/* Expense Ratio */}
        <tr style={{ color: 'var(--cui-secondary-color)' }}>
          <td className="py-1 text-xs pl-4">Expense Ratio</td>
          {tiles.map((tile) => (
            <td
              key={tile.id}
              className="text-right py-1 text-xs px-2"
              style={{
                fontWeight: tile.id === selectedBasis ? 'bold' : 'normal',
              }}
            >
              {formatPercent(tile.calculation.expense_ratio, 1)}
            </td>
          ))}
        </tr>

        {/* NOI */}
        <MultiColTotalRow
          label="NET OPERATING INCOME"
          values={tiles.map((t) => t.calculation.noi)}
          tileIds={tiles.map((t) => t.id)}
          selectedBasis={selectedBasis}
        />

        {/* VALUATION SECTION */}
        <tr>
          <td
            colSpan={colCount + 1}
            className="pt-6 pb-2 text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--cui-primary)' }}
          >
            Valuation
          </td>
        </tr>

        <tr style={{ color: 'var(--cui-secondary-color)' }}>
          <td className="py-1 pl-4">Cap Rate</td>
          {tiles.map((tile) => (
            <td key={tile.id} className="text-right py-1 px-2">
              {formatPercent(tile.cap_rate)}
            </td>
          ))}
        </tr>

        <tr
          className="border-t-2"
          style={{ borderColor: 'var(--cui-primary)' }}
        >
          <td
            className="py-3 font-bold"
            style={{ color: 'var(--cui-body-color)' }}
          >
            INDICATED VALUE
          </td>
          {tiles.map((tile) => {
            const colors = TILE_COLORS[tile.id];
            const isSelected = tile.id === selectedBasis;
            return (
              <td
                key={tile.id}
                className="text-right py-3 font-bold px-2"
                style={{
                  color: isSelected ? 'var(--cui-success)' : colors.text,
                  fontSize: isSelected ? '1.1em' : '1em',
                }}
              >
                {tile.value ? formatCurrencyCompact(tile.value) : '—'}
              </td>
            );
          })}
        </tr>

        {/* Price per Unit */}
        <tr style={{ color: 'var(--cui-secondary-color)' }}>
          <td className="py-1 pl-4 text-xs">Price per Unit</td>
          {tiles.map((tile) => (
            <td key={tile.id} className="text-right py-1 px-2 text-xs">
              {tile.price_per_unit ? formatCurrency(tile.price_per_unit) : '—'}
            </td>
          ))}
        </tr>

        {/* Price per SF */}
        <tr style={{ color: 'var(--cui-secondary-color)' }}>
          <td className="py-1 pl-4 text-xs">Price per SF</td>
          {tiles.map((tile) => (
            <td key={tile.id} className="text-right py-1 px-2 text-xs">
              {tile.price_per_sf ? `$${tile.price_per_sf.toFixed(2)}` : '—'}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

// ============================================================================
// MULTI-COLUMN ROW COMPONENTS
// ============================================================================

interface MultiColRowProps {
  label: string;
  values: number[];
  rates?: number[];
  tileIds: NOIBasis[];
  selectedBasis: NOIBasis;
  isNegative?: boolean;
}

function MultiColRow({ label, values, rates, tileIds, selectedBasis, isNegative }: MultiColRowProps) {
  return (
    <tr
      style={{
        color: isNegative ? 'var(--cui-danger)' : 'var(--cui-body-color)',
      }}
    >
      <td className="py-1.5 pl-4">
        {label}
        {rates && rates[0] !== undefined && (
          <span className="text-xs ml-1" style={{ color: 'var(--cui-secondary-color)' }}>
            ({formatPercent(rates[0], 1)})
          </span>
        )}
      </td>
      {values.map((amount, idx) => {
        const isSelected = tileIds[idx] === selectedBasis;
        return (
          <td
            key={tileIds[idx]}
            className="text-right py-1.5 px-2"
            style={{ fontWeight: isSelected ? 'bold' : 'normal' }}
          >
            {isNegative
              ? `(${formatCurrency(Math.abs(amount))})`
              : formatCurrency(amount)}
          </td>
        );
      })}
    </tr>
  );
}

interface MultiColSubtotalRowProps {
  label: string;
  values: number[];
  tileIds: NOIBasis[];
  selectedBasis: NOIBasis;
}

function MultiColSubtotalRow({ label, values, tileIds, selectedBasis }: MultiColSubtotalRowProps) {
  return (
    <tr
      className="border-t"
      style={{
        borderColor: 'var(--cui-border-color)',
        color: 'var(--cui-body-color)',
      }}
    >
      <td className="py-2 font-medium">{label}</td>
      {values.map((amount, idx) => {
        const isSelected = tileIds[idx] === selectedBasis;
        return (
          <td
            key={tileIds[idx]}
            className="text-right py-2 font-medium px-2"
            style={{ fontWeight: isSelected ? 'bold' : 'normal' }}
          >
            {formatCurrency(amount)}
          </td>
        );
      })}
    </tr>
  );
}

interface MultiColTotalRowProps {
  label: string;
  values: number[];
  tileIds: NOIBasis[];
  selectedBasis: NOIBasis;
}

function MultiColTotalRow({ label, values, tileIds, selectedBasis }: MultiColTotalRowProps) {
  return (
    <tr
      className="border-t-2 border-b-2"
      style={{
        borderColor: 'var(--cui-primary)',
        backgroundColor: 'var(--cui-tertiary-bg)',
      }}
    >
      <td
        className="py-3 font-bold"
        style={{ color: 'var(--cui-body-color)' }}
      >
        {label}
      </td>
      {values.map((amount, idx) => {
        const colors = TILE_COLORS[tileIds[idx]];
        const isSelected = tileIds[idx] === selectedBasis;
        return (
          <td
            key={tileIds[idx]}
            className="text-right py-3 font-bold px-2"
            style={{
              color: isSelected ? 'var(--cui-success)' : colors.text,
            }}
          >
            {formatCurrency(amount)}
          </td>
        );
      })}
    </tr>
  );
}

export default DirectCapView;
