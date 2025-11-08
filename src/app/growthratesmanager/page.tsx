'use client';
import GrowthRatesManager from '@/app/components/GrowthRatesManager';

export default function GrowthRatesManagerSandboxPage() {
  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <GrowthRatesManager projectId={7} cardType="cost" />
    </div>
  );
}
