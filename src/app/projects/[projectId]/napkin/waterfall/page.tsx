'use client';

import React, { use, useState, useCallback, useRef } from 'react';
import NapkinWaterfallForm from '@/components/capitalization/NapkinWaterfallForm';
import WaterfallResults, { WaterfallApiResponse } from '@/components/capitalization/WaterfallResults';

type WaterfallType = 'IRR' | 'EM' | 'IRR_EM';

const parseWaterfallError = async (res: Response): Promise<string> => {
  const text = await res.text();
  try {
    const parsed = JSON.parse(text);
    const error = parsed?.error;
    const hint = parsed?.hint;
    if (typeof error === 'string' && error.trim().length > 0) {
      return hint ? `${error} ${hint}` : error;
    }
    if (typeof parsed?.details === 'string' && parsed.details.trim().length > 0) {
      return parsed.details;
    }
  } catch {
    // fall through to raw text
  }
  return text || `Request failed with status ${res.status}`;
};

interface NapkinWaterfallPageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export default function NapkinWaterfallPage({ params }: NapkinWaterfallPageProps) {
  const resolvedParams = use(params);
  const projectId = Number(resolvedParams.projectId);

  // Lift state up to page level so we can render summary and period table in different layout areas
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WaterfallApiResponse | null>(null);

  // Waterfall type state lifted to page level for API call
  const [waterfallType, setWaterfallType] = useState<WaterfallType>('IRR');

  // Track if we've run at least once (to enable auto-recalc on type change)
  const hasRunOnce = useRef(false);

  const handleRun = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Map UI waterfall type to API hurdle method
      const hurdleMethodMap: Record<WaterfallType, string> = {
        'IRR': 'IRR',
        'EM': 'EMx',
        'IRR_EM': 'IRR_EMx',
      };
      const hurdleMethod = hurdleMethodMap[waterfallType];

      const res = await fetch(`/api/projects/${projectId}/waterfall/calculate?hurdle_method=${hurdleMethod}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) {
        const message = await parseWaterfallError(res);
        throw new Error(message);
      }

      const json = (await res.json()) as WaterfallApiResponse;
      setData(json);
      hasRunOnce.current = true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to calculate waterfall.';
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, waterfallType]);

  // Callback when form saves - trigger recalculation
  const handleSaved = useCallback(() => {
    // Recalculate after save (ensures DB has latest config)
    if (hasRunOnce.current && !loading) {
      handleRun();
    }
  }, [handleRun, loading]);

  if (!projectId || Number.isNaN(projectId)) {
    return (
      <div className="p-4">
        <div className="alert alert-danger mb-0">
          Invalid project id in route.
        </div>
      </div>
    );
  }

  return (
    <div className="app-content">
      {/* Top row: Form on left, Results summary on right */}
      <div className="d-flex flex-column flex-lg-row gap-3 gap-lg-4 mb-3">
        <div className="flex-fill" style={{ minWidth: 0 }}>
          <NapkinWaterfallForm
            projectId={projectId}
            waterfallType={waterfallType}
            onWaterfallTypeChange={setWaterfallType}
            onSaved={handleSaved}
          />
        </div>
        <div className="flex-fill" style={{ minWidth: 0 }}>
          <WaterfallResults
            data={data}
            error={error}
            loading={loading}
            onRun={handleRun}
            showPeriodTable={false}
          />
        </div>
      </div>
      {/* Bottom row: Period-by-period table spanning full width */}
      {data && (
        <div className="row">
          <div className="col-12">
            <WaterfallResults
              data={data}
              error={null}
              loading={false}
              onRun={handleRun}
              showPeriodTableOnly
            />
          </div>
        </div>
      )}
    </div>
  );
}
