/**
 * useResizablePanel Hook
 *
 * Manages resizable panel state with:
 * - Drag-based resizing via pointer events
 * - Auto-collapse when below minimum threshold
 * - LocalStorage persistence for width and collapsed state
 * - Min/max width constraints
 *
 * @version 1.0
 * @created 2026-01-28
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'landscape-studio-layout';

interface LayoutState {
  landscaperWidth: number;
  isCollapsed: boolean;
}

interface UseResizablePanelOptions {
  defaultWidth?: number;
  minWidth?: number;
  maxWidthPercent?: number;
  collapseThreshold?: number;
  collapsedWidth?: number;
}

interface UseResizablePanelReturn {
  width: number;
  isCollapsed: boolean;
  isResizing: boolean;
  toggleCollapsed: () => void;
  handleResizeStart: (e: React.PointerEvent) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useResizablePanel(
  options: UseResizablePanelOptions = {}
): UseResizablePanelReturn {
  const {
    defaultWidth = 320,
    minWidth = 280,
    maxWidthPercent = 50,
    collapseThreshold = 100,
    collapsedWidth = 56,
  } = options;

  const [width, setWidth] = useState(defaultWidth);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [previousWidth, setPreviousWidth] = useState(defaultWidth);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const widthRef = useRef(width);
  const previousWidthRef = useRef(previousWidth);

  // Keep refs in sync
  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  useEffect(() => {
    previousWidthRef.current = previousWidth;
  }, [previousWidth]);

  // Restore state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: LayoutState = JSON.parse(saved);
        if (typeof parsed.landscaperWidth === 'number' && parsed.landscaperWidth > 0) {
          setWidth(parsed.landscaperWidth);
          setPreviousWidth(parsed.landscaperWidth);
        }
        if (typeof parsed.isCollapsed === 'boolean') {
          setIsCollapsed(parsed.isCollapsed);
        }
      }
    } catch (e) {
      console.warn('Failed to restore layout state:', e);
    }
  }, []);

  // Save state to localStorage when it changes
  const saveState = useCallback((newWidth: number, newCollapsed: boolean) => {
    try {
      const state: LayoutState = {
        landscaperWidth: newWidth,
        isCollapsed: newCollapsed,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save layout state:', e);
    }
  }, []);

  // Toggle collapsed state
  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const newCollapsed = !prev;
      if (newCollapsed) {
        // Collapsing: save current width for later restore
        setPreviousWidth(widthRef.current);
        saveState(widthRef.current, true);
      } else {
        // Expanding: restore previous width
        setWidth(previousWidthRef.current);
        saveState(previousWidthRef.current, false);
      }
      return newCollapsed;
    });
  }, [saveState]);

  // Calculate max width based on container
  const getMaxWidth = useCallback(() => {
    if (containerRef.current) {
      return Math.floor(containerRef.current.clientWidth * (maxWidthPercent / 100));
    }
    return 600; // Fallback
  }, [maxWidthPercent]);

  // Clamp width to valid range
  const clampWidth = useCallback(
    (w: number) => {
      const maxW = getMaxWidth();
      return Math.min(Math.max(w, minWidth), maxW);
    },
    [minWidth, getMaxWidth]
  );

  // Handle resize start
  const handleResizeStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  // Handle resize move and end via document events
  useEffect(() => {
    if (!isResizing) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;

      // Check for auto-collapse
      if (newWidth < collapseThreshold) {
        // Don't update width during drag below threshold - let user release to collapse
        return;
      }

      const clampedWidth = clampWidth(newWidth);
      setWidth(clampedWidth);
    };

    const handlePointerUp = (e: PointerEvent) => {
      setIsResizing(false);

      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const finalWidth = e.clientX - containerRect.left;

      // Auto-collapse if below threshold
      if (finalWidth < collapseThreshold) {
        setPreviousWidth(widthRef.current);
        setIsCollapsed(true);
        saveState(widthRef.current, true);
      } else {
        // Save the final width
        const clampedWidth = clampWidth(finalWidth);
        setWidth(clampedWidth);
        saveState(clampedWidth, false);
      }
    };

    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isResizing, collapseThreshold, clampWidth, saveState]);

  return {
    width: isCollapsed ? collapsedWidth : width,
    isCollapsed,
    isResizing,
    toggleCollapsed,
    handleResizeStart,
    containerRef,
  };
}
