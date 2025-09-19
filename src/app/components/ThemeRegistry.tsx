// src/app/components/ThemeRegistry.tsx
// v1.2 — fixes hydration by injecting Emotion styles during SSR

"use client";

import * as React from "react";
import { useServerInsertedHTML } from "next/navigation";
import createCache from "@emotion/cache";
import type { EmotionCache } from '@emotion/cache'
import { CacheProvider } from "@emotion/react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "./theme";

// Create a new Emotion cache with 'mui' key and prepend true
function createEmotionCache() {
  return createCache({ key: "mui", prepend: true });
}

export default function ThemeRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  const cache = React.useMemo<EmotionCache>(() => createEmotionCache(), []);
  const inserted: string[] = [];

  // Monkey‑patch cache.insert to keep track of injected names
  type InsertFn = (selector: string, serialized: { name: string }, sheet?: unknown, shouldCache?: boolean) => void
  const prevInsert: InsertFn = (cache as unknown as { insert: InsertFn }).insert
  ;(cache as unknown as { insert: InsertFn }).insert = (
    selector: string,
    serialized: { name: string },
    sheet?: unknown,
    shouldCache?: boolean
  ) => {
    if (!(cache.inserted as Record<string, boolean | string>)[serialized.name]) {
      inserted.push(serialized.name)
    }
    prevInsert(selector, serialized, sheet, shouldCache)
  }

  // Push collected styles into the server HTML so client matches server
  useServerInsertedHTML(() => {
    const styles = inserted
      .map((name) => cache.inserted[name])
      .filter(Boolean)
      .join("");
    return (
      <style
        data-emotion={`${cache.key} ${inserted.join(" ")}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}
