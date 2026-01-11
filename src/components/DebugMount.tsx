 
'use client';

// DebugMount.tsx
// v1.1 · 2025-12-12

import { useEffect, useRef } from 'react';

export function DebugMount({ name }: { name: string }) {
  const renders = useRef(0);
  renders.current += 1;

  console.log(`[${name}] RENDER #${renders.current}`);

  useEffect(() => {
    console.log(`[${name}] MOUNT`);
    return () => console.log(`[${name}] UNMOUNT`);
  }, [name]);

  return null;
}
