'use client';

import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CFormTextarea,
  CFormSelect,
  CBadge,
  CSpinner,
} from '@coreui/react';
import AdminNavBar from '@/app/components/AdminNavBar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// ── Display-bucket map: collapse Layer 2's three states into the same
// three-bucket taxonomy the Cowork artifact uses, so the Open/In Progress/Closed
// count chips read the same way. submitted → open, under_review → in_progress,
// addressed → closed. Pure display layer; the database column stays as-is.
const STATUS_BUCKET_MAP: Record<string, 'open' | 'in_progress' | 'closed'> = {
  submitted: 'open',
  under_review: 'in_progress',
  addressed: 'closed',
};
const BUCKET_LABEL: Record<'open' | 'in_progress' | 'closed', string> = {
  open: 'Open',
  in_progress: 'In Progress',
  closed: 'Closed',
};
const BUCKET_ACCENT: Record<'open' | 'in_progress' | 'closed', { bg: string; bgActive: string; fg: string; fgActive: string; numColor: string }> = {
  open:        { bg: '#fafafa', bgActive: '#fee2e2', fg: '#475569', fgActive: '#991b1b', numColor: '#dc2626' },
  in_progress: { bg: '#fafafa', bgActive: '#fef3c7', fg: '#475569', fgActive: '#92400e', numColor: '#d97706' },
  closed:      { bg: '#fafafa', bgActive: '#dcfce7', fg: '#475569', fgActive: '#166534', numColor: '#16a34a' },
};

interface FeedbackItem {
  id: number;
  internal_id: string;
  user: number;
  username: string;
  user_email?: string;
  feedback_type: 'bug' | 'feature' | 'question' | 'general';
  message: string;
  page_url: string;
  page_path: string;
  project_id?: number;
  project_name?: string;
  category?: 'bug' | 'feature_request' | 'ux_confusion' | 'question';
  affected_module?: string;
  landscaper_summary?: string;
  landscaper_raw_chat?: Array<{ role: string; content: string }>;
  browser_context?: {
    browser?: string;
    os?: string;
    screenSize?: string;
    currentUrl?: string;
    timestamp?: string;
  };
  report_count: number;
  status: 'submitted' | 'under_review' | 'addressed';
  admin_notes: string;
  admin_response?: string;
  admin_responded_at?: string;
  created_at: string;
  updated_at: string;
  context_url?: string;
}

const STATUS_COLORS: Record<string, string> = {
  submitted: 'warning',
  under_review: 'info',
  addressed: 'success',
};

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  addressed: 'Addressed',
};

const CATEGORY_COLORS: Record<string, string> = {
  bug: 'danger',
  feature_request: 'info',
  ux_confusion: 'warning',
  question: 'secondary',
};

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug',
  feature_request: 'Feature Request',
  ux_confusion: 'UX Issue',
  question: 'Question',
};

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

// ── Working-summary + Fix Prompt helpers (mirror the Cowork feedback_status_live artifact) ──
// During the Layer 2 bridge backfill (LSCMD-FBLOG-0505-kp), the Cowork-side
// `working_summary` content from tbl_feedback was stuffed into admin_notes
// under a "--- Working summary ---" header. This helper extracts it for
// display in the detail modal so the chat-tied lifecycle log is visible
// here, not only in the legacy Cowork artifact.
function parseWorkingSummary(adminNotes: string | undefined | null): string | null {
  if (!adminNotes) return null;
  const idx = adminNotes.indexOf('--- Working summary ---');
  if (idx < 0) return null;
  return adminNotes.substring(idx + '--- Working summary ---'.length).trim() || null;
}

// Build the same paste-ready triage prompt the Cowork artifact's "Fix Prompt"
// button copies to clipboard. Includes a "Prior work on this item" section
// when the row already has a working summary, so a fresh chat can pick up
// where the prior one left off.
function buildFixPrompt(item: FeedbackItem): string {
  const dateOnly = (item.created_at || '').slice(0, 10);
  const where = item.affected_module || 'Unknown';
  const statusLabel = STATUS_LABELS[item.status] || item.status;
  const ws = parseWorkingSummary(item.admin_notes);
  const hasPriorWork = !!ws;
  const lines: string[] = [];

  lines.push(`Triage feedback item FB-${item.id} from the Landscape app.`);
  lines.push(``);
  lines.push(`Reported: ${dateOnly} on the ${where} surface`);
  lines.push(`Status: ${statusLabel}`);
  lines.push(``);
  lines.push(`User's wording:`);
  lines.push(`"${(item.message || '').trim()}"`);
  lines.push(``);

  if (hasPriorWork) {
    lines.push(`──── Prior work on this item ────`);
    lines.push(`Working summary (chronological — newest at bottom):`);
    lines.push(ws as string);
    lines.push(``);
    lines.push(`Pick up where prior work left off. Do NOT re-litigate decisions already locked in (look for [decision] / [user-input] tags). If the most recent line is a [blocker], that's where to start.`);
    lines.push(``);
  }

  lines.push(`Investigate ${hasPriorWork ? 'and finish' : 'this end-to-end and make'} the fix directly:`);
  lines.push(`  1. Read the relevant code paths and trace downstream consumers per §17.`);
  lines.push(`  2. ${hasPriorWork ? 'Confirm what remains based on the Prior Work section above, then state the planned change before editing.' : 'Identify the root cause and state the planned change before editing.'}`);
  lines.push(`  3. Make all code, schema-spec, and config edits yourself with the file tools — do not draft a CC prompt for work Cowork can do.`);
  lines.push(`  4. Verify the change in-place where possible (read the edited file back, check types, sanity-check call sites).`);
  lines.push(``);
  lines.push(`Only hand off to CC when the remaining step requires a capability Cowork lacks: running terminal commands, executing the build, running tests, committing/pushing to git, executing database migrations, or restarting servers. In those cases, deliver a downloadable .md prompt per Landscape standards.`);
  lines.push(``);
  lines.push(`If the fix requires a decision Gregg owns (UX, scope, naming, behavior tradeoff), surface a single targeted question before editing.`);

  return lines.join('\n');
}

interface FeedbackDetailModalProps {
  item: FeedbackItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number, data: Partial<FeedbackItem>) => Promise<void>;
}

function FeedbackDetailModal({ item, isOpen, onClose, onSave }: FeedbackDetailModalProps) {
  const [status, setStatus] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState('');
  const [adminResponse, setAdminResponse] = useState('');
  const [saving, setSaving] = useState(false);
  const [showRawChat, setShowRawChat] = useState(false);
  const [showWorkingSummary, setShowWorkingSummary] = useState(false);
  const [showFixPrompt, setShowFixPrompt] = useState(false);
  const [fixPromptCopied, setFixPromptCopied] = useState(false);

  useEffect(() => {
    if (item) {
      setStatus(item.status);
      setAdminNotes(item.admin_notes || '');
      setAdminResponse(item.admin_response || '');
      // Reset disclosures + copied state on item change
      setShowWorkingSummary(false);
      setShowFixPrompt(false);
      setFixPromptCopied(false);
    }
  }, [item]);

  // Resolve working summary + fix prompt for the current item (memoised on every render is fine here — strings are small)
  const workingSummary = item ? parseWorkingSummary(item.admin_notes) : null;
  const fixPromptText = item ? buildFixPrompt(item) : '';

  const handleCopyFixPrompt = async () => {
    if (!item) return;
    try {
      await navigator.clipboard.writeText(fixPromptText);
      setFixPromptCopied(true);
      setShowFixPrompt(true);
      setTimeout(() => setFixPromptCopied(false), 1500);
    } catch {
      // Clipboard blocked — show the text inline so the user can copy manually
      setShowFixPrompt(true);
    }
  };

  const handleSave = async () => {
    if (!item) return;
    setSaving(true);
    try {
      await onSave(item.id, {
        status: status as FeedbackItem['status'],
        admin_notes: adminNotes,
        admin_response: adminResponse,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!item) return null;

  return (
    <CModal visible={isOpen} onClose={onClose} size="lg">
      <CModalHeader>
        <CModalTitle>Feedback Detail</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div className="row mb-3">
          <div className="col-md-6">
            <strong>User:</strong> {item.username}
            {item.user_email && <span className="text-muted ms-2">({item.user_email})</span>}
          </div>
          <div className="col-md-6">
            <strong>Submitted:</strong> {new Date(item.created_at).toLocaleString()}
          </div>
        </div>

        <div className="row mb-3">
          <div className="col-md-6">
            <strong>Module:</strong>{' '}
            <CBadge color="dark">{item.affected_module || 'Unknown'}</CBadge>
          </div>
          <div className="col-md-6">
            <strong>Category:</strong>{' '}
            {item.category ? (
              <CBadge color={CATEGORY_COLORS[item.category]}>
                {CATEGORY_LABELS[item.category]}
              </CBadge>
            ) : (
              <span className="text-muted">Not classified</span>
            )}
          </div>
        </div>

        {item.report_count > 1 && (
          <div className="alert alert-info py-2 mb-3">
            <strong>Reported by {item.report_count} users</strong>
          </div>
        )}

        <div className="mb-3">
          <strong>Summary:</strong>
          <p className="mb-0 mt-1" style={{ whiteSpace: 'pre-wrap' }}>
            {item.landscaper_summary || item.message}
          </p>
        </div>

        {item.landscaper_summary && item.landscaper_summary !== item.message && (
          <div className="mb-3">
            <strong>Original Message:</strong>
            <p className="mb-0 mt-1 text-muted" style={{ whiteSpace: 'pre-wrap' }}>
              {item.message}
            </p>
          </div>
        )}

        {item.browser_context && Object.keys(item.browser_context).length > 0 && (
          <div className="mb-3">
            <strong>Browser Context:</strong>
            <div className="mt-1 p-2 bg-light rounded small">
              {item.browser_context.browser && <div>Browser: {item.browser_context.browser}</div>}
              {item.browser_context.os && <div>OS: {item.browser_context.os}</div>}
              {item.browser_context.screenSize && (
                <div>Screen: {item.browser_context.screenSize}</div>
              )}
              {item.browser_context.currentUrl && (
                <div className="text-truncate">URL: {item.browser_context.currentUrl}</div>
              )}
            </div>
          </div>
        )}

        {item.landscaper_raw_chat && item.landscaper_raw_chat.length > 0 && (
          <div className="mb-3">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setShowRawChat(!showRawChat)}
            >
              {showRawChat ? 'Hide' : 'Show'} Chat History ({item.landscaper_raw_chat.length}{' '}
              messages)
            </button>
            {showRawChat && (
              <div className="mt-2 p-2 bg-light rounded" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {item.landscaper_raw_chat.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`mb-2 p-2 rounded ${msg.role === 'user' ? 'bg-primary text-white ms-4' : 'bg-white'}`}
                  >
                    <small className="d-block mb-1 fw-bold">
                      {msg.role === 'user' ? 'User' : 'Assistant'}
                    </small>
                    {msg.content}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mb-3">
          <strong>Page:</strong>{' '}
          <a
            href={item.context_url || item.page_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-decoration-none"
          >
            {item.page_path}
          </a>
        </div>

        {workingSummary && (
          <div className="mb-3">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setShowWorkingSummary((v) => !v)}
            >
              {showWorkingSummary ? 'Hide' : 'Show'} Working Summary ({workingSummary.split('\n').length} lines)
            </button>
            {showWorkingSummary && (
              <div
                className="mt-2 p-3 rounded"
                style={{
                  backgroundColor: 'var(--cui-tertiary-bg, #f8fafc)',
                  border: '1px solid var(--cui-border-color, #e2e8f0)',
                  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                  fontSize: '12.5px',
                  lineHeight: 1.65,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: '320px',
                  overflowY: 'auto',
                  color: 'var(--cui-body-color)',
                }}
              >
                {workingSummary}
              </div>
            )}
          </div>
        )}

        <div className="mb-3">
          <button
            type="button"
            className={`btn btn-sm ${fixPromptCopied ? 'btn-success' : 'btn-outline-primary'}`}
            onClick={handleCopyFixPrompt}
          >
            {fixPromptCopied ? 'Copied to clipboard' : 'Fix Prompt'}
          </button>
          {showFixPrompt && (
            <div
              className="mt-2 p-3 rounded"
              style={{
                backgroundColor: 'var(--cui-tertiary-bg, #f8fafc)',
                border: '1px solid var(--cui-border-color, #e2e8f0)',
                fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                fontSize: '12px',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: '320px',
                overflowY: 'auto',
                color: 'var(--cui-body-color)',
              }}
            >
              {fixPromptText}
            </div>
          )}
        </div>

        <hr />

        <div className="mb-3">
          <label className="form-label fw-bold">Status</label>
          <CFormSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="addressed">Addressed</option>
          </CFormSelect>
        </div>

        <div className="mb-3">
          <label className="form-label fw-bold">Internal Notes (private)</label>
          <CFormTextarea
            rows={3}
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Internal notes visible only to admins..."
          />
        </div>

        <div className="mb-3">
          <label className="form-label fw-bold">Response to Tester (visible to user)</label>
          <CFormTextarea
            rows={3}
            value={adminResponse}
            onChange={(e) => setAdminResponse(e.target.value)}
            placeholder="This response will be visible to the tester in their Feedback Log..."
          />
          {item.admin_responded_at && (
            <small className="text-muted">
              Last responded: {new Date(item.admin_responded_at).toLocaleString()}
            </small>
          )}
        </div>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose}>
          Cancel
        </CButton>
        <CButton color="primary" onClick={handleSave} disabled={saving}>
          {saving ? <CSpinner size="sm" className="me-2" /> : null}
          Save Changes
        </CButton>
      </CModalFooter>
    </CModal>
  );
}

// ── Inline expansion panel: replaces the modal. Same content, rendered
// directly below the row in a colspan'd cell. Per-row state lives here.
interface ExpandedRowPanelProps {
  item: FeedbackItem;
  onSave: (id: number, data: Partial<FeedbackItem>) => Promise<void>;
}

function ExpandedRowPanel({ item, onSave }: ExpandedRowPanelProps) {
  const [status, setStatus] = useState<string>(item.status);
  const [adminNotes, setAdminNotes] = useState(item.admin_notes || '');
  const [adminResponse, setAdminResponse] = useState(item.admin_response || '');
  const [saving, setSaving] = useState(false);
  const [showRawChat, setShowRawChat] = useState(false);
  const [showWorkingSummary, setShowWorkingSummary] = useState(false);
  const [showFixPrompt, setShowFixPrompt] = useState(false);
  const [fixPromptCopied, setFixPromptCopied] = useState(false);

  const workingSummary = parseWorkingSummary(item.admin_notes);
  const fixPromptText = buildFixPrompt(item);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(item.id, {
        status: status as FeedbackItem['status'],
        admin_notes: adminNotes,
        admin_response: adminResponse,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyFixPrompt = async () => {
    try {
      await navigator.clipboard.writeText(fixPromptText);
      setFixPromptCopied(true);
      setShowFixPrompt(true);
      setTimeout(() => setFixPromptCopied(false), 1500);
    } catch {
      setShowFixPrompt(true);
    }
  };

  return (
    <div className="p-3" style={{ background: 'var(--cui-tertiary-bg)' }}>
      <div className="mb-3">
        <strong>Summary:</strong>
        <p className="mb-0 mt-1" style={{ whiteSpace: 'pre-wrap' }}>
          {item.landscaper_summary || item.message}
        </p>
      </div>

      {item.landscaper_summary && item.landscaper_summary !== item.message && (
        <div className="mb-3">
          <strong>Original Message:</strong>
          <p className="mb-0 mt-1 text-muted" style={{ whiteSpace: 'pre-wrap' }}>{item.message}</p>
        </div>
      )}

      {item.browser_context && Object.keys(item.browser_context).length > 0 && (
        <div className="mb-3">
          <strong>Browser Context:</strong>
          <div className="mt-1 p-2 rounded small" style={{ background: 'var(--cui-card-bg)' }}>
            {item.browser_context.browser && <div>Browser: {item.browser_context.browser}</div>}
            {item.browser_context.os && <div>OS: {item.browser_context.os}</div>}
            {item.browser_context.screenSize && <div>Screen: {item.browser_context.screenSize}</div>}
            {item.browser_context.currentUrl && (
              <div className="text-truncate">URL: {item.browser_context.currentUrl}</div>
            )}
          </div>
        </div>
      )}

      {item.landscaper_raw_chat && item.landscaper_raw_chat.length > 0 && (
        <div className="mb-3">
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowRawChat(!showRawChat)}>
            {showRawChat ? 'Hide' : 'Show'} Chat History ({item.landscaper_raw_chat.length} messages)
          </button>
          {showRawChat && (
            <div className="mt-2 p-2 rounded" style={{ background: 'var(--cui-card-bg)', maxHeight: '200px', overflowY: 'auto' }}>
              {item.landscaper_raw_chat.map((msg, idx) => (
                <div key={idx} className={`mb-2 p-2 rounded ${msg.role === 'user' ? 'bg-primary text-white ms-4' : ''}`} style={msg.role !== 'user' ? { background: 'var(--cui-tertiary-bg)' } : undefined}>
                  <small className="d-block mb-1 fw-bold">{msg.role === 'user' ? 'User' : 'Assistant'}</small>
                  {msg.content}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mb-3">
        <strong>Page:</strong>{' '}
        <a href={item.context_url || item.page_url} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
          {item.page_path}
        </a>
      </div>

      {workingSummary && (
        <div className="mb-3">
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowWorkingSummary((v) => !v)}>
            {showWorkingSummary ? 'Hide' : 'Show'} Working Summary ({workingSummary.split('\n').length} lines)
          </button>
          {showWorkingSummary && (
            <div className="mt-2 p-3 rounded" style={{
              backgroundColor: 'var(--cui-tertiary-bg, #f8fafc)',
              border: '1px solid var(--cui-border-color, #e2e8f0)',
              fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
              fontSize: '12.5px',
              lineHeight: 1.65,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: '320px',
              overflowY: 'auto',
              color: 'var(--cui-body-color)',
            }}>{workingSummary}</div>
          )}
        </div>
      )}

      <div className="mb-3">
        <button type="button" className={`btn btn-sm ${fixPromptCopied ? 'btn-success' : 'btn-outline-primary'}`} onClick={handleCopyFixPrompt}>
          {fixPromptCopied ? 'Copied to clipboard' : 'Fix Prompt'}
        </button>
        {showFixPrompt && (
          <div className="mt-2 p-3 rounded" style={{
            backgroundColor: 'var(--cui-tertiary-bg, #f8fafc)',
            border: '1px solid var(--cui-border-color, #e2e8f0)',
            fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            fontSize: '12px',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: '320px',
            overflowY: 'auto',
            color: 'var(--cui-body-color)',
          }}>{fixPromptText}</div>
        )}
      </div>

      <hr />

      <div className="mb-3">
        <label className="form-label fw-bold">Status</label>
        <CFormSelect value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="addressed">Addressed</option>
        </CFormSelect>
      </div>

      <div className="mb-3">
        <label className="form-label fw-bold">Internal Notes (private)</label>
        <CFormTextarea rows={3} value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
      </div>

      <div className="mb-3">
        <label className="form-label fw-bold">Response to Tester (visible to user)</label>
        <CFormTextarea rows={3} value={adminResponse} onChange={(e) => setAdminResponse(e.target.value)} />
        {item.admin_responded_at && (
          <small className="text-muted">Last responded: {new Date(item.admin_responded_at).toLocaleString()}</small>
        )}
      </div>

      <div className="d-flex gap-2 justify-content-end">
        <CButton color="primary" onClick={handleSave} disabled={saving}>
          {saving ? <CSpinner size="sm" className="me-2" /> : null}
          Save Changes
        </CButton>
      </div>
    </div>
  );
}

type SortKey = 'date' | 'status' | 'user' | 'category' | 'summary';

function FeedbackAdminContent() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Bucket-based status filter (Set lets multiple buckets be active at once;
  // start with 'open' + 'in_progress' active, 'closed' off — same defaults as the Cowork artifact)
  const [statusBuckets, setStatusBuckets] = useState<Set<'open' | 'in_progress' | 'closed'>>(
    new Set(['open', 'in_progress'])
  );
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let accessToken: string | null = null;
      try {
        const tokens = localStorage.getItem('auth_tokens');
        accessToken = tokens ? JSON.parse(tokens).access : null;
      } catch {
        accessToken = null;
      }

      const headers: HeadersInit = {};
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${DJANGO_API_URL}/api/feedback/`, { headers });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const detail =
          data && typeof data === 'object' && 'detail' in data && typeof data.detail === 'string'
            ? ` ${data.detail}`
            : '';
        throw new Error(`Failed to fetch feedback (${response.status}).${detail}`);
      }

      setFeedback(
        Array.isArray(data)
          ? data
          : data && typeof data === 'object' && 'results' in data && Array.isArray(data.results)
            ? data.results
            : []
      );
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFeedback();
  }, [fetchFeedback]);

  const updateFeedback = async (id: number, data: Partial<FeedbackItem>) => {
    let accessToken: string | null = null;
    try {
      const tokens = localStorage.getItem('auth_tokens');
      accessToken = tokens ? JSON.parse(tokens).access : null;
    } catch {
      accessToken = null;
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${DJANGO_API_URL}/api/feedback/${id}/`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });
    const responseData = await response.json().catch(() => null);

    if (!response.ok) {
      const detail =
        responseData &&
        typeof responseData === 'object' &&
        'detail' in responseData &&
        typeof responseData.detail === 'string'
          ? ` ${responseData.detail}`
          : '';
      throw new Error(`Failed to update feedback (${response.status}).${detail}`);
    }

    await fetchFeedback();
  };

  // Bucket counts for the count chips (computed off ALL feedback, not the filtered set)
  const bucketCounts = useMemo(() => {
    const counts: Record<'open' | 'in_progress' | 'closed', number> = { open: 0, in_progress: 0, closed: 0 };
    for (const i of feedback) {
      const b = STATUS_BUCKET_MAP[i.status];
      if (b) counts[b]++;
    }
    return counts;
  }, [feedback]);

  const filteredFeedback = useMemo(
    () =>
      feedback.filter((item) => {
        const bucket = STATUS_BUCKET_MAP[item.status];
        if (!bucket || !statusBuckets.has(bucket)) return false;
        if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
        return true;
      }),
    [feedback, statusBuckets, categoryFilter]
  );

  const sortedFeedback = useMemo(() => {
    const arr = filteredFeedback.slice();
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';
      switch (sortBy) {
        case 'date':
          av = new Date(a.created_at).getTime();
          bv = new Date(b.created_at).getTime();
          break;
        case 'status':
          av = a.status;
          bv = b.status;
          break;
        case 'user':
          av = (a.username || '').toLowerCase();
          bv = (b.username || '').toLowerCase();
          break;
        case 'category':
          av = (a.category || 'zzz').toLowerCase();
          bv = (b.category || 'zzz').toLowerCase();
          break;
        case 'summary':
          av = (a.landscaper_summary || a.message || '').toLowerCase();
          bv = (b.landscaper_summary || b.message || '').toLowerCase();
          break;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return arr;
  }, [filteredFeedback, sortBy, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      // Default direction per column type — date desc, text asc
      setSortDir(key === 'date' ? 'desc' : 'asc');
    }
  };

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleBucket = (b: 'open' | 'in_progress' | 'closed') => {
    setStatusBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(b)) next.delete(b);
      else next.add(b);
      return next;
    });
  };

  const sortIndicator = (key: SortKey) => {
    if (sortBy !== key) return ' ';
    return sortDir === 'asc' ? '↑' : '↓';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">Loading feedback...</div>
      </div>
    );
  }

  const renderCountChip = (bucket: 'open' | 'in_progress' | 'closed') => {
    const active = statusBuckets.has(bucket);
    const accent = BUCKET_ACCENT[bucket];
    return (
      <button
        key={bucket}
        type="button"
        onClick={() => toggleBucket(bucket)}
        className="d-inline-flex align-items-baseline gap-2 border rounded px-3 py-2"
        style={{
          background: active ? accent.bgActive : accent.bg,
          color: active ? accent.fgActive : accent.fg,
          borderColor: active ? accent.numColor : 'var(--cui-border-color)',
          cursor: 'pointer',
          fontSize: '13.5px',
          userSelect: 'none',
          transition: 'background 0.12s ease, border-color 0.12s ease, color 0.12s ease',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '19px', lineHeight: 1, color: active ? 'inherit' : accent.numColor }}>
          {bucketCounts[bucket]}
        </span>
        <span>{BUCKET_LABEL[bucket].toLowerCase()}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
      <AdminNavBar />
      <div className="p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="h3 m-0">Feedback Queue</h1>
          <span className="text-muted small">{sortedFeedback.length} of {feedback.length} items</span>
        </div>

        {/* Count chips (click-to-filter, same shape as the Cowork artifact) */}
        <div className="d-flex flex-wrap gap-2 mb-3">
          {renderCountChip('open')}
          {renderCountChip('in_progress')}
          {renderCountChip('closed')}
          <div className="d-flex align-items-end ms-auto">
            <CFormSelect
              size="sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ minWidth: '180px' }}
            >
              <option value="all">All Categories</option>
              <option value="bug">Bug</option>
              <option value="feature_request">Feature Request</option>
              <option value="ux_confusion">UX Issue</option>
              <option value="question">Question</option>
            </CFormSelect>
          </div>
        </div>

        {error && (
          <div
            className="alert mb-4"
            style={{
              background: 'color-mix(in srgb, var(--cui-danger) 15%, var(--cui-body-bg))',
              color: 'var(--cui-danger)',
            }}
          >
            {error}
          </div>
        )}

        <div
          className="rounded overflow-hidden"
          style={{
            background: 'var(--cui-card-bg)',
            border: '1px solid var(--cui-border-color)',
          }}
        >
          <table className="table table-hover m-0" style={{ color: 'var(--cui-body-color)' }}>
            <thead>
              <tr style={{ background: 'var(--cui-tertiary-bg)' }}>
                <th className="p-3 fb-sortable" style={{ width: '120px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('date')}>
                  Date <span className="text-muted small">{sortIndicator('date')}</span>
                </th>
                <th className="p-3 fb-sortable" style={{ width: '120px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('status')}>
                  Status <span className="text-muted small">{sortIndicator('status')}</span>
                </th>
                <th className="p-3 fb-sortable" style={{ width: '140px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('user')}>
                  User <span className="text-muted small">{sortIndicator('user')}</span>
                </th>
                <th className="p-3 fb-sortable" style={{ width: '130px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('category')}>
                  Category <span className="text-muted small">{sortIndicator('category')}</span>
                </th>
                <th className="p-3 fb-sortable" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('summary')}>
                  Summary <span className="text-muted small">{sortIndicator('summary')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedFeedback.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-8"
                    style={{ color: 'var(--cui-secondary-color)' }}
                  >
                    No feedback found.
                  </td>
                </tr>
              ) : (
                sortedFeedback.map((item) => {
                  const isExpanded = expandedIds.has(item.id);
                  return (
                    <Fragment key={item.id}>
                      <tr
                        onClick={() => toggleExpanded(item.id)}
                        style={{ cursor: 'pointer' }}
                        className={`feedback-row ${isExpanded ? 'feedback-row-expanded' : ''}`}
                      >
                        <td className="p-3" style={{ color: 'var(--cui-secondary-color)', whiteSpace: 'nowrap' }}>
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <CBadge color={STATUS_COLORS[item.status]}>
                            {STATUS_LABELS[item.status]}
                          </CBadge>
                        </td>
                        <td className="p-3">{item.username}</td>
                        <td className="p-3">
                          {item.category ? (
                            <CBadge color={CATEGORY_COLORS[item.category]}>
                              {CATEGORY_LABELS[item.category]}
                            </CBadge>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div>
                            {(item.landscaper_summary || item.message).length > 140
                              ? `${(item.landscaper_summary || item.message).substring(0, 140)}…`
                              : item.landscaper_summary || item.message}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="feedback-row-expansion">
                          <td colSpan={5} style={{ padding: 0, background: 'var(--cui-tertiary-bg)' }}>
                            <ExpandedRowPanel item={item} onSave={updateFeedback} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .feedback-row:hover {
          background: var(--cui-tertiary-bg);
        }
        .feedback-row-expanded {
          background: var(--cui-tertiary-bg);
        }
        .fb-sortable:hover {
          color: var(--cui-primary);
        }
      `}</style>
    </div>
  );
}

export default function FeedbackAdminPage() {
  return (
    <ProtectedRoute requireAdmin>
      <FeedbackAdminContent />
    </ProtectedRoute>
  );
}
