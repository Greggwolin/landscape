import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Tabs,
  Tab,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import { emitMutationComplete } from '@/lib/events/landscaper-events';

interface StagingModalProps {
  open: boolean;
  docId: number;
  projectId: number;
  onClose: () => void;
  onCommit: () => void;
}

interface StagingItem {
  assertion_id: number;
  confidence?: number;
  [key: string]: unknown;
}

interface StagingData {
  summary: {
    total_units: number;
    occupied_units: number;
    vacant_units: number;
    vacancy_rate: number;
    monthly_income: number;
  };
  unit_types: StagingItem[];
  units: StagingItem[];
  leases: StagingItem[];
  needs_review: StagingItem[];
}

export const StagingModal: React.FC<StagingModalProps> = ({
  open,
  docId,
  projectId,
  onClose,
  onCommit
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StagingData | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [corrections, setCorrections] = useState<Array<{
    assertion_id: number;
    field_path: string;
    corrected_value: unknown;
    correction_reason: string;
  }>>([]);

  useEffect(() => {
    if (open && docId) {
      fetchStagingData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, docId]);

  const fetchStagingData = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/dms/staging/${docId}/`);
      const result = await response.json();
      setData(result);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch staging data:', error);
      setLoading(false);
    }
  };

  // Function for future use - corrections UI not yet implemented
  // const handleCorrection = (assertionId: number, field: string, value: unknown, reason: string) => {
  //   setCorrections([
  //     ...corrections,
  //     { assertion_id: assertionId, field_path: field, corrected_value: value, correction_reason: reason }
  //   ]);
  // };

  const handleCommit = async () => {
    try {
      // Get all approved assertion IDs (all high-confidence items + corrected items)
      const approvedIds = [
        ...data!.unit_types.map(ut => ut.assertion_id),
        ...data!.units.map(u => u.assertion_id),
        ...data!.leases.map(l => l.assertion_id)
      ];

      const payload = {
        project_id: projectId,
        approved_assertions: approvedIds,
        corrections: corrections
      };

      console.log('🚀 Committing staging data:', {
        docId,
        projectId,
        approvedCount: approvedIds.length,
        correctionsCount: corrections.length
      });

      const response = await fetch(`http://localhost:8000/api/dms/staging/${docId}/commit/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('📤 Commit response:', response.status, response.statusText);

      if (response.ok) {
        console.log('✅ Commit successful!');
        emitMutationComplete({
          projectId,
          mutationType: 'staging_commit',
          tables: ['units', 'leases', 'unit_types'],
          counts: {
            created: approvedIds.length,
            total: approvedIds.length,
          },
        });
        onCommit();
        onClose();
      } else {
        const contentType = response.headers.get('content-type');
        let error;
        if (contentType && contentType.includes('application/json')) {
          error = await response.json();
        } else {
          const text = await response.text();
          error = { error: text || `HTTP ${response.status}` };
        }
        console.error('❌ Commit failed:', error);
        alert(`Failed to commit: ${error.error || JSON.stringify(error)}`);
      }
    } catch (error) {
      console.error('❌ Commit exception:', error);
      alert('Failed to commit data. Please try again.');
    }
  };

  if (loading) {
    return (
      <Dialog open={open} maxWidth="md" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
            <Typography ml={2}>Extracting rent roll data...</Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (!data) {
    return null;
  }

  const getConfidenceColor = (confidence: number): "success" | "warning" | "error" => {
    if (confidence >= 0.9) return 'success';
    if (confidence >= 0.7) return 'warning';
    return 'error';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.9) return <CheckCircleIcon color="success" fontSize="small" />;
    return <WarningIcon color="warning" fontSize="small" />;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Rent Roll Extraction Review</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Summary Section */}
        <Box mb={3}>
          <Paper elevation={1} sx={{ p: 2, bgcolor: '#f5f5f5' }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              Summary
            </Typography>
            <Box display="flex" gap={3}>
              <Typography>
                <strong>Total Units:</strong> {data.summary.total_units}
              </Typography>
              <Typography>
                <strong>Occupied:</strong> {data.summary.occupied_units} ({(100 - data.summary.vacancy_rate).toFixed(1)}%)
              </Typography>
              <Typography>
                <strong>Vacant:</strong> {data.summary.vacant_units}
              </Typography>
              <Typography>
                <strong>Monthly Income:</strong> ${data.summary.monthly_income.toLocaleString()}
              </Typography>
            </Box>
          </Paper>
        </Box>

        {/* Needs Review Alerts */}
        {data.needs_review.length > 0 && (
          <Box mb={3}>
            {data.needs_review.map((item, idx) => (
              <Alert
                key={idx}
                severity={item.severity === 'high' ? 'error' : item.severity === 'medium' ? 'warning' : 'info'}
                sx={{ mb: 1 }}
              >
                <Typography variant="body2">
                  <strong>{item.message}</strong>
                  {item.suggestion && ` - ${item.suggestion}`}
                </Typography>
              </Alert>
            ))}
          </Box>
        )}

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
            <Tab label={`Unit Types (${data.unit_types.length})`} />
            <Tab label={`Individual Units (${data.units.length})`} />
            <Tab label={`Leases (${data.leases.length})`} />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <Box mt={2}>
          {/* Unit Types Tab */}
          {activeTab === 0 && (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Units</TableCell>
                    <TableCell align="right">Avg SF</TableCell>
                    <TableCell align="right">Market Rent</TableCell>
                    <TableCell align="center">Confidence</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.unit_types.map((ut, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {ut.data.bedroom_count}BR / {ut.data.bathroom_count}BA
                      </TableCell>
                      <TableCell align="right">{ut.data.unit_count}</TableCell>
                      <TableCell align="right">
                        {ut.data.typical_sqft ? ut.data.typical_sqft.toLocaleString() : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {ut.data.market_rent_monthly ? `$${ut.data.market_rent_monthly.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          icon={getConfidenceIcon(ut.confidence)}
                          label={`${(ut.confidence * 100).toFixed(0)}%`}
                          size="small"
                          color={getConfidenceColor(ut.confidence)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Individual Units Tab */}
          {activeTab === 1 && (
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Unit #</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">SF</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="center">Confidence</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.units.slice(0, 50).map((unit, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{unit.data.unit_number}</TableCell>
                      <TableCell>
                        {unit.data.bedroom_count && unit.data.bathroom_count
                          ? `${unit.data.bedroom_count}/${unit.data.bathroom_count}`
                          : unit.data.is_commercial ? 'Commercial' : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {unit.data.square_feet || '-'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={unit.data.status}
                          size="small"
                          color={unit.data.status === 'occupied' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          icon={getConfidenceIcon(unit.confidence)}
                          label={`${(unit.confidence * 100).toFixed(0)}%`}
                          size="small"
                          color={getConfidenceColor(unit.confidence)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Leases Tab */}
          {activeTab === 2 && (
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Unit #</TableCell>
                    <TableCell>Tenant</TableCell>
                    <TableCell align="right">Rent</TableCell>
                    <TableCell>Lease End</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="center">Confidence</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.leases.map((lease, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{lease.data.unit_number}</TableCell>
                      <TableCell>{lease.data.tenant_name || '-'}</TableCell>
                      <TableCell align="right">
                        {lease.data.monthly_rent
                          ? `$${lease.data.monthly_rent.toLocaleString()}`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {lease.data.lease_end_date
                          ? new Date(lease.data.lease_end_date).toLocaleDateString()
                          : 'MTM'}
                      </TableCell>
                      <TableCell>
                        {lease.data.is_section_8 && (
                          <Chip label="Sec 8" size="small" color="info" />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          icon={getConfidenceIcon(lease.confidence)}
                          label={`${(lease.confidence * 100).toFixed(0)}%`}
                          size="small"
                          color={getConfidenceColor(lease.confidence)}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => setEditingItem(`lease_${idx}`)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 'auto' }}>
          {corrections.length > 0 && `${corrections.length} correction(s) pending`}
        </Typography>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleCommit}
          variant="contained"
          color="primary"
          startIcon={<CheckCircleIcon />}
        >
          Approve & Commit to Database
        </Button>
      </DialogActions>
    </Dialog>
  );
};
