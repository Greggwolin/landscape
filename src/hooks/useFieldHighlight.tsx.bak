/**
 * useFieldHighlight Hook
 *
 * Reads the ?highlight= query parameter and provides utilities
 * for highlighting specific fields on a page.
 *
 * Usage:
 *   const { highlightFields, isHighlighted, clearHighlights } = useFieldHighlight();
 *
 *   // Check if a specific field should be highlighted
 *   const className = isHighlighted('rent_amount') ? 'ring-2 ring-yellow-400' : '';
 *
 *   // Get the list of fields to highlight
 *   console.log(highlightFields); // ['rent_amount', 'lease_start']
 */

'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useMemo, useCallback, useEffect, useState } from 'react';

interface UseFieldHighlightReturn {
  /** Array of field names that should be highlighted */
  highlightFields: string[];
  /** Check if a specific field should be highlighted */
  isHighlighted: (fieldName: string) => boolean;
  /** Clear all highlights (removes query param) */
  clearHighlights: () => void;
  /** Add a highlight class string if the field is highlighted */
  getHighlightClass: (fieldName: string, highlightClass?: string) => string;
  /** Get inline styles for highlighting */
  getHighlightStyle: (fieldName: string) => React.CSSProperties | undefined;
}

const DEFAULT_HIGHLIGHT_CLASS = 'ring-2 ring-yellow-400 ring-offset-2 animate-pulse';

export function useFieldHighlight(): UseFieldHighlightReturn {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [hasCleared, setHasCleared] = useState(false);

  // Parse the highlight query parameter
  const highlightFields = useMemo(() => {
    const param = searchParams.get('highlight');
    if (!param) return [];
    return param.split(',').map((f) => f.trim()).filter(Boolean);
  }, [searchParams]);

  // Check if a specific field is highlighted
  const isHighlighted = useCallback(
    (fieldName: string) => {
      if (hasCleared) return false;
      return highlightFields.includes(fieldName);
    },
    [highlightFields, hasCleared]
  );

  // Clear highlights by removing the query param
  const clearHighlights = useCallback(() => {
    setHasCleared(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('highlight');
    const newUrl = params.toString() ? `${pathname}?${params}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [searchParams, pathname, router]);

  // Auto-clear highlights after 5 seconds
  useEffect(() => {
    if (highlightFields.length > 0 && !hasCleared) {
      const timer = setTimeout(() => {
        clearHighlights();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [highlightFields, hasCleared, clearHighlights]);

  // Get highlight class for a field
  const getHighlightClass = useCallback(
    (fieldName: string, highlightClass: string = DEFAULT_HIGHLIGHT_CLASS) => {
      return isHighlighted(fieldName) ? highlightClass : '';
    },
    [isHighlighted]
  );

  // Get highlight inline styles for a field
  const getHighlightStyle = useCallback(
    (fieldName: string): React.CSSProperties | undefined => {
      if (!isHighlighted(fieldName)) return undefined;
      return {
        boxShadow: '0 0 0 2px rgba(234, 179, 8, 0.6)',
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      };
    },
    [isHighlighted]
  );

  return {
    highlightFields,
    isHighlighted,
    clearHighlights,
    getHighlightClass,
    getHighlightStyle,
  };
}

/**
 * HighlightWrapper Component
 *
 * Wraps a component and applies highlighting if the field is in the highlight list.
 *
 * Usage:
 *   <HighlightWrapper fieldName="rent_amount">
 *     <Input value={rentAmount} />
 *   </HighlightWrapper>
 */
interface HighlightWrapperProps {
  fieldName: string;
  children: React.ReactNode;
  className?: string;
}

export function HighlightWrapper({ fieldName, children, className = '' }: HighlightWrapperProps) {
  const { getHighlightClass } = useFieldHighlight();
  const highlightClass = getHighlightClass(fieldName);

  return (
    <div className={`${className} ${highlightClass}`.trim()}>
      {children}
    </div>
  );
}
