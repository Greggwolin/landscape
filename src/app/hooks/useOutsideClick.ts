import { useEffect, type RefObject } from 'react';

/**
 * useOutsideClick Hook
 *
 * Detects clicks outside of a referenced element and triggers a handler function.
 * Useful for closing dropdowns, modals, or menus when clicking outside.
 *
 * @param ref - React ref object pointing to the element to monitor
 * @param handler - Callback function to execute when clicking outside
 *
 * @example
 * const dropdownRef = useRef<HTMLDivElement>(null);
 * useOutsideClick(dropdownRef, () => setIsOpen(false));
 */
export function useOutsideClick(ref: RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      // Do nothing if clicking ref's element or descendent elements
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };

    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}
