/**
 * FileDropContext - Shared file drop handling across the app
 *
 * Allows any component to act as a drop zone and forward files
 * to the Landscaper panel for processing.
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';

interface PendingFile {
  file: File;
  timestamp: number;
}

interface FileDropContextValue {
  pendingFiles: PendingFile[];
  pendingIntakeFiles: PendingFile[];
  addFiles: (files: File[]) => void;
  clearFiles: () => void;
  consumeFiles: () => File[];
  consumeIntakeFiles: () => File[];
}

const FileDropContext = createContext<FileDropContextValue | null>(null);

export function FileDropProvider({ children }: { children: ReactNode }) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [pendingIntakeFiles, setPendingIntakeFiles] = useState<PendingFile[]>([]);
  const pendingFilesRef = useRef<PendingFile[]>([]);
  const pendingIntakeRef = useRef<PendingFile[]>([]);

  // Keep refs in sync
  pendingFilesRef.current = pendingFiles;
  pendingIntakeRef.current = pendingIntakeFiles;

  const addFiles = useCallback((files: File[]) => {
    const timestamp = Date.now();
    const newFiles = files.map(file => ({ file, timestamp }));
    setPendingFiles(prev => [...prev, ...newFiles]);
    setPendingIntakeFiles(prev => [...prev, ...newFiles]);
  }, []);

  const clearFiles = useCallback(() => {
    setPendingFiles([]);
  }, []);

  // Stable refs avoid stale closure in useEffect consumers
  const consumeFiles = useCallback((): File[] => {
    const files = pendingFilesRef.current.map(pf => pf.file);
    setPendingFiles([]);
    return files;
  }, []);

  const consumeIntakeFiles = useCallback((): File[] => {
    const files = pendingIntakeRef.current.map(pf => pf.file);
    setPendingIntakeFiles([]);
    return files;
  }, []);

  return (
    <FileDropContext.Provider value={{ pendingFiles, pendingIntakeFiles, addFiles, clearFiles, consumeFiles, consumeIntakeFiles }}>
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
