'use client';

import { useState } from 'react';
import BudgetGridDark from '../components/Budget/BudgetGridDark';

export default function BudgetGridV2Page() {
  const [projectId, setProjectId] = useState<number>(7);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Budget Grid - Dark Theme</h1>
            <p className="text-gray-400 mt-2">
              Spreadsheet interface for budget management
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Project
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(Number(e.target.value))}
                className="bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={7}>Peoria Lakes</option>
                <option value={8}>Red Valley MPC</option>
              </select>
            </div>
            <a
              href="/budget-grid"
              className="text-sm text-blue-400 hover:text-blue-300 underline"
            >
              ← Light Theme Version
            </a>
          </div>
        </div>
      </div>

      {/* Budget Grid Component */}
      <div className="p-6">
        <BudgetGridDark projectId={projectId} />
      </div>
    </div>
  );
}
