'use client';

/**
 * DesignProjectHome — Stage B slice 1: the Project Home screen composed in the
 * Slice 1 reference language (frame C1).
 *
 *   ┌──────────────────────────── workspace ───────────────────────────┐
 *   │  Project profile card (440px)  │  Map (flex)                     │
 *   │  Contacts row (reused ContactsSection)                           │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * Conventions carried from the reference (HANDOFF.md locked decisions):
 *  - dashed underline = editable in place; computed/derived values plain
 *  - tiny uppercase letterspaced section labels in the pale steel accent
 *  - one accent; neutral navy-dark surfaces; flush-left density
 *
 * Data + behavior REUSE (INVARIANTS.md — do not reimplement logic):
 *  - fields read from GET  /api/projects/[id]/details (same as ProjectTab)
 *  - edits saved via PATCH /api/projects/[id]/details with a partial object
 *    (same endpoint + payload shape ProjectTab uses)
 *  - map is the real <ProjectTabMap> (google-hybrid, same as ProjectTab)
 *  - contacts is the real <ContactsSection> (add/edit logic intact)
 *
 * Styling lives in design.css under .dh-* class names, scoped inside
 * .design-shell by the stylesheet itself.
 */

import React, { useCallback, useEffect, useState } from 'react';
import ProjectTabMap from '@/components/map/ProjectTabMap';
import ContactsSection from '@/components/projects/contacts/ContactsSection';
import { getAuthHeaders } from '@/lib/authHeaders';

// Loose row shape: /details returns tbl_project.* — render defensively.
type Details = Record<string, unknown>;

interface DesignProjectHomeProps {
  // Same project object the router receives; used for id + type gating.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  project: any;
}

/* ── formatting helpers ─────────────────────────────────────────────── */

const DASH = '—';

function s(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const str = String(v).trim();
  return str.length ? str : null;
}

function fmtInt(v: unknown): string | null {
  const n = Number(v);
  if (v === null || v === undefined || v === '' || Number.isNaN(n)) return null;
  return Math.round(n).toLocaleString('en-US');
}

function fmtDate(v: unknown): string | null {
  const str = s(v);
  if (!str) return null;
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return str;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/* ── inline-editable row ────────────────────────────────────────────── */

interface RowProps {
  label: string;
  /** Rendered display value; null renders an em dash. */
  display: string | null;
  /** Muted suffix rendered after the value (e.g. "(164.34 ac)"). */
  suffix?: string | null;
  /** Column key to PATCH; omit for computed/read-only rows (plain text). */
  editKey?: string;
  /** Raw value seeding the editor input (defaults to display). */
  editValue?: string | null;
  editingKey: string | null;
  onStartEdit: (key: string) => void;
  onCancelEdit: () => void;
  onCommit: (key: string, value: string) => void;
}

function ProfileRow({
  label,
  display,
  suffix,
  editKey,
  editValue,
  editingKey,
  onStartEdit,
  onCancelEdit,
  onCommit,
}: RowProps) {
  const editing = editKey != null && editingKey === editKey;
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (editing) setDraft(editValue ?? display ?? '');
  }, [editing, editValue, display]);

  return (
    <div className="dh-row">
      <div className="dh-row-label">{label}</div>
      <div className="dh-row-value">
        {editing ? (
          <input
            className="dh-row-input"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => onCommit(editKey!, draft)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onCommit(editKey!, draft);
              if (e.key === 'Escape') onCancelEdit();
            }}
          />
        ) : editKey ? (
          <span
            className="dh-editable"
            title="Click to edit"
            onClick={() => onStartEdit(editKey)}
          >
            {display ?? DASH}
          </span>
        ) : (
          <span>{display ?? DASH}</span>
        )}
        {suffix ? <span className="dh-row-suffix"> {suffix}</span> : null}
      </div>
    </div>
  );
}

/* ── main component ─────────────────────────────────────────────────── */

export function DesignProjectHome({ project }: DesignProjectHomeProps) {
  const projectId: number = project.project_id;
  const [details, setDetails] = useState<Details | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/projects/${projectId}/details`, { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: Details) => setDetails(d))
      .catch(() => setLoadFailed(true));
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const commit = useCallback(
    (key: string, value: string) => {
      setEditingKey(null);
      const current = details?.[key];
      const trimmed = value.trim();
      if (trimmed === String(current ?? '')) return; // no-op
      // Same endpoint + partial-object payload ProjectTab uses.
      fetch(`/api/projects/${projectId}/details`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: trimmed === '' ? null : trimmed }),
      })
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((updated: Details) => {
          setDetails(updated);
          setSaveError(null);
        })
        .catch(() => setSaveError('That change didn’t save — please try again.'));
    },
    [details, projectId],
  );

  const startEdit = useCallback((key: string) => setEditingKey(key), []);
  const cancelEdit = useCallback(() => setEditingKey(null), []);

  if (loadFailed) {
    return (
      <div className="dh-workspace">
        <div className="dh-card" style={{ padding: 16 }}>
          Couldn’t load this project’s profile. Refresh the page to retry.
        </div>
      </div>
    );
  }

  const d = details ?? {};
  const isLand = ['LAND', 'SUBDIVISION', 'MPC'].includes(
    String(d.project_type_code ?? project.project_type_code ?? ''),
  );

  // City line: "Maricopa, AZ 85138"
  const cityLine =
    [s(d.city), [s(d.state), s(d.zip_code)].filter(Boolean).join(' ')]
      .filter(Boolean)
      .join(', ') || null;

  // Lot size: prefer SF with acres suffix (reference shows "7,158,250 SF (164.34 ac)")
  const lotSf = fmtInt(d.lot_size_sf);
  const lotAc = s(d.lot_size_acres);
  const lotDisplay = lotSf ? `${lotSf} SF` : lotAc ? `${lotAc} ac` : null;
  const lotSuffix = lotSf && lotAc ? `(${lotAc} ac)` : null;

  // Type line: "Land · residential" style — from type + code, plain (set at creation)
  const typeLine =
    [s(d.project_type ?? project.project_type), s(d.project_type_code ?? project.project_type_code)]
      .filter(Boolean)
      .join(' · ') || null;

  const apns = [s(d.apn_primary), s(d.apn_secondary)].filter(Boolean).join(', ') || null;

  const rowShared = {
    editingKey,
    onStartEdit: startEdit,
    onCancelEdit: cancelEdit,
    onCommit: commit,
  };

  return (
    <div className="dh-workspace">
      <div className="dh-top-grid">
        {/* ── Project profile card ── */}
        <div className="dh-card dh-profile">
          <div className="dh-card-head">
            <span className="dh-card-title">Project profile</span>
            <span className="dh-head-hint">dashed = editable</span>
          </div>

          <div className="dh-section-label">Location</div>
          <ProfileRow
            label="Address"
            display={s(d.street_address)}
            editKey="street_address"
            {...rowShared}
          />
          <ProfileRow
            label="City"
            display={cityLine}
            editKey="city"
            editValue={s(d.city)}
            {...rowShared}
          />
          <ProfileRow label="County" display={s(d.county)} editKey="county" {...rowShared} />
          <ProfileRow
            label="Market"
            display={s(d.market)}
            suffix={s(d.submarket) ? `(${s(d.submarket)})` : null}
            {...rowShared}
          />
          <ProfileRow label="APNs" display={apns} editKey="apn_primary" editValue={s(d.apn_primary)} {...rowShared} />

          <div className="dh-section-label">Profile</div>
          <ProfileRow label="Type" display={typeLine} {...rowShared} />
          <ProfileRow
            label="Subtype"
            display={s(d.property_subtype)}
            editKey="property_subtype"
            {...rowShared}
          />
          <ProfileRow
            label="Class · Status"
            display={[s(d.property_class) ?? DASH, s(d.status) ?? DASH].join(' · ')}
            editKey="property_class"
            editValue={s(d.property_class)}
            {...rowShared}
          />
          <ProfileRow
            label="Ownership"
            display={s(d.ownership_type)}
            editKey="ownership_type"
            {...rowShared}
          />
          <ProfileRow
            label="Lot size"
            display={lotDisplay}
            suffix={lotSuffix}
            editKey="lot_size_acres"
            editValue={lotAc}
            {...rowShared}
          />
          <ProfileRow
            label="Start date"
            display={fmtDate(d.start_date)}
            editKey="start_date"
            editValue={s(d.start_date)?.slice(0, 10) ?? null}
            {...rowShared}
          />
          {/* Land: unit count derives from the parcel table (computed). MF: editable. */}
          <ProfileRow
            label="Total units"
            display={fmtInt(d.total_units)}
            suffix={isLand && fmtInt(d.total_units) ? 'from parcel table' : null}
            editKey={isLand ? undefined : 'total_units'}
            editValue={s(d.total_units)}
            {...rowShared}
          />
          <ProfileRow
            label="Year built"
            display={s(d.year_built)}
            editKey="year_built"
            {...rowShared}
          />
          <ProfileRow label="Stories" display={s(d.stories)} editKey="stories" {...rowShared} />
          <ProfileRow
            label="Gross SF"
            display={fmtInt(d.gross_sf)}
            editKey="gross_sf"
            editValue={s(d.gross_sf)}
            {...rowShared}
          />
          <ProfileRow
            label="Notes"
            display={s(d.project_notes)}
            editKey="project_notes"
            {...rowShared}
          />

          {saveError ? <div className="dh-save-error">{saveError}</div> : null}
        </div>

        {/* ── Map — the real MapLibre map, same component ProjectTab mounts ── */}
        <div className="dh-card dh-map">
          <div className="dh-card-head">
            <span className="dh-card-title">Map</span>
            <span className="dh-head-hint">Click map to set location</span>
          </div>
          <div className="dh-map-body">
            <ProjectTabMap
              projectId={String(projectId)}
              styleUrl="google-hybrid"
              tabId="design-home"
            />
          </div>
        </div>
      </div>

      {/* ── Contacts — reference tiles (one card per role, primary person),
             with the real ContactsSection mounted on demand for add/edit ── */}
      <ContactTiles projectId={projectId} />
    </div>
  );
}

/* ── contact tiles (reference frame C1 bottom row) ──────────────────── */

interface ContactPerson {
  contact_id: number;
  name: string | null;
  title: string | null;
  company: string | null;
  email: string | null;
  phone_direct: string | null;
  phone_mobile: string | null;
}

interface ContactRoleGroup {
  role_key: string;
  role_label: string;
  contacts: ContactPerson[];
}

function ContactTiles({ projectId }: { projectId: number }) {
  const [groups, setGroups] = useState<ContactRoleGroup[]>([]);
  const [manageOpen, setManageOpen] = useState(false);
  // Bump to refetch tiles after edits made in the full ContactsSection.
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/contacts`, { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((payload) => {
        const data = Array.isArray(payload?.data) ? payload.data : [];
        setGroups(data as ContactRoleGroup[]);
      })
      .catch(() => {});
  }, [projectId, refreshKey]);

  const populated = groups.filter((g) => g.contacts.length > 0);

  return (
    <div className="dh-contacts">
      <div className="dh-contacts-grid">
        {populated.map((g) => {
          const c = g.contacts[0];
          const more = g.contacts.length - 1;
          const phone = c.phone_direct || c.phone_mobile;
          return (
            <div className="dh-card dh-contact-tile" key={g.role_key}>
              <div className="dh-contact-role">
                {g.role_label}
                {more > 0 ? <span className="dh-contact-more">+{more} more</span> : null}
              </div>
              <div className="dh-contact-name">
                {c.name ?? DASH}
                {c.title ? <span className="dh-contact-title"> · {c.title}</span> : null}
              </div>
              {c.company ? <div className="dh-contact-company">{c.company}</div> : null}
              {(c.email || phone) && (
                <div className="dh-contact-meta">
                  {[c.email, phone].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          );
        })}
        <button
          type="button"
          className="dh-card dh-contact-tile dh-contact-add"
          onClick={() =>
            setManageOpen((v) => {
              if (v) setRefreshKey((k) => k + 1); // closing → refetch tiles
              return !v;
            })
          }
        >
          {manageOpen ? 'Done managing contacts' : populated.length ? '+ Manage contacts' : '+ Add contacts'}
        </button>
      </div>
      {manageOpen ? (
        <div className="dh-contacts-manage">
          {/* ContactsSection owns add/edit/delete (reused as-is per INVARIANTS);
              tiles refetch when this panel is closed. */}
          <ContactsSection projectId={projectId} />
        </div>
      ) : null}
    </div>
  );
}

export default DesignProjectHome;
