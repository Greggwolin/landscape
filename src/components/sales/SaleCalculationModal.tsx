import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  BookmarkBorder as BookmarkIcon,
  Delete as DeleteIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';
import type {
  ParcelWithSale,
  SaleCalculation,
  CustomTransactionCost,
  CalculateSalePayload,
  SaveAssumptionsPayload,
  CreateBenchmarkPayload,
} from '@/types/sales-absorption';
import SaveBenchmarkModal from './SaveBenchmarkModal';

interface Props {
  open: boolean;
  parcel: ParcelWithSale | null;
  projectId: number;
  onClose: () => void;
  onSave: (payload: SaveAssumptionsPayload) => Promise<void> | void;
  onCreateBenchmark?: (payload: CreateBenchmarkPayload) => Promise<void> | void;
  isSaving: boolean;
}

interface TransactionCostRow {
  type: 'legal' | 'commission' | 'closing' | 'title_insurance';
  label: string;
  rate: number; // Stored as decimal (0.03 = 3%)
  amount: number;
  isFixed: boolean; // Whether this is a fixed amount or percentage
  originalRate?: number; // Track original rate from calculation for comparison
}

export default function SaleCalculationModal({
  open,
  parcel,
  projectId,
  onClose,
  onSave,
  onCreateBenchmark,
  isSaving,
}: Props) {
  const [saleDate, setSaleDate] = useState<string>('');
  const [calculation, setCalculation] = useState<SaleCalculation | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Transaction costs state
  const [transactionCosts, setTransactionCosts] = useState<TransactionCostRow[]>([
    { type: 'legal', label: 'Legal', rate: 0.005, amount: 0, isFixed: false },
    { type: 'commission', label: 'Commissions', rate: 0.03, amount: 0, isFixed: false },
    { type: 'closing', label: 'Closing Costs', rate: 0.005, amount: 0, isFixed: false },
    { type: 'title_insurance', label: 'Title Insurance', rate: 0.01, amount: 0, isFixed: false },
  ]);

  // Improvement offset state
  const [improvementOffsetPerUom, setImprovementOffsetPerUom] = useState<number>(0);
  const [improvementOffsetOverride, setImprovementOffsetOverride] = useState<boolean>(false);

  // Custom costs
  const [customCosts, setCustomCosts] = useState<CustomTransactionCost[]>([]);

  // Save benchmark modal
  const [saveBenchmarkModalOpen, setSaveBenchmarkModalOpen] = useState(false);
  const [selectedCustomCost, setSelectedCustomCost] = useState<CustomTransactionCost | null>(null);

  useEffect(() => {
    if (!open || !parcel) return;

    // Initialize with parcel's sale date or today
    setSaleDate(parcel.sale_date || new Date().toISOString().split('T')[0]);

    // Reset state
    setImprovementOffsetOverride(false);
    setCustomCosts([]);
    setCalculation(null);
    setError(null);

    // Auto-calculate on open
    if (parcel.sale_date) {
      performCalculation(parcel.sale_date);
    }
  }, [open, parcel]);

  // Update transaction costs when calculation changes
  useEffect(() => {
    if (!calculation) return;

    setTransactionCosts((prev) =>
      prev.map((row) => {
        // Special handling for closing costs which has '_cost' in the field name
        const fieldPrefix = row.type === 'closing' ? 'closing_cost' : row.type;
        const calcField = `${fieldPrefix}_pct` as keyof SaleCalculation;
        const amountField = `${fieldPrefix}_amount` as keyof SaleCalculation;
        const isFixedField = `${fieldPrefix}_is_fixed` as keyof SaleCalculation;

        const calcRate = (calculation[calcField] as number) || row.rate;
        const isFixed = (calculation[isFixedField] as boolean) || false;

        return {
          ...row,
          rate: calcRate,
          originalRate: calcRate, // Store original to detect changes
          amount: calculation[amountField] as number,
          isFixed: isFixed,
        };
      })
    );

    setImprovementOffsetPerUom(calculation.improvement_offset_per_uom);
  }, [calculation]);

  const performCalculation = async (date: string, overrides?: CalculateSalePayload['overrides']) => {
    if (!parcel) return;

    setIsCalculating(true);
    setError(null);

    try {
      const payload: CalculateSalePayload = {
        sale_date: date,
        overrides: overrides || buildOverridesFromState(),
      };

      const response = await fetch(
        `/api/projects/${projectId}/parcels/${parcel.parcel_id}/calculate-sale`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to calculate sale');
      }

      const data: SaleCalculation = await response.json();
      setCalculation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate sale');
      setCalculation(null);
    } finally {
      setIsCalculating(false);
    }
  };

  const buildOverridesFromState = (): CalculateSalePayload['overrides'] => {
    const overrides: CalculateSalePayload['overrides'] = {};

    if (improvementOffsetOverride) {
      overrides.improvement_offset_per_uom = improvementOffsetPerUom;
    }

    // Include rates that have been changed from their original values
    transactionCosts.forEach((row) => {
      if (row.originalRate !== undefined && row.rate !== row.originalRate) {
        // Special handling for closing costs which has '_cost' in the field name
        const fieldPrefix = row.type === 'closing' ? 'closing_cost' : row.type;
        const key = `${fieldPrefix}_pct` as keyof NonNullable<CalculateSalePayload['overrides']>;
        overrides[key] = row.rate;
      }
    });

    if (customCosts.length > 0) {
      overrides.custom_transaction_costs = customCosts;
    }

    return Object.keys(overrides).length > 0 ? overrides : undefined;
  };

  const handleRecalculate = () => {
    performCalculation(saleDate);
  };

  const handleSave = async () => {
    if (!parcel) return;

    const payload: SaveAssumptionsPayload = {
      sale_date: saleDate,
      overrides: buildOverridesFromState(),
    };

    await onSave(payload);
  };

  const handleTransactionCostChange = (index: number, rate: number) => {
    setTransactionCosts((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], rate };
      return updated;
    });
    // Trigger recalculation after state update
    setTimeout(() => handleRecalculate(), 0);
  };


  const handleAddCustomCost = () => {
    setCustomCosts([
      ...customCosts,
      { name: '', amount: 0, type: '$', description: '' },
    ]);
  };

  const handleRemoveCustomCost = (index: number) => {
    setCustomCosts(customCosts.filter((_, i) => i !== index));
    setTimeout(() => handleRecalculate(), 0);
  };

  const handleUpdateCustomCost = (index: number, field: keyof CustomTransactionCost, value: any) => {
    const updated = [...customCosts];
    updated[index] = { ...updated[index], [field]: value };
    setCustomCosts(updated);
  };

  const handleSaveAsBenchmark = (cost: CustomTransactionCost) => {
    setSelectedCustomCost(cost);
    setSaveBenchmarkModalOpen(true);
  };

  const handleBenchmarkSaved = async (payload: CreateBenchmarkPayload) => {
    if (onCreateBenchmark) {
      await onCreateBenchmark(payload);
    }
    setSaveBenchmarkModalOpen(false);
    setSelectedCustomCost(null);
  };

  if (!parcel) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrencyDetailed = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatCurrencyNoDecimals = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number | null | undefined) => {
    if (value == null || isNaN(value)) {
      return '0.0%';
    }
    return (value * 100).toFixed(1) + '%';
  };

  const modalSurfaceStyle = { backgroundColor: 'var(--surface-card)' };
  const dividerStyle = { borderColor: 'var(--cui-border-color)' };
  const basePanelStyle: React.CSSProperties = {
    border: '1px solid var(--cui-border-color)',
    borderRadius: '12px',
    backgroundColor: 'var(--cui-card-bg)'
  };
  const infoPanelStyle: React.CSSProperties = {
    ...basePanelStyle,
    borderColor: 'var(--cui-info)',
    backgroundColor: 'var(--cui-info-bg)'
  };
  const successPanelStyle: React.CSSProperties = {
    ...basePanelStyle,
    borderColor: 'var(--cui-success)',
    backgroundColor: 'var(--cui-success-bg)'
  };
  const neutralPanelStyle: React.CSSProperties = {
    ...basePanelStyle,
    backgroundColor: 'var(--surface-card)'
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pb: 1,
            pt: 2,
            px: 2,
            backgroundColor: 'var(--surface-card-header)',
            borderBottom: '1px solid var(--cui-border-color)'
          }}
        >
          <div>
            <div className="text-base font-semibold" style={{ color: 'var(--cui-body-color)' }}>
              Sale Calculation - {parcel.parcel_code || `P-${parcel.parcel_id}`} ({parcel.product_code})
            </div>
          </div>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ px: 2, py: 2, ...modalSurfaceStyle }}>
          {error && (
            <div
              className="mb-4 p-3 rounded text-sm"
              style={{
                backgroundColor: 'var(--cui-danger-bg)',
                border: '1px solid var(--cui-danger)',
                color: 'var(--cui-danger)'
              }}
            >
              {error}
            </div>
          )}

          {/* Sale Date */}
          <div className="mb-3 flex items-center gap-3">
            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--cui-secondary-color)' }}>
              Sale Date
            </div>
            <TextField
              type="date"
              value={saleDate}
              onChange={(e) => {
                setSaleDate(e.target.value);
                performCalculation(e.target.value);
              }}
              required
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{
                width: '180px',
                '& input': { color: 'var(--cui-body-color)' }
              }}
            />
          </div>

          <div className="my-3 border-t" style={dividerStyle} />

          {calculation && (
            <>
              {/* Single P&L Box */}
              <div className="mb-3 p-4" style={basePanelStyle}>
                {/* Gross Parcel Price */}
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm" style={{ color: 'var(--cui-body-color)' }}>Gross Sale Price [Finished]</div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-xs" style={{ color: 'var(--cui-body-color)', opacity: 0.7 }}>
                      {formatCurrencyNoDecimals(calculation.inflated_price_per_unit)} / {calculation.price_uom}
                    </div>
                    <div className="text-base font-semibold" style={{ color: 'var(--cui-body-color)' }}>
                      {formatCurrency(calculation.gross_parcel_price)}
                    </div>
                  </div>
                </div>

                {/* Improvement Offset */}
                <div className="flex justify-between items-center mb-2 pl-4">
                  <div className="flex items-center gap-2">
                    <div className="text-sm" style={{ color: 'var(--cui-body-color)' }}>Less: Improvement Offset</div>
                    <TextField
                      type="number"
                      value={improvementOffsetPerUom}
                      onChange={(e) => {
                        const newValue = Number(e.target.value);
                        setImprovementOffsetPerUom(newValue);
                        setImprovementOffsetOverride(true);
                      }}
                      onBlur={handleRecalculate}
                      size="small"
                      sx={{ width: '90px', '& input': { fontSize: '0.75rem', padding: '2px 6px', color: 'var(--cui-body-color)' } }}
                      slotProps={{
                        htmlInput: { step: 0.01, min: 0 }
                      }}
                      InputProps={{
                        startAdornment: <span className="text-xs" style={{ color: 'var(--cui-body-color)', opacity: 0.7 }}>$</span>,
                        endAdornment: <span className="text-xs" style={{ color: 'var(--cui-body-color)', opacity: 0.7 }}>/ {calculation.price_uom}</span>,
                      }}
                    />
                  </div>
                  <div className="text-base font-semibold" style={{ color: 'var(--cui-danger)' }}>
                    -{formatCurrency(calculation.improvement_offset_total)}
                  </div>
                </div>

                {/* Gross Sale Proceeds - Subtotal */}
                <div className="flex justify-between items-center mb-3 pb-3" style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
                  <div className="font-bold text-base" style={{ color: 'var(--cui-body-color)' }}>Gross Sale Proceeds</div>
                  <div className="text-lg font-bold" style={{ color: 'var(--cui-primary)' }}>
                    {formatCurrency(calculation.gross_sale_proceeds)}
                  </div>
                </div>

                {/* Transaction Costs - Simple P&L style */}
                {transactionCosts.map((row, index) => (
                  <div key={row.type} className="flex justify-between items-center mb-2 pl-4">
                    <div className="flex items-center gap-2">
                      <div className="text-sm" style={{ color: 'var(--cui-body-color)' }}>Less: {row.label}</div>
                      {!row.isFixed && (
                        <TextField
                          type="number"
                          value={(row.rate * 100).toFixed(1)}
                          onChange={(e) => handleTransactionCostChange(index, Number(e.target.value) / 100)}
                          size="small"
                          sx={{
                            width: '70px',
                            '& input': {
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              color: 'var(--cui-body-color)',
                              textAlign: 'right'
                            }
                          }}
                          inputProps={{ step: 0.1, min: 0, max: 20 }}
                          InputProps={{
                            endAdornment: <span className="text-xs" style={{ color: 'var(--cui-body-color)', opacity: 0.7 }}>%</span>,
                          }}
                        />
                      )}
                    </div>
                    <div className="text-base font-semibold" style={{ color: 'var(--cui-danger)' }}>
                      -{formatCurrency(row.amount)}
                    </div>
                  </div>
                ))}

                {/* Custom Costs - Simple rows */}
                {customCosts.map((cost, index) => (
                  <div key={`custom-${index}`} className="flex justify-between items-center mb-2 pl-4">
                    <div className="flex items-center gap-2">
                      <TextField
                        value={cost.name}
                        onChange={(e) => handleUpdateCustomCost(index, 'name', e.target.value)}
                        placeholder="Less: Cost of Sale"
                        size="small"
                        sx={{
                          width: '200px',
                          '& input': {
                            fontSize: '0.875rem',
                            padding: '4px 8px',
                            color: 'var(--cui-body-color)'
                          }
                        }}
                      />
                      <TextField
                        type="number"
                        value={cost.amount}
                        onChange={(e) => {
                          handleUpdateCustomCost(index, 'amount', Number(e.target.value));
                          setTimeout(() => handleRecalculate(), 0);
                        }}
                        size="small"
                        sx={{
                          width: '100px',
                          '& input': {
                            fontSize: '0.75rem',
                            padding: '4px 8px',
                            color: 'var(--cui-body-color)'
                          }
                        }}
                        InputProps={{
                          startAdornment: <span className="text-xs" style={{ color: 'var(--cui-body-color)', opacity: 0.7 }}>$</span>,
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveCustomCost(index)}
                        sx={{ padding: '4px' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </div>
                    <div className="text-base font-semibold" style={{ color: 'var(--cui-danger)' }}>
                      -{formatCurrency(cost.amount)}
                    </div>
                  </div>
                ))}

                <Button
                  variant="text"
                  startIcon={<AddIcon />}
                  onClick={handleAddCustomCost}
                  size="small"
                  sx={{ mt: 0, mb: 0, ml: 2, textTransform: 'none', fontSize: '0.875rem' }}
                >
                  Add Cost
                </Button>

                {/* Net Proceeds - Final total */}
                <div className="flex justify-between items-center mt-3 pt-3" style={{ borderTop: '2px solid var(--cui-border-color)' }}>
                  <div className="font-bold text-lg" style={{ color: 'var(--cui-body-color)' }}>Net Proceeds</div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-xs" style={{ color: 'var(--cui-body-color)', opacity: 0.7 }}>
                      {formatCurrencyDetailed(calculation.net_proceeds_per_uom)} / {calculation.price_uom}
                    </div>
                    <div className="text-2xl font-bold" style={{ color: 'var(--cui-success)' }}>
                      {formatCurrency(calculation.net_sale_proceeds)}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {isCalculating && (
            <div className="text-center py-8" style={{ color: 'var(--cui-secondary-color)' }}>
              Calculating...
            </div>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: 2,
            py: 1,
            borderTop: '1px solid var(--cui-border-color)',
            backgroundColor: 'var(--surface-card)'
          }}
        >
          <Button onClick={onClose} disabled={isSaving} color="inherit" size="small" sx={{ color: 'var(--cui-body-color)' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isCalculating || !calculation}
            variant="contained"
            size="small"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <SaveBenchmarkModal
        open={saveBenchmarkModalOpen}
        projectId={projectId}
        customCost={selectedCustomCost}
        luTypeCode={parcel?.type_code}
        productCode={parcel?.product_code}
        onClose={() => setSaveBenchmarkModalOpen(false)}
        onSubmit={handleBenchmarkSaved}
        isSaving={isSaving}
      />
    </>
  );
}
