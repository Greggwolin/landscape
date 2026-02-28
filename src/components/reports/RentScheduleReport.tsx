'use client';

/**
 * RentScheduleReport
 *
 * Standalone wrapper for the Unit Rent Schedule grid in the Reports tab.
 * Fetches rent schedule data independently (not tied to Income Approach hook).
 */

import { useState, useEffect, useCallback } from 'react';
import { RentScheduleGrid } from '@/components/income-approach/RentScheduleGrid';
import type { UnitRentScheduleData } from '@/hooks/useIncomeApproach';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

interface RentScheduleReportProps {
  projectId: number;
}

export function RentScheduleReport({ projectId }: RentScheduleReportProps) {
  const [data, setData] = useState<UnitRentScheduleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `${DJANGO_API_URL}/api/valuation/income-approach-data/${projectId}/unit-rent-schedule/`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch rent schedule: ${response.statusText}`);
      }

      const result: UnitRentScheduleData = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching rent schedule data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load rent schedule');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (error) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: 'var(--cui-danger)',
      }}>
        <p style={{ marginBottom: '1rem' }}>{error}</p>
        <button
          onClick={fetchData}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.25rem',
            border: '1px solid var(--cui-danger)',
            backgroundColor: 'transparent',
            color: 'var(--cui-danger)',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return <RentScheduleGrid data={data} isLoading={isLoading} />;
}
