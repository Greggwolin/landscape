/**
 * NarrativeCanvas Component
 *
 * Collapsible narrative panel for the Sales Comparison Approach.
 * Phase 2: TipTap rich text editor with track changes and inline comments.
 *
 * Features:
 * - Consolidated header with toolbar controls
 * - Version history dropdown
 * - Track changes (Word-style redlining)
 * - Inline comments
 * - Save & Send for Review
 * - Resizable width (via parent)
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { CButton, CToast, CToastBody, CToaster } from '@coreui/react';
import { SemanticButton } from '@/components/ui/landscape';
import CIcon from '@coreui/icons-react';
import { cilChevronLeft, cilChevronRight, cilJustifyCenter } from '@coreui/icons';

import { NarrativeEditor, NarrativeEditorRef } from '@/lib/tiptap/NarrativeEditor';
import { NarrativeToolbar } from '@/lib/tiptap/NarrativeToolbar';
import VersionHistoryDropdown, { NarrativeVersion } from './VersionHistoryDropdown';
import VersionBadge from './VersionBadge';
import LandscaperReviewFlyout from './LandscaperReviewFlyout';
import ReadOnlyBanner from './ReadOnlyBanner';
import { LandscaperResponse, ReviewMessage } from './ReviewTypes';
import '@/styles/narrative-editor.css';
import '@/styles/landscaper-review.css';

interface NarrativeCanvasProps {
  projectId: number;
  collapsed: boolean;
  onToggle: () => void;
  onReviewFlyoutToggle?: (open: boolean) => void;
}

const STORAGE_KEY_PREFIX = 'landscape_narrative_canvas_collapsed_';
const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
const APPROACH_TYPE = 'sales_comparison';

// Placeholder content for Phase 1
const PLACEHOLDER_CONTENT = `<h3>Sales Comparison Approach</h3>
<p>The Sales Comparison Approach develops an opinion of value by comparing the subject property to similar properties that have recently sold. Adjustments are made to the comparable sales to account for differences in property characteristics, market conditions, and transaction terms.</p>
<p>Three comparable sales were analyzed for this valuation:</p>
<ol>
<li>Reveal Playa Vista - $122.10M ($570,561/unit)</li>
<li>Cobalt - $67.70M ($501,481/unit)</li>
<li>Atlas - $49.50M ($386,719/unit)</li>
</ol>
<p>After adjustments for location, age/condition, and market conditions, the indicated value range is $386,719 to $411,214 per unit.</p>
<p>Based on the analysis, the indicated value by the Sales Comparison Approach is <strong>$45,100,000</strong>.</p>`;

export function NarrativeCanvas({ projectId, collapsed, onToggle, onReviewFlyoutToggle }: NarrativeCanvasProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  // Editor ref for toolbar control
  const editorRef = useRef<NarrativeEditorRef>(null);

  // Editor state
  const [content, setContent] = useState<object | string>(PLACEHOLDER_CONTENT);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [trackChangesEnabled, setTrackChangesEnabled] = useState(true);

  // Version state
  const [versions, setVersions] = useState<NarrativeVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<NarrativeVersion | null>(null);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [isViewingOldVersion, setIsViewingOldVersion] = useState(false);

  // Review workflow state
  const [reviewFlyoutOpen, setReviewFlyoutOpen] = useState(false);
  const [reviewResponse, setReviewResponse] = useState<LandscaperResponse | null>(null);
  const [reviewThread, setReviewThread] = useState<ReviewMessage[]>([]);

  const narrativeBaseUrl = `${DJANGO_API_URL}/api/projects/${projectId}/narrative/${APPROACH_TYPE}`;
  const latestVersion = versions.reduce<NarrativeVersion | null>((latest, version) => {
    if (!latest || version.version_number > latest.version_number) {
      return version;
    }
    return latest;
  }, null);
  const isReadOnly = Boolean(isViewingOldVersion || currentVersion?.status === 'final');

  // Toast notifications
  const [toasts, setToasts] = useState<{ id: number; message: string; color: string }[]>([]);

  // Show toast notification
  const showToast = useCallback((message: string, color: string = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, color }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Fetch versions from API
  const fetchVersions = useCallback(async () => {
    setLoadingVersions(true);
    try {
      const response = await fetch(`${narrativeBaseUrl}/versions/`, {
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add auth headers when auth is implemented
        },
      });

      if (response.ok) {
        const data = await response.json();
        const fetchedVersions = data.versions || data.results || [];
        setVersions(fetchedVersions);
      }
    } catch (error) {
      console.error('Failed to fetch narrative versions:', error);
    } finally {
      setLoadingVersions(false);
    }
  }, [narrativeBaseUrl]);

  const fetchLatestVersion = useCallback(async () => {
    try {
      const response = await fetch(`${narrativeBaseUrl}/`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.exists === false) {
          setContent(PLACEHOLDER_CONTENT);
          return;
        }
        if (data.id) {
          setCurrentVersion(data);
          setContent(data.content || PLACEHOLDER_CONTENT);
          setIsViewingOldVersion(false);
        }
      }
    } catch (error) {
      console.error('Failed to fetch latest narrative:', error);
    }
  }, [narrativeBaseUrl]);

  const fetchVersionByNumber = useCallback(async (versionNumber: number) => {
    try {
      const response = await fetch(`${narrativeBaseUrl}/versions/${versionNumber}/`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentVersion(data);
        setContent(data.content || PLACEHOLDER_CONTENT);
        setHasUnsavedChanges(false);
        setTrackChangesEnabled(false);
        setIsViewingOldVersion(Boolean(latestVersion && data.id !== latestVersion.id));
      }
    } catch (error) {
      console.error('Failed to fetch narrative version:', error);
    }
  }, [latestVersion, narrativeBaseUrl]);

  // Load versions on mount
  useEffect(() => {
    fetchVersions();
    fetchLatestVersion();
  }, [fetchVersions, fetchLatestVersion]);

  // Load persisted collapse state on mount (only once)
  useEffect(() => {
    if (typeof window !== 'undefined' && !isInitialized) {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${projectId}`);
      if (stored !== null) {
        const shouldCollapse = stored === 'true';
        setIsCollapsed(shouldCollapse);
        // Only call onToggle if different from current prop
        if (shouldCollapse !== collapsed) {
          onToggle();
        }
      }
      setIsInitialized(true);
    }
  }, [projectId, isInitialized, collapsed, onToggle]);

  // Sync with external prop changes (after initialization)
  useEffect(() => {
    if (isInitialized) {
      setIsCollapsed(collapsed);
    }
  }, [collapsed, isInitialized]);

  useEffect(() => {
    onReviewFlyoutToggle?.(reviewFlyoutOpen);
  }, [onReviewFlyoutToggle, reviewFlyoutOpen]);

  useEffect(() => {
    if (currentVersion && latestVersion) {
      setIsViewingOldVersion(currentVersion.id !== latestVersion.id);
    }
  }, [currentVersion, latestVersion]);

  // Persist state on change
  useEffect(() => {
    if (typeof window !== 'undefined' && isInitialized) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${projectId}`, String(isCollapsed));
    }
  }, [isCollapsed, projectId, isInitialized]);

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
    onToggle();
  };

  // Handle content changes from editor
  const handleContentChange = useCallback((json: object, html: string, plainText: string) => {
    if (isReadOnly) return;
    setContent(json);
    setHasUnsavedChanges(true);
  }, [isReadOnly]);

  // Handle track changes toggle (kept for editor callbacks)
  const handleTrackChangesToggle = useCallback((enabled: boolean) => {
    if (isReadOnly) return;
    setTrackChangesEnabled(enabled);
  }, [isReadOnly]);

  // Handle comment added
  const handleCommentAdd = useCallback((comment: { id: string; text: string; position: { from: number; to: number } }) => {
    console.log('Comment added:', comment);
    // Comments are stored in the TipTap document JSON
    // Could also sync to backend here
  }, []);

  const extractComments = useCallback(() => {
    const editor = editorRef.current?.editor;
    if (!editor) return [];

    const comments: {
      text: string;
      position_start: number;
      position_end: number;
      is_question: boolean;
    }[] = [];

    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'inlineComment') {
        comments.push({
          text: node.attrs.text || '',
          position_start: pos,
          position_end: pos + node.nodeSize,
          is_question: Boolean(node.attrs.isQuestion),
        });
      }
    });

    return comments;
  }, []);

  const extractChanges = useCallback(() => {
    const editor = editorRef.current?.editor;
    if (!editor) return [];

    const isWithinBracketedText = (pos: number, textValue: string) => {
      if (textValue.includes('[') || textValue.includes(']')) return true;

      const { doc } = editor.state;
      const resolvedPos = doc.resolve(pos);
      const blockStart = resolvedPos.start(resolvedPos.depth);
      const blockEnd = resolvedPos.end(resolvedPos.depth);

      const blockText = doc.textBetween(blockStart, blockEnd, '\n', '\n');
      const beforeText = doc.textBetween(blockStart, pos, '\n', '\n');
      const offset = beforeText.length;
      const textLength = textValue.length;

      const before = blockText.slice(0, offset);
      const after = blockText.slice(offset + textLength);

      const lastOpen = before.lastIndexOf('[');
      const lastClose = before.lastIndexOf(']');

      if (lastOpen > lastClose) {
        return after.indexOf(']') !== -1;
      }

      return false;
    };

    const changes: {
      type: 'addition' | 'deletion';
      original_text?: string;
      new_text?: string;
      position_start: number;
      position_end: number;
    }[] = [];

    editor.state.doc.descendants((node, pos, parent) => {
      if (!node.isText) return;
      const trackMark = node.marks.find(
        (mark) => mark.type.name === 'textStyle' && mark.attrs['data-track-change']
      );
      if (!trackMark) return;

      const changeType = trackMark.attrs['data-track-change'];
      const textValue = node.text || '';
      const isBracketedText = changeType === 'addition' && isWithinBracketedText(pos, textValue);
      if (isBracketedText || parent?.type?.name === 'inlineComment') {
        return;
      }

      if (changeType === 'addition') {
        changes.push({
          type: 'addition',
          new_text: textValue,
          position_start: pos,
          position_end: pos + node.nodeSize,
        });
      } else if (changeType === 'deletion') {
        changes.push({
          type: 'deletion',
          original_text: textValue,
          position_start: pos,
          position_end: pos + node.nodeSize,
        });
      }
    });

    return changes;
  }, []);

  // Handle version selection
  const handleVersionSelect = useCallback((version: NarrativeVersion) => {
    fetchVersionByNumber(version.version_number);
  }, [fetchVersionByNumber]);

  // Handle version restore
  const handleVersionRestore = useCallback(async (version: NarrativeVersion) => {
    try {
      // Create new version from the selected one
      const response = await fetch(`${narrativeBaseUrl}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content,
          status: 'draft',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        showToast(`Version restored as v${data.version_number}`, 'success');
        setIsViewingOldVersion(false);
        await fetchVersions();
        await fetchLatestVersion();
      } else {
        showToast('Failed to restore version', 'danger');
      }
    } catch (error) {
      console.error('Failed to restore version:', error);
      showToast('Failed to restore version', 'danger');
    }
  }, [content, fetchLatestVersion, fetchVersions, narrativeBaseUrl, showToast]);

  // Handle save and send for review
  const handleSaveDraft = useCallback(async () => {
    const editor = editorRef.current?.editor;
    if (!editor) return;

    try {
      const response = await fetch(`${narrativeBaseUrl}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editor.getJSON(),
          content_html: editor.getHTML(),
          content_plain: editor.getText(),
          status: 'draft',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        editor.commands.acceptAllChanges();
        setHasUnsavedChanges(false);
        setReviewResponse(null);
        setReviewThread([]);
        setCurrentVersion({
          id: data.id,
          version_number: data.version_number,
          status: data.status || 'draft',
          created_at: data.created_at || new Date().toISOString(),
        });
        showToast(`Saved as v${data.version_number}`, 'success');
        await fetchVersions();
        await fetchLatestVersion();
      } else {
        showToast('Failed to save draft', 'danger');
      }
    } catch (error) {
      console.error('Failed to save draft:', error);
      showToast('Failed to save draft', 'danger');
    }
  }, [fetchLatestVersion, fetchVersions, narrativeBaseUrl, showToast]);

  const handleSaveAndSend = useCallback(async (editorContent: object) => {
    try {
      const editor = editorRef.current?.editor;
      const response = await fetch(`${narrativeBaseUrl}/send-for-review/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editorContent,
          content_html: editor?.getHTML(),
          content_plain: editor?.getText(),
          comments: extractComments(),
          changes: extractChanges(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setHasUnsavedChanges(false);
        setReviewResponse(null);
        setReviewThread([]);
        setReviewFlyoutOpen(true);
        showToast('Narrative saved and sent for review', 'success');
        await fetchVersions();
        await fetchLatestVersion();
        if (data.version_id && data.version_number) {
          setCurrentVersion({
            id: data.version_id,
            version_number: data.version_number,
            status: data.status || 'under_review',
            created_at: data.created_at || new Date().toISOString(),
          });
        }
      } else {
        showToast('Failed to save narrative', 'danger');
      }
    } catch (error) {
      console.error('Failed to save narrative:', error);
      showToast('Failed to save narrative', 'danger');
    }
  }, [extractChanges, extractComments, fetchLatestVersion, fetchVersions, narrativeBaseUrl, showToast]);

  const handleApplyChanges = useCallback(async (suggestedContent: object | undefined) => {
    if (!suggestedContent) return;
    try {
      const response = await fetch(`${narrativeBaseUrl}/apply-changes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accept_suggested_content: true,
          suggested_content: suggestedContent,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (editorRef.current?.editor) {
          editorRef.current.editor.commands.setContent(suggestedContent);
          editorRef.current.editor.commands.acceptAllChanges();
        }
        setTrackChangesEnabled(false);
        setHasUnsavedChanges(false);
        setReviewResponse(null);
        setReviewThread([]);
        setReviewFlyoutOpen(false);
        showToast(`Changes applied. Now viewing v${data.version_number}.`, 'success');
        await fetchVersions();
        await fetchLatestVersion();
      } else {
        showToast('Failed to apply changes', 'danger');
      }
    } catch (error) {
      console.error('Failed to apply changes:', error);
      showToast('Failed to apply changes', 'danger');
    }
  }, [fetchLatestVersion, fetchVersions, narrativeBaseUrl, showToast]);

  const handleThreadUpdate = useCallback((messages: ReviewMessage[], response: LandscaperResponse | null) => {
    setReviewThread(messages);
    setReviewResponse(response);
  }, []);

  const handleMarkAsFinal = useCallback(async () => {
    if (!currentVersion) return;
    try {
      const response = await fetch(`${narrativeBaseUrl}/versions/${currentVersion.version_number}/status/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'final' }),
      });

      if (response.ok) {
        showToast(`Marked v${currentVersion.version_number} as final`, 'success');
        await fetchVersions();
        await fetchLatestVersion();
      } else {
        showToast('Failed to mark version as final', 'danger');
      }
    } catch (error) {
      console.error('Failed to update version status:', error);
      showToast('Failed to mark version as final', 'danger');
    }
  }, [currentVersion, fetchLatestVersion, fetchVersions, narrativeBaseUrl, showToast]);

  const handleBackToCurrent = useCallback(async () => {
    setIsViewingOldVersion(false);
    await fetchLatestVersion();
  }, [fetchLatestVersion]);

  // Toolbar handlers that work with the editor ref
  const handleInsertCommentViaRef = useCallback(() => {
    if (isReadOnly) return;
    if (editorRef.current) {
      editorRef.current.insertComment();
    }
  }, [isReadOnly]);

  // Collapsed state
  if (isCollapsed) {
    return (
      <div
        className="narrative-canvas-collapsed"
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--cui-tertiary-bg)',
          border: '1px solid var(--cui-border-color)',
          borderRadius: '0.5rem',
          minHeight: '400px'
        }}
      >
        {/* Header - same as expanded */}
        <div
          className="narrative-canvas-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.75rem 0.5rem',
            borderBottom: '1px solid var(--cui-border-color)',
            backgroundColor: 'var(--cui-secondary-bg)',
            borderTopLeftRadius: '0.5rem',
            borderTopRightRadius: '0.5rem'
          }}
        >
          <CButton
            color="secondary"
            variant="ghost"
            size="sm"
            onClick={handleToggle}
            title="Show Narrative"
            style={{ padding: '0.25rem' }}
          >
            <CIcon icon={cilJustifyCenter} style={{ width: '1.5rem', height: '1.5rem' }} />
          </CButton>
        </div>
        {/* Collapsed body - clickable to expand */}
        <button
          className="narrative-canvas-expand-btn"
          onClick={handleToggle}
          title="Show Narrative"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            width: '48px',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--cui-secondary-color)',
            transition: 'background-color 0.2s ease'
          }}
        >
          <CIcon icon={cilChevronLeft} size="sm" />
        </button>
      </div>
    );
  }

  return (
    <div className="narrative-canvas-shell">
      <div
        className="narrative-canvas"
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: 'var(--cui-tertiary-bg)',
          borderRadius: '0.5rem',
          border: '1px solid var(--cui-border-color)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Consolidated Header - Title row */}
        <div
          className="narrative-canvas-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.5rem 1rem',
            borderBottom: '1px solid var(--cui-border-color)',
            backgroundColor: 'var(--cui-secondary-bg)',
            borderTopLeftRadius: '0.5rem',
            borderTopRightRadius: '0.5rem'
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <CIcon icon={cilJustifyCenter} style={{ color: 'var(--cui-body-color)', width: '1.5rem', height: '1.5rem' }} />
            <span style={{ fontWeight: 600, color: 'var(--cui-body-color)' }}>Narrative</span>
            <VersionHistoryDropdown
              versions={versions}
              currentVersion={currentVersion}
              loading={loadingVersions}
              onVersionSelect={handleVersionSelect}
            />
            {currentVersion?.status && (
              <VersionBadge status={currentVersion.status} />
            )}
          </div>
          <div className="d-flex align-items-center gap-2">
            {currentVersion?.status === 'under_review' && (
              <CButton
                color="warning"
                size="sm"
                className="review-button"
                onClick={() => setReviewFlyoutOpen(true)}
              >
                Review
                {!reviewResponse && <span className="review-button-dot" />}
              </CButton>
            )}
            <CButton
              color="secondary"
              variant="ghost"
              size="sm"
              onClick={handleToggle}
              title="Hide narrative"
            >
              <CIcon icon={cilChevronRight} size="sm" className="me-1" />
              Hide
            </CButton>
          </div>
        </div>

        {/* Consolidated Header - Toolbar row */}
        {isViewingOldVersion && currentVersion && (
          <ReadOnlyBanner
            version={currentVersion}
            onRestore={() => handleVersionRestore(currentVersion)}
            onBack={handleBackToCurrent}
          />
        )}
        <div
          className="narrative-canvas-toolbar"
          style={{
            padding: '0.375rem 0.75rem',
            borderBottom: '1px solid var(--cui-border-color)',
            backgroundColor: 'var(--cui-tertiary-bg)',
            overflowX: 'auto'
          }}
        >
        <NarrativeToolbar
          editor={editorRef.current?.editor ?? null}
          trackChangesEnabled={isReadOnly ? false : trackChangesEnabled}
          readOnly={isReadOnly}
          onInsertComment={handleInsertCommentViaRef}
          mode="compact"
        />
      </div>

        {/* Content - TipTap Editor (toolbar hidden, controlled from header) */}
        <div
          className="narrative-canvas-content"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <NarrativeEditor
            ref={editorRef}
            content={content}
            readOnly={isReadOnly}
            trackChangesEnabled={isReadOnly ? false : trackChangesEnabled}
            onContentChange={handleContentChange}
            onTrackChangesToggle={handleTrackChangesToggle}
            onCommentAdd={handleCommentAdd}
            hasUnsavedChanges={isReadOnly ? false : hasUnsavedChanges}
            placeholder="Start writing your narrative..."
            minHeight="300px"
            showToolbar={false}
          />
        </div>

        <div className="narrative-canvas-footer d-flex align-items-center justify-content-between">
          <div>
          {hasUnsavedChanges && (
            <SemanticButton intent="neutral-action" variant="ghost" size="sm" disabled>
              Unsaved changes
            </SemanticButton>
          )}
          </div>
          <div className="d-flex align-items-center gap-2">
            <CButton
              color="secondary"
              size="sm"
              onClick={handleSaveDraft}
              disabled={!hasUnsavedChanges || isReadOnly}
            >
              Save
            </CButton>
            <CButton
              color="primary"
              size="sm"
              onClick={() => handleSaveAndSend(editorRef.current?.editor?.getJSON() || {})}
              disabled={!hasUnsavedChanges || isReadOnly}
            >
              Save &amp; Send for Review
            </CButton>
            {currentVersion?.status === 'draft' && !hasUnsavedChanges && !isViewingOldVersion && (
              <SemanticButton intent="confirm-action" size="sm" variant="outline" onClick={handleMarkAsFinal}>
                Mark as Final
              </SemanticButton>
            )}
          </div>
        </div>
      </div>

      <LandscaperReviewFlyout
        projectId={projectId}
        approachType={APPROACH_TYPE}
        versionId={currentVersion?.id ?? null}
        isOpen={reviewFlyoutOpen}
        response={reviewResponse}
        thread={reviewThread}
        onClose={() => setReviewFlyoutOpen(false)}
        onApplyChanges={handleApplyChanges}
        onThreadUpdate={handleThreadUpdate}
      />

      {/* Toast notifications */}
      <CToaster placement="top-end" className="position-fixed p-3" style={{ zIndex: 1060 }}>
        {toasts.map((toast) => (
          <CToast key={toast.id} visible={true} color={toast.color}>
            <CToastBody>{toast.message}</CToastBody>
          </CToast>
        ))}
      </CToaster>
    </div>
  );
}
