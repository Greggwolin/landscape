'use client';

/**
 * WorkbenchContext — State bridge for the Ingestion Workbench.
 *
 * Carries workbench open/close state + the active document being ingested.
 * Mounted in ProjectLayoutClient so IntakeChoiceModal (anywhere) can
 * open the workbench and IngestionWorkbenchPanel can read the state.
 *
 * Also holds pendingIntakeDocs so IntakeChoiceModal can be mounted at the
 * layout level (not locked inside DMSView).
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

// Re-export the PendingIntakeDoc type so consumers don't need a separate import
export interface PendingIntakeDoc {
  docId: number;
  docName: string;
  docType: string | null;
}

export interface WorkbenchState {
  isOpen: boolean;
  docId: number | null;
  docName: string | null;
  docType: string | null;
  intakeUuid: string | null;
}

interface WorkbenchContextValue {
  state: WorkbenchState;
  openWorkbench: (params: {
    docId: number;
    docName: string;
    docType: string | null;
    intakeUuid: string;
  }) => void;
  closeWorkbench: () => void;

  /** Docs awaiting intake routing choice (bridges UploadStagingContext → IntakeChoiceModal) */
  pendingIntakeDocs: PendingIntakeDoc[];
  addPendingIntakeDocs: (docs: PendingIntakeDoc[]) => void;
  clearPendingIntakeDocs: () => void;

  /** Timestamp of the last successful workbench commit — consumers watch this to trigger refresh */
  lastCommitTimestamp: number;
  /** Signal that a commit succeeded — increments lastCommitTimestamp */
  notifyCommitSuccess: () => void;
}

const defaultState: WorkbenchState = {
  isOpen: false,
  docId: null,
  docName: null,
  docType: null,
  intakeUuid: null,
};

const WorkbenchContext = createContext<WorkbenchContextValue>({
  state: defaultState,
  openWorkbench: () => {},
  closeWorkbench: () => {},
  pendingIntakeDocs: [],
  addPendingIntakeDocs: () => {},
  clearPendingIntakeDocs: () => {},
  lastCommitTimestamp: 0,
  notifyCommitSuccess: () => {},
});

export function WorkbenchProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WorkbenchState>(defaultState);
  const [pendingIntakeDocs, setPendingIntakeDocs] = useState<PendingIntakeDoc[]>([]);
  const [lastCommitTimestamp, setLastCommitTimestamp] = useState(0);

  const openWorkbench = useCallback(
    (params: { docId: number; docName: string; docType: string | null; intakeUuid: string }) => {
      setState({
        isOpen: true,
        docId: params.docId,
        docName: params.docName,
        docType: params.docType,
        intakeUuid: params.intakeUuid,
      });
    },
    [],
  );

  const closeWorkbench = useCallback(() => {
    setState(defaultState);
  }, []);

  const addPendingIntakeDocs = useCallback((docs: PendingIntakeDoc[]) => {
    setPendingIntakeDocs((prev) => [...prev, ...docs]);
  }, []);

  const clearPendingIntakeDocs = useCallback(() => {
    setPendingIntakeDocs([]);
  }, []);

  const notifyCommitSuccess = useCallback(() => {
    setLastCommitTimestamp(Date.now());
  }, []);

  return (
    <WorkbenchContext.Provider
      value={{
        state,
        openWorkbench,
        closeWorkbench,
        pendingIntakeDocs,
        addPendingIntakeDocs,
        clearPendingIntakeDocs,
        lastCommitTimestamp,
        notifyCommitSuccess,
      }}
    >
      {children}
    </WorkbenchContext.Provider>
  );
}

export function useWorkbench() {
  return useContext(WorkbenchContext);
}
