/**
 * ComparableCard Component
 *
 * Displays individual sales comparable with key metrics
 */

'use client';

import React, { useState } from 'react';
import type { SalesComparable } from '@/types/valuation';
import { LandscapeButton } from '@/components/ui/landscape';
import EntityMediaDisplay from '@/components/shared/EntityMediaDisplay';
import MediaPickerModal from '@/components/dms/modals/MediaPickerModal';

interface ComparableCardProps {
  comparable: SalesComparable;
  projectId: number;
  onEdit?: (comp: SalesComparable) => void;
  onDelete?: (id: number) => void;
}

export function ComparableCard({ comparable, projectId, onEdit, onDelete }: ComparableCardProps) {
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return 'N/A';
    return `$${value.toLocaleString()}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPercent = (value: number | null | undefined) => {
    if (!value) return 'N/A';
    return `${(value * 100).toFixed(2)}%`;
  };

  return (
    <div
      className="rounded-lg p-5 border transition-colors"
      style={{
        backgroundColor: 'var(--cui-card-bg)',
        borderColor: 'var(--cui-border-color)'
      }}
    >
      {/* Header with thumbnail */}
      <div className="flex items-start gap-3 mb-4">
        {/* Comp photo thumbnail */}
        <EntityMediaDisplay
          entityType="comp_sale"
          entityId={comparable.comparable_id}
          projectId={projectId}
          variant="single-thumb"
          editable={true}
          onAttach={() => setShowMediaPicker(true)}
        />

        <div className="flex-1" style={{ minWidth: 0 }}>
          <div className="flex items-center gap-2 mb-1">
            <h3
              className="text-lg font-semibold"
              style={{ color: 'var(--cui-body-color)' }}
            >
              {comparable.property_name || 'Unnamed Property'}
            </h3>
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{
                backgroundColor: 'var(--cui-tertiary-bg)',
                color: 'var(--cui-secondary-color)'
              }}
            >
              Comp #{comparable.comp_number}
            </span>
          </div>
          <p
            className="text-sm"
            style={{ color: 'var(--cui-secondary-color)' }}
          >
            {comparable.address}
            {comparable.city && `, ${comparable.city}`}
            {comparable.state && `, ${comparable.state}`}
          </p>
        </div>
      </div>

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <MediaPickerModal
          isOpen={showMediaPicker}
          onClose={() => setShowMediaPicker(false)}
          projectId={projectId}
          entityType="comp_sale"
          entityId={comparable.comparable_id}
          linkPurpose="hero_image"
          singleSelect={true}
          filterClassification={['property_photo', 'aerial_photo']}
          onSelect={() => setShowMediaPicker(false)}
        />
      )}

      {/* Metrics Table - 2 Column Format */}
      <div className="mb-4">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
              <td className="py-2 pr-4" style={{ color: 'var(--cui-secondary-color)', width: '40%' }}>
                Sale Date
              </td>
              <td className="py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>
                {formatDate(comparable.sale_date)}
              </td>
            </tr>
            <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
              <td className="py-2 pr-4" style={{ color: 'var(--cui-secondary-color)' }}>
                Sale Price
              </td>
              <td className="py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>
                {comparable.sale_price
                  ? `$${(Number(comparable.sale_price) / 1000000).toFixed(2)}M`
                  : 'N/A'}
              </td>
            </tr>
            <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
              <td className="py-2 pr-4" style={{ color: 'var(--cui-secondary-color)' }}>
                Price/Unit
              </td>
              <td className="py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>
                {formatCurrency(comparable.price_per_unit ? Number(comparable.price_per_unit) : null)}
              </td>
            </tr>
            <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
              <td className="py-2 pr-4" style={{ color: 'var(--cui-secondary-color)' }}>
                Price/SF
              </td>
              <td className="py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>
                {formatCurrency(comparable.price_per_sf ? Number(comparable.price_per_sf) : null)}
              </td>
            </tr>
            <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
              <td className="py-2 pr-4" style={{ color: 'var(--cui-secondary-color)' }}>
                Units
              </td>
              <td className="py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>
                {comparable.units || 'N/A'}
              </td>
            </tr>
            <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
              <td className="py-2 pr-4" style={{ color: 'var(--cui-secondary-color)' }}>
                Building SF
              </td>
              <td className="py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>
                {comparable.building_sf ? Number(comparable.building_sf).toLocaleString() : 'N/A'}
              </td>
            </tr>
            <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
              <td className="py-2 pr-4" style={{ color: 'var(--cui-secondary-color)' }}>
                Cap Rate
              </td>
              <td className="py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>
                {formatPercent(comparable.cap_rate ? Number(comparable.cap_rate) : null)}
              </td>
            </tr>
            <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
              <td className="py-2 pr-4" style={{ color: 'var(--cui-secondary-color)' }}>
                Year Built
              </td>
              <td className="py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>
                {comparable.year_built || 'N/A'}
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-4" style={{ color: 'var(--cui-secondary-color)' }}>
                Distance
              </td>
              <td className="py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>
                {comparable.distance_from_subject || 'N/A'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Adjustments Summary */}
      {comparable.adjustments && comparable.adjustments.length > 0 && (
        <div
          className="mb-4 p-3 rounded text-sm"
          style={{
            backgroundColor: 'var(--cui-tertiary-bg)',
            borderLeft: '3px solid var(--cui-primary)'
          }}
        >
          <div
            className="font-medium mb-1"
            style={{ color: 'var(--cui-body-color)' }}
          >
            Adjustments: {comparable.total_adjustment_pct > 0 ? '+' : ''}{(comparable.total_adjustment_pct * 100).toFixed(1)}%
          </div>
          <div
            className="text-xs"
            style={{ color: 'var(--cui-secondary-color)' }}
          >
            Adjusted Price/Unit: {formatCurrency(comparable.adjusted_price_per_unit ? Number(comparable.adjusted_price_per_unit) : null)}
          </div>
        </div>
      )}

      {/* Notes */}
      {comparable.notes && (
        <p
          className="text-xs italic mb-4 p-2 rounded"
          style={{
            backgroundColor: 'var(--cui-tertiary-bg)',
            color: 'var(--cui-secondary-color)'
          }}
        >
          {comparable.notes}
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-3 border-t" style={{ borderColor: 'var(--cui-border-color)' }}>
        <LandscapeButton
          color="primary"
          size="sm"
          onClick={() => onEdit?.(comparable)}
        >
          View Details
        </LandscapeButton>
        <LandscapeButton
          color="danger"
          size="sm"
          onClick={() => {
            if (window.confirm(`Delete comparable "${comparable.property_name}"?`)) {
              onDelete?.(comparable.comparable_id);
            }
          }}
        >
          Delete
        </LandscapeButton>
      </div>
    </div>
  );
}
