'use client';

import BudgetGridDark from './BudgetGridDark';

interface BudgetGridDarkWrapperProps {
  projectId: number;
}

export default function BudgetGridDarkWrapper({ projectId }: BudgetGridDarkWrapperProps) {
  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <BudgetGridDark projectId={projectId} />
    </div>
  );
}
