"use client";

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Alert,
  Button,
  Chip,
  CircularProgress,
  Paper
} from '@mui/material';
import { useRouter } from 'next/navigation';

const GlobalAssumptions = ({ projectId = 1 }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeLandUseTypes, setActiveLandUseTypes] = useState([]);
  const [pricingData, setPricingData] = useState([]);
  const [error, setError] = useState(null);

  // UOM and inflation options
  const uomOptions = ['LS', 'SF', 'Unit', 'Acre'];
  const inflationOptions = ['Global', 'Custom 1', 'Custom 2', 'Custom 3'];

  // Load active land use types based on parcel assignments
  const loadActiveLandUseTypes = async () => {
    try {
      const response = await fetch(`/api/landuse/active-types?project_id=${projectId}`);
      if (!response.ok) throw new Error('Failed to load land use types');
      const types = await response.json();
      setActiveLandUseTypes(types);

      // Initialize pricing data for each type if not already set
      const existingCodes = pricingData.map(p => p.lu_type_code);
      const newPricingData = [...pricingData];

      types.forEach(type => {
        if (!existingCodes.includes(type.code)) {
          newPricingData.push({
            lu_type_code: type.code,
            type_name: type.name,
            price_per_unit: 0,
            unit_of_measure: 'LS',
            inflation_type: 'Global'
          });
        }
      });

      setPricingData(newPricingData);
    } catch (err) {
      console.error('Failed to load active land use types:', err);
      setError('Failed to load land use data');
    }
  };

  // Load existing pricing data
  const loadPricingData = async () => {
    try {
      const response = await fetch(`/api/market-pricing?project_id=${projectId}`);
      if (!response.ok) throw new Error('Failed to load pricing data');
      const data = await response.json();
      setPricingData(data);
    } catch (err) {
      console.error('Failed to load pricing data:', err);
    }
  };

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await Promise.all([
        loadActiveLandUseTypes(),
        loadPricingData()
      ]);
      setLoading(false);
    };

    if (projectId) {
      initializeData();
    }
  }, [projectId]);

  // Update pricing data
  const updatePricingData = (typeCode, field, value) => {
    setPricingData(prev => prev.map(item =>
      item.lu_type_code === typeCode
        ? { ...item, [field]: value }
        : item
    ));
  };

  // Save pricing data
  const savePricingData = async () => {
    setSaving(true);
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

      // Show success feedback
      setTimeout(() => setSaving(false), 1000);
    } catch (err) {
      console.error('Failed to save pricing data:', err);
      setError('Failed to save pricing data');
      setSaving(false);
    }
  };

  // Format currency for display
  const formatCurrency = (value) => {
    if (!value || value === 0) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Handle navigate to planning
  const navigateToPlanning = () => {
    router.push('/planning');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Empty state when no parcels have land use types assigned
  if (activeLandUseTypes.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Card>
          <CardHeader title="Global Assumptions" />
          <CardContent>
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
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardHeader
          title="Global Assumptions"
          action={
            <Button
              variant="contained"
              onClick={savePricingData}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} /> : null}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          }
        />
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Typography variant="h6" sx={{ mb: 2 }}>
            Current Land Pricing
          </Typography>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>LU Code</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>$/Unit</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>UOM</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Inflate</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pricingData.map((item, index) => (
                  <TableRow key={item.lu_type_code || index}>
                    <TableCell>
                      {item.lu_type_code}
                    </TableCell>
                    <TableCell>
                      {item.type_name || activeLandUseTypes.find(t => t.code === item.lu_type_code)?.name || ''}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <TextField
                        size="small"
                        type="number"
                        value={item.price_per_unit || ''}
                        onChange={(e) => updatePricingData(item.lu_type_code, 'price_per_unit', parseFloat(e.target.value) || 0)}
                        inputProps={{
                          style: { textAlign: 'center' },
                          min: 0
                        }}
                        sx={{ width: 120 }}
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <FormControl size="small" sx={{ minWidth: 80 }}>
                        <Select
                          value={item.unit_of_measure || 'LS'}
                          onChange={(e) => updatePricingData(item.lu_type_code, 'unit_of_measure', e.target.value)}
                        >
                          {uomOptions.map(option => (
                            <MenuItem key={option} value={option}>
                              {option}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <FormControl size="small" sx={{ minWidth: 100 }}>
                        <Select
                          value={item.inflation_type || 'Global'}
                          onChange={(e) => updatePricingData(item.lu_type_code, 'inflation_type', e.target.value)}
                        >
                          {inflationOptions.map(option => (
                            <MenuItem key={option} value={option}>
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
        </CardContent>
      </Card>
    </Box>
  );
};

export default GlobalAssumptions;