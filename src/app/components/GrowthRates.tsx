"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  ThemeProvider,
  createTheme,
  Tab,
  Tabs,
  Collapse,
  IconButton,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  Stack,
  styled,
  Select,
  MenuItem,
  FormControl,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Business as BuildingIcon,
  TrendingUp,
  People,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon,
  Analytics,
  Timeline,
  Save as SaveIcon
} from '@mui/icons-material';
import type {
  GrowthRateAssumption,
  GrowthRatesResponse
} from '../../types/growth-rates';

// Materio-inspired theme (keep your existing theme)
const materioTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#7367f0', contrastText: '#ffffff' },
    secondary: { main: '#28c76f' },
    background: { default: '#f4f5fa', paper: '#ffffff' },
    text: { primary: 'rgba(50, 71, 92, 0.87)', secondary: 'rgba(50, 71, 92, 0.6)' },
    success: { main: '#28c76f' },
    error: { main: '#ea5455' },
    warning: { main: '#ff9f43' },
    info: { main: '#00cfe8' }
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h4: { fontSize: '1.5rem', fontWeight: 600 },
    h6: { fontSize: '1.125rem', fontWeight: 500 },
    body1: { fontSize: '0.875rem' },
    body2: { fontSize: '0.75rem' },
    caption: { fontSize: '0.625rem' }
  },
  shape: { borderRadius: 6 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 10px 0px rgba(50, 71, 92, 0.1)',
          border: '1px solid rgba(50, 71, 92, 0.12)'
        }
      }
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(115, 103, 240, 0.04)',
          borderBottom: '1px solid rgba(50, 71, 92, 0.12)',
          padding: '12px 16px'
        }
      }
    }
  }
});

// Enhanced styled components for ARGUS-style tables
const CompactTable = styled(TableContainer)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  overflow: 'hidden',
  maxWidth: '400px',
  width: 'fit-content',
  '& .MuiTable-root': {
    tableLayout: 'fixed',
    width: '100%',
    '& .MuiTableCell-root': {
      padding: theme.spacing(0.3, 0.5),
      fontSize: '0.65rem',
      textAlign: 'center',
      borderRight: `1px solid ${theme.palette.divider}`,
      whiteSpace: 'nowrap',
      transition: 'background-color 0.2s ease-in-out',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      '&:last-child': {
        borderRight: 'none'
      },
      '&:hover': {
        backgroundColor: theme.palette.action.hover
      },
      '&.step-col': {
        width: '15%',
        minWidth: '50px'
      },
      '&.period-col': {
        width: '20%',
        minWidth: '70px'
      },
      '&.rate-col': {
        width: '25%',
        minWidth: '80px'
      },
      '&.periods-col': {
        width: '20%',
        minWidth: '70px'
      },
      '&.thru-col': {
        width: '20%',
        minWidth: '70px'
      }
    },
    '& .MuiTableHead-root .MuiTableCell-root': {
      backgroundColor: theme.palette.grey[100],
      fontWeight: 600,
      fontSize: '0.6rem',
      lineHeight: 1.1,
      padding: theme.spacing(0.5, 0.25),
      '&:hover': {
        backgroundColor: theme.palette.grey[200]
      }
    },
    '& .step-cell': {
      backgroundColor: theme.palette.grey[50],
      fontWeight: 500,
      '&:hover': {
        backgroundColor: theme.palette.grey[100]
      }
    },
    '& .rate-cell': {
      fontWeight: 600
    }
  }
}));


type Props = { projectId?: number | null }

const GrowthRates: React.FC<Props> = ({ projectId = null }) => {
  const [expandedCards, setExpandedCards] = useState(new Set<number>());
  const [cardTabs, setCardTabs] = useState<Record<number, number>>({});
  const [customNames, setCustomNames] = useState<Record<string, string>>({});
  const [editingNames, setEditingNames] = useState<Record<string, string>>({});
  const [editingSteps, setEditingSteps] = useState<Record<string, any>>({});
  const [focusedFields, setFocusedFields] = useState<Record<string, boolean>>({});
  const [customSteps, setCustomSteps] = useState<Record<string, any[]>>({});
  const [visibleRows, setVisibleRows] = useState<Record<string, number>>({});
  const [editMode, setEditMode] = useState<Record<string, boolean>>({});
  const [assumptions, setAssumptions] = useState<GrowthRateAssumption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Land pricing state
  const [landPricingLoading, setLandPricingLoading] = useState(true);
  const [landPricingSaving, setLandPricingSaving] = useState(false);
  const [activeLandUseTypes, setActiveLandUseTypes] = useState<any[]>([]);
  const [pricingData, setPricingData] = useState<any[]>([]);
  const [originalPricingData, setOriginalPricingData] = useState<any[]>([]);
  const [landPricingError, setLandPricingError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // UOM and inflation options for land pricing
  const [uomOptions, setUomOptions] = useState<Array<{code: string, name: string}>>([]);
  const inflationOptions = ['Global', 'Custom 1', 'Custom 2', 'Custom 3'];

  // Analysis impact visibility state
  const [showAnalysisImpact, setShowAnalysisImpact] = useState<Record<number, boolean>>({});

  // Function to toggle analysis impact visibility
  const toggleAnalysisImpact = (assumptionId: number) => {
    setShowAnalysisImpact(prev => ({
      ...prev,
      [assumptionId]: !prev[assumptionId]
    }));
  };

  // Helper function to get color for assumption category
  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'DEVELOPMENT_COSTS': return '#7367f0';
      case 'PRICE_APPRECIATION': return '#28c76f';
      case 'SALES_ABSORPTION': return '#ff9f43';
      default: return '#7367f0';
    }
  };

  // Land pricing functions
  const formatCurrency = (value: number): string => {
    if (value === 0 || isNaN(value)) return '0';
    if (value % 1 === 0) {
      return value.toLocaleString('en-US');
    }
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseCurrency = (value: string): number => {
    const cleaned = value.replace(/,/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Function to check if pricing data has changed
  const checkForChanges = (newData: any[]) => {
    const hasChanges = JSON.stringify(newData) !== JSON.stringify(originalPricingData);
    setHasUnsavedChanges(hasChanges);
  };

  const updatePricingData = (typeCode: string, field: string, value: any) => {
    setPricingData(prev => {
      const newData = prev.map(item =>
        item.lu_type_code === typeCode
          ? { ...item, [field]: value }
          : item
      );
      checkForChanges(newData);
      return newData;
    });
  };

  const savePricingData = async () => {
    setLandPricingSaving(true);
    try {
      const response = await fetch('/api/market-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          pricing_data: pricingData
        })
      });

      if (!response.ok) throw new Error('Failed to save pricing data');

      // Update original data and reset unsaved changes
      setOriginalPricingData([...pricingData]);
      setHasUnsavedChanges(false);
      setTimeout(() => setLandPricingSaving(false), 1000);
    } catch (err) {
      console.error('Failed to save pricing data:', err);
      setLandPricingError('Failed to save pricing data');
      setLandPricingSaving(false);
    }
  };

  const navigateToPlanning = () => {
    window.dispatchEvent(new CustomEvent('navigateToView', {
      detail: { view: 'planning' }
    }));
  };

  const getChipColor = (familyName: string) => {
    switch (familyName?.toLowerCase()) {
      case 'residential':
        return { backgroundColor: '#28c76f', color: '#ffffff' };
      case 'commercial':
        return { backgroundColor: '#ff9f43', color: '#ffffff' };
      case 'industrial':
        return { backgroundColor: '#ea5455', color: '#ffffff' };
      case 'mixed use':
        return { backgroundColor: '#7367f0', color: '#ffffff' };
      case 'open space':
        return { backgroundColor: '#00cfe8', color: '#ffffff' };
      default:
        return { backgroundColor: '#6c757d', color: '#ffffff' };
    }
  };

  // Fetch growth rate assumptions from API
  useEffect(() => {
    const fetchAssumptions = async () => {
      try {
        setLoading(true);
        setError(null);

        const url = projectId
          ? `/api/assumptions/growth-rates?project_id=${projectId}`
          : '/api/assumptions/growth-rates';

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        // Override tabs to show Custom 1, 2, 3 instead of API tabs
        const assumptionsWithCustomTabs = (data.assumptions || []).map((assumption: any) => ({
          ...assumption,
          tabs: [
            { label: "Custom 1", content: "" },
            { label: "Custom 2", content: "" },
            { label: "Custom 3", content: "" }
          ]
        }));

        setAssumptions(assumptionsWithCustomTabs);
      } catch (err) {
        console.error('Error fetching growth rate assumptions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load assumptions');
      } finally {
        setLoading(false);
      }
    };

    fetchAssumptions();
  }, [projectId]);

  // Load land pricing data
  useEffect(() => {
    const initializeLandPricingData = async () => {
      if (!projectId) return;

      setLandPricingLoading(true);
      try {
        const typesResponse = await fetch(`/api/landuse/active-types?project_id=${projectId}`);
        if (!typesResponse.ok) throw new Error('Failed to load land use types');
        const types = await typesResponse.json();
        setActiveLandUseTypes(types);

        // Load UOM options
        const uomResponse = await fetch('/api/fin/uoms');
        if (uomResponse.ok) {
          const uoms = await uomResponse.json();
          setUomOptions(uoms.map((uom: any) => ({ code: uom.uom_code, name: uom.name })));
        }

        const pricingResponse = await fetch(`/api/market-pricing?project_id=${projectId}`);
        if (!pricingResponse.ok) throw new Error('Failed to load pricing data');
        const existingPricing = await pricingResponse.json();

        const existingPricingMap = existingPricing.reduce((acc: any, item: any) => {
          acc[item.lu_type_code] = item;
          return acc;
        }, {});

        const mergedPricingData = types.map((type: any) => {
          const existing = existingPricingMap[type.code];
          return existing ? {
            ...existing,
            type_name: type.name,
            price_per_unit: parseFloat(existing.price_per_unit) || 0
          } : {
            lu_type_code: type.code,
            type_name: type.name,
            price_per_unit: 0,
            unit_of_measure: 'LS', // Default to LS UOM code
            inflation_type: 'Global'
          };
        });

        setPricingData(mergedPricingData);
        setOriginalPricingData([...mergedPricingData]);
        setHasUnsavedChanges(false);
        setLandPricingLoading(false);
      } catch (err) {
        console.error('Failed to load data:', err);
        setLandPricingError('Failed to load pricing data');
        setLandPricingLoading(false);
      }
    };

    initializeLandPricingData();
  }, [projectId]);

  // Auto-expand cards with custom values on page load
  useEffect(() => {
    if (assumptions.length > 0) {
      const cardsToExpand = new Set<number>();

      assumptions.forEach(assumption => {
        if (hasCustomValues(assumption.id)) {
          cardsToExpand.add(assumption.id);
        }
      });

      if (cardsToExpand.size > 0) {
        setExpandedCards(cardsToExpand);
      }
    }
  }, [assumptions, customNames, customSteps, editingSteps]);

  // Navigation warning for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes to land pricing data. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleCustomToggle = (assumptionId: number) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(assumptionId)) {
      newExpanded.delete(assumptionId);
    } else {
      newExpanded.add(assumptionId);
    }
    setExpandedCards(newExpanded);
  };

  const handleTabChange = (assumptionId: number, newValue: number) => {
    const currentTabIndex = cardTabs[assumptionId] || 0;

    // Clear any unsaved changes from the current tab
    if (currentTabIndex !== newValue) {
      // Clear editing state for the old tab
      const oldKeys = Object.keys(editingSteps).filter(key =>
        key.startsWith(`${assumptionId}-${currentTabIndex}-`)
      );
      setEditingSteps(prev => {
        const newState = { ...prev };
        oldKeys.forEach(key => delete newState[key]);
        return newState;
      });
    }

    setCardTabs(prev => ({
      ...prev,
      [assumptionId]: newValue
    }));

    // Initialize edit mode for any tab if not already set
    const key = `${assumptionId}-${newValue}`;
    setEditMode(prev => ({
      ...prev,
      [key]: prev[key] !== undefined ? prev[key] : true // Default to edit mode
    }));
  };

  const getCustomTabLabel = (assumptionId: number, tabIndex: number, originalLabel: string) => {
    const key = `${assumptionId}-${tabIndex}`;
    return customNames[key] || originalLabel;
  };

  const isInEditMode = (assumptionId: number) => {
    const tabIndex = cardTabs[assumptionId] || 0;
    const key = `${assumptionId}-${tabIndex}`;
    // All tabs start in edit mode when first accessed, but can be locked
    return editMode[key] !== false;
  };

  const handleEditToggle = (assumptionId: number) => {
    const tabIndex = cardTabs[assumptionId] || 0;
    const key = `${assumptionId}-${tabIndex}`;
    setEditMode(prev => ({
      ...prev,
      [key]: prev[key] === false ? true : false
    }));
  };

  const handleClearTab = (assumptionId: number) => {
    const tabIndex = cardTabs[assumptionId] || 0;

    // Don't allow clearing the default tab (tab 0)
    if (tabIndex === 0) return;

    // Clear custom name
    const nameKey = `${assumptionId}-${tabIndex}`;
    setCustomNames(prev => {
      const newNames = { ...prev };
      delete newNames[nameKey];
      return newNames;
    });

    // Clear editing names
    setEditingNames(prev => {
      const newNames = { ...prev };
      delete newNames[nameKey];
      return newNames;
    });

    // Clear all custom step values for this tab
    setCustomSteps(prev => {
      const newSteps = { ...prev };
      Object.keys(newSteps).forEach(key => {
        if (key.startsWith(`${assumptionId}-${tabIndex}-`)) {
          delete newSteps[key];
        }
      });
      return newSteps;
    });

    // Clear all editing step values for this tab
    setEditingSteps(prev => {
      const newSteps = { ...prev };
      Object.keys(newSteps).forEach(key => {
        if (key.startsWith(`${assumptionId}-${tabIndex}-`)) {
          delete newSteps[key];
        }
      });
      return newSteps;
    });

    // Reset visible rows for this tab
    setVisibleRows(prev => {
      const newRows = { ...prev };
      const rowKey = `${assumptionId}-${tabIndex}`;
      newRows[rowKey] = 1;
      return newRows;
    });

    // Clear focused fields for this tab
    setFocusedFields(prev => {
      const newFields = { ...prev };
      Object.keys(newFields).forEach(key => {
        if (key.startsWith(`${assumptionId}-${tabIndex}-`)) {
          delete newFields[key];
        }
      });
      return newFields;
    });

    // Reset edit mode for this tab
    setEditMode(prev => ({
      ...prev,
      [nameKey]: true
    }));
  };

  const getVisibleRowCount = (assumptionId: number) => {
    const tabIndex = cardTabs[assumptionId] || 0;

    // For default tab, show all existing rows
    if (tabIndex === 0) {
      return assumptions.find(a => a.id === assumptionId)?.steps.length || 1;
    }

    // For custom tabs, start with 1 and expand based on user input
    const key = `${assumptionId}-${tabIndex}`;
    return visibleRows[key] || 1;
  };

  const shouldShowNextRow = (assumptionId: number, stepIndex: number) => {
    const tabIndex = cardTabs[assumptionId] || 0;

    // For default tab, always show all rows
    if (tabIndex === 0) return true;

    // For custom tabs, check if the previous row has periods value
    if (stepIndex === 0) return true; // Always show first row

    const prevPeriodsValue = getStepValue(assumptionId, stepIndex - 1, 'periods', '');
    return prevPeriodsValue && prevPeriodsValue !== '-' && prevPeriodsValue.toString().trim() !== '';
  };

  const hasCustomValues = (assumptionId: number) => {
    // Check if there are any custom names
    for (let tabIndex = 1; tabIndex <= 3; tabIndex++) {
      const nameKey = `${assumptionId}-${tabIndex}`;
      if (customNames[nameKey] && customNames[nameKey].trim() !== '') {
        return true;
      }
    }

    // Check if there are any custom step values
    for (let tabIndex = 1; tabIndex <= 3; tabIndex++) {
      const customKey = `${assumptionId}-${tabIndex}`;
      if (customSteps[customKey] && customSteps[customKey].length > 0) {
        return true;
      }
    }

    // Check if there are any editing steps for custom tabs
    for (const key in editingSteps) {
      if (key.startsWith(`${assumptionId}-`) && key.split('-').length >= 4) {
        const tabIndex = parseInt(key.split('-')[1]);
        if (tabIndex > 0) {
          return true;
        }
      }
    }

    return false;
  };

  // Helper function to calculate From Period
  const getCalculatedFromPeriod = (assumptionId: number, stepIndex: number) => {
    const assumption = assumptions.find(a => a.id === assumptionId);
    if (!assumption) return '-';

    const tabIndex = cardTabs[assumptionId] || 0;

    // First step always starts at period 1
    if (stepIndex === 0) {
      return 1;
    }

    // For subsequent steps, From Period = previous step's Thru Period + 1
    const prevThruPeriod = getCalculatedThruPeriod(assumptionId, stepIndex - 1);
    if (prevThruPeriod !== '-' && !isNaN(prevThruPeriod)) {
      return prevThruPeriod + 1;
    }

    // Fallback to original value for default tab
    if (tabIndex === 0) {
      return assumption.steps[stepIndex]?.period || '-';
    }

    return '-';
  };

  // Helper function to calculate Thru Period
  const getCalculatedThruPeriod = (assumptionId: number, stepIndex: number) => {
    const assumption = assumptions.find(a => a.id === assumptionId);
    if (!assumption) return '-';

    const tabIndex = cardTabs[assumptionId] || 0;

    // Get current step's From Period and Periods values
    const fromPeriod = getCalculatedFromPeriod(assumptionId, stepIndex);
    const periodsValue = getStepValue(assumptionId, stepIndex, 'periods', assumption.steps[stepIndex]?.periods);

    // Calculate Thru Period
    if (periodsValue === 'E' || periodsValue === 'e') {
      return 180; // End of analysis period
    }

    const periods = parseInt(periodsValue);
    if (!isNaN(periods) && !isNaN(fromPeriod)) {
      return fromPeriod + periods - 1;
    }

    // Fallback to original value for default tab
    if (tabIndex === 0) {
      return assumption.steps[stepIndex]?.thru || '-';
    }

    return '-';
  };

  const getStepValue = (assumptionId: number, stepIndex: number, field: 'rate' | 'periods', originalValue: any) => {
    const tabIndex = cardTabs[assumptionId] || 0;

    // For tab 0 (default), use original values or edited values
    if (tabIndex === 0) {
      const key = `${assumptionId}-${stepIndex}-${field}`;
      return editingSteps[key] !== undefined ? editingSteps[key] : originalValue;
    }

    // For custom tabs (1, 2, 3), check editing state first, then custom data, then original values
    const editKey = `${assumptionId}-${tabIndex}-${stepIndex}-${field}`;
    if (editingSteps[editKey] !== undefined) {
      return editingSteps[editKey];
    }

    // Check if we have saved custom data
    const customKey = `${assumptionId}-${tabIndex}`;
    const customData = customSteps[customKey];
    if (customData && customData[stepIndex] && customData[stepIndex][field] !== undefined) {
      return customData[stepIndex][field];
    }

    // Fall back to original values for custom tabs too
    return originalValue;
  };

  const setStepValue = (assumptionId: number, stepIndex: number, field: 'rate' | 'periods', value: any) => {
    const tabIndex = cardTabs[assumptionId] || 0;

    if (tabIndex === 0) {
      // Default tab - use original logic
      const key = `${assumptionId}-${stepIndex}-${field}`;
      setEditingSteps(prev => ({
        ...prev,
        [key]: value
      }));
    } else {
      // Custom tab - use custom logic
      const key = `${assumptionId}-${tabIndex}-${stepIndex}-${field}`;
      setEditingSteps(prev => ({
        ...prev,
        [key]: value
      }));

      // If this is a periods field and has a value, show the next row (unless it's "E")
      if (field === 'periods' && value && value !== '-' && value.toString().trim() !== '' && value.toString().toUpperCase() !== 'E') {
        const visibleKey = `${assumptionId}-${tabIndex}`;
        const currentVisible = visibleRows[visibleKey] || 1;
        const maxRows = 5; // Limit to 5 rows maximum

        if (stepIndex + 1 >= currentVisible && currentVisible < maxRows) {
          setVisibleRows(prev => ({
            ...prev,
            [visibleKey]: currentVisible + 1
          }));
        }
      }
    }
  };

  const handleFieldFocus = (assumptionId: number, stepIndex: number, field: 'rate' | 'periods') => {
    const tabIndex = cardTabs[assumptionId] || 0;
    const key = tabIndex === 0
      ? `${assumptionId}-${stepIndex}-${field}`
      : `${assumptionId}-${tabIndex}-${stepIndex}-${field}`;

    setFocusedFields(prev => ({
      ...prev,
      [key]: true
    }));

    // Clear field on focus to make editing easier
    if (isInEditMode(assumptionId)) {
      setStepValue(assumptionId, stepIndex, field, '');
    }
  };

  const handleFieldBlur = (assumptionId: number, stepIndex: number, field: 'rate' | 'periods', originalValue: any) => {
    const tabIndex = cardTabs[assumptionId] || 0;
    const key = tabIndex === 0
      ? `${assumptionId}-${stepIndex}-${field}`
      : `${assumptionId}-${tabIndex}-${stepIndex}-${field}`;

    setFocusedFields(prev => ({
      ...prev,
      [key]: false
    }));

    const currentValue = editingSteps[key];

    // If field is empty or unchanged, revert to original value
    if (currentValue === undefined || currentValue === '' || currentValue === null) {
      // Clear the editing state to show original value
      setEditingSteps(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
      return;
    }

    // Convert number to percentage for rate fields
    if (field === 'rate') {
      if (currentValue !== undefined && currentValue !== '') {
        const numValue = parseFloat(currentValue);
        if (!isNaN(numValue) && numValue >= 0) {
          if (numValue < 1) {
            // Convert decimal to percentage (0.025 → 2.5%)
            setStepValue(assumptionId, stepIndex, field, `${(numValue * 100).toFixed(1)}%`);
          } else {
            // Treat as direct percentage (1 → 1%, 2 → 2%)
            setStepValue(assumptionId, stepIndex, field, `${numValue}%`);
          }
        }
      }
    }

    // Auto-format periods field - convert "e" to "E" and validate
    if (field === 'periods') {
      if (currentValue !== undefined && currentValue !== '') {
        const stringValue = currentValue.toString().trim();
        if (stringValue.toLowerCase() === 'e') {
          // Auto-convert lowercase "e" to uppercase "E"
          setStepValue(assumptionId, stepIndex, field, 'E');
        } else if (stringValue.toUpperCase() === 'E') {
          // Ensure it's uppercase
          setStepValue(assumptionId, stepIndex, field, 'E');
        } else {
          // For numbers, ensure it's a valid integer
          const numValue = parseInt(stringValue);
          if (!isNaN(numValue) && numValue > 0) {
            setStepValue(assumptionId, stepIndex, field, numValue);
          }
        }
      }
    }
  };

  const getDisplayValue = (assumptionId: number, stepIndex: number, field: 'rate' | 'periods', originalValue: any) => {
    const tabIndex = cardTabs[assumptionId] || 0;
    const key = tabIndex === 0
      ? `${assumptionId}-${stepIndex}-${field}`
      : `${assumptionId}-${tabIndex}-${stepIndex}-${field}`;

    const isFocused = focusedFields[key];
    const editedValue = editingSteps[key];

    if (editedValue !== undefined) {
      return editedValue;
    }

    // For custom tabs, get the step value which may return '-'
    const stepValue = getStepValue(assumptionId, stepIndex, field, originalValue);

    // For rate fields, show decimal when focused, percentage when not
    if (field === 'rate' && isFocused && typeof stepValue === 'string' && stepValue.includes('%')) {
      const numValue = parseFloat(stepValue.replace('%', ''));
      return (numValue / 100).toString();
    }

    return stepValue || '';
  };

  const handleSave = async (assumptionId: number) => {
    try {
      const assumption = assumptions.find(a => a.id === assumptionId);
      if (!assumption) return;

      const tabIndex = cardTabs[assumptionId] || 0;
      const nameKey = `${assumptionId}-${tabIndex}`;
      const currentName = editingNames[nameKey];

      // Save the custom name locally
      if (currentName && currentName.trim()) {
        setCustomNames(prev => ({
          ...prev,
          [nameKey]: currentName.trim()
        }));
      }

      // Build updated steps with only editable values (rate and periods)
      const updatedSteps = assumption.steps.map((step, stepIndex) => {
        const rateValue = getStepValue(assumptionId, stepIndex, 'rate', step.rate) || step.rate;
        const periodsValue = getStepValue(assumptionId, stepIndex, 'periods', step.periods);

        // Ensure rate is properly formatted with %
        let formattedRate = step.rate; // Default to original rate
        if (rateValue && rateValue !== '-' && rateValue !== '') {
          if (typeof rateValue === 'string' && !rateValue.includes('%') && !rateValue.includes('/mo')) {
            const numValue = parseFloat(rateValue);
            if (!isNaN(numValue)) {
              formattedRate = `${numValue}%`;
            }
          } else {
            formattedRate = rateValue;
          }
        }

        return {
          ...step, // Keep all original values
          rate: formattedRate,
          periods: (() => {
            const val = periodsValue;
            return val === 'E' || val === 'e' ? 'E' : (parseInt(val) || step.periods);
          })()
        };
      });

      const requestBody = {
        id: assumptionId,
        projectId,
        globalRate: assumption.globalRate,
        steps: updatedSteps,
        impact: assumption.impact
      };

      console.log('Saving assumption:', requestBody);
      console.log('Original assumption:', assumption);
      console.log('Updated steps:', updatedSteps);

      const response = await fetch('/api/assumptions/growth-rates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Save failed:', response.status, response.statusText, errorData);
        throw new Error(`Failed to save assumption: ${response.status} ${response.statusText}`);
      }

      // Refresh data
      const url = projectId
        ? `/api/assumptions/growth-rates?project_id=${projectId}`
        : '/api/assumptions/growth-rates';

      const fetchResponse = await fetch(url);
      const data = await fetchResponse.json();

      // Override tabs to show Custom 1, 2, 3 instead of API tabs
      const assumptionsWithCustomTabs = (data.assumptions || []).map((assumption: any) => ({
        ...assumption,
        tabs: [
          { label: "Custom 1", content: "" },
          { label: "Custom 2", content: "" },
          { label: "Custom 3", content: "" }
        ]
      }));

      setAssumptions(assumptionsWithCustomTabs);

      // Lock the custom set after saving
      const savedTabIndex = cardTabs[assumptionId] || 0;
      const editKey = `${assumptionId}-${savedTabIndex}`;
      setEditMode(prev => ({
        ...prev,
        [editKey]: false
      }));

    } catch (err) {
      console.error('Error saving assumption:', err);
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const handleDelete = async (assumptionId: number) => {
    const assumption = assumptions.find(a => a.id === assumptionId);
    if (!assumption) return;

    const customAssumptions = assumptions.filter(a => a.category === assumption.category);
    const isLastCustom = customAssumptions.length === 1;

    const confirmMessage = isLastCustom
      ? `Are you sure you want to delete "${assumption.name}"? This is the only custom rate for this category. The Global Rate will be inherited to all items subject to this rate.`
      : `Are you sure you want to delete "${assumption.name}"?`;

    if (window.confirm(confirmMessage)) {
      try {
        const response = await fetch(`/api/assumptions/growth-rates?id=${assumptionId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error('Delete failed:', response.status, response.statusText, errorData);
          throw new Error(`Failed to delete assumption: ${response.status} ${response.statusText}`);
        }

        // Refresh data
        const url = projectId
          ? `/api/assumptions/growth-rates?project_id=${projectId}`
          : '/api/assumptions/growth-rates';

        const fetchResponse = await fetch(url);
        const data = await fetchResponse.json();
        setAssumptions(data.assumptions || []);

      } catch (err) {
        console.error('Error deleting assumption:', err);
        setError(err instanceof Error ? err.message : 'Failed to delete');
      }
    }
  };

  // Helper function to get color, icon, name and description for assumption category
  const getCategoryInfo = (category: string) => {
    switch (category) {
      case 'DEVELOPMENT_COSTS':
        return {
          color: '#7367f0',
          icon: BuildingIcon,
          name: 'Inflation: Project Costs',
          description: 'All project costs and cost factors grow annually at this rate. User-defined Custom rates can be applied to various cost centers or budget items.'
        };
      case 'PRICE_APPRECIATION':
        return {
          color: '#28c76f',
          icon: TrendingUp,
          name: 'Growth: Revenue Factors',
          description: 'All project revenue factors grow annually at this rate. User-defined Custom rates can be applied to various revenue assumptions.'
        };
      case 'SALES_ABSORPTION':
        return {
          color: '#ff9f43',
          icon: People,
          name: 'Absorption: Annual Velocity',
          description: 'Default absorption rates for subdivision products after development completion.'
        };
      default:
        return {
          color: '#7367f0',
          icon: BuildingIcon,
          name: category,
          description: ''
        };
    }
  };

  // Loading and error states (keep your existing logic)
  if (loading) {
    return (
      <ThemeProvider theme={materioTheme}>
        <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', p: 4 }}>
          <Typography variant="h4" sx={{ mb: 4, color: 'primary.main', fontWeight: 600 }}>
            Growth Rates / Inflation
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <Typography variant="body1" color="text.secondary">
              Loading growth rate assumptions...
            </Typography>
          </Box>
        </Box>
      </ThemeProvider>
    );
  }

  if (error) {
    return (
      <ThemeProvider theme={materioTheme}>
        <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', p: 4 }}>
          <Typography variant="h4" sx={{ mb: 4, color: 'primary.main', fontWeight: 600 }}>
            Growth Rates / Inflation
          </Typography>
          <Card>
            <CardContent>
              <Typography variant="body1" color="error.main" sx={{ mb: 2 }}>
                Error loading assumptions: {error}
              </Typography>
              <Button variant="contained" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={materioTheme}>
      <Box sx={{
        minHeight: '100vh',
        backgroundColor: 'background.default',
        p: { xs: 2, sm: 3, md: 4 }
      }}>
        <Typography variant="h4" sx={{
          mb: { xs: 2, md: 4 },
          color: 'primary.main',
          fontWeight: 600,
          fontSize: { xs: '1.25rem', md: '1.5rem' }
        }}>
          Growth Rates / Inflation
        </Typography>

        <Card sx={{ p: { xs: 2, md: 3 }, mb: { xs: 2, md: 3 } }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
            Core Growth & Inflation Assumptions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ARGUS-style step-based growth assumptions driving project economics.
          </Typography>
        </Card>

        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '400px 1fr' },
          gap: { xs: 2, md: 3 }
        }}>
          {/* Left Column - Enhanced Assumption Cards */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, md: 2 } }}>
            {assumptions.map((assumption) => {
              const { color, icon: IconComponent, name, description } = getCategoryInfo(assumption.category);
              const isExpanded = expandedCards.has(assumption.id);
              
              return (
                <Card key={assumption.id} sx={{
                  transition: 'all 0.3s ease-in-out',
                  cursor: 'pointer',
                  minHeight: 120, // Ensure consistent card heights
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: 3
                  },
                  ...(isExpanded && {
                    boxShadow: 4,
                    borderColor: color + '40',
                    transform: 'translateY(-2px)'
                  })
                }}>
                  <CardContent
                    sx={{
                      py: { xs: 1.5, md: 2 },
                      cursor: 'pointer'
                    }}
                    onClick={() => handleCustomToggle(assumption.id)}
                  >
                    <Stack direction="row" alignItems="center" spacing={{ xs: 1.5, md: 2 }}>
                      <Avatar sx={{
                        bgcolor: color + '20',
                        width: { xs: 28, md: 32 },
                        height: { xs: 28, md: 32 }
                      }}>
                        <IconComponent sx={{ fontSize: { xs: '0.875rem', md: '1rem' }, color: color }} />
                      </Avatar>

                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1" sx={{
                          fontWeight: 600,
                          fontSize: { xs: '0.9rem', md: '1rem' },
                          lineHeight: 1.3,
                          mb: 0.5
                        }}>
                          {name}
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={{ xs: 0.75, md: 1 }} alignItems="center">
                        <Chip
                          label={assumption.globalRate}
                          size="small"
                          tabIndex={-1}
                          sx={{
                            backgroundColor: color + '15',
                            color: color,
                            border: `1px solid ${color}30`,
                            fontSize: '0.8rem',
                            height: 26,
                            minWidth: 55
                          }}
                        />
                        <Button
                          variant="contained"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCustomToggle(assumption.id);
                          }}
                          tabIndex={-1}
                          sx={{
                            backgroundColor: isExpanded ? color : '#ff9f43',
                            minWidth: 50,
                            fontSize: '0.7rem',
                            textTransform: 'none',
                            height: 24,
                            '&:hover': {
                              backgroundColor: isExpanded ? color + 'dd' : '#ff9f43dd',
                              transform: 'scale(1.02)'
                            },
                            transition: 'all 0.2s ease-in-out'
                          }}
                        >
                          Custom
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAnalysisImpact(assumption.id);
                          }}
                          tabIndex={-1}
                          sx={{
                            borderColor: color,
                            color: color,
                            minWidth: 50,
                            fontSize: '0.7rem',
                            textTransform: 'none',
                            height: 24,
                            '&:hover': {
                              backgroundColor: color + '10',
                              borderColor: color,
                              transform: 'scale(1.02)'
                            },
                            transition: 'all 0.2s ease-in-out'
                          }}
                        >
                          Analysis
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>

                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
                      {/* Basic Tabs */}
                      <Tabs
                        value={cardTabs[assumption.id] || 0}
                        onChange={(event, newValue) => handleTabChange(assumption.id, newValue)}
                        TabIndicatorProps={{ style: { display: 'none' } }}
                        sx={{
                          minHeight: '32px',
                          backgroundColor: 'grey.50',
                          '& .MuiTab-root': {
                            minHeight: '32px',
                            fontSize: '0.75rem',
                            textTransform: 'none',
                            fontWeight: 500,
                            py: 0.5
                          },
                          '& .MuiTabs-flexContainer': {
                            '& > *': {
                              pointerEvents: 'auto'
                            }
                          }
                        }}
                      >
                        {assumption.tabs.map((tab, index) => (
                          <Tab
                            key={index}
                            label={getCustomTabLabel(assumption.id, index, tab.label)}
                            tabIndex={-1}
                          />
                        ))}
                      </Tabs>

                      {/* Content for selected tab */}
                      <CardContent sx={{ pt: 2 }}>
                        {/* Name Input */}
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                          <Typography variant="caption" sx={{
                            minWidth: 40,
                            fontSize: '0.75rem',
                            fontWeight: 500
                          }}>
                            Name:
                          </Typography>
                          <TextField
                            value={(() => {
                              const tabIndex = cardTabs[assumption.id] || 0;
                              const nameKey = `${assumption.id}-${tabIndex}`;
                              return editingNames[nameKey] !== undefined
                                ? editingNames[nameKey]
                                : getCustomTabLabel(assumption.id, tabIndex, `Custom ${tabIndex + 1}`);
                            })()}
                            onChange={(e) => {
                              const tabIndex = cardTabs[assumption.id] || 0;
                              const nameKey = `${assumption.id}-${tabIndex}`;
                              setEditingNames(prev => ({
                                ...prev,
                                [nameKey]: e.target.value
                              }));
                            }}
                            disabled={!isInEditMode(assumption.id)}
                            tabIndex={!isInEditMode(assumption.id) ? -1 : undefined}
                            size="small"
                            variant="outlined"
                            sx={{
                              width: 200,
                              '& .MuiInputBase-input': {
                                fontSize: '0.75rem',
                                py: 0.5
                              }
                            }}
                          />
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => {
                              if (isInEditMode(assumption.id)) {
                                handleSave(assumption.id);
                              } else {
                                handleEditToggle(assumption.id);
                              }
                            }}
                            tabIndex={-1}
                            sx={{
                              fontSize: '0.7rem',
                              minWidth: 50,
                              height: 24,
                              textTransform: 'none'
                            }}
                          >
                            {isInEditMode(assumption.id) ? 'Save' : 'Edit'}
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={() => handleDelete(assumption.id)}
                            tabIndex={-1}
                            sx={{
                              fontSize: '0.7rem',
                              minWidth: 50,
                              height: 24,
                              textTransform: 'none'
                            }}
                          >
                            Delete
                          </Button>
                          {/* Clear button - only show for custom tabs */}
                          {(cardTabs[assumption.id] || 0) > 0 && (
                            <Button
                              variant="outlined"
                              color="warning"
                              size="small"
                              onClick={() => handleClearTab(assumption.id)}
                              tabIndex={-1}
                              sx={{
                                fontSize: '0.7rem',
                                minWidth: 50,
                                height: 24,
                                textTransform: 'none'
                              }}
                            >
                              Clear
                            </Button>
                          )}
                        </Stack>

                        {/* ARGUS-Style Steps Table */}
                        <CompactTable component={Paper} variant="outlined">
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell className="step-col" tabIndex={-1}>Step</TableCell>
                                <TableCell className="period-col" tabIndex={-1}>From<br />Period</TableCell>
                                <TableCell className="rate-col" tabIndex={-1}>Rate</TableCell>
                                <TableCell className="periods-col" tabIndex={-1}>Periods</TableCell>
                                <TableCell className="thru-col" tabIndex={-1}>Thru<br />Period</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {Array.from({ length: getVisibleRowCount(assumption.id) }, (_, idx) => {
                                const step = assumption.steps[idx];
                                return (
                                  <TableRow key={idx}>
                                    <TableCell className="step-cell" tabIndex={-1}>
                                      {step?.step || idx + 1}
                                    </TableCell>
                                    <TableCell tabIndex={-1}>
                                      <Typography sx={{
                                        fontSize: '0.8rem',
                                        textAlign: 'center',
                                        py: '2px'
                                      }}>
                                        {getCalculatedFromPeriod(assumption.id, idx)}
                                      </Typography>
                                    </TableCell>
                                    <TableCell className="rate-cell">
                                      <TextField
                                        value={getDisplayValue(assumption.id, idx, 'rate', step?.rate)}
                                        onChange={(e) => setStepValue(assumption.id, idx, 'rate', e.target.value)}
                                        onFocus={() => handleFieldFocus(assumption.id, idx, 'rate')}
                                        onBlur={() => handleFieldBlur(assumption.id, idx, 'rate', step?.rate)}
                                        disabled={!isInEditMode(assumption.id)}
                                        tabIndex={!isInEditMode(assumption.id) ? -1 : undefined}
                                        size="small"
                                        variant="standard"
                                        placeholder="0.025"
                                        sx={{
                                          width: '100%',
                                          '& .MuiInputBase-input': {
                                            fontSize: '0.8rem',
                                            textAlign: 'center',
                                            padding: '2px 0',
                                            color: isInEditMode(assumption.id) ? getCategoryColor(assumption.category) : 'text.primary',
                                            fontWeight: 600,
                                            pointerEvents: !isInEditMode(assumption.id) ? 'none' : 'auto'
                                          },
                                          '& .MuiInput-underline:before': {
                                            borderBottom: isInEditMode(assumption.id) ? 'none' : '1px solid transparent'
                                          },
                                          '& .MuiInput-underline:hover:before': {
                                            borderBottom: isInEditMode(assumption.id) ? '1px solid rgba(0, 0, 0, 0.42)' : '1px solid transparent'
                                          }
                                        }}
                                      />
                                    </TableCell>
                                    <TableCell className="rate-cell">
                                      <TextField
                                        value={getDisplayValue(assumption.id, idx, 'periods', step?.periods)}
                                        onChange={(e) => setStepValue(assumption.id, idx, 'periods', e.target.value)}
                                        onFocus={() => handleFieldFocus(assumption.id, idx, 'periods')}
                                        onBlur={() => handleFieldBlur(assumption.id, idx, 'periods', step?.periods)}
                                        disabled={!isInEditMode(assumption.id)}
                                        tabIndex={!isInEditMode(assumption.id) ? -1 : undefined}
                                        size="small"
                                        variant="standard"
                                        placeholder="12 or E"
                                        sx={{
                                          width: '100%',
                                          '& .MuiInputBase-input': {
                                            fontSize: '0.8rem',
                                            textAlign: 'center',
                                            padding: '2px 0',
                                            color: isInEditMode(assumption.id) ? getCategoryColor(assumption.category) : 'text.primary',
                                            fontWeight: 600,
                                            pointerEvents: !isInEditMode(assumption.id) ? 'none' : 'auto'
                                          },
                                          '& .MuiInput-underline:before': {
                                            borderBottom: isInEditMode(assumption.id) ? 'none' : '1px solid transparent'
                                          },
                                          '& .MuiInput-underline:hover:before': {
                                            borderBottom: isInEditMode(assumption.id) ? '1px solid rgba(0, 0, 0, 0.42)' : '1px solid transparent'
                                          }
                                        }}
                                      />
                                    </TableCell>
                                    <TableCell tabIndex={-1}>
                                      <Typography sx={{
                                        fontSize: '0.8rem',
                                        textAlign: 'center',
                                        py: '2px'
                                      }}>
                                        {getCalculatedThruPeriod(assumption.id, idx)}
                                      </Typography>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </CompactTable>

                        {/* Footer */}
                        <Box textAlign="center" sx={{ mt: 1 }}>
                          <Typography variant="caption" sx={{ color: getCategoryColor(assumption.category), fontSize: '0.8rem' }}>
                            ↓
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block' }}>
                            E = End of Analysis
                          </Typography>
                        </Box>
                      </CardContent>
                    </Box>
                  </Collapse>
                </Card>
              );
            })}
          </Box>

          {/* Right Column - Land Pricing Card */}
          <Box>
            {/* Land Pricing Section */}
            <Card>
              <CardHeader
                title="Current Land Pricing"
                action={
                  !landPricingLoading && activeLandUseTypes.length > 0 && hasUnsavedChanges && (
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={landPricingSaving ? <CircularProgress size={16} /> : <SaveIcon />}
                      onClick={savePricingData}
                      disabled={landPricingSaving}
                      sx={{ textTransform: 'none', fontWeight: 500 }}
                    >
                      {landPricingSaving ? 'Saving...' : 'Save'}
                    </Button>
                  )
                }
              />
              <CardContent>
                {landPricingLoading && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                )}

                {landPricingError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {landPricingError}
                  </Alert>
                )}

                {!landPricingLoading && activeLandUseTypes.length === 0 && (
                  <Box>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      Pricing Requires at least 1 Project Parcel
                    </Alert>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={navigateToPlanning}
                      startIcon={<Chip label="Planning" size="small" />}
                    >
                      Go to Planning
                    </Button>
                  </Box>
                )}

                {!landPricingLoading && activeLandUseTypes.length > 0 && (
                  <TableContainer component={Paper} sx={{ mt: 2, border: '1px solid', borderColor: 'divider' }}>
                    <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1 } }}>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: 'rgba(138, 141, 147, 0.16)' }}>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#000000', width: '20%' }}>Family</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#000000', width: '30%' }}>Description</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#000000', width: '12%' }}>LU Code</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#000000', textAlign: 'right', width: '20%' }}>$/Unit</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#000000', textAlign: 'center', width: '9%' }}>Unit</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#000000', textAlign: 'center', width: '9%' }}>Inflate</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pricingData.map((item, index) => (
                          <TableRow
                            key={item.lu_type_code || index}
                            sx={{
                              '&:hover': { backgroundColor: 'action.hover' },
                              '&:nth-of-type(odd)': { backgroundColor: 'action.hover' }
                            }}
                          >
                            <TableCell sx={{ py: 0.5 }} tabIndex={-1}>
                              <Chip
                                label={activeLandUseTypes.find(t => t.code === item.lu_type_code)?.family_name || 'Unknown'}
                                size="small"
                                sx={{
                                  ...getChipColor(activeLandUseTypes.find(t => t.code === item.lu_type_code)?.family_name || ''),
                                  fontWeight: 600,
                                  fontSize: '0.7rem',
                                  height: '20px',
                                  '& .MuiChip-label': { px: 1 }
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ py: 0.5 }} tabIndex={-1}>
                              <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                                {item.type_name || activeLandUseTypes.find(t => t.code === item.lu_type_code)?.name || ''}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ py: 0.5 }} tabIndex={-1}>
                              <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                {item.lu_type_code}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ textAlign: 'right', py: 0.5 }}>
                              <TextField
                                size="small"
                                type="text"
                                variant="outlined"
                                value={formatCurrency(item.price_per_unit || 0)}
                                onChange={(e) => updatePricingData(item.lu_type_code, 'price_per_unit', parseCurrency(e.target.value))}
                                inputProps={{
                                  style: { textAlign: 'right', fontSize: '0.85rem', padding: '4px 6px' }
                                }}
                                sx={{
                                  width: '100%',
                                  '& .MuiOutlinedInput-root': {
                                    height: '28px',
                                    '& fieldset': { borderColor: 'divider' },
                                    '&:hover fieldset': { borderColor: 'primary.main' },
                                    '&.Mui-focused fieldset': { borderColor: 'primary.main' }
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center', py: 0.5 }}>
                              <FormControl size="small" sx={{ width: '100%' }}>
                                <Select
                                  value={item.unit_of_measure || 'LS'}
                                  onChange={(e) => updatePricingData(item.lu_type_code, 'unit_of_measure', e.target.value)}
                                  sx={{
                                    height: '28px',
                                    fontSize: '0.75rem',
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' }
                                  }}
                                >
                                  {uomOptions.map(option => (
                                    <MenuItem key={option.code} value={option.code} sx={{ fontSize: '0.75rem' }}>
                                      {option.code}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center', py: 0.5 }}>
                              <FormControl size="small" sx={{ width: '100%' }}>
                                <Select
                                  value={item.inflation_type || 'Global'}
                                  onChange={(e) => updatePricingData(item.lu_type_code, 'inflation_type', e.target.value)}
                                  sx={{
                                    height: '28px',
                                    fontSize: '0.75rem',
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' }
                                  }}
                                >
                                  {inflationOptions.map(option => (
                                    <MenuItem key={option} value={option} sx={{ fontSize: '0.75rem' }}>
                                      {option}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>

            {/* Analysis Impact Cards (shown when button is clicked) */}
            {assumptions.map((assumption) => {
              const { color, name } = getCategoryInfo(assumption.category);
              const showImpact = showAnalysisImpact[assumption.id];

              if (!showImpact) return null;

              return (
                <Card key={assumption.id} sx={{
                  mt: 2,
                  transition: 'all 0.3s ease-in-out',
                  boxShadow: 4,
                  borderColor: color + '40',
                  border: `2px solid ${color}40`
                }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{
                        fontWeight: 600,
                        fontSize: '0.875rem'
                      }}>
                        Analysis Impact - {name}
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => toggleAnalysisImpact(assumption.id)}
                        sx={{
                          borderColor: color,
                          color: color,
                          fontSize: '0.7rem',
                          textTransform: 'none',
                          height: 24
                        }}
                      >
                        Close
                      </Button>
                    </Stack>

                    {/* Impact Metrics */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      {[
                        { label: '$ Amount', value: assumption.impact.dollarAmount, color: 'text.primary' },
                        { label: '% of Project', value: assumption.impact.percentOfProject, color: color },
                        {
                          label: 'IRR Impact',
                          value: `${assumption.impact.irrImpact} bps`,
                          color: assumption.impact.irrImpact.startsWith('+') ? '#28c76f' : '#ea5455'
                        }
                      ].map((metric, idx) => (
                        <Box key={idx} sx={{
                          flex: 1,
                          textAlign: 'center',
                          p: 1.5,
                          borderRadius: 1,
                          border: `1px solid ${metric.color}20`,
                          backgroundColor: `${metric.color}10`
                        }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                            {metric.label}
                          </Typography>
                          <Typography variant="body2" sx={{
                            fontWeight: 'bold',
                            color: metric.color,
                            fontSize: '0.875rem'
                          }}>
                            {metric.value}
                          </Typography>
                        </Box>
                      ))}
                    </Box>

                    {/* Impact Visualization */}
                    <Stack spacing={1.5}>
                      {[
                        {
                          icon: Analytics,
                          title: 'Sensitivity Chart',
                          subtitle: 'IRR vs Rate Change',
                          height: 80
                        },
                        {
                          icon: Timeline,
                          title: 'Timeline Impact',
                          subtitle: 'Cash Flow Effect',
                          height: 60
                        }
                      ].map((chart, idx) => (
                        <Paper
                          key={idx}
                          variant="outlined"
                          sx={{
                            height: chart.height,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderStyle: 'dashed',
                            bgcolor: 'grey.50'
                          }}
                        >
                          <Box textAlign="center">
                            <chart.icon sx={{ color: 'text.disabled', mb: 0.5 }} />
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'block' }}>
                              {chart.title}
                            </Typography>
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                              {chart.subtitle}
                            </Typography>
                          </Box>
                        </Paper>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </Box>

      </Box>
    </ThemeProvider>
  );
};

export default GrowthRates;