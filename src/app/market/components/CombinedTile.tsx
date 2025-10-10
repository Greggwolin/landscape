import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { MarketSeries } from './MarketChart';

interface KPIData {
  title: string;
  value: string;
  deltaLabel?: string;
  deltaColor?: 'up' | 'down';
  badge?: string; // e.g., "SA", "NSA"
}

interface MultiGeoKPIData {
  geoCode?: string;
  geoLevel: string;
  geoName: string;
  value: string | null;
  numericValue: number | null;
  yoy: number | null;
  changeType?: 'percent' | 'absolute';
  changeLabel?: string | null;
}

interface ToggleOption {
  label: string;
  value: string;
}

interface CombinedTileProps {
  title: string;
  subtitle?: string;
  kpis?: KPIData[];
  multiGeoKPIs?: MultiGeoKPIData[]; // For stacked multi-geo layout
  series: MarketSeries[];
  valueFormatter?: (value: number) => string;
  toggleOptions?: ToggleOption[];
  defaultToggle?: string;
  singleKPI?: boolean; // Show only one KPI with toggle
  narrowChart?: boolean; // Use narrower chart for better rate of change visibility
  useIndexed?: boolean; // Convert to base-100 index to show rate of change
  useBarChart?: boolean; // Use bar chart instead of line chart
  tooltipValueFormatter?: (value: number) => string;
  footnote?: string;
  miniBarChart?: boolean;
}

const COLORS = ['#60a5fa', '#facc15', '#f97316', '#34d399', '#f472b6'];

const CombinedTile: React.FC<CombinedTileProps> = ({
  title,
  subtitle,
  kpis = [],
  multiGeoKPIs,
  series,
  valueFormatter,
  toggleOptions,
  defaultToggle,
  singleKPI = false,
  narrowChart = false,
  useIndexed = false,
  useBarChart = false,
  tooltipValueFormatter,
  footnote,
  miniBarChart = false
}) => {
  const [activeToggle, setActiveToggle] = useState(defaultToggle || toggleOptions?.[0]?.value || '');

  const filteredSeries = useMemo(() => {
    if (!toggleOptions || !activeToggle) {
      return series.filter((serie) => serie.data && serie.data.length > 0);
    }
    // Filter series based on active toggle (e.g., show only SA or NSA)
    return series.filter((serie) => {
      const matchesSeasonal = serie.seasonal === activeToggle;
      return serie.data && serie.data.length > 0 && matchesSeasonal;
    });
  }, [series, toggleOptions, activeToggle]);

  const activeKPI = useMemo(() => {
    if (!singleKPI || !toggleOptions || !activeToggle) return kpis[0];
    return kpis.find(kpi => kpi.badge === activeToggle) || kpis[0];
  }, [kpis, singleKPI, toggleOptions, activeToggle]);

  const filteredKPIs = useMemo(() => {
    if (singleKPI || !toggleOptions || !activeToggle) return kpis;
    return kpis.filter(kpi => kpi.badge === activeToggle);
  }, [kpis, singleKPI, toggleOptions, activeToggle]);

  const chartData = useMemo(() => {
    if (!filteredSeries.length) return [];

    // If using indexed mode, calculate base-100 index for each series
    if (useIndexed) {
      const merged = new Map<string, Record<string, number | null>>();

      filteredSeries.forEach((serie) => {
        // Find the first non-null value as base
        const firstValue = serie.data.find(pt => pt.value != null && Number(pt.value) !== 0);
        if (!firstValue) return;

        const baseValue = Number(firstValue.value);
        const seriesKey = `${serie.series_code}-${serie.geo_id}`;

        serie.data.forEach((point) => {
          const value = point.value != null ? Number(point.value) : null;
          const indexedValue = value != null ? (value / baseValue) * 100 : null;

          if (!merged.has(point.date)) {
            merged.set(point.date, { date: point.date });
          }
          merged.get(point.date)![seriesKey] = indexedValue;
        });
      });

      return Array.from(merged.values()).sort((a, b) => (a.date as string).localeCompare(b.date as string));
    }

    // Regular mode
    const merged = new Map<string, Record<string, number | null>>();
    filteredSeries.forEach((serie) => {
      serie.data.forEach((point) => {
        const value = point.value != null ? Number(point.value) : null;
        if (!merged.has(point.date)) {
          merged.set(point.date, { date: point.date });
        }
        merged.get(point.date)![`${serie.series_code}-${serie.geo_id}`] = value;
      });
    });

    return Array.from(merged.values()).sort((a, b) => (a.date as string).localeCompare(b.date as string));
  }, [filteredSeries, useIndexed]);

  const chartWidth = '100%';
  const chartMargin = narrowChart ? { top: 10, right: 10, left: 0, bottom: 0 } : { top: 10, right: 30, left: 0, bottom: 0 };
  const resolveTooltipValue = (value: unknown) => {
    if (typeof value !== 'number') {
      return value ?? '-';
    }
    return tooltipValueFormatter
      ? tooltipValueFormatter(value)
      : value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  };

  const miniBarData = useMemo(() => {
    if (!miniBarChart || !multiGeoKPIs) return null;
    const rows = multiGeoKPIs
      .filter((item) => item.numericValue != null)
      .map((item) => ({
        label: item.geoCode ?? item.geoLevel,
        name: item.geoName !== '-' ? item.geoName : item.geoLevel,
        value: item.numericValue,
        display: item.value ?? '—',
      }));
    return rows.length ? rows : null;
  }, [miniBarChart, multiGeoKPIs]);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      {/* Title Row with Optional Toggle */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-semibold text-gray-300">{title}</div>
          {subtitle ? <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div> : null}
          {footnote ? <div className="text-[11px] text-gray-500 mt-0.5">{footnote}</div> : null}
        </div>
        {toggleOptions && toggleOptions.length > 0 && (
          <div className="flex gap-1">
            {toggleOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setActiveToggle(option.value)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  activeToggle === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* KPI Stats Section */}
      {multiGeoKPIs ? (
        // Stacked multi-geo layout
        <div className="mb-4 space-y-0.5">
          {multiGeoKPIs.map((geoKPI, idx) => (
            <div
              key={`${geoKPI.geoCode ?? geoKPI.geoLevel}-${idx}`}
              className="flex items-center gap-2 rounded px-2 py-0.5 hover:bg-gray-800/50"
            >
              <div className="flex-1 min-w-0" title={geoKPI.geoName}>
                <div className="text-sm text-gray-200 truncate">
                  {geoKPI.geoName !== '-' ? geoKPI.geoName : geoKPI.geoLevel}
                </div>
              </div>
              <div className="w-28 flex-shrink-0 text-right">
                {geoKPI.value === 'NAV' ? (
                  <button
                    className="px-2 py-0.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded border border-gray-600 transition-colors cursor-pointer inline-block"
                    title="Data not available - click for options"
                    onClick={() => {
                      // TODO: Show modal or dialog to help user provide location information
                      alert(`Data not available for ${geoKPI.geoName}. We'll add a dialog here to help you provide alternative location information.`);
                    }}
                  >
                    NAV
                  </button>
                ) : (
                  <span className="text-sm font-medium text-white">{geoKPI.value ?? '—'}</span>
                )}
              </div>
              <div className="w-24 flex-shrink-0 text-right">
                <span
                  className={`text-xs whitespace-nowrap ${
                    geoKPI.yoy != null
                      ? geoKPI.yoy >= 0
                        ? 'text-green-400'
                        : 'text-red-300'
                      : 'text-gray-500'
                  }`}
                >
                  {geoKPI.changeLabel ?? '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Original KPI layout
        <div className="flex items-center justify-center mb-4">
          <div style={{ width: chartWidth }} className="flex justify-around items-center">
            {singleKPI ? (
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-white">{activeKPI.value}</div>
                  {activeKPI.badge && (
                    <span className="text-xs px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded">{activeKPI.badge}</span>
                  )}
                </div>
                {activeKPI.deltaLabel && (
                  <div
                    className={`text-xs mt-1 ${
                      activeKPI.deltaColor === 'up' ? 'text-green-400' : activeKPI.deltaColor === 'down' ? 'text-red-300' : 'text-gray-400'
                    }`}
                  >
                    {activeKPI.deltaLabel}
                  </div>
                )}
              </div>
            ) : (
              filteredKPIs.map((kpi, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <div className="text-xs text-gray-500 mb-1">{kpi.title}</div>
                  <div className="flex items-center gap-1">
                    <div className="text-lg font-bold text-white">{kpi.value}</div>
                    {kpi.badge && (
                      <span className="text-xs px-1 py-0.5 bg-gray-800 text-gray-400 rounded">{kpi.badge}</span>
                    )}
                  </div>
                  {kpi.deltaLabel && (
                    <div
                      className={`text-xs ${
                        kpi.deltaColor === 'up' ? 'text-green-400' : kpi.deltaColor === 'down' ? 'text-red-300' : 'text-gray-400'
                      }`}
                    >
                      {kpi.deltaLabel}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Chart - Centered */}
      {series.length > 0 && filteredSeries.length > 0 && (
        <div className="flex justify-center">
          <div style={{ width: chartWidth, height: '192px' }}>
            <ResponsiveContainer width="100%" height="100%">
              {useBarChart ? (
                <BarChart data={chartData} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#282c34" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#9ca3af', fontSize: 9 }}
                    height={20}
                    tickFormatter={(value) => {
                      if (!value) return '';
                      const date = value.toString();
                      const [year, month] = date.split('-');
                      if (!year || !month) return date;
                      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      return `${monthNames[parseInt(month) - 1]} '${year.slice(2)}`;
                    }}
                  />
                  <YAxis
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                    tickFormatter={(value) => (typeof valueFormatter === 'function' ? valueFormatter(value) : value)}
                    width={narrowChart ? 40 : 50}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937', fontSize: 12 }}
                    formatter={(value: unknown, name: string) => {
                      const formattedValue = resolveTooltipValue(value);
                      const serie = filteredSeries.find((s) => `${s.series_code}-${s.geo_id}` === name);
                      const label = serie?.geo_name || name;
                      return [formattedValue, label];
                    }}
                    labelFormatter={(label) => {
                      if (!label) return '';
                      const date = label.toString();
                      const [year, month] = date.split('-');
                      if (!year || !month) return date;
                      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
                    }}
                  />
                  {filteredSeries.map((serie, index) => (
                    <Bar
                      key={`${serie.series_code}-${serie.geo_id}`}
                      dataKey={`${serie.series_code}-${serie.geo_id}`}
                      fill={COLORS[index % COLORS.length]}
                      isAnimationActive={false}
                    />
                  ))}
                </BarChart>
              ) : (
                <LineChart data={chartData} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#282c34" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#9ca3af', fontSize: 9 }}
                    height={20}
                    tickFormatter={(value) => {
                      if (!value) return '';
                      const date = value.toString();
                      const [year, month] = date.split('-');
                      if (!year || !month) return date;
                      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      return `${monthNames[parseInt(month) - 1]} '${year.slice(2)}`;
                    }}
                  />
                  <YAxis
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                    tickFormatter={(value) => (typeof valueFormatter === 'function' ? valueFormatter(value) : value)}
                    width={narrowChart ? 40 : 50}
                    domain={useIndexed ? [100, 'auto'] : undefined}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937', fontSize: 12 }}
                    formatter={(value: unknown, name: string) => {
                      const formattedValue = resolveTooltipValue(value);
                      const serie = filteredSeries.find((s) => `${s.series_code}-${s.geo_id}` === name);
                      const label = serie?.geo_name || name;
                      return [formattedValue, label];
                    }}
                    labelFormatter={(label) => {
                      if (!label) return '';
                      const date = label.toString();
                      const [year, month] = date.split('-');
                      if (!year || !month) return date;
                      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
                    }}
                  />
                  {filteredSeries.map((serie, index) => (
                    <Line
                      key={`${serie.series_code}-${serie.geo_id}`}
                      type="monotone"
                      dataKey={`${serie.series_code}-${serie.geo_id}`}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                      connectNulls={true}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {miniBarData ? (
        <div className="mt-3 h-28">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={miniBarData}
              margin={{ top: 4, right: 10, left: 0, bottom: 0 }}
            >
              <XAxis
                dataKey="label"
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                hide
                domain={[0, (dataMax: number) => dataMax * 1.1]}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937', fontSize: 12 }}
                formatter={(value: unknown, _name, context) => {
                  const payload = context?.payload as { display?: string; name?: string } | undefined;
                  if (payload?.display) {
                    return [payload.display, payload.name];
                  }
                  if (typeof value === 'number') {
                    return [value.toLocaleString(undefined, { maximumFractionDigits: 0 }), payload?.name];
                  }
                  return [value, payload?.name];
                }}
                labelFormatter={(label, payload) => {
                  const first = Array.isArray(payload) && payload.length ? payload[0] : null;
                  return first && typeof first === 'object' && 'payload' in first
                    ? (first.payload as { name?: string }).name ?? label
                    : label;
                }}
              />
              <Bar dataKey="value" fill="#60a5fa" isAnimationActive={false} radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  );
};

export default CombinedTile;
export type { MultiGeoKPIData };
