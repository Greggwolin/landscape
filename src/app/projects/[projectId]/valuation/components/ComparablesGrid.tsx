/**
 * ComparablesGrid Component
 *
 * Displays all sales comparables in a horizontal table format
 * with Interactive AI Adjustments feature (3-column layout per comp)
 */

'use client';

import React, { useState, useCallback } from 'react';
import type { SalesComparable, AIAdjustmentSuggestion, SalesCompAdjustment, AdjustmentType } from '@/types/valuation';
import { AdjustmentCell } from './AdjustmentCell';
import { AdjustmentAnalysisPanel } from './AdjustmentAnalysisPanel';
import { acceptAISuggestion, updateUserAdjustment } from '@/lib/api/valuation';
import { LandscapeButton } from '@/components/ui/landscape';

interface ComparablesGridProps {
  comparables: SalesComparable[];
  projectId: number;
  onEdit?: (comp: SalesComparable) => void;
  onDelete?: (compId: number) => Promise<void>;
  onRefresh?: () => void;
  onAddComp?: () => void;
  mode?: 'multifamily' | 'land'; // Field label mode: multifamily (default) or land sales
}

interface OpenAnalysisPanel {
  comparableId: number;
  adjustmentType: string;
  suggestion: AIAdjustmentSuggestion;
  comparable: SalesComparable;
}

export function ComparablesGrid({ comparables, projectId, onEdit, onDelete, onRefresh, onAddComp, mode = 'multifamily' }: ComparablesGridProps) {
  const [openAdjustmentPanel, setOpenAdjustmentPanel] = useState<OpenAnalysisPanel | null>(null);
  const [editingCompId, setEditingCompId] = useState<number | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState<{ compId: number; comp: SalesComparable } | null>(null);

  // Field label mapping based on mode
  const getFieldLabel = (field: string): string => {
    if (mode === 'land') {
      const landMapping: Record<string, string> = {
        'Price/Unit': 'Price/Acre',
        'Price/SF': 'Price/Front Foot',
        'Units': 'Acres',
        'Building SF': 'Zoning',
        'Cap Rate': 'Entitlements',
        'Year Built': 'Utilities',
      };
      return landMapping[field] || field;
    }
    return field;
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '-';
    return `$${Math.round(value).toLocaleString()}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear().toString().slice(2)}`;
  };

  // Get AI suggestion for a specific comparable and adjustment type
  const getAISuggestion = (comp: SalesComparable, adjType: string): AIAdjustmentSuggestion | null => {
    return comp.ai_suggestions?.find(s => s.adjustment_type === adjType) || null;
  };

  // Get current adjustment for a specific comparable and adjustment type
  const getCurrentAdjustment = (comp: SalesComparable, adjType: string): SalesCompAdjustment | null => {
    return comp.adjustments?.find(a => a.adjustment_type === adjType) || null;
  };

  // Handle clicking the Ai button
  const handleAiClick = useCallback((compId: number, adjType: string, suggestion: AIAdjustmentSuggestion) => {
    const comparable = comparables.find(c => c.comparable_id === compId);
    if (!comparable) return;

    setOpenAdjustmentPanel({
      comparableId: compId,
      adjustmentType: adjType,
      suggestion,
      comparable
    });
  }, [comparables]);

  // Handle clicking the checkbox to accept AI suggestion
  const handleCheckboxClick = useCallback(async (compId: number, adjType: string, suggestedValue: number) => {
    try {
      const comparable = comparables.find(c => c.comparable_id === compId);
      const suggestion = comparable?.ai_suggestions?.find(s => s.adjustment_type === adjType);

      if (!suggestion) return;

      // Call API to accept the AI suggestion
      await acceptAISuggestion(suggestion.ai_suggestion_id);

      // Refresh data to show updated values
      onRefresh?.();
    } catch (error) {
      console.error('Failed to accept AI suggestion:', error);
    }
  }, [comparables, onRefresh]);

  // Handle manual changes to the Final column
  const handleFinalChange = useCallback(async (compId: number, adjType: string, value: number | null) => {
    try {
      const comparable = comparables.find(c => c.comparable_id === compId);
      const adjustment = comparable?.adjustments?.find(a => a.adjustment_type === adjType);

      if (!adjustment) {
        console.warn('No adjustment found to update');
        return;
      }

      // Update the user adjustment value
      await updateUserAdjustment(adjustment.adjustment_id, {
        user_adjustment_pct: value,
        ai_accepted: false // Manual override
      });

      // Refresh data
      onRefresh?.();
    } catch (error) {
      console.error('Failed to update user adjustment:', error);
    }
  }, [comparables, onRefresh]);

  // Handle accepting revised suggestion from analysis panel
  const handleAcceptRevised = useCallback(async (newValue: number) => {
    if (!openAdjustmentPanel) return;

    await handleFinalChange(
      openAdjustmentPanel.comparableId,
      openAdjustmentPanel.adjustmentType,
      newValue
    );
    setOpenAdjustmentPanel(null);
  }, [openAdjustmentPanel, handleFinalChange]);

  // Clean property name by removing parenthetical descriptions
  const cleanPropertyName = (name: string | null) => {
    if (!name) return 'Unnamed';
    return name.replace(/\s*\([^)]*\)/g, '').trim();
  };

  // Toggle edit mode
  const handleEditToggle = (compId: number) => {
    setEditingCompId(editingCompId === compId ? null : compId);
  };

  // Handle delete click - open confirmation modal
  const handleDeleteClick = (compId: number) => {
    const comp = comparables.find(c => c.comparable_id === compId);
    if (comp) {
      setDeleteModalOpen({ compId, comp });
    }
  };

  // Handle confirmed delete
  const handleConfirmDelete = async () => {
    if (!deleteModalOpen) return;

    try {
      if (onDelete) {
        await onDelete(deleteModalOpen.compId);
      }
      setDeleteModalOpen(null);
      onRefresh?.();
    } catch (error) {
      console.error('Error deleting comparable:', error);
      alert(`Error deleting comparable: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Render adjustment row helper
  const renderAdjustmentRow = (adjType: AdjustmentType, label: string, section: string) => {
    return (
      <tr key={`${section}-${adjType}`} className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
        <td
          className="py-1 px-4 pl-8 sticky left-0 z-10"
          style={{
            color: 'var(--cui-secondary-color)',
            backgroundColor: 'var(--cui-card-bg)'
          }}
        >
          {label}
        </td>
        {comparables.map(comp => (
          <AdjustmentCell
            key={`${adjType}-${comp.comparable_id}`}
            comparableId={comp.comparable_id}
            adjustmentType={adjType}
            aiSuggestion={getAISuggestion(comp, adjType)}
            currentAdjustment={getCurrentAdjustment(comp, adjType)}
            onAiClick={handleAiClick}
            onCheckboxClick={handleCheckboxClick}
            onFinalChange={handleFinalChange}
          />
        ))}
      </tr>
    );
  };

  return (
    <div className="space-y-4">
      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setDeleteModalOpen(null)}
          />

          {/* Modal */}
          <div
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] rounded-lg shadow-2xl z-50"
            style={{ backgroundColor: 'var(--cui-card-bg)', border: '1px solid var(--cui-border-color)' }}
          >
            {/* Header */}
            <div
              className="px-6 py-4 border-b"
              style={{
                backgroundColor: 'var(--cui-tertiary-bg)',
                borderColor: 'var(--cui-border-color)'
              }}
            >
              <h3 className="text-lg font-semibold" style={{ color: 'var(--cui-body-color)' }}>
                Delete Comparable?
              </h3>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="mb-4" style={{ color: 'var(--cui-body-color)' }}>
                You're about to remove <strong>{deleteModalOpen.comp.property_name}</strong> from your analysis.
              </p>

              {/* AI Analysis */}
              <div
                className="p-4 rounded mb-4"
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)'
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🤖</div>
                  <div>
                    <div className="font-semibold mb-2" style={{ color: 'var(--cui-body-color)' }}>
                      AI Analysis
                    </div>
                    <div className="text-sm" style={{ color: 'var(--cui-body-color)', lineHeight: '1.6' }}>
                      {(() => {
                        const comp = deleteModalOpen.comp;
                        const totalAdj = Math.abs(comp.total_adjustment_pct * 100);

                        // AI decision logic
                        if (totalAdj > 25) {
                          return (
                            <>
                              <p className="mb-2">
                                <strong>You're right, this objectively isn't a good comp.</strong> This property requires <strong>{totalAdj.toFixed(0)}%</strong> in total adjustments, which exceeds the 25% threshold for reliable comparability.
                              </p>
                              <p className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
                                Removing it will improve the reliability of your indicated value calculation.
                              </p>
                            </>
                          );
                        } else if (totalAdj > 15) {
                          return (
                            <>
                              <p className="mb-2">
                                This comparable requires <strong>{totalAdj.toFixed(0)}%</strong> in adjustments, which is moderate but still within acceptable range. Consider whether the specific characteristics justify removal.
                              </p>
                              <p className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
                                I'll note your reasoning to improve future comparable selection.
                              </p>
                            </>
                          );
                        } else {
                          return (
                            <>
                              <p className="mb-2">
                                This is actually a <strong>good comparable</strong> - it only requires <strong>{totalAdj.toFixed(0)}%</strong> in total adjustments. Are you sure you want to remove it?
                              </p>
                              <p className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
                                I'll learn from your decision to better understand subtle comparability factors.
                              </p>
                            </>
                          );
                        }
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="text-xs p-3 rounded"
                style={{
                  backgroundColor: 'rgba(234, 179, 8, 0.1)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                  color: 'var(--cui-body-color)'
                }}
              >
                <strong>Note:</strong> This comparable will be retained in my persistent knowledge along with metadata about why it wasn't suitable, helping me learn more nuanced comparative analysis for future projects.
              </div>
            </div>

            {/* Footer */}
            <div
              className="px-6 py-4 border-t flex justify-end gap-3"
              style={{ borderColor: 'var(--cui-border-color)' }}
            >
              <LandscapeButton
                color="secondary"
                size="sm"
                onClick={() => setDeleteModalOpen(null)}
              >
                Cancel
              </LandscapeButton>
              <LandscapeButton
                color="danger"
                size="sm"
                onClick={handleConfirmDelete}
              >
                Delete Comparable
              </LandscapeButton>
            </div>
          </div>
        </>
      )}

      {/* Flyout Panel Overlay */}
      {openAdjustmentPanel && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setOpenAdjustmentPanel(null)}
          />

          {/* Flyout Panel */}
          <div
            className="fixed right-0 top-0 bottom-0 w-[600px] shadow-2xl z-50 overflow-y-auto"
            style={{ backgroundColor: 'var(--cui-body-bg)' }}
          >
            <AdjustmentAnalysisPanel
              comparable={openAdjustmentPanel.comparable}
              adjustmentType={openAdjustmentPanel.adjustmentType}
              aiSuggestion={openAdjustmentPanel.suggestion}
              onClose={() => setOpenAdjustmentPanel(null)}
              onAcceptRevised={handleAcceptRevised}
            />
          </div>
        </>
      )}

      {/* Comparables Table */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{
          backgroundColor: 'var(--cui-card-bg)',
          borderColor: 'var(--cui-border-color)'
        }}
      >
        <div className="overflow-x-auto">
          <table className="text-sm" style={{ tableLayout: 'auto', width: 'max-content', minWidth: '100%' }}>
            {/* Column widths */}
            <colgroup>
              <col style={{ width: '220px', minWidth: '220px' }} />
              {comparables.map(comp => (
                <React.Fragment key={`colgroup-${comp.comparable_id}`}>
                  <col style={{ width: '170px', minWidth: '170px' }} />
                </React.Fragment>
              ))}
            </colgroup>

            <thead>
              {/* Main header row - Comp numbers with Edit/Save */}
              <tr
                className="border-b"
                style={{
                  backgroundColor: 'var(--cui-tertiary-bg)',
                  borderColor: 'var(--cui-border-color)'
                }}
              >
                <th
                  className="text-left py-3 px-4 font-semibold sticky left-0 z-10"
                  style={{
                    color: 'var(--cui-body-color)',
                    backgroundColor: 'var(--cui-tertiary-bg)'
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span>Comparable Sale</span>
                    <LandscapeButton
                      variant="ghost"
                      color="primary"
                      size="sm"
                      onClick={onAddComp}
                      className="!p-0 transition-opacity hover:opacity-70"
                      title="Add Comparable"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0a1 1 0 0 1 1 1v6h6a1 1 0 1 1 0 2H9v6a1 1 0 1 1-2 0V9H1a1 1 0 0 1 0-2h6V1a1 1 0 0 1 1-1z"/>
                      </svg>
                    </LandscapeButton>
                  </div>
                </th>
                {comparables.map((comp, idx) => (
                  <th
                    key={`comp-header-${comp.comparable_id}`}
                    className="text-left py-3 px-4 font-semibold border-l"
                    style={{
                      color: 'var(--cui-body-color)',
                      borderColor: 'var(--cui-border-color)'
                    }}
                  >
                    <div className="flex items-center gap-3" style={{ whiteSpace: 'nowrap' }}>
                      <span>Comp {idx + 1}</span>
                      <div className="flex items-center gap-2">
                        <LandscapeButton
                          variant="ghost"
                          color="secondary"
                          size="sm"
                          onClick={() => handleEditToggle(comp.comparable_id)}
                          className="!p-0 transition-opacity hover:opacity-70"
                          title={editingCompId === comp.comparable_id ? 'Save changes' : 'Edit comparable'}
                        >
                          {editingCompId === comp.comparable_id ? (
                            <svg className="icon" width="14" height="14" viewBox="0 0 512 512" style={{ opacity: 0.6 }}>
                              <path fill="var(--cui-success)" d="M173.898 439.404l-166.4-166.4c-9.997-9.997-9.997-26.206 0-36.204l36.203-36.204c9.997-9.998 26.207-9.998 36.204 0L192 312.69 432.095 72.596c9.997-9.997 26.207-9.997 36.204 0l36.203 36.204c9.997 9.997 9.997 26.206 0 36.204l-294.4 294.401c-9.998 9.997-26.207 9.997-36.204-.001z"/>
                            </svg>
                          ) : (
                            <svg className="icon" width="14" height="14" viewBox="0 0 512 512" style={{ opacity: 0.5 }}>
                              <path fill="var(--cui-secondary-color)" d="M453.3125,120.99609,391.00391,58.6875a54.32117,54.32117,0,0,0-76.81641,0l-270.293,270.29688a7.99971,7.99971,0,0,0-2.34375,5.65625L32.00391,460.34766A7.99922,7.99922,0,0,0,40,468.00391l125.70312-9.55078a7.99971,7.99971,0,0,0,5.65625-2.34375L441.65234,185.8125l11.66016-11.66016A54.27776,54.27776,0,0,0,453.3125,120.99609ZM164.89844,440.918,47.41016,449.32422l8.40625-117.48828L243.26953,144.38281l109.08594,109.08594ZM442.03516,162.82422,430.37891,174.48047,321.29688,65.39844,332.95312,53.74219a38.35946,38.35946,0,1,1,54.24609,54.24609l.00391.00391Z"/>
                            </svg>
                          )}
                        </LandscapeButton>
                        <LandscapeButton
                          variant="ghost"
                          color="secondary"
                          size="sm"
                          onClick={() => handleDeleteClick(comp.comparable_id)}
                          className="!p-0 transition-opacity hover:opacity-70"
                          title="Delete comparable"
                        >
                          <svg className="icon" width="14" height="14" viewBox="0 0 512 512" style={{ opacity: 0.5 }}>
                            <path fill="var(--cui-danger)" d="M437.332,80H348.84V62.592C348.84,28.038,320.802,0,286.248,0h-60.496c-34.554,0-62.592,28.038-62.592,62.592V80H74.668
                              c-8.284,0-15,6.716-15,15s6.716,15,15,15h21.332v336.208C96,476.963,131.037,512,161.792,512h188.417
                              c30.755,0,55.792-35.037,55.792-65.792V110h21.332c8.284,0,15-6.716,15-15S445.616,80,437.332,80z M193.16,62.592
                              c0-17.996,14.641-32.592,32.592-32.592h60.496c17.951,0,32.592,14.641,32.592,32.592V80H193.16V62.592z M376,446.208
                              C376,459.863,362.863,482,349.208,482H161.792C148.137,482,126,459.863,126,446.208V110h250V446.208z"/>
                            <path fill="var(--cui-danger)" d="M255.996,160c-8.284,0-15,6.716-15,15v241c0,8.284,6.716,15,15,15s15-6.716,15-15V175C270.996,166.716,264.28,160,255.996,160z"/>
                            <path fill="var(--cui-danger)" d="M192,160c-8.284,0-15,6.716-15,15v241c0,8.284,6.716,15,15,15s15-6.716,15-15V175C207,166.716,200.284,160,192,160z"/>
                            <path fill="var(--cui-danger)" d="M320,160c-8.284,0-15,6.716-15,15v241c0,8.284,6.716,15,15,15s15-6.716,15-15V175C335,166.716,328.284,160,320,160z"/>
                          </svg>
                        </LandscapeButton>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* Name */}
              <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
                <td
                  className="py-2 px-4 font-medium sticky left-0 z-10"
                  style={{
                    color: 'var(--cui-secondary-color)',
                    backgroundColor: 'var(--cui-card-bg)'
                  }}
                >
                  Name
                </td>
                {comparables.map(comp => (
                  <td
                    key={`name-${comp.comparable_id}`}
                    className="py-2 px-4 text-left border-l"
                    style={{
                      color: 'var(--cui-body-color)',
                      borderColor: 'var(--cui-border-color)'
                    }}
                  >
                    <div className="font-medium">{cleanPropertyName(comp.property_name)}</div>
                  </td>
                ))}
              </tr>

              {/* Location - Distance and Bearing */}
              <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
                <td
                  className="py-2 px-4 font-medium sticky left-0 z-10"
                  style={{
                    color: 'var(--cui-secondary-color)',
                    backgroundColor: 'var(--cui-card-bg)'
                  }}
                >
                  Location
                </td>
                {comparables.map(comp => (
                  <td
                    key={`loc-${comp.comparable_id}`}
                    className="py-2 px-4 text-left border-l text-sm"
                    style={{
                      color: 'var(--cui-secondary-color)',
                      borderColor: 'var(--cui-border-color)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {comp.distance_from_subject || '-'}
                  </td>
                ))}
              </tr>

              {/* Date */}
              <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
                <td
                  className="py-2 px-4 font-medium sticky left-0 z-10"
                  style={{
                    color: 'var(--cui-secondary-color)',
                    backgroundColor: 'var(--cui-card-bg)'
                  }}
                >
                  Date
                </td>
                {comparables.map(comp => (
                  <td
                    key={`date-${comp.comparable_id}`}
                    className="py-2 px-4 text-left border-l"
                    style={{
                      color: 'var(--cui-body-color)',
                      borderColor: 'var(--cui-border-color)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {formatDate(comp.sale_date)}
                  </td>
                ))}
              </tr>

              {/* Sale Price */}
              <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
                <td
                  className="py-2 px-4 font-medium sticky left-0 z-10"
                  style={{
                    color: 'var(--cui-secondary-color)',
                    backgroundColor: 'var(--cui-card-bg)'
                  }}
                >
                  Sale Price
                </td>
                {comparables.map(comp => (
                  <td
                    key={`price-${comp.comparable_id}`}
                    className="py-2 px-4 font-medium text-left border-l"
                    style={{
                      color: 'var(--cui-body-color)',
                      borderColor: 'var(--cui-border-color)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {comp.sale_price
                      ? `$${(Number(comp.sale_price) / 1000000).toFixed(2)}M`
                      : '-'}
                  </td>
                ))}
              </tr>

              {/* Price/Unit (or Price/Acre for land) */}
              <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
                <td
                  className="py-2 px-4 font-medium sticky left-0 z-10"
                  style={{
                    color: 'var(--cui-secondary-color)',
                    backgroundColor: 'var(--cui-card-bg)'
                  }}
                >
                  {getFieldLabel('Price/Unit')}
                </td>
                {comparables.map(comp => (
                  <td
                    key={`ppu-${comp.comparable_id}`}
                    className="py-2 px-4 font-medium text-left border-l"
                    style={{
                      color: 'var(--cui-body-color)',
                      borderColor: 'var(--cui-border-color)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {formatCurrency(comp.price_per_unit ? Number(comp.price_per_unit) : null)}
                  </td>
                ))}
              </tr>

              {/* Price/SF (or Price/Front Foot for land) */}
              <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
                <td
                  className="py-2 px-4 font-medium sticky left-0 z-10"
                  style={{
                    color: 'var(--cui-secondary-color)',
                    backgroundColor: 'var(--cui-card-bg)'
                  }}
                >
                  {getFieldLabel('Price/SF')}
                </td>
                {comparables.map(comp => (
                  <td
                    key={`psf-${comp.comparable_id}`}
                    className="py-2 px-4 font-medium text-left border-l"
                    style={{
                      color: 'var(--cui-body-color)',
                      borderColor: 'var(--cui-border-color)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {comp.price_per_sf ? `$${Number(comp.price_per_sf).toLocaleString()}` : '-'}
                  </td>
                ))}
              </tr>

              {/* Units (or Acres for land) */}
              <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
                <td
                  className="py-2 px-4 font-medium sticky left-0 z-10"
                  style={{
                    color: 'var(--cui-secondary-color)',
                    backgroundColor: 'var(--cui-card-bg)'
                  }}
                >
                  {getFieldLabel('Units')}
                </td>
                {comparables.map(comp => (
                  <td
                    key={`units-${comp.comparable_id}`}
                    className="py-2 px-4 text-left border-l"
                    style={{
                      color: 'var(--cui-body-color)',
                      borderColor: 'var(--cui-border-color)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {comp.units || '-'}
                  </td>
                ))}
              </tr>

              {/* Building SF (or Zoning for land) */}
              <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
                <td
                  className="py-2 px-4 font-medium sticky left-0 z-10"
                  style={{
                    color: 'var(--cui-secondary-color)',
                    backgroundColor: 'var(--cui-card-bg)'
                  }}
                >
                  {getFieldLabel('Building SF')}
                </td>
                {comparables.map(comp => (
                  <td
                    key={`bsf-${comp.comparable_id}`}
                    className="py-2 px-4 text-left border-l"
                    style={{
                      color: 'var(--cui-body-color)',
                      borderColor: 'var(--cui-border-color)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {comp.building_sf ? Number(comp.building_sf).toLocaleString() : '-'}
                  </td>
                ))}
              </tr>

              {/* Cap Rate (or Entitlements for land) */}
              <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
                <td
                  className="py-2 px-4 font-medium sticky left-0 z-10"
                  style={{
                    color: 'var(--cui-secondary-color)',
                    backgroundColor: 'var(--cui-card-bg)'
                  }}
                >
                  {getFieldLabel('Cap Rate')}
                </td>
                {comparables.map(comp => (
                  <td
                    key={`cap-${comp.comparable_id}`}
                    className="py-2 px-4 text-left border-l"
                    style={{
                      color: 'var(--cui-body-color)',
                      borderColor: 'var(--cui-border-color)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {comp.cap_rate ? `${(Number(comp.cap_rate) * 100).toFixed(2)}%` : '-'}
                  </td>
                ))}
              </tr>

              {/* Year Built (or Utilities for land) */}
              <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
                <td
                  className="py-2 px-4 font-medium sticky left-0 z-10"
                  style={{
                    color: 'var(--cui-secondary-color)',
                    backgroundColor: 'var(--cui-card-bg)'
                  }}
                >
                  {getFieldLabel('Year Built')}
                </td>
                {comparables.map(comp => (
                  <td
                    key={`year-${comp.comparable_id}`}
                    className="py-2 px-4 text-left border-l"
                    style={{
                      color: 'var(--cui-body-color)',
                      borderColor: 'var(--cui-border-color)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {comp.year_built || '-'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjustments Table - Separate table */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{
          backgroundColor: 'var(--cui-card-bg)',
          borderColor: 'var(--cui-border-color)'
        }}
      >
        <div className="overflow-x-auto">
          <table className="text-sm" style={{ tableLayout: 'auto', width: 'max-content', minWidth: '100%' }}>
            {/* Column widths - 3 columns per comp (Ai, Icons, Final) */}
            <colgroup>
              <col style={{ width: '220px', minWidth: '220px' }} />
              {comparables.map(comp => (
                <React.Fragment key={`adj-colgroup-${comp.comparable_id}`}>
                  <col style={{ width: '60px', minWidth: '60px' }} />
                  <col style={{ width: '50px', minWidth: '50px' }} />
                  <col style={{ width: '60px', minWidth: '60px' }} />
                </React.Fragment>
              ))}
            </colgroup>

            <thead>
              {/* Adjustments Header */}
              <tr
                className="border-b"
                style={{
                  backgroundColor: 'var(--cui-tertiary-bg)',
                  borderColor: 'var(--cui-border-color)'
                }}
              >
                <td
                  className="py-2 px-4 font-semibold sticky left-0 z-10"
                  style={{
                    color: 'var(--cui-body-color)',
                    backgroundColor: 'var(--cui-tertiary-bg)'
                  }}
                >
                  Adjustments
                </td>
                {comparables.map(comp => (
                  <td
                    key={`adj-spacer-${comp.comparable_id}`}
                    colSpan={3}
                    className="border-l"
                    style={{ borderColor: 'var(--cui-border-color)' }}
                  />
                ))}
              </tr>
            </thead>

            <tbody>
              {/* Transaction Section with Ai | Icons | Final labels */}
              <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
                <td
                  className="py-2 px-4 font-semibold sticky left-0 z-10"
                  style={{
                    color: 'var(--cui-body-color)',
                    backgroundColor: 'var(--cui-card-bg)'
                  }}
                >
                  Transaction
                </td>
                {comparables.map(comp => (
                  <React.Fragment key={`trans-header-${comp.comparable_id}`}>
                    <th
                      className="py-2 px-2 text-xs font-normal text-center border-l"
                      style={{
                        color: 'var(--cui-secondary-color)',
                        borderColor: 'var(--cui-border-color)'
                      }}
                    >
                      Ai
                    </th>
                    <th
                      className="py-2 px-2 text-xs font-normal text-center"
                      style={{ color: 'var(--cui-secondary-color)' }}
                    >
                      {/* Icons column - no label */}
                    </th>
                    <th
                      className="py-2 px-2 text-xs font-normal text-center"
                      style={{ color: 'var(--cui-secondary-color)' }}
                    >
                      Final
                    </th>
                  </React.Fragment>
                ))}
              </tr>

              {/* Transaction Adjustments */}
              {renderAdjustmentRow('property_rights', 'Property Rights', 'transaction')}
              {renderAdjustmentRow('financing', 'Financing', 'transaction')}
              {renderAdjustmentRow('conditions_of_sale', 'Conditions of Sale', 'transaction')}
              {renderAdjustmentRow('market_conditions', 'Market Conditions', 'transaction')}
              {renderAdjustmentRow('other', 'Other', 'transaction')}

              {/* Property Section with Ai | Icons | Final labels */}
              <tr className="border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
                <td
                  className="py-2 px-4 font-semibold sticky left-0 z-10"
                  style={{
                    color: 'var(--cui-body-color)',
                    backgroundColor: 'var(--cui-card-bg)'
                  }}
                >
                  Property
                </td>
                {comparables.map(comp => (
                  <React.Fragment key={`prop-header-${comp.comparable_id}`}>
                    <th
                      className="py-2 px-2 text-xs font-normal text-center border-l"
                      style={{
                        color: 'var(--cui-secondary-color)',
                        borderColor: 'var(--cui-border-color)'
                      }}
                    >
                      Ai
                    </th>
                    <th
                      className="py-2 px-2 text-xs font-normal text-center"
                      style={{ color: 'var(--cui-secondary-color)' }}
                    >
                      {/* Icons column - no label */}
                    </th>
                    <th
                      className="py-2 px-2 text-xs font-normal text-center"
                      style={{ color: 'var(--cui-secondary-color)' }}
                    >
                      Final
                    </th>
                  </React.Fragment>
                ))}
              </tr>

              {/* Property Adjustments */}
              {renderAdjustmentRow('location', 'Location', 'property')}
              {renderAdjustmentRow('physical_condition', 'Age / Condition', 'property')}
              {renderAdjustmentRow('economic', 'Economic', 'property')}
              {renderAdjustmentRow('deferred_maintenance', 'Deferred Maint', 'property')}
              {renderAdjustmentRow('other', 'Other', 'property')}

              {/* Total Adjustments */}
              <tr
                className="border-b"
                style={{
                  borderColor: 'var(--cui-border-color)',
                  backgroundColor: 'var(--cui-tertiary-bg)'
                }}
              >
                <td
                  className="py-2 px-4 font-semibold sticky left-0 z-10"
                  style={{
                    color: 'var(--cui-body-color)',
                    backgroundColor: 'var(--cui-tertiary-bg)'
                  }}
                >
                  Total Adjustments
                </td>
                {comparables.map(comp => (
                  <td
                    key={`total-${comp.comparable_id}`}
                    colSpan={3}
                    className="py-2 px-4 font-bold text-center border-l"
                    style={{
                      color: comp.total_adjustment_pct > 0
                        ? 'var(--cui-success)'
                        : comp.total_adjustment_pct < 0
                        ? 'var(--cui-danger)'
                        : 'var(--cui-body-color)',
                      borderColor: 'var(--cui-border-color)'
                    }}
                  >
                    {comp.total_adjustment_pct > 0 ? '+' : ''}
                    {(comp.total_adjustment_pct * 100).toFixed(0)}%
                  </td>
                ))}
              </tr>

              {/* Adjusted Price/Unit */}
              <tr style={{ backgroundColor: 'var(--surface-subheader)' }}>
                <td
                  className="py-3 px-4 font-semibold sticky left-0 z-10"
                  style={{
                    color: 'var(--cui-body-color)',
                    backgroundColor: 'var(--cui-tertiary-bg)'
                  }}
                >
                  Adjusted Price/Unit
                </td>
                {comparables.map(comp => (
                  <td
                    key={`adj-price-${comp.comparable_id}`}
                    colSpan={3}
                    className="py-3 px-4 font-bold text-base text-center border-l"
                    style={{
                      color: 'var(--cui-primary)',
                      borderColor: 'var(--cui-border-color)'
                    }}
                  >
                    {formatCurrency(comp.adjusted_price_per_unit ? Number(comp.adjusted_price_per_unit) : null)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
