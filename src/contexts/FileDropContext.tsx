/**
 * FileDropContext - Shared file drop handling across the app
 *
 * Allows any component to act as a drop zone and forward files
 * to the Landscaper panel for processing.
 */

'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface PendingFile {
  file: File;
  timestamp: number;
}

interface FileDropContextValue {
  pendingFiles: PendingFile[];
  addFiles: (files: File[]) => void;
  clearFiles: () => void;
  consumeFiles: () => File[];
}

const FileDropContext = createContext<FileDropContextValue | null>(null);

export function FileDropProvider({ children }: { children: ReactNode }) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  const addFiles = useCallback((files: File[]) => {
    const timestamp = Date.now();
    setPendingFiles(prev => [
      ...prev,
      ...files.map(file => ({ file, timestamp })),
    ]);
  }, []);

  const clearFiles = useCallback(() => {
    setPendingFiles([]);
  }, []);

  const consumeFiles = useCallback((): File[] => {
    const files = pendingFiles.map(pf => pf.file);
    setPendingFiles([]);
    return files;
  }, [pendingFiles]);

  return (
    <FileDropContext.Provider value={{ pendingFiles, addFiles, clearFiles, consumeFiles }}>
      {children}
    </FileDropContext.Provider>
  );
}

export function useFileDrop() {
  const context = useContext(FileDropContext);
  if (!context) {
    throw new Error('useFileDrop must be used within a FileDropProvider');
  }
  return context;
}

export default FileDropContext;
