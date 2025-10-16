'use client';

import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Select,
  MenuItem,
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';

interface BudgetItem {
  budget_item_id: number;
  description: string;
  amount: number;
  timing_method: 'ABSOLUTE' | 'DEPENDENT' | 'MANUAL';
  start_period?: number;
  periods_to_complete?: number;
  s_curve_profile?: 'LINEAR' | 'FRONT_LOADED' | 'BACK_LOADED' | 'BELL_CURVE';
  dependencies?: Array<{
    dependency_id: number;
    trigger_item_name: string;
    trigger_event: string;
    offset_periods: number;
  }>;
}

interface BudgetGridWithDependenciesProps {
  projectId: number;
  onItemSelect?: (item: BudgetItem) => void;
}

export default function BudgetGridWithDependencies({
  projectId,
  onItemSelect
}: BudgetGridWithDependenciesProps) {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBudgetItems();
  }, [projectId]);

  const fetchBudgetItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/budget/items/${projectId}?include_dependencies=true`);
      const result = await response.json();

      if (result.success) {
        setItems(result.data);
      } else {
        setError(result.error || 'Failed to fetch budget items');
      }
    } catch (err) {
      setError('Network error fetching budget items');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTimingMethodChange = async (itemId: number, newMethod: string) => {
    try {
      const response = await fetch(`/api/budget/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timing_method: newMethod })
      });

      if (response.ok) {
        setItems(items.map(item =>
          item.budget_item_id === itemId
            ? { ...item, timing_method: newMethod as BudgetItem['timing_method'] }
            : item
        ));
      }
    } catch (err) {
      console.error('Failed to update timing method:', err);
    }
  };

  const handleFieldUpdate = async (itemId: number, field: string, value: number) => {
    try {
      const response = await fetch(`/api/budget/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });

      if (response.ok) {
        setItems(items.map(item =>
          item.budget_item_id === itemId
            ? { ...item, [field]: value }
            : item
        ));
      }
    } catch (err) {
      console.error(`Failed to update ${field}:`, err);
    }
  };

  const handleCalculateTimeline = async () => {
    try {
      setCalculating(true);
      const response = await fetch(`/api/projects/${projectId}/timeline/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dry_run: false })
      });

      const result = await response.json();

      if (result.success) {
        alert(`Timeline calculated successfully!\nResolved: ${result.data.resolved_count}\nErrors: ${result.data.errors.length}`);
        fetchBudgetItems();
      } else {
        alert(`Timeline calculation failed:\n${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Timeline calculation error:', err);
      alert('Network error during timeline calculation');
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">{error}</Typography>
        <Button onClick={fetchBudgetItems} variant="outlined" sx={{ mt: 2 }}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Budget Items with Dependencies</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleCalculateTimeline}
          disabled={calculating}
        >
          {calculating ? 'Calculating...' : 'Calculate Timeline'}
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Description</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Timing Method</TableCell>
              <TableCell align="right">Start Period</TableCell>
              <TableCell align="right">Duration</TableCell>
              <TableCell>S-Curve Profile</TableCell>
              <TableCell>Dependencies</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.budget_item_id} hover>
                <TableCell>{item.description}</TableCell>
                <TableCell align="right">
                  ${item.amount.toLocaleString()}
                </TableCell>
                <TableCell>
                  <Select
                    value={item.timing_method}
                    onChange={(e) => handleTimingMethodChange(item.budget_item_id, e.target.value)}
                    size="small"
                    fullWidth
                  >
                    <MenuItem value="ABSOLUTE">Absolute</MenuItem>
                    <MenuItem value="DEPENDENT">Dependent</MenuItem>
                    <MenuItem value="MANUAL">Manual</MenuItem>
                  </Select>
                </TableCell>
                <TableCell align="right">
                  <TextField
                    type="number"
                    value={item.start_period || ''}
                    onChange={(e) => handleFieldUpdate(
                      item.budget_item_id,
                      'start_period',
                      parseInt(e.target.value) || 0
                    )}
                    size="small"
                    sx={{ width: 80 }}
                    disabled={item.timing_method === 'DEPENDENT'}
                  />
                </TableCell>
                <TableCell align="right">
                  <TextField
                    type="number"
                    value={item.periods_to_complete || ''}
                    onChange={(e) => handleFieldUpdate(
                      item.budget_item_id,
                      'periods_to_complete',
                      parseInt(e.target.value) || 0
                    )}
                    size="small"
                    sx={{ width: 80 }}
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={item.s_curve_profile || 'LINEAR'}
                    onChange={(e) => handleFieldUpdate(
                      item.budget_item_id,
                      's_curve_profile',
                      e.target.value as any
                    )}
                    size="small"
                    fullWidth
                  >
                    <MenuItem value="LINEAR">Linear</MenuItem>
                    <MenuItem value="FRONT_LOADED">Front Loaded</MenuItem>
                    <MenuItem value="BACK_LOADED">Back Loaded</MenuItem>
                    <MenuItem value="BELL_CURVE">Bell Curve</MenuItem>
                  </Select>
                </TableCell>
                <TableCell>
                  {item.dependencies && item.dependencies.length > 0 ? (
                    <Chip
                      icon={<LinkIcon />}
                      label={`${item.dependencies.length} linked`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ) : (
                    <Chip
                      icon={<LinkOffIcon />}
                      label="Unlinked"
                      size="small"
                      variant="outlined"
                    />
                  )}
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={() => onItemSelect && onItemSelect(item)}
                    title="Configure dependencies"
                  >
                    <SettingsIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {items.length === 0 && (
        <Box p={3} textAlign="center">
          <Typography color="textSecondary">
            No budget items found for this project
          </Typography>
        </Box>
      )}
    </Box>
  );
}
