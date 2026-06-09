'use client';

import React from 'react';

// Next.js validates a layout's default-export props against its LayoutProps
// constraint ({ children, params? }); extra props make it "not valid". This
// layout only needs children. (The unused subNavOverrides prop was dropped — #43.)
export default function CapitalizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      {children}
    </div>
  );
}
