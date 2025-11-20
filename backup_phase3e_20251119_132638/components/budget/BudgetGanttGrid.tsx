/**
 * BudgetGanttGrid Component
 *
 * Main SVAR Gantt component for budget management.
 * Combines hierarchical cost categories with timeline visualization.
 */

'use client';

import React, { useRef, useCallback, useMemo } from 'react';
import { Gantt, Willow } from 'wx-react-gantt';
import 'wx-react-gantt/dist/gantt.css';
import { useBudgetGanttData, BudgetGanttTask } from './hooks/useBudgetGanttData';
import { useBudgetCalculations } from './hooks/useBudgetCalculations';
import { useBudgetSave } from './hooks/useBudgetSave';
import { budgetGanttColumns } from './CustomColumns';
import './BudgetGantt.css';

interface BudgetGanttGridProps {
  projectId: string | number;
  scope?: string;
  level?: string;
  entityId?: string | number;
  onTaskUpdate?: (task: BudgetGanttTask) => void;
  onTaskAdd?: (task: BudgetGanttTask) => void;
  onTaskDelete?: (taskId: number | string) => void;
}

export default function BudgetGanttGrid({
  projectId,
  scope,
  level = 'project',
  entityId,
  onTaskUpdate,
  onTaskAdd,
  onTaskDelete,
}: BudgetGanttGridProps) {
  const ganttRef = useRef<any>(null);

  // Fetch budget data
  const { tasks, links, isLoading, error } = useBudgetGanttData({
    projectId,
    scope,
    level,
    entityId,
  });

  // Calculation helpers
  const { calculateAmount, formatCurrency } = useBudgetCalculations();

  // Save mutations
  const { saveBudgetItem, createBudgetItem, deleteBudgetItem, isSaving } = useBudgetSave({
    projectId,
    scope,
    level,
    entityId,
  });

  // Timeline scales (period-based)
  const scales = useMemo(() => [
    {
      unit: 'month' as const,
      step: 1,
      format: (date: Date) => {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      },
    },
    {
      unit: 'quarter' as const,
      step: 1,
      format: (date: Date) => {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `Q${quarter} ${date.getFullYear()}`;
      },
    },
  ], []);

  // Handle task updates (inline editing)
  const handleTaskUpdate = useCallback(
    async (id: number | string, updates: Partial<BudgetGanttTask>) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      // Calculate amount if qty or rate changed
      const updatedTask = { ...task, ...updates };
      if ('qty' in updates || 'rate' in updates) {
        updatedTask.amount = calculateAmount(
          updatedTask.qty || 0,
          updatedTask.rate || 0
        );
      }

      try {
        await saveBudgetItem({
          fact_id: Number(id),
          qty: updatedTask.qty,
          rate: updatedTask.rate,
          amount: updatedTask.amount,
          start_date: updatedTask.start,
          end_date: updatedTask.end,
          uom_code: updatedTask.uom_code,
          escalation_rate: updatedTask.escalation_rate,
          contingency_pct: updatedTask.contingency_pct,
        });

        onTaskUpdate?.(updatedTask);
      } catch (error) {
        console.error('Failed to update budget item:', error);
      }
    },
    [tasks, calculateAmount, saveBudgetItem, onTaskUpdate]
  );

  // Handle task creation
  const handleTaskAdd = useCallback(
    async (parentId?: number | string) => {
      const newTask: any = {
        project_id: Number(projectId),
        pe_level: level,
        pe_id: entityId || projectId,
        category_id: 0, // User will need to select
        parent_id: parentId ? Number(parentId) : undefined,
        qty: 0,
        rate: 0,
        amount: 0,
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
        uom_code: 'EA',
        escalation_rate: 0,
        contingency_pct: 0,
        timing_method: 'distributed',
        scope: scope || 'Stage 1',
      };

      try {
        const created = await createBudgetItem(newTask);
        onTaskAdd?.(created);
      } catch (error) {
        console.error('Failed to create budget item:', error);
      }
    },
    [projectId, level, entityId, scope, createBudgetItem, onTaskAdd]
  );

  // Handle task deletion
  const handleTaskDelete = useCallback(
    async (id: number | string) => {
      try {
        await deleteBudgetItem(Number(id));
        onTaskDelete?.(id);
      } catch (error) {
        console.error('Failed to delete budget item:', error);
      }
    },
    [deleteBudgetItem, onTaskDelete]
  );

  // Calculate timeline start/end
  const timelineStart = useMemo(() => {
    if (!tasks.length) return new Date();
    const dates = tasks.map((t) => new Date(t.start).getTime());
    return new Date(Math.min(...dates));
  }, [tasks]);

  const timelineEnd = useMemo(() => {
    if (!tasks.length) {
      const end = new Date();
      end.setMonth(end.getMonth() + 60); // 5 years default
      return end;
    }
    const dates = tasks.map((t) => new Date(t.end).getTime());
    const maxDate = new Date(Math.max(...dates));
    maxDate.setMonth(maxDate.getMonth() + 6); // Add 6 months buffer
    return maxDate;
  }, [tasks]);

  if (isLoading) {
    return (
      <div className="budget-gantt-loading">
        <div className="spinner" />
        <p>Loading budget data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="budget-gantt-error">
        <p>Error loading budget data: {error.message}</p>
      </div>
    );
  }

  return (
    <Willow>
      <div className="budget-gantt-container">
        <Gantt
          ref={ganttRef}
          tasks={tasks}
          links={links}
          columns={budgetGanttColumns}
          scales={scales}
          start={timelineStart}
          end={timelineEnd}
          cellWidth={120}
          cellHeight={44}
          readonly={false}
          taskTypes={[
            {
              id: 'task',
              label: 'Task',
            },
            {
              id: 'summary',
              label: 'Summary',
            },
          ]}
        />
        {isSaving && (
          <div className="budget-gantt-saving">
            <span>Saving...</span>
          </div>
        )}
      </div>
    </Willow>
  );
}
