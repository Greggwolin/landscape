'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminNavBar from '@/app/components/AdminNavBar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

interface FeedbackItem {
  id: number;
  user: number;
  username: string;
  feedback_type: 'bug' | 'feature' | 'question' | 'general';
  message: string;
  page_url: string;
  page_path: string;
  project_id?: number;
  project_name?: string;
  created_at: string;
  is_resolved: boolean;
  admin_notes: string;
  context_url?: string;
}

const FEEDBACK_TYPE_COLORS: Record<string, string> = {
  bug: 'var(--cui-danger)',
  feature: 'var(--cui-info)',
  question: 'var(--cui-warning)',
  general: 'var(--cui-secondary-color)',
};

function FeedbackAdminContent() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');

  const fetchFeedback = useCallback(async () => {
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

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_DJANGO_API_URL}/api/feedback/`,
        { headers }
      );

      if (!response.ok) throw new Error('Failed to fetch feedback');

      const data = await response.json();
      setFeedback(Array.isArray(data) ? data : data.results || []);
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

  const toggleResolved = async (id: number, currentStatus: boolean) => {
    try {
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

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_DJANGO_API_URL}/api/feedback/${id}/`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ is_resolved: !currentStatus }),
        }
      );

      if (!response.ok) throw new Error('Failed to update');

      await fetchFeedback();
    } catch (err) {
      console.error('Update error:', err);
    }
  };

  const filteredFeedback = useMemo(() => (
    feedback.filter((item) => {
      if (filter === 'open') return !item.is_resolved;
      if (filter === 'resolved') return item.is_resolved;
      return true;
    })
  ), [feedback, filter]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">Loading feedback...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
      <AdminNavBar />
      <div className="p-6">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="h3 m-0">Tester Feedback</h1>
          <div className="btn-group">
            <button
              className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setFilter('all')}
              type="button"
            >
              All ({feedback.length})
            </button>
            <button
              className={`btn btn-sm ${filter === 'open' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setFilter('open')}
              type="button"
            >
              Open ({feedback.filter((item) => !item.is_resolved).length})
            </button>
            <button
              className={`btn btn-sm ${filter === 'resolved' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setFilter('resolved')}
              type="button"
            >
              Resolved ({feedback.filter((item) => item.is_resolved).length})
            </button>
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
                <th className="p-3" style={{ width: '100px' }}>Status</th>
                <th className="p-3" style={{ width: '120px' }}>User</th>
                <th className="p-3" style={{ width: '100px' }}>Type</th>
                <th className="p-3">Message</th>
                <th className="p-3" style={{ width: '170px' }}>Page</th>
                <th className="p-3" style={{ width: '140px' }}>Date</th>
                <th className="p-3" style={{ width: '110px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFeedback.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-8"
                    style={{ color: 'var(--cui-secondary-color)' }}
                  >
                    No feedback found.
                  </td>
                </tr>
              ) : (
                filteredFeedback.map((item) => {
                  const pageHref = item.context_url || item.page_url;
                  const pagePath = item.page_path || 'Unknown';

                  return (
                    <tr key={item.id}>
                      <td className="p-3">
                        <span
                          className="badge"
                          style={{
                            background: item.is_resolved
                              ? 'var(--cui-success)'
                              : 'var(--cui-warning)',
                            color: 'var(--cui-body-bg)',
                          }}
                        >
                          {item.is_resolved ? 'Resolved' : 'Open'}
                        </span>
                      </td>
                      <td className="p-3">{item.username}</td>
                      <td className="p-3">
                        <span
                          className="badge"
                          style={{
                            background: FEEDBACK_TYPE_COLORS[item.feedback_type],
                            color: 'var(--cui-body-bg)',
                          }}
                        >
                          {item.feedback_type}
                        </span>
                      </td>
                      <td className="p-3">
                        <div style={{ maxWidth: '400px' }}>
                          {item.message.length > 150
                            ? `${item.message.substring(0, 150)}...`
                            : item.message}
                        </div>
                      </td>
                      <td className="p-3">
                        <a
                          href={pageHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-decoration-none"
                          style={{ color: 'var(--cui-primary)' }}
                          title={item.page_url}
                        >
                          {pagePath.length > 25
                            ? `...${pagePath.slice(-22)}`
                            : pagePath}
                          {item.project_id && (
                            <span className="ms-1" style={{ color: 'var(--cui-secondary-color)' }}>
                              (P:{item.project_id})
                            </span>
                          )}
                        </a>
                      </td>
                      <td className="p-3" style={{ color: 'var(--cui-secondary-color)' }}>
                        {new Date(item.created_at).toLocaleDateString()}
                        <br />
                        <small>{new Date(item.created_at).toLocaleTimeString()}</small>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => toggleResolved(item.id, item.is_resolved)}
                          className={`btn btn-sm ${
                            item.is_resolved ? 'btn-outline-warning' : 'btn-outline-success'
                          }`}
                          type="button"
                        >
                          {item.is_resolved ? 'Reopen' : 'Resolve'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
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
