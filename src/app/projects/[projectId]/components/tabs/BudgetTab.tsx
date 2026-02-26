'use client';

import React, { useCallback, useMemo, useState } from 'react';
import BudgetContainer from '@/components/budget/BudgetContainer';
import { useLandscaperRefresh } from '@/hooks/useLandscaperRefresh';

interface Project {
  project_id: number;
  project_name: string;
}

interface BudgetTabProps {
  project: Project;
}

export default function BudgetTab({ project }: BudgetTabProps) {
  // Force child remount on Landscaper mutations via key increment
  const [refreshKey, setRefreshKey] = useState(0);
  const watchedTables = useMemo(() => ['budget_items', 'budget_categories'], []);
  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  useLandscaperRefresh(project.project_id, watchedTables, handleRefresh);

  return <BudgetContainer key={refreshKey} projectId={project.project_id} />;
}
