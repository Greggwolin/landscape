/**
 * LandscaperCollisionContext - Handle document collisions via Landscaper chat
 *
 * Allows DMS upload components to trigger collision handling through
 * Landscaper conversational interface instead of modal dialogs.
 */

'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface CollisionExistingDoc {
  doc_id: number;
  filename: string;
  version_number: number;
  uploaded_at: string;
  extraction_summary?: {
    facts_extracted: number;
    embeddings: number;
  };
}

export interface PendingCollision {
  id: string;
  file: File;
  hash: string;
  matchType: 'filename' | 'content' | 'both';
  existingDoc: CollisionExistingDoc;
  projectId: number;
  timestamp: number;
}

export type CollisionAction = 'version' | 'rename' | 'skip';

interface CollisionContextValue {
  pendingCollision: PendingCollision | null;
  addCollision: (collision: Omit<PendingCollision, 'id' | 'timestamp'>) => string;
  clearCollision: () => void;
  resolveCollision: (action: CollisionAction) => void;
  onCollisionResolved: ((action: CollisionAction, collision: PendingCollision) => Promise<void>) | null;
  setOnCollisionResolved: (handler: ((action: CollisionAction, collision: PendingCollision) => Promise<void>) | null) => void;
}

const LandscaperCollisionContext = createContext<CollisionContextValue | null>(null);

export function LandscaperCollisionProvider({ children }: { children: ReactNode }) {
  const [pendingCollision, setPendingCollision] = useState<PendingCollision | null>(null);
  const [onCollisionResolved, setOnCollisionResolvedState] = useState<
    ((action: CollisionAction, collision: PendingCollision) => Promise<void>) | null
  >(null);

  const addCollision = useCallback((collision: Omit<PendingCollision, 'id' | 'timestamp'>): string => {
    const id = `collision-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const fullCollision: PendingCollision = {
      ...collision,
      id,
      timestamp: Date.now(),
    };
    setPendingCollision(fullCollision);
    return id;
  }, []);

  const clearCollision = useCallback(() => {
    setPendingCollision(null);
  }, []);

  const resolveCollision = useCallback((action: CollisionAction) => {
    if (pendingCollision && onCollisionResolved) {
      onCollisionResolved(action, pendingCollision);
    }
    setPendingCollision(null);
  }, [pendingCollision, onCollisionResolved]);

  const setOnCollisionResolved = useCallback(
    (handler: ((action: CollisionAction, collision: PendingCollision) => Promise<void>) | null) => {
      setOnCollisionResolvedState(() => handler);
    },
    []
  );

  return (
    <LandscaperCollisionContext.Provider
      value={{
        pendingCollision,
        addCollision,
        clearCollision,
        resolveCollision,
        onCollisionResolved,
        setOnCollisionResolved,
      }}
    >
      {children}
    </LandscaperCollisionContext.Provider>
  );
}

export function useLandscaperCollision() {
  const context = useContext(LandscaperCollisionContext);
  if (!context) {
    throw new Error('useLandscaperCollision must be used within a LandscaperCollisionProvider');
  }
  return context;
}

/**
 * Build a conversational message for Landscaper based on collision type
 */
export function buildCollisionMessage(
  file: File,
  matchType: 'filename' | 'content' | 'both',
  existingDoc: CollisionExistingDoc
): string {
  if (matchType === 'both') {
    return `The file "${file.name}" has identical content to "${existingDoc.filename}" (V${existingDoc.version_number}) which already exists in this project's DMS. This appears to be a duplicate. Do you want to skip this upload?`;
  }

  if (matchType === 'content') {
    return `The file "${file.name}" has the same content as "${existingDoc.filename}" (V${existingDoc.version_number}) but a different name. Do you want to add it as a new version of the existing document?`;
  }

  // matchType === 'filename'
  return `The file "${file.name}" already exists in this project's DMS (currently V${existingDoc.version_number}). Do you want to add it as a new version?`;
}

export default LandscaperCollisionContext;
