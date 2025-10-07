interface MetricItem {
  label: string;
  value: string | number;
  subtext?: string;
  isCurrency?: boolean;
}

interface MetricsGridProps {
  metrics: MetricItem[];
}

const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics }) => {
  return (
    <div className="metrics-grid">
      {metrics.map((metric, idx) => (
        <div key={idx} className="metric-card">
          <div className="metric-label">{metric.label}</div>
          <div className={`metric-value ${metric.isCurrency ? 'currency' : ''}`}>{metric.value}</div>
          {metric.subtext ? <div className="metric-change">{metric.subtext}</div> : null}
        </div>
      ))}
    </div>
  );
};

export default MetricsGrid;
