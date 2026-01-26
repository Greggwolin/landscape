'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '@/app/components/CoreUIThemeProvider';

// Color palette for comparable properties (distinct, visible on dark bg)
const COMPARABLE_COLORS = [
  '#f97316', // orange
  '#22c55e', // green
  '#a855f7', // purple
  '#ef4444', // red
  '#06b6d4', // cyan
  '#eab308', // yellow
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f59e0b', // amber
  '#8b5cf6', // violet
];

const SUBJECT_COLOR = '#321fdb'; // CoreUI primary blue

interface RentalComparable {
  comparable_id: number;
  property_name: string;
  bedrooms: number;
  bathrooms: number;
  avg_sqft: number;
  asking_rent: number;
}

interface FloorPlan {
  id: string;
  name: string;
  bedrooms: number;
  bathrooms?: number;
  sqft: number;
  marketRent: number;
}

export interface PropertyColorMap {
  [propertyName: string]: string;
}

interface CompetitiveMarketChartsProps {
  comparables?: RentalComparable[];
  floorPlans?: FloorPlan[];
  subjectPropertyName?: string;
  onPropertyClick?: (propertyName: string) => void;
  onColorsAssigned?: (colors: PropertyColorMap) => void;
}

interface DataPoint {
  x: number;
  y: number;
  xDisplay: number; // For jittered display
  label: string;
  propertyName: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  rent: number;
}

interface PropertyLine {
  propertyName: string;
  points: DataPoint[];
  isSubject: boolean;
  color: string;
}

interface TooltipData {
  x: number;
  y: number;
  propertyName: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  rent: number;
  isSubject: boolean;
}

interface LineChartProps {
  lines: PropertyLine[];
  xLabel: string;
  yLabel: string;
  isBedroomMode: boolean;
  onPropertyClick?: (propertyName: string) => void;
  theme: 'light' | 'dark';
}

function LineChart({ lines, xLabel, yLabel, isBedroomMode, onPropertyClick, theme }: LineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const width = 900;
  const height = 336;
  const padding = { top: 20, right: 20, bottom: 45, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate scales from lines data
  const { xMin, xMax, yMin, yMax, xTicks, yTicks } = useMemo(() => {
    const allPoints = lines.flatMap(line => line.points);

    if (allPoints.length === 0) {
      return { xMin: 0, xMax: 100, yMin: 0, yMax: 100, xTicks: [0, 50, 100], yTicks: [0, 50, 100] };
    }

    const xValues = allPoints.map(d => d.x).filter(v => Number.isFinite(v));
    const yValues = allPoints.map(d => d.y).filter(v => Number.isFinite(v));

    if (xValues.length === 0 || yValues.length === 0) {
      return { xMin: 0, xMax: 100, yMin: 0, yMax: 100, xTicks: [0, 50, 100], yTicks: [0, 50, 100] };
    }

    const rawXMin = Math.min(...xValues);
    const rawXMax = Math.max(...xValues);
    const rawYMin = Math.min(...yValues);
    const rawYMax = Math.max(...yValues);

    // Add padding to ranges
    const xPad = (rawXMax - rawXMin) * 0.1 || rawXMax * 0.1 || 1;
    const yPad = (rawYMax - rawYMin) * 0.1 || rawYMax * 0.1 || 100;

    const xMinVal = Math.max(0, rawXMin - xPad);
    const xMaxVal = rawXMax + xPad;
    const yMinVal = Math.max(0, rawYMin - yPad);
    const yMaxVal = rawYMax + yPad;

    // Generate tick values
    const generateTicks = (min: number, max: number, count: number) => {
      const range = max - min;
      const step = range / (count - 1);
      return Array.from({ length: count }, (_, i) => Math.round(min + step * i));
    };

    return {
      xMin: isBedroomMode ? -0.3 : xMinVal,
      xMax: isBedroomMode ? Math.max(4, Math.ceil(rawXMax)) + 0.3 : xMaxVal,
      yMin: yMinVal,
      yMax: yMaxVal,
      xTicks: isBedroomMode
        ? Array.from({ length: Math.max(4, Math.ceil(rawXMax)) + 1 }, (_, i) => i)
        : generateTicks(xMinVal, xMaxVal, 5),
      yTicks: generateTicks(yMinVal, yMaxVal, 5),
    };
  }, [lines, isBedroomMode]);

  // Scale functions - defined inline to avoid stale closure issues
  const scaleX = (val: number) => {
    if (!Number.isFinite(val)) return padding.left;
    const range = xMax - xMin;
    if (range === 0) return padding.left + chartWidth / 2;
    return padding.left + ((val - xMin) / range) * chartWidth;
  };

  const scaleY = (val: number) => {
    if (!Number.isFinite(val)) return padding.top + chartHeight;
    const range = yMax - yMin;
    if (range === 0) return padding.top + chartHeight / 2;
    return padding.top + chartHeight - ((val - yMin) / range) * chartHeight;
  };

  // Generate path for a line (use display x for jittered bedroom mode)
  const generatePath = (points: DataPoint[]) => {
    if (points.length === 0) return '';
    const sorted = [...points].sort((a, b) => a.x - b.x);
    return sorted.map((p, i) => {
      const cx = scaleX(p.xDisplay);
      const cy = scaleY(p.y);
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) return '';
      return `${i === 0 ? 'M' : 'L'} ${cx} ${cy}`;
    }).filter(Boolean).join(' ');
  };

  // Separate subject and comparable lines
  const comparableLines = lines.filter(l => !l.isSubject);
  const subjectLines = lines.filter(l => l.isSubject);

  const handleMouseEnter = (point: DataPoint, line: PropertyLine, event: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setTooltip({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      propertyName: line.propertyName,
      bedrooms: point.bedrooms,
      bathrooms: point.bathrooms,
      sqft: point.sqft,
      rent: point.rent,
      isSubject: line.isSubject,
    });
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!tooltip) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setTooltip(prev => prev ? {
      ...prev,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    } : null);
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  const handleClick = (propertyName: string) => {
    if (onPropertyClick) {
      onPropertyClick(propertyName);
    }
  };

  // Theme-aware colors
  const colors = theme === 'light'
    ? {
        background: '#f8fafc',
        gridLine: '#e2e8f0',
        axis: '#94a3b8',
        text: '#64748b',
        legendText: '#475569',
        subjectStroke: '#60a5fa',
      }
    : {
        background: '#1e1e2f',
        gridLine: '#374151',
        axis: '#6b7280',
        text: '#9ca3af',
        legendText: '#9ca3af',
        subjectStroke: '#93c5fd',
      };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        {/* Background */}
        <rect x={padding.left} y={padding.top} width={chartWidth} height={chartHeight} fill={colors.background} />

        {/* Grid lines */}
        {yTicks.map((tick) => (
          <line
            key={`y-${tick}`}
            x1={padding.left}
            y1={scaleY(tick)}
            x2={padding.left + chartWidth}
            y2={scaleY(tick)}
            stroke={colors.gridLine}
            strokeWidth="1"
          />
        ))}
        {xTicks.map((tick) => (
          <line
            key={`x-${tick}`}
            x1={scaleX(tick)}
            y1={padding.top}
            x2={scaleX(tick)}
            y2={padding.top + chartHeight}
            stroke={colors.gridLine}
            strokeWidth="1"
          />
        ))}

        {/* Axes */}
        <line x1={padding.left} y1={padding.top + chartHeight} x2={padding.left + chartWidth} y2={padding.top + chartHeight} stroke={colors.axis} strokeWidth="1" />
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + chartHeight} stroke={colors.axis} strokeWidth="1" />

        {/* Y-axis ticks and labels */}
        {yTicks.map((tick) => (
          <g key={`y-label-${tick}`}>
            <text x={padding.left - 8} y={scaleY(tick) + 4} textAnchor="end" fill={colors.text} fontSize="11">
              ${tick.toLocaleString()}
            </text>
          </g>
        ))}

        {/* X-axis ticks and labels */}
        {xTicks.map((tick) => (
          <g key={`x-label-${tick}`}>
            <text x={scaleX(tick)} y={padding.top + chartHeight + 20} textAnchor="middle" fill={colors.text} fontSize="11">
              {isBedroomMode ? tick : tick.toLocaleString()}
            </text>
          </g>
        ))}

        {/* Axis labels */}
        <text x={width / 2} y={height - 8} textAnchor="middle" fill={colors.text} fontSize="12">
          {xLabel}
        </text>
        <text x={18} y={height / 2} textAnchor="middle" fill={colors.text} fontSize="12" transform={`rotate(-90, 18, ${height / 2})`}>
          {yLabel}
        </text>

        {/* Comparable lines and dots - render first */}
        {comparableLines.map((line, lineIdx) => (
          <g key={`comp-line-${lineIdx}`}>
            {/* Line connecting points */}
            {line.points.length > 1 && (
              <path
                d={generatePath(line.points)}
                fill="none"
                stroke={line.color}
                strokeWidth="2"
                opacity={0.7}
              />
            )}
            {/* Dots */}
            {line.points.map((point, i) => (
              <circle
                key={`comp-${lineIdx}-${i}`}
                cx={scaleX(point.xDisplay)}
                cy={scaleY(point.y)}
                r={6}
                fill={line.color}
                opacity={0.9}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => handleMouseEnter(point, line, e)}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={() => handleClick(line.propertyName)}
              />
            ))}
          </g>
        ))}

        {/* Subject lines and dots - render on top */}
        {subjectLines.map((line, lineIdx) => (
          <g key={`subj-line-${lineIdx}`}>
            {/* Line connecting points */}
            {line.points.length > 1 && (
              <path
                d={generatePath(line.points)}
                fill="none"
                stroke={line.color}
                strokeWidth="3"
              />
            )}
            {/* Dots */}
            {line.points.map((point, i) => (
              <circle
                key={`subj-${lineIdx}-${i}`}
                cx={scaleX(point.xDisplay)}
                cy={scaleY(point.y)}
                r={8}
                fill={line.color}
                stroke={colors.subjectStroke}
                strokeWidth={2}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => handleMouseEnter(point, line, e)}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              />
            ))}
          </g>
        ))}

        {/* Legend - top right */}
        <g transform={`translate(${width - padding.right - 100}, ${padding.top + 10})`}>
          <line x1={-10} y1={0} x2={5} y2={0} stroke={colors.axis} strokeWidth="2" opacity={0.7} />
          <circle cx={0} cy={0} r={4} fill={colors.axis} opacity={0.9} />
          <text x={12} y={4} fill={colors.legendText} fontSize="11">Comparables</text>
          <line x1={-10} y1={18} x2={5} y2={18} stroke={SUBJECT_COLOR} strokeWidth="3" />
          <circle cx={0} cy={18} r={5} fill={SUBJECT_COLOR} stroke={colors.subjectStroke} strokeWidth={1.5} />
          <text x={12} y={22} fill={colors.legendText} fontSize="11">Subject</text>
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x + 15,
            top: tooltip.y - 10,
            backgroundColor: theme === 'light' ? '#ffffff' : '#1f2937',
            border: `1px solid ${theme === 'light' ? '#e2e8f0' : '#374151'}`,
            borderRadius: '6px',
            padding: '8px 12px',
            pointerEvents: 'none',
            zIndex: 100,
            boxShadow: theme === 'light'
              ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              : '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
            minWidth: '160px',
          }}
        >
          <div style={{ fontWeight: 600, color: theme === 'light' ? '#1e293b' : '#f3f4f6', marginBottom: '4px', fontSize: '12px' }}>
            {tooltip.propertyName}
          </div>
          <div style={{ color: theme === 'light' ? '#64748b' : '#9ca3af', fontSize: '11px', lineHeight: 1.5 }}>
            <div>{tooltip.bedrooms} bed / {tooltip.bathrooms} bath</div>
            <div>{tooltip.sqft.toLocaleString()} SF</div>
            <div style={{ color: '#22c55e', fontWeight: 500 }}>${tooltip.rent.toLocaleString()}/mo</div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CompetitiveMarketCharts({
  comparables = [],
  floorPlans = [],
  subjectPropertyName = 'Subject Property',
  onPropertyClick,
  onColorsAssigned,
}: CompetitiveMarketChartsProps) {
  const { theme } = useTheme();
  const [viewMode, setViewMode] = useState<'sqft' | 'bedrooms'>('sqft');

  // Preserve last valid data to prevent flicker during parent re-renders
  const stableDataRef = useRef<{ comparables: RentalComparable[]; floorPlans: FloorPlan[] } | null>(null);

  useEffect(() => {
    if (comparables.length > 0 || floorPlans.length > 0) {
      stableDataRef.current = { comparables, floorPlans };
    }
  }, [comparables, floorPlans]);

  // Use stable data if current props are empty
  const stableComparables = comparables.length > 0 ? comparables : (stableDataRef.current?.comparables ?? []);
  const stableFloorPlans = floorPlans.length > 0 ? floorPlans : (stableDataRef.current?.floorPlans ?? []);

  // Assign colors to properties (stable assignment based on property names)
  const propertyColors = useMemo<PropertyColorMap>(() => {
    const colors: PropertyColorMap = {};
    const uniqueProperties = [...new Set(stableComparables.map(c => c.property_name))].sort();

    uniqueProperties.forEach((name, idx) => {
      colors[name] = COMPARABLE_COLORS[idx % COMPARABLE_COLORS.length];
    });

    colors[subjectPropertyName] = SUBJECT_COLOR;

    return colors;
  }, [stableComparables, subjectPropertyName]);

  // Notify parent of color assignments
  useEffect(() => {
    if (onColorsAssigned) {
      onColorsAssigned(propertyColors);
    }
  }, [propertyColors, onColorsAssigned]);

  // Generate jitter seed for consistent jitter per point
  const jitterSeed = useRef<Map<string, number>>(new Map());
  const getJitter = (key: string) => {
    if (!jitterSeed.current.has(key)) {
      jitterSeed.current.set(key, (Math.random() - 0.5) * 0.3);
    }
    return jitterSeed.current.get(key)!;
  };

  // Transform data for Rent vs Square Feet - grouped by property
  const sqftChartLines = useMemo<PropertyLine[]>(() => {
    const lines: PropertyLine[] = [];

    // Group comparables by property name
    const compsByProperty = new Map<string, RentalComparable[]>();
    stableComparables.forEach((comp) => {
      const sqft = Number(comp.avg_sqft);
      const rent = Number(comp.asking_rent);
      if (Number.isFinite(sqft) && sqft > 0 && Number.isFinite(rent) && rent > 0) {
        const existing = compsByProperty.get(comp.property_name) || [];
        existing.push(comp);
        compsByProperty.set(comp.property_name, existing);
      }
    });

    // Create lines for each comparable property
    compsByProperty.forEach((comps, propertyName) => {
      lines.push({
        propertyName,
        isSubject: false,
        color: propertyColors[propertyName] || '#6b7280',
        points: comps.map(comp => {
          const sqft = Number(comp.avg_sqft);
          const rent = Number(comp.asking_rent);
          return {
            x: sqft,
            xDisplay: sqft, // No jitter for sqft mode
            y: rent,
            label: `${propertyName}: ${sqft.toLocaleString()} SF @ $${rent.toLocaleString()}/mo`,
            propertyName,
            bedrooms: Number(comp.bedrooms) || 0,
            bathrooms: Number(comp.bathrooms) || 1,
            sqft: sqft,
            rent: rent,
          };
        }),
      });
    });

    // Add subject property as a single line
    const subjectPoints = stableFloorPlans
      .filter(fp => {
        const sqft = Number(fp.sqft);
        const rent = Number(fp.marketRent);
        return Number.isFinite(sqft) && sqft > 0 && Number.isFinite(rent) && rent > 0;
      })
      .map(fp => {
        const sqft = Number(fp.sqft);
        const rent = Number(fp.marketRent);
        return {
          x: sqft,
          xDisplay: sqft,
          y: rent,
          label: `${subjectPropertyName} ${fp.name}: ${sqft.toLocaleString()} SF @ $${rent.toLocaleString()}/mo`,
          propertyName: subjectPropertyName,
          bedrooms: Number(fp.bedrooms) || 0,
          bathrooms: Number(fp.bathrooms) || 1,
          sqft: sqft,
          rent: rent,
        };
      });

    if (subjectPoints.length > 0) {
      lines.push({
        propertyName: subjectPropertyName,
        isSubject: true,
        color: SUBJECT_COLOR,
        points: subjectPoints,
      });
    }

    return lines;
  }, [stableComparables, stableFloorPlans, subjectPropertyName, propertyColors]);

  // Transform data for Rent vs Bedrooms - grouped by property with jitter
  const bedroomChartLines = useMemo<PropertyLine[]>(() => {
    const lines: PropertyLine[] = [];

    // Group comparables by property name
    const compsByProperty = new Map<string, RentalComparable[]>();
    stableComparables.forEach((comp) => {
      const beds = Number(comp.bedrooms);
      const rent = Number(comp.asking_rent);
      if (Number.isFinite(beds) && beds >= 0 && Number.isFinite(rent) && rent > 0) {
        const existing = compsByProperty.get(comp.property_name) || [];
        existing.push(comp);
        compsByProperty.set(comp.property_name, existing);
      }
    });

    // Create lines for each comparable property
    compsByProperty.forEach((comps, propertyName) => {
      lines.push({
        propertyName,
        isSubject: false,
        color: propertyColors[propertyName] || '#6b7280',
        points: comps.map((comp, idx) => {
          const beds = Number(comp.bedrooms);
          const rent = Number(comp.asking_rent);
          const jitterKey = `${propertyName}-${beds}-${rent}-${idx}`;
          const jitter = getJitter(jitterKey);
          return {
            x: beds,
            xDisplay: beds + jitter,
            y: rent,
            label: `${propertyName}: ${beds} BR @ $${rent.toLocaleString()}/mo`,
            propertyName,
            bedrooms: beds,
            bathrooms: Number(comp.bathrooms) || 1,
            sqft: Number(comp.avg_sqft) || 0,
            rent: rent,
          };
        }),
      });
    });

    // Add subject property as a single line with jitter
    const subjectPoints = stableFloorPlans
      .filter(fp => {
        const beds = Number(fp.bedrooms);
        const rent = Number(fp.marketRent);
        return Number.isFinite(beds) && beds >= 0 && Number.isFinite(rent) && rent > 0;
      })
      .map((fp, idx) => {
        const beds = Number(fp.bedrooms);
        const rent = Number(fp.marketRent);
        const jitterKey = `${subjectPropertyName}-${beds}-${rent}-${idx}`;
        const jitter = getJitter(jitterKey);
        return {
          x: beds,
          xDisplay: beds + jitter,
          y: rent,
          label: `${subjectPropertyName} ${fp.name}: ${beds} BR @ $${rent.toLocaleString()}/mo`,
          propertyName: subjectPropertyName,
          bedrooms: beds,
          bathrooms: Number(fp.bathrooms) || 1,
          sqft: Number(fp.sqft) || 0,
          rent: rent,
        };
      });

    if (subjectPoints.length > 0) {
      lines.push({
        propertyName: subjectPropertyName,
        isSubject: true,
        color: SUBJECT_COLOR,
        points: subjectPoints,
      });
    }

    return lines;
  }, [stableComparables, stableFloorPlans, subjectPropertyName, propertyColors]);

  const activeLines = viewMode === 'sqft' ? sqftChartLines : bedroomChartLines;

  // Theme-aware container and button colors
  const containerBg = theme === 'light' ? '#f1f5f9' : '#1a1a2e';
  const buttonBorder = theme === 'light' ? '#cbd5e1' : '#4b5563';
  const buttonInactiveText = theme === 'light' ? '#64748b' : '#9ca3af';
  const emptyStateText = theme === 'light' ? '#64748b' : '#9ca3af';

  if (sqftChartLines.length === 0 && bedroomChartLines.length === 0) {
    return (
      <div style={{ height: '300px', width: '100%', backgroundColor: containerBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: emptyStateText, borderRadius: '8px' }}>
        <p>No data available for charts</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', backgroundColor: containerBg, padding: '16px', borderRadius: '8px' }}>
      {/* Chart */}
      <LineChart
        lines={activeLines}
        xLabel={viewMode === 'sqft' ? 'Square Feet' : 'Bedrooms'}
        yLabel="Monthly Rent"
        isBedroomMode={viewMode === 'bedrooms'}
        onPropertyClick={onPropertyClick}
        theme={theme}
      />

      {/* Toggle selector - bottom left */}
      <div style={{ display: 'flex', gap: '0', marginTop: '12px' }}>
        <button
          onClick={() => setViewMode('sqft')}
          style={{
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 500,
            border: `1px solid ${buttonBorder}`,
            borderRadius: '4px 0 0 4px',
            backgroundColor: viewMode === 'sqft' ? '#3b82f6' : 'transparent',
            color: viewMode === 'sqft' ? 'white' : buttonInactiveText,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          By Unit Size
        </button>
        <button
          onClick={() => setViewMode('bedrooms')}
          style={{
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 500,
            border: `1px solid ${buttonBorder}`,
            borderLeft: 'none',
            borderRadius: '0 4px 4px 0',
            backgroundColor: viewMode === 'bedrooms' ? '#3b82f6' : 'transparent',
            color: viewMode === 'bedrooms' ? 'white' : buttonInactiveText,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          By Bedrooms
        </button>
      </div>
    </div>
  );
}

export default CompetitiveMarketCharts;
