'use client';

import React from 'react';
import { Check, AlertCircle } from 'lucide-react';
import type { ChannelTab, FieldValue } from './types';

interface SimplifiedChannelViewProps {
  channel: ChannelTab;
  fields: Map<string, FieldValue>;
  allFieldKeys: string[];
  isDark?: boolean;
  onFieldEdit?: (fieldKey: string, value: any) => void;
}

// Field labels - in production this would come from FieldRegistry
const FIELD_LABELS: Record<string, string> = {
  // Property
  property_name: 'Property Name',
  street_address: 'Street Address',
  city: 'City',
  state: 'State',
  zip_code: 'ZIP Code',
  property_type: 'Property Type',
  property_class: 'Property Class',
  total_units: 'Total Units',
  year_built: 'Year Built',
  year_renovated: 'Year Renovated',
  stories: 'Stories',
  rentable_sf: 'Rentable SF',
  lot_size_acres: 'Lot Size (Acres)',
  parking_spaces_total: 'Parking Spaces',
  parking_ratio: 'Parking Ratio',
  // Budget - OpEx
  opex_real_estate_taxes: 'Real Estate Taxes',
  opex_property_insurance: 'Property Insurance',
  opex_utilities_water: 'Water/Sewer',
  opex_utilities_electric: 'Electric',
  opex_utilities_gas: 'Gas',
  opex_repairs_maintenance: 'Repairs & Maintenance',
  opex_contract_services: 'Contract Services',
  opex_turnover_costs: 'Turnover/Make-Ready',
  opex_landscaping: 'Landscaping',
  opex_management_fee: 'Management Fee',
  opex_payroll: 'Payroll',
  // Budget - Income
  income_parking: 'Parking Income',
  income_laundry: 'Laundry/Vending',
  income_pet_fees: 'Pet Fees',
  income_storage: 'Storage Income',
  income_utility_reimbursement: 'Utility Reimbursement',
  // Market
  submarket: 'Submarket',
  submarket_vacancy: 'Submarket Vacancy',
  submarket_rent_growth: 'Rent Growth',
  submarket_avg_rent: 'Average Rent',
  submarket_occupancy: 'Occupancy',
  median_hh_income_1mi: 'Median HH Income (1mi)',
  population_3mi: 'Population (3mi)',
  walk_score: 'Walk Score',
  transit_score: 'Transit Score',
  // Underwriter
  asking_price: 'Asking Price',
  acquisition_price: 'Acquisition Price',
  cap_rate_going_in: 'Going-In Cap Rate',
  cap_rate_exit: 'Exit Cap Rate',
  hold_period_years: 'Hold Period (Years)',
  physical_vacancy_pct: 'Physical Vacancy %',
  economic_vacancy_pct: 'Economic Vacancy %',
  rent_growth_year_1: 'Year 1 Rent Growth',
  rent_growth_stabilized: 'Stabilized Rent Growth',
  expense_growth_pct: 'Expense Growth %',
  discount_rate: 'Discount Rate',
  loss_to_lease_pct: 'Loss to Lease %',
};

// Field type hints for formatting
const CURRENCY_FIELDS = [
  'asking_price',
  'acquisition_price',
  'rentable_sf',
  'opex_real_estate_taxes',
  'opex_property_insurance',
  'opex_utilities_water',
  'opex_utilities_electric',
  'opex_utilities_gas',
  'opex_repairs_maintenance',
  'opex_contract_services',
  'opex_turnover_costs',
  'opex_landscaping',
  'opex_management_fee',
  'opex_payroll',
  'income_parking',
  'income_laundry',
  'income_pet_fees',
  'income_storage',
  'income_utility_reimbursement',
  'submarket_avg_rent',
  'median_hh_income_1mi',
];

const PERCENTAGE_FIELDS = [
  'cap_rate_going_in',
  'cap_rate_exit',
  'physical_vacancy_pct',
  'economic_vacancy_pct',
  'rent_growth_year_1',
  'rent_growth_stabilized',
  'expense_growth_pct',
  'discount_rate',
  'loss_to_lease_pct',
  'submarket_vacancy',
  'submarket_rent_growth',
  'submarket_occupancy',
  'parking_ratio',
];

function formatValue(value: any, fieldKey: string): string {
  if (value === null || value === undefined) return '';

  const num = Number(value);

  if (CURRENCY_FIELDS.includes(fieldKey)) {
    if (!isNaN(num)) {
      if (fieldKey === 'rentable_sf') {
        return num.toLocaleString();
      }
      return '$' + num.toLocaleString();
    }
  }

  if (PERCENTAGE_FIELDS.includes(fieldKey)) {
    if (!isNaN(num)) {
      return num.toFixed(2) + '%';
    }
  }

  if (typeof value === 'number') {
    return value.toLocaleString();
  }

  return String(value);
}

export default function SimplifiedChannelView({
  channel,
  fields,
  allFieldKeys,
  isDark = false,
  onFieldEdit,
}: SimplifiedChannelViewProps) {
  // Group fields by whether they're populated
  const populatedFields = allFieldKeys.filter((key) => fields.has(key));
  const emptyFields = allFieldKeys.filter((key) => !fields.has(key));

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) {
      return (
        <span className="flex items-center gap-0.5 text-green-600 text-xs">
          <Check className="h-3 w-3" />
        </span>
      );
    }
    if (confidence >= 0.7) {
      return (
        <span className="text-amber-500 text-xs" title={`${Math.round(confidence * 100)}% confidence`}>
          {Math.round(confidence * 100)}%
        </span>
      );
    }
    return (
      <span className="flex items-center gap-0.5 text-red-500 text-xs" title="Low confidence">
        <AlertCircle className="h-3 w-3" />
      </span>
    );
  };

  return (
    <div className="p-3 space-y-4">
      {/* Populated Fields */}
      {populatedFields.length > 0 && (
        <div className="space-y-1">
          {populatedFields.map((fieldKey) => {
            const field = fields.get(fieldKey)!;
            const label = FIELD_LABELS[fieldKey] || fieldKey;

            return (
              <div
                key={fieldKey}
                className={`flex items-center justify-between py-1.5 px-2 rounded ${
                  isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                }`}
              >
                <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {label}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                    {formatValue(field.value, fieldKey)}
                  </span>
                  {field.confidence < 1 && getConfidenceBadge(field.confidence)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty Fields Section */}
      {emptyFields.length > 0 && (
        <div>
          <div className={`text-xs font-medium mb-2 px-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Not yet populated ({emptyFields.length})
          </div>
          <div className="space-y-0.5">
            {emptyFields.slice(0, 5).map((fieldKey) => {
              const label = FIELD_LABELS[fieldKey] || fieldKey;

              return (
                <div
                  key={fieldKey}
                  className={`flex items-center justify-between py-1 px-2 rounded ${
                    isDark ? 'text-slate-600' : 'text-slate-300'
                  }`}
                >
                  <span className="text-xs">{label}</span>
                  <span className="text-xs">—</span>
                </div>
              );
            })}
            {emptyFields.length > 5 && (
              <div className={`text-xs px-2 py-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                +{emptyFields.length - 5} more fields
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {populatedFields.length === 0 && emptyFields.length === 0 && (
        <div className={`text-center py-8 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          <p className="text-sm">No fields in this category</p>
        </div>
      )}
    </div>
  );
}
