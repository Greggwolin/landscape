/**
 * AdviceAdherencePanel Component
 *
 * Displays variances between AI suggestions and actual project values.
 * Includes a threshold slider to filter variances.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { CCard, CCardBody, CCardHeader } from '@coreui/react';
import VarianceItem from './VarianceItem';

interface Variance {
  assumption_key: string;
  lifecycle_stage: string;
  suggested_value: number;
  actual_value: number;
  variance_percent: number;
  confidence_level: string;
  advice_date: string;
  notes?: string | null;
}

interface AdviceAdherencePanelProps {
  projectId: number;
  variances: Variance[];
  threshold: number;
  onThresholdChange: (threshold: number) => void;
}

export default function AdviceAdherencePanel({
  projectId,
  variances,
  threshold,
  onThresholdChange,
}: AdviceAdherencePanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localVariances, setLocalVariances] = useState<Variance[]>(variances);

  // Load variances when threshold changes
  useEffect(() => {
    loadVariances();
  }, [projectId, threshold]);

  const loadVariances = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:8000/api/projects/${projectId}/landscaper/variances/?threshold=${threshold}`
      );

      if (!response.ok) {
        throw new Error('Failed to load variances');
      }

      const data = await response.json();
      setLocalVariances(data.variances || []);
    } catch (err) {
      console.error('Error loading variances:', err);
      setError('Failed to load variances');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="d-flex flex-column h-100">
      <CCard className="h-100 border-0">
        <CCardHeader className="bg-transparent border-bottom">
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0">Advice Adherence</h6>
            <span className="badge bg-secondary">{localVariances.length}</span>
          </div>
        </CCardHeader>

        <CCardBody className="p-3 overflow-auto flex-grow-1">
          {/* Threshold slider */}
          <div className="mb-3">
            <label className="form-label small text-muted">
              Variance Threshold: {threshold}%
            </label>
            <input
              type="range"
              className="form-range"
              min="0"
              max="50"
              step="1"
              value={threshold}
              onChange={(e) => onThresholdChange(Number(e.target.value))}
            />
            <div className="d-flex justify-content-between small text-muted mt-1">
              <span>0%</span>
              <span>50%</span>
            </div>
          </div>

          {/* Explanation */}
          <div className="alert alert-info small mb-3" role="alert">
            <strong>What is this?</strong>
            <p className="mb-0 mt-1">
              Shows where your assumptions differ from Landscaper AI suggestions
              by more than {threshold}%. Higher variances may warrant review.
            </p>
          </div>

          {/* Error display */}
          {error && (
            <div className="alert alert-danger small mb-3" role="alert">
              {error}
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="text-center py-4 text-muted">
              <div className="spinner-border spinner-border-sm me-2" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              Loading variances...
            </div>
          )}

          {/* Variances list */}
          {!isLoading && localVariances.length === 0 && (
            <div className="text-center py-4 text-muted">
              <p className="mb-0">No variances above {threshold}% threshold</p>
              <p className="small mt-2">
                {threshold > 0
                  ? 'Lower the threshold to see more variances'
                  : 'Send messages to Landscaper AI to get suggestions'}
              </p>
            </div>
          )}

          {!isLoading &&
            localVariances.map((variance, idx) => (
              <VarianceItem
                key={`${variance.assumption_key}-${idx}`}
                assumptionKey={variance.assumption_key}
                lifecycleStage={variance.lifecycle_stage}
                suggestedValue={variance.suggested_value}
                actualValue={variance.actual_value}
                variancePercent={variance.variance_percent}
                confidenceLevel={variance.confidence_level}
                adviceDate={variance.advice_date}
                notes={variance.notes}
              />
            ))}
        </CCardBody>
      </CCard>
    </div>
  );
}
