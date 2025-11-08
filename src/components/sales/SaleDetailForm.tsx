/**
 * Sale Detail Form
 * Form for creating/editing parcel sale events
 * Phase 1: Single closing only
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useCreateSingleClosingSale } from '@/hooks/useSalesAbsorption';
import type { ParcelWithSale, SingleClosingSaleForm } from '@/types/sales-absorption';

interface Props {
  projectId: number;
  parcel: ParcelWithSale;
  onSave: () => void;
  onCancel: () => void;
}

export default function SaleDetailForm({ projectId, parcel, onSave, onCancel }: Props) {
  const createSale = useCreateSingleClosingSale();

  // Form state
  const [formData, setFormData] = useState<SingleClosingSaleForm>({
    parcel_id: parcel.parcel_id,
    buyer_entity: '',
    contract_date: new Date().toISOString().split('T')[0], // Today's date
    closing_date: '',
    total_lots: parcel.units,
    price_per_lot: parcel.current_value_per_unit,
    commissions_amount: 0,
    commissions_percent: 3, // Default 3%
    closing_costs: 0,
  });

  const [useCommissionPercent, setUseCommissionPercent] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<keyof SingleClosingSaleForm, string>>>({});

  // Calculate derived values
  const grossProceeds = formData.total_lots * formData.price_per_lot;
  const commissions = useCommissionPercent
    ? (grossProceeds * (formData.commissions_percent || 0)) / 100
    : formData.commissions_amount || 0;
  const netProceeds = grossProceeds - commissions - (formData.closing_costs || 0);

  // Update form field
  const handleChange = (field: keyof SingleClosingSaleForm, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof SingleClosingSaleForm, string>> = {};

    if (!formData.buyer_entity.trim()) {
      newErrors.buyer_entity = 'Buyer entity is required';
    }

    if (!formData.contract_date) {
      newErrors.contract_date = 'Contract date is required';
    }

    if (!formData.closing_date) {
      newErrors.closing_date = 'Closing date is required';
    } else if (formData.closing_date < formData.contract_date) {
      newErrors.closing_date = 'Closing date must be on or after contract date';
    }

    if (formData.total_lots <= 0) {
      newErrors.total_lots = 'Total lots must be greater than 0';
    }

    if (formData.price_per_lot <= 0) {
      newErrors.price_per_lot = 'Price per lot must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      await createSale.mutateAsync({
        ...formData,
        project_id: projectId,
        commissions_amount: commissions,
      });

      onSave();
    } catch (error) {
      console.error('Failed to create sale:', error);
      // Error is handled by React Query
    }
  };

  // Show existing sale if it exists
  if (parcel.sale_event) {
    return (
      <div className="bg-white p-6 rounded border border-blue-200">
        <h4 className="text-lg font-semibold mb-4 text-gray-800">Existing Sale Event</h4>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-gray-600 mb-1">Buyer</label>
            <div className="font-medium">{parcel.sale_event.buyer_entity}</div>
          </div>

          <div>
            <label className="block text-gray-600 mb-1">Contract Date</label>
            <div className="font-medium font-mono">
              {new Date(parcel.sale_event.contract_date).toLocaleDateString()}
            </div>
          </div>

          <div>
            <label className="block text-gray-600 mb-1">Lots Contracted</label>
            <div className="font-medium font-mono">
              {parcel.sale_event.total_lots_contracted.toLocaleString()}
            </div>
          </div>

          <div>
            <label className="block text-gray-600 mb-1">Price/Lot</label>
            <div className="font-medium font-mono">
              ${parcel.sale_event.base_price_per_lot?.toLocaleString()}
            </div>
          </div>

          <div>
            <label className="block text-gray-600 mb-1">Sale Type</label>
            <div className="font-medium capitalize">
              {parcel.sale_event.sale_type.replace('_', ' ')}
            </div>
          </div>

          <div>
            <label className="block text-gray-600 mb-1">Status</label>
            <div className="font-medium capitalize">{parcel.sale_event.sale_status}</div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // New sale form
  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded border border-gray-200">
      <h4 className="text-lg font-semibold mb-4 text-gray-800">Record New Sale - Single Closing</h4>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Buyer Entity */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Buyer Entity <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.buyer_entity}
            onChange={(e) => handleChange('buyer_entity', e.target.value)}
            className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.buyer_entity ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Builder or buyer company name"
          />
          {errors.buyer_entity && (
            <p className="mt-1 text-sm text-red-600">{errors.buyer_entity}</p>
          )}
        </div>

        {/* Contract Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contract Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.contract_date}
            onChange={(e) => handleChange('contract_date', e.target.value)}
            className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.contract_date ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.contract_date && (
            <p className="mt-1 text-sm text-red-600">{errors.contract_date}</p>
          )}
        </div>

        {/* Closing Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Closing Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.closing_date}
            onChange={(e) => handleChange('closing_date', e.target.value)}
            className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.closing_date ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.closing_date && (
            <p className="mt-1 text-sm text-red-600">{errors.closing_date}</p>
          )}
        </div>

        {/* Total Lots */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total Lots <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.total_lots}
            onChange={(e) => handleChange('total_lots', parseInt(e.target.value) || 0)}
            className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono ${
              errors.total_lots ? 'border-red-500' : 'border-gray-300'
            }`}
            min="1"
            max={parcel.units}
          />
          {errors.total_lots && (
            <p className="mt-1 text-sm text-red-600">{errors.total_lots}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">Max: {parcel.units} lots</p>
        </div>

        {/* Base Price/Lot */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Base Price/Lot <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.price_per_lot}
            onChange={(e) => handleChange('price_per_lot', parseFloat(e.target.value) || 0)}
            className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono ${
              errors.price_per_lot ? 'border-red-500' : 'border-gray-300'
            }`}
            min="0"
            step="0.01"
          />
          {errors.price_per_lot && (
            <p className="mt-1 text-sm text-red-600">{errors.price_per_lot}</p>
          )}
        </div>
      </div>

      {/* Financial Summary */}
      <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
        <h5 className="font-semibold text-gray-800 mb-3">Financial Summary</h5>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Gross Proceeds:</span>
            <span className="font-mono font-bold text-green-700">
              ${grossProceeds.toLocaleString()}
            </span>
          </div>

          {/* Commissions */}
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Less: Commissions</span>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={useCommissionPercent}
                  onChange={() => setUseCommissionPercent(true)}
                />
                <span className="text-xs">%</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={!useCommissionPercent}
                  onChange={() => setUseCommissionPercent(false)}
                />
                <span className="text-xs">$</span>
              </label>
            </div>
          </div>

          {useCommissionPercent ? (
            <div className="flex justify-between items-center pl-4">
              <input
                type="number"
                value={formData.commissions_percent || 0}
                onChange={(e) => handleChange('commissions_percent', parseFloat(e.target.value) || 0)}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-right font-mono text-sm"
                min="0"
                max="100"
                step="0.1"
              />
              <span className="font-mono text-red-600">-${commissions.toLocaleString()}</span>
            </div>
          ) : (
            <div className="flex justify-between items-center pl-4">
              <input
                type="number"
                value={formData.commissions_amount || 0}
                onChange={(e) => handleChange('commissions_amount', parseFloat(e.target.value) || 0)}
                className="w-32 px-2 py-1 border border-gray-300 rounded text-right font-mono text-sm"
                min="0"
                step="0.01"
              />
              <span className="font-mono text-red-600">-${commissions.toLocaleString()}</span>
            </div>
          )}

          {/* Closing Costs */}
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Less: Closing Costs</span>
            <input
              type="number"
              value={formData.closing_costs || 0}
              onChange={(e) => handleChange('closing_costs', parseFloat(e.target.value) || 0)}
              className="w-32 px-2 py-1 border border-gray-300 rounded text-right font-mono text-sm"
              min="0"
              step="0.01"
            />
          </div>
          <div className="flex justify-between pl-4">
            <span></span>
            <span className="font-mono text-red-600">
              -${(formData.closing_costs || 0).toLocaleString()}
            </span>
          </div>

          {/* Net Proceeds */}
          <div className="flex justify-between pt-2 border-t border-gray-300">
            <span className="font-semibold text-gray-800">Net Proceeds:</span>
            <span className="font-mono font-bold text-blue-700 text-lg">
              ${netProceeds.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={createSale.isPending}
          className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {createSale.isPending ? 'Saving...' : 'Save Sale'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={createSale.isPending}
          className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
      </div>

      {createSale.isError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          Failed to save sale. Please try again.
        </div>
      )}
    </form>
  );
}
