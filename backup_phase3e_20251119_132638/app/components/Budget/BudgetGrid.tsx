'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

// MUI Imports
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';

// Types
interface BudgetItem {
  fact_id: number;
  budget_version: string;
  cost_code: string;
  scope: string;
  category_path: string;
  category_depth: number;
  category_id?: number;
  description?: string;
  uom_code: string;
  uom_display: string;
  qty: number;
  rate: number;
  amount: number;
  calculated_amount: number;
  start_date: string;
  end_date: string;
  duration_months: number;
  escalation_rate: number;
  contingency_pct: number;
  timing_method: string;
  confidence_level: string;
  notes: string;
  vendor_name: string;
  original_amount?: number;
  variance_amount?: number;
  variance_percent?: number;
  variance_status?: 'under' | 'over' | 'on_budget';
  parent_category_name?: string;
  parent_category_code?: string;
  isNew?: boolean;
  isDirty?: boolean;
}

interface Division {
  division_type: 'Area' | 'Phase';
  id: string;
  name: string;
  parent_id: string | null;
}

interface BudgetGridProps {
  projectId: number;
}

export default function BudgetGrid({ projectId }: BudgetGridProps) {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [budgetVersion, setBudgetVersion] = useState<string>('Forecast');

  // Divisions (Areas & Phases)
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [divisionFilter, setDivisionFilter] = useState<string>('');

  // Three-level filtering: Stage > Scope > Category
  const [stageFilter, setStageFilter] = useState<string>('');
  const [scopeFilter, setScopeFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  // Edit tracking
  const [editedItems, setEditedItems] = useState<Record<number, Partial<BudgetItem>>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  // Budget comparison
  const [showComparison, setShowComparison] = useState(false);
  const [availableBudgets, setAvailableBudgets] = useState<string[]>(['Forecast']); // Would come from API

  const parentRef = useRef<HTMLDivElement>(null);

  // Fetch divisions (areas & phases) - stub for now
  useEffect(() => {
    // Mock divisions data - would come from API
    setDivisions([
      { division_type: 'Area', id: '4', name: 'Planning Area 1', parent_id: null },
      { division_type: 'Area', id: '5', name: 'Planning Area 2', parent_id: null },
      { division_type: 'Phase', id: '1', name: '1.1', parent_id: '4' },
      { division_type: 'Phase', id: '2', name: '1.2', parent_id: '4' },
    ]);
  }, [projectId]);

  // Fetch budget items
  useEffect(() => {
    async function fetchItems() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          version: budgetVersion,
          includeVariance: 'true'
        });
        if (scopeFilter) params.set('scope', scopeFilter);

        const response = await fetch(
          `/api/budget/items/${projectId}?${params.toString()}`
        );
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch budget items');
        }

        setItems(data.data.items || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchItems();
  }, [projectId, budgetVersion, scopeFilter]);

  // Stage mapping
  const stages = useMemo(() => {
    const stageMap: Record<string, string[]> = {
      'Acquisition': ['Purchase', 'Diligence', 'Other'],
      'Stage 1': ['Entitlements'],
      'Stage 2': ['Engineering'],
      'Stage 3': ['Offsites', 'Onsites', 'Subdivision', 'Exactions'],
      'Project-Wide': ['Management Fees', 'Overhead', 'Capital Cost / Interest']
    };
    return stageMap;
  }, []);

  // Get unique scopes from items
  const uniqueScopes = useMemo(() => {
    return [...new Set(items.map(item => item.scope))].sort();
  }, [items]);

  // Get scopes for selected stage
  const scopesForStage = useMemo(() => {
    if (!stageFilter) return uniqueScopes;
    return stages[stageFilter] || [];
  }, [stageFilter, stages, uniqueScopes]);

  // Get unique categories for selected scope
  const categoriesForScope = useMemo(() => {
    if (!scopeFilter) return [];
    const filtered = items.filter(item => item.scope === scopeFilter);
    return [...new Set(filtered.map(item => item.parent_category_name || item.category_path))].sort();
  }, [scopeFilter, items]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (stageFilter) {
        const scopesInStage = stages[stageFilter] || [];
        if (!scopesInStage.includes(item.scope)) return false;
      }
      if (scopeFilter && item.scope !== scopeFilter) return false;
      if (categoryFilter) {
        const itemCategory = item.parent_category_name || item.category_path;
        if (itemCategory !== categoryFilter) return false;
      }
      return true;
    });
  }, [items, stageFilter, scopeFilter, categoryFilter, stages]);

  // Virtual scrolling
  const rowVirtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10
  });

  // Calculate summary
  const summary = useMemo(() => {
    const totalAmount = filteredItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalOriginal = filteredItems.reduce((sum, item) => sum + (Number(item.original_amount) || 0), 0);
    const variance = totalAmount - totalOriginal;
    const variancePct = totalOriginal > 0 ? (variance / totalOriginal) * 100 : 0;

    return { itemCount: filteredItems.length, totalAmount, totalOriginal, variance, variancePct };
  }, [filteredItems]);

  // Format currency
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  // Format number
  const formatNumber = (value: number | null | undefined, decimals = 2) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
  };

  // Clear all filters
  const clearFilters = () => {
    setStageFilter('');
    setScopeFilter('');
    setCategoryFilter('');
    setDivisionFilter('');
  };

  // Handle field edit
  const handleFieldEdit = (factId: number, field: string, value: any) => {
    setEditedItems(prev => ({
      ...prev,
      [factId]: {
        ...prev[factId],
        [field]: value
      }
    }));
  };

  // Handle add row
  const handleAddRow = (templateItem: BudgetItem) => {
    const newId = -Date.now(); // Temporary negative ID for new items
    const newItem: BudgetItem = {
      ...templateItem,
      fact_id: newId,
      description: '',
      qty: 0,
      rate: 0,
      amount: 0,
      notes: '',
      isNew: true,
      isDirty: true
    };
    setItems(prev => [...prev, newItem]);
    setEditedItems(prev => ({ ...prev, [newId]: newItem }));
  };

  // Handle delete
  const handleDeleteClick = (factId: number) => {
    setItemToDelete(factId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete < 0) {
        // New item, just remove from state
        setItems(prev => prev.filter(item => item.fact_id !== itemToDelete));
        setEditedItems(prev => {
          const next = { ...prev };
          delete next[itemToDelete];
          return next;
        });
      } else {
        // Existing item, call API
        const response = await fetch(`/api/budget/item/${itemToDelete}`, {
          method: 'DELETE'
        });
        const data = await response.json();

        if (data.success) {
          setItems(prev => prev.filter(item => item.fact_id !== itemToDelete));
        } else {
          alert(data.error || 'Failed to delete item');
        }
      }
    } catch (err) {
      alert('Failed to delete item');
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  // Handle save
  const handleSave = async (item: BudgetItem) => {
    const edits = editedItems[item.fact_id] || {};
    const mergedItem = { ...item, ...edits };

    try {
      if (item.isNew) {
        // Create new item via POST
        const response = await fetch('/api/budget/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            budgetId: 4, // Forecast budget
            projectId,
            containerId: null,
            categoryId: mergedItem.category_id,
            uomCode: mergedItem.uom_code,
            qty: mergedItem.qty,
            rate: mergedItem.rate,
            amount: mergedItem.amount,
            notes: mergedItem.description || mergedItem.notes
          })
        });
        const data = await response.json();

        if (data.success) {
          // Replace temporary item with real one
          setItems(prev => prev.map(i =>
            i.fact_id === item.fact_id ? { ...data.data.item, isNew: false, isDirty: false } : i
          ));
          setEditedItems(prev => {
            const next = { ...prev };
            delete next[item.fact_id];
            return next;
          });
        } else {
          alert(data.error || 'Failed to create item');
        }
      } else {
        // Update existing item via PUT
        const response = await fetch(`/api/budget/item/${item.fact_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(edits)
        });
        const data = await response.json();

        if (data.success) {
          setItems(prev => prev.map(i =>
            i.fact_id === item.fact_id ? { ...data.data.item, isDirty: false } : i
          ));
          setEditedItems(prev => {
            const next = { ...prev };
            delete next[item.fact_id];
            return next;
          });
        } else {
          alert(data.error || 'Failed to update item');
        }
      }
    } catch (err) {
      alert('Failed to save item');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <Typography className="mt-4 text-textSecondary">Loading budget items...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography color="error" className="font-semibold">Error loading budget</Typography>
          <Typography className="text-sm mt-2 text-textSecondary">{error}</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {/* Filters & Summary Bar */}
      <CardContent className="border-b" sx={{ p: 2 }}>
        <Box className="flex items-start justify-between gap-3 mb-3">
          {/* Filter Controls */}
          <Box className="flex items-center gap-3 flex-wrap flex-1">
            {/* Budget Version */}
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Budget Version</InputLabel>
              <Select value={budgetVersion} onChange={(e) => setBudgetVersion(e.target.value)} label="Budget Version">
                <MenuItem value="Original">Original</MenuItem>
                <MenuItem value="Forecast">Forecast</MenuItem>
              </Select>
            </FormControl>

            {/* Geography Filter (Division) */}
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Geography</InputLabel>
              <Select value={divisionFilter} onChange={(e) => setDivisionFilter(e.target.value)} label="Geography">
                <MenuItem value="">Project (All)</MenuItem>
                {divisions.filter(d => d.division_type === 'Area').map(area => (
                  <MenuItem key={`area-${area.id}`} value={`area-${area.id}`}>📍 {area.name}</MenuItem>
                ))}
                {divisions.filter(d => d.division_type === 'Phase').map(phase => (
                  <MenuItem key={`phase-${phase.id}`} value={`phase-${phase.id}`}>&nbsp;&nbsp;&nbsp;&nbsp;📅 Phase {phase.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Stage Filter */}
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Stage</InputLabel>
              <Select value={stageFilter} onChange={(e) => { setStageFilter(e.target.value); setScopeFilter(''); setCategoryFilter(''); }} label="Stage">
                <MenuItem value="">All Stages</MenuItem>
                {Object.keys(stages).map(stage => (<MenuItem key={stage} value={stage}>{stage}</MenuItem>))}
              </Select>
            </FormControl>

            {/* Scope Filter */}
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Scope</InputLabel>
              <Select value={scopeFilter} onChange={(e) => { setScopeFilter(e.target.value); setCategoryFilter(''); }} label="Scope" disabled={!stageFilter && scopesForStage.length === 0}>
                <MenuItem value="">All Scopes</MenuItem>
                {scopesForStage.map(scope => (<MenuItem key={scope} value={scope}>{scope}</MenuItem>))}
              </Select>
            </FormControl>

            {/* Category Filter */}
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Category</InputLabel>
              <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} label="Category" disabled={!scopeFilter || categoriesForScope.length === 0}>
                <MenuItem value="">All Categories</MenuItem>
                {categoriesForScope.map(category => (<MenuItem key={category} value={category}>{category}</MenuItem>))}
              </Select>
            </FormControl>

          </Box>

          {/* Summary */}
          <Box className="text-right min-w-[200px]">
            <Typography variant="caption" className="text-textSecondary" sx={{ fontSize: '0.7rem' }}>{summary.itemCount} line items</Typography>
            <Typography variant="h6" className="font-bold text-textPrimary" sx={{ fontSize: '1.1rem', lineHeight: 1.4 }}>{formatCurrency(summary.totalAmount)}</Typography>
            {budgetVersion === 'Forecast' && summary.totalOriginal > 0 && (
              <Typography variant="caption" className={summary.variance >= 0 ? 'text-error' : 'text-success'} sx={{ fontSize: '0.75rem' }}>
                {summary.variance >= 0 ? '+' : ''}{formatCurrency(summary.variance)} ({summary.variancePct >= 0 ? '+' : ''}{summary.variancePct.toFixed(1)}%)
              </Typography>
            )}
          </Box>
        </Box>

        {/* Active Filters Display */}
        {(divisionFilter || stageFilter || scopeFilter || categoryFilter) && (
          <Box className="flex gap-2 items-center">
            {divisionFilter && (() => {
              const division = divisions.find(d => `${d.division_type.toLowerCase()}-${d.id}` === divisionFilter);
              const label = division
                ? (division.division_type === 'Area' ? `Area: ${division.name}` : `Phase: ${division.name}`)
                : 'Geography';
              return <Chip label={label} size="small" onDelete={() => setDivisionFilter('')} sx={{ bgcolor: '#e3f2fd', color: '#1976d2' }} />;
            })()}
            {stageFilter && <Chip label={`Stage: ${stageFilter}`} size="small" onDelete={() => setStageFilter('')} sx={{ bgcolor: '#e8f5e9', color: '#2e7d32' }} />}
            {scopeFilter && <Chip label={`Scope: ${scopeFilter}`} size="small" onDelete={() => setScopeFilter('')} sx={{ bgcolor: '#fff3e0', color: '#f57c00' }} />}
            {categoryFilter && <Chip label={`Category: ${categoryFilter}`} size="small" onDelete={() => setCategoryFilter('')} sx={{ bgcolor: '#f3e5f5', color: '#7b1fa2' }} />}
            <Chip
              label="Clear Filters"
              onDelete={clearFilters}
              size="medium"
              color="primary"
              variant="outlined"
            />
          </Box>
        )}
      </CardContent>

      {/* Data Grid */}
      <TableContainer ref={parentRef} sx={{ maxHeight: 'calc(100vh - 280px)', overflow: 'auto' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 160, fontWeight: 600, fontSize: '0.75rem', py: 1, px: 1.5 }}>Scope</TableCell>
              <TableCell sx={{ width: 176, fontWeight: 600, fontSize: '0.75rem', py: 1, px: 1.5 }}>Category</TableCell>
              <TableCell sx={{ width: 240, fontWeight: 600, fontSize: '0.75rem', py: 1, px: 1.5 }}>Description</TableCell>
              <TableCell sx={{ width: 64, fontWeight: 600, fontSize: '0.75rem', textAlign: 'center', py: 1, px: 1 }}>UOM</TableCell>
              <TableCell sx={{ width: 96, fontWeight: 600, fontSize: '0.75rem', textAlign: 'right', py: 1, px: 1 }}>Quantity</TableCell>
              <TableCell sx={{ width: 112, fontWeight: 600, fontSize: '0.75rem', textAlign: 'right', py: 1, px: 1 }}>Rate</TableCell>
              <TableCell sx={{ width: 112, fontWeight: 600, fontSize: '0.75rem', textAlign: 'right', position: 'relative', py: 1, px: 1 }}>
                Amount
                {availableBudgets.length > 1 && (
                  <Chip
                    label="Compare Budgets"
                    size="small"
                    color={showComparison ? 'primary' : 'default'}
                    onClick={() => setShowComparison(!showComparison)}
                    sx={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      fontSize: '0.55rem',
                      height: 16,
                      cursor: 'pointer'
                    }}
                  />
                )}
              </TableCell>
              {showComparison && (
                <>
                  <TableCell sx={{ width: 128, fontWeight: 600, fontSize: '0.75rem', textAlign: 'right', py: 1, px: 1 }}>Original</TableCell>
                  <TableCell sx={{ width: 128, fontWeight: 600, fontSize: '0.75rem', textAlign: 'right', py: 1, px: 1 }}>Variance</TableCell>
                </>
              )}
              <TableCell sx={{ width: 224, fontWeight: 600, fontSize: '0.75rem', textAlign: 'center', py: 1, px: 1 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredItems.map((item) => {
              const varianceColor = item.variance_status === 'over' ? 'error.main' : item.variance_status === 'under' ? 'success.main' : 'text.secondary';
              const edits = editedItems[item.fact_id] || {};
              const hasEdits = Object.keys(edits).length > 0;
              const showSave = item.isNew || hasEdits;

              return (
                <TableRow key={item.fact_id} hover sx={{ bgcolor: item.isNew ? 'action.hover' : 'inherit', height: 36 }}>
                  <TableCell sx={{ fontSize: '0.75rem', py: 0.75, px: 1.5 }}>{item.scope}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', py: 0.75, px: 1.5 }} title={item.category_path}>{item.category_path}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', py: 0.5, px: 1 }}>
                    <TextField
                      size="small"
                      fullWidth
                      value={edits.description ?? item.description ?? ''}
                      onChange={(e) => handleFieldEdit(item.fact_id, 'description', e.target.value)}
                      placeholder="Enter description..."
                      sx={{ '& .MuiInputBase-root': { fontSize: '0.75rem', minHeight: 28 }, '& .MuiInputBase-input': { py: 0.25 } }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', textAlign: 'center', py: 0.75, px: 1 }}>{item.uom_code}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', textAlign: 'right', py: 0.75, px: 1 }}>{formatNumber(item.qty)}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', textAlign: 'right', py: 0.75, px: 1 }}>{formatCurrency(item.rate)}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', textAlign: 'right', fontWeight: 600, py: 0.75, px: 1 }}>{formatCurrency(item.amount)}</TableCell>
                  {showComparison && (
                    <>
                      <TableCell sx={{ fontSize: '0.75rem', textAlign: 'right', color: 'text.secondary', py: 0.75, px: 1 }}>{formatCurrency(item.original_amount)}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', textAlign: 'right', fontWeight: 500, color: varianceColor, py: 0.75, px: 1 }}>
                        {item.variance_amount !== undefined && item.variance_amount !== 0 ? formatCurrency(item.variance_amount) : '-'}
                      </TableCell>
                    </>
                  )}
                  <TableCell sx={{ fontSize: '0.75rem', textAlign: 'center', py: 0.5, px: 1 }}>
                    <Box className="flex items-center justify-center gap-0.5">
                      <Chip
                        icon={<AttachFileIcon sx={{ fontSize: '0.75rem', ml: '4px' }} />}
                        size="small"
                        onClick={() => alert('Document management coming soon')}
                        sx={{ fontSize: '0.6rem', height: 20, '& .MuiChip-icon': { margin: 0 } }}
                      />
                      <Chip
                        icon={<AddIcon sx={{ fontSize: '0.75rem', ml: '4px' }} />}
                        size="small"
                        color="success"
                        onClick={() => handleAddRow(item)}
                        sx={{ fontSize: '0.6rem', height: 20, '& .MuiChip-icon': { margin: 0 } }}
                      />
                      <Chip
                        icon={<DeleteIcon sx={{ fontSize: '0.75rem', ml: '4px' }} />}
                        size="small"
                        color="error"
                        onClick={() => handleDeleteClick(item.fact_id)}
                        sx={{ fontSize: '0.6rem', height: 20, '& .MuiChip-icon': { margin: 0 } }}
                      />
                      {showSave && (
                        <Chip
                          icon={<SaveIcon sx={{ fontSize: '0.75rem', ml: '4px' }} />}
                          size="small"
                          color="primary"
                          onClick={() => handleSave(item)}
                          sx={{ fontSize: '0.6rem', height: 20, '& .MuiChip-icon': { margin: 0 } }}
                        />
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this budget line item? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
