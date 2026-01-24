/**
 * TrackChanges Extension for TipTap
 *
 * Provides Word-style track changes functionality:
 * - Deletions appear as red strikethrough (text is preserved, not removed)
 * - Additions appear in blue
 * - Changes can be accepted (applied) or rejected (reverted)
 *
 * Track changes mode must be explicitly enabled via the `setTrackChangesEnabled` command.
 * When disabled, edits are applied directly without tracking.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
// Mark and MarkType available if needed for future type annotations

export interface TrackChangesOptions {
  /**
   * Whether track changes is enabled by default
   */
  enabled: boolean;
  /**
   * CSS class for additions
   */
  additionClass: string;
  /**
   * CSS class for deletions
   */
  deletionClass: string;
}

export interface TrackChangesStorage {
  enabled: boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    trackChanges: {
      /**
       * Enable or disable track changes mode
       */
      setTrackChangesEnabled: (enabled: boolean) => ReturnType;
      /**
       * Toggle track changes mode
       */
      toggleTrackChanges: () => ReturnType;
      /**
       * Accept all tracked changes (apply deletions, keep additions)
       */
      acceptAllChanges: () => ReturnType;
      /**
       * Reject all tracked changes (restore deletions, remove additions)
       */
      rejectAllChanges: () => ReturnType;
      /**
       * Mark selected text as an addition
       */
      markAsAddition: () => ReturnType;
      /**
       * Mark selected text as a deletion
       */
      markAsDeletion: () => ReturnType;
    };
  }
}

export const trackChangesPluginKey = new PluginKey('trackChanges');

export const TrackChanges = Extension.create<TrackChangesOptions, TrackChangesStorage>({
  name: 'trackChanges',

  addOptions() {
    return {
      enabled: false,
      additionClass: 'track-change-addition',
      deletionClass: 'track-change-deletion',
    };
  },

  addStorage() {
    return {
      enabled: this.options.enabled,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          'data-track-change': {
            default: null,
            parseHTML: element => element.getAttribute('data-track-change'),
            renderHTML: attributes => {
              if (!attributes['data-track-change']) {
                return {};
              }
              return {
                'data-track-change': attributes['data-track-change'],
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setTrackChangesEnabled:
        (enabled: boolean) =>
        ({ editor }) => {
          this.storage.enabled = enabled;
          // Trigger editor update to reflect state change
          editor.view.dispatch(editor.state.tr);
          return true;
        },

      toggleTrackChanges:
        () =>
        ({ commands }) => {
          return commands.setTrackChangesEnabled(!this.storage.enabled);
        },

      acceptAllChanges:
        () =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return false;

          const { doc } = state;
          let newTr = tr;
          let offset = 0;

          // Find and process all tracked changes
          doc.descendants((node, pos) => {
            if (node.isText) {
              const marks = node.marks;
              const trackMark = marks.find(
                m => m.type.name === 'textStyle' && m.attrs['data-track-change']
              );

              if (trackMark) {
                const changeType = trackMark.attrs['data-track-change'];
                const adjustedPos = pos + offset;

                if (changeType === 'deletion') {
                  // Remove deleted text
                  newTr = newTr.delete(adjustedPos, adjustedPos + node.nodeSize);
                  offset -= node.nodeSize;
                } else if (changeType === 'addition') {
                  // Remove the track change mark but keep the text
                  newTr = newTr.removeMark(adjustedPos, adjustedPos + node.nodeSize, trackMark.type);
                }
              }
            }
          });

          dispatch(newTr);
          return true;
        },

      rejectAllChanges:
        () =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return false;

          const { doc } = state;
          let newTr = tr;
          let offset = 0;

          // Find and process all tracked changes
          doc.descendants((node, pos) => {
            if (node.isText) {
              const marks = node.marks;
              const trackMark = marks.find(
                m => m.type.name === 'textStyle' && m.attrs['data-track-change']
              );

              if (trackMark) {
                const changeType = trackMark.attrs['data-track-change'];
                const adjustedPos = pos + offset;

                if (changeType === 'addition') {
                  // Remove added text
                  newTr = newTr.delete(adjustedPos, adjustedPos + node.nodeSize);
                  offset -= node.nodeSize;
                } else if (changeType === 'deletion') {
                  // Remove the track change mark but keep the text (restore it)
                  newTr = newTr.removeMark(adjustedPos, adjustedPos + node.nodeSize, trackMark.type);
                }
              }
            }
          });

          dispatch(newTr);
          return true;
        },

      markAsAddition:
        () =>
        ({ chain, state }) => {
          const { from, to } = state.selection;
          if (from === to) return false;

          return chain()
            .setMark('textStyle', { 'data-track-change': 'addition' })
            .run();
        },

      markAsDeletion:
        () =>
        ({ chain, state }) => {
          const { from, to } = state.selection;
          if (from === to) return false;

          return chain()
            .setMark('textStyle', { 'data-track-change': 'deletion' })
            .run();
        },
    };
  },

  addProseMirrorPlugins() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const extension = this;
    const isAdditionMark = (marks: { type: { name: string }; attrs: Record<string, unknown> }[]) =>
      marks.some(
        m =>
          m.type.name === 'textStyle' &&
          m.attrs['data-track-change'] === 'addition'
      );

    const isDeletionMark = (marks: { type: { name: string }; attrs: Record<string, unknown> }[]) =>
      marks.some(
        m =>
          m.type.name === 'textStyle' &&
          m.attrs['data-track-change'] === 'deletion'
      );

    const collectChangeRanges = (state: { doc: any }, from: number, to: number) => {
      const additionRanges: { from: number; to: number }[] = [];
      const baselineRanges: { from: number; to: number }[] = [];

      state.doc.nodesBetween(from, to, (node: any, pos: number) => {
        if (!node.isText) return;
        const start = Math.max(pos, from);
        const end = Math.min(pos + node.nodeSize, to);
        if (start >= end) return;

        if (isAdditionMark(node.marks)) {
          additionRanges.push({ from: start, to: end });
        } else {
          baselineRanges.push({ from: start, to: end });
        }
      });

      return {
        additionRanges,
        baselineRanges,
        allAdditions: baselineRanges.length === 0 && additionRanges.length > 0,
      };
    };

    return [
      new Plugin({
        key: trackChangesPluginKey,
        props: {
          // Add decorations for visual styling
          decorations(state) {
            const { doc } = state;
            const decorations: Decoration[] = [];

            doc.descendants((node, pos) => {
              if (node.isText) {
                const marks = node.marks;
                const trackMark = marks.find(
                  m => m.type.name === 'textStyle' && m.attrs['data-track-change']
                );

                if (trackMark) {
                  const changeType = trackMark.attrs['data-track-change'];
                  const className =
                    changeType === 'deletion'
                      ? extension.options.deletionClass
                      : extension.options.additionClass;

                  decorations.push(
                    Decoration.inline(pos, pos + node.nodeSize, {
                      class: className,
                    })
                  );
                }
              }
            });

            return DecorationSet.create(doc, decorations);
          },

          // Handle keyboard events when track changes is enabled
          handleKeyDown(view, event) {
            if (!extension.storage.enabled) return false;

            // Handle backspace/delete - mark as deletion instead of removing
            if (event.key === 'Backspace' || event.key === 'Delete') {
              const { state, dispatch } = view;
              const { selection, doc } = state;
              const { from, to, empty } = selection;
              const textStyleType = state.schema.marks.textStyle;

              if (!textStyleType) return false;
              const deletionMark = textStyleType.create({ 'data-track-change': 'deletion' });

              // If there's a selection, mark it as deletion
              if (!empty) {
                const { additionRanges, baselineRanges, allAdditions } = collectChangeRanges(state, from, to);

                if (allAdditions) {
                  return false;
                }

                const tr = state.tr;
                additionRanges
                  .sort((a, b) => b.from - a.from)
                  .forEach(range => {
                    tr.delete(range.from, range.to);
                  });

                baselineRanges.forEach(range => {
                  const mappedFrom = tr.mapping.map(range.from);
                  const mappedTo = tr.mapping.map(range.to);
                  if (mappedFrom < mappedTo) {
                    tr.addMark(mappedFrom, mappedTo, deletionMark);
                  }
                });

                dispatch(tr);
                return true;
              }

              // Handle single character deletion
              if (empty) {
                let targetPos: number;
                let targetEnd: number;

                if (event.key === 'Backspace' && from > 0) {
                  targetPos = from - 1;
                  targetEnd = from;
                } else if (event.key === 'Delete' && to < doc.content.size) {
                  targetPos = from;
                  targetEnd = from + 1;
                } else {
                  return false;
                }

                const resolved = state.doc.resolve(targetPos);
                const targetNode = event.key === 'Backspace' ? resolved.nodeBefore : resolved.nodeAfter;

                if (!targetNode || !targetNode.isText) return false;
                if (isAdditionMark(targetNode.marks)) {
                  return false;
                }

                if (isDeletionMark(targetNode.marks)) {
                  return true;
                }

                const tr = state.tr;
                tr.addMark(targetPos, targetEnd, deletionMark);
                if (event.key === 'Backspace') {
                  tr.setSelection(state.selection.constructor.near(tr.doc.resolve(targetPos)));
                }
                dispatch(tr);
                return true;
              }
            }

            return false;
          },

          // Handle text input when track changes is enabled
          handleTextInput(view, from, to, text) {
            if (!extension.storage.enabled) return false;

            const { state, dispatch } = view;
            const tr = state.tr;
            const textStyleType = state.schema.marks.textStyle;

            if (!textStyleType) return false;
            const deletionMark = textStyleType.create({ 'data-track-change': 'deletion' });
            const additionMark = textStyleType.create({ 'data-track-change': 'addition' });

            // If replacing text, mark old text as deletion first
            if (from !== to) {
              const { additionRanges, baselineRanges, allAdditions } = collectChangeRanges(state, from, to);
              if (allAdditions) {
                tr.delete(from, to);
                tr.insertText(text, from);
                tr.addMark(from, from + text.length, additionMark);
                dispatch(tr);
                return true;
              }

              additionRanges
                .sort((a, b) => b.from - a.from)
                .forEach(range => {
                  tr.delete(range.from, range.to);
                });

              baselineRanges.forEach(range => {
                const mappedFrom = tr.mapping.map(range.from);
                const mappedTo = tr.mapping.map(range.to);
                if (mappedFrom < mappedTo) {
                  tr.addMark(mappedFrom, mappedTo, deletionMark);
                }
              });

              const insertPos = tr.mapping.map(to);
              tr.insertText(text, insertPos);
              tr.addMark(insertPos, insertPos + text.length, additionMark);
              dispatch(tr);
              return true;
            }

            // Insert new text with addition mark
            tr.insertText(text, to);
            tr.addMark(to, to + text.length, additionMark);

            dispatch(tr);
            return true;
          },
        },
      }),
    ];
  },
});

export default TrackChanges;
