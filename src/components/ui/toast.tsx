'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CCloseButton, CToast, CToastBody, CToastHeader, CToaster } from '@coreui/react';

type ToastType = 'success' | 'error' | 'danger' | 'warning' | 'info';

type ToastInput =
  | string
  | {
      title?: string;
      message?: string;
      description?: string;
      type?: ToastType;
      duration?: number;
    };

type ToastContextValue = {
  showToast: (input: ToastInput, type?: ToastType) => void;
};

type ToastItem = {
  id: number;
  title: string;
  message: string;
  type: ToastType;
  delay: number;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const COLOR_MAP: Record<ToastType, 'success' | 'danger' | 'warning' | 'info'> = {
  success: 'success',
  error: 'danger',
  danger: 'danger',
  warning: 'warning',
  info: 'info',
};

const DEFAULT_TITLES: Record<ToastType, string> = {
  success: 'Success',
  error: 'Error',
  danger: 'Error',
  warning: 'Warning',
  info: 'Info',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((input: ToastInput, type?: ToastType) => {
    const baseType: ToastType = type || 'info';
    const normalized =
      typeof input === 'string'
        ? {
            title: DEFAULT_TITLES[baseType],
            message: input,
            type: baseType,
            delay: 3500,
          }
        : {
            title: input.title || DEFAULT_TITLES[input.type || baseType],
            message: input.message || input.description || '',
            type: input.type || baseType,
            delay: input.duration ?? 3500,
          };

    setToasts((prev) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        title: normalized.title,
        message: normalized.message,
        type: normalized.type,
        delay: normalized.delay,
      },
    ]);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <CToaster placement="top-end" className="p-3">
        {toasts.map((toast) => (
          <CToast
            key={toast.id}
            visible
            autohide
            delay={toast.delay}
            color={COLOR_MAP[toast.type]}
            onClose={() => removeToast(toast.id)}
          >
            <CToastHeader closeButton={false}>
              <strong className="me-auto">{toast.title}</strong>
              <CCloseButton onClick={() => removeToast(toast.id)} />
            </CToastHeader>
            <CToastBody>{toast.message}</CToastBody>
          </CToast>
        ))}
      </CToaster>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

