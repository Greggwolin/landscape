import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
} from '@mui/material';
import type { ParcelWithSale, SalePhaseBenchmarks, CreateSalePhasePayload } from '@/types/sales-absorption';

interface Props {
  open: boolean;
  parcel: ParcelWithSale | null;
  defaultBenchmarks?: SalePhaseBenchmarks;
  onClose: () => void;
  onSubmit: (payload: CreateSalePhasePayload) => Promise<void> | void;
  isSaving: boolean;
}

export default function CreateSalePhaseModal({
  open,
  parcel,
  defaultBenchmarks,
  onClose,
  onSubmit,
  isSaving,
}: Props) {
  const [phaseNumber, setPhaseNumber] = useState<number>(1);
  const [saleDate, setSaleDate] = useState<string>('');
  const [onsitePct, setOnsitePct] = useState<number | ''>(defaultBenchmarks?.onsite_cost_pct ?? '');
  const [commissionPct, setCommissionPct] = useState<number | ''>(defaultBenchmarks?.commission_pct ?? '');
  const [closingCostPerUnit, setClosingCostPerUnit] = useState<number | ''>(defaultBenchmarks?.closing_cost_per_unit ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !parcel) return;
    setPhaseNumber(parcel.sale_phase_number || 1);
    setSaleDate(parcel.sale_date || '');
    setOnsitePct(parcel.onsite_cost_pct ?? defaultBenchmarks?.onsite_cost_pct ?? '');
    setCommissionPct(parcel.commission_pct ?? defaultBenchmarks?.commission_pct ?? '');
    setClosingCostPerUnit(parcel.closing_cost_per_unit ?? defaultBenchmarks?.closing_cost_per_unit ?? '');
    setErrors({});
  }, [open, parcel, defaultBenchmarks]);

  if (!open || !parcel) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!phaseNumber || phaseNumber <= 0) {
      nextErrors.phaseNumber = 'Enter a positive integer';
    }
    if (!saleDate) {
      nextErrors.saleDate = 'Sale date is required';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    await onSubmit({
      parcel_id: parcel.parcel_id,
      sale_phase_number: phaseNumber,
      sale_date: saleDate,
      onsite_cost_pct: onsitePct === '' ? null : Number(onsitePct),
      commission_pct: commissionPct === '' ? null : Number(commissionPct),
      closing_cost_per_unit: closingCostPerUnit === '' ? null : Number(closingCostPerUnit),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={handleSubmit}>
        <DialogTitle>Create Sale Phase</DialogTitle>
        <DialogContent dividers>
          <p className="text-sm text-gray-600 mb-4">
            Assign parcel <strong>{parcel.parcel_code}</strong> to a new sale phase. Provide the sale date and defaults that other parcels in this phase should inherit.
          </p>

          <Stack spacing={2}>
            <TextField
              label="Sale Phase Number"
              type="number"
              value={phaseNumber}
              onChange={(event) => setPhaseNumber(Number(event.target.value))}
              required
              error={Boolean(errors.phaseNumber)}
              helperText={errors.phaseNumber}
              inputProps={{ min: 1, max: 999 }}
            />

            <TextField
              label="Sale Date"
              type="date"
              value={saleDate}
              onChange={(event) => setSaleDate(event.target.value)}
              required
              InputLabelProps={{ shrink: true }}
              error={Boolean(errors.saleDate)}
              helperText={errors.saleDate}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <TextField
                label="Onsites %"
                type="number"
                value={onsitePct}
                onChange={(event) => setOnsitePct(event.target.value === '' ? '' : Number(event.target.value))}
                InputProps={{ endAdornment: <span className="text-gray-500 ml-1">%</span> }}
                inputProps={{ min: 0, max: 20, step: 0.1 }}
              />
              <TextField
                label="Commissions %"
                type="number"
                value={commissionPct}
                onChange={(event) => setCommissionPct(event.target.value === '' ? '' : Number(event.target.value))}
                InputProps={{ endAdornment: <span className="text-gray-500 ml-1">%</span> }}
                inputProps={{ min: 0, max: 10, step: 0.1 }}
              />
              <TextField
                label="Closing Cost / Unit"
                type="number"
                value={closingCostPerUnit}
                onChange={(event) => setClosingCostPerUnit(event.target.value === '' ? '' : Number(event.target.value))}
                InputProps={{ startAdornment: <span className="text-gray-500 mr-1">$</span> }}
                inputProps={{ min: 0, step: 1 }}
              />
            </div>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isSaving} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSaving}>
            {isSaving ? 'Creating…' : 'Create Phase'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
