import React from 'react';

interface CoverageBadgeProps {
  note?: string | null;
}

const CoverageBadge: React.FC<CoverageBadgeProps> = ({ note }) => {
  if (!note) return null;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 text-xs border border-amber-400/40">
      {note}
    </span>
  );
};

export default CoverageBadge;
