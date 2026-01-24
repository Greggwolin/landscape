/**
 * InlineComment Extension for TipTap
 *
 * Allows users to insert inline comments/questions within the narrative.
 * Comments are displayed with a highlight background and can be:
 * - Shown or hidden via toggle
 * - Resolved (with optional response from Landscaper)
 * - Questions (ending with ?) are flagged for Landscaper to answer
 *
 * Comments are stored as custom nodes that can be serialized to JSON.
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { NodeView } from '@tiptap/pm/view';

export interface CommentAttributes {
  id: string;
  text: string;
  isQuestion: boolean;
  isResolved: boolean;
  response?: string;
  createdAt: string;
  createdBy?: string;
}

export interface InlineCommentOptions {
  /**
   * Whether comments are visible by default
   */
  showComments: boolean;
  /**
   * CSS class for comment wrapper
   */
  commentClass: string;
  /**
   * CSS class for resolved comments
   */
  resolvedClass: string;
  /**
   * CSS class for questions
   */
  questionClass: string;
  /**
   * CSS class for hidden comments
   */
  hiddenClass: string;
  /**
   * Callback when a comment is clicked
   */
  onCommentClick?: (id: string, attrs: CommentAttributes) => void;
}

export interface InlineCommentStorage {
  showComments: boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    inlineComment: {
      /**
       * Insert a new comment at the current cursor position
       */
      insertComment: (text: string) => ReturnType;
      /**
       * Update an existing comment
       */
      updateComment: (id: string, attrs: Partial<CommentAttributes>) => ReturnType;
      /**
       * Remove a comment by ID
       */
      removeComment: (id: string) => ReturnType;
      /**
       * Resolve a comment
       */
      resolveComment: (id: string, response?: string) => ReturnType;
      /**
       * Unresolve a comment
       */
      unresolveComment: (id: string) => ReturnType;
      /**
       * Toggle comment visibility
       */
      toggleCommentVisibility: () => ReturnType;
      /**
       * Set comment visibility
       */
      setCommentVisibility: (visible: boolean) => ReturnType;
    };
  }
}

/**
 * Generate a unique ID for comments
 */
function generateCommentId(): string {
  return `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const inlineCommentPluginKey = new PluginKey('inlineComment');

export const InlineComment = Node.create<InlineCommentOptions, InlineCommentStorage>({
  name: 'inlineComment',

  group: 'inline',

  inline: true,

  atom: true,

  addOptions() {
    return {
      showComments: true,
      commentClass: 'inline-comment',
      resolvedClass: 'inline-comment-resolved',
      questionClass: 'inline-comment-question',
      hiddenClass: 'inline-comment-hidden',
      onCommentClick: undefined,
    };
  },

  addStorage() {
    return {
      showComments: this.options.showComments,
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-comment-id'),
        renderHTML: attributes => ({
          'data-comment-id': attributes.id,
        }),
      },
      text: {
        default: '',
        parseHTML: element => element.getAttribute('data-comment-text') || element.textContent?.replace(/^\[|\]$/g, '') || '',
        renderHTML: attributes => ({
          'data-comment-text': attributes.text,
        }),
      },
      isQuestion: {
        default: false,
        parseHTML: element => element.getAttribute('data-is-question') === 'true',
        renderHTML: attributes => ({
          'data-is-question': attributes.isQuestion ? 'true' : 'false',
        }),
      },
      isResolved: {
        default: false,
        parseHTML: element => element.getAttribute('data-is-resolved') === 'true',
        renderHTML: attributes => ({
          'data-is-resolved': attributes.isResolved ? 'true' : 'false',
        }),
      },
      response: {
        default: null,
        parseHTML: element => element.getAttribute('data-response'),
        renderHTML: attributes => attributes.response ? ({
          'data-response': attributes.response,
        }) : {},
      },
      createdAt: {
        default: () => new Date().toISOString(),
        parseHTML: element => element.getAttribute('data-created-at'),
        renderHTML: attributes => ({
          'data-created-at': attributes.createdAt,
        }),
      },
      createdBy: {
        default: null,
        parseHTML: element => element.getAttribute('data-created-by'),
        renderHTML: attributes => attributes.createdBy ? ({
          'data-created-by': attributes.createdBy,
        }) : {},
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-comment-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const attrs = node.attrs as CommentAttributes;
    const classes = [this.options.commentClass];

    if (attrs.isResolved) {
      classes.push(this.options.resolvedClass);
    }
    if (attrs.isQuestion) {
      classes.push(this.options.questionClass);
    }
    if (!this.storage.showComments) {
      classes.push(this.options.hiddenClass);
    }

    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: classes.join(' '),
        title: attrs.isResolved && attrs.response ? `Response: ${attrs.response}` : undefined,
      }),
      `[${attrs.text}]`,
    ];
  },

  addCommands() {
    return {
      insertComment:
        (text: string) =>
        ({ chain, state }) => {
          const id = generateCommentId();
          const isQuestion = text.trim().endsWith('?');

          return chain()
            .insertContent({
              type: this.name,
              attrs: {
                id,
                text,
                isQuestion,
                isResolved: false,
                createdAt: new Date().toISOString(),
              },
            })
            .run();
        },

      updateComment:
        (id: string, attrs: Partial<CommentAttributes>) =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return false;

          let found = false;
          state.doc.descendants((node, pos) => {
            if (node.type.name === this.name && node.attrs.id === id) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                ...attrs,
              });
              found = true;
              return false; // Stop iteration
            }
          });

          if (found) {
            dispatch(tr);
          }
          return found;
        },

      removeComment:
        (id: string) =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return false;

          let found = false;
          let posToDelete: number | null = null;
          let sizeToDelete = 0;

          state.doc.descendants((node, pos) => {
            if (node.type.name === this.name && node.attrs.id === id) {
              posToDelete = pos;
              sizeToDelete = node.nodeSize;
              found = true;
              return false;
            }
          });

          if (found && posToDelete !== null) {
            tr.delete(posToDelete, posToDelete + sizeToDelete);
            dispatch(tr);
          }
          return found;
        },

      resolveComment:
        (id: string, response?: string) =>
        ({ commands }) => {
          return commands.updateComment(id, {
            isResolved: true,
            response,
          });
        },

      unresolveComment:
        (id: string) =>
        ({ commands }) => {
          return commands.updateComment(id, {
            isResolved: false,
            response: undefined,
          });
        },

      toggleCommentVisibility:
        () =>
        ({ editor }) => {
          this.storage.showComments = !this.storage.showComments;
          // Force re-render
          editor.view.dispatch(editor.state.tr);
          return true;
        },

      setCommentVisibility:
        (visible: boolean) =>
        ({ editor }) => {
          this.storage.showComments = visible;
          // Force re-render
          editor.view.dispatch(editor.state.tr);
          return true;
        },
    };
  },

  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      const attrs = node.attrs as CommentAttributes;
      const dom = document.createElement('span');

      // Build class list
      const classes = [this.options.commentClass];
      if (attrs.isResolved) classes.push(this.options.resolvedClass);
      if (attrs.isQuestion) classes.push(this.options.questionClass);
      if (!this.storage.showComments) classes.push(this.options.hiddenClass);

      dom.className = classes.join(' ');
      dom.setAttribute('data-comment-id', attrs.id);
      dom.setAttribute('data-comment-text', attrs.text);
      dom.setAttribute('data-is-question', String(attrs.isQuestion));
      dom.setAttribute('data-is-resolved', String(attrs.isResolved));
      if (attrs.response) {
        dom.setAttribute('data-response', attrs.response);
        dom.title = `Response: ${attrs.response}`;
      }
      if (attrs.createdAt) {
        dom.setAttribute('data-created-at', attrs.createdAt);
      }

      // Display text with brackets
      dom.textContent = `[${attrs.text}]`;

      // Add click handler
      dom.addEventListener('click', () => {
        if (this.options.onCommentClick) {
          this.options.onCommentClick(attrs.id, attrs);
        }
      });

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) return false;

          const updatedAttrs = updatedNode.attrs as CommentAttributes;

          // Update classes
          const newClasses = [this.options.commentClass];
          if (updatedAttrs.isResolved) newClasses.push(this.options.resolvedClass);
          if (updatedAttrs.isQuestion) newClasses.push(this.options.questionClass);
          if (!this.storage.showComments) newClasses.push(this.options.hiddenClass);

          dom.className = newClasses.join(' ');
          dom.textContent = `[${updatedAttrs.text}]`;

          if (updatedAttrs.response) {
            dom.title = `Response: ${updatedAttrs.response}`;
          } else {
            dom.removeAttribute('title');
          }

          return true;
        },
      };
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: inlineCommentPluginKey,
        props: {
          // Could add keyboard shortcuts here (e.g., Cmd+Shift+C to insert comment)
          handleKeyDown: (view, event) => {
            // Cmd/Ctrl + Shift + C to open comment insertion
            if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'C') {
              // This would typically trigger a UI to input comment text
              // For now, just prevent default and let the component handle it
              event.preventDefault();
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
});

export default InlineComment;
