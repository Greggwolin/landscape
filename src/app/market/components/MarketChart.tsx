import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

export interface SeriesPoint {
  date: string;
  value: string | null;
  coverage_note?: string | null;
}

export interface MarketSeries {
  series_code: string;
  series_name: string;
  geo_id: string;
  geo_name: string;
  units?: string | null;
  data: SeriesPoint[];
}

interface MarketChartProps {
  title: string;
  series: MarketSeries[];
  yLabel?: string;
  valueFormatter?: (value: number) => string;
}

const COLORS = ['#60a5fa', '#facc15', '#f97316', '#34d399', '#f472b6'];

const MarketChart: React.FC<MarketChartProps> = ({ title, series, yLabel, valueFormatter }) => {
  const chartData = useMemo(() => {
    if (!series.length) return [];
    const merged = new Map<string, Record<string, number | null>>();

    series.forEach((serie) => {
      serie.data.forEach((point) => {
        const value = point.value != null ? Number(point.value) : null;
        if (!merged.has(point.date)) {
          merged.set(point.date, { date: point.date });
        }
        merged.get(point.date)![`${serie.series_code}-${serie.geo_id}`] = value;
      });
    });

    return Array.from(merged.values()).sort((a, b) => (a.date as string).localeCompare(b.date as string));
  }, [series]);

  if (!series.length) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
        <div className="text-sm text-gray-400">{title}</div>
        <div className="text-sm text-gray-500 mt-4">No data available.</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <div className="text-sm text-gray-300 mb-2">{title}</div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#282c34" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={(value) => value.slice(0, 7)}
            />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={(value) => (typeof valueFormatter === 'function' ? valueFormatter(value) : value)}
              label={
                yLabel
                  ? { value: yLabel, angle: -90, position: 'insideLeft', fill: '#9ca3af', offset: 10 }
                  : undefined
              }
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937' }}
              formatter={(value: unknown) =>
                typeof value === 'number' && valueFormatter ? valueFormatter(value) : value ?? 'n/a'
              }
            />
            <Legend wrapperStyle={{ color: '#d1d5db' }} />
            {series.map((serie, index) => (
              <Line
                key={`${serie.series_code}-${serie.geo_id}`}
                type="monotone"
                dataKey={`${serie.series_code}-${serie.geo_id}`}
                name={`${serie.series_name} · ${serie.geo_name}`}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MarketChart;
