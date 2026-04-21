'use client';

import React, { useEffect, useState } from 'react';
import { useProjectContext } from '@/app/components/ProjectProvider';

interface Template {
  template_id: number;
  template_name: string;
  description: string | null;
  doc_type_options: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface FormData {
  template_name: string;
  description: string;
  doc_type_options: string[];
  is_default: boolean;
}

const EMPTY_FORM: FormData = {
  template_name: '',
  description: '',
  doc_type_options: [],
  is_default: false,
};

export default function DmsAdminPanelNew() {
  const { activeProject } = useProjectContext();
  const workspaceId = (activeProject as any)?.workspace_id ?? 1;

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/dms/templates?workspace_id=${workspaceId}`);
      const data = await r.json();
      setTemplates(data?.templates ?? []);
    } catch (e) {
      console.error('[DmsAdmin] load failed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (workspaceId) void load(); }, [workspaceId]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (t: Template) => {
    setEditing(t);
    setForm({
      template_name: t.template_name,
      description: t.description || '',
      doc_type_options: t.doc_type_options,
      is_default: t.is_default,
    });
    setShowModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) {
        await fetch(`/api/dms/templates/${editing.template_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        await fetch('/api/dms/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, workspace_id: workspaceId }),
        });
      }
      await load();
      setShowModal(false);
    } catch (e) {
      console.error(e);
      alert('Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this template?')) return;
    setLoading(true);
    try {
      await fetch(`/api/dms/templates/${id}`, { method: 'DELETE' });
      await load();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-dms-admin">
      <div className="w-dms-admin-head">
        <div>
          <div className="w-admin-section-title" style={{ fontSize: 15 }}>Document Templates</div>
          <div className="w-admin-section-note" style={{ marginBottom: 0 }}>
            Manage document type categories for your projects (workspace #{workspaceId})
          </div>
        </div>
        <button className="w-btn w-btn-primary" onClick={openCreate}>+ Create Template</button>
      </div>

      {loading && templates.length === 0 ? (
        <div className="w-dms-admin-empty">Loading templates…</div>
      ) : templates.length === 0 ? (
        <div className="w-dms-admin-empty">No templates found. Create your first template to get started.</div>
      ) : (
        <div className="w-dms-admin-grid">
          {templates.map((t) => (
            <div key={t.template_id} className="w-dms-admin-card">
              <div className="w-dms-admin-card-head">
                <div className="w-dms-admin-card-title-row">
                  <span className="w-dms-admin-card-title">{t.template_name}</span>
                  {t.is_default && <span className="w-admin-pill accent">Default</span>}
                </div>
                <div className="w-dms-admin-card-actions">
                  <button className="w-dms-link" onClick={() => openEdit(t)}>Edit</button>
                  {!t.is_default && (
                    <button className="w-dms-link is-danger" onClick={() => remove(t.template_id)}>Delete</button>
                  )}
                </div>
              </div>
              {t.description && <div className="w-dms-admin-card-desc">{t.description}</div>}
              <div className="w-dms-admin-tags">
                {t.doc_type_options.map((dt) => (
                  <span key={dt} className="w-dms-admin-tag">{dt}</span>
                ))}
              </div>
              <div className="w-dms-admin-card-foot">{t.doc_type_options.length} document types</div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="w-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="w-modal" onClick={(e) => e.stopPropagation()}>
            <div className="w-modal-head">
              <span>{editing ? 'Edit Template' : 'Create Template'}</span>
              <button className="w-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={save} className="w-modal-body">
              <label className="w-modal-field">
                <span>Template Name *</span>
                <input
                  type="text"
                  required
                  value={form.template_name}
                  onChange={(e) => setForm({ ...form, template_name: e.target.value })}
                  placeholder="e.g., Land Development"
                />
              </label>
              <label className="w-modal-field">
                <span>Description</span>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description…"
                />
              </label>
              <label className="w-modal-field">
                <span>Document Types (one per line) *</span>
                <textarea
                  rows={10}
                  required
                  value={form.doc_type_options.join('\n')}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      doc_type_options: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder={'Agreement\nTitle\nClosing\nReports\n…'}
                />
                <small>Enter one document type per line. These appear as filter categories.</small>
              </label>
              <label className="w-modal-check">
                <input
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                />
                <span>Set as default template for this workspace</span>
              </label>
              <div className="w-modal-foot">
                <button type="button" className="w-btn w-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="w-btn w-btn-primary" disabled={loading}>
                  {loading ? 'Saving…' : editing ? 'Save Changes' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
