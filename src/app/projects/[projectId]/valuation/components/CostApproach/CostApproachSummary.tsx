'use client';

interface CostApproachSummaryProps {
  landValue: number;
  improvementsValue: number;
  depreciationValue: number;
}

export function CostApproachSummary({ landValue, improvementsValue, depreciationValue }: CostApproachSummaryProps) {
  const indicatedValue = Math.max(0, landValue + improvementsValue - depreciationValue);
  const perUnit = improvementsValue ? (improvementsValue / 1) : 0;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  return (
    <section className="rounded-lg border p-5 max-w-md" style={{ backgroundColor: 'var(--cui-card-bg)', borderColor: 'var(--cui-border-color)', marginLeft: 'auto' }}>
      <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--cui-body-color)' }}>
        Cost Approach Summary
      </h3>
      <div className="text-sm space-y-2" style={{ color: 'var(--cui-body-color)' }}>
        <div className="flex justify-between">
          <span>Land Value</span>
          <span>{formatCurrency(landValue)}</span>
        </div>
        <div className="flex justify-between">
          <span>Replacement Cost New</span>
          <span>{formatCurrency(improvementsValue)}</span>
        </div>
        <div className="flex justify-between" style={{ color: 'var(--cui-danger)' }}>
          <span>Depreciation</span>
          <span>-{formatCurrency(depreciationValue)}</span>
        </div>
        <hr style={{ borderColor: 'var(--cui-border-color)' }} />
        <div className="flex justify-between font-semibold" style={{ color: 'var(--cui-body-color)' }}>
          <span>Indicated Value</span>
          <span>{formatCurrency(indicatedValue)}</span>
        </div>
        <div className="flex justify-between text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
          <span>Per Unit</span>
          <span>{formatCurrency(perUnit)}</span>
        </div>
        <div className="flex justify-between text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
          <span>Per SF</span>
          <span>{(improvementsValue ? (improvementsValue / 1).toFixed(2) : '0.00')}</span>
        </div>
      </div>
    </section>
  );
}
