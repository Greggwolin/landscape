'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

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

/** Map pathname to a page context string for the backend. */
function detectCurrentPage(pathname: string | null): string | undefined {
  if (!pathname) return undefined;

  // Project-scoped pages: /projects/[id]?folder=X&tab=Y
  // We extract from the URL search params in the component, but here
  // we can detect the broad section from the path itself.
  const segments = pathname.split('/').filter(Boolean);

  // If inside a project workspace, the folder comes from query params
  // which we won't have here. Fall back to pathname segments.
  if (segments[0] === 'projects' && segments.length >= 2) {
    // Check for known sub-paths
    const sub = segments[2];
    if (sub) return sub;
    return 'home';
  }

  // Global pages
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
/* Provider                                                            */
/* ------------------------------------------------------------------ */

export function HelpLandscaperProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

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
      const currentPage = detectCurrentPage(pathname);
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
  }, [isLoading, pathname, conversationId]);

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
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export function useHelpLandscaper() {
  const context = useContext(HelpLandscaperContext);
  if (!context) {
    throw new Error('useHelpLandscaper must be used within HelpLandscaperProvider');
  }
  return context;
}
