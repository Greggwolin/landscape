'use client';

import React, { useEffect, useState, useCallback } from 'react';

/**
 * Progress stages for Landscaper processing.
 * Using simulated timing approach for immediate user feedback.
 */
const PROGRESS_STAGES = [
  { progress: 10, label: 'Processing request...', delay: 0 },
  { progress: 25, label: 'Parsing document...', delay: 1000 },
  { progress: 45, label: 'Extracting data...', delay: 3000 },
  { progress: 65, label: 'Analyzing content...', delay: 6000 },
  { progress: 80, label: 'Validating results...', delay: 10000 },
  { progress: 90, label: 'Preparing response...', delay: 15000 },
] as const;

interface LandscaperProgressProps {
  /** Whether Landscaper is actively processing a request */
  isProcessing: boolean;
  /** Callback when progress completes (optional) */
  onComplete?: () => void;
}

/**
 * LandscaperProgress Component
 *
 * Displays a progress bar with stage labels when Landscaper is processing.
 * Uses simulated progress that advances based on typical timing patterns.
 * Shows elapsed time for long-running requests.
 */
export function LandscaperProgress({
  isProcessing,
  onComplete,
}: LandscaperProgressProps) {
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState('');
  const [visible, setVisible] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Format elapsed time for display
  const formatTime = useCallback((seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }, []);

  // Handle progress simulation when processing starts
  useEffect(() => {
    if (!isProcessing) {
      // Processing stopped - complete and fade out
      if (visible && progress > 0) {
        setProgress(100);
        setLabel('Complete');

        // Fade out after 500ms
        const fadeTimeout = setTimeout(() => {
          setVisible(false);
          setProgress(0);
          setLabel('');
          setElapsedTime(0);
          setStartTime(null);
          onComplete?.();
        }, 500);

        return () => clearTimeout(fadeTimeout);
      }
      return;
    }

    // Processing started - show progress bar
    setVisible(true);
    setStartTime(Date.now());
    setProgress(PROGRESS_STAGES[0].progress);
    setLabel(PROGRESS_STAGES[0].label);

    // Set up stage transitions
    const timeouts: NodeJS.Timeout[] = [];

    PROGRESS_STAGES.slice(1).forEach(({ progress: stageProgress, label: stageLabel, delay }) => {
      const timeout = setTimeout(() => {
        setProgress(stageProgress);
        setLabel(stageLabel);
      }, delay);
      timeouts.push(timeout);
    });

    // Slow crawl after 90% to show continued activity
    const crawlInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 0.5, 95));
    }, 1000);

    return () => {
      timeouts.forEach(clearTimeout);
      clearInterval(crawlInterval);
    };
  }, [isProcessing, onComplete, progress, visible]);

  // Timer for elapsed time display
  useEffect(() => {
    if (!isProcessing || !startTime) return;

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isProcessing, startTime]);

  if (!visible) return null;

  return (
    <div
      className="landscaper-progress px-3 py-2 border-top"
      style={{
        borderColor: 'var(--cui-border-color)',
        backgroundColor: 'var(--cui-tertiary-bg)',
        transition: 'opacity 0.3s ease-out',
        opacity: progress === 100 ? 0.5 : 1,
      }}
    >
      {/* Progress bar container */}
      <div className="d-flex align-items-center gap-3">
        {/* Progress bar */}
        <div
          className="progress flex-grow-1"
          style={{ backgroundColor: 'var(--cui-border-color)', height: '0.5rem' }}
        >
          <div
            className="progress-bar"
            style={{
              width: `${progress}%`,
              backgroundColor: 'var(--cui-primary)',
              boxShadow: '0 0 8px rgba(var(--cui-primary-rgb), 0.5)',
              transition: 'width 0.3s ease-out',
            }}
          />
        </div>

        {/* Percentage */}
        <span
          className="small text-end"
          style={{ color: 'var(--cui-secondary-color)', minWidth: '2.5rem', fontSize: '0.75rem' }}
        >
          {Math.round(progress)}%
        </span>
      </div>

      {/* Stage label and elapsed time */}
      <div className="d-flex justify-content-between align-items-center mt-1">
        <span
          className="small d-flex align-items-center gap-2"
          style={{ color: 'var(--cui-secondary-color)', fontSize: '0.75rem' }}
        >
          {/* Animated dots */}
          {progress < 100 && (
            <span className="d-flex" style={{ gap: '0.125rem' }}>
              <span
                className="rounded-circle"
                style={{
                  width: '0.25rem',
                  height: '0.25rem',
                  backgroundColor: 'var(--cui-primary)',
                  animation: 'landscaper-bounce 0.6s infinite',
                  animationDelay: '0ms',
                }}
              />
              <span
                className="rounded-circle"
                style={{
                  width: '0.25rem',
                  height: '0.25rem',
                  backgroundColor: 'var(--cui-primary)',
                  animation: 'landscaper-bounce 0.6s infinite',
                  animationDelay: '150ms',
                }}
              />
              <span
                className="rounded-circle"
                style={{
                  width: '0.25rem',
                  height: '0.25rem',
                  backgroundColor: 'var(--cui-primary)',
                  animation: 'landscaper-bounce 0.6s infinite',
                  animationDelay: '300ms',
                }}
              />
            </span>
          )}
          {label}
        </span>

        {elapsedTime > 0 && (
          <span
            className="small"
            style={{ color: 'var(--cui-tertiary-color)', fontSize: '0.75rem' }}
          >
            {formatTime(elapsedTime)}
          </span>
        )}
      </div>

      {/* Inline keyframe animation */}
      <style jsx>{`
        @keyframes landscaper-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}

export default LandscaperProgress;
