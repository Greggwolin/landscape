/**
 * useGridKeyboard Hook
 * Provides keyboard navigation for ARGUS-style data grids
 * Reference: docs/standards/LANDSCAPE_GRID_STANDARD.md
 */

import { useCallback, useRef, useState } from 'react';

export interface GridCell {
  row: number;
  col: number;
}

interface UseGridKeyboardOptions {
  rowCount: number;
  columnCount: number;
  editableColumns?: number[]; // Indices of editable columns
  onCellFocus?: (cell: GridCell) => void;
  onEnterEdit?: (cell: GridCell) => void;
  onExitEdit?: (committed: boolean) => void;
  onCellChange?: (cell: GridCell, direction: 'up' | 'down' | 'left' | 'right') => void;
  isEditing?: boolean;
  disabled?: boolean;
}

interface UseGridKeyboardReturn {
  focusedCell: GridCell;
  setFocusedCell: (cell: GridCell) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleCellClick: (row: number, col: number) => void;
  isKeyboardMode: boolean;
}

export function useGridKeyboard({
  rowCount,
  columnCount,
  editableColumns,
  onCellFocus,
  onEnterEdit,
  onExitEdit,
  onCellChange,
  isEditing = false,
  disabled = false,
}: UseGridKeyboardOptions): UseGridKeyboardReturn {
  const [focusedCell, setFocusedCellState] = useState<GridCell>({ row: 0, col: 0 });
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);
  const lastInteractionRef = useRef<'keyboard' | 'mouse'>('mouse');

  const setFocusedCell = useCallback((cell: GridCell) => {
    const clampedCell = {
      row: Math.max(0, Math.min(cell.row, rowCount - 1)),
      col: Math.max(0, Math.min(cell.col, columnCount - 1)),
    };
    setFocusedCellState(clampedCell);
    onCellFocus?.(clampedCell);
  }, [rowCount, columnCount, onCellFocus]);

  const findNextEditableColumn = useCallback((
    currentCol: number,
    direction: 'forward' | 'backward'
  ): number => {
    if (!editableColumns || editableColumns.length === 0) {
      // If no editable columns specified, all columns are navigable
      if (direction === 'forward') {
        return currentCol < columnCount - 1 ? currentCol + 1 : currentCol;
      } else {
        return currentCol > 0 ? currentCol - 1 : currentCol;
      }
    }

    const sortedEditable = [...editableColumns].sort((a, b) => a - b);

    if (direction === 'forward') {
      const next = sortedEditable.find(col => col > currentCol);
      return next !== undefined ? next : currentCol;
    } else {
      const prev = [...sortedEditable].reverse().find(col => col < currentCol);
      return prev !== undefined ? prev : currentCol;
    }
  }, [editableColumns, columnCount]);

  const moveToNextEditableCell = useCallback((
    currentRow: number,
    currentCol: number,
    direction: 'forward' | 'backward'
  ): GridCell => {
    if (!editableColumns || editableColumns.length === 0) {
      // Simple navigation without editable column restrictions
      if (direction === 'forward') {
        if (currentCol < columnCount - 1) {
          return { row: currentRow, col: currentCol + 1 };
        } else if (currentRow < rowCount - 1) {
          return { row: currentRow + 1, col: 0 };
        }
      } else {
        if (currentCol > 0) {
          return { row: currentRow, col: currentCol - 1 };
        } else if (currentRow > 0) {
          return { row: currentRow - 1, col: columnCount - 1 };
        }
      }
      return { row: currentRow, col: currentCol };
    }

    const sortedEditable = [...editableColumns].sort((a, b) => a - b);

    if (direction === 'forward') {
      // Find next editable column in current row
      const nextCol = sortedEditable.find(col => col > currentCol);
      if (nextCol !== undefined) {
        return { row: currentRow, col: nextCol };
      }
      // Move to first editable column of next row
      if (currentRow < rowCount - 1) {
        return { row: currentRow + 1, col: sortedEditable[0] };
      }
    } else {
      // Find previous editable column in current row
      const prevCol = [...sortedEditable].reverse().find(col => col < currentCol);
      if (prevCol !== undefined) {
        return { row: currentRow, col: prevCol };
      }
      // Move to last editable column of previous row
      if (currentRow > 0) {
        return { row: currentRow - 1, col: sortedEditable[sortedEditable.length - 1] };
      }
    }

    return { row: currentRow, col: currentCol };
  }, [editableColumns, columnCount, rowCount]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;

    // Set keyboard mode on any key press
    if (!isKeyboardMode) {
      setIsKeyboardMode(true);
    }
    lastInteractionRef.current = 'keyboard';

    const { row, col } = focusedCell;

    // If editing, only handle specific keys
    if (isEditing) {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onExitEdit?.(false);
          break;

        case 'Enter':
          if (!e.shiftKey) {
            e.preventDefault();
            onExitEdit?.(true);
            // Move down after commit
            if (row < rowCount - 1) {
              const newCell = { row: row + 1, col };
              setFocusedCell(newCell);
              onCellChange?.(newCell, 'down');
            }
          }
          break;

        case 'Tab':
          e.preventDefault();
          onExitEdit?.(true);
          // Move to next/previous editable cell
          const nextCell = moveToNextEditableCell(row, col, e.shiftKey ? 'backward' : 'forward');
          setFocusedCell(nextCell);
          onCellChange?.(nextCell, e.shiftKey ? 'left' : 'right');
          break;
      }
      return;
    }

    // Navigation when not editing
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (row > 0) {
          const newCell = { row: row - 1, col };
          setFocusedCell(newCell);
          onCellChange?.(newCell, 'up');
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (row < rowCount - 1) {
          const newCell = { row: row + 1, col };
          setFocusedCell(newCell);
          onCellChange?.(newCell, 'down');
        }
        break;

      case 'ArrowLeft':
        e.preventDefault();
        if (col > 0) {
          const newCell = { row, col: col - 1 };
          setFocusedCell(newCell);
          onCellChange?.(newCell, 'left');
        }
        break;

      case 'ArrowRight':
        e.preventDefault();
        if (col < columnCount - 1) {
          const newCell = { row, col: col + 1 };
          setFocusedCell(newCell);
          onCellChange?.(newCell, 'right');
        }
        break;

      case 'Tab':
        e.preventDefault();
        const tabCell = moveToNextEditableCell(row, col, e.shiftKey ? 'backward' : 'forward');
        setFocusedCell(tabCell);
        onCellChange?.(tabCell, e.shiftKey ? 'left' : 'right');
        break;

      case 'Enter':
      case 'F2':
        e.preventDefault();
        onEnterEdit?.({ row, col });
        break;

      case 'Home':
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
          // Go to first cell in grid
          const homeCell = { row: 0, col: 0 };
          setFocusedCell(homeCell);
        } else {
          // Go to first cell in row
          const homeCell = { row, col: 0 };
          setFocusedCell(homeCell);
        }
        break;

      case 'End':
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
          // Go to last cell in grid
          const endCell = { row: rowCount - 1, col: columnCount - 1 };
          setFocusedCell(endCell);
        } else {
          // Go to last cell in row
          const endCell = { row, col: columnCount - 1 };
          setFocusedCell(endCell);
        }
        break;

      case 'PageUp':
        e.preventDefault();
        // Move up ~10 rows or to top
        const pageUpRow = Math.max(0, row - 10);
        setFocusedCell({ row: pageUpRow, col });
        break;

      case 'PageDown':
        e.preventDefault();
        // Move down ~10 rows or to bottom
        const pageDownRow = Math.min(rowCount - 1, row + 10);
        setFocusedCell({ row: pageDownRow, col });
        break;

      case ' ': // Space
        // If cell is a dropdown or checkbox, trigger it
        e.preventDefault();
        onEnterEdit?.({ row, col });
        break;

      default:
        // For alphanumeric keys, enter edit mode and type
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          onEnterEdit?.({ row, col });
          // Don't prevent default - let the character be typed
        }
        break;
    }
  }, [
    disabled,
    isKeyboardMode,
    focusedCell,
    isEditing,
    rowCount,
    columnCount,
    setFocusedCell,
    onEnterEdit,
    onExitEdit,
    onCellChange,
    moveToNextEditableCell,
  ]);

  const handleCellClick = useCallback((row: number, col: number) => {
    lastInteractionRef.current = 'mouse';
    setIsKeyboardMode(false);
    setFocusedCell({ row, col });
  }, [setFocusedCell]);

  return {
    focusedCell,
    setFocusedCell,
    handleKeyDown,
    handleCellClick,
    isKeyboardMode,
  };
}

export default useGridKeyboard;
