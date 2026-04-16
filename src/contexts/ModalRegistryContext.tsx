'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { X } from 'lucide-react';

export interface ModalWrapperProps {
  project: ModalProject;
  isOpen: boolean;
  onClose: () => void;
  context?: Record<string, unknown>;
}

export interface ModalProject {
  project_id: number;
  project_name: string;
  project_type_code?: string;
  project_type?: string;
  property_subtype?: string;
}

interface ModalDefinition {
  component: React.ComponentType<ModalWrapperProps>;
  defaultSize: 'standard' | 'wide' | 'full';
  label: string;
}

interface ModalRegistryContextValue {
  openModal: (key: string, context?: Record<string, unknown>) => void;
  closeModal: () => void;
  activeModal: string | null;
}

const ModalRegistryContext = createContext<ModalRegistryContextValue | null>(null);

// Static registry — populated at module load via registerModal()
const MODAL_REGISTRY: Record<string, ModalDefinition> = {};

export function registerModal(key: string, definition: ModalDefinition) {
  MODAL_REGISTRY[key] = definition;
}

interface ModalRegistryProviderProps {
  project: ModalProject;
  children: React.ReactNode;
}

export function ModalRegistryProvider({ project, children }: ModalRegistryProviderProps) {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalContext, setModalContext] = useState<Record<string, unknown> | null>(null);

  const openModal = useCallback((key: string, ctx?: Record<string, unknown>) => {
    if (MODAL_REGISTRY[key]) {
      setActiveModal(key);
      setModalContext(ctx || null);
    } else {
      console.warn(`[ModalRegistry] Unknown modal key: ${key}`);
    }
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setModalContext(null);
  }, []);

  const def = activeModal ? MODAL_REGISTRY[activeModal] : null;
  const ActiveComponent = def?.component;

  return (
    <ModalRegistryContext.Provider value={{ openModal, closeModal, activeModal }}>
      {children}
      {activeModal && def && ActiveComponent && (
        <div className="w-modal-overlay" onClick={closeModal}>
          <div
            className={`w-modal-container size-${def.defaultSize}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-modal-header">
              <span className="w-modal-header-title">{def.label}</span>
              <button className="w-modal-close" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>
            <div className="w-modal-body">
              <ActiveComponent
                project={project}
                isOpen={true}
                onClose={closeModal}
                context={modalContext || undefined}
              />
            </div>
          </div>
        </div>
      )}
    </ModalRegistryContext.Provider>
  );
}

export function useModalRegistry(): ModalRegistryContextValue {
  const ctx = useContext(ModalRegistryContext);
  if (!ctx) {
    throw new Error('useModalRegistry must be used within a ModalRegistryProvider');
  }
  return ctx;
}

/**
 * Safe variant — returns null when no ModalRegistryProvider is mounted.
 * Use in components that may render both inside and outside a project layout
 * (e.g., CenterChatPanel serves project-scoped and unassigned chats).
 */
export function useModalRegistrySafe(): ModalRegistryContextValue | null {
  return useContext(ModalRegistryContext);
}
