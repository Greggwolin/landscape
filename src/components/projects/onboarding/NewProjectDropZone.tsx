'use client';

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Upload, Loader2, CheckCircle, AlertCircle, Clipboard } from 'lucide-react';

interface NewProjectDropZoneProps {
  onFileDrop: (file: File) => void;
  onFilesDrop?: (files: File[]) => void; // For multi-file drops (OM packages)
  isDark?: boolean;
  isProcessing?: boolean;
  compact?: boolean;
  multiple?: boolean; // Allow multiple file selection
}

type DropPhase = 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error';

// Allowed MIME types for validation
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png'
];

export default function NewProjectDropZone({
  onFileDrop,
  onFilesDrop,
  isDark = false,
  isProcessing = false,
  compact = false,
  multiple = false,
}: NewProjectDropZoneProps) {
  const [phase, setPhase] = useState<DropPhase>('idle');
  const [fileName, setFileName] = useState<string>('');
  const [fileCount, setFileCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Process multiple files
  const processFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    setFileCount(files.length);
    setFileName(files.length === 1 ? files[0].name : `${files.length} files`);
    setPhase('uploading');
    setErrorMessage('');

    try {
      // Simulate brief upload delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));
      setPhase('analyzing');

      // Call appropriate parent handler
      if (files.length > 1 && onFilesDrop) {
        onFilesDrop(files);
      } else {
        // Process files one at a time if no multi-file handler
        for (const file of files) {
          onFileDrop(file);
        }
      }

      // Parent will handle the actual processing
      // We just show a brief success state
      setTimeout(() => {
        setPhase('complete');
        setTimeout(() => {
          setPhase('idle');
          setFileName('');
          setFileCount(0);
        }, 2000);
      }, 500);
    } catch (error) {
      setPhase('error');
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
      setTimeout(() => {
        setPhase('idle');
        setErrorMessage('');
        setFileCount(0);
      }, 3000);
    }
  }, [onFileDrop, onFilesDrop]);

  // Single file processing (backwards compatible)
  const processFile = useCallback(async (file: File) => {
    processFiles([file]);
  }, [processFiles]);

  // Handle pasted files from clipboard
  const handlePaste = useCallback((event: ClipboardEvent) => {
    if (isProcessing || phase !== 'idle') return;

    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file && ALLOWED_MIME_TYPES.includes(file.type)) {
          event.preventDefault();
          // Process the pasted file
          processFile(file);
          return;
        }
      }
    }
  }, [isProcessing, phase, processFile]);

  // Add paste event listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Listen on document for paste events when container is focused or hovered
    const handleDocumentPaste = (event: ClipboardEvent) => {
      // Check if the dropzone or its children are focused/active
      if (container.contains(document.activeElement) || container.matches(':hover')) {
        handlePaste(event);
      }
    };

    document.addEventListener('paste', handleDocumentPaste);
    return () => {
      document.removeEventListener('paste', handleDocumentPaste);
    };
  }, [handlePaste]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    // Use processFiles for all drops (handles single and multi-file)
    processFiles(acceptedFiles);
  }, [processFiles]);

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
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxSize: 32 * 1024 * 1024, // 32MB
    maxFiles: multiple ? 20 : 1, // Allow up to 20 files for OM packages
    multiple,
    disabled: isProcessing || phase !== 'idle',
  });

  const isActive = phase !== 'idle';

  // Determine border and background colors
  const getBorderClass = () => {
    if (isDragAccept) return 'border-green-400 bg-green-50 dark:bg-green-900/20';
    if (isDragReject) return 'border-red-400 bg-red-50 dark:bg-red-900/20';
    if (isDragActive) return 'border-blue-400 bg-blue-50 dark:bg-blue-900/20';
    if (phase === 'complete') return 'border-green-400 bg-green-50 dark:bg-green-900/20';
    if (phase === 'error') return 'border-red-400 bg-red-50 dark:bg-red-900/20';
    return isDark
      ? 'border-slate-600 hover:border-slate-500'
      : 'border-slate-300 hover:border-slate-400';
  };

  if (compact) {
    return (
      <div
        ref={containerRef}
        {...getRootProps()}
        tabIndex={0}
        className={`
          relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
          transition-colors duration-200 outline-none focus:ring-2 focus:ring-blue-400
          ${getBorderClass()}
          ${isActive ? 'cursor-default' : ''}
        `}
      >
        <input {...getInputProps()} />

        <div className="flex items-center justify-center gap-3">
          {phase === 'idle' && (
            <>
              <Upload className={`h-5 w-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
              <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {isDragActive
                  ? (multiple ? 'Drop documents here' : 'Drop document here')
                  : (multiple ? 'Drag, paste, or click to browse files' : 'Drag, paste, or click to browse')
                }
              </span>
            </>
          )}

          {phase === 'uploading' && (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              <span className="text-sm text-blue-600">Uploading {fileName}...</span>
            </>
          )}

          {phase === 'analyzing' && (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
              <span className="text-sm text-amber-600">
                {fileCount > 1 ? `Analyzing ${fileCount} documents...` : 'Analyzing document...'}
              </span>
            </>
          )}

          {phase === 'complete' && (
            <>
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm text-green-600">
                {fileCount > 1 ? `${fileCount} documents received!` : 'Document received!'}
              </span>
            </>
          )}

          {phase === 'error' && (
            <>
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-sm text-red-600">{errorMessage || 'Upload failed'}</span>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      {...getRootProps()}
      tabIndex={0}
      className={`
        relative border-2 border-dashed p-8 text-center cursor-pointer
        transition-colors duration-200 outline-none focus:ring-2 focus:ring-blue-400
        ${getBorderClass()}
        ${isActive ? 'cursor-default' : ''}
      `}
      style={{ borderRadius: 'var(--cui-card-border-radius)' }}
    >
      <input {...getInputProps()} />

      {phase === 'idle' && (
        <div className="space-y-3">
          <div className={`mx-auto h-12 w-12 rounded-full flex items-center justify-center ${
            isDark ? 'bg-slate-800' : 'bg-slate-100'
          }`}>
            <FileText className={`h-6 w-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
          </div>

          {isDragActive ? (
            isDragAccept ? (
              <div>
                <p className="text-base font-medium text-green-600">Drop to upload</p>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Release to start analysis
                </p>
              </div>
            ) : (
              <div>
                <p className="text-base font-medium text-red-600">File not supported</p>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Use PDF, Word, or Excel files
                </p>
              </div>
            )
          ) : (
            <div>
              <p className={`text-base font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                {multiple ? 'Drop or paste documents here' : 'Drop or paste a document here'}
              </p>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {multiple
                  ? 'OM package, rent roll, T-12, appraisal (multi-file supported)'
                  : 'Offering memorandum, rent roll, T-12, or appraisal'
                }
              </p>
            </div>
          )}

          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition"
            >
              <Upload className="h-4 w-4" />
              {multiple ? 'Select Files' : 'Select File'}
            </button>
            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>or</span>
            <span className={`inline-flex items-center gap-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <Clipboard className="h-3 w-3" />
              Ctrl+V to paste
            </span>
          </div>

          <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            PDF, Word, Excel up to 32MB
          </p>
        </div>
      )}

      {phase === 'uploading' && (
        <div className="space-y-3">
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-blue-500" />
          <div>
            <p className="text-base font-medium text-blue-600">Uploading...</p>
            <p className={`text-sm truncate max-w-xs mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {fileName}
            </p>
          </div>
        </div>
      )}

      {phase === 'analyzing' && (
        <div className="space-y-3">
          <div className="relative mx-auto h-12 w-12">
            <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
            <div className="relative h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            </div>
          </div>
          <div>
            <p className="text-base font-medium text-amber-600">
              {fileCount > 1 ? `Analyzing ${fileCount} documents...` : 'Analyzing document...'}
            </p>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Extracting fields for Landscaper
            </p>
          </div>
        </div>
      )}

      {phase === 'complete' && (
        <div className="space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-base font-medium text-green-600">
              {fileCount > 1 ? `${fileCount} documents received!` : 'Document received!'}
            </p>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Landscaper is reviewing the content
            </p>
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div className="space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <p className="text-base font-medium text-red-600">Upload failed</p>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {errorMessage || 'Please try again'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
