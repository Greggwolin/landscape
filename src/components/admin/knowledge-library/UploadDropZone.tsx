'use client';

import React, { useState, useRef, useCallback } from 'react';
import { CSpinner } from '@coreui/react';

interface UploadDropZoneProps {
  djangoApiUrl: string;
  onUploadComplete: () => void;
}

export default function UploadDropZone({ djangoApiUrl, onUploadComplete }: UploadDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const uploadFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadStatus(`Uploading ${files.length} file${files.length !== 1 ? 's' : ''}...`);

    try {
      const formData = new FormData();
      for (const file of Array.from(files)) {
        formData.append('files', file);
      }

      const response = await fetch(`${djangoApiUrl}/api/knowledge/library/upload/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const successCount = data.uploads?.filter((u: { error?: string }) => !u.error).length || 0;

      setUploadStatus(`${successCount} file${successCount !== 1 ? 's' : ''} uploaded successfully`);
      onUploadComplete();

      setTimeout(() => setUploadStatus(null), 3000);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('Upload failed. Please try again.');
      setTimeout(() => setUploadStatus(null), 3000);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    void uploadFiles(e.dataTransfer.files);
  }, []);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      void uploadFiles(e.target.files);
    }
  };

  return (
    <>
      <div
        className={`kl-dropzone${isDragOver ? ' dragover' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      >
        {isUploading ? (
          <div className="kl-dropzone-uploading">
            <CSpinner size="sm" />
            <span>{uploadStatus}</span>
          </div>
        ) : uploadStatus ? (
          <span>{uploadStatus}</span>
        ) : (
          <span>
            Drop files here to upload to Knowledge Library — Landscaper will auto-classify and geo-tag
          </span>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </>
  );
}
