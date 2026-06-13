'use client';

import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  CButton,
  CFormTextarea,
  CFormSelect,
  CBadge,
  CSpinner,
} from '@coreui/react';
import AdminNavBar from '@/app/components/AdminNavBar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// ── Canonical feedback lives in landscape.tbl_feedback (single source of truth,
// shared with the daily brief + the list_feedback/close_feedback/start_feedback/
// mark_feedback_addressed CLI + Cowork). The tester_feedback mirror was retired
// in LSCMD-FBUNIFY-0613-qz. This page reads /api/feedback/ (canonical viewset)
// and PATCHes status edits back through the same CLI semantics.

type CanonicalStatus =
  | 'open'
  | 'in_progress'
  | 'addressed'
  | 'closed'
  | 'wontfix'
  | 'duplicate';

// ── Display-bucket map (DECISION 3): collapse the six canonical states into the
// three chips the Cowork artifact uses. open → Open; in_progress → In Progress;
// addressed | closed | wontfix | duplicate → Closed.
const STATUS_BUCKET_MAP: Record<CanonicalStatus, 'open' | 'in_progress' | 'closed'> = {
  open: 'open',
  in_progress: 'in_progress',
  addressed: 'closed',
  closed: 'closed',
  wontfix: 'closed',
  duplicate: 'closed',
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

// Per-status badge nomenclature (the full canonical vocabulary, not the 3 chips).
const STATUS_LABELS: Record<CanonicalStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  addressed: 'Addressed',
  closed: 'Closed',
  wontfix: "Won't Fix",
  duplicate: 'Duplicate',
};
const STATUS_COLORS: Record<CanonicalStatus, string> = {
  open: 'danger',
  in_progress: 'warning',
  addressed: 'success',
  closed: 'secondary',
  wontfix: 'secondary',
  duplicate: 'secondary',
};

// Status values an admin may set from the queue. Duplicate is intentionally
// omitted — it requires a duplicate_of target the inline form doesn't collect;
// set duplicates via the close_feedback CLI.
const EDITABLE_STATUSES: CanonicalStatus[] = ['open', 'in_progress', 'addressed', 'closed', 'wontfix'];

interface FeedbackItem {
  id: number;
  fb_label: string; // "FB-N"
  created_at: string;
  status: CanonicalStatus;
  category: string | null;
  source: string | null;
  page_context: string | null;
  project_id: number | null;
  project_name: string | null;
  message_text: string;
  user_name: string | null;
  user_email: string | null;
  started_at: string | null;
  addressed_at: string | null;
  closed_at: string | null;
  in_progress_branch: string | null;
  in_progress_session_slug: string | null;
  resolved_by_commit_sha: string | null;
  resolved_by_commit_url: string | null;
  resolution_notes: string | null;
  working_summary: string | null;
  active_chat_slug: string | null;
  duplicate_of_id: number | null;
  report_count: number; // surfaced as a constant 1
}

// Patch payload the admin queue sends. Status maps to the CLI write semantics
// server-side; resolution_notes is the single free-text field tbl_feedback keeps.
type FeedbackPatch = { status: CanonicalStatus; resolution_notes: string };

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

// Build the paste-ready triage prompt the Cowork artifact's "Fix Prompt" button
// copies to clipboard. Includes a "Prior work on this item" section when the row
// already has a working_summary, so a fresh chat can pick up where it left off.
function buildFixPrompt(item: FeedbackItem): string {
  const dateOnly = (item.created_at || '').slice(0, 10);
  const where = item.page_context || 'Unknown';
  const statusLabel = STATUS_LABELS[item.status] || item.status;
  const ws = item.working_summary;
  const hasPriorWork = !!ws;
  const lines: string[] = [];

  lines.push(`Triage feedback item ${item.fb_label} from the Landscape app.`);
  lines.push(``);
  lines.push(`Reported: ${dateOnly} on the ${where} surface`);
  lines.push(`Status: ${statusLabel}`);
  lines.push(``);
  lines.push(`User's wording:`);
  lines.push(`"${(item.message_text || '').trim()}"`);
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

// ── Inline expansion panel rendered below an expanded row.
interface ExpandedRowPanelProps {
  item: FeedbackItem;
  onSave: (id: number, data: FeedbackPatch) => Promise<void>;
}

function ExpandedRowPanel({ item, onSave }: ExpandedRowPanelProps) {
  const [status, setStatus] = useState<CanonicalStatus>(item.status);
  const [resolutionNotes, setResolutionNotes] = useState(item.resolution_notes || '');
  const [saving, setSaving] = useState(false);
  const [showWorkingSummary, setShowWorkingSummary] = useState(false);
  const [showFixPrompt, setShowFixPrompt] = useState(false);
  const [fixPromptCopied, setFixPromptCopied] = useState(false);

  const workingSummary = item.working_summary;
  const fixPromptText = buildFixPrompt(item);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(item.id, { status, resolution_notes: resolutionNotes });
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
      <div className="row mb-3">
        <div className="col-md-6">
          <strong>User:</strong>{' '}
          {item.user_name || <span className="text-muted">unknown</span>}
          {item.user_email && <span className="text-muted ms-2">({item.user_email})</span>}
        </div>
        <div className="col-md-6">
          <strong>Submitted:</strong> {new Date(item.created_at).toLocaleString()}
        </div>
      </div>

      <div className="mb-3">
        <strong>Feedback:</strong>
        <p className="mb-0 mt-1" style={{ whiteSpace: 'pre-wrap' }}>{item.message_text}</p>
      </div>

      <div className="row mb-3">
        <div className="col-md-6">
          <strong>Where:</strong>{' '}
          <CBadge color="dark">{item.page_context || 'Unknown'}</CBadge>
        </div>
        <div className="col-md-6">
          <strong>Project:</strong>{' '}
          {item.project_name || <span className="text-muted">—</span>}
        </div>
      </div>

      {/* Lifecycle context — branch/session, resolving commit, active chat */}
      {(item.in_progress_branch || item.in_progress_session_slug || item.resolved_by_commit_url || item.active_chat_slug || item.duplicate_of_id) && (
        <div className="mb-3 p-2 rounded small" style={{ background: 'var(--cui-card-bg)' }}>
          {item.in_progress_branch && <div>Branch: <code>{item.in_progress_branch}</code></div>}
          {item.in_progress_session_slug && <div>Session: <code>{item.in_progress_session_slug}</code></div>}
          {item.active_chat_slug && <div>Active chat: <code>{item.active_chat_slug}</code></div>}
          {item.resolved_by_commit_url && (
            <div>
              Resolved by:{' '}
              <a href={item.resolved_by_commit_url} target="_blank" rel="noopener noreferrer">
                {item.resolved_by_commit_sha?.slice(0, 8) || 'commit'}
              </a>
            </div>
          )}
          {item.duplicate_of_id && <div>Duplicate of: FB-{item.duplicate_of_id}</div>}
          {item.addressed_at && <div>Addressed: {new Date(item.addressed_at).toLocaleString()}</div>}
          {item.closed_at && <div>Closed: {new Date(item.closed_at).toLocaleString()}</div>}
        </div>
      )}

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
        <CFormSelect value={status} onChange={(e) => setStatus(e.target.value as CanonicalStatus)}>
          {EDITABLE_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </CFormSelect>
      </div>

      <div className="mb-3">
        <label className="form-label fw-bold">Resolution Notes</label>
        <CFormTextarea
          rows={3}
          value={resolutionNotes}
          onChange={(e) => setResolutionNotes(e.target.value)}
          placeholder="Notes recorded with the status change (addressed / closed)…"
        />
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

type SortKey = 'date' | 'fb' | 'status' | 'category' | 'summary';

function FeedbackAdminContent() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Bucket-based status filter — start with open + in_progress active, closed off.
  const [statusBuckets, setStatusBuckets] = useState<Set<'open' | 'in_progress' | 'closed'>>(
    new Set(['open', 'in_progress'])
  );
  const [categoryFilters, setCategoryFilters] = useState<Set<string>>(new Set());
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

  const updateFeedback = async (id: number, data: FeedbackPatch) => {
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

  // Bucket counts for the count chips (off ALL feedback, not the filtered set).
  const bucketCounts = useMemo(() => {
    const counts: Record<'open' | 'in_progress' | 'closed', number> = { open: 0, in_progress: 0, closed: 0 };
    for (const i of feedback) {
      const b = STATUS_BUCKET_MAP[i.status];
      if (b) counts[b]++;
    }
    return counts;
  }, [feedback]);

  // Category counts for the filter tiles (off ALL feedback). Canonical rows are
  // mostly uncategorized for now — the category column was just added.
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { bug: 0, feature_request: 0, ux_confusion: 0, question: 0, _uncategorized: 0 };
    for (const i of feedback) {
      const k = i.category || '_uncategorized';
      counts[k] = (counts[k] || 0) + 1;
    }
    return counts;
  }, [feedback]);

  const filteredFeedback = useMemo(
    () =>
      feedback.filter((item) => {
        const bucket = STATUS_BUCKET_MAP[item.status];
        if (!bucket || !statusBuckets.has(bucket)) return false;
        if (categoryFilters.size > 0) {
          const k = item.category || '_uncategorized';
          if (!categoryFilters.has(k)) return false;
        }
        return true;
      }),
    [feedback, statusBuckets, categoryFilters]
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
        case 'fb':
          // Canonical rows carry the real FB id directly.
          av = a.id;
          bv = b.id;
          break;
        case 'status':
          av = a.status;
          bv = b.status;
          break;
        case 'category':
          av = (a.category || 'zzz').toLowerCase();
          bv = (b.category || 'zzz').toLowerCase();
          break;
        case 'summary':
          av = (a.message_text || '').toLowerCase();
          bv = (b.message_text || '').toLowerCase();
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

  const toggleCategory = (c: string) => {
    setCategoryFilters((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
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

  const CATEGORY_DISPLAY: Record<string, string> = {
    bug: 'Bug',
    feature_request: 'Feature',
    ux_confusion: 'UX',
    question: 'Question',
    _uncategorized: 'Uncategorized',
  };

  const renderCategoryTile = (cat: string) => {
    const active = categoryFilters.has(cat);
    const count = categoryCounts[cat] || 0;
    if (count === 0 && cat === '_uncategorized') return null;
    const badgeColor = CATEGORY_COLORS[cat] || 'secondary';
    return (
      <button
        key={cat}
        type="button"
        onClick={() => toggleCategory(cat)}
        aria-pressed={active}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          opacity: active || categoryFilters.size === 0 ? 1 : 0.45,
          transition: 'opacity 0.12s ease',
        }}
      >
        <CBadge
          color={badgeColor}
          style={{
            fontSize: '13px',
            fontWeight: 500,
            padding: '7px 12px',
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: '6px',
            borderRadius: '4px',
          }}
        >
          <span style={{ fontWeight: 700, fontSize: '15px' }}>{count}</span>
          <span>{CATEGORY_DISPLAY[cat]}</span>
        </CBadge>
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

        {/* Status count chips on the left, category filter tiles on the right */}
        <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
          {renderCountChip('open')}
          {renderCountChip('in_progress')}
          {renderCountChip('closed')}
          <div style={{ width: '12px' }} />
          {renderCategoryTile('bug')}
          {renderCategoryTile('feature_request')}
          {renderCategoryTile('ux_confusion')}
          {renderCategoryTile('question')}
          {renderCategoryTile('_uncategorized')}
          {categoryFilters.size > 0 && (
            <button
              type="button"
              onClick={() => setCategoryFilters(new Set())}
              className="btn btn-link btn-sm p-0 ms-2"
              style={{ fontSize: '12px', textDecoration: 'none' }}
            >
              clear
            </button>
          )}
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
                <th className="p-3 fb-sortable" style={{ width: '110px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('date')}>
                  Date <span className="text-muted small">{sortIndicator('date')}</span>
                </th>
                <th className="p-3 fb-sortable" style={{ width: '90px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('fb')}>
                  FB <span className="text-muted small">{sortIndicator('fb')}</span>
                </th>
                <th className="p-3 fb-sortable" style={{ width: '120px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('status')}>
                  Status <span className="text-muted small">{sortIndicator('status')}</span>
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
                        <td className="p-3" style={{ fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', fontSize: '12.5px', color: 'var(--cui-body-color)', whiteSpace: 'nowrap' }}>
                          {item.fb_label}
                        </td>
                        <td className="p-3">
                          <CBadge color={STATUS_COLORS[item.status]}>
                            {STATUS_LABELS[item.status]}
                          </CBadge>
                        </td>
                        <td className="p-3">
                          {item.category ? (
                            <CBadge color={CATEGORY_COLORS[item.category] || 'secondary'}>
                              {CATEGORY_LABELS[item.category] || item.category}
                            </CBadge>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div>
                            {(item.message_text || '').length > 140
                              ? `${(item.message_text || '').substring(0, 140)}…`
                              : item.message_text}
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
