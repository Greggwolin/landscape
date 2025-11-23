/**
 * Timing & Escalation Tile Component
 *
 * Custom renderer for Budget tab's Timing & Escalation accordion section
 * Visible in Standard and Detail modes only
 *
 * Features:
 * - Auto-prefill dates from Napkin mode (start_period + periods_to_complete)
 * - Distribution visualization with S-curve controls
 * - Escalation calculation with real-time preview
 * - Inline validation
 */

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  CFormLabel,
  CFormInput,
  CFormSelect,
  CFormRange,
  CBadge,
  CTooltip,
  CInputGroup,
  CInputGroupText,
  CFormFloating
} from '@coreui/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { BudgetItem, TimingMethod, CurveProfile, EscalationMethod } from '@/types/budget';
import type { GrowthRateSet } from '@/types/benchmarks';
import {
  calculateDateFromPeriod,
  calculateDistribution,
  calculateEscalatedAmount,
  formatMoney
} from '../utils/timingCalculations';
import { validateTimingFields } from '../utils/timingValidation';
import { format } from 'date-fns';
import './timing-escalation-tile.css';

interface TimingEscalationTileProps {
  item: BudgetItem;
  projectId: number;
  projectStartDate?: string | null;
  onFieldChange: (field: keyof BudgetItem, value: any) => Promise<void> | void;
}

export default function TimingEscalationTile({
  item,
  projectId,
  projectStartDate,
  onFieldChange
}: TimingEscalationTileProps) {
  const [growthRateSets, setGrowthRateSets] = useState<GrowthRateSet[]>([]);
  const [escalationSource, setEscalationSource] = useState<'benchmark' | 'custom'>(
    item.escalation_rate !== null && item.escalation_rate !== undefined ? 'custom' : 'benchmark'
  );
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedProfile, setDraggedProfile] = useState<'front_loaded' | 'standard' | 'back_loaded' | null>(null);

  // Fetch growth rate benchmarks for escalation dropdown
  useEffect(() => {
    fetch('/api/benchmarks/growth-rates?is_global=true')
      .then(res => res.json())
      .then(data => {
        setGrowthRateSets(data.sets || []);
      })
      .catch(err => {
        console.error('Failed to fetch growth rate benchmarks:', err);
      });
  }, []);

  // Set default escalation method to "To Start" if not set
  useEffect(() => {
    if (!item.escalation_method && item.escalation_rate) {
      onFieldChange('escalation_method', 'to_start');
    }
  }, [item.escalation_rate, item.escalation_method]);

  // Set default curve profile to "standard" when S-Curve is selected
  useEffect(() => {
    if (item.timing_method === 'curve' && !item.curve_profile) {
      onFieldChange('curve_profile', 'standard');
    }
  }, [item.timing_method, item.curve_profile]);

  // Auto-prefill dates from Napkin fields on first render
  useEffect(() => {
    if (!item.start_date && item.start_period && projectStartDate) {
      const startDate = calculateDateFromPeriod(projectStartDate, item.start_period);
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      onFieldChange('start_date', startDateStr);

      // Also calculate end date if duration is provided
      if (item.periods_to_complete) {
        const endDate = calculateDateFromPeriod(projectStartDate, item.start_period + item.periods_to_complete);
        const endDateStr = format(endDate, 'yyyy-MM-dd');
        onFieldChange('end_date', endDateStr);
      }
    }
  }, [item.start_period, item.periods_to_complete, projectStartDate]);

  // Calculate distribution for chart visualization
  const distributionData = useMemo(() => {
    if (!item.start_date || !item.end_date || !item.amount) {
      return [];
    }

    try {
      const method = item.timing_method === 'curve' ? 'curve' :
                     item.timing_method === 'milestone' ? 'milestone' : 'even';

      return calculateDistribution(
        item.amount,
        item.start_date,
        item.end_date,
        method,
        item.curve_profile || undefined,
        item.curve_steepness || 25,
        projectStartDate || undefined
      );
    } catch (error) {
      console.error('Error calculating distribution:', error);
      return [];
    }
  }, [
    item.start_date,
    item.end_date,
    item.amount,
    item.timing_method,
    item.curve_profile,
    item.curve_steepness
  ]);

  // Calculate escalated amount
  const escalatedAmount = useMemo(() => {
    if (!item.amount || !item.escalation_rate || !item.start_date || !projectStartDate) {
      return null;
    }

    try {
      return calculateEscalatedAmount(
        item.amount,
        item.escalation_rate,
        item.escalation_method || 'to_start',
        item.start_date,
        item.end_date || item.start_date,
        projectStartDate
      );
    } catch (error) {
      console.error('Error calculating escalated amount:', error);
      return null;
    }
  }, [
    item.amount,
    item.escalation_rate,
    item.escalation_method,
    item.start_date,
    item.end_date,
    projectStartDate
  ]);

  // Validation
  const validation = useMemo(() => {
    return validateTimingFields({
      start_date: item.start_date,
      end_date: item.end_date,
      timing_method: item.timing_method,
      curve_profile: item.curve_profile,
      curve_steepness: item.curve_steepness,
      escalation_rate: item.escalation_rate,
      escalation_method: item.escalation_method
    });
  }, [item]);

  // Show curve controls only when curve distribution selected
  const showCurveControls = item.timing_method === 'curve';

  // Show chart when distribution data available
  const showChart = distributionData.length > 0 && showCurveControls;

  // Handle curve dragging for manual adjustment
  const handleCurveMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !showChart) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const position = x / width;

    // Determine profile based on drag position
    if (position < 0.33) {
      if (draggedProfile !== 'front_loaded') {
        setDraggedProfile('front_loaded');
        onFieldChange('curve_profile', 'front_loaded');
      }
    } else if (position > 0.67) {
      if (draggedProfile !== 'back_loaded') {
        setDraggedProfile('back_loaded');
        onFieldChange('curve_profile', 'back_loaded');
      }
    } else {
      if (draggedProfile !== 'standard') {
        setDraggedProfile('standard');
        onFieldChange('curve_profile', 'standard');
      }
    }
  };

  const handleCurveMouseDown = () => {
    setIsDragging(true);
    setDraggedProfile(item.curve_profile as any || 'standard');
  };

  const handleCurveMouseUp = () => {
    setIsDragging(false);
    setDraggedProfile(null);
  };

  return (
    <div className="timing-escalation-tile p-3">
      {/* Row 1: Start Date, End Date, Escalation Rate, Custom Rate, Escalation Timing */}
      <div className="row g-2 mb-3">
        <div className="col-md-2" style={{ flex: '0 0 18.7%', maxWidth: '18.7%' }}>
          <CTooltip
            content={validation.errors.start_date || ''}
            placement="top"
            visible={Boolean(validation.errors.start_date)}
          >
            <CFormFloating>
              <CFormInput
                type="date"
                id="startDate"
                value={item.start_date?.split('T')[0] || ''}
                onChange={(e) => onFieldChange('start_date', e.target.value || null)}
                invalid={Boolean(validation.errors.start_date)}
              />
              <CFormLabel htmlFor="startDate">Start Date</CFormLabel>
            </CFormFloating>
          </CTooltip>
        </div>

        <div className="col-md-2" style={{ flex: '0 0 18.7%', maxWidth: '18.7%' }}>
          <CTooltip
            content={validation.errors.end_date || ''}
            placement="top"
            visible={Boolean(validation.errors.end_date)}
          >
            <CFormFloating>
              <CFormInput
                type="date"
                id="endDate"
                value={item.end_date?.split('T')[0] || ''}
                onChange={(e) => onFieldChange('end_date', e.target.value || null)}
                invalid={Boolean(validation.errors.end_date)}
              />
              <CFormLabel htmlFor="endDate">End Date</CFormLabel>
            </CFormFloating>
          </CTooltip>
        </div>

        <div className="col-md-3" style={{ flex: '0 0 27.4%', maxWidth: '27.4%' }}>
          <CTooltip
            content={validation.errors.escalation_rate || ''}
            placement="top"
            visible={Boolean(validation.errors.escalation_rate)}
          >
            <CFormFloating>
              <CFormSelect
                id="escalationRate"
                value={selectedBenchmarkId || (escalationSource === 'custom' ? 'custom' : '')}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setEscalationSource('custom');
                    setSelectedBenchmarkId(null);
                    onFieldChange('escalation_rate', null);
                  } else if (e.target.value) {
                    const benchmark = growthRateSets.find(s => s.set_id === parseInt(e.target.value));
                    setSelectedBenchmarkId(parseInt(e.target.value));
                    setEscalationSource('benchmark');
                    const rate = benchmark?.steps?.[0]?.annual_rate || 0;
                    onFieldChange('escalation_rate', rate);
                  } else {
                    setSelectedBenchmarkId(null);
                    setEscalationSource('benchmark');
                    onFieldChange('escalation_rate', null);
                  }
                }}
                invalid={Boolean(validation.errors.escalation_rate)}
              >
                <option value="">Select...</option>
                {growthRateSets.map(set => (
                  <option key={set.set_id} value={set.set_id}>
                    {set.set_name}
                  </option>
                ))}
                <option value="custom">Custom Rate...</option>
              </CFormSelect>
              <CFormLabel htmlFor="escalationRate">
                Escalation Rate
                <CTooltip
                  content="Escalation applied from project start to work start date. Escalation during work progression is rare and typically not applied."
                  placement="top"
                >
                  <span className="text-muted ms-1" style={{ cursor: 'help' }}>ⓘ</span>
                </CTooltip>
              </CFormLabel>
            </CFormFloating>
          </CTooltip>
        </div>

        {escalationSource === 'custom' && (
          <div className="col-md-2" style={{ flex: '0 0 11%', maxWidth: '11%' }}>
            <CFormFloating>
              <CFormInput
                type="number"
                id="customEscalationRate"
                value={item.escalation_rate ?? ''}
                onChange={(e) => onFieldChange('escalation_rate', e.target.value ? parseFloat(e.target.value) : null)}
                step="0.1"
                min="-50"
                max="50"
              />
              <CFormLabel htmlFor="customEscalationRate">Rate (%)</CFormLabel>
            </CFormFloating>
          </div>
        )}

        <div style={{ flex: escalationSource === 'custom' ? '0 0 23.2%' : '0 0 35.2%', maxWidth: escalationSource === 'custom' ? '23.2%' : '35.2%' }}>
          <CTooltip
            content={validation.errors.escalation_method || ''}
            placement="top"
            visible={Boolean(validation.errors.escalation_method)}
          >
            <CFormFloating>
              <CFormSelect
                id="escalationTiming"
                value={item.escalation_method || 'to_start'}
                onChange={(e) => onFieldChange('escalation_method', (e.target.value as EscalationMethod) || null)}
              >
                <option value="to_start">To Start</option>
                <option value="through_duration">Throughout Duration</option>
              </CFormSelect>
              <CFormLabel htmlFor="escalationTiming">Escalation Timing</CFormLabel>
            </CFormFloating>
          </CTooltip>
        </div>
      </div>

      {/* Row 2: Distribution, Curve Profile, Curve Steepness */}
      <div className="row g-2 mb-3">
        <div className="col-md-3">
          <CFormFloating>
            <CFormSelect
              id="distribution"
              value={item.timing_method || ''}
              onChange={(e) => onFieldChange('timing_method', (e.target.value as TimingMethod) || null)}
            >
              <option value="">Select...</option>
              <option value="distributed">Even</option>
              <option value="curve">S-Curve</option>
              <option value="milestone">Milestone</option>
            </CFormSelect>
            <CFormLabel htmlFor="distribution">Distribution</CFormLabel>
          </CFormFloating>
        </div>

        {showCurveControls && (
          <>
            <div className="col-md-3">
              <CTooltip
                content={validation.errors.curve_profile || ''}
                placement="top"
                visible={Boolean(validation.errors.curve_profile)}
              >
                <CFormFloating>
                  <CFormSelect
                    id="curveProfile"
                    value={item.curve_profile || ''}
                    onChange={(e) => onFieldChange('curve_profile', (e.target.value as CurveProfile) || null)}
                    invalid={Boolean(validation.errors.curve_profile)}
                  >
                    <option value="">Select...</option>
                    <option value="standard">Standard</option>
                    <option value="front_loaded">Front-Loaded</option>
                    <option value="back_loaded">Back-Loaded</option>
                  </CFormSelect>
                  <CFormLabel htmlFor="curveProfile">Curve Profile</CFormLabel>
                </CFormFloating>
              </CTooltip>
            </div>

            <div className="col-md-6">
              <div className="d-flex justify-content-between align-items-center">
                <CFormLabel className="small text-muted mb-0">Curve Steepness</CFormLabel>
                <CBadge color="secondary" className="font-monospace">
                  {item.curve_steepness || 25}
                </CBadge>
              </div>
              <div className="d-flex align-items-center gap-2 mt-1">
                <span className="small text-muted" style={{ fontSize: '0.75rem' }}>Gentle</span>
                <CFormRange
                  value={item.curve_steepness || 25}
                  onChange={(e) => onFieldChange('curve_steepness', parseInt(e.target.value))}
                  min="0"
                  max="100"
                  className="flex-grow-1"
                />
                <span className="small text-muted" style={{ fontSize: '0.75rem' }}>Aggressive</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Row 3: Distribution Chart */}
      {showChart && (
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <CFormLabel className="small text-muted mb-0">Distribution Preview</CFormLabel>
            <small className="text-muted" style={{ fontSize: '0.7rem' }}>
              Drag curve to adjust profile
            </small>
          </div>
          <div
            style={{
              backgroundColor: isDragging ? 'var(--cui-tertiary-bg)' : 'var(--cui-body-bg)',
              padding: '0.5rem',
              borderRadius: '4px',
              border: isDragging ? '2px solid var(--cui-primary)' : '1px solid var(--cui-border-color)',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
              transition: 'all 0.15s ease'
            }}
            onMouseDown={handleCurveMouseDown}
            onMouseMove={handleCurveMouseMove}
            onMouseUp={handleCurveMouseUp}
            onMouseLeave={handleCurveMouseUp}
          >
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={distributionData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--cui-border-color)" />
                <XAxis
                  dataKey="periodNumber"
                  tick={{ fontSize: 10, fill: 'var(--cui-body-color)' }}
                  stroke="var(--cui-border-color)"
                  label={{ value: 'Period', position: 'insideBottom', offset: -5, fontSize: 10 }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--cui-body-color)' }}
                  stroke="var(--cui-border-color)"
                  tickFormatter={(value) => `${Math.round(value)}%`}
                  label={{ value: '%', angle: -90, position: 'insideLeft', fontSize: 10 }}
                  domain={[0, 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--cui-body-bg)',
                    border: '1px solid var(--cui-border-color)',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'percent') {
                      return [`${value.toFixed(2)}%`, 'Percentage'];
                    }
                    return [value, name];
                  }}
                  labelFormatter={(label) => `Period ${label}`}
                  labelStyle={{ color: 'var(--cui-body-color)' }}
                />
                <Line
                  type="monotone"
                  dataKey="percent"
                  stroke="var(--cui-primary)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Row 4: Escalated Amount Display */}
      {escalatedAmount && escalatedAmount !== item.amount && (
        <div className="d-flex justify-content-between align-items-center p-2 rounded" style={{ backgroundColor: 'var(--cui-secondary-bg)' }}>
          <div className="small text-muted">
            Base Amount: {formatMoney(item.amount || 0)}
          </div>
          <div className="text-end">
            <div className="small text-muted">Escalated Amount</div>
            <div className="h6 mb-0 text-primary">{formatMoney(escalatedAmount)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
