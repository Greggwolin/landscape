'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useUploadThing } from '@/lib/uploadthing';
import type { DMSFileRouter } from '@/lib/dms/uploadthing';

interface DropzoneProps {
  projectId: number;
  workspaceId: number;
  docType?: string;
  discipline?: string;
  phaseId?: number;
  parcelId?: number;
  onUploadComplete?: (results: any[]) => void;
  onUploadError?: (error: Error) => void;
}

export default function Dropzone({
  projectId,
  workspaceId,
  docType = 'general',
  discipline,
  phaseId,
  parcelId,
  onUploadComplete,
  onUploadError
}: DropzoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const { startUpload, isUploading: uploadThingUploading } = useUploadThing('documentUploader', {
    headers: {
      'x-project-id': projectId.toString(),
      'x-workspace-id': workspaceId.toString(),
      'x-doc-type': docType,
      ...(discipline && { 'x-discipline': discipline }),
      ...(phaseId && { 'x-phase-id': phaseId.toString() }),
      ...(parcelId && { 'x-parcel-id': parcelId.toString() })
    },
    onClientUploadComplete: (res) => {
      console.log('Upload completed:', res);
      setIsUploading(false);
      setUploadProgress({});
      
      // Clear progress
      Object.keys(uploadProgress).forEach(key => {
        setUploadProgress(prev => ({ ...prev, [key]: 100 }));
      });
      
      onUploadComplete?.(res);
    },
    onUploadError: (error) => {
      console.error('Upload error:', error);
      setIsUploading(false);
      setUploadProgress({});
      onUploadError?.(error);
    },
    onUploadBegin: (name) => {
      console.log('Upload begin:', name);
      setUploadProgress(prev => ({ ...prev, [name]: 0 }));
    },
    onUploadProgress: (progress) => {
      setUploadProgress(prev => ({ ...prev, [`progress-${Date.now()}`]: progress }));
    }
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setIsUploading(true);
    
    // Initialize progress tracking
    const progressMap: Record<string, number> = {};
    acceptedFiles.forEach((file, index) => {
      progressMap[`${file.name}-${index}`] = 0;
    });
    setUploadProgress(progressMap);

    try {
      await startUpload(acceptedFiles);
    } catch (error) {
      console.error('Upload failed:', error);
      setIsUploading(false);
      setUploadProgress({});
      onUploadError?.(error instanceof Error ? error : new Error('Upload failed'));
    }
  }, [startUpload, onUploadComplete, onUploadError]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
    isDragAccept
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
      'image/gif': ['.gif'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv']
    },
    maxSize: 32 * 1024 * 1024, // 32MB
    maxFiles: 10,
    disabled: isUploading || uploadThingUploading
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const borderColor = isDragAccept 
    ? 'border-green-400 bg-green-50 dark:bg-green-900/20' 
    : isDragReject 
    ? 'border-red-400 bg-red-50 dark:bg-red-900/20' 
    : isDragActive 
    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
    : 'border-gray-300 dark:border-gray-600';

  const activeUploading = isUploading || uploadThingUploading;

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200 ease-in-out
          ${borderColor}
          ${activeUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10'}
        `}
      >
        <input {...getInputProps()} />
        
        {activeUploading ? (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Uploading files...
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Please wait while your documents are being processed
              </p>
              
              {/* Progress indicators */}
              {Object.entries(uploadProgress).length > 0 && (
                <div className="mt-4 space-y-2">
                  {Object.entries(uploadProgress).map(([filename, progress]) => (
                    <div key={filename} className="text-left">
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <span className="truncate">{filename.replace(/-.+$/, '')}</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 48 48" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                />
              </svg>
            </div>
            
            {isDragActive ? (
              isDragAccept ? (
                <div>
                  <p className="text-lg font-medium text-green-600 dark:text-green-400">
                    Drop files here to upload
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Release to start uploading
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium text-red-600 dark:text-red-400">
                    Some files are not supported
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Only PDF, Office docs, images, and text files are allowed
                  </p>
                </div>
              )
            ) : (
              <div>
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Drag and drop files here, or click to browse
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Supports PDF, Word, Excel, images, and text files up to 32MB
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Maximum 10 files per upload
                </p>
              </div>
            )}
            
            <div className="flex items-center justify-center">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Select Files
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Upload context info */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Upload Context
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
          <div>
            <span className="font-medium">Project:</span> {projectId}
          </div>
          <div>
            <span className="font-medium">Workspace:</span> {workspaceId}
          </div>
          <div>
            <span className="font-medium">Type:</span> {docType}
          </div>
          {discipline && (
            <div>
              <span className="font-medium">Discipline:</span> {discipline}
            </div>
          )}
          {phaseId && (
            <div>
              <span className="font-medium">Phase:</span> {phaseId}
            </div>
          )}
          {parcelId && (
            <div>
              <span className="font-medium">Parcel:</span> {parcelId}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}