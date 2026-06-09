'use client';

import React, { createContext, useContext } from 'react';
import { CModal, CModalBody } from '@coreui/react';

type DialogContextType = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
};

const DialogContext = createContext<DialogContextType>({ open: false });

export function Dialog({
  open = false,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return <DialogContext.Provider value={{ open, onOpenChange }}>{children}</DialogContext.Provider>;
}

export function DialogContent({
  className,
  children,
  style,
}: {
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const { open, onOpenChange } = useContext(DialogContext);
  return (
    <CModal visible={open} onClose={() => onOpenChange?.(false)}>
      <CModalBody className={className} style={style}>{children}</CModalBody>
    </CModal>
  );
}

export function DialogHeader({ className, children, style }: { className?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className={className} style={style}>{children}</div>;
}

export function DialogTitle({ className, children, style }: { className?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return <h5 className={className} style={style}>{children}</h5>;
}

export function DialogDescription({ className, children, style }: { className?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return <p className={className} style={style}>{children}</p>;
}

export function DialogFooter({ className, children, style }: { className?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className={className} style={style}>{children}</div>;
}

