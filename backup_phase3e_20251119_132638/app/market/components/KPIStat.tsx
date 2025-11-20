import React from 'react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis } from 'recharts';

interface DataPoint {
  date: string;
  value: number | null;
}

interface KPIStatProps {
  title: string;
  value: string;
  deltaLabel?: string;
  deltaColor?: 'up' | 'down' | 'flat';
  data?: DataPoint[];
  footnote?: string;
  chartType?: 'line' | 'bar';
  barColor?: string;
}

const DeltaPill: React.FC<{ label: string; tone: KPIStatProps['deltaColor'] }> = ({ label, tone }) => {
  const toneClass =
    tone === 'up'
      ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
      : tone === 'down'
      ? 'bg-rose-500/20 text-rose-200 border-rose-400/40'
      : 'bg-slate-500/20 text-slate-200 border-slate-400/40';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${toneClass}`}>
      {label}
    </span>
  );
};

const KPIStat: React.FC<KPIStatProps> = ({
  title,
  value,
  deltaLabel,
  deltaColor = 'flat',
  data,
  footnote,
  chartType = 'line',
  barColor = '#60a5fa',
}) => (
  <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-400">{title}</span>
      {deltaLabel ? <DeltaPill label={deltaLabel} tone={deltaColor} /> : null}
    </div>
    <div className="text-2xl font-semibold text-white">{value}</div>
    {data && data.length > 1 ? (
      <div className="h-16">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={data} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
              <XAxis dataKey="date" hide />
              <YAxis hide domain={['auto', 'auto']} />
              <Bar dataKey="value" fill={barColor} isAnimationActive={false} radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <LineChart data={data}>
              <Line
                type="monotone"
                dataKey="value"
                stroke="#60a5fa"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    ) : null}
    {footnote ? <div className="text-xs text-gray-500">{footnote}</div> : null}
  </div>
);

export default KPIStat;
