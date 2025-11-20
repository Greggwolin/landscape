import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface DataPoint {
  date: string;
  value: string | null;
}

interface YoYBarProps {
  title: string;
  series: DataPoint[];
  barColor?: string;
}

const YoYBar: React.FC<YoYBarProps> = ({ title, series, barColor = '#f97316' }) => {
  const chartData = useMemo(() => {
    if (!series.length) return [];
    const byYear = new Map<number, number>();
    series.forEach((point) => {
      if (!point.value) return;
      const year = Number(point.date.slice(0, 4));
      byYear.set(year, Number(point.value));
    });

    const rows: { year: number; yoy: number | null }[] = [];
    Array.from(byYear.keys())
      .sort((a, b) => a - b)
      .forEach((year) => {
        const current = byYear.get(year)!;
        const prior = byYear.get(year - 1);
        const yoy = prior ? ((current - prior) / prior) * 100 : null;
        rows.push({ year, yoy });
      });
    return rows;
  }, [series]);

  if (!chartData.length) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
        <div className="text-sm text-gray-400">{title}</div>
        <div className="text-sm text-gray-500 mt-4">No year-over-year history.</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <div className="text-sm text-gray-300 mb-2">{title}</div>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="year" tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={(value) =>
                typeof value === 'number' ? `${value.toFixed(1)}%` : value ?? ''
              }
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937' }}
              formatter={(value: unknown) =>
                typeof value === 'number' ? `${value.toFixed(1)}%` : value ?? 'n/a'
              }
            />
            <Bar dataKey="yoy" fill={barColor} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default YoYBar;
