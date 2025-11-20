import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import type { CustomTransactionCost, CreateBenchmarkPayload } from '@/types/sales-absorption';

interface Props {
  open: boolean;
  projectId: number;
  customCost: CustomTransactionCost | null;
  luTypeCode?: string;
  productCode?: string;
  onClose: () => void;
  onSubmit: (payload: CreateBenchmarkPayload) => Promise<void> | void;
  isSaving: boolean;
}

export default function SaveBenchmarkModal({
  open,
  projectId,
  customCost,
  luTypeCode,
  productCode,
  onClose,
  onSubmit,
  isSaving,
}: Props) {
  const [scopeLevel, setScopeLevel] = useState<'project' | 'product'>('project');
  const [benchmarkName, setBenchmarkName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !customCost) return;

    // Default to product scope if we have product info
    if (luTypeCode && productCode) {
      setScopeLevel('product');
    } else {
      setScopeLevel('project');
    }

    setBenchmarkName(customCost.name || '');
    setDescription(customCost.description || '');
    setErrors({});
  }, [open, customCost, luTypeCode, productCode]);

  if (!open || !customCost) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (!benchmarkName.trim()) {
      nextErrors.benchmarkName = 'Benchmark name is required';
    }

    if (scopeLevel === 'product' && (!luTypeCode || !productCode)) {
      nextErrors.scope = 'Product scope requires land use type and product code';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const payload: CreateBenchmarkPayload = {
      scope_level: scopeLevel,
      project_id: projectId,
      benchmark_type: 'custom',
      benchmark_name: benchmarkName,
      description: description || undefined,
    };

    // Add product scoping if applicable
    if (scopeLevel === 'product') {
      payload.lu_type_code = luTypeCode;
      payload.product_code = productCode;
    }

    // Add the appropriate value field based on cost type
    if (customCost.type === '%') {
      payload.rate_pct = customCost.amount / 100; // Convert percentage to decimal
    } else {
      payload.fixed_amount = customCost.amount;
    }

    await onSubmit(payload);
  };

  const productScopeAvailable = Boolean(luTypeCode && productCode);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={handleSubmit}>
        <DialogTitle>Save as Benchmark</DialogTitle>
        <DialogContent dividers>
          <p className="text-sm text-gray-600 mb-4">
            Save this custom transaction cost as a reusable benchmark for future calculations.
          </p>

          {!productScopeAvailable && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Product-level benchmarks are only available for parcels with assigned product codes.
            </Alert>
          )}

          <Stack spacing={2.5}>
            <FormControl fullWidth required>
              <InputLabel>Scope Level</InputLabel>
              <Select
                value={scopeLevel}
                onChange={(e) => setScopeLevel(e.target.value as 'project' | 'product')}
                label="Scope Level"
                disabled={!productScopeAvailable}
              >
                <MenuItem value="project">
                  Project-wide (applies to all parcels in this project)
                </MenuItem>
                <MenuItem value="product" disabled={!productScopeAvailable}>
                  Product-specific (applies only to {productCode || 'this product type'})
                </MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Benchmark Name"
              value={benchmarkName}
              onChange={(e) => setBenchmarkName(e.target.value)}
              required
              error={Boolean(errors.benchmarkName)}
              helperText={errors.benchmarkName || 'A descriptive name for this benchmark'}
              placeholder="e.g., HOA Transfer Fee, Environmental Assessment"
            />

            <TextField
              label="Description (Optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={2}
              helperText="Additional context or notes about this benchmark"
            />

            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <div className="text-sm font-medium text-gray-700 mb-1">Benchmark Value</div>
              <div className="text-lg font-semibold text-gray-900">
                {customCost.type === '%'
                  ? `${customCost.amount}%`
                  : `$${customCost.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                }
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {customCost.type === '%' ? 'Percentage of gross proceeds' : 'Fixed dollar amount'}
              </div>
            </div>

            {errors.scope && (
              <Alert severity="error">{errors.scope}</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isSaving} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save Benchmark'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
