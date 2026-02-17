'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  Suspense,
  ReactNode,
} from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface HelpMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface HelpLandscaperContextType {
  isOpen: boolean;
  messages: HelpMessage[];
  conversationId: string | null;
  isLoading: boolean;
  toggleHelp: () => void;
  sendMessage: (text: string) => Promise<void>;
  clearConversation: () => void;
  closeHelp: () => void;
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

const HelpLandscaperContext = createContext<HelpLandscaperContextType | undefined>(undefined);

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

/**
 * Build a page context string from URL pathname and search params.
 *
 * Project workspace URLs use query params for navigation:
 *   /projects/17?folder=property&tab=rent-roll  →  "property_rent-roll"
 *   /projects/17?folder=operations              →  "operations"
 *   /projects/17?folder=valuation&tab=income    →  "valuation_income"
 *   /projects/17                                →  "home"
 *
 * The returned string is sent to the Help backend as `current_page`,
 * where it is used to filter platform knowledge chunks and to tell
 * Claude what page the user is viewing.
 */
function buildCurrentPage(
  pathname: string | null,
  folder: string | null,
  tab: string | null,
): string | undefined {
  if (!pathname) return undefined;

  // --- Query-param-based detection (folder tabs) ---
  if (folder && tab) {
    return `${folder}_${tab}`;        // e.g. "property_rent-roll", "valuation_income"
  }
  if (folder) {
    return folder;                     // e.g. "home", "operations", "documents"
  }

  // --- Pathname-based fallback ---
  const segments = pathname.split('/').filter(Boolean);

  if (segments[0] === 'projects' && segments.length >= 2) {
    const sub = segments[2];
    if (sub) return sub;               // e.g. /projects/17/documents → "documents"
    return 'home';                     // e.g. /projects/17           → "home"
  }

  if (pathname.startsWith('/documents')) return 'documents';
  if (pathname.startsWith('/dashboard')) return 'home';
  if (pathname === '/') return 'home';

  return undefined;
}

/** Detect property type from pathname (if inside a project, we can't know type from URL alone). */
function detectPropertyTypeFromPath(): string | undefined {
  // Property type is project-specific and not in the URL.
  // The panel will work without it; it's only used for more targeted retrieval.
  return undefined;
}

/* ------------------------------------------------------------------ */
/* Inner Provider (uses useSearchParams — requires Suspense boundary) */
/* ------------------------------------------------------------------ */

function HelpLandscaperProviderInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /** Resolve the current page from pathname + folder/tab query params. */
  const currentPage = useMemo(() => {
    const folder = searchParams?.get('folder') ?? null;
    const tab = searchParams?.get('tab') ?? null;
    return buildCurrentPage(pathname, folder, tab);
  }, [pathname, searchParams]);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<HelpMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const toggleHelp = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const closeHelp = useCallback(() => {
    setIsOpen(false);
  }, []);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: HelpMessage = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const propertyTypeContext = detectPropertyTypeFromPath();

      const response = await fetch(`${DJANGO_API_URL}/api/landscaper/help/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          conversation_id: conversationId,
          current_page: currentPage,
          property_type_context: propertyTypeContext,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.conversation_id) {
          setConversationId(data.conversation_id);
        }

        const assistantMessage: HelpMessage = {
          role: 'assistant',
          content: data.content,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const errorMessage: HelpMessage = {
          role: 'assistant',
          content: data.error || 'Something went wrong. Please try again.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch {
      const errorMessage: HelpMessage = {
        role: 'assistant',
        content: 'Unable to connect to the Help service. Please check that the backend server is running.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, currentPage, conversationId]);

  return (
    <HelpLandscaperContext.Provider
      value={{
        isOpen,
        messages,
        conversationId,
        isLoading,
        toggleHelp,
        sendMessage,
        clearConversation,
        closeHelp,
      }}
    >
      {children}
    </HelpLandscaperContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Exported Provider (wraps inner in Suspense for useSearchParams)    */
/* ------------------------------------------------------------------ */

export function HelpLandscaperProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <HelpLandscaperProviderInner>{children}</HelpLandscaperProviderInner>
    </Suspense>
  );
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export function useHelpLandscaper() {
  const context = useContext(HelpLandscaperContext);
  if (!context) {
    throw new Error('useHelpLandscaper must be used within HelpLandscaperProvider');
  }
  return context;
}
