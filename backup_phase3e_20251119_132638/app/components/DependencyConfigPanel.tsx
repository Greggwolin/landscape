'use client';

import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  Divider,
  IconButton,
  Chip,
  Select,
  MenuItem,
  TextField,
  Button,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

interface Dependency {
  dependency_id: number;
  trigger_item_id: number;
  trigger_item_name: string;
  trigger_event: 'ABSOLUTE' | 'START' | 'COMPLETE' | 'PCT_COMPLETE' | 'CUMULATIVE_AMOUNT';
  trigger_value?: number;
  offset_periods: number;
  is_hard_dependency: boolean;
}

interface BudgetItem {
  budget_item_id: number;
  description: string;
  timing_method?: string;
}

interface DependencyConfigPanelProps {
  open: boolean;
  onClose: () => void;
  dependentItem: BudgetItem | null;
  projectId: number;
  onDependenciesChanged?: () => void;
}

export default function DependencyConfigPanel({
  open,
  onClose,
  dependentItem,
  projectId,
  onDependenciesChanged
}: DependencyConfigPanelProps) {
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [availableItems, setAvailableItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for adding new dependency
  const [newDep, setNewDep] = useState({
    trigger_item_id: 0,
    trigger_event: 'COMPLETE' as Dependency['trigger_event'],
    trigger_value: 0,
    offset_periods: 0,
    is_hard_dependency: false
  });

  useEffect(() => {
    if (open && dependentItem) {
      fetchDependencies();
      fetchAvailableItems();
    }
  }, [open, dependentItem]);

  const fetchDependencies = async () => {
    if (!dependentItem) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/dependencies?dependent_item_id=${dependentItem.budget_item_id}&dependent_item_table=tbl_budget_items`
      );
      const result = await response.json();

      if (result.success) {
        setDependencies(result.data);
      } else {
        setError(result.error || 'Failed to fetch dependencies');
      }
    } catch (err) {
      setError('Network error fetching dependencies');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableItems = async () => {
    try {
      const response = await fetch(`/api/budget/items/${projectId}`);
      const result = await response.json();

      if (result.success) {
        // Filter out the current item from available triggers
        setAvailableItems(
          result.data.filter((item: BudgetItem) => item.budget_item_id !== dependentItem?.budget_item_id)
        );
      }
    } catch (err) {
      console.error('Failed to fetch available items:', err);
    }
  };

  const handleAddDependency = async () => {
    if (!dependentItem || newDep.trigger_item_id === 0) {
      setError('Please select a trigger item');
      return;
    }

    try {
      const response = await fetch('/api/dependencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dependent_item_type: 'COST',
          dependent_item_table: 'tbl_budget_items',
          dependent_item_id: dependentItem.budget_item_id,
          trigger_item_type: 'COST',
          trigger_item_table: 'tbl_budget_items',
          trigger_item_id: newDep.trigger_item_id,
          trigger_event: newDep.trigger_event,
          trigger_value: newDep.trigger_value || null,
          offset_periods: newDep.offset_periods,
          is_hard_dependency: newDep.is_hard_dependency
        })
      });

      const result = await response.json();

      if (result.success) {
        await fetchDependencies();

        // Reset form
        setNewDep({
          trigger_item_id: 0,
          trigger_event: 'COMPLETE',
          trigger_value: 0,
          offset_periods: 0,
          is_hard_dependency: false
        });

        setError(null);
        onDependenciesChanged?.();
      } else {
        setError(result.error || 'Failed to add dependency');
      }
    } catch (err) {
      setError('Network error adding dependency');
      console.error(err);
    }
  };

  const handleDeleteDependency = async (dependencyId: number) => {
    try {
      const response = await fetch(`/api/dependencies/${dependencyId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        await fetchDependencies();
        onDependenciesChanged?.();
      } else {
        setError(result.error || 'Failed to delete dependency');
      }
    } catch (err) {
      setError('Network error deleting dependency');
      console.error(err);
    }
  };

  if (!dependentItem) return null;

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 450, p: 3 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Configure Dependencies</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <Typography variant="body2" color="textSecondary" gutterBottom>
          {dependentItem.description}
        </Typography>

        <Divider sx={{ my: 2 }} />

        {/* Current Dependencies */}
        <Typography variant="subtitle2" gutterBottom>
          Current Dependencies ({dependencies.length})
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress size={30} />
          </Box>
        ) : (
          <Box mb={3}>
            {dependencies.length === 0 ? (
              <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
                No dependencies configured
              </Typography>
            ) : (
              dependencies.map((dep) => (
                <Box
                  key={dep.dependency_id}
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  mb={1}
                  p={1}
                  border={1}
                  borderColor="divider"
                  borderRadius={1}
                >
                  <Box flex={1}>
                    <Typography variant="body2" fontWeight="medium">
                      {dep.trigger_item_name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      On {dep.trigger_event}
                      {dep.trigger_value ? ` @ ${dep.trigger_value}%` : ''}
                      {dep.offset_periods !== 0 && ` + ${dep.offset_periods} periods`}
                      {dep.is_hard_dependency && ' (HARD)'}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDeleteDependency(dep.dependency_id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))
            )}
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Add New Dependency Form */}
        <Typography variant="subtitle2" gutterBottom>
          Add New Dependency
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box component="form" noValidate autoComplete="off">
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Trigger Item</InputLabel>
            <Select
              value={newDep.trigger_item_id}
              onChange={(e) => setNewDep({ ...newDep, trigger_item_id: Number(e.target.value) })}
              label="Trigger Item"
            >
              <MenuItem value={0}>-- Select Item --</MenuItem>
              {availableItems.map((item) => (
                <MenuItem key={item.budget_item_id} value={item.budget_item_id}>
                  {item.description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Trigger Event</InputLabel>
            <Select
              value={newDep.trigger_event}
              onChange={(e) => setNewDep({ ...newDep, trigger_event: e.target.value as Dependency['trigger_event'] })}
              label="Trigger Event"
            >
              <MenuItem value="ABSOLUTE">Absolute Date</MenuItem>
              <MenuItem value="START">On Start</MenuItem>
              <MenuItem value="COMPLETE">On Complete</MenuItem>
              <MenuItem value="PCT_COMPLETE">% Complete</MenuItem>
              <MenuItem value="CUMULATIVE_AMOUNT">Cumulative Amount</MenuItem>
            </Select>
          </FormControl>

          {(newDep.trigger_event === 'PCT_COMPLETE' || newDep.trigger_event === 'CUMULATIVE_AMOUNT') && (
            <TextField
              label={newDep.trigger_event === 'PCT_COMPLETE' ? 'Percentage' : 'Amount'}
              type="number"
              value={newDep.trigger_value}
              onChange={(e) => setNewDep({ ...newDep, trigger_value: Number(e.target.value) })}
              fullWidth
              sx={{ mb: 2 }}
            />
          )}

          <TextField
            label="Offset Periods"
            type="number"
            value={newDep.offset_periods}
            onChange={(e) => setNewDep({ ...newDep, offset_periods: Number(e.target.value) })}
            fullWidth
            helperText="Number of periods to offset from trigger (can be negative)"
            sx={{ mb: 2 }}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={newDep.is_hard_dependency}
                onChange={(e) => setNewDep({ ...newDep, is_hard_dependency: e.target.checked })}
              />
            }
            label="Hard Dependency (blocks if not met)"
            sx={{ mb: 2 }}
          />

          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddDependency}
            fullWidth
          >
            Add Dependency
          </Button>
        </Box>

        <Box mt={3}>
          <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
            <Typography variant="caption" display="block">
              When you add a dependency, the item's timing method will automatically switch to DEPENDENT.
              Click "Calculate Timeline" to recompute all periods.
            </Typography>
          </Alert>
        </Box>
      </Box>
    </Drawer>
  );
}
