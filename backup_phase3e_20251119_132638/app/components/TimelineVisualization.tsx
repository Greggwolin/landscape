'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Slider,
  Button,
  CircularProgress
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

interface TimelineItem {
  budget_item_id: number;
  description: string;
  start_period: number;
  periods_to_complete: number;
  amount: number;
  timing_method?: string;
}

interface TimelineVisualizationProps {
  projectId: number;
  height?: number;
}

export default function TimelineVisualization({
  projectId,
  height = 600
}: TimelineVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPeriod, setCurrentPeriod] = useState(0);
  const [maxPeriod, setMaxPeriod] = useState(100);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTimelineData();
  }, [projectId]);

  useEffect(() => {
    if (items.length > 0) {
      drawTimeline();
    }
  }, [items, currentPeriod]);

  const fetchTimelineData = async () => {
    try {
      setLoading(true);

      // Calculate timeline first to ensure periods are up-to-date
      const calcResponse = await fetch(`/api/projects/${projectId}/timeline/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dry_run: false })
      });

      const calcResult = await calcResponse.json();

      if (!calcResult.success) {
        setError(calcResult.error || 'Timeline calculation failed');
        return;
      }

      // Fetch budget items with calculated periods
      const response = await fetch(`/api/budget/items/${projectId}`);
      const result = await response.json();

      if (result.success) {
        const validItems = result.data.filter(
          (item: TimelineItem) => item.start_period != null && item.periods_to_complete != null
        );

        setItems(validItems);

        // Calculate max period
        const maxEnd = Math.max(
          ...validItems.map((item: TimelineItem) =>
            item.start_period + item.periods_to_complete
          ),
          100
        );
        setMaxPeriod(maxEnd);
      } else {
        setError(result.error || 'Failed to fetch timeline data');
      }
    } catch (err) {
      setError('Network error fetching timeline data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const drawTimeline = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Constants
    const leftMargin = 250;
    const rightMargin = 50;
    const topMargin = 30;
    const rowHeight = 35;
    const barHeight = 25;
    const timelineWidth = width - leftMargin - rightMargin;

    // Draw background
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, width, height);

    // Draw header
    ctx.fillStyle = '#1976d2';
    ctx.fillRect(0, 0, width, topMargin);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Project Timeline', 10, 20);

    // Draw period markers
    ctx.fillStyle = '#333333';
    ctx.font = '11px Arial';
    const periodStep = Math.ceil(maxPeriod / 10);
    for (let period = 0; period <= maxPeriod; period += periodStep) {
      const x = leftMargin + (period / maxPeriod) * timelineWidth;
      ctx.beginPath();
      ctx.moveTo(x, topMargin);
      ctx.lineTo(x, height);
      ctx.strokeStyle = '#dddddd';
      ctx.stroke();

      ctx.fillStyle = '#666666';
      ctx.textAlign = 'center';
      ctx.fillText(`P${period}`, x, topMargin - 10);
    }

    // Draw current period indicator
    if (currentPeriod > 0) {
      const currentX = leftMargin + (currentPeriod / maxPeriod) * timelineWidth;
      ctx.beginPath();
      ctx.moveTo(currentX, topMargin);
      ctx.lineTo(currentX, height);
      ctx.strokeStyle = '#ff5722';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.lineWidth = 1;

      ctx.fillStyle = '#ff5722';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Current: P${currentPeriod}`, currentX, topMargin - 15);
    }

    // Draw items
    items.forEach((item, index) => {
      const y = topMargin + (index * rowHeight) + 5;

      // Draw item label
      ctx.fillStyle = '#333333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'right';
      const labelText = item.description.length > 30
        ? item.description.substring(0, 27) + '...'
        : item.description;
      ctx.fillText(labelText, leftMargin - 10, y + barHeight / 2 + 4);

      // Calculate bar dimensions
      const startX = leftMargin + (item.start_period / maxPeriod) * timelineWidth;
      const barWidth = (item.periods_to_complete / maxPeriod) * timelineWidth;

      // Determine bar color based on timing method
      let barColor = '#4caf50'; // Default green
      if (item.timing_method === 'DEPENDENT') {
        barColor = '#2196f3'; // Blue for dependent
      } else if (item.timing_method === 'MANUAL') {
        barColor = '#ff9800'; // Orange for manual
      }

      // Draw bar shadow
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(startX + 2, y + 2, barWidth, barHeight);

      // Draw bar
      ctx.fillStyle = barColor;
      ctx.fillRect(startX, y, barWidth, barHeight);

      // Draw bar border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(startX, y, barWidth, barHeight);

      // Draw period labels on bar
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      const labelX = startX + barWidth / 2;
      const labelY = y + barHeight / 2 + 4;
      ctx.fillText(
        `P${item.start_period}-${item.start_period + item.periods_to_complete}`,
        labelX,
        labelY
      );

      // Draw amount label
      ctx.fillStyle = '#666666';
      ctx.font = '10px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(
        `$${(item.amount / 1000).toFixed(0)}K`,
        startX + barWidth + 5,
        y + barHeight / 2 + 3
      );
    });

    // Draw legend
    const legendY = height - 60;
    const legendItems = [
      { color: '#4caf50', label: 'Absolute' },
      { color: '#2196f3', label: 'Dependent' },
      { color: '#ff9800', label: 'Manual' }
    ];

    legendItems.forEach((legend, index) => {
      const legendX = leftMargin + (index * 120);

      ctx.fillStyle = legend.color;
      ctx.fillRect(legendX, legendY, 20, 15);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(legendX, legendY, 20, 15);

      ctx.fillStyle = '#333333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(legend.label, legendX + 25, legendY + 11);
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={height}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">{error}</Typography>
        <Button onClick={fetchTimelineData} variant="outlined" startIcon={<RefreshIcon />} sx={{ mt: 2 }}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Paper elevation={2}>
      <Box p={2}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Project Timeline Visualization</Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={fetchTimelineData}
          >
            Refresh
          </Button>
        </Box>

        <canvas
          ref={canvasRef}
          width={1200}
          height={height}
          style={{
            width: '100%',
            height: 'auto',
            border: '1px solid #e0e0e0',
            borderRadius: '4px'
          }}
        />

        <Box mt={2}>
          <Typography variant="body2" gutterBottom>
            Current Period: {currentPeriod}
          </Typography>
          <Slider
            value={currentPeriod}
            onChange={(_, value) => setCurrentPeriod(value as number)}
            min={0}
            max={maxPeriod}
            step={1}
            marks={[
              { value: 0, label: '0' },
              { value: Math.floor(maxPeriod / 2), label: `P${Math.floor(maxPeriod / 2)}` },
              { value: maxPeriod, label: `P${maxPeriod}` }
            ]}
            valueLabelDisplay="auto"
          />
        </Box>

        {items.length === 0 && (
          <Box textAlign="center" py={3}>
            <Typography color="textSecondary">
              No timeline data available. Add budget items with start periods and durations.
            </Typography>
          </Box>
        )}

        {items.length > 0 && (
          <Box mt={2}>
            <Typography variant="caption" color="textSecondary">
              Showing {items.length} budget items across {maxPeriod} periods
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
}
