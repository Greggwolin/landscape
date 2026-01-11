import { useCallback, useEffect } from 'react';

/**
 * Attach a keydown listener that invokes onClose when Escape is pressed.
 * Pass a boolean to enable/disable the listener (e.g., modal visibility).
 */
export function useCloseOnEscape(enabled: boolean, onClose: () => void) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!enabled) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}
