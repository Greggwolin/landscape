'use client';

/**
 * StandardArtifactFrame — the one toolbar every artifact carries.
 *
 * Housekeeping settled with the navigation rules (chat MP, 2026-09-22): the
 * toolbar differed by artifact type. A Year 1 statement (the generic renderer)
 * had edit / pin / copy / print / save / close; the Cash Flow schedule had
 * close only. The schedule-style artifacts (budget, parcels, sales, pricing,
 * rent roll, capitalization, cash flow) each drew their own header with a lone
 * close button. This frame gives them the same standard actions — pin, copy,
 * print, close — in the same place, so an artifact behaves the same way
 * whichever tool made it. The generic renderer and the report view already
 * carry these and are not wrapped.
 *
 * Copy and print act on what is rendered inside the frame, i.e. what is on
 * screen (the rows a filter left, the columns a chip left). Printing goes
 * through the shared printArtifact helper: the artifact alone, on a light
 * sheet. The budget schedule has its own print (with a footnote about the
 * filter) and passes hidePrint so there is one print button, not two.
 */

import React, { useRef, useState } from 'react';
import { Check, Copy, Pin, Printer, X } from 'lucide-react';
import { printArtifact } from './printArtifact';

interface StandardArtifactFrameProps {
  title: string;
  pinnedLabel: string | null | undefined;
  onPin: (label: string) => void;
  onUnpin: () => void;
  onClose: () => void;
  hidePrint?: boolean;
  children: React.ReactNode;
}

const btnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 26,
  height: 26,
  border: 0,
  borderRadius: 4,
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  opacity: 0.75,
};

export function StandardArtifactFrame({
  title,
  pinnedLabel,
  onPin,
  onUnpin,
  onClose,
  hidePrint,
  children,
}: StandardArtifactFrameProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const isPinned = Boolean(pinnedLabel);

  const handleCopy = async () => {
    const el = bodyRef.current;
    if (!el) return;
    const text = el.innerText;
    const html = el.innerHTML;
    try {
      const ClipboardItemCtor = (window as unknown as { ClipboardItem?: typeof ClipboardItem })
        .ClipboardItem;
      if (ClipboardItemCtor && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItemCtor({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([text], { type: 'text/plain' }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        /* no clipboard available */
      }
    }
  };

  const handlePrint = () => {
    const el = bodyRef.current;
    if (!el) return;
    printArtifact(title, el.innerHTML, 'Printed as shown on screen.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div
        className="d-flex align-items-center justify-content-end gap-1"
        style={{ padding: '2px 6px', flexShrink: 0 }}
        role="toolbar"
        aria-label="Artifact actions"
      >
        {isPinned && (
          <span style={{ fontSize: 11, opacity: 0.6, marginRight: 'auto', paddingLeft: 4 }}>
            Pinned: {pinnedLabel}
          </span>
        )}
        <button
          type="button"
          style={{ ...btnStyle, opacity: isPinned ? 1 : btnStyle.opacity }}
          onClick={() => (isPinned ? onUnpin() : onPin(title))}
          title={isPinned ? 'Unpin' : 'Pin'}
          aria-label={isPinned ? 'Unpin' : 'Pin'}
          aria-pressed={isPinned}
        >
          <Pin size={13} />
        </button>
        <button type="button" style={btnStyle} onClick={handleCopy} title="Copy" aria-label="Copy">
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
        {!hidePrint && (
          <button
            type="button"
            style={btnStyle}
            onClick={handlePrint}
            title="Print (or save as PDF)"
            aria-label="Print"
          >
            <Printer size={13} />
          </button>
        )}
        <button type="button" style={btnStyle} onClick={onClose} title="Close" aria-label="Close">
          <X size={14} />
        </button>
      </div>
      <div ref={bodyRef} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

export default StandardArtifactFrame;
