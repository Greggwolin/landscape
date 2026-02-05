'use client';

import React, { useMemo, useState } from 'react';
import { CButton } from '@coreui/react';

export interface ActivityItem {
  id: string;
  type: 'status' | 'decision' | 'update' | 'alert';
  title: string;
  summary: string;
  status?: 'complete' | 'partial' | 'blocked' | 'pending' | 'not-started';
  confidence?: 'high' | 'medium' | 'low' | null;
  timestamp: string;
  read: boolean;
  link?: string;
  details?: string[];
  blockedBy?: string;
  highlightFields?: string[];
}

interface ActivityFeedItemProps {
  item: ActivityItem;
  projectId: number;
}

const statusConfig = {
  complete: { icon: '✓', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
  partial: { icon: '⚠', color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
  blocked: { icon: '✗', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
  pending: { icon: '◐', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  'not-started': { icon: '○', color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-800' },
};

const confidenceColors = {
  high: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  low: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

 
export function ActivityFeedItem({ item, projectId }: ActivityFeedItemProps) {
  const config = item.status ? statusConfig[item.status] : statusConfig['not-started'];
  const [isRollingBack, setIsRollingBack] = useState(false);

  const { rollbackSnapshotId, visibleDetails } = useMemo(() => {
    // Ensure details is an array before processing
    const detailsArray = Array.isArray(item.details) ? item.details : [];
    if (detailsArray.length === 0) {
      return { rollbackSnapshotId: null as number | null, visibleDetails: detailsArray };
    }

    let snapshotId: number | null = null;
    const filtered = detailsArray.filter((detail) => {
      const match = detail.match(/snapshot[_ ]?id[:= ]+(\d+)/i);
      if (match) {
        const parsed = Number(match[1]);
        if (!Number.isNaN(parsed)) {
          snapshotId = parsed;
        }
        return false;
      }
      return true;
    });

    return { rollbackSnapshotId: snapshotId, visibleDetails: filtered };
  }, [item.details]);

  const handleRollback = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!rollbackSnapshotId) return;

    const confirmed = window.confirm('This will restore the rent roll to its previous state. Continue?');
    if (!confirmed) return;

    setIsRollingBack(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
      const response = await fetch(
        `${backendUrl}/api/knowledge/projects/${projectId}/rollback/${rollbackSnapshotId}/`,
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error('Rollback failed');
      }

      window.location.reload();
    } catch (err) {
       
      alert('Failed to rollback changes');
    } finally {
      setIsRollingBack(false);
    }
  };

  const content = (
    <div
      className={`
        p-3 rounded-lg border transition-colors cursor-pointer
        hover:border-blue-300 dark:hover:border-blue-600
        ${!item.read ? 'border-l-4 border-l-teal-500' : ''}
        ${config.bg}
      `}
      style={{ borderColor: 'var(--cui-border-color)' }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <span className={`text-sm ${config.color}`}>{config.icon}</span>
          <h4 className="font-medium text-sm" style={{ color: 'var(--cui-body-color)' }}>
            {item.title}
          </h4>
        </div>
        {item.confidence && (
          <span className={`px-2 py-0.5 text-xs rounded-full ${confidenceColors[item.confidence]}`}>
            {item.confidence}
          </span>
        )}
      </div>

      <p className="text-xs mb-1" style={{ color: 'var(--cui-body-color)' }}>
        {item.summary}
      </p>

      {visibleDetails && visibleDetails.length > 0 && (
        <ul className="text-xs space-y-0.5 mt-2" style={{ color: 'var(--cui-secondary-color)' }}>
          {visibleDetails.slice(0, 2).map((detail, idx) => (
            <li key={idx}>• {detail}</li>
          ))}
          {visibleDetails.length > 2 && (
            <li>+{visibleDetails.length - 2} more</li>
          )}
        </ul>
      )}

      {item.blockedBy && (
        <div className="mt-2 text-xs text-red-500">
          Blocked: {item.blockedBy}
        </div>
      )}

      {rollbackSnapshotId && (
        <div className="mt-2">
          <CButton
            color="link"
            size="sm"
            disabled={isRollingBack}
            onClick={handleRollback}
          >
            {isRollingBack ? 'Undoing...' : 'Undo'}
          </CButton>
        </div>
      )}

      <div className="mt-2 text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
        {new Date(item.timestamp).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        })}
      </div>
    </div>
  );

  // Navigation is now handled by parent component
  return content;
}
