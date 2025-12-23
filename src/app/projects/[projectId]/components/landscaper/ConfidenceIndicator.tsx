interface ConfidenceIndicatorProps {
  level: 'high' | 'medium' | 'low';
}

export function ConfidenceIndicator({ level }: ConfidenceIndicatorProps) {
  const config = {
    high: { label: 'High', color: 'text-green-500', bars: 3 },
    medium: { label: 'Medium', color: 'text-yellow-500', bars: 2 },
    low: { label: 'Low', color: 'text-red-500', bars: 1 }
  };

  const { label, color, bars } = config[level];

  return (
    <div className={`flex items-center gap-1 text-xs ${color}`}>
      <div className="flex gap-0.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-1 h-3 rounded-sm ${i <= bars ? 'bg-current' : 'bg-gray-600'}`}
          />
        ))}
      </div>
      <span>{label}</span>
    </div>
  );
}
