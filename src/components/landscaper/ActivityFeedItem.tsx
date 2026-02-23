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

  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen((v) => !v);
  };

  return (
    <div
      className={`
        rounded-lg border transition-colors cursor-pointer
        hover:border-blue-300 dark:hover:border-blue-600
        ${!item.read ? 'border-l-4 border-l-teal-500' : ''}
      `}
      style={{ borderColor: 'var(--cui-border-color)' }}
      onClick={handleToggle}
    >
      {/* Title row — always visible */}
      <div
        className="d-flex align-items-center gap-2"
        style={{ padding: '0.5rem 0.75rem' }}
      >
        <span className={`text-sm ${config.color}`}>{config.icon}</span>
        <span className="font-medium text-sm flex-grow-1" style={{ color: 'var(--cui-body-color)' }}>
          {item.title}
        </span>
        {item.confidence && (
          <span className={`px-2 py-0.5 text-xs rounded-full ${confidenceColors[item.confidence]}`}>
            {item.confidence}
          </span>
        )}
        <span
          className="text-xs"
          style={{ color: 'var(--cui-secondary-color)', transition: 'transform 0.15s', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'none' }}
        >
          ▾
        </span>
      </div>

      {/* Expanded details — shown on click */}
      {isOpen && (
        <div style={{ padding: '0 0.75rem 0.5rem' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--cui-body-color)' }}>
            {item.summary}
          </p>

          {visibleDetails && visibleDetails.length > 0 && (
            <ul className="text-xs space-y-0.5 mt-1" style={{ color: 'var(--cui-secondary-color)' }}>
              {visibleDetails.map((detail, idx) => (
                <li key={idx}>• {detail}</li>
              ))}
            </ul>
          )}

          {item.blockedBy && (
            <div className="mt-1 text-xs text-red-500">
              Blocked: {item.blockedBy}
            </div>
          )}

          {rollbackSnapshotId && (
            <div className="mt-1">
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

          <div className="mt-1 text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
            {new Date(item.timestamp).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </div>
        </div>
      )}
    </div>
  );
}
