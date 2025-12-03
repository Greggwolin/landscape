import { useEffect, useCallback, useRef } from 'react';

/**
 * useUnsavedChanges Hook
 *
 * Tracks whether a form has unsaved changes and provides
 * a confirmation dialog when attempting to close.
 *
 * @param hasChanges - Boolean indicating if there are unsaved changes
 * @param onClose - Callback to execute when close is confirmed
 * @returns handleClose function that checks for unsaved changes
 */
export function useUnsavedChanges(
  hasChanges: boolean,
  onClose: () => void
): () => void {
  const handleClose = useCallback(() => {
    if (hasChanges) {
      const confirmClose = window.confirm(
        'You have unsaved changes. Are you sure you want to close without saving?'
      );
      if (confirmClose) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [hasChanges, onClose]);

  return handleClose;
}

/**
 * useKeyboardShortcuts Hook
 *
 * Adds keyboard shortcuts for common modal actions:
 * - ESC: Close modal (with unsaved changes check)
 * - Cmd/Ctrl + Enter: Submit form
 *
 * @param handleClose - Function to call when ESC is pressed
 * @param handleSubmit - Optional function to call when Cmd/Ctrl+Enter is pressed
 */
export function useKeyboardShortcuts(
  handleClose: () => void,
  handleSubmit?: () => void
): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC to close
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }

      // Cmd/Ctrl + Enter to submit
      if (handleSubmit && (e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, handleSubmit]);
}
