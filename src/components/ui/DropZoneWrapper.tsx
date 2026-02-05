/**
 * DropZoneWrapper - Makes any content area a file drop zone
 *
 * Wraps children with react-dropzone and forwards dropped files
 * to the shared FileDropContext for the Landscaper to handle.
 */

'use client';

import React, { useCallback, ReactNode } from 'react';
import { useDropzone } from 'react-dropzone';
import { useFileDrop } from '@/contexts/FileDropContext';

interface DropZoneWrapperProps {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onFilesDropped?: (files: File[]) => void;
}

export function DropZoneWrapper({
  children,
  className = '',
  disabled = false,
  onFilesDropped,
}: DropZoneWrapperProps) {
  const { addFiles } = useFileDrop();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      addFiles(acceptedFiles);
      onFilesDropped?.(acceptedFiles);
    }
  }, [addFiles, onFilesDropped]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true,
    disabled,
    noClick: true,
    noKeyboard: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`drop-zone-wrapper ${className}`}
      style={{
        position: 'relative',
        height: '100%',
        width: '100%',
        borderRadius: 'var(--cui-card-border-radius)',
        border: isDragActive ? '2px dashed var(--cui-primary)' : '2px dashed transparent',
        backgroundColor: isDragActive ? 'var(--cui-tertiary-bg)' : 'transparent',
        transition: 'border-color 0.15s ease, background-color 0.15s ease',
      }}
    >
      <input {...getInputProps()} />

      {isDragActive && (
        <div
          className="drop-zone-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            zIndex: 50,
            borderRadius: 'var(--cui-card-border-radius)',
            backgroundColor: isDragAccept
              ? 'rgba(34, 197, 94, 0.1)'
              : isDragReject
              ? 'rgba(239, 68, 68, 0.1)'
              : 'rgba(0, 0, 0, 0.05)',
            color: 'var(--cui-body-color)',
            pointerEvents: 'none',
          }}
        >
          <div className="fw-semibold" style={{ fontSize: '1.1rem' }}>
            {isDragReject ? 'File type not supported' : 'Drop files for Landscaper'}
          </div>
          <div className="mt-1" style={{ color: 'var(--cui-secondary-color)', fontSize: '0.9rem' }}>
            {isDragReject
              ? 'Use PDF, Excel, CSV, or image files'
              : 'Drop rent roll, T-12, or OM documents'}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}

export default DropZoneWrapper;
