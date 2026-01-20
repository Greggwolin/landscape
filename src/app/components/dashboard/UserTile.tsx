'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Settings, Send, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CCard, CCardHeader, CCardBody } from '@coreui/react';
import { useProjectContext } from '@/app/components/ProjectProvider';

interface UserTileProps {
  username?: string;
  onSubmit?: (message: string) => void;
  onFileDrop?: (files: File[]) => void;
}

export default function UserTile({ username = 'Gregg', onSubmit, onFileDrop }: UserTileProps) {
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

  // Handle file drops
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0 && onFileDrop) {
      onFileDrop(acceptedFiles);
    }
  }, [onFileDrop]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
  } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxSize: 32 * 1024 * 1024, // 32MB
    multiple: true,
    noClick: true, // Don't open file dialog on click
    noKeyboard: true,
  });

  return (
    <CCard
      {...getRootProps()}
      style={{
        height: '100%',
        width: '100%',
        border: isDragActive ? '2px dashed var(--cui-primary)' : undefined,
        backgroundColor: isDragActive ? 'var(--cui-tertiary-bg)' : undefined,
        transition: 'border-color 0.15s ease, background-color 0.15s ease'
      }}
    >
      <input {...getInputProps()} />
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
        {isDragActive ? (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <Upload className="h-8 w-8 mb-2" style={{ color: 'var(--cui-primary)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--cui-primary)' }}>
              Drop to create new project
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--cui-secondary-color)' }}>
              PDF, Word, Excel
            </p>
          </div>
        ) : (
          <>
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
            {onFileDrop && (
              <div className="mt-2 text-center">
                <span className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
                  Drop documents here to start a new project
                </span>
              </div>
            )}
          </>
        )}
      </CCardBody>
    </CCard>
  );
}
