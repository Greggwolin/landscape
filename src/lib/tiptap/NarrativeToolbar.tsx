'use client';

/**
 * NarrativeToolbar Component
 *
 * Extracted toolbar for the narrative editor that can be positioned
 * independently in a consolidated header layout.
 */

import React from 'react';
import { Editor } from '@tiptap/react';
import {
  CButton,
  CButtonGroup,
  CTooltip,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
  cilBold,
  cilItalic,
  cilTextStrike,
  cilList,
  cilListNumbered,
  cilActionUndo,
  cilActionRedo,
  cilCommentSquare,
} from '@coreui/icons';

export interface NarrativeToolbarProps {
  editor: Editor | null;
  trackChangesEnabled: boolean;
  readOnly: boolean;
  onInsertComment: () => void;
  /** Render mode: 'full' for standalone, 'compact' for consolidated header */
  mode?: 'full' | 'compact';
}

/**
 * Toolbar button component
 */
function ToolbarButton({
  icon,
  label,
  isActive = false,
  disabled = false,
  onClick,
}: {
  icon: string[];
  label: string;
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <CTooltip content={label} placement="top">
      <CButton
        color={isActive ? 'primary' : 'secondary'}
        variant={isActive ? undefined : 'ghost'}
        size="sm"
        disabled={disabled}
        onClick={onClick}
        className="narrative-toolbar-btn"
      >
        <CIcon icon={icon} size="sm" />
      </CButton>
    </CTooltip>
  );
}

/**
 * Formatting buttons group (B, I, S, lists, undo/redo)
 */
export function FormattingButtons({
  editor,
  disabled,
}: {
  editor: Editor | null;
  disabled: boolean;
}) {
  if (!editor) return null;

  return (
    <div className="d-flex align-items-center gap-1">
      {/* Text formatting */}
      <CButtonGroup size="sm">
        <ToolbarButton
          icon={cilBold}
          label="Bold (Cmd+B)"
          isActive={editor.isActive('bold')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          icon={cilItalic}
          label="Italic (Cmd+I)"
          isActive={editor.isActive('italic')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          icon={cilTextStrike}
          label="Strikethrough"
          isActive={editor.isActive('strike')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
      </CButtonGroup>

      {/* List formatting */}
      <CButtonGroup size="sm">
        <ToolbarButton
          icon={cilList}
          label="Bullet List"
          isActive={editor.isActive('bulletList')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          icon={cilListNumbered}
          label="Numbered List"
          isActive={editor.isActive('orderedList')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
      </CButtonGroup>

      {/* Undo/Redo */}
      <CButtonGroup size="sm">
        <ToolbarButton
          icon={cilActionUndo}
          label="Undo (Cmd+Z)"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        />
        <ToolbarButton
          icon={cilActionRedo}
          label="Redo (Cmd+Shift+Z)"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        />
      </CButtonGroup>
    </div>
  );
}

/**
 * Track changes and comment controls
 */
export function CommentControls({
  editor,
  onInsertComment,
  disabled = false,
}: {
  editor: Editor | null;
  onInsertComment: () => void;
  disabled?: boolean;
}) {
  if (!editor) return null;

  return (
    <div className="d-flex align-items-center gap-1">
      {/* Comment button */}
      <CTooltip content="Add Comment (Cmd+Shift+C)" placement="top">
        <CButton
          color="secondary"
          variant="ghost"
          size="sm"
          onClick={onInsertComment}
          disabled={disabled || editor.state.selection.empty}
        >
          <CIcon icon={cilCommentSquare} size="sm" className="me-1" />
          Comment
        </CButton>
      </CTooltip>
    </div>
  );
}

/**
 * Full standalone toolbar (original layout)
 */
export function NarrativeToolbar({
  editor,
  trackChangesEnabled,
  readOnly,
  onInsertComment,
  mode = 'full',
}: NarrativeToolbarProps) {
  if (!editor) return null;

  const formattingDisabled = readOnly && !trackChangesEnabled;

  if (mode === 'compact') {
    // Compact mode for consolidated header - returns individual sections
    return (
      <div className="d-flex align-items-center gap-2">
        <FormattingButtons editor={editor} disabled={formattingDisabled} />
        <div className="narrative-toolbar-divider" />
        <CommentControls
          editor={editor}
          disabled={readOnly}
          onInsertComment={onInsertComment}
        />
      </div>
    );
  }

  // Full mode - original standalone toolbar layout
  return (
    <div className="narrative-toolbar">
      <FormattingButtons editor={editor} disabled={formattingDisabled} />
      <div className="narrative-toolbar-divider" />
      <CommentControls
        editor={editor}
        disabled={readOnly}
        onInsertComment={onInsertComment}
      />
    </div>
  );
}

export default NarrativeToolbar;
