'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import ProjectSubNav from '@/components/project/ProjectSubNav';
import MetricCard from '@/components/project/MetricCard';
import GranularityIndicators from '@/components/project/GranularityIndicators';
import ActivityFeed from '@/components/project/ActivityFeed';
import MilestoneTimeline from '@/components/project/MilestoneTimeline';
import { useProjectMetrics, useProjectGranularity, useProjectMilestones } from '@/hooks/useProjectMetrics';
import { CSpinner } from '@coreui/react';

/**
 * Project Summary Page
 *
 * Phase 2: Integrated dashboard with key metrics, granularity indicators,
 * activity feed, and milestone timeline.
 */
export default function ProjectSummaryPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  // Fetch project data
  const { data: metrics, isLoading: metricsLoading } = useProjectMetrics(projectId);
  const { data: granularity, isLoading: granularityLoading } = useProjectGranularity(projectId);
  const { data: milestones, isLoading: milestonesLoading } = useProjectMilestones(projectId);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format number with commas
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <>
      <ProjectSubNav projectId={projectId} />
      <div className="app-content">
        {/* Key Metrics Row */}
        <div className="row mb-4">
          <div className="col-12">
            <h5 className="mb-3">Key Metrics</h5>
          </div>
          {metricsLoading ? (
            <div className="col-12 text-center py-5">
              <CSpinner color="primary" />
            </div>
          ) : metrics ? (
            <>
              <div className="col-lg-3 col-md-6 mb-3">
                <MetricCard
                  label="Total Acres"
                  value={formatNumber(metrics.parcels.total_acres)}
                  subtitle={`${formatNumber(metrics.project.acres_gross)} gross acres`}
                  format="number"
                />
              </div>
              <div className="col-lg-3 col-md-6 mb-3">
                <MetricCard
                  label="Total Units"
                  value={formatNumber(metrics.parcels.total_units)}
                  subtitle={`${metrics.parcels.land_use_types} product types`}
                  format="number"
                />
              </div>
              <div className="col-lg-3 col-md-6 mb-3">
                <MetricCard
                  label="Budget Amount"
                  value={formatCurrency(metrics.budget.total_budget_amount)}
                  subtitle={`${metrics.budget.budget_count} active budgets`}
                  format="currency"
                />
              </div>
              <div className="col-lg-3 col-md-6 mb-3">
                <MetricCard
                  label="Project Structure"
                  value={`${metrics.containers.areas} / ${metrics.containers.phases}`}
                  subtitle="Areas / Phases"
                  format="number"
                />
              </div>
            </>
          ) : (
            <div className="col-12 text-center py-5 text-muted">
              No metrics available
            </div>
          )}
        </div>

        {/* Granularity and Timeline Row */}
        <div className="row mb-4">
          <div className="col-lg-6 mb-3">
            <GranularityIndicators
              data={granularity || {
                budget_completeness: 0,
                sales_completeness: 0,
                planning_completeness: 0,
                overall_score: 0,
              }}
              isLoading={granularityLoading}
            />
          </div>
          <div className="col-lg-6 mb-3">
            <MilestoneTimeline
              milestones={milestones?.milestones || []}
              isLoading={milestonesLoading}
            />
          </div>
        </div>

        {/* Activity Feed Row */}
        <div className="row">
          <div className="col-12">
            <ActivityFeed />
          </div>
        </div>
      </div>
    </>
  );
}
