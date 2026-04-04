'use client';

import React from 'react';

interface ValueBoxProps {
  eyebrow: string;
  value?: string;
  subtitle?: string;
  waitingText?: string;
  dim?: boolean;
}

export function ValueBox({ eyebrow, value, subtitle, waitingText, dim = false }: ValueBoxProps) {
  return (
    <div className={`val-box${dim ? ' dim' : ''}`}>
      <div className="vb-eye">{eyebrow}</div>
      {value ? (
        <>
          <div className="vb-num">{value}</div>
          {subtitle && <div className="vb-sub">{subtitle}</div>}
        </>
      ) : (
        <div className="vb-wait">{waitingText || '— awaiting data'}</div>
      )}
    </div>
  );
}
