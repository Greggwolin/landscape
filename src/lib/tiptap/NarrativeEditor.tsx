'use client';

/**
 * NarrativeEditor Component
 *
 * TipTap rich text editor wrapper with:
 * - Track changes support (Word-style redlining)
 * - Inline comments for questions/feedback
 * - Version history integration
 * - Toolbar for formatting and track changes controls
 *
 * Supports forwardRef to expose editor instance for external toolbar control.
 */

import React, { useCallback, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import { Color } from '@tiptap/extension-color';
import { CButton, CBadge } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCheckAlt } from '@coreui/icons';

import { TrackChanges } from './extensions/TrackChanges';
import { InlineComment } from './extensions/InlineComment';
import { NarrativeToolbar } from './NarrativeToolbar';

export interface NarrativeEditorProps {
  /** Initial content (TipTap JSON or HTML string) */
  content?: string | object;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Whether track changes mode is enabled */
  trackChangesEnabled?: boolean;
  /** Callback when content changes */
  onContentChange?: (content: object, html: string, plainText: string) => void;
  /** Callback when track changes mode changes */
  onTrackChangesToggle?: (enabled: boolean) => void;
  /** Callback when a comment is added */
  onCommentAdd?: (comment: { id: string; text: string; position: { from: number; to: number } }) => void;
  /** Callback when user clicks "Save & Send for Review" */
  onSaveAndSend?: (content: object) => void;
  /** Whether there are unsaved changes */
  hasUnsavedChanges?: boolean;
  /** Placeholder text when editor is empty */
  placeholder?: string;
  /** CSS class for the editor container */
  className?: string;
  /** Minimum height of the editor */
  minHeight?: string;
  /** Whether to show the internal toolbar (set false when using external toolbar) */
  showToolbar?: boolean;
}

/**
 * Ref interface for external access to editor controls
 */
export interface NarrativeEditorRef {
  /** The TipTap editor instance */
  editor: Editor | null;
  /** Current track changes state */
  trackChangesEnabled: boolean;
  /** Current comments visibility state */
  commentsVisible: boolean;
  /** Toggle track changes mode */
  toggleTrackChanges: () => void;
  /** Toggle comments visibility */
  toggleComments: () => void;
  /** Insert a comment at current selection */
  insertComment: () => void;
  /** Accept all tracked changes */
  acceptAllChanges: () => void;
  /** Reject all tracked changes */
  rejectAllChanges: () => void;
  /** Save and send for review */
  saveAndSend: () => void;
}

/**
 * Main NarrativeEditor component with forwardRef support
 */
export const NarrativeEditor = forwardRef<NarrativeEditorRef, NarrativeEditorProps>(function NarrativeEditor({
  content,
  readOnly = false,
  trackChangesEnabled: initialTrackChanges = false,
  onContentChange,
  onTrackChangesToggle,
  onCommentAdd,
  onSaveAndSend,
  hasUnsavedChanges = false,
  placeholder = 'Start writing your narrative...',
  className = '',
  minHeight = '400px',
  showToolbar = true,
}, ref) {
  const [trackChangesEnabled, setTrackChangesEnabled] = useState(initialTrackChanges);
  const [commentsVisible, setCommentsVisible] = useState(true);

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable built-in history if we want custom undo/redo with track changes
        // For now, keep default history
      }),
      Underline,
      TextStyle,
      Highlight.configure({
        multicolor: true,
      }),
      Color,
      TrackChanges.configure({
        enabled: initialTrackChanges,
        additionClass: 'track-change-addition',
        deletionClass: 'track-change-deletion',
      }),
      InlineComment.configure({
        onCommentClick: (commentId, attrs) => {
          const updated = prompt('Edit comment:', attrs.text);
          if (updated !== null && updated.trim().length > 0) {
            editor?.commands.updateComment(commentId, {
              text: updated.trim(),
              isQuestion: updated.trim().endsWith('?'),
            });
          }
        },
      }),
    ],
    content: typeof content === 'string' ? content : content || '',
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'narrative-editor-content',
        style: `min-height: ${minHeight}`,
      },
    },
    onUpdate: ({ editor }) => {
      if (onContentChange) {
        const json = editor.getJSON();
        const html = editor.getHTML();
        const text = editor.getText();
        onContentChange(json, html, text);
      }
    },
    // Disable immediate rendering for SSR compatibility
    immediatelyRender: false,
  });

  // Sync track changes state with editor
  useEffect(() => {
    if (editor) {
      editor.commands.setTrackChangesEnabled(trackChangesEnabled);
      // Update editability based on track changes mode
      editor.setEditable(!readOnly);
    }
  }, [editor, trackChangesEnabled, readOnly]);

  // Sync comments visibility
  useEffect(() => {
    if (editor) {
      editor.commands.toggleCommentVisibility(commentsVisible);
    }
  }, [editor, commentsVisible]);

  // Handle track changes toggle
  const handleToggleTrackChanges = useCallback(() => {
    const newState = !trackChangesEnabled;
    setTrackChangesEnabled(newState);
    onTrackChangesToggle?.(newState);
  }, [trackChangesEnabled, onTrackChangesToggle]);

  // Handle comment insertion
  const handleInsertComment = useCallback(() => {
    if (!editor) return;

    const text = prompt('Enter your comment or question:');
    if (text) {
      const { from, to } = editor.state.selection;
      editor.commands.insertComment(text);

      // Get the comment ID from the newly inserted node
      const commentId = `comment-${Date.now()}`;
      onCommentAdd?.({
        id: commentId,
        text,
        position: { from, to },
      });
    }
  }, [editor, onCommentAdd]);

  // Handle accept all changes
  const handleAcceptAllChanges = useCallback(() => {
    if (editor) {
      editor.commands.acceptAllChanges();
    }
  }, [editor]);

  // Handle reject all changes
  const handleRejectAllChanges = useCallback(() => {
    if (editor) {
      editor.commands.rejectAllChanges();
    }
  }, [editor]);

  // Handle toggle comments visibility
  const handleToggleComments = useCallback(() => {
    setCommentsVisible((prev) => !prev);
  }, []);

  // Handle save and send
  const handleSaveAndSend = useCallback(() => {
    if (editor && onSaveAndSend) {
      const content = editor.getJSON();
      onSaveAndSend(content);
    }
  }, [editor, onSaveAndSend]);

  // Expose editor controls via ref for external toolbar usage
  useImperativeHandle(ref, () => ({
    editor,
    trackChangesEnabled,
    commentsVisible,
    toggleTrackChanges: handleToggleTrackChanges,
    toggleComments: handleToggleComments,
    insertComment: handleInsertComment,
    acceptAllChanges: handleAcceptAllChanges,
    rejectAllChanges: handleRejectAllChanges,
    saveAndSend: handleSaveAndSend,
  }), [
    editor,
    trackChangesEnabled,
    commentsVisible,
    handleToggleTrackChanges,
    handleToggleComments,
    handleInsertComment,
    handleAcceptAllChanges,
    handleRejectAllChanges,
    handleSaveAndSend,
  ]);

  return (
    <div className={`narrative-editor-container ${readOnly ? 'read-only' : ''} ${className}`}>
      {/* Internal Toolbar - only shown when showToolbar is true */}
      {showToolbar && (
        <NarrativeToolbar
          editor={editor}
          trackChangesEnabled={trackChangesEnabled}
          readOnly={readOnly}
          onInsertComment={handleInsertComment}
          mode="full"
        />
      )}

      {/* Editor content */}
      <div className="narrative-editor-wrapper">
        <EditorContent editor={editor} />
      </div>

      {/* Footer with save button - only when toolbar is hidden and onSaveAndSend provided */}
      {!showToolbar && onSaveAndSend && (
        <div className="narrative-editor-footer">
          <div className="narrative-editor-status">
            {hasUnsavedChanges && (
              <CBadge color="warning" className="me-2">
                Unsaved changes
              </CBadge>
            )}
            {trackChangesEnabled && (
              <CBadge color="info">Track changes on</CBadge>
            )}
          </div>
          <CButton
            color="primary"
            size="sm"
            onClick={handleSaveAndSend}
            disabled={!hasUnsavedChanges}
          >
            <CIcon icon={cilCheckAlt} size="sm" className="me-1" />
            Save &amp; Send for Review
          </CButton>
        </div>
      )}
    </div>
  );
})

export default NarrativeEditor;

// Re-export toolbar for external use
export { NarrativeToolbar } from './NarrativeToolbar';
