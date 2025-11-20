'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CCard, CCardHeader, CCardBody } from '@coreui/react';
import { useProjectContext } from '@/app/components/ProjectProvider';

interface UserTileProps {
  username?: string;
  onSubmit?: (message: string) => void;
}

export default function UserTile({ username = 'Gregg', onSubmit }: UserTileProps) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const { activeProject } = useProjectContext();
  const [lastAccessTime, setLastAccessTime] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const timestamp = localStorage.getItem('activeProjectTimestamp');
      if (timestamp) {
        setLastAccessTime(formatTimeAgo(new Date(timestamp)));
      }
    }
  }, [activeProject]);

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    // Format as date for older entries
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleSettingsClick = () => {
    router.push('/account-settings');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSubmit?.(message);
      console.log('Message to Landscaper:', message);
      setMessage('');
    }
  };

  return (
    <CCard style={{ height: '100%', width: '100%' }}>
      <CCardHeader style={{ backgroundColor: 'var(--surface-card-header)' }}>
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold" style={{ color: 'var(--cui-body-color)' }}>
            {username}
          </span>
          <button
            onClick={handleSettingsClick}
            className="p-1 rounded transition-colors hover:bg-opacity-10"
            style={{
              color: 'var(--cui-secondary-color)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label="Edit user settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </CCardHeader>
      <CCardBody>
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`What are we working on ${username}?`}
            className="w-full px-4 py-2.5 pr-12 rounded-lg border transition-colors text-sm"
            style={{
              backgroundColor: 'var(--cui-body-bg)',
              borderColor: 'var(--cui-border-color)',
              color: 'var(--cui-body-color)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--cui-primary)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--cui-border-color)';
            }}
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded transition-colors disabled:opacity-40"
            style={{
              color: 'var(--cui-primary)',
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.backgroundColor = 'var(--cui-primary)';
                e.currentTarget.style.color = 'white';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--cui-primary)';
            }}
            aria-label="Send message to Landscaper"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        {activeProject && lastAccessTime && (
          <div className="mt-3 pt-3 border-t text-xs" style={{
            color: 'var(--cui-secondary-color)',
            borderColor: 'var(--cui-border-color)'
          }}>
            Last worked on: <span className="font-medium" style={{ color: 'var(--cui-body-color)' }}>
              {activeProject.project_name}
            </span> - {lastAccessTime}
          </div>
        )}
      </CCardBody>
    </CCard>
  );
}
